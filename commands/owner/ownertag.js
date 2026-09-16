'use strict';

const database = require('../../utils/database');

const DEFAULT_EMOJI = '🩸';

function userPhoneFrom(sender, fallback) {
    return String(sender || fallback || '').split('@')[0].split(':')[0].replace(/\D/g, '') || String(fallback || '');
}

module.exports = {
    name: 'ownertag',
    aliases: ['ownerreact', 'otag'],
    description: 'Auto-react to messages from the connected owner and authorized moderators',
    usage: '.ownertag | .ownertag on | .ownertag off | .ownertag set <emoji>',
    category: 'owner',

    async execute({ reply, args, phoneNumber, sender, isOwner, isMod }) {
        if (!isOwner && !isMod) return reply('❌ *Owner or Mod only!*');

        // Keep the linked session number as the canonical owner identity even
        // when WhatsApp supplies an @lid sender JID for the paired account.
        const actorPhone = isOwner ? userPhoneFrom(phoneNumber, phoneNumber) : userPhoneFrom(sender, phoneNumber);
        const current = database.getOwnerTag(phoneNumber);
        const action = String(args[0] || 'status').toLowerCase();

        if (action === 'status' || !args[0]) {
            return reply(
                `╭─⌈ 🩸 *SUKUNA OWNER TAG* ⌋\n` +
                `│\n` +
                `│ Status : ${current.enabled ? '✅ ON' : '❌ OFF'}\n` +
                `│ Emoji  : ${current.emoji || DEFAULT_EMOJI}\n` +
                `│\n` +
                `│ .ownertag on\n` +
                `│ .ownertag off\n` +
                `│ .ownertag set <emoji>\n` +
                `╰───\n\n` +
                `_Messages and stickers from the connected owner or authorized mods receive the selected reaction._`
            );
        }

        if (action === 'on' || action === 'enable') {
            database.setOwnerTag(phoneNumber, { enabled: true, emoji: current.emoji || DEFAULT_EMOJI });
            return reply(`✅ *Owner Tag ON*\n\nReaction: ${current.emoji || DEFAULT_EMOJI}`);
        }

        if (action === 'off' || action === 'disable') {
            database.setOwnerTag(phoneNumber, { enabled: false, emoji: current.emoji || DEFAULT_EMOJI });
            return reply('❌ *Owner Tag OFF*');
        }

        if (action === 'set') {
            const emoji = args.slice(1).join('').trim();
            if (!emoji) return reply('❌ Provide an emoji.\n\nExample: `.ownertag set 🩸`');
            database.setOwnerTag(phoneNumber, { enabled: true, emoji });
            return reply(`✅ *Owner Tag updated*\n\nReaction: ${emoji}\nStatus: ON`);
        }

        // Shortcut: `.ownertag 🩸`
        if (args[0]) {
            database.setOwnerTag(phoneNumber, { enabled: true, emoji: args.join('').trim() });
            return reply(`✅ *Owner Tag updated*\n\nReaction: ${args.join('').trim()}\nStatus: ON`);
        }

        return reply('❓ Usage: `.ownertag on` | `.ownertag off` | `.ownertag set <emoji>`');
    },
};
