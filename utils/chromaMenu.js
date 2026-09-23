'use strict';

// ── chromaMenu ──────────────────────────────────────────────────────────
// Renders the `.setdesign chroma` menu as a real WhatsApp native-flow
// interactive message: an optional banner image, the chroma caption as the
// body, and three tappable buttons — two `cta_url` link buttons plus one
// `single_select` button that opens a bottom-sheet list of every command,
// grouped by category. Tapping a row in that list re-uses the same
// `chroma:<prefix><command>` id the button router already understands
// (see handleButtonResponse in lib/sessionManager.js), so no other file
// needs to change for taps to actually run commands.
//
// This replaces the previous richResponseMessage/GenAI3P payload, which
// never consumed the caption/botName/version/etc. arguments menu.js was
// already passing in, and used an unverified widget schema. Every other
// interactive command in this codebase (dial.js, peek.js, gcall.js,
// roadmapButtons.js, chromatic.js, pint.js) builds a raw
// proto.Message.InteractiveMessage by hand instead of relying on shorthand
// helpers — that's a strong signal it's the pattern that actually renders
// reliably on this fork, so this file follows the same proven approach.

const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = require('@pasqua-baileys/baileys');
const config = require('../config');

const MENU_IMAGE_URLS = [
    'https://files.catbox.moe/xcmgzc.jpg',
    'https://files.catbox.moe/grc4jn.jpg',
    'https://files.catbox.moe/r8zoof.jpg',
];
let menuImageIndex = 0;
function nextMenuImage() {
    const url = MENU_IMAGE_URLS[menuImageIndex % MENU_IMAGE_URLS.length];
    menuImageIndex++;
    return url;
}

const CHANNEL_URL    = 'https://whatsapp.com/channel/0029Vb8YB2T90x2zvQLnEb2k';
const TELEGRAM_URL   = config.owner?.telegram
    ? `https://${String(config.owner.telegram).replace(/^https?:\/\//i, '')}`
    : 'https://t.me/Pasquaking';

// Chroma-only campaign settings. They are environment-overridable so the
// promotion can be changed without touching the other menu designs.
const PASQUA_BRAND = 'PASQUA TECH';
const COUPON_CODE = process.env.PASQUA_MENU_COUPON || 'PASQUA-TECH';
const COUPON_EXPIRES_AT = process.env.PASQUA_MENU_COUPON_EXPIRES_AT || '2026-10-28T23:59:59+01:00';

const CATEGORY_ORDER = ['owner', 'admin', 'moderation', 'economy', 'fun', 'media', 'ai', 'utility', 'group', 'general', 'unicode', 'textmaker', 'games', 'anime-nsfw', '18plus'];

// WhatsApp's native-flow single_select renders as a bottom-sheet list.
// Real clients get sluggish/truncate silently past a certain payload size,
// so — same caution as the reference code's own "stay under N children"
// comment — the tappable list is capped and the plain-text caption (which
// already lists every command) stays the full reference.
const MAX_SECTIONS         = 10;
const MAX_ROWS_PER_SECTION = 8;

function titleCase(category) {
    return String(category || 'general').replace(/(^|-)(\w)/g, (_, divider, letter) => `${divider ? ' ' : ''}${letter.toUpperCase()}`);
}

// Groups the live command registry by category, keeping name + description
// (rows need the description; the old commandCards() only kept names).
function commandCards(commands) {
    const byCategory = new Map();
    const source = commands instanceof Map ? commands.values() : Array.isArray(commands) ? commands : [];

    for (const command of source) {
        if (!command?.name || typeof command.execute !== 'function') continue;
        const category = String(command.category || 'general').toLowerCase();
        if (!byCategory.has(category)) byCategory.set(category, new Map());
        const bucket = byCategory.get(category);
        if (!bucket.has(command.name)) {
            bucket.set(command.name, String(command.description || command.desc || '').trim());
        }
    }

    const categories = [
        ...CATEGORY_ORDER.filter(category => byCategory.has(category)),
        ...Array.from(byCategory.keys()).filter(category => !CATEGORY_ORDER.includes(category)).sort(),
    ];

    return categories.map(category => {
        const bucket = byCategory.get(category);
        const commandList = Array.from(bucket.keys()).sort();
        return {
            title: titleCase(category),
            commands: commandList.map(name => ({ name, description: bucket.get(name) })),
        };
    });
}

// Maps plain ASCII letters/digits to Unicode Mathematical Bold so header
// lines stand out without any special font/rendering support — just plain
// UTF-8 codepoints every WhatsApp client already displays correctly.
function toBold(str) {
    return String(str).replace(/[A-Za-z0-9]/g, (ch) => {
        const code = ch.charCodeAt(0);
        if (ch >= '0' && ch <= '9') return String.fromCodePoint(0x1D7CE + (code - 48));
        if (ch >= 'A' && ch <= 'Z') return String.fromCodePoint(0x1D400 + (code - 65));
        if (ch >= 'a' && ch <= 'z') return String.fromCodePoint(0x1D41A + (code - 97));
        return ch;
    });
}

// Renders a clean, aligned info block + category table:
//   NAME
//   thin rule
//   User / Prefix / Commands / Uptime (only the ones actually provided)
//   thin rule
//   CATEGORY            COUNT
//   thin rule
//   one row per category, dot-padded so counts line up
//   thin rule
//   total footer line
// No box-drawing corners, no decorative glyphs — just consistent spacing
// so it reads as one calm block instead of scattered lines.
function getCouponOffer(now = new Date()) {
    const expiry = new Date(COUPON_EXPIRES_AT);
    if (Number.isNaN(expiry.getTime()) || now > expiry) {
        return { active: false, text: 'This limited-time offer has ended.' };
    }

    const endsOn = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos',
    }).format(expiry);
    return { active: true, code: COUPON_CODE, endsOn };
}

function buildMenuBody({ totalCmds, cards }) {
    const RULE = '━━━━━━━━━━━━━━━━━━━━━━━━';
    const coupon = getCouponOffer();
    const lines = [];

    lines.push(`┏${RULE}┓`);
    lines.push(`┃ 🏷️  *${PASQUA_BRAND}*`);
    if (coupon.active) {
        lines.push('┃ Limited-Time Coupon');
        lines.push(`┃ Code: *${coupon.code}*`);
        lines.push(`┃ Ends on ${coupon.endsOn}`);
    } else {
        lines.push('┃ Limited-Time Coupon');
        lines.push(`┃ ${coupon.text}`);
    }
    lines.push(`┗${RULE}┛`);
    lines.push(`༺ ${toBold(PASQUA_BRAND)} ༻`);
    lines.push(RULE);

    if (cards.length) {
        const nameWidth = Math.max(...cards.map(card => card.title.length), 'CATEGORY'.length);
        lines.push(`${'CATEGORY'.padEnd(nameWidth)}   COUNT`);
        lines.push(RULE);
        for (const card of cards) {
            const dots = '.'.repeat(Math.max(2, nameWidth - card.title.length + 3));
            lines.push(`${card.title}${dots}${String(card.commands.length).padStart(3)}`);
        }
        lines.push(RULE);
    }

    lines.push(`${PASQUA_BRAND} | ${totalCmds} Plugins`);
    return lines.join('\n');
}

function ctaUrl(displayText, url) {
    return {
        name: 'cta_url',
        buttonParamsJson: JSON.stringify({ display_text: displayText, url, merchant_url: url }),
    };
}

function singleSelect(title, sections) {
    return {
        name: 'single_select',
        buttonParamsJson: JSON.stringify({ title, sections }),
    };
}

// The <biz><interactive type="native_flow" .../></biz> stanza. Documented
// (see pint.js) to help some clients render nativeFlow content that gets
// relayed without it — costs nothing to include, can only help.
function nativeFlowBizNode() {
    return [{
        tag: 'biz',
        attrs: {},
        content: [{
            tag: 'interactive',
            attrs: { type: 'native_flow', v: '1' },
            content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }],
        }],
    }];
}

// Builds the single_select sections: one section per category, one row per
// command, id = "chroma:<prefix><command>" so the existing button router
// (lib/sessionManager.js → handleButtonResponse) runs it straight away.
function buildCategorySections(cards, prefix) {
    return cards.slice(0, MAX_SECTIONS).map(card => {
        const shown = card.commands.slice(0, MAX_ROWS_PER_SECTION);
        const overflow = card.commands.length - shown.length;
        const rows = shown.map(cmd => ({
            header: '',
            title: `${prefix}${cmd.name}`,
            description: (cmd.description || `${card.title} command`).slice(0, 60),
            id: `chroma:${prefix}${cmd.name}`,
        }));
        if (overflow > 0) {
            rows.push({
                header: '',
                title: `+${overflow} more in ${card.title}`,
                description: 'See the full list in the menu caption above',
                id: `chroma:${prefix}menu`,
            });
        }
        return {
            title: `${card.title.toUpperCase()} | ${card.commands.length} CMDS`,
            highlight_label: '',
            rows,
        };
    });
}

// Best-effort banner image for the interactive header. Never throws —
// falls back to a text-only header so a slow/broken image host can't take
// the whole menu down with it.
async function buildHeader({ sock, title, imageUrl }) {
    if (imageUrl) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6000);
            const res = await fetch(imageUrl, { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) {
                const buffer = Buffer.from(await res.arrayBuffer());
                const { imageMessage } = await prepareWAMessageMedia(
                    { image: buffer },
                    { upload: sock.waUploadToServer }
                );
                return proto.Message.InteractiveMessage.Header.fromObject({
                    title,
                    hasMediaAttachment: true,
                    imageMessage,
                });
            }
        } catch (_) { /* fall through to text-only header below */ }
    }
    return proto.Message.InteractiveMessage.Header.fromObject({
        title,
        hasMediaAttachment: false,
    });
}

async function sendChromaMenu({
    sock, jid, quoted, caption, prefix = '.', commands,
    botName, userTag, version, uptime, status,
}) {
    const cards = commandCards(commands);
    const totalCmds = cards.reduce((sum, card) => sum + card.commands.length, 0);
    const name = PASQUA_BRAND;

    // Chroma owns its own caption so legacy design captions cannot leak
    // SUKUNA/MADARA branding into this design. Other menu designs are left
    // untouched in menu.js and menuDesigns.js.
    const body = buildMenuBody({ totalCmds, cards });
    const menuBody = body;

    const buttons = [
        singleSelect(`Ξ OPEN MENU (${totalCmds})`, buildCategorySections(cards, prefix)),
        ctaUrl('1st-Channel', CHANNEL_URL),
        ctaUrl('2nd-Channel', TELEGRAM_URL),
    ];

    try {
        const header = await buildHeader({ sock, title: name, imageUrl: nextMenuImage() });

        const interactiveMessage = proto.Message.InteractiveMessage.fromObject({
            header,
            body: { text: menuBody },
            nativeFlowMessage: { buttons, messageParamsJson: '' },
        });

        const wrapped = generateWAMessageFromContent(jid, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadataVersion: 2,
                        deviceListMetadata: {},
                    },
                    interactiveMessage,
                },
            },
        }, {
            userJid: sock.user?.id,
            ...(quoted?.message ? { quoted } : {}),
        });

        await sock.relayMessage(jid, wrapped.message, {
            messageId: wrapped.key.id,
            additionalNodes: nativeFlowBizNode(),
        });
        return wrapped;
    } catch (error) {
        console.error('[CHROMA MENU]', error?.message || error);
        // Same graceful degrade every other interactive command in this
        // codebase uses (see peek.js) — the menu still reaches the user
        // even if the interactive buttons fail to build on this client.
        return sock.sendMessage(jid, {
            text: `${menuBody}\n\n🔗 ${CHANNEL_URL}\n✈️ ${TELEGRAM_URL}`,
        }, quoted?.message ? { quoted } : undefined);
    }
}

module.exports = {
    sendChromaMenu,
    commandCards,
    buildMenuBody,
    getCouponOffer,
    MENU_IMAGE_URLS,
    CHANNEL_URL,
    TELEGRAM_URL,
    PASQUA_BRAND,
    COUPON_CODE,
    COUPON_EXPIRES_AT,
};
