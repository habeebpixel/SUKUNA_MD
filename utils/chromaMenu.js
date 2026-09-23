'use strict';

// Chroma is intentionally an HTML rich response, matching the renderer used
// by commands/games/snake.js. The other menu designs still use their existing
// image/video/native-message paths in commands/admin/menu.js.

const { sendRichHtml } = require('./genaiRich');
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
const COUPON_CODE = process.env.PASQUA_MENU_COUPON || 'PASQUA-TECH';
const COUPON_EXPIRES_AT = process.env.PASQUA_MENU_COUPON_EXPIRES_AT || '2026-10-28T23:59:59+01:00';

const CATEGORY_ORDER = [
    'owner', 'admin', 'moderation', 'economy', 'fun', 'media', 'ai', 'utility',
    'group', 'general', 'unicode', 'textmaker', 'games', 'anime-nsfw', '18plus',
];

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
}

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
        return {
            title: titleCase(category),
            commands: Array.from(bucket.keys()).sort().map(name => ({
                name,
                description: bucket.get(name),
            })),
        };
    });
}

function getCouponOffer(now = new Date()) {
    const expiry = new Date(COUPON_EXPIRES_AT);
    if (Number.isNaN(expiry.getTime()) || now > expiry) {
        return { active: false, text: 'This limited-time offer has ended.' };
    }

    return {
        active: true,
        code: COUPON_CODE,
        endsOn: new Intl.DateTimeFormat('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos',
        }).format(expiry),
    };
}

function buildCategoryRows(cards, prefix) {
    return cards.map(card => `
        <details class="category-detail">
            <summary>${escapeHtml(card.title)} <span>${card.commands.length} cmds</span></summary>
            <div class="command-list">${card.commands.map(command => `
                <div class="command-row"><b>${escapeHtml(prefix + command.name)}</b><small>${escapeHtml(command.description || `${card.title} command`)}</small></div>
            `).join('')}</div>
        </details>
    `).join('');
}

function buildChromaHtml({ cards, totalCmds, imageUrl, prefix = '.' }) {
    const offer = getCouponOffer();
    const categoryRows = cards.map(card => `
        <div class="table-row"><span>${escapeHtml(card.title)}</span><strong>${card.commands.length} cmds</strong></div>
    `).join('');

    const offerMarkup = offer.active
        ? `<div class="offer-title">🏷️ LIMITED-TIME COUPON</div>
           <div class="offer-code">${escapeHtml(offer.code)}</div>
           <div class="offer-expiry">Ends on ${escapeHtml(offer.endsOn)}</div>`
        : `<div class="offer-title">🏷️ LIMITED-TIME COUPON</div>
           <div class="offer-expiry">${escapeHtml(offer.text)}</div>`;

    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{box-sizing:border-box}html,body{margin:0;background:transparent;font-family:Arial,sans-serif}body{padding:6px;background:radial-gradient(circle at 50% 3%,#24406b,#070b14 70%)}
.card{overflow:hidden;padding:0 12px 13px;border:2px solid #8eb8ff;border-radius:20px;background:linear-gradient(145deg,#0b1426,#172a49 52%,#070d19);color:#e8f1ff;box-shadow:inset 0 0 0 3px #182d4d,0 8px 20px #000b}
.hero{display:block;width:calc(100% + 24px);height:150px;margin:0 -12px 12px;object-fit:cover;filter:grayscale(1) contrast(1.15);border-bottom:2px solid #8eb8ff}.brand{text-align:center;color:#dbe9ff;font:bold 22px Arial Black,Arial,sans-serif;letter-spacing:1px;text-shadow:0 0 12px #5da3ff}.subtitle{text-align:center;margin:3px 0 10px;color:#9db6d9;font:10px monospace;letter-spacing:1px}.offer{padding:10px;margin:0 0 11px;border:1px solid #e6bd65;border-radius:12px;background:linear-gradient(145deg,#352b16,#171b26);text-align:center;box-shadow:0 0 12px #d5a43833}.offer-title{color:#ffe29a;font:bold 12px monospace;letter-spacing:1px}.offer-code{margin-top:4px;color:#fff2c7;font:bold 17px monospace;letter-spacing:1px}.offer-expiry{margin-top:3px;color:#d8c38d;font:11px monospace}.table-card{padding:10px;border:1px solid #537ebc;border-radius:13px;background:#071120cc}.table-head,.table-row{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;padding:6px 4px;font:12px monospace}.table-head{color:#b9d7ff;font-weight:900;border-bottom:1px solid #5074a4;text-transform:uppercase}.table-row{color:#e6efff;border-bottom:1px dotted #365174}.table-row:last-child{border-bottom:0}.table-row strong{color:#b9d7ff;font-weight:700}.footer{margin:10px 0 8px;text-align:center;color:#9db6d9;font:10px monospace;letter-spacing:1px}.open{display:block;width:100%;height:40px;border:2px solid #8eb8ff;border-radius:11px;color:#071120;background:linear-gradient(#d8e8ff,#80b5ff);font-weight:900;font-size:14px}.links{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}.links a{display:grid;place-items:center;height:34px;border:1px solid #5c86bf;border-radius:9px;color:#dceaff;background:#142946;text-decoration:none;font:bold 11px Arial,sans-serif}.details{margin-top:10px}.category-detail{border:1px solid #35557f;border-radius:9px;margin-top:6px;background:#0a1729}.category-detail summary{padding:8px;color:#dceaff;font:bold 12px monospace;cursor:pointer}.category-detail summary span{float:right;color:#91b9ef}.command-list{padding:0 8px 7px;border-top:1px solid #294566}.command-row{display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px dotted #294566;font:11px monospace}.command-row:last-child{border-bottom:0}.command-row b{color:#e8f1ff}.command-row small{overflow:hidden;color:#91a9c8;text-overflow:ellipsis;white-space:nowrap}
</style></head><body><div class="card"><img class="hero" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(PASQUA_BRAND)}"><div class="brand">༺ ${escapeHtml(PASQUA_BRAND)} ༻</div><div class="subtitle">PASQUA TECH · COMMAND SELECTOR</div><div class="offer">${offerMarkup}</div><div class="table-card"><div class="table-head"><span>Category</span><span>Count</span></div>${categoryRows}</div><div class="footer">${escapeHtml(PASQUA_BRAND)} | ${totalCmds} Plugins</div><button class="open" id="openMenu">Ξ OPEN MENU (${totalCmds})</button><div class="links"><a href="${escapeHtml(CHANNEL_URL)}">1st-Channel</a><a href="${escapeHtml(TELEGRAM_URL)}">2nd-Channel</a></div><div class="details" id="commandMenu" hidden>${buildCategoryRows(cards, prefix)}</div></div><script>(function(){var b=document.getElementById('openMenu'),m=document.getElementById('commandMenu');if(b&&m)b.onclick=function(){m.hidden=!m.hidden;b.textContent=m.hidden?'Ξ OPEN MENU (${totalCmds})':'Ξ CLOSE MENU (${totalCmds})'}})();</script></body></html>`;
}

async function sendChromaMenu({ sock, jid, quoted, prefix = '.', commands }) {
    const cards = commandCards(commands);
    const totalCmds = cards.reduce((sum, card) => sum + card.commands.length, 0);
    const html = buildChromaHtml({ cards, totalCmds, prefix, imageUrl: nextMenuImage() });

    try {
        // Use the exact HTML rich-response route used by Snake. This is the
        // Chroma renderer; default, nor, neon, and every other design are not
        // routed through this function.
        return await sendRichHtml({
            sock,
            jid,
            quoted,
            html,
            title: PASQUA_BRAND,
            interactive: true,
        });
    } catch (error) {
        console.error('[CHROMA HTML MENU]', error?.message || error);
        return sock.sendMessage(jid, {
            text: `${PASQUA_BRAND}\n\n${getCouponOffer().active ? `Coupon: ${COUPON_CODE} · Ends on ${getCouponOffer().endsOn}` : getCouponOffer().text}\n\n${PASQUA_BRAND} | ${totalCmds} Plugins`,
        }, quoted?.message ? { quoted } : undefined);
    }
}

module.exports = {
    sendChromaMenu,
    commandCards,
    buildChromaHtml,
    getCouponOffer,
    MENU_IMAGE_URLS,
    CHANNEL_URL,
    TELEGRAM_URL,
    PASQUA_BRAND,
    COUPON_CODE,
    COUPON_EXPIRES_AT,
};
