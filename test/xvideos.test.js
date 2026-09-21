'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const xvideos = require('../commands/media/xvideos');

test('uses the supplied RapidAPI base URL and endpoints', () => {
    assert.equal(xvideos.RAPIDAPI_BASE_URL, 'https://porn-xnxx-api.p.rapidapi.com');
    assert.equal(xvideos.SEARCH_ENDPOINT, `${xvideos.RAPIDAPI_BASE_URL}/search`);
    assert.equal(xvideos.DOWNLOAD_ENDPOINT, `${xvideos.RAPIDAPI_BASE_URL}/download`);
});

test('normalizes documented RapidAPI search results', () => {
    const result = xvideos.normalizeSearchResult({
        title: 'Example video',
        video_link: 'https://xnxx.com/video-example/example',
        thumbnail: 'https://cdn.example.test/thumb.jpg',
        views: '12.3k',
        duration: '4min',
    });
    assert.equal(result.title, 'Example video');
    assert.equal(result.videoLink, 'https://xnxx.com/video-example/example');
    assert.equal(result.views, '12.3k');
    assert.equal(xvideos.normalizeSearchResult({ title: 'bad' }), null);
});

test('keeps the MP4 relay cap bounded', () => {
    assert.equal(xvideos.MAX_VIDEO_BYTES, 50 * 1024 * 1024);
});

console.log('xvideos RapidAPI regression passed');
