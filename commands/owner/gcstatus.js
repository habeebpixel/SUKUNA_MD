'use strict';

const { getGroups, normalizeGroup, selectedTarget, buildPayload, send } = require('../../utils/gcstatus');

module.exports = {
    name: 'gcstatus',
    aliases: ['groupstatus', 'gstatus'],
    description: 'Post text or quoted media as a clear group status',
    usage: '.gcstatus [group_jid] <text> or reply to media with .gcstatus [group_jid] [caption]',
    category: 'owner',
    ownerOnly: true,
    async execute({ sock, msg, args, from, isGroup, reply }) {
        const option = String(args[0] || '').toLowerCase();
        if (option === 'list' || option === 'groups') {
            const groups = await getGroups(sock);
            return reply(groups.length
                ? `📋 *Groups available for group status*\n${groups.map((group, index) => `${index + 1}. ${group.subject} — ${group.id}`).join('\n')}`
                : '📋 No groups found.');
        }

        const chosen = selectedTarget(args, from, isGroup);
        let target = chosen.target;
        let textArgs = chosen.textArgs;
        if (!target) {
            const groups = await getGroups(sock);
            if (groups.length === 1) {
                target = groups[0].id;
            } else {
                return reply('⚠️ Choose a target group first. Use `.gcstatus list`, then `.gcstatus <group_jid> <text>`.');
            }
        }

        const text = textArgs.join(' ').trim();
        try {
            const built = await buildPayload(sock, msg, text);
            await send(sock, target, built, msg);
            return reply(`✅ Group status posted to *${target}* with a clear preview.`);
        } catch (error) {
            return reply(`❌ Could not post group status: ${error.message || 'unknown error'}`);
        }
    },
};
