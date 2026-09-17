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
    for (const value of Object.values(current)) {
        if (value?.contextInfo) return value.contextInfo;
    }
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

function quotedContext(msg, from) {
    const info = contextInfo(msg?.message);
    if (!info?.quotedMessage) return null;
    const quotedMessage = info.quotedMessage;
    const unwrapped = unwrapMessage(quotedMessage) || {};
    const participant = info.participant || info.remoteJid || msg?.key?.participant || from;
    const mediaEntry = Object.entries({
        imageMessage: 'image',
        videoMessage: 'video',
        audioMessage: 'audio',
        documentMessage: 'document',
        stickerMessage: 'sticker',
    }).find(([key]) => unwrapped[key]);
    return {
        key: {
            remoteJid: from,
            id: info.stanzaId || '',
            participant,
            fromMe: false,
        },
        message: quotedMessage,
        sender: participant,
        participant,
        chat: from,
        text: messageText(quotedMessage),
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
}

function createMessageContext({ msg, sock, from, sender, reply, args = [], prefix, commandName }) {
    const quoted = quotedContext(msg, from);
    return {
        key: msg?.key,
        message: msg?.message,
        chat: from,
        from,
        sender,
        participant: sender,
        isGroup: String(from || '').endsWith('@g.us'),
        fromMe: Boolean(msg?.key?.fromMe),
        text: messageText(msg?.message),
        args,
        prefix,
        command: commandName,
        sock,
        msg,
        reply,
        quoted,
    };
}

module.exports = { createMessageContext, quotedContext, messageText, unwrapMessage };
