'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

function getGroups(sock) {
    if (typeof sock.groupFetchAllParticipating !== 'function') {
        throw new Error('This Baileys build does not expose groupFetchAllParticipating.');
    }
    return sock.groupFetchAllParticipating().then(data => Object.values(data || {})
        .map(group => ({ id: group.id, subject: group.subject || 'Unnamed group', size: group.participants?.length || 0 }))
        .sort((a, b) => a.subject.localeCompare(b.subject)));
}

function isJid(value) {
    return typeof value === 'string' && /@(g\.us|s\.whatsapp\.net)$/.test(value);
}

function normalizeGroup(value) {
    const raw = String(value || '').trim();
    if (/@g\.us$/.test(raw)) return raw;
    if (/^\d{5,20}$/.test(raw)) return `${raw}@g.us`;
    return null;
}

function selectedTarget(args, from, isGroup) {
    const first = normalizeGroup(args[0]);
    if (first) return { target: first, textArgs: args.slice(1) };
    if (isGroup && isJid(from)) return { target: from, textArgs: args };
    return { target: null, textArgs: args };
}

function quotedMedia(msg) {
    const context = msg?.message?.extendedTextMessage?.contextInfo;
    const quoted = context?.quotedMessage;
    if (!quoted) return null;
    const type = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage']
        .find(key => quoted[key]);
    return type ? { message: quoted[type], type, key: { ...msg.key, id: context.stanzaId || msg.key.id, participant: context.participant } } : null;
}

function directMedia(msg) {
    const message = msg?.message;
    const type = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage']
        .find(key => message?.[key]);
    return type ? { message: message[type], type, key: msg.key } : null;
}

async function mediaBuffer(sock, item) {
    const { downloadContentFromMessage } = require('@pasqua-baileys/baileys');
    const stream = await downloadContentFromMessage(item.message, item.type.replace('Message', ''));
    const chunks = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
}

function captionFrom(msg, item, text) {
    return text || item?.message?.caption || msg?.message?.conversation || msg?.message?.extendedTextMessage?.text || '';
}

async function fetchPreview(url) {
    try {
        const response = await fetch(url, { headers: { 'user-agent': 'SUKUNA-MD group status preview' } });
        const html = (await response.text()).slice(0, 500000);
        const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim();
        const description = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']*)["']/i)?.[1]?.replace(/\s+/g, ' ').trim();
        return { 'canonical-url': url, matchedText: url, title: title || url, description: description || 'Sukuna MD group status', canonicalUrl: url };
    } catch (_) {
        return { 'canonical-url': url, matchedText: url, title: url, description: 'Sukuna MD group status', canonicalUrl: url };
    }
}

async function buildPayload(sock, msg, text) {
    const item = directMedia(msg) || quotedMedia(msg);
    if (item) {
        const buffer = await mediaBuffer(sock, item);
        const temp = path.join(os.tmpdir(), `sukuna-gcstatus-${Date.now()}-${Math.random().toString(16).slice(2)}`);
        fs.writeFileSync(temp, buffer);
        const caption = captionFrom(msg, item, text);
        const payload = { groupStatus: true };
        if (item.type === 'imageMessage') payload.image = { url: temp };
        else if (item.type === 'videoMessage') payload.video = { url: temp };
        else if (item.type === 'audioMessage') payload.audio = { url: temp };
        else if (item.type === 'stickerMessage') payload.sticker = { url: temp };
        else payload.document = { url: temp, fileName: item.message.fileName || 'file' };
        if (caption && item.type !== 'audioMessage' && item.type !== 'stickerMessage') payload.caption = caption;
        return { payload, cleanup: () => { try { fs.unlinkSync(temp); } catch (_) {} } };
    }
    const cleanText = String(text || '').trim();
    if (!cleanText) throw new Error('No text or quoted media found.');
    const payload = { groupStatus: true, text: cleanText };
    const url = cleanText.match(/https?:\/\/[^\s]+/i)?.[0];
    if (url) payload.linkPreview = await fetchPreview(url);
    return { payload, cleanup: () => {} };
}

async function send(sock, target, built, quoted) {
    try {
        await sock.sendMessage(target, built.payload, { quoted });
        return true;
    } finally {
        built.cleanup();
    }
}

module.exports = { getGroups, normalizeGroup, selectedTarget, buildPayload, send };
