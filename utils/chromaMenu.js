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

const MENU_IMAGE_URL = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663936678738/YSmNKRleqLdoBHTu.png';
const CHANNEL_URL    = 'https://whatsapp.com/channel/0029Vb8YB2T90x2zvQLnEb2k';
const TELEGRAM_URL   = config.owner?.telegram
    ? `https://${String(config.owner.telegram).replace(/^https?:\/\//i, '')}`
    : 'https://t.me/Pasquaking';

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

// Renders the "Category | Count" table seen in the reference screenshot —
// a bordered box, one row per category, right-aligned command counts.
// Plain monospace-friendly characters only (no Unicode box art beyond the
// basics) so it survives WhatsApp's font rendering across devices.
function buildCategoryTable(cards) {
    if (!cards.length) return '';
    const nameWidth = Math.max(8, ...cards.map(card => card.title.length));
    const rule = '─'.repeat(nameWidth + 14);
    let out = `┌${rule}┐\n`;
    out += `│ ${'Category'.padEnd(nameWidth)} │ Count   │\n`;
    out += `├${rule}┤\n`;
    for (const card of cards) {
        const label = card.title.padEnd(nameWidth);
        const count = `${card.commands.length} cmds`.padStart(7);
        out += `│ ${label} │ ${count} │\n`;
    }
    out += `└${rule}┘`;
    return out;
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
    const name = botName || 'SUKUNA MD';
    const table = buildCategoryTable(cards);

    // Matches the reference screenshot layout: title banner, then the
    // Category | Count table, then a footer line with the plugin total.
    // If a caller passes their own `caption`, that's used verbatim (kept
    // for backward compatibility with menu.js's design system) — the table
    // only gets auto-built for the default body below.
    const body = caption && String(caption).trim()
        ? String(caption)
        : `༺ ${name.toUpperCase()} ༻\n\n` +
          `${table}\n\n` +
          `${name.toUpperCase()} | ${totalCmds} Plugins`;

    const buttons = [
        ctaUrl('1st-Channel', CHANNEL_URL),
        ctaUrl('2nd-Channel', TELEGRAM_URL),
        singleSelect(`OPEN MENU (${totalCmds})`, buildCategorySections(cards, prefix)),
    ];

    try {
        const header = await buildHeader({ sock, title: `✦ ${name} · CHROMA ✦`, imageUrl: MENU_IMAGE_URL });

        const interactiveMessage = proto.Message.InteractiveMessage.fromObject({
            header,
            body: { text: body },
            footer: { text: '⛧ Powered by Pasqua Tech ⛧' },
            nativeFlowMessage: { buttons, messageParamsJson: '' },
        });

        const wrapped = generateWAMessageFromContent(jid, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: { deviceListMetadataVersion: 2, deviceListMetadata: {} },
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
            text: `${body}\n\n🔗 ${CHANNEL_URL}\n✈️ ${TELEGRAM_URL}`,
        }, quoted?.message ? { quoted } : undefined);
    }
}

module.exports = { sendChromaMenu, commandCards, MENU_IMAGE_URL, CHANNEL_URL, TELEGRAM_URL };
