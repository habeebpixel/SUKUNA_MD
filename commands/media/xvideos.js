/**
 * Xvideos command backed by the RapidAPI Porn XNXX API.
 * Usage: .xvideos <search text or XNXX/video URL>
 *
 * Deployment: paste the RapidAPI key into RAPIDAPI_KEY below, then restart.
 * RAPIDAPI_KEY may also be supplied by the hosting environment.
 */
'use strict';

const axios = require('axios');
const { prefixOf } = require('../../utils/commandHelpers');

// ===== RapidAPI configuration =====
const RAPIDAPI_KEY = String(process.env.RAPIDAPI_KEY || 'f66a5cfcccmsh41d60daed9f894cp12dfb4jsn0869a1509a4b').trim();
const RAPIDAPI_BASE_URL = 'https://porn-xnxx-api.p.rapidapi.com';
const RAPIDAPI_HOST = 'porn-xnxx-api.p.rapidapi.com';
const SEARCH_ENDPOINT = `${RAPIDAPI_BASE_URL}/search`;
const DOWNLOAD_ENDPOINT = `${RAPIDAPI_BASE_URL}/download`;

const API_TIMEOUT_MS = 45_000;
const DOWNLOAD_TIMEOUT_MS = 90_000;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MIN_VIDEO_BYTES = 10 * 1024;
const MAX_RESULTS = 8;
const UA = 'SUKUNA-MD/3.0';

function cleanText(value, fallback = 'Video', maxLength = 180) {
    const text = String(value ?? '').replace(/[\u0000-\u001F]/g, '').trim();
    if (!text) return fallback;
    return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
}

function isHttpUrl(value) {
    try { return /^https?:$/i.test(new URL(String(value).trim()).protocol); } catch (_) { return false; }
}

function isConfigured() {
    return Boolean(RAPIDAPI_KEY && RAPIDAPI_KEY !== 'PASTE_RAPIDAPI_KEY_HERE');
}

function apiHeaders(json = false) {
    return {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST,
        'User-Agent': UA,
        Accept: 'application/json',
        ...(json ? { 'Content-Type': 'application/json' } : {}),
    };
}

function errorFromResponse(response, fallback) {
    const message = response.data?.message || response.data?.error || fallback;
    return new Error(`${cleanText(message, fallback, 180)} (HTTP ${response.status})`);
}

function normalizeSearchResult(item) {
    if (!item || typeof item !== 'object' || !isHttpUrl(item.video_link)) return null;
    return {
        title: cleanText(item.title, 'XNXX video'),
        videoLink: item.video_link,
        thumbnail: isHttpUrl(item.thumbnail) ? item.thumbnail : '',
        views: cleanText(item.views, '', 40),
        duration: cleanText(item.duration, '', 40),
    };
}

async function searchVideos(query) {
    const response = await axios.post(SEARCH_ENDPOINT, { q: query, page: 1 }, {
        headers: apiHeaders(true), timeout: API_TIMEOUT_MS, validateStatus: () => true,
    });
    if (response.status < 200 || response.status >= 300) throw errorFromResponse(response, 'RapidAPI search failed');
    const results = Array.isArray(response.data?.results)
        ? response.data.results.map(normalizeSearchResult).filter(Boolean).slice(0, MAX_RESULTS)
        : [];
    if (!results.length) throw new Error('RapidAPI returned no video results');
    return results;
}

async function getDownloadLinks(videoLink) {
    const response = await axios.post(DOWNLOAD_ENDPOINT, { video_link: videoLink }, {
        headers: apiHeaders(true), timeout: API_TIMEOUT_MS, validateStatus: () => true,
    });
    if (response.status < 200 || response.status >= 300) throw errorFromResponse(response, 'RapidAPI download lookup failed');
    const data = response.data || {};
    const urls = [data.video_high, data.video_low].filter(isHttpUrl);
    if (!urls.length) throw new Error('RapidAPI returned no MP4 links');
    return { title: cleanText(data.title, 'XNXX video'), urls };
}

function looksLikeMp4(buffer, contentType = '') {
    if (!Buffer.isBuffer(buffer) || buffer.length < MIN_VIDEO_BYTES) return false;
    return /^video\//i.test(contentType) || (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp');
}

async function downloadMp4(url, referer = '') {
    const response = await axios.get(url, {
        responseType: 'stream', timeout: DOWNLOAD_TIMEOUT_MS, maxRedirects: 10,
        maxContentLength: MAX_VIDEO_BYTES, maxBodyLength: MAX_VIDEO_BYTES,
        validateStatus: () => true,
        headers: {
            'User-Agent': UA,
            Accept: 'video/mp4,video/*,*/*;q=0.8',
            'Accept-Encoding': 'identity',
            ...(isHttpUrl(referer) ? { Referer: referer } : {}),
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
        throw new Error('video exceeds the 50 MB limit');
    }
    const chunks = [];
    let total = 0;
    try {
        for await (const chunk of response.data) {
            total += chunk.length;
            if (total > MAX_VIDEO_BYTES) throw new Error('video exceeds the 50 MB limit');
            chunks.push(chunk);
        }
    } finally { response.data?.destroy?.(); }
    const buffer = Buffer.concat(chunks, total);
    if (!looksLikeMp4(buffer, contentType)) throw new Error(`not a playable MP4 (${contentType || 'unknown content type'})`);
    return buffer;
}

async function downloadWithRetries(url, referer) {
    let lastError;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
        try { return await downloadMp4(url, referer); }
        catch (error) {
            lastError = error;
            if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 750));
        }
    }
    throw lastError || new Error('video download failed');
}

module.exports = {
    name: 'xvideos',
    aliases: ['xvideo', 'xv'],
    description: 'Search and download videos through RapidAPI (18+)',
    category: 'media',
    nsfw: true,
    usage: '.xvideos <search text or video URL>',

    async execute({ sock, msg, from, reply, args, prefix }) {
        const px = prefixOf(prefix);
        const input = Array.isArray(args) ? args.join(' ').trim() : '';
        if (!input) return reply(`🔞 *XVIDEOS SEARCH + DOWNLOAD*\n\nUsage: ${px}xvideos <search text>\nExample: ${px}xvideos cat girl`);
        if (!isConfigured()) return reply('❌ Xvideos is not configured: paste your RapidAPI key into RAPIDAPI_KEY in commands/media/xvideos.js.');

        try {
            await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } }).catch(() => {});
            const searchResults = isHttpUrl(input)
                ? [{ title: 'Video', videoLink: input, views: '', duration: '' }]
                : await searchVideos(input.slice(0, 120));
            const foundLinks = [];
            let lastError = null;

            for (const result of searchResults) {
                try {
                    const resolved = await getDownloadLinks(result.videoLink);
                    foundLinks.push(...resolved.urls);
                    for (const mediaUrl of resolved.urls) {
                        try {
                            const buffer = await downloadWithRetries(mediaUrl, result.videoLink);
                            const title = resolved.title || result.title;
                            const safeName = title.replace(/[^a-z0-9]+/gi, '_').slice(0, 60) || 'sukuna_video';
                            await sock.sendMessage(from, {
                                video: buffer,
                                mimetype: 'video/mp4',
                                fileName: `${safeName}.mp4`,
                                caption: `🔞 *${title}*\n\n👁️ ${result.views || 'Unknown'}\n⏱️ ${result.duration || 'Unknown'}\n🔗 ${result.videoLink}\n\n> SUKUNA MD • RapidAPI`,
                            }, { quoted: msg });
                            await sock.sendMessage(from, { react: { text: '✅', key: msg.key } }).catch(() => {});
                            return;
                        } catch (error) { lastError = error; }
                    }
                } catch (error) { lastError = error; }
            }

            const links = [...new Set([...searchResults.map(result => result.videoLink), ...foundLinks])].slice(0, 12);
            if (links.length) {
                await sock.sendMessage(from, {
                    text: `🔗 *VIDEO LINKS FOUND*\n\n${links.map((url, i) => `${i + 1}. ${url}`).join('\n')}\n\nThe API returned links, but none could be downloaded as a playable MP4.`,
                }, { quoted: msg });
                await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } }).catch(() => {});
                return;
            }
            throw lastError || new Error('No playable video was returned');
        } catch (error) {
            console.error('[xvideos] error:', error.message);
            await sock.sendMessage(from, { react: { text: '❌', key: msg.key } }).catch(() => {});
            return reply('❌ Xvideos download failed: the RapidAPI search or video download was unsuccessful. Try another search.');
        }
    },
};

module.exports.searchVideos = searchVideos;
module.exports.getDownloadLinks = getDownloadLinks;
module.exports.downloadMp4 = downloadMp4;
module.exports.normalizeSearchResult = normalizeSearchResult;
module.exports.RAPIDAPI_BASE_URL = RAPIDAPI_BASE_URL;
module.exports.SEARCH_ENDPOINT = SEARCH_ENDPOINT;
module.exports.DOWNLOAD_ENDPOINT = DOWNLOAD_ENDPOINT;
module.exports.MAX_VIDEO_BYTES = MAX_VIDEO_BYTES;
