(function () {
'use strict';
if (typeof window === 'undefined') return;
if (window.MusicModFX) return;

// MusicModFX - tiny modulated song + dubstep SFX runtime for any game/page.
// Vanilla JS, zero deps, osc+noise only. Lazy AudioContext (created on first
// gesture-driven call, resume attempted on every play). Fail-open: every
// public method is guarded and never throws; invalid input is a silent
// no-op returning false. ASCII-only.
// Hook shape mirrors music4w.js (playSong4W/playSfx4W/stopSong4W) but adds
// wobble-LFO + filter-sweep + pitch-env modulation. music4w.js is read-only
// reference and is never touched by this file.

var OSC_MAP = { square: 'square', saw: 'sawtooth', tri: 'triangle', sine: 'sine', noise: 'sawtooth' };
var WAVES = ['square', 'saw', 'tri', 'sine', 'noise'];
var MAX_TRACKS = 8;
var MAX_NOTES = 512;

var S = {
  ctx: null,
  master: null,
  noiseBuf: null,
  nodes: [],
  timer: 0,
  gestureHooked: false
};

function num(x) { return typeof x === 'number' && isFinite(x); }
function inRange(x, lo, hi) { return num(x) && x >= lo && x <= hi; }
function pickWave(w, fb) { return WAVES.indexOf(w) >= 0 ? w : fb; }
function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }
function midiHz(n) { return 440 * Math.pow(2, (n - 69) / 12); }

function validNote(n) {
  if (!n || typeof n !== 'object') return false;
  if (!num(n.t) || n.t < 0 || n.t > 4096) return false;
  if (!num(n.n) || n.n < 0 || n.n > 127 || Math.floor(n.n) !== n.n) return false;
  if (!num(n.d) || n.d <= 0 || n.d > 256) return false;
  if (n.v !== undefined && !inRange(n.v, 0, 1)) return false;
  if (n.bend !== undefined && !num(n.bend)) return false;
  return true;
}

function validTrack(t) {
  if (!t || typeof t !== 'object') return false;
  if (WAVES.indexOf(t.wave) < 0) return false;
  if (t.vol !== undefined && !inRange(t.vol, 0, 1)) return false;
  if (!Array.isArray(t.notes) || t.notes.length > MAX_NOTES) return false;
  for (var i = 0; i < t.notes.length; i++) if (!validNote(t.notes[i])) return false;
  return true;
}

function validSong(song) {
  try {
    if (!song || typeof song !== 'object') return false;
    if (!inRange(song.bpm, 40, 240)) return false;
    if (!Array.isArray(song.tracks) || !song.tracks.length || song.tracks.length > MAX_TRACKS) return false;
    for (var i = 0; i < song.tracks.length; i++) if (!validTrack(song.tracks[i])) return false;
    return true;
  } catch (e) { return false; }
}

function validRecipe(r) {
  try {
    if (!r || typeof r !== 'object') return false;
    if (r.wave !== undefined && WAVES.indexOf(r.wave) < 0) return false;
    if (r.freq !== undefined && (!num(r.freq) || r.freq < 20 || r.freq > 16000)) return false;
    if (r.freqEnd !== undefined && (!num(r.freqEnd) || r.freqEnd < 20 || r.freqEnd > 16000)) return false;
    if (r.dur !== undefined && (!num(r.dur) || r.dur <= 0 || r.dur > 4)) return false;
    if (r.vol !== undefined && !inRange(r.vol, 0, 1)) return false;
    return true;
  } catch (e) { return false; }
}

function hookGestureResume() {
  try {
    if (S.gestureHooked) return;
    S.gestureHooked = true;
    var resume = function () {
      try { if (S.ctx && S.ctx.state === 'suspended') S.ctx.resume(); } catch (e) {}
    };
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('pointerdown', resume, { passive: true });
      window.addEventListener('keydown', resume);
      window.addEventListener('touchend', resume, { passive: true });
    }
  } catch (e) {}
}

function initCtx() {
  try {
    hookGestureResume();
    if (!S.ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      S.ctx = new AC();
      S.master = S.ctx.createGain();
      S.master.gain.value = 0.9;
      S.master.connect(S.ctx.destination);
    }
    if (S.ctx.state === 'suspended') {
      try {
        var p = S.ctx.resume();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      } catch (e) {}
    }
    return S.ctx;
  } catch (e) { return null; }
}

function noiseBuffer() {
  try {
    if (S.noiseBuf) return S.noiseBuf;
    var len = S.ctx.sampleRate | 0;
    if (!num(len) || len <= 0) len = 44100;
    var buf = S.ctx.createBuffer(1, len, S.ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    S.noiseBuf = buf;
    return buf;
  } catch (e) { return null; }
}

function trackNode(n) {
  try { S.nodes.push(n); } catch (e) {}
  return n;
}

// Wobble LFO: sine osc -> depth gain -> target AudioParam. Returns osc or null.
function addWobble(param, rateHz, depth, t0) {
  try {
    if (!param || !num(rateHz) || rateHz <= 0 || !num(depth) || depth === 0) return null;
    var lfo = S.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = clamp(rateHz, 0.1, 60);
    var g = S.ctx.createGain();
    g.gain.value = depth;
    lfo.connect(g);
    g.connect(param);
    lfo.start(t0);
    trackNode(lfo);
    trackNode(g);
    return lfo;
  } catch (e) { return null; }
}

// Modulated voice: osc (pitch-env) -> filter (sweep + wobble) -> amp -> master.
// opts: { wave, freq, freqEnd, dur, vol, wobbleRate, wobbleDepth,
//         sweepFrom, sweepTo, filterType }
function voiceAt(t0, opts) {
  var wave = pickWave(opts.wave, 'saw');
  var freq = num(opts.freq) ? clamp(opts.freq, 1, 16000) : 220;
  var freqEnd = num(opts.freqEnd) ? clamp(opts.freqEnd, 1, 16000) : freq;
  var dur = num(opts.dur) ? clamp(opts.dur, 0.02, 4) : 0.25;
  var vol = num(opts.vol) ? clamp(opts.vol, 0, 1) : 0.7;
  if (vol <= 0.0001) return;

  var osc = S.ctx.createOscillator();
  osc.type = OSC_MAP[wave] || 'sawtooth';
  // Pitch env: start freq slides to freqEnd across dur.
  try {
    osc.frequency.setValueAtTime(Math.max(1, freq), t0);
    if (freqEnd !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
  } catch (e) {
    try { osc.frequency.value = freq; } catch (e2) {}
  }

  var flt = S.ctx.createBiquadFilter();
  flt.type = opts.filterType || 'lowpass';
  var swFrom = num(opts.sweepFrom) ? clamp(opts.sweepFrom, 20, 18000) : 400;
  var swTo = num(opts.sweepTo) ? clamp(opts.sweepTo, 20, 18000) : 4000;
  try {
    flt.frequency.setValueAtTime(Math.max(20, swFrom), t0);
    if (swTo !== swFrom) flt.frequency.exponentialRampToValueAtTime(Math.max(20, swTo), t0 + dur);
  } catch (e) {
    try { flt.frequency.value = swFrom; } catch (e2) {}
  }
  try { flt.Q.value = 6; } catch (e) {}

  var amp = S.ctx.createGain();
  try {
    amp.gain.setValueAtTime(Math.max(0.0001, vol), t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  } catch (e) {
    try { amp.gain.value = vol; } catch (e2) {}
  }

  osc.connect(flt);
  flt.connect(amp);
  amp.connect(S.master);

  // Wobble LFO rides the filter cutoff for the classic dubstep wobble.
  var wRate = num(opts.wobbleRate) ? opts.wobbleRate : 0;
  var wDepth = num(opts.wobbleDepth) ? opts.wobbleDepth : 0;
  if (wRate > 0 && wDepth !== 0) {
    var stopAt = t0 + dur + 0.05;
    var lfo = addWobble(flt.frequency, wRate, wDepth, t0);
    if (lfo) { try { lfo.stop(stopAt); } catch (e) {} }
  }

  try {
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch (e) { return; }
  trackNode(osc);
  trackNode(flt);
  trackNode(amp);
}

function noiseHitAt(t0, opts) {
  var buf = noiseBuffer();
  if (!buf) return;
  var dur = num(opts.dur) ? clamp(opts.dur, 0.02, 4) : 0.25;
  var vol = num(opts.vol) ? clamp(opts.vol, 0, 1) : 0.7;
  if (vol <= 0.0001) return;
  var freq = num(opts.freq) ? clamp(opts.freq, 20, 16000) : 1200;
  var freqEnd = num(opts.freqEnd) ? clamp(opts.freqEnd, 20, 16000) : freq;

  var src = S.ctx.createBufferSource();
  src.buffer = buf;
  try { src.loop = true; } catch (e) {}
  var flt = S.ctx.createBiquadFilter();
  flt.type = 'bandpass';
  try {
    flt.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (freqEnd !== freq) flt.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
  } catch (e) {
    try { flt.frequency.value = freq; } catch (e2) {}
  }
  try { flt.Q.value = 1.2; } catch (e) {}
  var amp = S.ctx.createGain();
  try {
    amp.gain.setValueAtTime(Math.max(0.0001, vol), t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  } catch (e) {
    try { amp.gain.value = vol; } catch (e2) {}
  }
  src.connect(flt);
  flt.connect(amp);
  amp.connect(S.master);
  var wRate = num(opts.wobbleRate) ? opts.wobbleRate : 0;
  var wDepth = num(opts.wobbleDepth) ? opts.wobbleDepth : 0;
  if (wRate > 0 && wDepth !== 0) {
    var lfo = addWobble(flt.frequency, wRate, wDepth, t0);
    if (lfo) { try { lfo.stop(t0 + dur + 0.05); } catch (e) {} }
  }
  try {
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  } catch (e) { return; }
  trackNode(src);
  trackNode(flt);
  trackNode(amp);
}

function songMod(song, opts) {
  var m = (song && song.mod) || {};
  var o = opts || {};
  return {
    wobbleRate: num(o.wobbleRate) ? o.wobbleRate : (num(m.wobbleRate) ? m.wobbleRate : 6),
    wobbleDepth: num(o.wobbleDepth) ? o.wobbleDepth : (num(m.wobbleDepth) ? m.wobbleDepth : 900),
    sweepFrom: num(o.sweepFrom) ? o.sweepFrom : (num(m.sweepFrom) ? m.sweepFrom : 300),
    sweepTo: num(o.sweepTo) ? o.sweepTo : (num(m.sweepTo) ? m.sweepTo : 4500)
  };
}

function scheduleSong(song, mod) {
  var beat = 60 / song.bpm;
  var t0 = S.ctx.currentTime + 0.06;
  var endBeats = 0;
  for (var ti = 0; ti < song.tracks.length; ti++) {
    var tr = song.tracks[ti];
    var tv = (tr.vol === undefined ? 1 : tr.vol) * 0.5;
    for (var ni = 0; ni < tr.notes.length; ni++) {
      var n = tr.notes[ni];
      var at = t0 + n.t * beat;
      var dur = Math.max(0.03, n.d * beat * 0.92);
      var v = (n.v === undefined ? 1 : n.v) * tv;
      if (v <= 0.0001) continue;
      if (n.t + n.d > endBeats) endBeats = n.t + n.d;
      var f = midiHz(n.n);
      // Pitch env: notes with bend slide by semitones; default tiny attack slide.
      var bend = num(n.bend) ? n.bend : 0;
      var fEnd = bend !== 0 ? f * Math.pow(2, bend / 12) : f;
      var vce = {
        wave: tr.wave,
        freq: f * 0.5,
        freqEnd: fEnd,
        dur: dur,
        vol: v,
        wobbleRate: mod.wobbleRate,
        wobbleDepth: mod.wobbleDepth,
        sweepFrom: mod.sweepFrom,
        sweepTo: mod.sweepTo
      };
      try {
        if (tr.wave === 'noise') noiseHitAt(at, { freq: f, freqEnd: fEnd, dur: dur, vol: v * 0.6, wobbleRate: mod.wobbleRate, wobbleDepth: mod.wobbleDepth });
        else voiceAt(at, vce);
      } catch (e) {}
    }
  }
  return endBeats * beat;
}

function stopAll() {
  try {
    if (S.timer) { clearTimeout(S.timer); S.timer = 0; }
    for (var i = 0; i < S.nodes.length; i++) {
      try { S.nodes[i].stop(); } catch (e) {}
      try { S.nodes[i].disconnect(); } catch (e) {}
    }
    S.nodes = [];
    return true;
  } catch (e) { return false; }
}

function playSong(song, opts) {
  try {
    if (!validSong(song)) return false;
    if (!initCtx()) return false;
    stopAll();
    var mod = songMod(song, opts);
    var loop = !!(opts && opts.loop);
    var secs = scheduleSong(song, mod);
    if (loop && secs > 0) {
      S.timer = setTimeout(function tick() {
        try {
          S.nodes = [];
          var s = scheduleSong(song, mod);
          S.timer = setTimeout(tick, Math.max(50, s * 1000));
        } catch (e) { S.timer = 0; }
      }, Math.max(50, secs * 1000));
    }
    return true;
  } catch (e) { return false; }
}

function playSfx(recipe) {
  try {
    if (!validRecipe(recipe)) return false;
    if (!initCtx()) return false;
    var t0 = S.ctx.currentTime + 0.01;
    var wave = pickWave(recipe.wave, 'saw');
    var o = {
      wave: wave,
      freq: num(recipe.freq) ? recipe.freq : 160,
      freqEnd: num(recipe.freqEnd) ? recipe.freqEnd : 50,
      dur: num(recipe.dur) ? recipe.dur : 0.35,
      vol: num(recipe.vol) ? recipe.vol : 0.8,
      wobbleRate: num(recipe.wobbleRate) ? recipe.wobbleRate : 10,
      wobbleDepth: num(recipe.wobbleDepth) ? recipe.wobbleDepth : 1200,
      sweepFrom: num(recipe.sweepFrom) ? recipe.sweepFrom : 300,
      sweepTo: num(recipe.sweepTo) ? recipe.sweepTo : 5000,
      filterType: 'lowpass'
    };
    if (wave === 'noise') noiseHitAt(t0, o);
    else voiceAt(t0, o);
    return true;
  } catch (e) { return false; }
}

window.MusicModFX = {
  v: 1,
  playSong: playSong,
  playSfx: playSfx,
  stop: stopAll
};
})();
