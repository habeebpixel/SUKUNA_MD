'use strict';

const crypto = require('crypto');
const { generateWAMessageFromContent, proto } = require('@pasqua-baileys/baileys');
const sharp = require('sharp');
const database = require('./database');

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
}

function richContext(quoted) {
    if (!quoted?.key) return {
        forwardingScore: 1,
        isForwarded: true,
        forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' },
        forwardOrigin: 4,
    };
    return {
        forwardingScore: 1,
        isForwarded: true,
        forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' },
        forwardOrigin: 4,
        stanzaId: quoted.key.id,
        participant: quoted.key.participant || quoted.participant || quoted.key.remoteJid,
        ...(quoted.message ? { quotedMessage: quoted.message } : {}),
    };
}

function buildRichContent(html, quoted) {
    const data = Buffer.from(JSON.stringify({
        __typename: 'GenAIUnifiedResponse',
        response_id: crypto.randomUUID(),
        sections: [{
            __typename: 'GenAIUnifiedResponseSection',
            view_model: {
                __typename: 'GenAISingleLayoutViewModel',
                primitive: {
                    __typename: 'FOAHtmlPrimitiveDemoDONOTUSE',
                    trusted_sources: [],
                    payload: String(html),
                },
            },
        }],
    })).toString('base64');

    return proto.Message.fromObject({
        messageContextInfo: {
            threadId: [],
            deviceListMetadata: {
                senderKeyIndexes: [],
                recipientKeyIndexes: [],
                recipientKeyHash: '',
                recipientTimestamp: Math.floor(Date.now() / 1000),
            },
            deviceListMetadataVersion: 2,
            messageSecret: crypto.randomBytes(32),
        },
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    submessages: [],
                    unifiedResponse: { data },
                    contextInfo: richContext(quoted),
                },
            },
        },
    });
}

function textHtml(text, title = 'SUKUNA MD') {
    const safeTitle = escapeHtml(title);
    const safeText = escapeHtml(text);
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}html,body{margin:0;background:transparent;font-family:Arial,sans-serif}body{padding:6px;background:radial-gradient(circle at 50% 5%,#174936,#061812 72%)}.card{padding:14px;border:2px solid #b9954d;border-radius:16px;background:linear-gradient(145deg,#0a2e22,#123e2f 55%,#061812);color:#e3dfbb;box-shadow:inset 0 0 0 3px #163f31,0 7px 18px #000b}.title{text-align:center;color:#f1e3a2;font:bold 17px Arial Black,sans-serif;letter-spacing:.7px}.rule{height:2px;margin:9px 0;background:linear-gradient(90deg,transparent,#b9954d,transparent)}.body{white-space:pre-wrap;overflow-wrap:anywhere;color:#e8f4e5;font:13px/1.45 monospace}.footer{margin-top:11px;text-align:center;color:#8fbea0;font:10px monospace}</style></head><body><div class="card"><div class="title">${safeTitle}</div><div class="rule"></div><div class="body">${safeText}</div><div class="footer">SUKUNA MD · GENAI RICH RESPONSE</div></div></body></html>`;
}

function htmlToPlainText(html) {
    return String(html || '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/div>|<\/p>|<\/section>|<\/h[1-6]>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function escapeXml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
    }[char]));
}

async function sendCanvasFallback({ sock, jid, quoted, html, canvasText, title, caption, theme = 'default', mentions = [] }) {
    const text = canvasText || htmlToPlainText(html) || 'SUKUNA MD';
    const lines = [];
    for (const paragraph of text.split(/\n+/)) {
        let line = '';
        for (const word of paragraph.split(/\s+/)) {
            if ((line + ' ' + word).trim().length > 52) {
                if (line) lines.push(line);
                line = word;
            } else line = (line + ' ' + word).trim();
        }
        if (line) lines.push(line);
    }
    const lineHeight = 31;
    const height = Math.max(240, 126 + lines.length * lineHeight);
    const textSvg = lines.map((line, index) =>
        `<text x="54" y="${132 + index * lineHeight}" class="body">${escapeXml(line)}</text>`
    ).join('');
    const sukuna = theme === 'sukuna';
    const bgStart = sukuna ? '#090305' : '#250b35';
    const bgMid = sukuna ? '#3b0712' : '#43123f';
    const bgEnd = sukuna ? '#120408' : '#12091d';
    const accent = sukuna ? '#ff3158' : '#ee4fa3';
    const titleText = title || (sukuna ? '☠ SUKUNA BAN CHECKER ☠' : 'SUKUNA MD · IPHONE MODE');
    const footerText = sukuna ? 'BARON API · CURSED VERIFICATION' : 'COLOURED CANVAS FALLBACK';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="${height}">
      <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${bgStart}"/><stop offset=".52" stop-color="${bgMid}"/><stop offset="1" stop-color="${bgEnd}"/></linearGradient></defs>
      <rect width="100%" height="100%" rx="34" fill="url(#bg)"/>
      <rect x="18" y="18" width="864" height="${height - 36}" rx="27" fill="none" stroke="${accent}" stroke-width="4"/>
      <circle cx="72" cy="67" r="18" fill="${accent}"/><circle cx="828" cy="67" r="18" fill="#8d1835"/>
      <text x="450" y="77" text-anchor="middle" class="title">${escapeXml(titleText)}</text>
      <path d="M54 101H846" stroke="${accent}" stroke-width="2"/>
      ${textSvg}
      <text x="450" y="${height - 30}" text-anchor="middle" class="footer">${footerText}</text>
      <style>.title{font:700 27px Arial,sans-serif;fill:#ffd9ed;letter-spacing:2px}.body{font:700 22px monospace;fill:#ffeaf5}.footer{font:500 15px monospace;fill:#d59bc3;letter-spacing:2px}</style>
    </svg>`;
    const image = await sharp(Buffer.from(svg)).png().toBuffer();
    return sock.sendMessage(jid, { image, caption: caption || 'SUKUNA MD · iPhone mode', ...(mentions.length ? { mentions } : {}) }, { quoted });
}

async function sendRichHtml({ sock, jid, quoted, html, canvasText, title, caption, theme, mentions = [] }) {
    // Read the persisted deployment setting as a second source of truth. This
    // covers button/interactive dispatch paths that do not rebuild the normal
    // command context before calling a GenAI renderer.
    const deviceMode = sock?.__sukunaDeviceMode || database.getDeviceMode();
    if (deviceMode === 'iphone') {
        return sendCanvasFallback({ sock, jid, quoted, html, canvasText, title, caption, theme, mentions });
    }
    const content = buildRichContent(html, quoted);
    const safeQuoted = quoted?.message ? quoted : undefined;
    const wrapped = generateWAMessageFromContent(jid, content, { userJid: sock.user?.id, quoted: safeQuoted });
    await sock.relayMessage(jid, wrapped.message, { messageId: wrapped.key.id });
    return wrapped;
}

async function sendRichText({ sock, jid, quoted, text, title }) {
    return sendRichHtml({ sock, jid, quoted, html: textHtml(text, title) });
}

function createEconomyGenAISock(sock, { title = 'ECONOMY' } = {}) {
    return new Proxy(sock, {
        get(target, property) {
            if (property !== 'sendMessage') {
                const value = target[property];
                return typeof value === 'function' ? value.bind(target) : value;
            }
            return async (jid, content, options = {}) => {
                const isEditable = Boolean(content?.edit);
                const isReaction = Boolean(content?.react);
                const shouldRichRender = !isEditable && !isReaction &&
                    (Boolean(content?.image) || typeof content?.text === 'string');
                if (!shouldRichRender) return target.sendMessage.call(target, jid, content, options);
                const text = content.text || content.caption || 'Economy update';
                return sendRichText({ sock: target, jid, quoted: options.quoted, text, title });
            };
        },
    });
}

module.exports = { escapeHtml, buildRichContent, htmlToPlainText, sendCanvasFallback, sendRichHtml, sendRichText, createEconomyGenAISock };
