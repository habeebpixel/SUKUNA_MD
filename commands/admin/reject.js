'use strict';

const {
    extractRequestJid,
    resolvePendingRequestJids,
    COUNTRY_CODES,
} = require('../group/listrequestinfo')._private;

function normalizeCountryCode(value) {
    return String(value || '').replace(/\D/g, '');
}

function isCountryArgument(value) {
    const raw = String(value || '').trim();
    const code = normalizeCountryCode(raw);
    return Boolean(code) && (raw.startsWith('+') || (code.length === 3 && COUNTRY_CODES.some(([known]) => known === code)));
}

function requestMatchesCountry(request, countryCode) {
    const phoneJid = extractRequestJid(request);
    if (!phoneJid) return false;
    const digits = phoneJid.split('@')[0].split(':')[0].replace(/\D/g, '');
    return digits.startsWith(countryCode);
}

function requestApprovalJid(request) {
    if (typeof request === 'string') return request;
    return request?.jid || request?.id || request?.participant || request?.userJid || null;
}

async function rejectInBatches(sock, from, ids, batchSize = 50) {
    let rejected = 0;
    const failed = [];
    for (let i = 0; i < ids.length; i += batchSize) {
        const chunk = ids.slice(i, i + batchSize);
        try {
            const result = await sock.groupRequestParticipantsUpdate(from, chunk, 'reject');
            if (Array.isArray(result)) {
                rejected += result.filter(row => String(row.status) === '200' || row.status === 200).length;
            } else {
                rejected += chunk.length;
            }
        } catch (error) {
            failed.push({ chunk, error: error.message });
        }
    }
    return { rejected, failed };
}

module.exports = {
    name: 'reject',
    description: 'Reject pending group join requests (.reject all | .reject <N> | .reject +234)',
    category: 'admin',
    async execute({ sock, reply, args = [], from, isGroup, isAdmin }) {
        if (!isGroup) return reply('👥 This command can only be used in groups!');
        if (!isAdmin) return reply('🔒 Admins only.');

        let pending;
        try {
            pending = await sock.groupRequestParticipantsList(from);
        } catch (error) {
            return reply(`❌ Couldn't fetch join requests: ${error.message}`);
        }
        const total = Array.isArray(pending) ? pending.length : 0;
        if (!args[0]) {
            return reply(
                `📋 *Pending join requests:* ${total}\n\n` +
                `Usage:\n` +
                `• *.reject all* — reject every pending request\n` +
                `• *.reject <N>* — reject only the first N requests\n` +
                `• *.reject +234* — reject only Nigerian requests using real phone numbers`
            );
        }
        if (!total) return reply('✅ No pending join requests.');

        const arg = String(args[0]).toLowerCase();
        let selectedRequests;
        const countryCode = isCountryArgument(arg) ? normalizeCountryCode(arg) : '';
        if (countryCode) {
            const resolved = await resolvePendingRequestJids(pending, sock, from);
            selectedRequests = resolved
                .filter(entry => entry.jid.split('@')[0].split(':')[0].replace(/\D/g, '').startsWith(countryCode))
                .map(entry => entry.request);
            if (!selectedRequests.length) {
                return reply(`📭 No pending requests with resolvable real phone numbers starting with +${countryCode}.`);
            }
        } else if (arg === 'all') {
            selectedRequests = pending;
        } else {
            const count = parseInt(arg, 10);
            if (!Number.isFinite(count) || count <= 0) {
                return reply('❌ Usage: *.reject all*, *.reject <number>*, or *.reject +234*.');
            }
            selectedRequests = pending.slice(0, Math.min(count, total));
        }

        const ids = selectedRequests.map(requestApprovalJid).filter(Boolean);
        if (!ids.length) return reply('❌ No valid WhatsApp request IDs were returned.');
        const countryNote = countryCode ? ` from real phone numbers starting with +${countryCode}` : '';
        await reply(`⏳ Rejecting *${ids.length}* of *${total}* pending requests${countryNote}...`);
        const { rejected, failed } = await rejectInBatches(sock, from, ids);
        let summary = `✅ *Rejection complete.*\n\nRequested: *${ids.length}*\nRejected: *${rejected}*\nRemaining pending: *${total - rejected}*`;
        if (failed.length) summary += `\nFailed batches: ${failed.length}\nFirst error: ${failed[0].error}`;
        await reply(summary);
    },
    _private: { normalizeCountryCode, isCountryArgument, requestMatchesCountry, requestApprovalJid, rejectInBatches }
};
