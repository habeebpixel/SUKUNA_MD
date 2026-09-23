'use strict';

// Chroma uses WhatsApp's GenAI rich-response surface. This is deliberately
// separate from the ordinary image/caption menu designs: the client receives
// a unified-response surface containing text, image, widget actions, and URL
// actions, rather than an HTML card or a native-flow caption approximation.

const crypto = require('crypto');
const { generateWAMessageFromContent, proto } = require('@pasqua-baileys/baileys');
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
    return order.map(category => ({
        title: titleCase(category),
        commands: Array.from(grouped.get(category).keys()).sort().map(name => ({ name, description: grouped.get(category).get(name) })),
    }));
}
function couponOffer(now = new Date()) {
    const expiry = new Date(COUPON_EXPIRES_AT);
    if (Number.isNaN(expiry.getTime()) || now > expiry) return { active: false, text: '🏷️ Limited-time offer ended' };
    return { active: true, code: COUPON_CODE, endsOn: new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' }).format(expiry) };
}

function actionRow(title, ctas) {
    return {
        __typename: 'GenAI3PExtWidgetPrimitive',
        header: { __typename: 'GenAI3PExtWidgetStandardHeader', title },
        body: {
            __typename: 'GenAI3PExtCalendarEventList',
            ctas,
            sections: [],
        },
    };
}
function commandCta(label, command, prefix) {
    return {
        label,
        state: 'PENDING',
        kind: 'OTHER',
        tool_call_id: `chroma:${prefix}${command}`,
        toast: { label: `Opening ${prefix}${command}`, __typename: 'GenAI3PExtWidgetToast' },
        __typename: 'GenAI3PExtWidgetCTA',
    };
}
function buildRichChromaData({ caption, imageUrl, prefix, totalCmds, cards }) {
    const offer = couponOffer();
    const promotion = offer.active
        ? `🏷️ PASQUA TECH\nEnds on ${offer.endsOn}\nCode: ${offer.code} | INC.`
        : offer.text;
    const text = `${promotion}\n\n${caption || `PASQUA TECH | ${totalCmds} Plugins`}`;
    const sections = [
        {
            __typename: 'GenAIUnifiedResponseSection',
            view_model: {
                __typename: 'GenAISingleLayoutViewModel',
                primitive: { __typename: 'FOATextPrimitive', text },
            },
        },
        {
            __typename: 'GenAIUnifiedResponseSection',
            view_model: {
                __typename: 'GenAISingleLayoutViewModel',
                primitive: {
                    __typename: 'GenAIImagePrimitive',
                    preview_image: { __typename: 'GenAIMediaItem', mime_type: 'image/jpeg', url: imageUrl },
                    full_image: { __typename: 'GenAIMediaItem', mime_type: 'image/jpeg', url: imageUrl },
                },
            },
        },
        {
            __typename: 'GenAIUnifiedResponseSection',
            view_model: {
                __typename: 'GenAIActionRowLayoutViewModel',
                primitives: [actionRow(`Ξ OPEN MENU (${totalCmds})`, [commandCta(`Ξ OPEN MENU (${totalCmds})`, 'menu', prefix)])],
            },
        },
        {
            __typename: 'GenAIUnifiedResponseSection',
            view_model: {
                __typename: 'GenAIActionRowLayoutViewModel',
                primitives: [
                    actionRow('Promotion', offer.active ? [{
                        label: 'COPY COUPON', state: 'COMPLETED', kind: 'OTHER', cta_type: 'COPY', copy_code: offer.code,
                        toast: { label: 'Coupon copied', __typename: 'GenAI3PExtWidgetToast' },
                        __typename: 'GenAI3PExtWidgetCTA',
                    }] : []),
                    { __typename: 'GenAIFooterActionPrimitive', cta_text: '1st-Channel', cta_type: 'OPEN_URL', cta_url: CHANNEL_URL },
                    { __typename: 'GenAIFooterActionPrimitive', cta_text: '2nd-Channel', cta_type: 'OPEN_URL', cta_url: TELEGRAM_URL },
                ],
            },
        },
    ];
    return { sections };
}
function buildChromaContent(options = {}) {
    const data = Buffer.from(JSON.stringify(buildRichChromaData(options))).toString('base64');
    return proto.Message.fromObject({
        messageContextInfo: {
            deviceListMetadataVersion: 2,
            deviceListMetadata: {},
            messageSecret: crypto.randomBytes(32),
        },
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    submessages: [],
                    unifiedResponse: { data },
                    contextInfo: { isForwarded: true, forwardingScore: 1, forwardOrigin: 4 },
                },
            },
        },
    });
}

async function sendChromaMenu({ sock, jid, quoted, caption, prefix = '.', commands }) {
    const cards = commandCards(commands);
    const totalCmds = cards.reduce((sum, card) => sum + card.commands.length, 0);
    const content = buildChromaContent({ caption, prefix, commands, cards, totalCmds, imageUrl: nextMenuImage() });
    const wrapped = generateWAMessageFromContent(jid, content, {
        userJid: sock.user?.id,
        quoted: quoted?.message ? quoted : undefined,
    });
    await sock.relayMessage(jid, wrapped.message, { messageId: wrapped.key.id });
    return wrapped;
}

module.exports = { sendChromaMenu, commandCards, couponOffer, buildRichChromaData, buildChromaContent, MENU_IMAGE_URLS, CHANNEL_URL, TELEGRAM_URL, COUPON_CODE, COUPON_EXPIRES_AT };
