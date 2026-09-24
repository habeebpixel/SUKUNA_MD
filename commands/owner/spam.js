'use strict';

const crypto = require('crypto');

/* ─────────────────────────────────────────────────────────────
   .spam <count> <number>

   Uses the EXACT reference signatures:

     sock.reportSpam(groupJid, [{id, from, t}], 'group_info_report', 'Example group')
     sock.reportUser(userJid, 'spam')
     sock.reportMessage(userJid, messageId, 'harassment', participantJid)
     sock.reportAndBlockUser(userJid, 'scam')
     sock.updateBlockStatus(userJid, 'block' | 'unblock')

   groupJid    = the chat/group where the cmd was run  (from)
   userJid     = the normalised target JID
   participantJid = same as userJid in DM / user-targeting context

   Usage:
     .spam 3 +2349127757212
     .spam 5 2349127757212
     .spam 2 +234 912 775 7212
     .spam 1 +234-912-775-7212
───────────────────────────────────────────────────────────── */

function normaliseJid(raw) {
    const digits = String(raw).replace(/\D/g, '');
    if (!digits || digits.length < 7) return null;
    return digits + '@s.whatsapp.net';
}

function fakeMsgId() {
    return '3EB0' + crypto.randomBytes(8).toString('hex').toUpperCase();
}

function wait(ms) {
    return new Promise(function(r) { setTimeout(r, ms); });
}

async function reportCycle(sock, groupJid, userJid) {
    const messageId    = fakeMsgId();
    const participantJid = userJid;
    const results      = { ok: 0, fail: 0 };

    /* 1 ── reportSpam (exact reference) */
    try {
        await sock.reportSpam(
            groupJid,
            [{ id: messageId, from: userJid, t: Math.floor(Date.now() / 1000) }],
            'group_info_report',
            'Example group'
        );
        results.ok++;
    } catch (_) { results.fail++; }

    /* 2 ── reportUser (exact reference) */
    try {
        const userAccepted = await sock.reportUser(userJid, 'spam');
        results.ok++;
    } catch (_) { results.fail++; }

    /* 3 ── reportMessage (exact reference) */
    try {
        const messageAccepted = await sock.reportMessage(
            userJid,
            messageId,
            'harassment',
            participantJid
        );
        results.ok++;
    } catch (_) { results.fail++; }

    /* 4 ── reportAndBlockUser (exact reference) */
    try {
        await sock.reportAndBlockUser(userJid, 'scam');
        results.ok++;
    } catch (_) { results.fail++; }

    /* 5 ── block */
    try {
        await sock.updateBlockStatus(userJid, 'block');
        results.ok++;
    } catch (_) { results.fail++; }

    await wait(200);

    /* 6 ── unblock */
    try {
        await sock.updateBlockStatus(userJid, 'unblock');
        results.ok++;
    } catch (_) { results.fail++; }

    await wait(200);

    return results;
}

module.exports = {
    name: 'spam',
    aliases: ['reportspam', 'massreport', 'nuke'],
    description: 'Mass-report a number using all reference report methods + block/unblock cycles. Owner only.',
    usage: '.spam <count> <number>   e.g. .spam 3 +2349127757212',
    category: 'admin',

    async execute({ sock, msg, from, reply, isOwner, isBotOwner, args }) {
        if (!isOwner && !isBotOwner) {
            return reply('⛔ Owner only.');
        }

        if (!args || args.length < 2) {
            return reply(
                '❌ *Usage:* `.spam <count> <number>`\n\n' +
                'Examples:\n' +
                '`.spam 3 +2349127757212`\n' +
                '`.spam 5 2348012345678`\n' +
                '`.spam 2 +234 912 775 7212`'
            );
        }

        const count      = Math.min(10, Math.max(1, parseInt(args[0]) || 1));
        const rawNumber  = args.slice(1).join('');
        const userJid    = normaliseJid(rawNumber);
        const groupJid   = from; /* chat where the cmd was run */

        if (!userJid) {
            return reply('❌ Invalid number. Include the country code.\nExample: `.spam 3 +2349127757212`');
        }

        const displayNum = '+' + userJid.replace('@s.whatsapp.net', '');

        await reply(
            '💀 *DOMAIN EXPANSION*\n\n' +
            '🎯 Target  : `' + displayNum + '`\n' +
            '🔄 Cycles  : `' + count + '`\n' +
            '⚡ Actions/cycle : `6`\n' +
            '📊 Total hits    : `' + (count * 6) + '`\n\n' +
            '_Executing..._'
        );

        let totalOk = 0, totalFail = 0;

        for (let i = 0; i < count; i++) {
            const r = await reportCycle(sock, groupJid, userJid);
            totalOk   += r.ok;
            totalFail += r.fail;
        }

        await reply(
            '✅ *Done*\n\n' +
            '🎯 Target  : `' + displayNum + '`\n' +
            '🔄 Cycles  : `' + count + '`\n' +
            '✅ Landed  : `' + totalOk + '`\n' +
            (totalFail > 0 ? '❌ Missed  : `' + totalFail + '`\n' : '') +
            '\n_Reports submitted. WhatsApp review pending._'
        );
    },
};
