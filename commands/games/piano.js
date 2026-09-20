'use strict';

const { sendRichHtml, sendSukunaPianoCanvas, escapeHtml } = require('../../utils/genaiRich');

const games = new Map();

function gameFor(chat) {
    if (!games.has(chat)) games.set(chat, freshGame());
    return games.get(chat);
}
function freshGame() {
    const game = { rows: [], score: 0, combo: 0, best: 0, level: 1, over: false, lastLane: -1, message: 'TAP A NOTE TO START' };
    for (let i = 0; i < 8; i += 1) game.rows.push(makeRow(game, i));
    return game;
}
function makeRow(game, index = 0) {
    let lane = Math.floor(Math.random() * 4);
    if (lane === game.lastLane) lane = (lane + 1 + Math.floor(Math.random() * 3)) % 4;
    game.lastLane = lane;
    const hold = index > 2 && Math.random() < Math.min(0.22, 0.08 + game.level * 0.015);
    return { lane, hold, points: hold ? 3 : 1 };
}
function reset(chat) {
    const game = freshGame();
    games.set(chat, game);
    return game;
}
function boardHtml(game) {
    return [...game.rows].reverse().map(row => `<div class="row">${[0, 1, 2, 3].map(lane => lane === row.lane ? `<div class="tile ${row.hold ? 'hold' : ''}">${row.hold ? 'HOLD' : '♪'}</div>` : '<div class="empty"></div>').join('')}</div>`).join('');
}
function viewHtml(game) {
    const stars = [1, 2, 3].map(star => `<span class="star ${game.score >= star * 10 ? 'on' : ''}">★</span>`).join('');
    return `<div class="piano-card"><div class="brand">☠ SUKUNA PIANO ☠</div><div class="stats"><b>${game.score}</b><span>COMBO ${game.combo}</span><span>LV ${game.level}</span></div><div class="stars">${stars}</div><div class="board">${boardHtml(game)}<div class="hit-line"></div></div><div class="status">${escapeHtml(game.message)}</div><div class="help">TAP: .piano 1–4 · HOLD NOTES ARE WORTH 3 · MISS BREAKS COMBO</div></div>`;
}
function viewText(game) {
    return `☠ SUKUNA PIANO ☠\n\nSCORE: ${game.score}   COMBO: ${game.combo}   LEVEL: ${game.level}\n\n${game.rows.map(row => [0, 1, 2, 3].map(lane => lane === row.lane ? (row.hold ? '[H]' : '[♪]') : ' · ').join(' ')).join('\n')}\n\n${game.message}\n\nSend .piano 1, .piano 2, .piano 3, or .piano 4.`;
}
async function sendBoard({ sock, msg, from, game }) {
    if (sock?.__sukunaDeviceMode === 'iphone') {
        return sendSukunaPianoCanvas({ sock, jid: from, quoted: msg, rows: game.rows, score: game.score, combo: game.combo, level: game.level, status: game.message, gameOver: game.over });
    }
    const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;padding:8px;background:radial-gradient(circle at 50% 0,#831329,#13030a 70%);font-family:Arial,sans-serif}.piano-card{color:#fff4f7;background:linear-gradient(145deg,#14040b,#650b1b 55%,#21040c);border:2px solid #ff3158;border-radius:20px;padding:16px;box-shadow:0 0 24px #ff315855}.brand{text-align:center;font:bold 20px Arial Black;letter-spacing:2px}.stats{display:flex;justify-content:space-between;align-items:end;margin:12px 2px 4px;color:#ffc4d2;font:700 11px monospace}.stats b{font:900 36px Arial;color:white}.stars{text-align:center;color:#3c1b24;font-size:22px;letter-spacing:7px;margin-bottom:8px}.star.on{color:#ffd25a;text-shadow:0 0 8px #ffd25a}.board{position:relative;background:#fff8fb;border-radius:14px;padding:5px;overflow:hidden}.row{height:43px;display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid #dbcbd0}.empty{border-right:1px solid #dbcbd0}.tile{margin:3px;border-radius:8px;background:linear-gradient(145deg,#3a1520,#080308);color:#fff;text-align:center;font:bold 22px/37px Arial;box-shadow:inset 0 0 0 2px #ff5778,0 3px 7px #30000b}.tile.hold{background:linear-gradient(180deg,#ff4968,#a70e2e);box-shadow:inset 0 0 0 2px #ffc4d2,0 0 12px #ff3158}.hit-line{height:4px;background:#ff3158;box-shadow:0 0 10px #ff3158}.status{text-align:center;font:bold 14px monospace;margin:12px 0 8px}.help{text-align:center;color:#f5a4b7;font:10px monospace;line-height:1.4}</style></head><body>${viewHtml(game)}</body></html>`;
    return sendRichHtml({ sock, jid: from, quoted: msg, html, canvasText: viewText(game), title: 'SUKUNA PIANO', caption: `SUKUNA PIANO · ${game.message}`, theme: 'sukuna' });
}
async function execute({ sock, msg, from, reply, args = [] }) {
    const action = String(args[0] || '').toLowerCase();
    if (action === 'stop' || action === 'end') {
        games.delete(from);
        return reply('🎹 Piano round ended. Send `.piano` to start a new song.');
    }
    if (action === 'help') return reply('🎹 `.piano` starts the game. Then send `.piano 1`, `.piano 2`, `.piano 3`, or `.piano 4` to tap the matching lane. Send `.piano stop` to end.');
    const game = action ? gameFor(from) : reset(from);
    if (!action) {
        game.message = 'SONG READY · TAP THE LOWEST NOTE';
        return sendBoard({ sock, msg, from, game });
    }
    if (game.over) return reply('🎹 Round over. Send `.piano` to play again.');
    const lane = Number(action) - 1;
    if (!Number.isInteger(lane) || lane < 0 || lane > 3) return reply('🎹 Choose a lane from 1 to 4. Example: `.piano 2`');
    const note = game.rows.shift();
    if (lane !== note.lane) {
        game.combo = 0;
        game.over = true;
        game.message = `MISS · THE NOTE WAS LANE ${note.lane + 1} · SCORE ${game.score}`;
        return sendBoard({ sock, msg, from, game });
    }
    game.combo += 1;
    game.best = Math.max(game.best, game.combo);
    game.score += note.points * (1 + Math.floor(game.combo / 10));
    game.level = Math.min(20, 1 + Math.floor(game.score / 20));
    game.rows.push(makeRow(game, game.rows.length + game.score));
    game.message = note.hold ? `HOLD HIT · +${note.points} · KEEP PLAYING` : `PERFECT · +${note.points} · NEXT NOTE`;
    return sendBoard({ sock, msg, from, game });
}

module.exports = { name: 'piano', aliases: ['pianotiles', 'tiles'], description: 'Play Sukuna Piano Tiles', usage: '.piano | .piano 1-4 | .piano stop', category: 'games', execute };
