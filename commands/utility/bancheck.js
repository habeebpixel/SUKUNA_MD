'use strict';

const { checkWithBaron, normalizeNumber, getCountry } = require('./banchecker');

module.exports = {
    name: 'bancheck',
    aliases: [],
    description: 'Check WhatsApp ban status with a plain-text response',
    usage: '.bancheck <number>',
    category: 'utility',

    async execute({ reply, args, isOwner }) {
        if (!isOwner) return reply('❌ *Owner only!*');

        const target = normalizeNumber(args.join(' ').trim());
        if (!target) {
            return reply(
                `🛡️ *TEXT BAN CHECKER*\n\n` +
                `Usage: *.bancheck <number>*\n` +
                `Example: *.bancheck +234 912 781 4853*\n\n` +
                `Use the full country code. Spaces, +, and dashes are accepted.`
            );
        }

        try {
            const baron = await checkWithBaron(target);
            const isBanned = baron.banned === true;
            const reason = baron.reason ? `\nReason: ${String(baron.reason)}` : '';
            return reply(
                `🛡️ WHATSAPP BAN CHECK\n\n` +
                `Number: +${target}\n` +
                `Country: ${getCountry(target)}\n` +
                `Status: ${isBanned ? '🔴 BANNED' : '🟢 UNBANNED — ACTIVE'}\n` +
                `Source: Baron Ban Checker API${reason}`
            );
        } catch (error) {
            console.error('[bancheck] Baron API failed:', error.message);
            return reply(`❌ Baron ban check failed: ${error.message}\nTry again or verify the API key.`);
        }
    },
};
