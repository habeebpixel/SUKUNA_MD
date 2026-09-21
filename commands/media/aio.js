/**
 * All-in-one video downloader.
 * Usage: .aio <video/page URL>
 *
 * Resolves the supplied URL through EliteProTech's aio3 endpoint, then
 * downloads and validates the returned MP4 before sending it to WhatsApp.
 */
'use strict';

const axios = require('axios');
const { prefixOf } = require('../../utils/commandHelpers');
const { downloadMp4 } = require('./xvideos');

const API_ENDPOINT = 'https://eliteprotech-apis.zone.id/download/aio3';
const API_TIMEOUT_MS = 60_000;
const MAX_URL_LENGTH = 2_000;

const URL_KEYS = new Set([
    'url', 'download', 'downloadurl', 'download_url', 'video', 'videourl',
    'video_url', 'mp4', 'link', 'directurl', 'direct_url', 'playurl', 'play_url',
]);

function isHttpUrl(value) {
    try {
        const url = new URL(String(value).trim());
        return /^https?:$/i.test(url.protocol);
    } catch (_) {
        return false;
    }
}

function cleanText(value, fallback = 'Downloaded video', maxLength = 180) {
    const text = String(value ?? '').replace(/[\u0000-\u001F]/g, '').trim();
    if (!text) return fallback;
    return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
}

function findVideoUrls(value, key = '') {
    const found = [];
    if (typeof value === 'string') {
        if (isHttpUrl(value) && (URL_KEYS.has(key.toLowerCase()) || /\.mp4(?:$|[?#])/i.test(value))) found.push(value);
        return found;
    }
    if (!value || typeof value !== 'object') return found;
    if (Array.isArray(value)) {
        for (const item of value) found.push(...findVideoUrls(item, key));
        return [...new Set(found)];
    }
    for (const [childKey, childValue] of Object.entries(value)) {
        found.push(...findVideoUrls(childValue, childKey));
    }
    return [...new Set(found)];
}

function responsePayload(response) {
    const contentType = String(response.headers?.['content-type'] || '').toLowerCase();
    if (contentType.startsWith('video/') || contentType.includes('octet-stream')) return null;
    if (Buffer.isBuffer(response.data)) {
        try { return JSON.parse(response.data.toString('utf8')); } catch (_) { return null; }
    }
    return response.data;
}

async function resolveVideo(input) {
    const response = await axios.get(API_ENDPOINT, {
        params: { url: input },
        responseType: 'arraybuffer',
        timeout: API_TIMEOUT_MS,
        maxContentLength: 5 * 1024 * 1024,
        validateStatus: () => true,
        headers: { 'User-Agent': 'SUKUNA-MD/3.0', Accept: 'application/json,video/*,*/*;q=0.8' },
    });
    const contentType = String(response.headers?.['content-type'] || '').toLowerCase();
    if (response.status < 200 || response.status >= 300) {
        let message = `API HTTP ${response.status}`;
        try { message = JSON.parse(Buffer.from(response.data).toString('utf8')).message || message; } catch (_) {}
        throw new Error(cleanText(message, 'aio3 provider failed', 160));
    }
    if (contentType.startsWith('video/')) {
        throw new Error('aio3 returned video bytes instead of a download URL');
    }
    const payload = responsePayload(response);
    if (payload?.success === false) throw new Error(cleanText(payload.message, 'aio3 could not resolve this URL', 160));
    const urls = findVideoUrls(payload);
    if (!urls.length) throw new Error('aio3 returned no downloadable video URL');
    return { urls, title: cleanText(payload?.title || payload?.data?.title || 'Downloaded video') };
}

async function downloadWithRetries(url, referer) {
    let lastError;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
            return await downloadMp4(url, referer);
        } catch (error) {
            lastError = error;
            if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 750));
        }
    }
    throw lastError || new Error('video download failed');
}

module.exports = {
    name: 'aio',
    aliases: ['alldl', 'allindl'],
    description: 'Download a video from a supported URL (18+ where applicable)',
    category: 'media',
    usage: '.aio <video URL>',

    async execute({ sock, msg, from, reply, args, prefix }) {
        const px = prefixOf(prefix);
        const input = Array.isArray(args) ? args.join(' ').trim() : '';
        if (!input) return reply(`⬇️ *ALL-IN-ONE DOWNLOADER*\n\nUsage: ${px}aio <video link>\nExample: ${px}aio https://example.com/video`);
        if (!isHttpUrl(input) || input.length > MAX_URL_LENGTH) return reply('❌ Please send one valid HTTP/HTTPS video link.');

        try {
            await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } }).catch(() => {});
            let resolved;
            try {
                resolved = await resolveVideo(input);
            } catch (apiError) {
                // A direct MP4 from .xvideos can still be downloaded even when
                // aio3 does not recognize that CDN URL as a page URL.
                if (!/\.mp4(?:$|[?#])/i.test(input)) throw apiError;
                resolved = { urls: [input], title: 'Downloaded video' };
            }

            let buffer = null;
            let lastError = null;
            for (const url of resolved.urls.slice(0, 5)) {
                try {
                    buffer = await downloadWithRetries(url, input);
                    if (buffer) break;
                } catch (error) {
                    lastError = error;
                    console.error(`[aio] candidate failed: ${error.message}`);
                }
            }
            if (!buffer) throw lastError || new Error('No playable video was returned');

            const safeName = resolved.title.replace(/[^a-z0-9]+/gi, '_').slice(0, 60) || 'sukuna_video';
            await sock.sendMessage(from, {
                video: buffer,
                mimetype: 'video/mp4',
                fileName: `${safeName}.mp4`,
                caption: `⬇️ *${resolved.title}*\n\n> SUKUNA MD • AIO DOWNLOADER`,
            }, { quoted: msg });
            await sock.sendMessage(from, { react: { text: '✅', key: msg.key } }).catch(() => {});
        } catch (error) {
            console.error('[aio] error:', error.message);
            await sock.sendMessage(from, { react: { text: '❌', key: msg.key } }).catch(() => {});
            return reply('❌ AIO download failed: the link was unsupported, expired, or the video CDN did not return a valid MP4.');
        }
    },
};

module.exports.resolveVideo = resolveVideo;
module.exports.findVideoUrls = findVideoUrls;
module.exports.API_ENDPOINT = API_ENDPOINT;
