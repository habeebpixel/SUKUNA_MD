'use strict';
const { resolveMentionOrReply, resolveArgument, resolvePhoneJid, canReveal, sendCopyCard } = require('../../utils/jidTools');

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
        const resolved = await resolvePhoneJid(jid, sock);
        if (!resolved.number) {
            return sendCopyCard({
                sock, msg, from, reply,
                body: `🪪 *JID RECEIVED*\n━━━━━━━━━━━━━━━━━━\n\`${resolved.jid || jid}\`\n\n⚠️ This is a LID and the linked phone number is not available through the current session.`,
                title: '✦ JID RECEIVED ✦',
                copies: [{ label: '📋 Copy LID', value: resolved.jid || jid }]
            });
        }
        return sendCopyCard({
            sock, msg, from, reply,
            body:
                `✨ *JID CONVERTED*\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `🪪 *JID:* \`${resolved.jid}\`\n` +
                `📞 *Real number:* +${resolved.number}\n` +
                `✅ Conversion complete`,
            title: '✦ JID CONVERTER ✦',
            copies: [
                { label: '📋 Copy JID', value: resolved.jid },
                { label: '📋 Copy Number', value: `+${resolved.number}` },
                ...(resolved.jid !== jid ? [{ label: '📋 Copy LID', value: jid }] : [])
            ]
        });
    }
};
