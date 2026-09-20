/**
 * .stickerpack <search> — turn a Pinterest image search into ONE native
 * WhatsApp sticker pack (max 30 stickers).
 *
 * Usage:
 *   .stickerpack Billie Eilish
 *   .stickerpack BMW
 *   .stickerpack sneakers
 *
 * How it works:
 *   1. Searches Pinterest through the exact same provider .pint uses
 *      (commands/general/pint.js → _private.findImages / fetchImage).
 *   2. Downloads the images and converts each one to a 512x512 static WebP
 *      sticker with sharp (quality is stepped down until it fits ~100 KB).
 *   3. Sends everything as a single sticker-pack message, the same way
 *      .tgsticker does (sock.sendMessage with `stickers` + `cover`).
 *
 * DEPENDENCIES (already in package.json): sharp
 */
'use strict';

const sharp  = require('sharp');
const crypto = require('crypto');

const MAX_STICKERS   = 30;          // hard cap — never more than 30 in a pack
const CANDIDATE_POOL = 45;          // extra URLs to fetch so dead links don't shrink the pack
const CONCURRENCY    = 4;           // parallel download + convert workers
const DEADLINE_MS    = 90_000;      // stop pulling new images after this long
const COOLDOWN_MS    = 60_000;      // per user + chat
const MIN_SIDE_PX    = 100;         // skip thumbnails / avatars
const TARGET_BYTES   = 100 * 1024;  // WhatsApp static-sticker size target
const QUALITY_STEPS  = [80, 65, 50, 35, 25];
const PACK_PUBLISHER = 'Pasqua';
const PACK_BRAND     = 'Sukuna MD';

const cooldowns = new Map();

function trimCooldowns() {
    const now = Date.now();
    for (const [key, expires] of cooldowns) if (expires <= now) cooldowns.delete(key);
}

function titleCase(text) {
    return String(text).replace(/\S+/g, word => word.charAt(0).toUpperCase() + word.slice(1));
}

function truncate(text, max) {
    const str = String(text);
    return str.length > max ? `${str.slice(0, max - 1).trimEnd()}…` : str;
}

/**
 * Reuse the .pint provider so both commands always hit the same working
 * Pinterest endpoint. Required lazily so it always picks up the loaded copy.
 */
function getPintProvider() {
    const provider = require('../general/pint')._private;
    if (!provider || typeof provider.findImages !== 'function' || typeof provider.fetchImage !== 'function') {
        throw new Error('pint provider is not available');
    }
    return provider;
}

/** Any image buffer → 512x512 static WebP sticker (null if unusable). */
async function toStickerWebp(buffer) {
    const meta = await sharp(buffer, { failOn: 'none' }).metadata();
    if (!meta.width || !meta.height || Math.min(meta.width, meta.height) < MIN_SIDE_PX) return null;

    let out = null;
    for (const quality of QUALITY_STEPS) {
        out = await sharp(buffer, { failOn: 'none' })
            .rotate()
            .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .webp({ quality, effort: 4 })
            .toBuffer();
        if (out.length <= TARGET_BYTES) break;
    }
    if (!out || out.length < 1024 || out.length > 1024 * 1024) return null;
    return out;
}

/**
 * Download + convert candidates with a small worker pool. Stops as soon as
 * MAX_STICKERS good stickers exist, and keeps the original search order.
 */
async function buildStickers(candidates, fetchImage) {
    const found = [];
    const seen = new Set();
    const deadline = Date.now() + DEADLINE_MS;
    let cursor = 0;
    let failed = 0;

    async function worker() {
        while (found.length < MAX_STICKERS && cursor < candidates.length && Date.now() < deadline) {
            const index = cursor++;
            try {
                const raw = await fetchImage(candidates[index].url);
                const data = await toStickerWebp(raw);
                if (!data) { failed++; continue; }
                const hash = crypto.createHash('sha1').update(data).digest('hex');
                if (seen.has(hash)) continue; // same picture served twice
                seen.add(hash);
                found.push({ index, data });
            } catch (error) {
                failed++;
                console.error('[stickerpack:image]', error?.message || error);
            }
        }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    found.sort((a, b) => a.index - b.index);
    return { items: found.slice(0, MAX_STICKERS), failed };
}

module.exports = {
    name: 'stickerpack',
    aliases: ['stickerpacks', 'pinpack', 'pinsticker'],
    description: 'Search Pinterest and send the results as one WhatsApp sticker pack (max 30)',
    usage: '.stickerpack Billie Eilish | .stickerpack BMW | .stickerpack sneakers',
    category: 'expansion',

    async execute({ sock, msg, from, sender, args, reply }) {
        trimCooldowns();
        const query = String((args || []).join(' ')).trim().replace(/\s+/g, ' ');
        if (!query) {
            return reply(
                `🧩 Usage: *.stickerpack Billie Eilish*\n` +
                `Builds one sticker pack (up to ${MAX_STICKERS} stickers) from Pinterest images.`
            );
        }
        if (query.length > 60) return reply('❌ Keep the sticker pack search under 60 characters.');

        const key = `${from || 'chat'}:${sender || 'user'}`;
        const expires = cooldowns.get(key) || 0;
        if (expires > Date.now()) {
            return reply(`⏳ Please wait *${Math.ceil((expires - Date.now()) / 1000)}s* before using .stickerpack again.`);
        }
        cooldowns.set(key, Date.now() + COOLDOWN_MS);

        try {
            const { findImages, fetchImage } = getPintProvider();

            await reply(`🔎 Building a sticker pack for *${query}*... this can take a moment.`);

            const candidates = await findImages(query, CANDIDATE_POOL);
            if (!candidates.length) {
                cooldowns.delete(key);
                return reply(`❌ No images found for *${query}*. Try a broader search.`);
            }

            const { items, failed } = await buildStickers(candidates, fetchImage);
            if (!items.length) {
                cooldowns.delete(key);
                return reply('❌ None of the images could be turned into stickers. Try another search.');
            }

            const stickers = items.map((item, i) => ({
                data: item.data,
                isAnimated: false,
                emojis: ['📌'],
                accessibilityLabel: truncate(`${query} sticker ${i + 1}`, 80),
            }));
            const cover = items[0].data; // static 512x512 WebP tray icon
            const packName = `${truncate(titleCase(query), 40)} · ${PACK_BRAND}`;

            // One native StickerPackMessage — same call .tgsticker makes.
            await sock.sendMessage(from, {
                stickers,
                cover,
                name: packName,
                publisher: PACK_PUBLISHER,
                description: `Pinterest search: ${query}`,
            }, { quoted: msg });

            let summary = `✅ *${packName}*\n` +
                `Source: Pinterest — *${query}*\n` +
                `Packed: ${stickers.length}/${MAX_STICKERS} stickers`;
            if (stickers.length < MAX_STICKERS) summary += `\n\n_Only ${stickers.length} usable images were found for this search._`;
            if (failed) summary += `\n⚠️ Skipped ${failed} unusable image${failed === 1 ? '' : 's'}`;
            return reply(summary);
        } catch (error) {
            cooldowns.delete(key);
            console.error('[stickerpack]', error);
            return reply('❌ Sticker pack creation failed. Please try again shortly.');
        }
    },

    _private: { toStickerWebp, buildStickers, cooldowns },
};
