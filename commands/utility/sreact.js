'use strict';

// Chats opt in with `.sreact on`. Once enabled, reply to a message with
// `.sreact` to attach the sticker reaction to that message. The relay shape
// follows WhatsApp's messageAssociation payload supplied by the owner.
const enabledChats = new Set();

const STICKER_MESSAGE = {
    url: 'https://mmg.whatsapp.net/v/t62.15575-24/818766779_1129097639778153_6590267083545743956_n.enc?ccb=11-4&oh=01_Q5Aa5gHNe2HdbLE-cWkJXND2kbQ-dPCK_OUE8yMZftwYLe7BsQ&oe=6ADAC196&_nc_sid=5e03e0&mms3=true',
    fileSha256: 'Uoa2mnXeustnlPHuKU4SBDRzKn/Tfi7Yn8zDAbYCnos=',
    fileEncSha256: 'L2lSGKLAk7SXkVhBHuNwy2gyET1OhAcR8O7hTmFx0Ss=',
    mediaKey: 'rsI+FYArjYdzSdlGH4R6G5OUviYNZmBrFvoAitAlI7U=',
    mimetype: 'application/was',
    directPath: '/v/t62.15575-24/818766779_1129097639778153_6590267083545743956_n.enc?ccb=11-4&oh=01_Q5Aa5gHNe2HdbLE-cWkJXND2kbQ-dPCK_OUE8yMZftwYLe7BsQ&oe=6ADAC196&_nc_sid=5e03e0',
    isLottie: true,
};

function quotedContext(msg) {
    return msg?.message?.extendedTextMessage?.contextInfo || msg?.message?.contextInfo || {};
}

function targetKey(from, contextInfo) {
    const id = contextInfo?.stanzaId;
    if (!id) return null;
    return {
        remoteJid: from,
        id,
        ...(contextInfo.participant ? { participant: contextInfo.participant } : {}),
        fromMe: false,
    };
}

module.exports = {
    name: 'sreact',
    aliases: ['stickerreact', 'stickerreaction'],
    description: 'React to a replied-to message with a sticker',
    usage: '.sreact on | .sreact off | reply to a message with .sreact',
    category: 'utility',

    async execute({ sock, msg, from, args, reply }) {
        const action = String(args?.[0] || '').trim().toLowerCase();
        if (action === 'on') {
            enabledChats.add(from);
            return reply('✅ Sticker reactions are now *on* in this chat. Reply to a message with `.sreact`.');
        }
        if (action === 'off') {
            enabledChats.delete(from);
            return reply('🛑 Sticker reactions are now *off* in this chat.');
        }
        if (!enabledChats.has(from)) {
            return reply('ℹ️ Sticker reactions are off. Use `.sreact on` first.');
        }

        const contextInfo = quotedContext(msg);
        const parentMessageKey = targetKey(from, contextInfo);
        if (!parentMessageKey) {
            return reply('↩️ Reply to the message you want to sticker-react to.');
        }
        if (typeof sock?.relayMessage !== 'function') {
            return reply('❌ Sticker reaction relay is unavailable on this connection.');
        }

        await sock.relayMessage(from, {
            messageContextInfo: {
                messageAssociation: {
                    associationType: 11,
                    parentMessageKey,
                },
            },
            stickerMessage: { ...STICKER_MESSAGE },
        }, {});
        return true;
    },

    _state: { enabledChats, STICKER_MESSAGE, targetKey },
};
