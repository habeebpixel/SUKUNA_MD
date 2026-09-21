'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const xvideos = require('../commands/media/xvideos');

test('normalizes the supplied API result shape', () => {
    const result = xvideos.normalizeResult({
        title: 'Example video',
        pageUrl: 'https://example.test/video',
        category: 'Example',
        views_count: '1234',
        mp4: 'https://cdn.example.test/video.mp4',
    });
    assert.equal(result.title, 'Example video');
    assert.equal(result.views, 1234);
    assert.equal(result.mp4, 'https://cdn.example.test/video.mp4');
});

test('rejects results without an HTTP MP4 URL', () => {
    assert.equal(xvideos.normalizeResult({ title: 'bad', mp4: 'javascript:alert(1)' }), null);
    assert.equal(xvideos.normalizeResult({ title: 'bad', mp4: '' }), null);
});

test('recognizes MP4 signatures and rejects tiny/non-video payloads', () => {
    const mp4 = Buffer.alloc(12 * 1024);
    mp4.write('ftyp', 4, 'ascii');
    assert.equal(xvideos.looksLikeVideo(mp4), true);
    assert.equal(xvideos.looksLikeVideo(Buffer.from('<html>not video</html>'), 'text/html'), false);
});

test('keeps the relay download cap bounded', () => {
    assert.equal(xvideos.MAX_VIDEO_BYTES, 50 * 1024 * 1024);
});

console.log('xvideos regression tests passed');
