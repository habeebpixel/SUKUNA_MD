'use strict';

const fs = require('fs');
const FormData = require('form-data');
const { resolveMedia, downloadResolvedMedia, writeTemp, safeUnlink, MAX_MEDIA_BYTES } = require('../../utils/mediaCommand');
const { prefixOf } = require('../../utils/commandHelpers');

const API_BASE = 'https://pasqua-video-gen.onrender.com';
const GENERATE_ENDPOINT = `${API_BASE}/api/generate`;
const STATUS_ENDPOINT = jobId => `${API_BASE}/api/status/${encodeURIComponent(jobId)}`;
const MAX_PROMPT_LENGTH = 1_000;
const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_ATTEMPTS = 180; // 15 minutes
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_VIDEO_BYTES = Math.min(MAX_MEDIA_BYTES, 50 * 1024 * 1024);

function fetchApi(...args) {
    return import('node-fetch').then(({ default: fetch }) => fetch(...args));
}

function imageExtension(mimetype = '') {
    const type = String(mimetype).toLowerCase().split(';')[0];
    if (type === 'image/png') return '.png';
    if (type === 'image/webp') return '.webp';
    if (type === 'image/gif') return '.gif';
    return '.jpg';
}

function isMp4(buffer, contentType = '') {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;
    return /^video\//i.test(contentType) || buffer.subarray(4, 8).toString('ascii') === 'ftyp';
}

function parseJsonSafely(text) {
    try { return JSON.parse(text); } catch (_) { return null; }
}

async function readResponseJson(response, label) {
    const text = await response.text();
    const data = parseJsonSafely(text);
    if (!response.ok) {
        const detail = data?.error || data?.message || `HTTP ${response.status}`;
        throw new Error(`${label}: ${detail}`);
    }
    if (!data || typeof data !== 'object') throw new Error(`${label}: invalid JSON response`);
    return data;
}

async function createJob(imagePath, prompt, mimetype) {
    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath), {
        filename: `sukuna-input${imageExtension(mimetype)}`,
        contentType: mimetype || 'image/jpeg',
    });
    form.append('prompt', prompt);
    const response = await fetchApi(GENERATE_ENDPOINT, {
        method: 'POST',
        body: form,
        headers: form.getHeaders(),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const data = await readResponseJson(response, 'video generation request failed');
    if (!data.job_id) throw new Error('video generation service did not return a job id');
    return String(data.job_id);
}

async function waitForJob(jobId, onProgress = () => {}) {
    for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
        let status;
        try {
            const response = await fetchApi(STATUS_ENDPOINT(jobId), {
                headers: { Accept: 'application/json', 'User-Agent': 'SUKUNA-MD/3.0' },
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            });
            if ([408, 429, 500, 502, 503, 504].includes(response.status)) {
                onProgress(`provider temporary HTTP ${response.status}; retrying`);
                continue;
            }
            status = await readResponseJson(response, 'video status request failed');
        } catch (error) {
            if (/HTTP (408|429|500|502|503|504)/i.test(error.message) || /fetch failed|network|timeout|invalid JSON response/i.test(error.message)) {
                onProgress('provider temporarily unavailable; retrying');
                continue;
            }
            throw error;
        }
        const state = String(status.status || '').toLowerCase();
        if (state === 'done' || state === 'completed' || state === 'success') {
            if (!status.download_url) throw new Error('video job completed without a download URL');
            return status;
        }
        if (state === 'failed' || state === 'error') throw new Error(status.error || 'video generation failed');
        if (!['queued', 'pending', 'processing', 'running', ''].includes(state)) {
            throw new Error(`video generation returned unknown status: ${state}`);
        }
        if (attempt === 1 || attempt % 6 === 0) onProgress(state || 'processing');
    }
    throw new Error('video generation timed out after 10 minutes');
}

async function downloadGeneratedVideo(downloadUrl) {
    const url = new URL(String(downloadUrl), API_BASE);
    if (!/^https?:$/i.test(url.protocol)) throw new Error('generation service returned an invalid video URL');
    const response = await fetchApi(url, {
        headers: { Accept: 'video/mp4,video/*,*/*;q=0.8', 'User-Agent': 'SUKUNA-MD/3.0' },
        signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) throw new Error(`generated video download failed: HTTP ${response.status}`);
    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (declaredLength > MAX_VIDEO_BYTES) throw new Error('generated video exceeds the 50 MB limit');
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_VIDEO_BYTES) throw new Error('generated video exceeds the 50 MB limit');
    if (!isMp4(buffer, response.headers.get('content-type') || '')) throw new Error('generated file is not a playable MP4');
    return buffer;
}

module.exports = {
    name: 'imgtovid',
    aliases: ['imagetovideo', 'itv'],
    description: 'Turn a replied image into an AI video from a prompt',
    category: 'media',
    usage: '.imgtovid <prompt> (reply to an image)',

    async execute({ sock, msg, from, reply, args, prefix }) {
        const px = prefixOf(prefix);
        const prompt = (Array.isArray(args) ? args.join(' ') : '').trim().slice(0, MAX_PROMPT_LENGTH);
        const found = resolveMedia(msg);
        if (!found || found.type !== 'image') {
            return reply(`🖼️ Reply to an image with ${px}imgtovid <what you want it to do>.\n\nExample: ${px}imgtovid make the subject wave naturally and add a gentle camera zoom`);
        }
        if (!prompt) return reply(`✍️ Add a prompt after the command.\nExample: ${px}imgtovid make the image come alive with a slow cinematic camera movement`);

        let imagePath = null;
        try {
            await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } }).catch(() => {});
            const media = await downloadResolvedMedia(sock, msg, found);
            imagePath = writeTemp(media.buffer, imageExtension(found.node?.mimetype));
            const jobId = await createJob(imagePath, prompt, found.node?.mimetype || 'image/jpeg');
            await reply(`🎬 Video generation started. Job: ${jobId.slice(0, 12)}…\nThis can take a few minutes; I’ll send the MP4 when it is ready.`);
            const status = await waitForJob(jobId, state => console.log(`[imgtovid] ${jobId}: ${state}`));
            const video = await downloadGeneratedVideo(status.download_url);
            await sock.sendMessage(from, {
                video,
                mimetype: 'video/mp4',
                fileName: `sukuna-imgtovid-${Date.now()}.mp4`,
                caption: `🎬 *AI Image to Video*\n\n${prompt}\n\n> SUKUNA MD`,
            }, { quoted: msg });
            await sock.sendMessage(from, { react: { text: '✅', key: msg.key } }).catch(() => {});
        } catch (error) {
            console.error('[imgtovid]', error.message);
            await sock.sendMessage(from, { react: { text: '❌', key: msg.key } }).catch(() => {});
            return reply(`❌ Image-to-video failed: ${error.message || 'the generation service was unavailable'}`);
        } finally {
            if (imagePath) safeUnlink(imagePath);
        }
    },
};

module.exports.API_BASE = API_BASE;
module.exports.MAX_PROMPT_LENGTH = MAX_PROMPT_LENGTH;
module.exports.MAX_POLL_ATTEMPTS = MAX_POLL_ATTEMPTS;
module.exports.isMp4 = isMp4;
module.exports.downloadGeneratedVideo = downloadGeneratedVideo;
