/**
 * Xvideos Search + Download Command
 * Usage: .xvideos <search text or video URL>
 *
 * Apify runs the configured scraper and writes its output to a dataset. This
 * command waits for that run, extracts candidate media URLs, downloads them
 * itself, validates the MP4 container, and only then sends the video.
 *
 * Required environment variable: APIFY_API_TOKEN
 */
'use strict';

const axios = require('axios');
const { prefixOf } = require('../../utils/commandHelpers');

// Deployment option: paste the Apify token between the quotes below.
// The environment variable takes priority when it is configured by the host.
const APIFY_TOKEN_IN_FILE = 'PASTE_APIFY_TOKEN_HERE';
const ACTOR_RUN_ENDPOINT = 'https://api.apify.com/v2/acts/justwatching~free-porn-sex-tube-videos-xxx/runs';
const APIFY_API_TOKEN = String(process.env.APIFY_API_TOKEN || APIFY_TOKEN_IN_FILE).trim();
const API_TIMEOUT_MS = 30_000;
const RUN_TIMEOUT_MS = 150_000;
const POLL_INTERVAL_MS = 2_500;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MIN_VIDEO_BYTES = 10 * 1024;
const MAX_CANDIDATES = 20;

function cleanText(value, fallback = 'Xvideos video', maxLength = 180) {
    const text = String(value ?? '')
        .replace(/[\u0000-\u001F]/g, '')
        .trim();
    if (!text) return fallback;
    return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
}

function isHttpUrl(value) {
    try {
        const url = new URL(String(value).trim());
        return /^https?:$/i.test(url.protocol);
    } catch (_) {
        return false;
    }
}

function looksLikeXvideosUrl(value) {
    try {
        return /(^|\.)xvideos\.com$/i.test(new URL(value).hostname);
    } catch (_) {
        return false;
    }
}

function isDirectMp4(value) {
    return isHttpUrl(value) && /\.(?:mp4|m4v)(?:$|[?#])/i.test(value);
}

function searchUrl(query) {
    return `https://www.xvideos.com/?k=${encodeURIComponent(query)}`;
}

function collectUrls(value, key = '', found = []) {
    if (typeof value === 'string') {
        if (isHttpUrl(value)) found.push({ url: value, key: key.toLowerCase() });
        // Some actor versions serialize a nested JSON result as a string.
        if (/^[\[{]/.test(value.trim())) {
            try { collectUrls(JSON.parse(value), key, found); } catch (_) {}
        }
        return found;
    }
    if (!value || typeof value !== 'object') return found;
    if (Array.isArray(value)) {
        for (const item of value) collectUrls(item, key, found);
        return found;
    }
    for (const [childKey, childValue] of Object.entries(value)) {
        collectUrls(childValue, childKey, found);
    }
    return found;
}

function candidateUrls(datasetItems) {
    const all = collectUrls(datasetItems);
    const unique = [...new Map(all.map(item => [item.url, item])).values()];
    return unique
        .sort((a, b) => {
            const rank = item => (isDirectMp4(item.url) ? 4 : /video|media|download|stream|src/i.test(item.key) ? 3 : looksLikeXvideosUrl(item.url) ? 2 : 1);
            return rank(b) - rank(a);
        })
        .map(item => item.url)
        .slice(0, MAX_CANDIDATES);
}

function firstText(value, keys = ['title', 'name', 'caption']) {
    if (!value || typeof value !== 'object') return '';
    if (Array.isArray(value)) {
        for (const item of value) {
            const found = firstText(item, keys);
            if (found) return found;
        }
        return '';
    }
    for (const key of keys) {
        if (value[key]) return cleanText(value[key]);
    }
    for (const child of Object.values(value)) {
        const found = firstText(child, keys);
        if (found) return found;
    }
    return '';
}

function authHeaders() {
    if (!APIFY_API_TOKEN || APIFY_API_TOKEN === 'PASTE_APIFY_TOKEN_HERE') throw new Error('Apify token is not configured');
    return {
        Authorization: `Bearer ${APIFY_API_TOKEN}`,
        'User-Agent': 'SUKUNA-MD/3.0',
        Accept: 'application/json',
    };
}

async function startActor(inputUrl) {
    const response = await axios.post(ACTOR_RUN_ENDPOINT, { url: inputUrl }, {
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        timeout: API_TIMEOUT_MS,
        validateStatus: () => true,
    });
    if (response.status < 200 || response.status >= 300) {
        throw new Error(`Apify start HTTP ${response.status}`);
    }
    const run = response.data?.data || response.data;
    if (!run?.id || !run?.defaultDatasetId) throw new Error('Apify returned an invalid run');
    return run;
}

async function waitForRun(runId) {
    const deadline = Date.now() + RUN_TIMEOUT_MS;
    let lastStatus = 'READY';
    while (Date.now() < deadline) {
        const response = await axios.get(`https://api.apify.com/v2/actor-runs/${encodeURIComponent(runId)}`, {
            headers: authHeaders(), timeout: API_TIMEOUT_MS, validateStatus: () => true,
        });
        if (response.status < 200 || response.status >= 300) throw new Error(`Apify status HTTP ${response.status}`);
        const run = response.data?.data || response.data;
        lastStatus = String(run?.status || lastStatus);
        if (['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(lastStatus)) return run;
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }
    throw new Error(`Apify run timed out (${lastStatus})`);
}

async function readDataset(datasetId) {
    const response = await axios.get(`https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items`, {
        params: { clean: 'true', format: 'json' },
        headers: authHeaders(), timeout: API_TIMEOUT_MS, validateStatus: () => true,
    });
    if (response.status < 200 || response.status >= 300) throw new Error(`Apify dataset HTTP ${response.status}`);
    return Array.isArray(response.data) ? response.data : [];
}

async function searchVideos(input) {
    const inputUrl = isHttpUrl(input) ? input : searchUrl(input);
    const run = await startActor(inputUrl);
    const finished = await waitForRun(run.id);
    if (finished.status !== 'SUCCEEDED') throw new Error(`Apify run ${String(finished.status || 'failed').toLowerCase()}`);
    const items = await readDataset(run.defaultDatasetId);
    const urls = candidateUrls(items);
    if (!urls.length) throw new Error('Apify returned no video links');
    return { urls, title: firstText(items) || 'Xvideos video', source: inputUrl, items };
}

async function downloadMp4(url, referer = '') {
    const response = await axios.get(url, {
        responseType: 'stream', timeout: 90_000, maxRedirects: 10,
        maxContentLength: MAX_VIDEO_BYTES, maxBodyLength: MAX_VIDEO_BYTES,
        validateStatus: () => true,
        headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36',
            Accept: 'video/mp4,video/*,*/*;q=0.8',
            'Accept-Encoding': 'identity',
            ...(isHttpUrl(referer) ? { Referer: referer } : {}),
        },
    });
    const contentType = String(response.headers?.['content-type'] || '').split(';')[0];
    const declaredLength = Number(response.headers?.['content-length'] || 0);
    if (response.status < 200 || response.status >= 300) {
        response.data?.destroy?.();
        throw new Error(`video HTTP ${response.status}`);
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
    } finally {
        response.data?.destroy?.();
    }
    const buffer = Buffer.concat(chunks, total);
    const isMp4 = buffer.length >= MIN_VIDEO_BYTES && buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp';
    if (!isMp4) throw new Error(`candidate was not a valid MP4 (${contentType || 'unknown content type'})`);
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
    description: 'Search and download an Xvideos video (18+)',
    category: 'media',
    nsfw: true,
    usage: '.xvideos <search text or video URL>',

    async execute({ sock, msg, from, reply, args, prefix }) {
        const px = prefixOf(prefix);
        const input = Array.isArray(args) ? args.join(' ').trim() : '';
        if (!input) return reply(`🔞 *XVIDEOS SEARCH + DOWNLOAD*\n\nUsage: ${px}xvideos <search text or video URL>\nExample: ${px}xvideos lady dimitrescu`);
        if (!APIFY_API_TOKEN || APIFY_API_TOKEN === 'PASTE_APIFY_TOKEN_HERE') return reply('❌ Xvideos is not configured: paste the Apify token into APIFY_TOKEN_IN_FILE in commands/media/xvideos.js or set APIFY_API_TOKEN.');

        try {
            await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } }).catch(() => {});
            const result = await searchVideos(input.slice(0, 500));
            let buffer = null;
            let chosen = null;
            let lastError = null;
            for (const url of result.urls) {
                try {
                    buffer = await downloadWithRetries(url, result.source);
                    chosen = url;
                    break;
                } catch (error) {
                    lastError = error;
                    console.error(`[xvideos] candidate failed: ${error.message}`);
                }
            }
            if (!buffer || !chosen) throw lastError || new Error('No playable MP4 returned by Apify');

            const safeName = result.title.replace(/[^a-z0-9]+/gi, '_').slice(0, 60) || 'sukuna_xvideos';
            await sock.sendMessage(from, {
                video: buffer,
                mimetype: 'video/mp4',
                fileName: `${safeName}.mp4`,
                caption: `🔞 *${result.title}*\n\n🔗 Source: ${result.source}\n🎬 Downloaded from Apify result\n\n> SUKUNA MD • 18+`,
            }, { quoted: msg });
            await sock.sendMessage(from, { react: { text: '✅', key: msg.key } }).catch(() => {});
        } catch (error) {
            console.error('[xvideos] error:', error.message);
            await sock.sendMessage(from, { react: { text: '❌', key: msg.key } }).catch(() => {});
            return reply(`❌ Xvideos download failed: ${/Apify run timed out/i.test(error.message) ? 'the search provider timed out' : 'no playable MP4 could be retrieved from the search result'}.`);
        }
    },
};

module.exports.searchVideos = searchVideos;
module.exports.candidateUrls = candidateUrls;
module.exports.collectUrls = collectUrls;
module.exports.searchUrl = searchUrl;
module.exports.downloadMp4 = downloadMp4;
module.exports.ACTOR_RUN_ENDPOINT = ACTOR_RUN_ENDPOINT;
module.exports.MAX_VIDEO_BYTES = MAX_VIDEO_BYTES;
