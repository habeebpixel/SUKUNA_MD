'use strict';
const { resolveMentionOrReply, resolvePhoneJid, canReveal, sendCopyCard } = require('../../utils/jidTools');

module.exports = {
    name: 'getjid',
    aliases: [],
    description: 'Get the real WhatsApp JID of yourself, a replied-to user, or a tagged user',
    usage: '.getjid [@user] or reply to a message',
    category: 'wow',
    async execute({ sock, msg, sender, from, reply, isGroup, isOwner, isAdmin }) {
        if (!canReveal({ isGroup, isOwner, isAdmin })) {
            return reply('🔒 For privacy, only group admins or the bot owner can use this command in a group.');
        }
        const jid = resolveMentionOrReply(msg, sender, from);
        if (!jid) return reply('⚠️ Reply to a user’s message, tag a user, or use `.getjid` for yourself.');
        const resolved = await resolvePhoneJid(jid, sock, from);
        const body =
            `🪪 *REAL USER IDENTITY*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `👤 *JID:* \`${resolved.jid || jid}\`\n` +
            (resolved.number ? `📞 *Number:* +${resolved.number}\n` : '📞 *Number:* unavailable for this LID\n') +
            (resolved.jid !== jid ? `🧩 *Original LID:* \`${jid}\`\n` : '') +
            `🔐 *Privacy:* visible to authorized users only`;
        return sendCopyCard({
            sock, msg, from, reply,
            body,
            title: '✦ REAL USER JID ✦',
            copies: [
                { label: '📋 Copy JID', value: resolved.jid || jid },
                ...(resolved.number ? [{ label: '📋 Copy Number', value: `+${resolved.number}` }] : []),
                ...(resolved.jid !== jid ? [{ label: '📋 Copy LID', value: jid }] : [])
            ]
        });
    }
};
