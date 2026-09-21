/**
 * Xvideos / NSFW Search-Download Command
 * Usage: .xvideos <search query>
 *
 * The configured provider accepts the search term as ?s= and returns
 * downloadable MP4 URLs in results[].mp4. We download the file ourselves,
 * validate the container, and only then hand a Buffer to Baileys.
 */
'use strict';

const axios = require('axios');
const { prefixOf } = require('../../utils/commandHelpers');

const API_ENDPOINT = 'https://eliteprotech-apis.zone.id/download/nsfw';
const REQUEST_TIMEOUT_MS = 60_000;
const DOWNLOAD_TIMEOUT_MS = 90_000;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MIN_VIDEO_BYTES = 10 * 1024;
const MAX_CANDIDATES = 8;

function cleanText(value, fallback = 'Unknown', maxLength = 180) {
    const cleaned = String(value ?? '')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
        .trim();
    if (!cleaned) return fallback;
    return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1).trimEnd()}…` : cleaned;
}

function isHttpUrl(value) {
    try {
        const url = new URL(String(value).trim());
        return /^https?:$/i.test(url.protocol);
    } catch (_) {
        return false;
    }
}

function parseDuration(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const raw = String(value ?? '').trim();
    if (!raw) return 0;
    if (/^\d+(?:\.\d+)?$/.test(raw)) return Number(raw);
    const parts = raw.split(':').map(Number);
    if (parts.some(part => !Number.isFinite(part))) return 0;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
}

function formatDuration(value) {
    const seconds = parseDuration(value);
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}

function normalizeResult(item) {
    if (!item || typeof item !== 'object' || !isHttpUrl(item.mp4)) return null;
    return {
        title: cleanText(item.title, 'NSFW video', 180),
        mp4: item.mp4,
        pageUrl: isHttpUrl(item.pageUrl) ? item.pageUrl : '',
        category: cleanText(item.category, 'NSFW', 120),
        views: Number.isFinite(Number(item.views_count)) ? Number(item.views_count) : 0,
        duration: parseDuration(item.duration),
    };
}

async function searchVideos(query) {
    const response = await axios.get(API_ENDPOINT, {
        params: { s: query },
        timeout: REQUEST_TIMEOUT_MS,
        validateStatus: () => true,
        headers: {
            'User-Agent': 'SUKUNA-MD/3.0',
            Accept: 'application/json',
        },
    });

    if (response.status < 200 || response.status >= 300 || response.data?.success !== true) {
        const message = cleanText(response.data?.message, `API HTTP ${response.status}`, 160);
        throw new Error(message);
    }

    const results = Array.isArray(response.data?.results)
        ? response.data.results.map(normalizeResult).filter(Boolean)
        : [];
    if (!results.length) throw new Error('No downloadable results');
    return results.slice(0, MAX_CANDIDATES);
}

function looksLikeVideo(buffer, contentType = '') {
    if (!Buffer.isBuffer(buffer) || buffer.length < MIN_VIDEO_BYTES) return false;
    if (/^video\//i.test(contentType)) return true;
    // ISO Base Media (MP4/M4V) normally has an ftyp box at offset 4.
    return buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp';
}

async function downloadMp4(url) {
    const response = await axios.get(url, {
        responseType: 'stream',
        timeout: DOWNLOAD_TIMEOUT_MS,
        maxContentLength: MAX_VIDEO_BYTES,
        maxBodyLength: MAX_VIDEO_BYTES,
        validateStatus: () => true,
        headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36',
            Accept: 'video/mp4,video/*,*/*;q=0.8',
        },
    });

    const contentType = String(response.headers?.['content-type'] || '').split(';')[0];
    const declaredLength = Number(response.headers?.['content-length'] || 0);
    if (response.status < 200 || response.status >= 300) {
        response.data?.destroy?.();
        throw new Error(`MP4 HTTP ${response.status}`);
    }
    if (declaredLength > MAX_VIDEO_BYTES) {
        response.data?.destroy?.();
        throw new Error('MP4 exceeds the 50 MB limit');
    }

    const chunks = [];
    let total = 0;
    try {
        for await (const chunk of response.data) {
            total += chunk.length;
            if (total > MAX_VIDEO_BYTES) throw new Error('MP4 exceeds the 50 MB limit');
            chunks.push(chunk);
        }
    } finally {
        response.data?.destroy?.();
    }

    const buffer = Buffer.concat(chunks, total);
    if (!looksLikeVideo(buffer, contentType)) {
        throw new Error(`response was not a valid MP4 (${contentType || 'unknown content type'})`);
    }
    return buffer;
}

function captionFor(video) {
    const views = video.views ? `\n👁️ ${video.views.toLocaleString()} views` : '';
    return `🔞 *${video.title}*\n\n🏷️ ${video.category}${views}\n⏱️ ${formatDuration(video.duration)}\n\n> SUKUNA MD • 18+`;
}

module.exports = {
    name: 'xvideos',
    aliases: ['xvideo', 'xv'],
    description: 'Download an NSFW MP4 from a search query (18+)',
    category: 'media',
    nsfw: true,
    usage: '.xvideos <search query>',

    async execute({ sock, msg, from, reply, args, prefix }) {
        const px = prefixOf(prefix);
        const input = Array.isArray(args) ? args.join(' ').trim() : '';
        if (!input) {
            return reply(`🔞 *Xvideos Search/Download*\n\nUsage: ${px}xvideos <search query>\nExample: ${px}xvideos lady dimitrescu`);
        }

        try {
            await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } }).catch(() => {});
            const candidates = await searchVideos(input.slice(0, 120));
            let chosen = null;
            let buffer = null;
            let lastError = null;

            for (const candidate of candidates) {
                try {
                    buffer = await downloadMp4(candidate.mp4);
                    chosen = candidate;
                    break;
                } catch (error) {
                    lastError = error;
                    console.error(`[xvideos] candidate failed: ${error.message}`);
                }
            }
            if (!buffer || !chosen) throw lastError || new Error('No candidate could be downloaded');

            await sock.sendMessage(from, {
                video: buffer,
                mimetype: 'video/mp4',
                fileName: `${chosen.title.replace(/[^a-z0-9]+/gi, '_').slice(0, 60) || 'sukuna_video'}.mp4`,
                caption: captionFor(chosen),
            }, { quoted: msg });
            await sock.sendMessage(from, { react: { text: '✅', key: msg.key } }).catch(() => {});
        } catch (error) {
            console.error('[xvideos] error:', error.message);
            await sock.sendMessage(from, { react: { text: '❌', key: msg.key } }).catch(() => {});
            const providerError = /missing|no downloadable|no results/i.test(error.message);
            return reply(`❌ Xvideos download failed: ${providerError ? 'no matching downloadable video was found' : 'the provider or video CDN failed; please try another search'}.`);
        }
    },
};

module.exports.searchVideos = searchVideos;
module.exports.downloadMp4 = downloadMp4;
module.exports.normalizeResult = normalizeResult;
module.exports.looksLikeVideo = looksLikeVideo;
module.exports.API_ENDPOINT = API_ENDPOINT;
module.exports.MAX_VIDEO_BYTES = MAX_VIDEO_BYTES;
