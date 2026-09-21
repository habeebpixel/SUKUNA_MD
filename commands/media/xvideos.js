/**
 * Xvideos Search + Download Command
 * Usage: .xvideos <search text or Xvideos video URL>
 *
 * This version has no API dependency. It requests the public Xvideos search or
 * video page, extracts the player URLs exposed by the page, downloads the MP4
 * itself, validates it, and sends the finished file to WhatsApp.
 */
'use strict';

const axios = require('axios');
const { prefixOf } = require('../../utils/commandHelpers');

const SEARCH_TIMEOUT_MS = 30_000;
const PAGE_TIMEOUT_MS = 45_000;
const DOWNLOAD_TIMEOUT_MS = 90_000;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MIN_VIDEO_BYTES = 10 * 1024;
const MAX_PAGE_CANDIDATES = 8;
const MAX_MEDIA_CANDIDATES = 8;
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36';

function cleanText(value, fallback = 'Xvideos video', maxLength = 180) {
    const text = String(value ?? '').replace(/[\u0000-\u001F]/g, '').trim();
    if (!text) return fallback;
    return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
}

function isHttpUrl(value) {
    try { return /^https?:$/i.test(new URL(String(value).trim()).protocol); } catch (_) { return false; }
}

function isXvideosUrl(value) {
    try { return isHttpUrl(value) && /(^|\.)xvideos\.com$/i.test(new URL(value).hostname); } catch (_) { return false; }
}

function decodeUrl(value) {
    return String(value)
        .replace(/\\u0026/g, '&')
        .replace(/\\\//g, '/')
        .replace(/&amp;/g, '&')
        .replace(/\\x26/g, '&')
        .replace(/^['"]|['"]$/g, '');
}

function absoluteUrl(value, base) {
    const decoded = decodeUrl(value);
    try {
        const url = new URL(decoded, base);
        return isHttpUrl(url.href) ? url.href : '';
    } catch (_) { return ''; }
}

function searchUrl(query) {
    return `https://www.xvideos.com/?k=${encodeURIComponent(query)}`;
}

function extractPageUrls(html) {
    const urls = [];
    const source = String(html || '');
    const patterns = [
        /href=["'](\/video\/(?:[^"']+))["']/gi,
        /https?:\\?\/\\?\/www\.xvideos\.com\/video\/[^"'\\\s<>]+/gi,
    ];
    for (const pattern of patterns) {
        for (const match of source.matchAll(pattern)) {
            const raw = match[1] || match[0];
            const url = absoluteUrl(raw, 'https://www.xvideos.com/');
            if (isXvideosUrl(url) && /\/video\//i.test(url)) urls.push(url.split('#')[0]);
        }
    }
    return [...new Set(urls)].slice(0, MAX_PAGE_CANDIDATES);
}

function extractMediaUrls(html, baseUrl) {
    const source = String(html || '');
    const urls = [];
    const patterns = [
        /(?:setVideoUrlHigh|setVideoUrlLow|setVideoHLS|video_url|contentUrl)\s*['"\s:=,]+([^'"\s,;}]+)/gi,
        /https?:\\?\/\\?\/[^\s"'<>]+\.(?:mp4|m3u8)(?:\?[^\s"'<>]*)?/gi,
    ];
    for (const pattern of patterns) {
        for (const match of source.matchAll(pattern)) {
            const url = absoluteUrl(match[1] || match[0], baseUrl);
            if (isHttpUrl(url) && /(?:\.mp4(?:$|[?#])|\.m3u8(?:$|[?#]))/i.test(url)) urls.push(url);
        }
    }
    return [...new Set(urls)].slice(0, MAX_MEDIA_CANDIDATES);
}

async function fetchPage(url, timeout = PAGE_TIMEOUT_MS) {
    const response = await axios.get(url, {
        timeout,
        maxContentLength: 12 * 1024 * 1024,
        responseType: 'text',
        validateStatus: () => true,
        headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
    });
    if (response.status < 200 || response.status >= 300) throw new Error(`Xvideos page HTTP ${response.status}`);
    return String(response.data || '');
}

async function searchVideos(query) {
    const url = searchUrl(query);
    const html = await fetchPage(url, SEARCH_TIMEOUT_MS);
    const pages = extractPageUrls(html);
    if (!pages.length) throw new Error('No Xvideos search results');
    return { pages, source: url };
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
    throw lastError || new Error('download failed');
}

async function resolveVideoPage(pageUrl) {
    const html = await fetchPage(pageUrl);
    const media = extractMediaUrls(html, pageUrl);
    if (!media.length) throw new Error('No MP4 player URL found on page');
    return { media, title: cleanText((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]) };
}

module.exports = {
    name: 'xvideos',
    aliases: ['xvideo', 'xv'],
    description: 'Search and download an Xvideos video without an external API (18+)',
    category: 'media',
    nsfw: true,
    usage: '.xvideos <search text or Xvideos video URL>',

    async execute({ sock, msg, from, reply, args, prefix }) {
        const px = prefixOf(prefix);
        const input = Array.isArray(args) ? args.join(' ').trim() : '';
        if (!input) return reply(`🔞 *XVIDEOS SEARCH + DOWNLOAD*\n\nUsage: ${px}xvideos <search text or Xvideos video URL>\nExample: ${px}xvideos lady dimitrescu`);
        if (input.startsWith('http') && !isXvideosUrl(input)) return reply('❌ Please provide an Xvideos URL or a search phrase.');

        try {
            await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } }).catch(() => {});
            const search = isXvideosUrl(input) ? { pages: [input], source: input } : await searchVideos(input.slice(0, 120));
            let foundLinks = [];
            let lastError = null;
            for (const pageUrl of search.pages) {
                try {
                    const page = await resolveVideoPage(pageUrl);
                    foundLinks.push(...page.media);
                    for (const mediaUrl of page.media) {
                        try {
                            const buffer = await downloadWithRetries(mediaUrl, pageUrl);
                            const title = page.title || 'Xvideos video';
                            const safeName = title.replace(/[^a-z0-9]+/gi, '_').slice(0, 60) || 'sukuna_xvideos';
                            await sock.sendMessage(from, {
                                video: buffer,
                                mimetype: 'video/mp4',
                                fileName: `${safeName}.mp4`,
                                caption: `🔞 *${title}*\n\n🔗 Source: ${pageUrl}\n\n> SUKUNA MD • 18+`,
                            }, { quoted: msg });
                            await sock.sendMessage(from, { react: { text: '✅', key: msg.key } }).catch(() => {});
                            return;
                        } catch (error) { lastError = error; }
                    }
                } catch (error) { lastError = error; }
            }
            const links = [...new Set([...search.pages, ...foundLinks])].slice(0, 12);
            if (links.length) {
                await sock.sendMessage(from, {
                    text: `🔗 *XVIDEOS LINKS FOUND*\n\n${links.map((url, i) => `${i + 1}. ${url}`).join('\n')}\n\nThe page exposed links but the server did not return a playable MP4.`,
                }, { quoted: msg });
                await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } }).catch(() => {});
                return;
            }
            throw lastError || new Error('No video links found');
        } catch (error) {
            console.error('[xvideos] error:', error.message);
            await sock.sendMessage(from, { react: { text: '❌', key: msg.key } }).catch(() => {});
            return reply('❌ Xvideos could not find a video page or playable MP4. Try another search.');
        }
    },
};

module.exports.searchUrl = searchUrl;
module.exports.extractPageUrls = extractPageUrls;
module.exports.extractMediaUrls = extractMediaUrls;
module.exports.searchVideos = searchVideos;
module.exports.downloadMp4 = downloadMp4;
module.exports.resolveVideoPage = resolveVideoPage;
module.exports.MAX_VIDEO_BYTES = MAX_VIDEO_BYTES;
