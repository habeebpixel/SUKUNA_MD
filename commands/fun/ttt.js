'use strict';

const { sendRichHtml, sendSukunaTTTCanvas, escapeHtml } = require('../../utils/genaiRich');
const database = require('../../utils/database');

const games = new Map();
const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function playerId(jid) { return String(jid || '').split(':')[0]; }
function label(jid) { return playerId(jid).split('@')[0]; }
function mode(sock) { return sock?.__sukunaDeviceMode || database.getDeviceMode(); }
function gameFor(chat) {
    if (!games.has(chat)) games.set(chat, { players: [], board: Array(9).fill(''), turn: 0, over: false, result: '' });
    return games.get(chat);
}
function result(game) {
    for (const [a, b, c] of wins) if (game.board[a] && game.board[a] === game.board[b] && game.board[a] === game.board[c]) return game.board[a];
    return game.board.every(Boolean) ? 'D' : null;
}
function boardText(game) {
    return [0, 1, 2].map(row => [0, 1, 2].map(col => game.board[row * 3 + col] || String(row * 3 + col + 1)).join(' │ ')).join('\n───┼───┼───\n');
}
function report(game, chat, message) {
    const first = game.players[0] ? `X: @${label(game.players[0])}` : 'X: waiting';
    const second = game.players[1] ? `O: @${label(game.players[1])}` : 'O: waiting';
    const next = game.players[game.turn];
    const nextText = next ? `Next turn: @${label(next)} (${game.turn === 0 ? 'X' : 'O'})` : 'Next turn: waiting for player O';
    return {
        canvasText: `☠ SUKUNA TTT ☠\n\n${first}\n${second}\n\n${boardText(game)}\n\n${message || nextText}`,
        caption: `☠ SUKUNA TIC-TAC-TOE\n\n${first}\n${second}\n\n${message || nextText}\n\nUse .ttt 1–9 to choose a square.`,
        next,
    };
}
async function sendBoard({ sock, msg, from, game, message }) {
    const view = report(game, from, message);
    const mentions = view.next ? [view.next] : game.players.slice(0, 2);
    const html = `<div><h1>☠ SUKUNA TIC-TAC-TOE</h1><p>${escapeHtml(boardText(game)).replace(/\n/g, '<br>')}</p><p>${escapeHtml(view.caption).replace(/\n/g, '<br>')}</p></div>`;
    if (mode(sock) === 'iphone') {
        return sendSukunaTTTCanvas({ sock, jid: from, quoted: msg, board: game.board, players: game.players, status: message || 'SEND .TTT 1–9 TO PLAY', mentions });
    }
    const sent = await sendRichHtml({ sock, jid: from, quoted: msg, html, mentions });
    if (view.next) {
        await sock.sendMessage(from, {
            text: `⏳ @${label(view.next)}, your turn — use .ttt 1–9.`,
            mentions: [view.next],
        }, { quoted: msg });
    }
    return sent;
}

async function join({ sock, msg, from, sender, reply }) {
    const game = gameFor(from);
    const id = playerId(sender);
    if (!id) return reply('❌ I could not identify the player.');
    if (game.over) {
        games.set(from, { players: [], board: Array(9).fill(''), turn: 0, over: false, result: '' });
        return join({ sock, msg, from, sender, reply });
    }
    if (!game.players.some(item => playerId(item) === id)) {
        if (game.players.length >= 2) return reply('⚔️ This arena already has two players. Wait for the next round.');
        game.players.push(sender);
    }
    const message = game.players.length < 2
        ? `@${label(sender)} joined as X. A second player should send .join.`
        : `⚔️ Arena ready. @${label(game.players[0])} is X and @${label(game.players[1])} is O. @${label(game.players[game.turn])} starts with .ttt 1–9.`;
    return sendBoard({ sock, msg, from, game, message });
}

async function move({ sock, msg, from, sender, reply, value }) {
    const game = gameFor(from);
    if (game.players.length < 2) return reply('⚔️ Two players are needed. Send .join to enter the arena.');
    const id = playerId(sender);
    const turnPlayer = game.players[game.turn];
    if (playerId(turnPlayer) !== id) return reply(`⏳ It is @${label(turnPlayer)}'s turn.`, { mentions: [turnPlayer] });
    const index = Number(value) - 1;
    if (!Number.isInteger(index) || index < 0 || index > 8) return reply('Use a square number from 1 to 9.');
    if (game.board[index]) return reply('That square is already claimed. Choose another number.');
    game.board[index] = game.turn === 0 ? 'X' : 'O';
    const winner = result(game);
    if (winner) {
        game.over = true;
        game.result = winner === 'D' ? 'DRAW — the domains collide evenly.' : `🏆 @${label(sender)} wins the Sukuna domain!`;
        return sendBoard({ sock, msg, from, game, message: game.result + ' Send .join to start a new round.' });
    }
    game.turn = game.turn === 0 ? 1 : 0;
    return sendBoard({ sock, msg, from, game, message: `Move accepted: @${label(sender)} chose ${value}. @${label(game.players[game.turn])}, your turn — use .ttt 1–9.` });
}

module.exports = {
    name: 'ttt',
    aliases: ['tictactoe', 'xo'],
    description: 'Play Sukuna Tic-Tac-Toe with .join and numbered moves',
    usage: '.ttt | .join | .ttt 1-9',
    category: 'games',
    join,
    async execute({ sock, msg, from, sender, reply, args }) {
        try {
            if (!args.length) {
                const game = gameFor(from);
                return sendBoard({ sock, msg, from, game, message: game.players.length ? undefined : 'Send .join to enter as player X. A second player sends .join.' });
            }
            if (String(args[0]).toLowerCase() === 'join') return join({ sock, msg, from, sender, reply });
            return move({ sock, msg, from, sender, reply, value: args[0] });
        } catch (error) {
            console.error('[TTT]', error.message);
            return reply('Tic-Tac-Toe could not open. Run `.ttt` again.');
        }
    },
};
