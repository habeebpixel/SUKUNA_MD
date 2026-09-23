'use strict';

// Chroma is isolated from every other menu design. The reference is a
// composed WhatsApp card, so we render the complete visual card into one
// image and use that image as the native interactive message header. This
// avoids relying on unsupported A2UI metadata while preserving real buttons.

const sharp = require('sharp');
const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = require('@pasqua-baileys/baileys');
const config = require('../config');

const MENU_IMAGE_URLS = [
    'https://files.catbox.moe/xcmgzc.jpg',
    'https://files.catbox.moe/grc4jn.jpg',
    'https://files.catbox.moe/r8zoof.jpg',
];
let menuImageIndex = 0;
const CHANNEL_URL = 'https://whatsapp.com/channel/0029Vb8YB2T90x2zvQLnEb2k';
const TELEGRAM_URL = config.owner?.telegram
    ? `https://${String(config.owner.telegram).replace(/^https?:\/\//i, '')}`
    : 'https://t.me/Pasquaking';
const PASQUA_BRAND = 'PASQUA TECH';
const COUPON_CODE = process.env.PASQUA_MENU_COUPON || 'PASQUA TECH';
const COUPON_EXPIRES_AT = process.env.PASQUA_MENU_COUPON_EXPIRES_AT || '2026-10-28T23:59:59+01:00';
const CATEGORY_ORDER = ['owner', 'admin', 'moderation', 'economy', 'fun', 'media', 'ai', 'utility', 'group', 'general', 'unicode', 'textmaker', 'games', 'anime-nsfw', '18plus'];

function nextMenuImage() {
    const url = MENU_IMAGE_URLS[menuImageIndex % MENU_IMAGE_URLS.length];
    menuImageIndex += 1;
    return url;
}
function titleCase(category) {
    return String(category || 'general').replace(/(^|-)(\w)/g, (_, divider, letter) => `${divider ? ' ' : ''}${letter.toUpperCase()}`);
}
function escapeXml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
}
function commandCards(commands) {
    const grouped = new Map();
    const source = commands instanceof Map ? commands.values() : Array.isArray(commands) ? commands : [];
    for (const command of source) {
        if (!command?.name || typeof command.execute !== 'function') continue;
        const category = String(command.category || 'general').toLowerCase();
        if (!grouped.has(category)) grouped.set(category, new Map());
        if (!grouped.get(category).has(command.name)) grouped.get(category).set(command.name, String(command.description || command.desc || '').trim());
    }
    const order = [...CATEGORY_ORDER.filter(category => grouped.has(category)), ...Array.from(grouped.keys()).filter(category => !CATEGORY_ORDER.includes(category)).sort()];
    return order.map(category => ({ title: titleCase(category), commands: Array.from(grouped.get(category).keys()).sort().map(name => ({ name, description: grouped.get(category).get(name) })) }));
}
function getCouponOffer(now = new Date()) {
    const expiry = new Date(COUPON_EXPIRES_AT);
    if (Number.isNaN(expiry.getTime()) || now > expiry) return { active: false, text: 'This limited-time offer has ended.' };
    return { active: true, code: COUPON_CODE, endsOn: new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' }).format(expiry) };
}
function fitText(value, max = 18) {
    const text = String(value || '');
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

async function fetchImageData(url) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!response.ok) return '';
        const buffer = Buffer.from(await response.arrayBuffer());
        const metadata = await sharp(buffer).metadata();
        const format = metadata.format === 'png' ? 'png' : 'jpeg';
        return `data:image/${format};base64,${buffer.toString('base64')}`;
    } catch (_) {
        return '';
    }
}

function buildCardSvg({ cards, totalCmds, imageData }) {
    const offer = getCouponOffer();
    const visible = cards.slice(0, 9);
    const width = 1080;
    const imageHeight = 610;
    const tableTop = 1320;
    const rowHeight = 112;
    const height = tableTop + 160 + Math.max(visible.length, 1) * rowHeight + 90;
    const imageMarkup = imageData
        ? `<image href="${imageData}" x="42" y="42" width="996" height="${imageHeight}" preserveAspectRatio="xMidYMid slice"/>`
        : `<rect x="42" y="42" width="996" height="${imageHeight}" fill="#30383b"/><text x="540" y="355" text-anchor="middle" class="fallback">${escapeXml(PASQUA_BRAND)}</text>`;
    const rows = visible.map((card, index) => {
        const y = tableTop + 180 + index * rowHeight;
        return `<line x1="92" y1="${y + 65}" x2="988" y2="${y + 65}" class="rowline"/><text x="92" y="${y}" class="rowtext">${escapeXml(fitText(card.title, 18))}</text><text x="810" y="${y}" text-anchor="end" class="rowtext count">${card.commands.length} cmds</text>`;
    }).join('');
    const offerText = offer.active
        ? `<text x="150" y="850" class="offer-title">🏷️  ${escapeXml(PASQUA_BRAND)}</text><text x="150" y="925" class="offer-line">Ends on ${escapeXml(offer.endsOn)}</text><text x="150" y="1000" class="offer-code">Code: ${escapeXml(offer.code)} | INC.</text>`
        : `<text x="150" y="850" class="offer-title">🏷️  ${escapeXml(PASQUA_BRAND)}</text><text x="150" y="925" class="offer-line">${escapeXml(offer.text)}</text>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><clipPath id="heroClip"><rect x="42" y="42" width="996" height="${imageHeight}" rx="22"/></clipPath><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#202b2f"/><stop offset="1" stop-color="#182125"/></linearGradient></defs><rect width="100%" height="100%" rx="28" fill="url(#bg)"/><g clip-path="url(#heroClip)">${imageMarkup}</g><rect x="42" y="42" width="996" height="${imageHeight}" rx="22" fill="none" stroke="#344044" stroke-width="3"/><text x="92" y="735" class="brand">${escapeXml(PASQUA_BRAND)}</text><line x1="92" y1="780" x2="988" y2="780" class="rule"/><rect x="92" y="805" width="896" height="250" rx="8" fill="#202b2f"/><path d="M130 820v195h55M130 820h55M950 820v195h-55M950 1015h-55" fill="none" stroke="#f1f4f3" stroke-width="5"/>${offerText}<text x="540" y="1160" text-anchor="middle" class="ornament">༺ ${escapeXml(PASQUA_BRAND)} ༻</text><line x1="92" y1="1225" x2="988" y2="1225" class="rule"/><rect x="42" y="${tableTop}" width="996" height="${160 + Math.max(visible.length, 1) * rowHeight}" rx="26" fill="#080e11" stroke="#101a1e" stroke-width="4"/><text x="92" y="${tableTop + 105}" class="head">Category</text><text x="810" y="${tableTop + 105}" text-anchor="end" class="head">Count</text><line x1="92" y1="${tableTop + 145}" x2="988" y2="${tableTop + 145}" class="rule"/>${rows}<text x="540" y="${height - 38}" text-anchor="middle" class="footer">${escapeXml(PASQUA_BRAND)} | ${totalCmds} Plugins</text><style>.brand{font:700 52px 'URW Chancery L','Comic Sans MS',cursive;fill:#f5f7f7;letter-spacing:2px}.ornament{font:700 50px 'URW Chancery L','Comic Sans MS',cursive;fill:#f5f7f7}.offer-title{font:700 39px 'URW Chancery L','Comic Sans MS',cursive;fill:#f5f7f7}.offer-line{font:700 37px 'URW Chancery L','Comic Sans MS',cursive;fill:#f5f7f7}.offer-code{font:32px 'URW Chancery L','Comic Sans MS',cursive;fill:#aeb8bb}.head{font:700 43px 'URW Chancery L','Comic Sans MS',cursive;fill:#f5f7f7}.rowtext{font:700 39px 'URW Chancery L','Comic Sans MS',cursive;fill:#f5f7f7}.count{font-family:'URW Chancery L','Comic Sans MS',cursive}.rule{stroke:#f5f7f7;stroke-width:4}.rowline{stroke:#263237;stroke-width:2}.footer{font:24px monospace;fill:#aeb8bb}.fallback{font:700 48px Arial;fill:#f5f7f7}</style></svg>`;
}

async function buildChromaCard({ cards, totalCmds, imageUrl }) {
    const imageData = await fetchImageData(imageUrl);
    return sharp(Buffer.from(buildCardSvg({ cards, totalCmds, imageData }))).png().toBuffer();
}
function ctaUrl(displayText, url) { return { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: displayText, url, merchant_url: url }) }; }
function singleSelect(title, sections) { return { name: 'single_select', buttonParamsJson: JSON.stringify({ title, sections }) }; }
function buildCategorySections(cards, prefix) {
    return cards.slice(0, 10).map(card => ({ title: `${card.title.toUpperCase()} | ${card.commands.length} CMDS`, highlight_label: '', rows: card.commands.slice(0, 8).map(command => ({ header: '', title: `${prefix}${command.name}`, description: (command.description || `${card.title} command`).slice(0, 60), id: `chroma:${prefix}${command.name}` })) }));
}
function nativeFlowBizNode() { return [{ tag: 'biz', attrs: {}, content: [{ tag: 'interactive', attrs: { type: 'native_flow', v: '1' }, content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }] }] }]; }

async function sendChromaMenu({ sock, jid, quoted, prefix = '.', commands }) {
    const cards = commandCards(commands);
    const totalCmds = cards.reduce((sum, card) => sum + card.commands.length, 0);
    const cardImage = await buildChromaCard({ cards, totalCmds, imageUrl: nextMenuImage() });
    try {
        const { imageMessage } = await prepareWAMessageMedia({ image: cardImage }, { upload: sock.waUploadToServer });
        const buttons = [
            singleSelect(`Ξ OPEN MENU (${totalCmds})`, buildCategorySections(cards, prefix)),
            ctaUrl('1st-Channel', CHANNEL_URL),
            ctaUrl('2nd-Channel', TELEGRAM_URL),
        ];
        const interactiveMessage = proto.Message.InteractiveMessage.fromObject({
            header: proto.Message.InteractiveMessage.Header.fromObject({ title: PASQUA_BRAND, hasMediaAttachment: true, imageMessage }),
            body: { text: `${PASQUA_BRAND} | ${totalCmds} Plugins` },
            nativeFlowMessage: { buttons, messageParamsJson: '' },
        });
        const wrapped = generateWAMessageFromContent(jid, { viewOnceMessage: { message: { messageContextInfo: { deviceListMetadataVersion: 2, deviceListMetadata: {} }, interactiveMessage } } }, { userJid: sock.user?.id, ...(quoted?.message ? { quoted } : {}) });
        await sock.relayMessage(jid, wrapped.message, { messageId: wrapped.key.id, additionalNodes: nativeFlowBizNode() });
        return wrapped;
    } catch (error) {
        console.error('[CHROMA MENU]', error?.message || error);
        return sock.sendMessage(jid, { image: cardImage, caption: `${PASQUA_BRAND} | ${totalCmds} Plugins\n\n${CHANNEL_URL}\n${TELEGRAM_URL}` }, quoted?.message ? { quoted } : undefined);
    }
}

module.exports = { sendChromaMenu, commandCards, buildChromaCard, buildCardSvg, getCouponOffer, MENU_IMAGE_URLS, CHANNEL_URL, TELEGRAM_URL, PASQUA_BRAND, COUPON_CODE, COUPON_EXPIRES_AT };
