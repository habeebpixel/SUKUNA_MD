/**
 * AutoStatus — automatic status viewing and custom reactions.
 *
 * Usage:
 *   .autostatus on
 *   .autostatus off
 *   .autostatus set ❌😔✌️☕😎😊🥺
 *   .autostatus status
 */
'use strict';

function validEmojiSequence(value) {
    const emoji = String(value || '').trim();
    if (!emoji || /\s/.test(emoji) || [...emoji].length > 24) return false;
    return /\p{Extended_Pictographic}/u.test(emoji);
}

module.exports = {
    name: 'autoviewstatus',
    aliases: ['autostatus', 'avs', 'autoview'],
    description: 'Automatically view statuses and react with custom emojis',
    usage: '.autostatus on|off|set <emoji>|status',
    category: 'owner',

    async execute({ args, reply, database, phoneNumber, isOwner }) {
        if (!isOwner) return reply('🔒 *This command is for the bot owner only.*');

        const setting = database.getAutoStatusReaction(phoneNumber);
        const action = (args[0] || '').toLowerCase();

        if (action === 'status' || !action) {
            return reply(
                `╔════════════════════════════════╗\n` +
                `║       👁️  *AUTO STATUS*         ║\n` +
                `╚════════════════════════════════╝\n\n` +
                `Status: *${setting.enabled ? '✅ ON' : '❌ OFF'}*\n` +
                `Reaction: ${setting.emoji}\n\n` +
                `*Commands:*\n` +
                `▸ .autostatus on\n` +
                `▸ .autostatus off\n` +
                `▸ .autostatus set ❌😔✌️☕😎😊🥺\n` +
                `▸ .autostatus status`
            );
        }

        if (action === 'on' || action === 'enable') {
            database.setAutoStatusReaction(phoneNumber, { enabled: true, emoji: setting.emoji });
            return reply(`✅ *AutoStatus ON*\n\nEvery incoming status will be viewed and reacted to with ${setting.emoji}.`);
        }

        if (action === 'off' || action === 'disable') {
            database.setAutoStatusReaction(phoneNumber, { enabled: false, emoji: setting.emoji });
            return reply('❌ *AutoStatus OFF*\n\nAutomatic status viewing and reactions are disabled.');
        }

        if (action === 'set') {
            const emoji = args.slice(1).join('');
            if (!validEmojiSequence(emoji)) {
                return reply('❌ Provide emoji only, up to 24 symbols.\n\nExample: `.autostatus set ❌😔✌️☕😎😊🥺☕`');
            }
            database.setAutoStatusReaction(phoneNumber, { enabled: true, emoji });
            return reply(`✅ *AutoStatus reaction updated to ${emoji}*\n\nAutoStatus is now ON.`);
        }

        return reply('⚠️ Use `.autostatus on`, `.autostatus off`, `.autostatus set <emoji>`, or `.autostatus status`.');
    },
};
