'use strict';

const { extractRequestJid, resolvePendingRequestJids, COUNTRY_CODES } = require('../group/listrequestinfo')._private;

/**
 * .approve all          — approve every pending join request
 * .approve <N>          — approve only the first N pending requests
 * .approve +234         — approve only requests whose real phone starts 234
 * .approve              — show current pending count and usage
 */
async function approveInBatches(sock, from, ids, batchSize = 50) {
    let approved = 0;
    const failed = [];
    for (let i = 0; i < ids.length; i += batchSize) {
        const chunk = ids.slice(i, i + batchSize);
        try {
            const res = await sock.groupRequestParticipantsUpdate(from, chunk, 'approve');
            // res is an array of { jid, status } — count successes if shape matches
            if (Array.isArray(res)) {
                approved += res.filter(r => String(r.status) === '200' || r.status === 200).length;
            } else {
                approved += chunk.length;
            }
        } catch (err) {
            failed.push({ chunk, error: err.message });
        }
    }
    return { approved, failed };
}

function normalizeCountryCode(value) {
    return String(value || '').replace(/\D/g, '');
}

function isCountryArgument(value) {
    const raw = String(value || '').trim();
    const code = normalizeCountryCode(raw);
    return Boolean(code) && (raw.startsWith('+') || (code.length === 3 && COUNTRY_CODES.some(([known]) => known === code)));
}

function requestPhoneJid(request) {
    // LID digits are opaque identifiers. extractRequestJid returns null when
    // the request has no real phoneNumber/phone field, so it cannot be used
    // accidentally as a country-code match.
    return extractRequestJid(request);
}

function requestMatchesCountry(request, countryCode) {
    const phoneJid = requestPhoneJid(request);
    if (!phoneJid) return false;
    const digits = phoneJid.split('@')[0].split(':')[0].replace(/\D/g, '');
    return digits.startsWith(countryCode);
}

function requestApprovalJid(request) {
    if (typeof request === 'string') return request;
    // The approval API needs the request's original identifier. Matching is
    // done with phoneNumber, but approval should still target request.jid/id
    // (which may legitimately be an @lid).
    return request?.jid || request?.id || request?.participant || request?.userJid || null;
}

module.exports = {
    name: 'approve',
    description: 'Approve pending group join requests (.approve all | .approve <N> | .approve +234)',
    category: 'admin',

    async execute({ sock, reply, args = [], from, isGroup, isAdmin }) {
        if (!isGroup) return reply('👥 This command can only be used in groups!');
        if (!isAdmin) return reply('🔒 Admins only.');

        let pending;
        try {
            pending = await sock.groupRequestParticipantsList(from);
        } catch (err) {
            return reply(`❌ Couldn't fetch join requests: ${err.message}`);
        }

        const total = pending?.length || 0;
        if (!args[0]) {
            return reply(
                `📋 *Pending join requests:* ${total}\n\n` +
                `Usage:\n` +
                `• *.approve all* — approve every pending request\n` +
                `• *.approve <N>* — approve only the first N requests\n` +
                `• *.approve +234* — approve only Nigerian requests using real phone numbers`
            );
        }
        if (total === 0) return reply('✅ No pending join requests.');

        const arg = String(args[0]).toLowerCase();
        let selectedRequests;
        const countryCode = isCountryArgument(arg) ? normalizeCountryCode(arg) : '';

        if (countryCode) {
            if (!countryCode) return reply('❌ Usage: *.approve +234* or another country calling code.');
            const resolvedRequests = await resolvePendingRequestJids(pending, sock, from);
            selectedRequests = resolvedRequests
                .filter(entry => entry.jid.split('@')[0].split(':')[0].replace(/\D/g, '').startsWith(countryCode))
                .map(entry => entry.request);
            if (!selectedRequests.length) {
                return reply(`📭 No pending requests with resolvable real phone numbers starting with +${countryCode}.`);
            }
        } else if (arg === 'all') {
            selectedRequests = pending;
        } else {
            const n = parseInt(arg, 10);
            if (!Number.isFinite(n) || n <= 0) {
                return reply('❌ Usage: *.approve all*, *.approve <number>*, or *.approve +234*.');
            }
            selectedRequests = pending.slice(0, Math.min(n, total));
        }

        const ids = selectedRequests.map(requestApprovalJid).filter(Boolean);
        if (!ids.length) return reply('❌ No valid WhatsApp request IDs were returned.');
        const skipped = selectedRequests.length - ids.length;
        const countryNote = countryCode ? ` from real phone numbers starting with +${countryCode}` : '';
        await reply(`⏳ Approving *${ids.length}* of *${total}* pending requests${countryNote}...`);

        const { approved, failed } = await approveInBatches(sock, from, ids);
        let summary = `✅ *Approval complete.*\n\nRequested: *${ids.length}*\nApproved: *${approved}*\nRemaining pending: *${total - approved}*`;
        if (skipped) summary += `\nSkipped without a usable request ID: *${skipped}*`;
        if (failed.length) {
            summary += `\nFailed batches: ${failed.length}\nFirst error: ${failed[0].error}`;
        }
        await reply(summary);
    },
    _private: { normalizeCountryCode, isCountryArgument, requestPhoneJid, requestMatchesCountry, requestApprovalJid }
};
