'use strict';
const { generateWAMessageFromContent, proto } = require('@pasqua-baileys/baileys');

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
    const mentionedAlt = Array.isArray(context.mentionedJidAlt) ? context.mentionedJidAlt : [];
    const candidates = [
        ...mentionedAlt, ...mentioned,
        context.participantAlt, context.remoteJidAlt,
        context.participant, context.remoteJid,
        msg?.key?.participantAlt, msg?.key?.remoteJidAlt,
        sender, from
    ].filter(Boolean).map(normalizeJid).filter(Boolean);
    return candidates.find(jid => jid.endsWith('@s.whatsapp.net')) || candidates[0] || null;
}

async function resolvePhoneJid(jid, sock) {
    const normalized = normalizeJid(jid);
    if (!normalized) return { jid: null, number: null, source: 'invalid' };
    if (normalized.endsWith('@s.whatsapp.net')) {
        return { jid: normalized, number: normalized.split('@')[0].split(':')[0], source: 'phone-jid' };
    }
    if (!normalized.endsWith('@lid')) return { jid: normalized, number: null, source: 'non-user-jid' };
    const mapping = sock?.signalRepository?.lidMapping;
    let mapped = null;
    try {
        mapped = await mapping?.getPNForLID?.(normalized);
    } catch (_) {}
    const resolved = normalizeJid(mapped);
    if (resolved?.endsWith('@s.whatsapp.net')) {
        return { jid: resolved, number: resolved.split('@')[0].split(':')[0], source: 'lid-mapping' };
    }
    return { jid: normalized, number: null, source: 'lid-unresolved' };
}

function resolveArgument(args = []) {
    const raw = String(args[0] || '').trim();
    return raw ? normalizeJid(raw) : null;
}

async function extractNumber(jid, sock) {
    return (await resolvePhoneJid(jid, sock)).number;
}

function canReveal({ isGroup, isOwner, isAdmin }) {
    return !isGroup || Boolean(isOwner || isAdmin);
}

async function sendCopyCard({ sock, msg, from, body, title, copies = [] }) {
    const validCopies = copies.filter(item => item?.value);
    try {
        const buttons = validCopies.map((item, index) => ({
            name: 'cta_copy',
            buttonParamsJson: JSON.stringify({
                display_text: item.label || `📋 Copy ${index + 1}`,
                id: `jid_copy_${Date.now()}_${index}`,
                copy_code: String(item.value)
            })
        }));
        const wrapped = generateWAMessageFromContent(from, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: { deviceListMetadataVersion: 2, deviceListMetadata: {} },
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        body: { text: body },
                        footer: { text: 'SUKUNA MD · JID TOOLS' },
                        header: { title: title || '✦ JID TOOLS ✦', hasMediaAttachment: false },
                        nativeFlowMessage: { buttons, messageParamsJson: '' }
                    })
                }
            }
        }, { userJid: sock.user?.id, ...(msg?.message ? { quoted: msg } : {}) });
        await sock.relayMessage(from, wrapped.message, { messageId: wrapped.key.id });
    } catch (error) {
        console.error('[jid:copy-card]', error?.message || error);
        await sock.sendMessage(from, { text: `${body}\n\n${validCopies.map(item => `📋 ${item.label}: ${item.value}`).join('\n')}` }, { quoted: msg });
    }
}

module.exports = { normalizeJid, getContextInfo, resolveMentionOrReply, resolveArgument, resolvePhoneJid, extractNumber, canReveal, sendCopyCard };
