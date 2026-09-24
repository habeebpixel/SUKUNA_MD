/**
 * .hack — cinematic fictional cyber simulation
 * Usage: .hack @user, .hack <number>, or reply to a user
 *
 * This command only edits one WhatsApp message. It performs no network,
 * account, device, or data-access operation.
 */

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    name: 'hack',
    aliases: ['fakehack', 'hacker'],
    description: 'Cinematic fictional cyber simulation',
    category: 'fun',

    async execute({ sock, msg, from, reply, args }) {
        const context = msg.message?.extendedTextMessage?.contextInfo;
        const mentioned = context?.mentionedJid || [];
        const quotedParticipant = context?.participant;
        let targetUser = mentioned[0] || quotedParticipant;

        if (!targetUser && args.length > 0) {
            const input = args[0].replace(/[^0-9]/g, '');
            if (input) targetUser = input + '@s.whatsapp.net';
        }

        if (!targetUser) return reply('Usage: .hack @user or reply to a user');

        const userNumber = targetUser.split('@')[0];
        const target = `@${userNumber}`;
        const stages = [
            `╔═══[ SHADOW ACCESS ]═══╗\n║ Target  : ${target}\n║ Status  : probing...\n╚════════════════════════╝\n\n▰ Initializing phantom tunnel...`,
            `╔═══[ SHADOW ACCESS ]═══╗\n║ Target  : ${target}\n║ Status  : locked\n╚════════════════════════╝\n\n▰ Forging zero-layer handshake...\n▰ Rotating spectral keys...`,
            `╔═══[ NEURAL OVERRIDE ]═══╗\n║ Target  : ${target}\n║ Status  : bypassing\n╚══════════════════════════╝\n\n▰ Crossing the void gate...\n▰ Injecting phantom protocol...\n▰ Masking trace signature...`,
            `╔═══[ BLACK-ICE BREACH ]═══╗\n║ Target  : ${target}\n║ Status  : exposed\n╚══════════════════════════╝\n\n▰ Shredding firewall echoes...\n▰ Synchronizing dark channel...\n▰ Sealing counter-trace...`,
            `╔═══[ GHOST KERNEL ]═══╗\n║ Target  : ${target}\n║ Status  : eclipsed\n╚═══════════════════════╝\n\n▰ Phantom payload armed...\n▰ Reality layer destabilized...\n▰ Finalizing spectral takeover...`,
            `╔═══[ TERMINAL OVERRIDE ]═══╗\n║ Target  : ${target}\n║ Status  : COMPLETE\n╚═══════════════════════════╝\n\n⚠️ BLACK-ICE PROTOCOL COMPLETE\n▰ Trace erased\n▰ Phantom channel sealed\n▰ No real account, device, or data was accessed.`,
        ];

        let current = await reply(stages[0], { mentions: [targetUser] });
        if (!current?.key) return;

        for (let index = 1; index < stages.length; index++) {
            await sleep(1000);
            // Keep the animation strictly to the original message. If the
            // connected Baileys fork cannot edit, stop rather than sending a
            // second message and flooding the chat.
            try {
                await sock.sendMessage(from, {
                    text: stages[index],
                    edit: current.key,
                    mentions: [targetUser],
                });
            } catch (error) {
                console.error('[HACK SIMULATION EDIT]', error.message);
                return;
            }
        }
    },
};
