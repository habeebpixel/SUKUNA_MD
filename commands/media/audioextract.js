'use strict';

const {
    resolveMedia,
    downloadResolvedMedia,
    runFfmpeg,
} = require('../../utils/mediaCommand');
const { prefixOf } = require('../../utils/commandHelpers');

module.exports = {
    name: 'audioextract',
    aliases: ['extractaudio', 'videoaudio', 'toaudio'],
    description: 'Extract audio from a quoted video',
    usage: '.audioextract (reply to a video)',
    category: 'media',

    async execute({ sock, msg, from, reply, prefix }) {
        const px = prefixOf(prefix);
        const found = resolveMedia(msg);

        if (!found || found.type !== 'video') {
            return reply(`🎧 Reply to a video with ${px}audioextract to extract and receive its audio.`);
        }

        let downloaded;
        try {
            downloaded = await downloadResolvedMedia(sock, msg, found);
        } catch (error) {
            console.error('[AUDIOEXTRACT DOWNLOAD]', error.message);
            return reply(`❌ I could not download that video: ${error.message}`);
        }

        try {
            const audio = await runFfmpeg([
                '-i', 'pipe:0',
                '-vn',
                '-map', '0:a:0?',
                '-codec:a', 'libmp3lame',
                '-b:a', '128k',
                '-f', 'mp3',
                'pipe:1',
            ], downloaded.buffer);

            if (!audio?.length) throw new Error('the video contains no audio track');

            await sock.sendMessage(from, {
                audio,
                mimetype: 'audio/mpeg',
                fileName: 'extracted-audio.mp3',
                ptt: false,
            }, { quoted: msg });
        } catch (error) {
            console.error('[AUDIOEXTRACT FFMPEG]', error.message);
            const message = /no audio|does not contain an audio|matches no streams/i.test(error.message)
                ? '❌ That video does not contain an audio track.'
                : `❌ Audio extraction failed: ${error.message}`;
            return reply(message);
        }
    },
};
