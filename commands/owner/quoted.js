'use strict';

/**
 * .quoted — recursively recover the original message from a reply chain,
 * including media that was deleted for everyone.
 *
 * Scenario this restores:
 *   M1: someone sends a photo
 *   M2: someone replies to M1 explaining what's in it
 *   M3: a third person replies to M2 and sends `.quoted`
 *   -> the bot walks M3's quote chain (M3 -> M2 -> M1) and resends M1,
 *      even if M1 was deleted for everyone in the meantime.
 *
 * How each hop is resolved (the real work happens in utils/messageContext.js):
 *   1. Retrieve vault (utils/retrieveStore.js) — messages that were
 *      explicitly deleted-for-everyone are downloaded and cached at
 *      delete-time (2h TTL), so they survive after WhatsApp's own copy
 *      of the media is gone.
 *   2. The live message store (sock.__sukunaMessageCache in
 *      lib/sessionManager.js) — every message the bot has seen is cached
 *      here (500 per chat), so a still-undeleted ancestor in the chain
 *      can be re-read in full, including ITS OWN quotedMessage context —
 *      which is how we keep walking past one hop.
 *   3. WhatsApp's inline contextInfo.quotedMessage embed — last-resort
 *      fallback when neither store above has the message.
 *
 * NOTE: this file used to collide with commands/utility/quoted.js — both
 * declared `name: 'quoted'`, and the command loader (utils/commandLoader.js)
 * is last-write-wins by name, loading folders alphabetically. Since
 * "utility" loads after "owner", that simpler one-hop-only version silently
 * replaced this one in the command map, so `.quoted` never actually walked
 * the chain no matter what this file said. That duplicate file has been
 * deleted — this is now the only `.quoted` command.
 */

module.exports = {
    name: 'quoted',
    aliases: ['q', 'recover', 'getquoted', 'forwardquoted'],
    description: 'Recover the original message from a reply chain — walks nested quotes and recovers deleted media',
    usage: '.quoted (reply to a message that itself quoted something)',
    category: 'owner',

    async execute({ m, reply, isOwner, isGroup, isAdmin }) {
        if (!isOwner && !(isGroup && isAdmin)) {
            return reply('🔒 _Owner, mods, or group admins only._');
        }

        if (!m?.quoted) {
            return reply('❌ _Reply to a message that itself quoted something, then send `.quoted`._');
        }

        // Walk the whole chain and remember every node.
        const chain = [];
        for (let node = m.quoted; node; node = node.quoted) chain.push(node);

        // Prefer the deepest node that actually carries media (closest to
        // the original), rather than only ever checking the very last link.
        const mediaNode = [...chain].reverse().find(node => node.isMedia);
        const target = mediaNode || chain[chain.length - 1];

        const trail = chain
            .map(node => `${node.key?.id || 'no-id'}:${node.type || 'unknown'}${node.fromStore ? ':vault' : ''}`)
            .join(' → ');

        if (!target.isMedia) {
            if (!target.text) {
                return reply(
                    `⚠️ Resolved the quote chain (${trail}) but found no media or text to recover.\n` +
                    `The original must have been seen by this bot before it was deleted, or the chain ends here.`
                );
            }
            try {
                await target.forward();
                return;
            } catch (error) {
                return reply(`❌ Found the quoted text but could not resend it: ${error.message}`);
            }
        }

        try {
            await target.forward();
        } catch (error) {
            return reply(`❌ Found the quoted media but could not recover it: ${error.message}`);
        }
    },
};
