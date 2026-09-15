'use strict';

function normalizeJid(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    if (raw.endsWith('@g.us') || raw.endsWith('@broadcast') || raw.endsWith('@newsletter')) return raw;
    if (raw.endsWith('@s.whatsapp.net') || raw.endsWith('@lid')) return raw.replace(/:\d+(?=@)/, '');
    const digits = raw.replace(/\D/g, '');
    return digits.length >= 7 ? `${digits}@s.whatsapp.net` : null;
}

function getContextInfo(msg = {}) {
    const message = msg.message || {};
    return message.extendedTextMessage?.contextInfo
        || message.imageMessage?.contextInfo
        || message.videoMessage?.contextInfo
        || message.documentMessage?.contextInfo
        || message.audioMessage?.contextInfo
        || message.stickerMessage?.contextInfo
        || {};
}

function resolveMentionOrReply(msg, sender, from) {
    const context = getContextInfo(msg);
    const mentioned = Array.isArray(context.mentionedJid) ? context.mentionedJid : [];
    const quoted = context.participant || context.remoteJid;
    const target = mentioned[0] || (String(quoted || '').endsWith('@s.whatsapp.net') || String(quoted || '').endsWith('@lid') ? quoted : null) || sender || from;
    return normalizeJid(target);
}

function resolveArgument(args = []) {
    const raw = String(args[0] || '').trim();
    return raw ? normalizeJid(raw) : null;
}

function extractNumber(jid, sock) {
    const normalized = normalizeJid(jid);
    if (!normalized) return null;
    if (normalized.endsWith('@s.whatsapp.net')) return normalized.split('@')[0].split(':')[0];
    if (normalized.endsWith('@lid')) {
        const resolved = sock?.lidResolver?.resolveToPhone?.(normalized)
            || sock?.lidResolver?.getPhone?.(normalized)
            || sock?.signalRepository?.resolveToPhone?.(normalized);
        const resolvedJid = normalizeJid(resolved);
        if (resolvedJid?.endsWith('@s.whatsapp.net')) return resolvedJid.split('@')[0].split(':')[0];
        return null;
    }
    return null;
}

function canReveal({ isGroup, isOwner, isAdmin }) {
    return !isGroup || Boolean(isOwner || isAdmin);
}

module.exports = { normalizeJid, getContextInfo, resolveMentionOrReply, resolveArgument, extractNumber, canReveal };
