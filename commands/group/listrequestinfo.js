'use strict';

const { resolvePhoneJid } = require('../../utils/jidTools');

// WhatsApp country calling-code metadata for readable request summaries.
// Longest-prefix matching is used so NANP and 3-digit African/European codes
// are resolved before the generic fallback.
const COUNTRY_CODES = [
    ['1', '🌎', 'NANP'],
    ['20', '🌍', 'Egypt'], ['27', '🇿🇦', 'South Africa'], ['30', '🇬🇷', 'Greece'],
    ['31', '🇳🇱', 'Netherlands'], ['32', '🇧🇪', 'Belgium'], ['33', '🇫🇷', 'France'],
    ['34', '🇪🇸', 'Spain'], ['36', '🇭🇺', 'Hungary'], ['39', '🇮🇹', 'Italy'],
    ['40', '🇷🇴', 'Romania'], ['41', '🇨🇭', 'Switzerland'], ['43', '🇦🇹', 'Austria'],
    ['44', '🇬🇧', 'United Kingdom'], ['45', '🇩🇰', 'Denmark'], ['46', '🇸🇪', 'Sweden'],
    ['47', '🇳🇴', 'Norway'], ['48', '🇵🇱', 'Poland'], ['49', '🇩🇪', 'Germany'],
    ['51', '🇵🇪', 'Peru'], ['52', '🇲🇽', 'Mexico'], ['53', '🇨🇺', 'Cuba'],
    ['54', '🇦🇷', 'Argentina'], ['55', '🇧🇷', 'Brazil'], ['56', '🇨🇱', 'Chile'],
    ['57', '🇨🇴', 'Colombia'], ['58', '🇻🇪', 'Venezuela'], ['60', '🇲🇾', 'Malaysia'],
    ['61', '🇦🇺', 'Australia'], ['62', '🇮🇩', 'Indonesia'], ['63', '🇵🇭', 'Philippines'],
    ['64', '🇳🇿', 'New Zealand'], ['65', '🇸🇬', 'Singapore'], ['66', '🇹🇭', 'Thailand'],
    ['7', '🇷🇺', 'Russia/Kazakhstan'], ['81', '🇯🇵', 'Japan'], ['82', '🇰🇷', 'South Korea'],
    ['84', '🇻🇳', 'Vietnam'], ['86', '🇨🇳', 'China'], ['90', '🇹🇷', 'Turkey'],
    ['91', '🇮🇳', 'India'], ['92', '🇵🇰', 'Pakistan'], ['93', '🇦🇫', 'Afghanistan'],
    ['94', '🇱🇰', 'Sri Lanka'], ['95', '🇲🇲', 'Myanmar'], ['98', '🇮🇷', 'Iran'],
    ['211', '🇸🇸', 'South Sudan'], ['212', '🇲🇦', 'Morocco'], ['213', '🇩🇿', 'Algeria'],
    ['216', '🇹🇳', 'Tunisia'], ['218', '🇱🇾', 'Libya'], ['220', '🇬🇲', 'Gambia'],
    ['221', '🇸🇳', 'Senegal'], ['222', '🇲🇷', 'Mauritania'], ['223', '🇲🇱', 'Mali'],
    ['224', '🇬🇳', 'Guinea'], ['225', '🇨🇮', 'Côte d’Ivoire'], ['226', '🇧🇫', 'Burkina Faso'],
    ['227', '🇳🇪', 'Niger'], ['228', '🇹🇬', 'Togo'], ['229', '🇧🇯', 'Benin'],
    ['230', '🇲🇺', 'Mauritius'], ['231', '🇱🇷', 'Liberia'], ['232', '🇸🇱', 'Sierra Leone'],
    ['233', '🇬🇭', 'Ghana'], ['234', '🇳🇬', 'Nigeria'], ['235', '🇹🇩', 'Chad'],
    ['236', '🇨🇫', 'Central African Republic'], ['237', '🇨🇲', 'Cameroon'], ['238', '🇨🇻', 'Cape Verde'],
    ['239', '🇸🇹', 'São Tomé and Príncipe'], ['240', '🇬🇶', 'Equatorial Guinea'], ['241', '🇬🇦', 'Gabon'],
    ['242', '🇨🇬', 'Republic of the Congo'], ['243', '🇨🇩', 'DR Congo'], ['244', '🇦🇴', 'Angola'],
    ['245', '🇬🇼', 'Guinea-Bissau'], ['246', '🇮🇴', 'British Indian Ocean Territory'], ['248', '🇸🇨', 'Seychelles'],
    ['249', '🇸🇩', 'Sudan'], ['250', '🇷🇼', 'Rwanda'], ['251', '🇪🇹', 'Ethiopia'],
    ['252', '🇸🇴', 'Somalia'], ['253', '🇩🇯', 'Djibouti'], ['254', '🇰🇪', 'Kenya'],
    ['255', '🇹🇿', 'Tanzania'], ['256', '🇺🇬', 'Uganda'], ['257', '🇧🇮', 'Burundi'],
    ['258', '🇲🇿', 'Mozambique'], ['260', '🇿🇲', 'Zambia'], ['261', '🇲🇬', 'Madagascar'],
    ['262', '🇷🇪', 'Réunion/Mayotte'], ['263', '🇿🇼', 'Zimbabwe'], ['264', '🇳🇦', 'Namibia'],
    ['265', '🇲🇼', 'Malawi'], ['266', '🇱🇸', 'Lesotho'], ['267', '🇧🇼', 'Botswana'],
    ['268', '🇸🇿', 'Eswatini'], ['269', '🇰🇲', 'Comoros'], ['290', '🇸🇭', 'Saint Helena'],
    ['291', '🇪🇷', 'Eritrea'], ['297', '🇦🇼', 'Aruba'], ['298', '🇫🇴', 'Faroe Islands'],
    ['299', '🇬🇱', 'Greenland'], ['350', '🇬🇮', 'Gibraltar'], ['351', '🇵🇹', 'Portugal'],
    ['352', '🇱🇺', 'Luxembourg'], ['353', '🇮🇪', 'Ireland'], ['354', '🇮🇸', 'Iceland'],
    ['355', '🇦🇱', 'Albania'], ['356', '🇲🇹', 'Malta'], ['357', '🇨🇾', 'Cyprus'],
    ['358', '🇫🇮', 'Finland'], ['359', '🇧🇬', 'Bulgaria'], ['370', '🇱🇹', 'Lithuania'],
    ['371', '🇱🇻', 'Latvia'], ['372', '🇪🇪', 'Estonia'], ['373', '🇲🇩', 'Moldova'],
    ['374', '🇦🇲', 'Armenia'], ['375', '🇧🇾', 'Belarus'], ['376', '🇦🇩', 'Andorra'],
    ['377', '🇲🇨', 'Monaco'], ['378', '🇸🇲', 'San Marino'], ['380', '🇺🇦', 'Ukraine'],
    ['381', '🇷🇸', 'Serbia'], ['382', '🇲🇪', 'Montenegro'], ['385', '🇭🇷', 'Croatia'],
    ['386', '🇸🇮', 'Slovenia'], ['387', '🇧🇦', 'Bosnia and Herzegovina'], ['389', '🇲🇰', 'North Macedonia'],
    ['420', '🇨🇿', 'Czechia'], ['421', '🇸🇰', 'Slovakia'], ['423', '🇱🇮', 'Liechtenstein'],
    ['500', '🇫🇰', 'Falkland Islands'], ['501', '🇧🇿', 'Belize'], ['502', '🇬🇹', 'Guatemala'],
    ['503', '🇸🇻', 'El Salvador'], ['504', '🇭🇳', 'Honduras'], ['505', '🇳🇮', 'Nicaragua'],
    ['506', '🇨🇷', 'Costa Rica'], ['507', '🇵🇦', 'Panama'], ['509', '🇭🇹', 'Haiti'],
    ['590', '🇬🇵', 'Guadeloupe'], ['591', '🇧🇴', 'Bolivia'], ['592', '🇬🇾', 'Guyana'],
    ['593', '🇪🇨', 'Ecuador'], ['594', '🇬🇫', 'French Guiana'], ['595', '🇵🇾', 'Paraguay'],
    ['596', '🇲🇶', 'Martinique'], ['597', '🇸🇷', 'Suriname'], ['598', '🇺🇾', 'Uruguay'],
    ['599', '🇨🇼', 'Curaçao'], ['670', '🇹🇱', 'Timor-Leste'], ['673', '🇧🇳', 'Brunei'],
    ['674', '🇳🇷', 'Nauru'], ['675', '🇵🇬', 'Papua New Guinea'], ['676', '🇹🇴', 'Tonga'],
    ['677', '🇸🇧', 'Solomon Islands'], ['678', '🇻🇺', 'Vanuatu'], ['679', '🇫🇯', 'Fiji'],
    ['680', '🇵🇼', 'Palau'], ['685', '🇼🇸', 'Samoa'], ['686', '🇰🇮', 'Kiribati'],
    ['688', '🇹🇻', 'Tuvalu'], ['689', '🇵🇫', 'French Polynesia'], ['690', '🇹🇰', 'Tokelau'],
    ['691', '🇫🇲', 'Micronesia'], ['692', '🇲🇭', 'Marshall Islands'], ['850', '🇰🇵', 'North Korea'],
    ['852', '🇭🇰', 'Hong Kong'], ['853', '🇲🇴', 'Macau'], ['855', '🇰🇭', 'Cambodia'],
    ['856', '🇱🇦', 'Laos'], ['880', '🇧🇩', 'Bangladesh'], ['886', '🇹🇼', 'Taiwan'],
    ['960', '🇲🇻', 'Maldives'], ['961', '🇱🇧', 'Lebanon'], ['962', '🇯🇴', 'Jordan'],
    ['963', '🇸🇾', 'Syria'], ['964', '🇮🇶', 'Iraq'], ['965', '🇰🇼', 'Kuwait'],
    ['966', '🇸🇦', 'Saudi Arabia'], ['967', '🇾🇪', 'Yemen'], ['968', '🇴🇲', 'Oman'],
    ['970', '🇵🇸', 'Palestine'], ['971', '🇦🇪', 'United Arab Emirates'], ['972', '🇮🇱', 'Israel'],
    ['973', '🇧🇭', 'Bahrain'], ['974', '🇶🇦', 'Qatar'], ['975', '🇧🇹', 'Bhutan'],
    ['976', '🇲🇳', 'Mongolia'], ['977', '🇳🇵', 'Nepal'], ['992', '🇹🇯', 'Tajikistan'],
    ['993', '🇹🇲', 'Turkmenistan'], ['994', '🇦🇿', 'Azerbaijan'], ['995', '🇬🇪', 'Georgia'],
    ['996', '🇰🇬', 'Kyrgyzstan'], ['998', '🇺🇿', 'Uzbekistan']
].sort((a, b) => b[0].length - a[0].length);

function digitsFromJid(value) {
    return String(value || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}

function classifyJid(jid) {
    const digits = digitsFromJid(jid);
    if (!digits) return { prefix: 'unknown', flag: '⚪', country: 'Unknown' };
    const match = COUNTRY_CODES.find(([code]) => digits.startsWith(code));
    if (match) return { prefix: `+${match[0]}`, flag: match[1], country: match[2] };
    return { prefix: `+${digits.slice(0, Math.min(3, digits.length))}`, flag: '🌐', country: 'Other/unknown' };
}

const JID_KEYS = new Set([
    'jid', 'id', 'participant', 'participantJid', 'user', 'userJid',
    'requester', 'requesterJid', 'phone', 'phoneNumber', 'number'
]);
// WhatsApp can return both an opaque participant LID and the real phone JID
// for a pending request. These fields must win over id/jid, otherwise the LID
// digits are incorrectly treated as an international phone number.
const REAL_PHONE_KEYS = [
    'phoneNumber', 'phone', 'number', 'userPhoneNumber', 'requesterPhoneNumber'
];
const CONTAINER_KEYS = new Set([
    'requests', 'participants', 'items', 'results', 'data', 'entries',
    'membership_approval_requests', 'membership_approval_request', 'attrs',
    'user', 'requester', 'participant', 'data'
]);

function looksLikeJidOrPhone(value) {
    if (typeof value !== 'string') return false;
    const text = value.trim();
    const digits = text.replace(/\D/g, '');
    return digits.length >= 7 && (text.includes('@') || /^\+?\d[\d\s().-]{6,}$/.test(text));
}

function isLid(value) {
    return String(value || '').trim().toLowerCase().endsWith('@lid');
}

function normalizeRealPhone(value) {
    if (value == null || typeof value === 'object') return null;
    const text = String(value).trim();
    if (!text || isLid(text)) return null;
    const digits = text.split('@')[0].split(':')[0].replace(/\D/g, '');
    return digits.length >= 7 ? `${digits}@s.whatsapp.net` : null;
}

function extractRequestJid(request) {
    if (typeof request === 'string') return normalizeRealPhone(request);
    if (!request || typeof request !== 'object') return null;
    // Always prefer explicit phone-number properties, even when `id` is an
    // @lid. This is the authoritative real-number field from Baileys.
    for (const key of REAL_PHONE_KEYS) {
        const value = request[key];
        const phone = normalizeRealPhone(value);
        if (phone) return phone;
    }
    for (const [key, value] of Object.entries(request)) {
        if (JID_KEYS.has(key) && typeof value === 'string' && looksLikeJidOrPhone(value)) {
            const phone = normalizeRealPhone(value);
            if (phone) return phone;
        }
    }
    // Some binary-node adapters expose the participant under attrs or a nested user object.
    for (const [key, value] of Object.entries(request)) {
        if (CONTAINER_KEYS.has(key)) {
            const found = extractRequestJid(value);
            if (found) return found;
        }
    }
    return null;
}

function extractRequestIdentifier(request) {
    if (typeof request === 'string') return request;
    if (!request || typeof request !== 'object') return null;
    // Keep the original identifier for WhatsApp approval. It may be an @lid;
    // the real phone JID is resolved separately for country recognition.
    for (const key of ['jid', 'id', 'participant', 'participantJid', 'requesterJid', 'userJid']) {
        if (typeof request[key] === 'string' && request[key].trim()) return request[key].trim();
    }
    for (const key of CONTAINER_KEYS) {
        if (request[key]) {
            const found = extractRequestIdentifier(request[key]);
            if (found) return found;
        }
    }
    return null;
}

async function resolvePendingRequestJids(requests, sock, from, metadata = null) {
    const source = Array.isArray(requests) ? requests : [];
    const resolved = [];
    let cursor = 0;
    // Resolve in bounded parallelism so large request lists do not hammer the
    // Baileys LID mapping store.
    const worker = async () => {
        while (cursor < source.length) {
            const index = cursor++;
            const request = source[index];
            const explicit = extractRequestJid(request);
            const identifier = extractRequestIdentifier(request);
            let phoneJid = explicit && explicit.endsWith('@s.whatsapp.net') ? explicit : null;
            if (!phoneJid && identifier) {
                const result = await resolvePhoneJid(identifier, sock, from, metadata);
                if (result.jid?.endsWith('@s.whatsapp.net')) phoneJid = result.jid;
            }
            resolved[index] = { request, jid: phoneJid };
        }
    };
    await Promise.all(Array.from({ length: Math.min(20, source.length) }, worker));
    return resolved.filter(Boolean);
}

function extractRequestJids(input) {
    const found = [];
    const visit = (value) => {
        if (Array.isArray(value)) {
            for (const item of value) visit(item);
            return;
        }
        if (typeof value === 'string') {
            const jid = extractRequestJid(value);
            if (jid) found.push(jid);
            return;
        }
        if (!value || typeof value !== 'object') return;
        const direct = extractRequestJid(value);
        if (direct) {
            found.push(direct);
            return;
        }
        for (const [key, child] of Object.entries(value)) {
            if (CONTAINER_KEYS.has(key) || Array.isArray(child)) visit(child);
        }
    };
    visit(input);
    return [...new Map(found.map(jid => [String(jid), jid])).values()];
}

function aggregateRequests(requests = []) {
    const buckets = new Map();
    for (const jid of extractRequestJids(requests)) {
        const category = classifyJid(jid);
        const current = buckets.get(category.prefix) || { ...category, count: 0 };
        current.count += 1;
        buckets.set(category.prefix, current);
    }
    return [...buckets.values()].sort((a, b) => b.count - a.count || a.prefix.localeCompare(b.prefix));
}

function normalizeCountryCode(value) {
    return String(value || '').replace(/\D/g, '');
}

function filterRequestsByCountry(jids, countryCode) {
    const code = normalizeCountryCode(countryCode);
    if (!code) return [];
    return extractRequestJids(jids).filter(jid => digitsFromJid(jid).startsWith(code));
}

function formatReport(rows, total, subject, prefix = '.') {
    if (!total) {
        return `📋 *REQUEST INFO*\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n\n🏷️ *Group:* ${subject || 'This group'}\n📭 No pending join requests found.`;
    }
    const knownCount = rows.reduce((sum, row) => sum + row.count, 0);
    const unknownCount = Math.max(0, total - knownCount);
    const lines = rows.map(row => `${row.flag} *${row.prefix}* — *${row.count} req*`);
    if (unknownCount) lines.push(`⚪ *Unknown real number* — *${unknownCount} req*`);
    return `📋 *REQUEST INFO*\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n\n🏷️ *Group:* ${subject || 'This group'}\n📊 *Total requests:* ${total}\n\n${lines.join('\n')}\n\n_Use ${prefix}linfo 234 to list requesters from Nigeria._`;
}

function formatCountryRequests(jids, countryCode, subject, prefix = '.') {
    const code = normalizeCountryCode(countryCode);
    const rows = extractRequestJids(jids);
    const matching = filterRequestsByCountry(rows, code);
    const category = classifyJid(matching[0] || code);
    if (!matching.length) {
        return `📋 *REQUEST INFO — +${code}*\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n\n🏷️ *Group:* ${subject || 'This group'}\n📭 No requests found for *+${code}*.`;
    }
    const numbers = matching.map(jid => `+${digitsFromJid(jid)}`);
    const lines = numbers.map((number, index) => `${index + 1}. ${number}`);
    return `📋 *${category.flag} REQUESTERS FROM +${code}*\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n\n🏷️ *Group:* ${subject || 'This group'}\n🌍 *Country:* ${category.country}\n📊 *Matching requests:* ${matching.length}\n\n${lines.join('\n')}\n\n_Use ${prefix}linfo for the full country summary._`;
}

module.exports = {
    name: 'listrequestinfo',
    aliases: ['linfo'],
    description: 'List pending group join requests by phone country code',
    usage: '.linfo',
    category: 'group',
    groupOnly: true,
    async execute({ sock, from, args = [], reply, prefix = '.' }) {
        if (!String(from || '').endsWith('@g.us')) {
            return reply('⚠️ This command can only be used inside a group.');
        }
        if (typeof sock?.groupRequestParticipantsList !== 'function') {
            return reply('❌ This Baileys build does not support listing group join requests.');
        }
        try {
            const requests = await sock.groupRequestParticipantsList(from);
            let metadata = null;
            try {
                metadata = await sock.groupMetadata(from);
            } catch (_) {}
            const resolvedRequests = await resolvePendingRequestJids(requests, sock, from, metadata);
            const requestJids = resolvedRequests.map(entry => entry.jid).filter(Boolean);
            const totalRequests = Array.isArray(requests) ? requests.length : requestJids.length;
            const requestedCode = normalizeCountryCode(args[0]);
            const subject = metadata?.subject || '';
            if (requestedCode) {
                const matching = filterRequestsByCountry(requestJids, requestedCode);
                const report = formatCountryRequests(requestJids, requestedCode, subject, prefix);
                // Keep large requester lists within WhatsApp’s message-size limits.
                if (report.length <= 12000) return reply(report);
                const header = report.slice(0, report.indexOf('\n\n', report.indexOf('Matching requests:')) + 2);
                const numbers = matching.map(jid => `+${digitsFromJid(jid)}`);
                await reply(`${header}${numbers.slice(0, 250).map((number, index) => `${index + 1}. ${number}`).join('\n')}`);
                for (let offset = 250; offset < numbers.length; offset += 250) {
                    await reply(numbers.slice(offset, offset + 250).map((number, index) => `${offset + index + 1}. ${number}`).join('\n'));
                }
                return;
            }
            return reply(formatReport(aggregateRequests(requestJids), totalRequests, subject, prefix));
        } catch (error) {
            console.error('[listrequestinfo] failed:', error?.message || error);
            return reply('❌ I could not read this group’s pending requests. Make sure I have permission to view them, then try again.');
        }
    },
    _private: { digitsFromJid, classifyJid, extractRequestJid, extractRequestIdentifier, extractRequestJids, resolvePendingRequestJids, aggregateRequests, normalizeCountryCode, filterRequestsByCountry, formatReport, formatCountryRequests, COUNTRY_CODES }
};
