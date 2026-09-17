'use strict';

const database = require('../../utils/database');

module.exports = {
    name: 'androidmode',
    aliases: ['android'],
    description: 'Use normal rich responses for Android compatibility',
    usage: '.androidmode on|off|status',
    category: 'owner',
    async execute({ reply, args, isOwner }) {
        if (!isOwner) return reply('🔒 This command is reserved for the bot owner.');
        const action = String(args[0] || 'status').toLowerCase();
        if (action === 'status') return reply(`📱 *Device mode:* ${database.getDeviceMode().toUpperCase()}`);
        if (!['on', 'enable', 'off', 'disable'].includes(action)) {
            return reply('Usage: *.androidmode on* | *.androidmode off* | *.androidmode status*');
        }
        if (action === 'on' || action === 'enable') {
            database.setDeviceMode('android');
            return reply('✅ *Android mode enabled*\n\nThe bot will use normal rich responses for this deployment.');
        }
        database.setDeviceMode('iphone');
        return reply('✅ *Android mode disabled*\n\niPhone mode is now active.');
    },
};
