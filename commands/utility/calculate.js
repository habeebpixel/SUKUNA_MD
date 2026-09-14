'use strict';

const crypto = require('crypto');
const { sendRichHtml, escapeHtml } = require('../../utils/genaiRich');

const CALCULATOR_SESSIONS = new Map();
const FUNCTIONS = {
    sin: (value, state) => state.inverse ? Math.asin(value) : Math.sin(state.angleMode === 'RAD' ? value : value * Math.PI / 180),
    cos: (value, state) => state.inverse ? Math.acos(value) : Math.cos(state.angleMode === 'RAD' ? value : value * Math.PI / 180),
    tan: (value, state) => state.inverse ? Math.atan(value) : Math.tan(state.angleMode === 'RAD' ? value : value * Math.PI / 180),
    log: value => Math.log10(value), ln: value => Math.log(value), sqrt: value => Math.sqrt(value), cbrt: value => Math.cbrt(value), abs: value => Math.abs(value),
};

function factorial(value) {
    if (!Number.isInteger(value) || value < 0 || value > 170) throw new Error('Factorial requires an integer from 0 to 170');
    let answer = 1; for (let n = 2; n <= value; n++) answer *= n; return answer;
}
function tokenize(input) {
    const tokens = []; let index = 0;
    while (index < input.length) {
        if (/\s/.test(input[index])) { index++; continue; }
        const rest = input.slice(index);
        const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
        if (number) { tokens.push({ type: 'number', value: Number(number[0]) }); index += number[0].length; continue; }
        const name = rest.match(/^[a-z]+/i);
        if (name) { tokens.push({ type: 'name', value: name[0].toLowerCase() }); index += name[0].length; continue; }
        const operator = rest.match(/^(\*\*|[+\-*/%(),!])/);
        if (operator) { tokens.push({ type: operator[0], value: operator[0] }); index += operator[0].length; continue; }
        throw new Error('Unsupported character');
    }
    tokens.push({ type: 'eof', value: null }); return tokens;
}
function evaluateExpression(input, state = {}) {
    const expression = String(input || '').trim();
    if (!expression || expression.length > 240) throw new Error('Expression is empty or too long');
    const tokens = tokenize(expression); let position = 0;
    const peek = () => tokens[position];
    const take = type => { if (peek().type !== type) throw new Error(`Expected ${type}`); return tokens[position++]; };
    const finite = value => { if (!Number.isFinite(value)) throw new Error('Result is not finite'); return value; };
    const calcState = { angleMode: state.angleMode || 'DEG', inverse: Boolean(state.inverse) };
    function primary() {
        if (peek().type === 'number') return take('number').value;
        if (peek().type === 'name') {
            const name = take('name').value;
            if (name === 'pi') return Math.PI; if (name === 'e') return Math.E; if (name === 'ans') return Number(state.lastAnswer || 0);
            if (!FUNCTIONS[name]) throw new Error(`Unknown function: ${name}`);
            take('('); const argument = addSub(); take(')'); let result = FUNCTIONS[name](argument, calcState);
            if (calcState.inverse && ['sin', 'cos', 'tan'].includes(name) && calcState.angleMode !== 'RAD') result *= 180 / Math.PI;
            return finite(result);
        }
        if (peek().type === '(') { take('('); const result = addSub(); take(')'); return result; }
        throw new Error('Expected a number');
    }
    function unary() { if (peek().type === '+') { take('+'); return unary(); } if (peek().type === '-') { take('-'); return -unary(); } return primary(); }
    function power() { const left = unary(); if (peek().type !== '**') return left; take('**'); return finite(left ** power()); }
    function postfix() { let value = power(); while (peek().type === '!') { take('!'); value = factorial(value); } return finite(value); }
    function multiply() { let value = postfix(); while (['*', '/', '%'].includes(peek().type)) { const op = take(peek().type).type; const right = postfix(); if ((op === '/' || op === '%') && right === 0) throw new Error('Division by zero'); value = op === '*' ? value * right : op === '/' ? value / right : value % right; finite(value); } return value; }
    function addSub() { let value = multiply(); while (['+', '-'].includes(peek().type)) { const op = take(peek().type).type; const right = multiply(); value = op === '+' ? value + right : value - right; finite(value); } return value; }
    const result = finite(addSub()); if (peek().type !== 'eof') throw new Error('Incomplete expression'); return result;
}
function formatResult(value) {
    if (value == null || value === '') return '—'; if (Object.is(value, -0)) return '0';
    return Number.isInteger(value) ? value.toLocaleString('en-US') : value.toLocaleString('en-US', { maximumSignificantDigits: 12 });
}
function createCalculatorSession() {
    const session = { id: crypto.randomUUID(), expression: '', result: null, error: '', angleMode: 'DEG', inverse: false, memory: 0, lastAnswer: null };
    CALCULATOR_SESSIONS.set(session.id, session); setTimeout(() => CALCULATOR_SESSIONS.delete(session.id), 30 * 60 * 1000).unref?.(); return session;
}
function applyAction(session, key) {
    session.error = '';
    if (key === 'AC') { session.expression = ''; session.result = null; return; }
    if (key === 'DEL') { session.expression = session.expression.slice(0, -1); session.result = null; return; }
    if (key === 'DEG' || key === 'RAD') { session.angleMode = key; return; }
    if (key === 'INV') { session.inverse = !session.inverse; return; }
    if (key === 'MC') { session.memory = 0; return; }
    if (key === 'MR') { session.expression += String(session.memory); return; }
    if (key === 'M+' || key === 'M-') { const value = session.result ?? evaluateExpression(session.expression || '0', session); session.memory += key === 'M+' ? value : -value; return; }
    if (key === '=') { try { session.result = evaluateExpression(session.expression, session); session.lastAnswer = session.result; } catch (error) { session.result = null; session.error = error.message; } return; }
    if (key === 'ANS') session.expression += String(session.lastAnswer ?? 0);
    else if (key === 'negate') session.expression = session.expression ? `-(${session.expression})` : '-';
    else if (key === 'reciprocal') session.expression = session.expression ? `1/(${session.expression})` : '1/('; else session.expression += key;
    session.result = null;
}
function clientScript(session) {
    return `(function(){'use strict';var exp=${JSON.stringify(session.expression)},ans=${JSON.stringify(session.lastAnswer)},memory=${JSON.stringify(session.memory)},angle=${JSON.stringify(session.angleMode)},inverse=${JSON.stringify(session.inverse)},history=[];var E=document.getElementById('expression'),A=document.getElementById('answer'),S=document.getElementById('status'),B=document.getElementById('badge'),H=document.getElementById('history');function fmt(v){if(!Number.isFinite(v))throw Error('Result is outside the supported range');if(Math.abs(v)<1e-14)v=0;return Number(v.toPrecision(12)).toString()}function fact(v){if(!Number.isInteger(v)||v<0||v>170)throw Error('Factorial requires an integer from 0 to 170');var r=1;for(var i=2;i<=v;i++)r*=i;return r}function toks(x){var out=[],i=0;while(i<x.length){if(/\\s/.test(x[i])){i++;continue}var r=x.slice(i),n=r.match(/^(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[+-]?\\d+)?/i);if(n){out.push({t:'n',v:Number(n[0])});i+=n[0].length;continue}var w=r.match(/^[a-z]+/i);if(w){out.push({t:'w',v:w[0].toLowerCase()});i+=w[0].length;continue}var o=r.match(/^(\\*\\*|[+\\-*/%(),!])/);if(o){out.push({t:o[0],v:o[0]});i+=o[0].length;continue}throw Error('Unsupported character')}out.push({t:'e'});return out}function evaluate(x){var t=toks(x),i=0,p=function(){return t[i]},take=function(k){if(p().t!==k)throw Error('Incomplete expression');return t[i++]},finite=function(v){if(!Number.isFinite(v))throw Error('Invalid result');return v};function primary(){if(p().t==='n')return take('n').v;if(p().t==='w'){var n=take('w').v;if(n==='pi')return Math.PI;if(n==='e')return Math.E;if(n==='ans')return Number(ans||0);take('(');var q=add();take(')');var inv=inverse&&['sin','cos','tan'].indexOf(n)>=0;var v=n==='sin'?(inv?Math.asin(q):Math.sin(angle==='RAD'?q:q*Math.PI/180)):n==='cos'?(inv?Math.acos(q):Math.cos(angle==='RAD'?q:q*Math.PI/180)):n==='tan'?(inv?Math.atan(q):Math.tan(angle==='RAD'?q:q*Math.PI/180)):n==='log'?Math.log10(q):n==='ln'?Math.log(q):n==='sqrt'?Math.sqrt(q):n==='cbrt'?Math.cbrt(q):n==='abs'?Math.abs(q):NaN;if(inv&&angle==='DEG')v=v*180/Math.PI;return finite(v)}if(p().t==='('){take('(');var z=add();take(')');return z}throw Error('Expected a number')}function unary(){if(p().t==='+'){take('+');return unary()}if(p().t==='-'){take('-');return -unary()}return primary()}function power(){var v=unary();if(p().t==='**'){take('**');v=v**power()}return finite(v)}function post(){var v=power();while(p().t==='!' ){take('!');v=fact(v)}return finite(v)}function mul(){var v=post();while(['*','/','%'].indexOf(p().t)>=0){var o=take(p().t).t,r=post();if((o==='/'||o==='%')&&r===0)throw Error('Division by zero');v=o==='*'?v*r:o==='/'?v/r:v%r}return finite(v)}function add(){var v=mul();while(p().t==='+'||p().t==='-'){var o=take(p().t).t,r=mul();v=o==='+'?v+r:v-r}return finite(v)}var result=finite(add());if(p().t!=='e')throw Error('Incomplete expression');return result}function display(){E.textContent=exp||'0';B.textContent=angle+(inverse?' · INV':'');S.textContent=angle+' · M: '+fmt(memory)+' · ANS: '+fmt(ans||0)+(inverse?' · INV':'');H.innerHTML=history.length?history.slice(-5).reverse().join('<br>'):'History: no calculations yet';if(exp){try{A.textContent=fmt(evaluate(exp))}catch(_){A.textContent='—'}}else A.textContent=ans==null?'0':fmt(ans)}function press(k){if(k==='AC')exp='';else if(k==='DEL')exp=exp.slice(0,-1);else if(k==='DEG'||k==='RAD')angle=k;else if(k==='INV')inverse=!inverse;else if(k==='MC')memory=0;else if(k==='MR')exp+=String(memory);else if(k==='M+'||k==='M-'){memory+=k==='M+'?Number(evaluate(exp||'0')):-Number(evaluate(exp||'0'))}else if(k==='='){var v=evaluate(exp);ans=v;history.push('<b>'+exp.replace(/</g,'&lt;')+' = '+fmt(v)+'</b>')}else if(k==='ANS')exp+=String(ans||0);else if(k==='negate')exp=exp?'-('+exp+')':'-';else if(k==='reciprocal')exp=exp?'1/('+exp+')':'1/(';else exp+=k;display()}document.querySelectorAll('[data-key]').forEach(function(b){b.onclick=function(){try{press(b.getAttribute('data-key'))}catch(e){A.textContent='Error';S.textContent=e.message}}});document.getElementById('angle').onclick=function(){press(angle==='DEG'?'RAD':'DEG')};document.getElementById('inverse').onclick=function(){press('INV')};display()})()`;
}
function calculatorHtml(session) {
    const expression = escapeHtml(session.expression || '0'); const result = escapeHtml(formatResult(session.result)); const error = session.error ? `<div class="error">⚠ ${escapeHtml(session.error)}</div>` : '';
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>*{box-sizing:border-box}html,body{margin:0;background:transparent;font-family:Arial,sans-serif}body{padding:6px;background:radial-gradient(circle at 50% 0,#071d4a,#020817 72%)}button{font:inherit}.card{width:100%;max-width:470px;margin:auto;padding:12px;border:1px solid #245aa8;border-radius:20px;background:linear-gradient(145deg,#07152f,#0b2b55 55%,#030b20);color:#e8f8ff;box-shadow:inset 0 0 0 1px #123d82,0 10px 28px #0009}.header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.title{color:#e5efff;font:bold clamp(17px,5vw,22px) Arial Black,Arial,sans-serif;letter-spacing:.6px;line-height:1.05}.sub{margin-top:3px;color:#6ca8dc;font:10px monospace}.badge{padding:5px 8px;border:1px solid #2d75d6;border-radius:999px;color:#c7e3ff;background:#071e45;font:bold 9px monospace}.screen{min-height:112px;margin-bottom:9px;padding:11px 12px;border:1px solid #b43855;border-radius:14px;background:#020817;box-shadow:inset 0 0 24px #071c4a;overflow:hidden}.expression{min-height:27px;color:#8fc4ff;text-align:right;font:14px/1.35 monospace;overflow-wrap:anywhere}.answer{min-height:48px;display:flex;align-items:center;justify-content:flex-end;color:#eef5ff;text-align:right;font:bold clamp(27px,8vw,36px)/1.1 Arial,sans-serif;overflow-wrap:anywhere}.status{min-height:15px;margin-top:3px;color:#75bfff;font:10px monospace;overflow-wrap:anywhere}.error{margin-top:8px;padding:8px;border:1px solid #ff4268;border-radius:8px;background:#3c1027;color:#ffd9e4;font:10px monospace}.topbar,.memory{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:7px}.memory{grid-template-columns:repeat(4,1fr)}.topbar button,.memory button{min-height:34px;border:1px solid #2f76d2;border-radius:8px;color:#bdefff;background:#092552;font:bold 11px monospace;cursor:pointer;touch-action:manipulation}.memory button{border-color:#2d5fc0;color:#cfe3ff;background:#071735}.active{border-color:#63d9ff!important;background:#0e5875!important;color:#fff!important}.keys{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}.keys button{min-width:0;min-height:45px;padding:5px 2px;border:1px solid #286bc1;border-radius:10px;color:#e8f2ff;background:linear-gradient(#164f9b,#09245a);font:bold 13px Arial,sans-serif;cursor:pointer;touch-action:manipulation}.keys button.fn{border-color:#327bd4;color:#d7eaff;background:linear-gradient(#164b8f,#081f52)}.keys button.op{border-color:#b23b57;color:#ffe0e8;background:linear-gradient(#79243e,#3b1026)}.keys button.clear{border-color:#c02e4d;color:#ffe0e8;background:linear-gradient(#8e2038,#421021)}.keys button.equal{border-color:#42b8ff;color:#eff8ff;background:linear-gradient(#176fd0,#0b2c70);box-shadow:0 0 8px #1c91ff}.keys button:active,.topbar button:active,.memory button:active{transform:scale(.94)}.history{margin-top:9px;padding:7px;border:1px solid #24528d;border-radius:8px;background:#03091d;color:#8cbcf2;font:10px monospace;max-height:70px;overflow:auto}.hint{margin:8px 0 0;color:#6e9dd5;text-align:center;font:10px monospace}</style></head><body><div class="card" id="calculator"><div class="header"><div><div class="title">SCIENTIFIC CALCULATOR</div><div class="sub">PRECISION MATH CONSOLE · LIVE CARD STATE</div></div><div class="badge" id="badge">${session.angleMode}${session.inverse ? ' · INV' : ''}</div></div><div class="screen"><div class="expression" id="expression">${expression}</div><div class="answer" id="answer">${result}</div><div class="status" id="status">${session.angleMode} · M: ${formatResult(session.memory)} · ANS: ${formatResult(session.lastAnswer)}</div>${error}</div><div class="topbar"><button id="angle" class="active">${session.angleMode}</button><button id="inverse">INV ${session.inverse ? 'ON' : 'OFF'}</button><button data-key="ANS">ANS</button></div><div class="memory"><button data-key="MC">MC</button><button data-key="MR">MR</button><button data-key="M+">M+</button><button data-key="M-">M−</button></div><div class="keys"><button class="clear" data-key="AC">AC</button><button class="clear" data-key="DEL">DEL</button><button class="fn" data-key="(">(</button><button class="fn" data-key=")">)</button><button class="op" data-key="/">÷</button><button class="fn" data-key="sin(">sin</button><button class="fn" data-key="cos(">cos</button><button class="fn" data-key="tan(">tan</button><button class="fn" data-key="log(">log</button><button class="fn" data-key="ln(">ln</button><button class="fn" data-key="pi">π</button><button class="fn" data-key="e">e</button><button class="fn" data-key="sqrt(">√</button><button class="fn" data-key="**2">x²</button><button class="fn" data-key="**">xʸ</button><button class="fn" data-key="!">x!</button><button class="fn" data-key="%">%</button><button class="fn" data-key="reciprocal">1/x</button><button class="fn" data-key="cbrt(">∛x</button><button class="fn" data-key="10**">10ˣ</button><button data-key="7">7</button><button data-key="8">8</button><button data-key="9">9</button><button class="op" data-key="*">×</button><button class="fn" data-key="e">EXP</button><button data-key="4">4</button><button data-key="5">5</button><button data-key="6">6</button><button class="op" data-key="-">−</button><button class="fn" data-key="negate">±</button><button data-key="1">1</button><button data-key="2">2</button><button data-key="3">3</button><button class="op" data-key="+">+</button><button class="equal" data-key="=">=</button><button class="fn" data-key="abs(">|x|</button><button data-key="0">0</button><button data-key=".">.</button><button class="fn" data-key="ANS*">Ans×</button></div><div class="history" id="history">History: no calculations yet</div><div class="hint">Tap any visible control — the calculator updates inside this card.</div></div><script>${clientScript(session)}</script></body></html>`;
}
async function sendCalculatorCard({ sock, jid, quoted, session }) { return sendRichHtml({ sock, jid, quoted, html: calculatorHtml(session) }); }
async function handleCalculatorButton(buttonId, { sock, msg, from }) {
    const match = String(buttonId || '').match(/^calc:([^:]+):(.+)$/); if (!match) return false;
    const session = CALCULATOR_SESSIONS.get(match[1]); if (!session) { await sock.sendMessage(from, { text: '❌ Calculator session expired. Run `.calc` again.' }, { quoted: msg }); return true; }
    applyAction(session, decodeURIComponent(match[2])); await sendCalculatorCard({ sock, jid: from, quoted: msg, session }); return true;
}
module.exports = { name: 'calc', aliases: ['calculate', 'math'], description: 'Single-card scientific GenAI calculator', category: 'utility', evaluateExpression, formatResult, createCalculatorSession, handleCalculatorButton, calculatorHtml, async execute({ sock, msg, from, reply, args }) { const expression = args.join(' ').trim(); const session = createCalculatorSession(); if (expression) { session.expression = expression; applyAction(session, '='); } try { await sendCalculatorCard({ sock, jid: from, quoted: msg, session }); } catch (error) { await reply(`❌ Calculator failed: ${error.message}`); } } };
