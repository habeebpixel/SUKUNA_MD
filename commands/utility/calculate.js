'use strict';

const crypto = require('crypto');
const { generateWAMessageFromContent, proto } = require('@pasqua-baileys/baileys');
const { sendRichHtml, escapeHtml } = require('../../utils/genaiRich');

const CALCULATOR_SESSIONS = new Map();
const ACTIONS = [
    ['DEG', 'DEG'], ['INV', 'INV'], ['ANS', 'ANS'],
    ['MC', 'MC'], ['MR', 'MR'], ['M+', 'M+'], ['M−', 'M-'],
    ['AC', 'AC'], ['DEL', 'DEL'], ['(', '('], [')', ')'], ['÷', '/'],
    ['sin', 'sin('], ['cos', 'cos('], ['tan', 'tan('], ['log', 'log('], ['ln', 'ln('],
    ['π', 'pi'], ['e', 'e'], ['√', 'sqrt('], ['x²', '**2'], ['xʸ', '**'],
    ['x!', '!'], ['%', '%'], ['1/x', 'reciprocal'], ['∛x', 'cbrt('], ['10ˣ', '10**'],
    ['7', '7'], ['8', '8'], ['9', '9'], ['×', '*'], ['EXP', 'e'],
    ['4', '4'], ['5', '5'], ['6', '6'], ['−', '-'], ['±', 'negate'],
    ['1', '1'], ['2', '2'], ['3', '3'], ['+', '+'], ['=', '='],
    ['|x|', 'abs('], ['0', '0'], ['.', '.'], ['Ans×', 'ANS*'],
];

const FUNCTIONS = {
    sin: (value, state) => state.inverse ? Math.asin(value) : Math.sin(toRadians(value, state)),
    cos: (value, state) => state.inverse ? Math.acos(value) : Math.cos(toRadians(value, state)),
    tan: (value, state) => state.inverse ? Math.atan(value) : Math.tan(toRadians(value, state)),
    log: value => Math.log10(value),
    ln: value => Math.log(value),
    sqrt: value => Math.sqrt(value),
    cbrt: value => Math.cbrt(value),
    abs: value => Math.abs(value),
};

function toRadians(value, state) {
    return state.angleMode === 'RAD' ? value : value * Math.PI / 180;
}
function fromRadians(value, state) {
    return state.angleMode === 'RAD' ? value : value * 180 / Math.PI;
}

function calculatorQuickReply(displayText, id) {
    return { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: displayText, id }) };
}

function createCalculatorSession() {
    const session = {
        id: crypto.randomUUID(), expression: '', result: null, error: '',
        angleMode: 'DEG', inverse: false, memory: 0, lastAnswer: null,
    };
    CALCULATOR_SESSIONS.set(session.id, session);
    setTimeout(() => CALCULATOR_SESSIONS.delete(session.id), 30 * 60 * 1000).unref?.();
    return session;
}

function tokenize(input) {
    const tokens = [];
    let index = 0;
    while (index < input.length) {
        if (/\s/.test(input[index])) { index++; continue; }
        const rest = input.slice(index);
        const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
        if (number) { tokens.push({ type: 'number', value: Number(number[0]) }); index += number[0].length; continue; }
        const name = rest.match(/^[a-z]+/i);
        if (name) { tokens.push({ type: 'name', value: name[0].toLowerCase() }); index += name[0].length; continue; }
        const operator = rest.match(/^(\*\*|[+\-*/%(),!])/);
        if (operator) { tokens.push({ type: operator[0], value: operator[0] }); index += operator[0].length; continue; }
        throw new Error(`Unexpected character at position ${index + 1}`);
    }
    tokens.push({ type: 'eof', value: null });
    return tokens;
}

function factorial(value) {
    if (!Number.isInteger(value) || value < 0 || value > 170) throw new Error('Factorial requires an integer from 0 to 170');
    let answer = 1;
    for (let n = 2; n <= value; n++) answer *= n;
    return answer;
}

function evaluateExpression(input, state = {}) {
    const expression = String(input || '').trim();
    if (!expression || expression.length > 240) throw new Error('Expression is empty or too long');
    const calcState = { angleMode: state.angleMode || 'DEG', inverse: Boolean(state.inverse) };
    const tokens = tokenize(expression);
    let position = 0;
    const peek = () => tokens[position];
    const take = type => { if (peek().type !== type) throw new Error(`Expected ${type}`); return tokens[position++]; };
    const finite = value => { if (!Number.isFinite(value)) throw new Error('Result is not finite'); return value; };

    function primary() {
        if (peek().type === 'number') return take('number').value;
        if (peek().type === 'name') {
            const name = take('name').value;
            if (name === 'pi') return Math.PI;
            if (name === 'e') return Math.E;
            if (name === 'ans') return Number(state.lastAnswer || 0);
            if (!FUNCTIONS[name]) throw new Error(`Unknown function: ${name}`);
            take('(');
            const argument = addSub();
            take(')');
            const value = calcState.inverse && ['sin', 'cos', 'tan'].includes(name)
                ? fromRadians(FUNCTIONS[name](argument, calcState), calcState)
                : FUNCTIONS[name](argument, calcState);
            return finite(value);
        }
        if (peek().type === '(') { take('('); const value = addSub(); take(')'); return value; }
        throw new Error('Expected a number');
    }
    function unary() {
        if (peek().type === '+') { take('+'); return unary(); }
        if (peek().type === '-') { take('-'); return -unary(); }
        return primary();
    }
    function power() {
        const left = unary();
        if (peek().type !== '**') return left;
        take('**');
        return finite(left ** power());
    }
    function postfix() {
        let value = power();
        while (peek().type === '!') { take('!'); value = factorial(value); }
        return finite(value);
    }
    function multiply() {
        let value = postfix();
        while (['*', '/', '%'].includes(peek().type)) {
            const operator = take(peek().type).type;
            const right = postfix();
            if ((operator === '/' || operator === '%') && right === 0) throw new Error('Division by zero');
            value = operator === '*' ? value * right : operator === '/' ? value / right : value % right;
            finite(value);
        }
        return value;
    }
    function addSub() {
        let value = multiply();
        while (['+', '-'].includes(peek().type)) {
            const operator = take(peek().type).type;
            const right = multiply();
            value = operator === '+' ? value + right : value - right;
            finite(value);
        }
        return value;
    }
    const result = finite(addSub());
    if (peek().type !== 'eof') throw new Error('Unexpected input after expression');
    return result;
}

function formatResult(value) {
    if (value == null || value === '') return '—';
    if (Object.is(value, -0)) return '0';
    return Number.isInteger(value) ? value.toLocaleString('en-US') : value.toLocaleString('en-US', { maximumSignificantDigits: 12 });
}

function appendKey(session, key) {
    if (key === 'ANS') session.expression += formatResult(session.lastAnswer).replace(/,/g, '');
    else if (key === 'negate') session.expression = session.expression ? `-(${session.expression})` : '-';
    else if (key === 'reciprocal') session.expression = session.expression ? `1/(${session.expression})` : '1/(';
    else session.expression += key;
    session.result = null;
}

function applyAction(session, key) {
    session.error = '';
    if (key === 'AC') { session.expression = ''; session.result = null; return; }
    if (key === 'DEL') { session.expression = session.expression.slice(0, -1); session.result = null; return; }
    if (key === 'DEG' || key === 'RAD') { session.angleMode = key; return; }
    if (key === 'INV') { session.inverse = !session.inverse; return; }
    if (key === 'MC') { session.memory = 0; return; }
    if (key === 'MR') { appendKey(session, String(session.memory)); return; }
    if (key === 'M+' || key === 'M-') {
        const value = session.result ?? (session.expression ? evaluateExpression(session.expression, session) : 0);
        session.memory = key === 'M+' ? session.memory + value : session.memory - value;
        return;
    }
    if (key === '=') {
        try {
            session.result = evaluateExpression(session.expression, session);
            session.lastAnswer = session.result;
        } catch (error) {
            session.result = null;
            session.error = error.message;
        }
        return;
    }
    appendKey(session, key);
}

async function sendCalculatorCard({ sock, jid, quoted, session, includeNative = true }) {
    const html = calculatorHtml(session);
    await sendRichHtml({ sock, jid, quoted, html });
    if (!includeNative) return;
    const buttons = ACTIONS.map(([label, key]) => calculatorQuickReply(label, `calc:${session.id}:${encodeURIComponent(key)}`));
    const message = {
        body: { text: `SCIENTIFIC CALCULATOR\n${session.expression || '—'} = ${formatResult(session.result)}\nMode: ${session.angleMode}${session.inverse ? ' · INV' : ''}` },
        footer: { text: 'SUKUNA MD · Scientific calculator controls' },
        header: { title: 'SCIENTIFIC CALCULATOR', hasMediaAttachment: false },
        nativeFlowMessage: { buttons, messageParamsJson: '' },
    };
    const wrapped = generateWAMessageFromContent(jid, { viewOnceMessage: { message: {
        messageContextInfo: { deviceListMetadataVersion: 2, deviceListMetadata: {} },
        interactiveMessage: proto.Message.InteractiveMessage.fromObject(message),
    } } }, { userJid: sock.user?.id, quoted: quoted?.message ? quoted : undefined });
    await sock.relayMessage(jid, wrapped.message, { messageId: wrapped.key.id });
}

async function handleCalculatorButton(buttonId, { sock, msg, from }) {
    const match = String(buttonId || '').match(/^calc:([^:]+):(.+)$/);
    if (!match) return false;
    const session = CALCULATOR_SESSIONS.get(match[1]);
    if (!session) { await sock.sendMessage(from, { text: '❌ This scientific calculator session expired. Run `.calc` again.' }, { quoted: msg }); return true; }
    applyAction(session, decodeURIComponent(match[2]));
    await sendCalculatorCard({ sock, jid: from, quoted: msg, session, includeNative: false });
    return true;
}

function calculatorHtml(session) {
    const expression = escapeHtml(session.expression || '—');
    const result = escapeHtml(formatResult(session.result));
    const error = session.error ? `<div class="error">⚠ ${escapeHtml(session.error)}</div>` : '';
    const buttons = ACTIONS.map(([label, key]) => `<button class="key ${['+','-','*','/','%','**','!','='].includes(key) ? 'op' : ''} ${['AC','DEL'].includes(key) ? 'danger' : ''}" data-key="${escapeHtml(key)}">${escapeHtml(label)}</button>`).join('');
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{box-sizing:border-box}html,body{margin:0;background:#030910;font-family:Arial,sans-serif}body{padding:6px;color:#e9f8ff}.calc{max-width:580px;margin:auto;padding:14px;border:2px solid #28b8ff;border-radius:22px;background:linear-gradient(145deg,#06172a,#06334d 50%,#020914);box-shadow:0 0 28px #00aaff66,inset 0 0 22px #17aee522}.heading{display:flex;justify-content:space-between;align-items:start}.title{font:bold 22px Arial Black,sans-serif;letter-spacing:1px}.title b{color:#50ddff}.sub{margin-top:4px;color:#7ccff3;font:10px monospace;letter-spacing:1px}.mode{padding:7px 9px;border:1px solid #43d5ff;border-radius:18px;color:#a9edff;font:bold 10px monospace}.screen{margin-top:13px;padding:12px;border:2px solid #1cd3a7;border-radius:18px;background:linear-gradient(#01171a,#031314);box-shadow:inset 0 0 20px #00b87c33}.screen .expr{min-height:21px;color:#79d9ce;text-align:right;font:14px monospace;overflow-wrap:anywhere}.screen .ans{margin-top:7px;color:#effff9;text-align:right;font:bold 30px monospace;overflow-wrap:anywhere;text-shadow:0 0 10px #b1ffdf}.screen .meta{margin-top:8px;color:#61bb9d;font:10px monospace}.error{margin-top:8px;padding:7px;color:#ffd0d9;background:#441827;border:1px solid #ff6680;border-radius:8px;font:11px monospace}.keys{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:12px}.key{min-height:40px;border:1px solid #2e9ac5;border-radius:10px;background:linear-gradient(180deg,#135d78,#0a2d48);color:#effbff;font:bold 11px monospace;box-shadow:inset 0 0 8px #3acfff22,0 0 6px #008cff22}.key:active{transform:scale(.95);filter:brightness(1.35)}.key.op{background:linear-gradient(180deg,#7b5d20,#3e2b0b);border-color:#e2ae42;color:#fff4c5}.key.danger{background:linear-gradient(180deg,#8b323f,#491722);border-color:#ff687d}.key[data-key="="]{background:linear-gradient(180deg,#22b97a,#087044);border-color:#65ffc0}.legend{margin-top:10px;text-align:center;color:#5b9fbe;font:9px monospace}.footer{margin-top:8px;text-align:center;color:#4b87a7;font:9px monospace}
</style></head><body><div class="calc"><div class="heading"><div><div class="title">SCIENTIFIC <b>CALCULATOR</b></div><div class="sub">GENAI PRECISION CONSOLE · BACKEND SYNC</div></div><div class="mode">${session.angleMode}${session.inverse ? ' · INV' : ''}</div></div><div class="screen"><div class="expr">${expression}</div><div class="ans">${result}</div><div class="meta">${session.angleMode} · M: ${formatResult(session.memory)} · ANS: ${formatResult(session.lastAnswer)}</div>${error}</div><div class="keys">${buttons}</div><div class="legend">Tap a rich key for instant preview · native action controls confirm backend state</div><div class="footer">SUKUNA MD · SCIENTIFIC GENAI CALCULATOR</div></div><script>(function(){var exp=${JSON.stringify(session.expression)},last=${JSON.stringify(session.lastAnswer)},mode=${JSON.stringify(session.angleMode)},inv=${JSON.stringify(session.inverse)};function render(){var e=document.querySelector('.expr');if(e)e.textContent=exp||'—';document.querySelectorAll('[data-key]').forEach(function(b){b.onclick=function(){var k=b.getAttribute('data-key');if(k==='AC')exp='';else if(k==='DEL')exp=exp.slice(0,-1);else if(k==='DEG'||k==='RAD')mode=k;else if(k==='INV')inv=!inv;else if(k==='='){try{last=preview(exp)}catch(_){last='ERR'}}else if(k==='ANS')exp+=String(last||0);else if(k==='negate')exp=exp?'-('+exp+')':'-';else if(k==='reciprocal')exp=exp?'1/('+exp+')':'1/(';else exp+=k;render();var a=document.querySelector('.ans');if(a)a.textContent=k==='='?String(last):'—';var m=document.querySelector('.mode');if(m)m.textContent=mode+(inv?' · INV':'')}})}function preview(s){var x=s.replace(/pi/g,String(Math.PI)).replace(/\bans\b/gi,String(last||0)).replace(/sqrt\(/g,'Math.sqrt(').replace(/cbrt\(/g,'Math.cbrt(').replace(/sin\(/g,'Math.sin(').replace(/cos\(/g,'Math.cos(').replace(/tan\(/g,'Math.tan(').replace(/log\(/g,'Math.log10(').replace(/ln\(/g,'Math.log(').replace(/\^/g,'**');if(!/^[0-9+\-*/%()., a-z*]+$/i.test(x)||/[a-z]/i.test(x.replace(/Math\./g,'')))throw 0;return Function('return ('+x+')')()}render()})();</script></body></html>`;
}

module.exports = {
    name: 'calc', aliases: ['calculate', 'math'], description: 'Scientific calculator with synchronized GenAI rich card', category: 'utility',
    evaluateExpression, formatResult, createCalculatorSession, handleCalculatorButton, calculatorHtml,
    async execute({ sock, msg, from, reply, args }) {
        const expression = args.join(' ').trim();
        const session = createCalculatorSession();
        if (expression) { session.expression = expression; applyAction(session, '='); }
        try { await sendCalculatorCard({ sock, jid: from, quoted: msg, session, includeNative: !expression }); }
        catch (error) { await reply(`❌ Calculator failed: ${error.message}`); }
    },
};
