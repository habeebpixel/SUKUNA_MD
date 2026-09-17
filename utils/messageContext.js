'use strict';

function unwrapMessage(message) {
    let current = message;
    for (let i = 0; i < 8 && current; i += 1) {
        const next = current.ephemeralMessage?.message
            || current.viewOnceMessage?.message
            || current.viewOnceMessageV2?.message
            || current.viewOnceMessageV2Extension?.message
            || current.documentWithCaptionMessage?.message;
        if (!next) break;
        current = next;
    }
    return current || null;
}

function contextInfo(message) {
    const current = unwrapMessage(message) || {};
    for (const value of Object.values(current)) if (value?.contextInfo) return value.contextInfo;
    return null;
}

function messageText(message) {
    const current = unwrapMessage(message) || {};
    return current.conversation
        || current.extendedTextMessage?.text
        || current.imageMessage?.caption
        || current.videoMessage?.caption
        || current.documentMessage?.caption
        || current.buttonsResponseMessage?.selectedButtonId
        || current.listResponseMessage?.title
        || '';
}

function mediaType(message) {
    const current = unwrapMessage(message) || {};
    return Object.entries({ imageMessage: 'image', videoMessage: 'video', audioMessage: 'audio', documentMessage: 'document', stickerMessage: 'sticker' })
        .find(([key]) => current[key]);
}

function buildQuoted(message, key, from, sock, cache, seen = new Set()) {
    if (!message) return null;
    const unwrapped = unwrapMessage(message) || {};
    const mediaEntry = mediaType(message);
    const id = key?.id || '';
    const quoted = {
        key: { remoteJid: from, id, participant: key?.participant || from, fromMe: !!key?.fromMe },
        message,
        sender: key?.participant || from,
        participant: key?.participant || from,
        chat: from,
        text: messageText(message),
        type: Object.keys(unwrapped)[0] || 'unknown',
        isMedia: Boolean(mediaEntry),
        download: mediaEntry ? async () => {
            const { downloadContentFromMessage } = require('@pasqua-baileys/baileys');
            const stream = await downloadContentFromMessage(unwrapped[mediaEntry[0]], mediaEntry[1]);
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            return Buffer.concat(chunks);
        } : undefined,
    };
    const nestedInfo = contextInfo(message);
    const nestedId = nestedInfo?.stanzaId;
    if (nestedInfo?.quotedMessage && nestedId && !seen.has(nestedId)) {
        seen.add(nestedId);
        quoted.quoted = buildQuoted(nestedInfo.quotedMessage, {
            id: nestedId,
            participant: nestedInfo.participant || quoted.sender,
        }, from, sock, cache, seen);
    } else if (nestedId && cache?.get(from)?.get(nestedId) && !seen.has(nestedId)) {
        seen.add(nestedId);
        const stored = cache.get(from).get(nestedId);
        quoted.quoted = buildQuoted(stored.message, stored.key, from, sock, cache, seen);
    }
    quoted.forward = async () => {
        const target = quoted.isMedia ? await quoted.download() : null;
        if (target) {
            const content = mediaEntry[1] === 'image' ? { image: target } : mediaEntry[1] === 'video' ? { video: target } : mediaEntry[1] === 'audio' ? { audio: target, mimetype: unwrapped.audioMessage?.mimetype || 'audio/mp4' } : mediaEntry[1] === 'sticker' ? { sticker: target } : { document: target, fileName: unwrapped.documentMessage?.fileName || 'quoted-file' };
            return sock.sendMessage(from, content, {});
        }
        return sock.sendMessage(from, { text: quoted.text || 'Quoted message recovered.' }, {});
    };
    return quoted;
}

function quotedContext(msg, from, sock) {
    const info = contextInfo(msg?.message);
    if (!info?.quotedMessage) return null;
    const key = { id: info.stanzaId || '', participant: info.participant || msg?.key?.participant || from };
    return buildQuoted(info.quotedMessage, key, from, sock, sock?.__sukunaMessageCache);
}

function createMessageContext({ msg, sock, from, sender, reply, args = [], prefix, commandName }) {
    const quoted = quotedContext(msg, from, sock);
    return {
        key: msg?.key, message: msg?.message, chat: from, from, sender, participant: sender,
        isGroup: String(from || '').endsWith('@g.us'), fromMe: Boolean(msg?.key?.fromMe),
        text: messageText(msg?.message), args, prefix, command: commandName, sock, msg, reply, quoted,
    };
}

module.exports = { createMessageContext, quotedContext, messageText, unwrapMessage, mediaType };
