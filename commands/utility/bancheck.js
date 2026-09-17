'use strict';

const { checkWithBaron, normalizeNumber, getCountry } = require('./banchecker');
const { sendSukunaBanCanvas } = require('../../utils/genaiRich');
const database = require('../../utils/database');

module.exports = {
    name: 'bancheck',
    aliases: [],
    description: 'Check WhatsApp ban status with a plain-text response',
    usage: '.bancheck <number>',
    category: 'utility',

    async execute({ sock, msg, from, reply, args, isOwner }) {
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
            const resultText =
                `🛡️ SUKUNA BAN CHECK REPORT\n\n` +
                `Number: +${target}\n` +
                `Country: ${getCountry(target)}\n` +
                `Status: ${isBanned ? '🔴 BANNED' : '🟢 UNBANNED — ACTIVE'}\n` +
                `Source: Baron Ban Checker API${reason}`;
            if ((sock?.__sukunaDeviceMode || database.getDeviceMode()) === 'iphone') {
                return sendSukunaBanCanvas({
                    sock,
                    jid: from,
                    quoted: msg,
                    number: target,
                    banned: isBanned,
                    caption: resultText,
                });
            }
            return reply(resultText);
        } catch (error) {
            console.error('[bancheck] Baron API failed:', error.message);
            return reply(`❌ Baron ban check failed: ${error.message}\nTry again or verify the API key.`);
        }
    },
};
