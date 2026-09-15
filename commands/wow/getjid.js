'use strict';
const { resolveMentionOrReply, extractNumber, canReveal } = require('../../utils/jidTools');

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
        const number = extractNumber(jid, sock);
        return reply(
            `🪪 *REAL USER JID*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `👤 *JID:* \`${jid}\`\n` +
            (number ? `📞 *Number:* +${number}\n` : '📞 *Number:* unavailable for this LID\n') +
            `🔐 *Privacy:* visible to authorized users only`
        );
    }
};
