'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const xvideos = require('../commands/media/xvideos');

test('builds a direct Xvideos search URL', () => {
    assert.equal(xvideos.searchUrl('lady dimitrescu'), 'https://www.xvideos.com/?k=lady%20dimitrescu');
});

test('extracts Xvideos result pages from search HTML', () => {
    const html = '<a href="/video/123/example-title">one</a><a href="/video/456/other">two</a>';
    assert.deepEqual(xvideos.extractPageUrls(html), [
        'https://www.xvideos.com/video/123/example-title',
        'https://www.xvideos.com/video/456/other',
    ]);
});

test('extracts MP4 player URLs from page HTML', () => {
    const html = 'setVideoUrlHigh("https://cdn.example.test/video.mp4"); contentUrl: "https://cdn.example.test/other.mp4"';
    assert.deepEqual(xvideos.extractMediaUrls(html, 'https://www.xvideos.com/video/123/test').sort(), [
        'https://cdn.example.test/video.mp4',
        'https://cdn.example.test/other.mp4',
    ].sort());
});

test('keeps the MP4 relay cap bounded', () => {
    assert.equal(xvideos.MAX_VIDEO_BYTES, 50 * 1024 * 1024);
});

console.log('xvideos direct extraction regression passed');
