/**
 * unsetcmd — Remove a bot command binding from a sticker.
 * Usage: Reply to a sticker with  .unsetcmd
 */

'use strict';

const database = require('../../utils/database');
const { isEmojiOnly, quotedText, stickerHash: getStickerHash } = require('../../utils/customCommandTriggers');

module.exports = {
    name:        'unsetcmd',
    aliases:     ['removecmd', 'unbindcmd', 'delcmd', 'deletecmd'],
    description: 'Remove the bot command bound to a sticker or emoji',
    usage:       '.unsetcmd  (reply to a sticker or emoji)',
    category:    'general',

    async execute({ sock, msg, from, reply, isGroup }) {
        if (!isGroup) return reply('👥 This command can only be used in groups!');

        const ctx = msg.message?.extendedTextMessage?.contextInfo;
        if (!ctx) {
            return reply('❌ Please *reply to a sticker or emoji* with .unsetcmd to remove its binding.');
        }

        let stickerHash = null;
        let emojiKey = null;

        const inline = ctx?.quotedMessage?.stickerMessage;
        if (inline) {
            stickerHash = getStickerHash(inline);
        } else {
            const quotedEmoji = quotedText(ctx?.quotedMessage);
            if (isEmojiOnly(quotedEmoji)) emojiKey = quotedEmoji;
        }

        if (!stickerHash) {
            try {
                const loaded = await sock.loadMessage(ctx.remoteJid || from, ctx.stanzaId);
                const sd     = loaded?.message?.stickerMessage;
                if (sd) {
                    stickerHash = getStickerHash(sd);
                } else {
                    const loadedEmoji = quotedText(loaded?.message);
                    if (isEmojiOnly(loadedEmoji)) emojiKey = loadedEmoji;
                }
            } catch (_) {}
        }

        if (!stickerHash && !emojiKey) {
            return reply('❌ Reply to a sticker or emoji with .unsetcmd.');
        }

        const existing = stickerHash ? database.getStickerCmd(from, stickerHash) : database.getEmojiCmd(from, emojiKey);
        if (!existing) {
            return reply(`⚠️ This ${stickerHash ? 'sticker' : `emoji ${emojiKey}`} has no command binding. Nothing to remove.`);
        }

        const deleted = stickerHash ? database.deleteStickerCmd(from, stickerHash) : database.deleteEmojiCmd(from, emojiKey);

        if (deleted) {
            reply(
                '🗑️ *Custom Command Removed!*\n\n' +
                `The binding to \`.${existing}\` has been deleted.\n\n` +
                'This sticker or emoji will no longer trigger any bot command.\n\n' +
                '_Use .setcmd (reply to a sticker or emoji) to create a new binding._'
            );
        } else {
            reply('❌ Failed to remove the binding. Please try again.');
        }
    },
};
