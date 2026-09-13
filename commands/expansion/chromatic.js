'use strict';

const crypto = require('crypto');
const { generateWAMessageFromContent, proto } = require('@pasqua-baileys/baileys');
const { sendRichHtml, escapeHtml } = require('../../utils/genaiRich');

const SESSIONS = new Map();
const ACTIONS = [
    { id: 'analyze', label: 'Analyze', tone: 'cyan', icon: '🔵', meaning: 'available action' },
    { id: 'explain', label: 'Explain', tone: 'violet', icon: '🟣', meaning: 'AI reasoning' },
    { id: 'review', label: 'Review', tone: 'amber', icon: '🟡', meaning: 'needs attention' },
    { id: 'approve', label: 'Approve', tone: 'green', icon: '🟢', meaning: 'confirmed action' },
    { id: 'stop', label: 'Stop', tone: 'red', icon: '🔴', meaning: 'risk or cancel' },
    { id: 'reset', label: 'Reset', tone: 'slate', icon: '⚪', meaning: 'return to start' },
];

function quickReply(label, id) {
    return { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: label, id }) };
}

async function sendNativeStrip({ sock, jid, quoted, session }) {
    const buttons = ACTIONS.slice(0, 3).map(action => quickReply(`${action.icon} ${action.label}`, `chromatic:${session.id}:${action.id}`));
    const content = {
        body: { text: `CHROMATIC CONTROLS\nNative action strip · session ${session.id.slice(0, 8)}` },
        footer: { text: 'SUKUNA MD · Native action comparison' },
        header: { title: 'CHROMATIC CONTROLS', hasMediaAttachment: false },
        nativeFlowMessage: { buttons, messageParamsJson: '' },
    };
    const wrapped = generateWAMessageFromContent(jid, {
        viewOnceMessage: {
            message: {
                messageContextInfo: { deviceListMetadataVersion: 2, deviceListMetadata: {} },
                interactiveMessage: proto.Message.InteractiveMessage.fromObject(content),
            },
        },
    }, { userJid: sock.user?.id, quoted: quoted?.message ? quoted : undefined });

    await sock.relayMessage(jid, wrapped.message, { messageId: wrapped.key.id });
}

function chromaticHtml(session) {
    const selected = ACTIONS.find(action => action.id === session.selected) || ACTIONS[0];
    const controls = ACTIONS.map(action => `<button class="control ${action.tone} ${session.selected === action.id ? 'selected' : ''}" data-action="${action.id}" onclick="choose('${action.id}')"><span>${action.icon}</span>${action.label}</button>`).join('');
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{box-sizing:border-box}html,body{margin:0;background:#040812;font-family:Arial,sans-serif}body{padding:7px;color:#edf8ff}.card{max-width:560px;margin:auto;padding:15px;border:1px solid #4aa8ff;border-radius:16px;background:radial-gradient(circle at 50% 0,#16355e,#061326 55%,#02060e);box-shadow:0 0 26px #087bce55,inset 0 0 25px #145a9822}.eyebrow{color:#6acbff;font:10px monospace;letter-spacing:1.8px}.title{margin-top:5px;color:#f3fbff;font:bold 22px Arial Black,sans-serif}.title b{color:#43c9ff}.rule{height:1px;margin:10px 0;background:linear-gradient(90deg,#29b8ff,transparent)}.status{padding:10px;border:1px solid #1c5a91;background:#061a30;font:11px/1.45 monospace}.status strong{color:#fff}.status .tone{font-weight:bold;text-transform:uppercase}.tone-cyan{color:#47d7ff}.tone-violet{color:#c18cff}.tone-amber{color:#ffd36a}.tone-green{color:#5dffb0}.tone-red{color:#ff7180}.tone-slate{color:#b7c9d7}.label{margin:14px 0 7px;color:#6f9fc6;font:10px monospace}.controls{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.control{min-height:46px;border:1px solid currentColor;border-radius:10px;color:#dceeff;background:#071526;box-shadow:0 0 9px currentColor55;display:flex;align-items:center;gap:8px;padding:9px 11px;font-weight:700;text-align:left}.control span{font-size:16px}.control:active{transform:scale(.97)}.control.selected{background:linear-gradient(135deg,#13395e,#0b1829);box-shadow:0 0 16px currentColor99,inset 0 0 12px currentColor33}.legend{display:grid;grid-template-columns:repeat(2,1fr);gap:5px;margin-top:12px;color:#83a8c7;font:9px monospace}.legend div{padding:5px;border-left:2px solid currentColor;background:#061426}.native{margin-top:13px;padding:8px;border:1px dashed #347cae;color:#82b3d6;font:9px monospace}.footer{margin-top:11px;text-align:center;color:#47799f;font:9px monospace}
</style></head><body><div class="card"><div class="eyebrow">SUKUNA EXPERIMENT // COLOUR STATE UI</div><div class="title">Chromatic <b>Controls</b></div><div class="rule"></div><div class="status">STATE: <strong class="tone-${selected.tone}">${selected.label.toUpperCase()}</strong><br>MEANING: ${escapeHtml(selected.meaning)}<br>SESSION: ${session.id.slice(0, 8)}</div><div class="label">COLOURED RICH SURFACE · TAP A CONTROL</div><div class="controls">${controls}</div><div class="legend"><div class="tone-cyan">🔵 AVAILABLE</div><div class="tone-violet">🟣 AI ACTION</div><div class="tone-green">🟢 CONFIRMED</div><div class="tone-amber">🟡 REVIEW</div><div class="tone-red">🔴 RISK / STOP</div><div class="tone-slate">⚪ RESET</div></div><div class="native">NATIVE ACTION STRIP: the separate WhatsApp-native controls below carry the same action IDs for comparison.</div><div class="footer">COLOUR IS STATE · TEMPORARY SUKUNA MD TEST</div></div><script>function choose(action){document.querySelectorAll('.control').forEach(function(button){button.classList.toggle('selected',button.dataset.action===action)});var labels={analyze:'ANALYZING',explain:'EXPLAINING',review:'REVIEW',approve:'APPROVED',stop:'STOPPED',reset:'ANALYZE'};var status=document.querySelector('.status');if(status)status.innerHTML='STATE: <strong>'+labels[action]+'</strong><br>LOCAL ACTION: '+action.toUpperCase()+'<br>SESSION: ${session.id.slice(0, 8)}'}</script></body></html>`;
}

function createSession() {
    const session = { id: crypto.randomUUID(), selected: 'analyze' };
    SESSIONS.set(session.id, session);
    setTimeout(() => SESSIONS.delete(session.id), 30 * 60 * 1000).unref?.();
    return session;
}

async function handleButton(buttonId, { sock, msg, from }) {
    const match = String(buttonId || '').match(/^chromatic:([^:]+):(analyze|explain|review|approve|stop|reset)$/);
    if (!match) return false;
    const [, id, action] = match;
    const session = SESSIONS.get(id);
    if (!session) {
        await sock.sendMessage(from, { text: 'This Chromatic Controls session expired. Run `.chromatic` again.' }, { quoted: msg });
        return true;
    }
    session.selected = action;
    await sendRichHtml({ sock, jid: from, quoted: msg, html: chromaticHtml(session) });
    return true;
}

module.exports = {
    name: 'chromatic',
    aliases: ['colors', 'colourbuttons'],
    description: 'Temporary coloured WhatsApp controls experiment',
    usage: '.chromatic',
    category: 'expansion',
    async execute({ sock, msg, from, reply }) {
        try {
            const session = createSession();
            await sendRichHtml({ sock, jid: from, quoted: msg, html: chromaticHtml(session) });
            await sendNativeStrip({ sock, jid: from, quoted: msg, session });
        } catch (error) {
            console.error('[CHROMATIC TEST]', error);
            await reply(`Chromatic Controls failed: ${error.message}`);
        }
    },
    handleButton,
};
