'use strict';

const database = require('../../utils/database');

module.exports = {
    name: 'iphonemode',
    aliases: ['iphone'],
    description: 'Use plain-text responses for iPhone compatibility',
    usage: '.iphonemode on|off|status',
    category: 'owner',
    async execute({ reply, args, isOwner }) {
        if (!isOwner) return reply('🔒 This command is reserved for the bot owner.');
        const action = String(args[0] || 'status').toLowerCase();
        if (action === 'status') return reply(`📱 *Device mode:* ${database.getDeviceMode().toUpperCase()}`);
        if (!['on', 'enable', 'off', 'disable'].includes(action)) {
            return reply('Usage: *.iphonemode on* | *.iphonemode off* | *.iphonemode status*');
        }
        if (action === 'on' || action === 'enable') {
            database.setDeviceMode('iphone');
            return reply('✅ *iPhone mode enabled*\n\nThe bot will use plain-text responses for this deployment.');
        }
        database.setDeviceMode('android');
        return reply('✅ *iPhone mode disabled*\n\nAndroid mode is now active.');
    },
};
