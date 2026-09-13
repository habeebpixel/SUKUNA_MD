'use strict';

const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { sendRichHtml, escapeHtml } = require('../../utils/genaiRich');

const execFileAsync = promisify(execFile);
const worker = path.join(__dirname, '../../python/hybrid_lab.py');

function runNodeFallback(prompt, error) {
    const text = String(prompt || '').trim();
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    const unique = new Set(words).size;
    const energy = Math.min(100, 24 + unique * 7 + Math.floor(Math.min(text.length, 180) / 6));
    const focus = Math.min(100, 35 + Math.round((unique / Math.max(words.length, 1)) * 55) + (/\b(build|create)\b/i.test(text) ? 12 : 0));
    return {
        ok: true,
        engine: 'node-fallback',
        input: text,
        metrics: {
            energy,
            focus,
            signal: Number((Math.sqrt(Math.max(text.length, 1)) * 3.2).toFixed(1)),
            words: words.length,
            unique,
        },
        top_terms: words.filter((word, index) => words.indexOf(word) === index).slice(0, 4),
        insight: 'Python was unavailable in this deployment, so the Node fallback rendered the test card successfully.',
        warning: error?.message || 'python3 unavailable',
    };
}

async function runPython(prompt) {
    const input = JSON.stringify({ prompt });
    try {
        const { stdout } = await execFileAsync('python3', [worker], {
            input,
            timeout: 12000,
            maxBuffer: 1024 * 1024,
        });
        const line = stdout.trim().split(/\r?\n/).filter(Boolean).pop();
        return JSON.parse(line || '{}');
    } catch (error) {
        console.warn('[HYBRID TEST] Python unavailable; using Node fallback:', error.message);
        return runNodeFallback(prompt, error);
    }
}

function bar(label, value, color) {
    const safe = Math.max(0, Math.min(100, Number(value) || 0));
    return `<div class="metric"><div class="metricTop"><span>${label}</span><b>${safe}%</b></div><div class="track"><i style="width:${safe}%;background:${color}"></i></div></div>`;
}

function hybridHtml(result, prompt) {
    const metrics = result.metrics || {};
    const terms = (result.top_terms || []).map(term => `<span class="chip">${escapeHtml(term)}</span>`).join('');
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{box-sizing:border-box}html,body{margin:0;background:#020814;font-family:Arial,sans-serif}body{padding:7px;color:#dceeff}.card{max-width:560px;margin:auto;border:1px solid #1477c9;background:linear-gradient(145deg,#061a35,#041020 58%,#020713);box-shadow:0 0 22px #005b9c55,inset 0 0 35px #0a5e9220;padding:15px;border-radius:14px}.eyebrow{font:10px monospace;color:#4fc3ff;letter-spacing:2px}.title{font:bold 22px Arial Black,sans-serif;color:#e9f7ff;margin-top:5px}.title em{font-style:normal;color:#35bfff}.rule{height:1px;background:linear-gradient(90deg,#1383da,transparent);margin:10px 0}.prompt{border-left:3px solid #23b5ff;padding:9px 10px;background:#061a2c;color:#b9dfff;font:12px/1.45 monospace;overflow-wrap:anywhere}.tabs{display:flex;gap:6px;margin:12px 0 9px}.tab{padding:7px 9px;border:1px solid #145f9b;border-radius:7px;color:#7fd7ff;font:bold 10px monospace;background:#071b31}.tab.active{border-color:#3cd0ff;background:#0b3a59;color:white;box-shadow:0 0 10px #149de855}.panel{border:1px solid #123d65;padding:11px;background:#030d1b}.metric{margin:9px 0}.metricTop{display:flex;justify-content:space-between;color:#a9d9fa;font:11px monospace}.metricTop b{color:#50ceff}.track{height:7px;background:#0a2139;border:1px solid #174b74;margin-top:4px}.track i{display:block;height:100%;box-shadow:0 0 8px currentColor}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:10px}.stat{padding:8px;border:1px solid #14466e;background:#06172a}.stat b{display:block;color:#e4f6ff;font:18px monospace}.stat span{color:#669bc1;font:9px monospace}.chip{display:inline-block;margin:4px 4px 0 0;padding:4px 6px;border:1px solid #1a689b;border-radius:12px;color:#9fe2ff;font:10px monospace}.insight{margin-top:11px;color:#b8ddf6;font:12px/1.45 monospace}.warning{margin-top:9px;padding:6px;border:1px solid #805b1d;background:#211b0a;color:#ffd879;font:9px monospace}.footer{margin-top:11px;color:#4e83ad;text-align:center;font:9px monospace}
</style></head><body><div class="card"><div class="eyebrow">SUKUNA HYBRID LAB // NODE + PYTHON</div><div class="title">Idea <em>Analyzer</em></div><div class="rule"></div><div class="prompt">$ python hybrid_lab.py<br>${escapeHtml(prompt || 'empty input')}</div><div class="tabs"><div class="tab active">SIGNAL</div><div class="tab">INSIGHT</div><div class="tab">ARCHITECTURE</div></div><div class="panel">${bar('CREATIVE ENERGY', metrics.energy, '#18c8ff')}${bar('BUILD FOCUS', metrics.focus, '#5d8dff')}<div class="grid"><div class="stat"><b>${escapeHtml(metrics.signal ?? 0)}</b><span>SIGNAL INDEX</span></div><div class="stat"><b>${escapeHtml(metrics.words ?? 0)}</b><span>WORDS</span></div><div class="stat"><b>${escapeHtml(metrics.unique ?? 0)}</b><span>UNIQUE</span></div></div><div class="insight">${escapeHtml(result.insight || 'No insight returned.')}</div>${result.warning ? `<div class="warning">MODE: ${escapeHtml(result.engine || 'fallback')} · Python worker unavailable, card still rendered</div>` : ''}<div>${terms}</div></div><div class="footer">RICH MESSAGE UI · STRUCTURED ANALYSIS · TEMPORARY TEST</div></div></body></html>`;
}

module.exports = {
    name: 'hybrid',
    aliases: ['hybridtest', 'labtest'],
    description: 'Temporary Node + Python rich-message experiment',
    usage: '.hybrid <idea>',
    category: 'expansion',
    async execute({ sock, msg, from, args = [], reply }) {
        const prompt = args.join(' ').trim() || 'Build an interactive AI tool inside WhatsApp';
        try {
            const result = await runPython(prompt);
            await sendRichHtml({ sock, jid: from, quoted: msg, html: hybridHtml(result, prompt) });
        } catch (error) {
            console.error('[HYBRID TEST]', error);
            await reply(`Hybrid test failed: ${error.message}`);
        }
    },
};
