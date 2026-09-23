/**
 * cmdlist — List all sticker/emoji → command bindings in this group.
 * Usage: .cmdlist
 */

'use strict';

const database = require('../../utils/database');

module.exports = {
    name:        'cmdlist',
    aliases:     ['stickerlist', 'bindlist'],
    description: 'List all sticker and emoji command bindings in this group',
    usage:       '.cmdlist',
    category:    'general',

    async execute({ from, reply }) {
        const stickers = Object.entries(database.getAllStickerCmds(from));
        const emojis = Object.entries(database.getAllEmojiCmds(from));
        const entries = [
            ...stickers.map(([key, cmd]) => ({ kind: 'Sticker', key, cmd })),
            ...emojis.map(([key, cmd]) => ({ kind: 'Emoji', key, cmd })),
        ];

        if (entries.length === 0) {
            return reply(
                '📋 *Sticker/Emoji Command List*\n\n' +
                'No sticker or emoji bindings set in this group yet.\n\n' +
                '_Use .setcmd <command> while replying to a sticker or emoji._'
            );
        }

        const lines = entries.map(({ kind, key, cmd }, i) =>
            `${i + 1}. ${kind} ${kind === 'Emoji' ? key : '→'} .${cmd}`
        ).join('\n');

        reply(
            '📋 *Sticker/Emoji Command Bindings*\n\n' +
            lines + '\n\n' +
            `Total: *${entries.length}* binding${entries.length === 1 ? '' : 's'}\n\n` +
            '_Reply to the sticker or emoji with .unsetcmd to remove a binding._'
        );
    },
};
