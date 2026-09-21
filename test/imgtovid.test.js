'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const imgtovid = require('../commands/media/imgtovid');

test('uses the requested image-to-video service', () => {
    assert.equal(imgtovid.API_BASE, 'https://pasqua-video-gen.onrender.com');
    assert.equal(imgtovid.MAX_POLL_ATTEMPTS, 120);
});

test('recognizes MP4 signatures and rejects invalid files', () => {
    const mp4 = Buffer.alloc(32);
    mp4.write('ftyp', 4, 'ascii');
    assert.equal(imgtovid.isMp4(mp4), true);
    assert.equal(imgtovid.isMp4(Buffer.from('<html>error</html>'), 'text/html'), false);
});

test('keeps prompts and polling bounded', () => {
    assert.equal(imgtovid.MAX_PROMPT_LENGTH, 1000);
    assert.equal(imgtovid.MAX_POLL_ATTEMPTS * 5000, 600000);
});

console.log('imgtovid regression passed');
