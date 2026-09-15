'use strict';
const { resolveMentionOrReply, resolveArgument, extractNumber, canReveal } = require('../../utils/jidTools');

module.exports = {
    name: 'conjid',
    aliases: [],
    description: 'Convert a WhatsApp JID into its real phone number',
    usage: '.conjid <jid>, reply to a user, or use .conjid for yourself',
    category: 'wow',
    async execute({ sock, msg, args = [], sender, from, reply, isGroup, isOwner, isAdmin }) {
        if (!canReveal({ isGroup, isOwner, isAdmin })) {
            return reply('🔒 For privacy, only group admins or the bot owner can use this command in a group.');
        }
        const jid = resolveArgument(args) || (args.length ? null : resolveMentionOrReply(msg, sender, from));
        if (!jid) return reply('⚠️ Use `.conjid 2348012345678@s.whatsapp.net`, reply to a user, tag a user, or use `.conjid` for yourself.');
        const number = extractNumber(jid, sock);
        if (!number) {
            return reply(`🪪 *JID RECEIVED*\n\n\`${jid}\`\n\n⚠️ This is a LID and the linked phone number is not available through the current session.`);
        }
        return reply(
            `✨ *JID CONVERTED*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `🪪 *JID:* \`${jid}\`\n` +
            `📞 *Real number:* +${number}\n` +
            `✅ Conversion complete`
        );
    }
};
