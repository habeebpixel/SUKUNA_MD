'use strict';

function isEmojiOnly(value) {
    const text = String(value || '').trim();
    if (!text || !/\p{Extended_Pictographic}/u.test(text)) return false;
    for (const char of text) {
        if (!/[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji_Modifier}\p{Regional_Indicator}\uFE0F\u200D\u20E3\s]/u.test(char)) return false;
    }
    return true;
}

function quotedText(message) {
    const quoted = message?.conversation
        || message?.extendedTextMessage?.text
        || message?.imageMessage?.caption
        || message?.videoMessage?.caption
        || message?.documentMessage?.caption
        || '';
    return String(quoted).trim();
}

function stickerHash(stickerMessage) {
    const id = stickerMessage?.fileSha256 || stickerMessage?.fileEncSha256;
    return id ? Buffer.from(id).toString('base64') : null;
}

module.exports = { isEmojiOnly, quotedText, stickerHash };
