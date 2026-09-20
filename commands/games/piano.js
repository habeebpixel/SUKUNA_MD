'use strict';

const { sendRichHtml } = require('../../utils/genaiRich');

function pianoHtml() {
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><title>Piano</title><style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:manipulation}
html,body{margin:0;padding:0;width:100%;background:transparent;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif}
body{padding:8px;background:#f0f2f5}
.wrap{max-width:640px;margin:0 auto}

/* ── CARD ── */
.card{background:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.14),0 2px 8px rgba(0,0,0,.08)}

/* ── HEADER ── */
.header{
  background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);
  padding:14px 18px;
  display:flex;align-items:center;justify-content:space-between
}
.brand{display:flex;align-items:center;gap:11px}
.logo-box{
  width:46px;height:46px;border-radius:14px;
  background:linear-gradient(145deg,#e2e8ff,#c7d0f7);
  display:flex;align-items:center;justify-content:center;
  font-size:24px;
  box-shadow:0 4px 12px rgba(0,0,0,.3),inset 0 1px rgba(255,255,255,.5)
}
.brand-text{}
.brand-top{font-size:9px;letter-spacing:2.5px;color:rgba(255,255,255,.45);margin-bottom:3px}
.brand-name{font-size:20px;font-weight:900;color:#fff;letter-spacing:.5px}
.octave-block{text-align:right}
.oct-label{font-size:8px;letter-spacing:2px;color:rgba(255,255,255,.4);margin-bottom:5px}
.oct-row{display:flex;align-items:center;gap:7px}
.oct-btn{
  width:28px;height:28px;border:none;border-radius:8px;
  background:rgba(255,255,255,.12);color:#fff;font-size:14px;font-weight:900;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 2px 6px rgba(0,0,0,.25)
}
.oct-btn:active{background:rgba(255,255,255,.25);transform:scale(.92)}
.oct-val{font-size:22px;font-weight:900;color:#fff;min-width:20px;text-align:center}

/* ── NOTE DISPLAY ── */
.note-display{
  background:#f8f9fc;
  padding:10px 18px;
  display:flex;align-items:center;justify-content:space-between;
  border-bottom:1px solid #eaecf0
}
.note-label{font-size:9px;letter-spacing:2px;color:#9aa3b2;font-weight:700}
.note-value{font-size:28px;font-weight:900;color:#1a1a2e;letter-spacing:1px;min-width:80px;text-align:right}
.note-freq{font-size:11px;color:#9aa3b2;font-weight:600;text-align:right}

/* ── PIANO BODY ── */
.piano-wrap{padding:16px 14px}
.piano{
  position:relative;
  height:200px;
  background:linear-gradient(180deg,#2c2c3e 0%,#1a1a28 100%);
  border-radius:18px;
  padding:12px 10px 10px;
  box-shadow:
    0 6px 24px rgba(0,0,0,.35),
    inset 0 1px rgba(255,255,255,.1),
    inset 0 -2px 0 rgba(0,0,0,.3)
}
.keys-row{
  position:relative;
  display:flex;
  height:100%;
  gap:3px
}

/* ── WHITE KEYS ── */
.wkey{
  flex:1;
  height:100%;
  border:none;border-radius:0 0 10px 10px;
  background:linear-gradient(180deg,#fdfdfd 0%,#f0f0f0 100%);
  box-shadow:
    0 4px 0 #c8c8c8,
    0 6px 10px rgba(0,0,0,.4),
    inset 0 -3px 6px rgba(0,0,0,.08);
  display:flex;flex-direction:column;justify-content:flex-end;align-items:center;
  padding-bottom:10px;
  position:relative;z-index:1;
  color:#888;font-size:10px;font-weight:800;letter-spacing:.5px
}
.wkey:active,.wkey.lit{
  background:linear-gradient(180deg,#dce4ff 0%,#b8c8ff 100%);
  box-shadow:0 2px 0 #8899dd,0 3px 6px rgba(0,0,0,.3),inset 0 2px 4px rgba(0,0,0,.15);
  transform:translateY(3px)
}
.wkey .note-name{
  font-size:10px;font-weight:900;color:#aab;
  text-transform:uppercase;letter-spacing:.5px
}
.wkey.lit .note-name{color:#4455cc}

/* ── BLACK KEYS ── */
.bkey{
  position:absolute;
  top:12px;z-index:4;
  width:8.5%;height:58%;
  border:none;border-radius:0 0 7px 7px;
  background:linear-gradient(90deg,#1a1a1a 0%,#3a3a3a 45%,#111 100%);
  box-shadow:
    3px 6px 10px rgba(0,0,0,.7),
    inset 2px 0 rgba(255,255,255,.1),
    inset -1px 0 rgba(0,0,0,.5);
  display:flex;align-items:flex-end;justify-content:center;
  padding-bottom:6px;
  color:#777;font-size:8px;font-weight:800
}
.bkey:active,.bkey.lit{
  background:linear-gradient(90deg,#2d2d60 0%,#5566cc 45%,#1e1e50 100%);
  box-shadow:1px 4px 6px rgba(0,0,0,.5),inset 2px 0 rgba(255,255,255,.1);
  transform:translateY(2px)
}
.bkey.lit{color:#aac}
/* positions relative to the keys-row width */
/* C# between C and D */
.bk-cs{left:10.5%}
/* D# between D and E */
.bk-ds{left:24%}
/* F# between F and G */
.bk-fs{left:51%}
/* G# between G and A */
.bk-gs{left:64.5%}
/* A# between A and B */
.bk-as{left:78%}

/* ── CONTROLS STRIP ── */
.controls{
  display:flex;gap:8px;
  padding:0 14px 14px
}
.ctrl-btn{
  flex:1;height:44px;border:none;border-radius:12px;
  font-size:11px;font-weight:900;letter-spacing:.5px;
  background:linear-gradient(135deg,#1a1a2e,#0f3460);
  color:#fff;
  box-shadow:0 4px 14px rgba(15,52,96,.3)
}
.ctrl-btn:active{transform:scale(.96);opacity:.9}
.ctrl-btn.active-ctrl{
  background:linear-gradient(135deg,#0f3460,#533483);
  box-shadow:0 4px 14px rgba(83,52,131,.4)
}

/* ── RESULT BAR ── */
.result{
  margin:0 14px 10px;
  min-height:42px;padding:10px 14px;
  border-radius:12px;
  background:#f4f6fb;
  border:1px solid #e4e8f0;
  display:flex;align-items:center;justify-content:center;
  font-size:11px;font-weight:700;color:#6b7280;
  text-align:center;letter-spacing:.2px
}

/* ── KEYBOARD HINT ── */
.hint{
  text-align:center;padding:0 14px 12px;
  font-size:9px;letter-spacing:.8px;color:#b0b7c3;font-weight:600
}

/* ── SUSTAIN INDICATOR ── */
.sustain-bar{
  display:flex;align-items:center;justify-content:center;gap:8px;
  padding:2px 14px 12px;font-size:10px;font-weight:700;color:#9aa3b2
}
.sus-dot{width:8px;height:8px;border-radius:50%;background:#d1d5db}
.sus-dot.on{background:#4455cc;box-shadow:0 0 6px rgba(68,85,204,.6)}

/* ── FOOTER ── */
.footer{
  background:#f8f9fc;
  border-top:1px solid #eaecf0;
  padding:10px 18px;
  display:flex;align-items:center;justify-content:center;
  gap:8px;
  font-size:9px;letter-spacing:1.5px;color:#b0b7c3;font-weight:700
}
.footer-dot{width:5px;height:5px;border-radius:50%;background:#4ade80;box-shadow:0 0 6px rgba(74,222,128,.8)}
</style></head>
<body>
<div class="wrap">
<div class="card">

<!-- HEADER -->
<div class="header">
  <div class="brand">
    <div class="logo-box">🎹</div>
    <div class="brand-text">
      <div class="brand-top">SUKUNA MD</div>
      <div class="brand-name">Piano</div>
    </div>
  </div>
  <div class="octave-block">
    <div class="oct-label">OCTAVE</div>
    <div class="oct-row">
      <button class="oct-btn" id="oct-down">−</button>
      <div class="oct-val" id="oct-val">4</div>
      <button class="oct-btn" id="oct-up">+</button>
    </div>
  </div>
</div>

<!-- NOTE DISPLAY -->
<div class="note-display">
  <div class="note-label">NOW PLAYING</div>
  <div>
    <div class="note-value" id="note-val">—</div>
    <div class="note-freq" id="note-freq">tap a key</div>
  </div>
</div>

<!-- PIANO -->
<div class="piano-wrap">
  <div class="piano">
    <div class="keys-row" id="keys-row">
      <!-- White keys -->
      <button class="wkey" data-note="C"><span class="note-name">C</span></button>
      <button class="wkey" data-note="D"><span class="note-name">D</span></button>
      <button class="wkey" data-note="E"><span class="note-name">E</span></button>
      <button class="wkey" data-note="F"><span class="note-name">F</span></button>
      <button class="wkey" data-note="G"><span class="note-name">G</span></button>
      <button class="wkey" data-note="A"><span class="note-name">A</span></button>
      <button class="wkey" data-note="B"><span class="note-name">B</span></button>
      <button class="wkey" data-note="C5" id="high-c"><span class="note-name">C</span></button>
      <!-- Black keys -->
      <button class="bkey bk-cs" data-note="C#"><span>C#</span></button>
      <button class="bkey bk-ds" data-note="D#"><span>D#</span></button>
      <button class="bkey bk-fs" data-note="F#"><span>F#</span></button>
      <button class="bkey bk-gs" data-note="G#"><span>G#</span></button>
      <button class="bkey bk-as" data-note="A#"><span>A#</span></button>
    </div>
  </div>
</div>

<!-- CONTROLS -->
<div class="controls">
  <button class="ctrl-btn" id="btn-sustain">🔇 SUSTAIN OFF</button>
  <button class="ctrl-btn" id="btn-reset">↺ RESET</button>
  <button class="ctrl-btn" id="btn-wave">〜 SINE</button>
</div>

<!-- RESULT -->
<div class="result" id="result">Touch any key to start playing 🎵</div>

<!-- SUSTAIN -->
<div class="sustain-bar">
  <div class="sus-dot" id="sus-dot"></div>
  <span id="sus-label">Sustain: OFF</span>
</div>

<!-- HINT -->
<div class="hint">KEYBOARD · A S D F G H J K &nbsp;|&nbsp; W E &nbsp;T Y U</div>

<!-- FOOTER -->
<div class="footer">
  <span class="footer-dot"></span>
  <span>SUKUNA MD</span>
  <span>•</span>
  <span>INTERACTIVE PIANO</span>
</div>

</div><!-- .card -->
</div><!-- .wrap -->

<script>
(function(){

var audioCtx = null;
var octave = 4;
var sustainOn = false;
var sustainedNodes = [];
var waveTypes = ['sine','triangle','square','sawtooth'];
var waveLabels = ['〜 SINE','△ TRI','□ SQR','∿ SAW'];
var waveIdx = 0;

var noteEl   = document.getElementById('note-val');
var freqEl   = document.getElementById('note-freq');
var octEl    = document.getElementById('oct-val');
var resultEl = document.getElementById('result');
var susDot   = document.getElementById('sus-dot');
var susLabel = document.getElementById('sus-label');

/* ── NOTE TABLE ── */
var SEMITONES = {
  'C':0,'C#':1,'Db':1,
  'D':2,'D#':3,'Eb':3,
  'E':4,'F':5,'F#':6,'Gb':6,
  'G':7,'G#':8,'Ab':8,
  'A':9,'A#':10,'Bb':10,
  'B':11
};

function noteFreq(name, oct) {
  var base = name === 'C5' ? 0 : (SEMITONES[name] !== undefined ? SEMITONES[name] : 0);
  var o    = name === 'C5' ? oct + 1 : oct;
  var midi = base + (o + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/* ── AUDIO CTX ── */
function getCtx() {
  if (!audioCtx) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

/* ── PIANO SYNTHESIS ── */
/* Real piano: fundamental + harmonics + sharp attack + exponential decay */
function playNote(name) {
  var ctx = getCtx();
  if (!ctx) return;

  var freq = noteFreq(name, octave);
  var now  = ctx.currentTime;

  /* master gain for this note */
  var masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);

  var releaseTime = sustainOn ? 2.4 : 0.85;

  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(0.38, now + 0.008);
  masterGain.gain.exponentialRampToValueAtTime(0.22, now + 0.08);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

  /* Fundamental */
  var o1 = ctx.createOscillator();
  o1.type = waveTypes[waveIdx];
  o1.frequency.value = freq;
  var g1 = ctx.createGain(); g1.gain.value = 0.7;
  o1.connect(g1); g1.connect(masterGain);
  o1.start(now); o1.stop(now + releaseTime + 0.05);

  /* 2nd harmonic (octave) */
  var o2 = ctx.createOscillator();
  o2.type = 'sine';
  o2.frequency.value = freq * 2;
  var g2 = ctx.createGain(); g2.gain.value = 0.18;
  o2.connect(g2); g2.connect(masterGain);
  o2.start(now); o2.stop(now + releaseTime * 0.65);

  /* 3rd harmonic (perfect 5th above octave) */
  var o3 = ctx.createOscillator();
  o3.type = 'sine';
  o3.frequency.value = freq * 3;
  var g3 = ctx.createGain(); g3.gain.value = 0.09;
  o3.connect(g3); g3.connect(masterGain);
  o3.start(now); o3.stop(now + releaseTime * 0.4);

  /* 4th harmonic (2 octaves) */
  var o4 = ctx.createOscillator();
  o4.type = 'sine';
  o4.frequency.value = freq * 4;
  var g4 = ctx.createGain(); g4.gain.value = 0.05;
  o4.connect(g4); g4.connect(masterGain);
  o4.start(now); o4.stop(now + releaseTime * 0.25);

  /* slight detuned twin for warmth */
  var o5 = ctx.createOscillator();
  o5.type = 'sine';
  o5.frequency.value = freq * 1.003;
  var g5 = ctx.createGain(); g5.gain.value = 0.12;
  o5.connect(g5); g5.connect(masterGain);
  o5.start(now); o5.stop(now + releaseTime * 0.9);

  if (sustainOn) {
    sustainedNodes.push(masterGain);
  }

  /* UI */
  var displayName = name === 'C5' ? 'C' + (octave+1) : name + octave;
  noteEl.textContent = displayName;
  freqEl.textContent = freq.toFixed(2) + ' Hz';
  resultEl.textContent = '🎵 Playing ' + displayName + ' · ' + freq.toFixed(1) + ' Hz';
}

/* ── KEY FLASH ── */
function flashKey(el) {
  el.classList.add('lit');
  setTimeout(function(){ el.classList.remove('lit'); }, sustainOn ? 600 : 180);
}

/* ── BIND PIANO KEYS ── */
document.querySelectorAll('[data-note]').forEach(function(btn) {
  btn.addEventListener('pointerdown', function(e) {
    e.preventDefault();
    playNote(btn.dataset.note);
    flashKey(btn);
  });
});

/* ── OCTAVE BUTTONS ── */
document.getElementById('oct-down').addEventListener('click', function() {
  if (octave > 1) { octave--; octEl.textContent = octave; resultEl.textContent = 'Octave ' + octave; }
});
document.getElementById('oct-up').addEventListener('click', function() {
  if (octave < 7) { octave++; octEl.textContent = octave; resultEl.textContent = 'Octave ' + octave; }
});

/* ── SUSTAIN ── */
document.getElementById('btn-sustain').addEventListener('click', function() {
  sustainOn = !sustainOn;
  this.textContent = sustainOn ? '🔊 SUSTAIN ON' : '🔇 SUSTAIN OFF';
  this.classList.toggle('active-ctrl', sustainOn);
  susDot.classList.toggle('on', sustainOn);
  susLabel.textContent = 'Sustain: ' + (sustainOn ? 'ON' : 'OFF');
  if (!sustainOn) {
    sustainedNodes.forEach(function(g) {
      try {
        var ctx = getCtx();
        g.gain.cancelScheduledValues(ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      } catch(e) {}
    });
    sustainedNodes = [];
  }
  resultEl.textContent = 'Sustain ' + (sustainOn ? 'ON — notes ring longer' : 'OFF — normal decay');
});

/* ── RESET ── */
document.getElementById('btn-reset').addEventListener('click', function() {
  octave = 4;
  octEl.textContent = octave;
  sustainOn = false;
  sustainedNodes = [];
  susDot.classList.remove('on');
  susLabel.textContent = 'Sustain: OFF';
  waveIdx = 0;
  document.getElementById('btn-wave').textContent = waveLabels[0];
  document.getElementById('btn-sustain').textContent = '🔇 SUSTAIN OFF';
  document.getElementById('btn-sustain').classList.remove('active-ctrl');
  noteEl.textContent = '—';
  freqEl.textContent = 'tap a key';
  resultEl.textContent = 'Reset complete 🎹';
});

/* ── WAVE TYPE ── */
document.getElementById('btn-wave').addEventListener('click', function() {
  waveIdx = (waveIdx + 1) % waveTypes.length;
  this.textContent = waveLabels[waveIdx];
  resultEl.textContent = 'Sound: ' + waveTypes[waveIdx].toUpperCase() + ' wave';
});

/* ── KEYBOARD SHORTCUTS ── */
var KB_MAP = {
  'a':'C','s':'D','d':'E','f':'F','g':'G','h':'A','j':'B','k':'C5',
  'w':'C#','e':'D#','t':'F#','y':'G#','u':'A#'
};
document.addEventListener('keydown', function(e) {
  if (e.repeat) return;
  var note = KB_MAP[e.key.toLowerCase()];
  if (!note) return;
  playNote(note);
  var btn = document.querySelector('[data-note="'+note+'"]');
  if (btn) flashKey(btn);
});

})();
</script>
</body></html>`;
}

module.exports = {
    name: 'piano',
    aliases: ['keyboard', 'keys', 'pianokeyboard'],
    description: 'Interactive playable piano keyboard with real synthesized sound — 8 notes, sharps, octave control',
    usage: '.piano',
    category: 'games',
    async execute({ sock, msg, from, reply }) {
        try {
            await sendRichHtml({ sock, jid: from, quoted: msg, html: pianoHtml(), interactive: true });
        } catch (error) {
            console.error('[PIANO]', error.message);
            await reply('🎹 Piano failed to open. Make sure WhatsApp is up to date and try `.piano` again.');
        }
    },
    pianoHtml,
};
