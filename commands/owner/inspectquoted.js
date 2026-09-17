'use strict';

module.exports = {
    name: 'inspectquoted',
    aliases: ['quotedinfo', 'qinfo'],
    description: 'Inspect the message quoted in the current command',
    usage: '.inspectquoted',
    category: 'owner',

    async execute({ m, reply, isOwner }) {
        if (!isOwner) return reply('🔒 Owner only.');
        if (!m?.quoted?.message) {
            return reply(
                '⚠️ Reply to a message first, then send `.inspectquoted`.\n\n' +
                'This command reads the raw payload from `m.quoted.message`.'
            );
        }
        const quoted = m.quoted;
        const keys = Object.keys(quoted.message || {});
        return reply(
            `╔══════════════════════════════╗\n` +
            `║       🧰 QUOTED INSPECTOR     ║\n` +
            `╚══════════════════════════════╝\n\n` +
            `Type: ${quoted.type}\n` +
            `Media: ${quoted.isMedia ? 'YES' : 'NO'}\n` +
            `Sender: ${quoted.sender || 'unknown'}\n` +
            `Message keys: ${keys.join(', ') || 'none'}\n` +
            `Text/caption: ${quoted.text || 'none'}\n\n` +
            `Developer access confirmed:\n` +
            `m.quoted.message`
        );
    },
};
