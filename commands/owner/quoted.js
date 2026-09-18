'use strict';

module.exports = {
    name: 'quoted',
    aliases: ['getquoted', 'forwardquoted'],
    description: 'Recover and forward the original message or media from a reply chain',
    usage: '.quoted',
    category: 'owner',
    async execute({ m, reply, isOwner, isMod }) {
        if (!isOwner && !isMod) return reply('🔒 Owner or registered mod only.');
        if (!m?.quoted) return reply('⚠️ Reply to the message containing the explanation, then send `.quoted`.');
        let target = m.quoted;
        while (target.quoted) target = target.quoted;
        try {
            await target.forward();
            return reply(`✅ Recovered ${target.isMedia ? target.type.replace('Message', '') : 'quoted text'} from the message store.`);
        } catch (error) {
            return reply(`❌ I found the quoted message but could not recover it: ${error.message}`);
        }
    },
};
