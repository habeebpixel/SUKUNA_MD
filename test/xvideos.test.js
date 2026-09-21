'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const xvideos = require('../commands/media/xvideos');

test('builds an Xvideos search URL for text input', () => {
    assert.equal(
        xvideos.searchUrl('lady dimitrescu'),
        'https://www.xvideos.com/?k=lady%20dimitrescu',
    );
});

test('extracts and prioritizes direct MP4 URLs from actor output', () => {
    const urls = xvideos.candidateUrls([{
        title: 'Example',
        page: 'https://www.xvideos.com/video/123',
        media: 'https://cdn.example.test/video.mp4',
        thumbnail: 'https://cdn.example.test/thumb.jpg',
    }]);
    assert.deepEqual(urls, [
        'https://cdn.example.test/video.mp4',
        'https://www.xvideos.com/video/123',
        'https://cdn.example.test/thumb.jpg',
    ]);
});

test('recursively parses serialized JSON actor fields', () => {
    const urls = xvideos.candidateUrls([{ results: JSON.stringify({ mp4: 'https://cdn.example.test/a.mp4' }) }]);
    assert.deepEqual(urls, ['https://cdn.example.test/a.mp4']);
});

test('keeps the MP4 relay cap bounded', () => {
    assert.equal(xvideos.MAX_VIDEO_BYTES, 50 * 1024 * 1024);
});

console.log('xvideos Apify regression tests passed');
