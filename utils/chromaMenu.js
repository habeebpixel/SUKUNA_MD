'use strict';

// Chroma is the Pasqua Tech menu design only. It uses the same structured
// model as the supplied reference (createSurface/components/sections), then
// translates that model into this fork's verified WhatsApp native-flow
// message. The other .setdesign values never enter this module.

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
    menuImageIndex += 1;
    return url;
}

const CHANNEL_URL = 'https://whatsapp.com/channel/0029Vb8YB2T90x2zvQLnEb2k';
const TELEGRAM_URL = config.owner?.telegram
    ? `https://${String(config.owner.telegram).replace(/^https?:\/\//i, '')}`
    : 'https://t.me/Pasquaking';

const PASQUA_BRAND = 'PASQUA TECH';
const COUPON_CODE = process.env.PASQUA_MENU_COUPON || 'PASQUA TECH';
const COUPON_EXPIRES_AT = process.env.PASQUA_MENU_COUPON_EXPIRES_AT || '2026-10-28T23:59:59+01:00';
const CATEGORY_ORDER = ['owner', 'admin', 'moderation', 'economy', 'fun', 'media', 'ai', 'utility', 'group', 'general', 'unicode', 'textmaker', 'games', 'anime-nsfw', '18plus'];
const MAX_SECTIONS = 10;
const MAX_ROWS_PER_SECTION = 8;

function titleCase(category) {
    return String(category || 'general').replace(/(^|-)(\w)/g, (_, divider, letter) => `${divider ? ' ' : ''}${letter.toUpperCase()}`);
}

function commandCards(commands) {
    const byCategory = new Map();
    const source = commands instanceof Map ? commands.values() : Array.isArray(commands) ? commands : [];
    for (const command of source) {
        if (!command?.name || typeof command.execute !== 'function') continue;
        const category = String(command.category || 'general').toLowerCase();
        if (!byCategory.has(category)) byCategory.set(category, new Map());
        const bucket = byCategory.get(category);
        if (!bucket.has(command.name)) bucket.set(command.name, String(command.description || command.desc || '').trim());
    }
    const categories = [
        ...CATEGORY_ORDER.filter(category => byCategory.has(category)),
        ...Array.from(byCategory.keys()).filter(category => !CATEGORY_ORDER.includes(category)).sort(),
    ];
    return categories.map(category => ({
        title: titleCase(category),
        commands: Array.from(byCategory.get(category).keys()).sort().map(name => ({ name, description: byCategory.get(category).get(name) })),
    }));
}

function getCouponOffer(now = new Date()) {
    const expiry = new Date(COUPON_EXPIRES_AT);
    if (Number.isNaN(expiry.getTime()) || now > expiry) return { active: false, text: 'This limited-time offer has ended.' };
    return {
        active: true,
        code: COUPON_CODE,
        endsOn: new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' }).format(expiry),
    };
}

function buildCategorySections(cards, prefix) {
    return cards.slice(0, MAX_SECTIONS).map(card => {
        const shown = card.commands.slice(0, MAX_ROWS_PER_SECTION);
        const overflow = card.commands.length - shown.length;
        const rows = shown.map(command => ({
            header: '',
            title: `${prefix}${command.name}`,
            description: (command.description || `${card.title} command`).slice(0, 60),
            id: `chroma:${prefix}${command.name}`,
        }));
        if (overflow > 0) rows.push({ header: '', title: `+${overflow} more in ${card.title}`, description: 'See the full menu caption above', id: `chroma:${prefix}menu` });
        return { title: `${card.title.toUpperCase()} | ${card.commands.length} CMDS`, highlight_label: '', rows };
    });
}

// This is the reference code's contract: a stable surface with component IDs,
// a promotion section, a category table, footer, and action row. Keeping this
// object separate from the transport prevents styling and command data from
// being confused with Baileys wire-format fields.
function buildPasquaWidget(cards, totalCmds, prefix = '.') {
    const offer = getCouponOffer();
    const tableCats = cards.slice(0, 9);
    const promotionText = offer.active
        ? `🏷️ ${PASQUA_BRAND}\nEnds on ${offer.endsOn}\nCode: ${offer.code} | INC.`
        : `🏷️ ${PASQUA_BRAND}\n${offer.text}`;
    const components = [
        { id: 'root', component: 'Column', align: 'center', children: ['titleRow', 'promotion', 'd1', 'tableCard', 'd2', 'foot', 'btnRow'] },
        { id: 'titleRow', component: 'Row', justify: 'center', children: ['title'] },
        { id: 'title', component: 'Text', text: `༺ ${PASQUA_BRAND} ༻`, variant: 'h2' },
        { id: 'promotion', component: 'Card', child: 'promotionText' },
        { id: 'promotionText', component: 'Text', text: promotionText, variant: 'caption' },
        { id: 'd1', component: 'Divider' },
        { id: 'tableCard', component: 'Card', child: 'tableCol' },
        { id: 'tableCol', component: 'Column', children: ['headRow', 'divHead', ...tableCats.flatMap((_, index) => [`row${index}`, `div${index}`])] },
        { id: 'headRow', component: 'Row', children: ['headL', 'headR'] },
        { id: 'headL', component: 'Column', weight: 1, children: ['hCmd'] },
        { id: 'hCmd', component: 'Text', text: 'Category', variant: 'h5' },
        { id: 'headR', component: 'Column', weight: 1, children: ['hCount'] },
        { id: 'hCount', component: 'Text', text: 'Count', variant: 'h5' },
        { id: 'divHead', component: 'Divider' },
        ...tableCats.flatMap((card, index) => [
            { id: `row${index}`, component: 'Row', children: [`cat${index}`, `count${index}`] },
            { id: `cat${index}`, component: 'Text', text: card.title },
            { id: `count${index}`, component: 'Text', text: `${card.commands.length} cmds` },
            { id: `div${index}`, component: 'Divider' },
        ]),
        { id: 'd2', component: 'Divider' },
        { id: 'foot', component: 'Text', text: `${PASQUA_BRAND} | ${totalCmds} Plugins`, variant: 'caption' },
        { id: 'btnRow', component: 'Row', justify: 'spaceEvenly', children: ['openMenu', 'btn1', 'btn2'] },
        { id: 'openMenu', component: 'Button', child: 'openMenuLabel', variant: 'primary', action: { call: 'openCommandList', args: { totalCmds } } },
        { id: 'openMenuLabel', component: 'Text', text: `Ξ OPEN MENU (${totalCmds})` },
        { id: 'btn1', component: 'Button', child: 'btn1Label', variant: 'primary', action: { call: 'openUrl', args: { url: CHANNEL_URL } } },
        { id: 'btn1Label', component: 'Text', text: '1st-Channel' },
        { id: 'btn2', component: 'Button', child: 'btn2Label', variant: 'primary', action: { call: 'openUrl', args: { url: TELEGRAM_URL } } },
        { id: 'btn2Label', component: 'Text', text: '2nd-Channel' },
    ];
    return {
        version: 'v0.9',
        createSurface: { surfaceId: 'pasqua-tech-chroma-v1', catalogId: 'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json', components },
        sections: buildCategorySections(cards, prefix),
        totalCmds,
        footerText: PASQUA_BRAND,
    };
}

function buildMenuBody(widget) {
    const components = new Map(widget.createSurface.components.map(component => [component.id, component]));
    const offer = components.get('promotionText')?.text || '';
    const rows = widget.createSurface.components.filter(component => /^cat\d+$/.test(component.id)).map(component => {
        const index = component.id.slice(3);
        const count = components.get(`count${index}`)?.text || '';
        return `${component.text}${'.'.repeat(Math.max(2, 20 - String(component.text).length))}${count}`;
    });
    return [
        `┏━━━━━━━━━━━━━━━━━━━━━━━━┓`,
        `┃ ${offer.split('\n').join('\n┃ ')}`,
        `┗━━━━━━━━━━━━━━━━━━━━━━━━┛`,
        `༺ ${PASQUA_BRAND} ༻`,
        '━━━━━━━━━━━━━━━━━━━━━━━━',
        'Category             Count',
        ...rows,
        '━━━━━━━━━━━━━━━━━━━━━━━━',
        widget.footerText + ` | ${widget.totalCmds} Plugins`,
    ].join('\n');
}

function ctaUrl(displayText, url) {
    return { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: displayText, url, merchant_url: url }) };
}
function singleSelect(title, sections) {
    return { name: 'single_select', buttonParamsJson: JSON.stringify({ title, sections }) };
}
function nativeFlowBizNode() {
    return [{ tag: 'biz', attrs: {}, content: [{ tag: 'interactive', attrs: { type: 'native_flow', v: '1' }, content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }] }] }];
}

async function buildHeader({ sock, title, imageUrl }) {
    if (imageUrl) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6000);
            const response = await fetch(imageUrl, { signal: controller.signal });
            clearTimeout(timeout);
            if (response.ok) {
                const buffer = Buffer.from(await response.arrayBuffer());
                const { imageMessage } = await prepareWAMessageMedia({ image: buffer }, { upload: sock.waUploadToServer });
                return proto.Message.InteractiveMessage.Header.fromObject({ title, hasMediaAttachment: true, imageMessage });
            }
        } catch (_) {}
    }
    return proto.Message.InteractiveMessage.Header.fromObject({ title, hasMediaAttachment: false });
}

async function sendChromaMenu({ sock, jid, quoted, prefix = '.', commands }) {
    const cards = commandCards(commands);
    const totalCmds = cards.reduce((sum, card) => sum + card.commands.length, 0);
    const widget = buildPasquaWidget(cards, totalCmds, prefix);
    const buttons = [
        singleSelect(`Ξ OPEN MENU (${totalCmds})`, widget.sections),
        ctaUrl('1st-Channel', CHANNEL_URL),
        ctaUrl('2nd-Channel', TELEGRAM_URL),
    ];
    try {
        const header = await buildHeader({ sock, title: PASQUA_BRAND, imageUrl: nextMenuImage() });
        const interactiveMessage = proto.Message.InteractiveMessage.fromObject({
            header,
            body: { text: buildMenuBody(widget) },
            nativeFlowMessage: { buttons, messageParamsJson: JSON.stringify({ surfaceId: widget.createSurface.surfaceId }) },
        });
        const wrapped = generateWAMessageFromContent(jid, { viewOnceMessage: { message: { messageContextInfo: { deviceListMetadataVersion: 2, deviceListMetadata: {} }, interactiveMessage } } }, {
            userJid: sock.user?.id,
            ...(quoted?.message ? { quoted } : {}),
        });
        await sock.relayMessage(jid, wrapped.message, { messageId: wrapped.key.id, additionalNodes: nativeFlowBizNode() });
        return wrapped;
    } catch (error) {
        console.error('[CHROMA MENU]', error?.message || error);
        return sock.sendMessage(jid, { text: buildMenuBody(widget) + `\n\n🔗 ${CHANNEL_URL}\n✈️ ${TELEGRAM_URL}` }, quoted?.message ? { quoted } : undefined);
    }
}

module.exports = { sendChromaMenu, commandCards, buildPasquaWidget, buildMenuBody, getCouponOffer, MENU_IMAGE_URLS, CHANNEL_URL, TELEGRAM_URL, PASQUA_BRAND, COUPON_CODE, COUPON_EXPIRES_AT };
