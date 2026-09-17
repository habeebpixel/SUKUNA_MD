'use strict';

const ttt = require('../fun/ttt');

module.exports = {
    name: 'join',
    aliases: [],
    description: 'Join the current Sukuna Tic-Tac-Toe arena',
    usage: '.join',
    category: 'games',
    async execute(context) {
        return ttt.join(context);
    },
};
