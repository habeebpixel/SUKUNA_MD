'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const aio = require('../commands/media/aio');

test('finds common download URL fields recursively', () => {
    const urls = aio.findVideoUrls({
        success: true,
        data: { download_url: 'https://cdn.example.test/video.mp4' },
        formats: [{ url: 'https://cdn.example.test/other.mp4' }],
    });
    assert.deepEqual(urls, [
        'https://cdn.example.test/video.mp4',
        'https://cdn.example.test/other.mp4',
    ]);
});

test('does not treat arbitrary metadata URLs as video URLs', () => {
    assert.deepEqual(aio.findVideoUrls({ pageUrl: 'https://example.test/page' }), []);
});

test('uses the supplied aio3 endpoint', () => {
    assert.equal(aio.API_ENDPOINT, 'https://eliteprotech-apis.zone.id/download/aio3');
});

console.log('aio regression tests passed');
