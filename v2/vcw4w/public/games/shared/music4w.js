(function () {
'use strict';
if (window.Music4W) return;

// Music4W — ultra-small 4W-1 song/SFX loader for ALL games.
// Vanilla JS, zero assets, osc+noise only. Lazy AudioContext
// (created on first gesture-driven call). Fail-open: every
// public method is guarded and never throws; invalid 4W-1
// input is rejected silently (no-op / false).

var WAVES = ['square', 'saw', 'tri', 'sine', 'noise'];
var KINDS = ['raygun', 'death', 'putt', 'coin', 'hit', 'jump', 'win', 'lose', 'click', 'alarm'];
var STEP_TYPES = ['tone', 'noise'];
var OSC_MAP = { square: 'square', saw: 'sawtooth', tri: 'triangle', sine: 'sine' };
var SONG_BUDGET = 8192;
var SFX_BUDGET = 1024;
var MAX_TRACKS = 8;
var MAX_NOTES = 512;
var MAX_STEPS = 16;

var S = {
  ctx: null,
  masterGain: null,
  noiseBuf: null,
  muted: false,
  masterVolume: 0.8,
  musicVolume: 0.5,
  sfxVolume: 0.8,
  songNodes: [],
  songTimer: 0
};

function num(x) { return typeof x === 'number' && isFinite(x); }
function inRange(x, lo, hi) { return num(x) && x >= lo && x <= hi; }
function effMusic() { return S.muted ? 0 : S.masterVolume * S.musicVolume; }
function effSfx() { return S.muted ? 0 : S.masterVolume * S.sfxVolume; }
function midiHz(n) { return 440 * Math.pow(2, (n - 69) / 12); }

function underBudget(obj, cap) {
  try { return JSON.stringify(obj).length <= cap; } catch (e) { return false; }
}

function validNote(n) {
  if (!n || typeof n !== 'object') return false;
  if (!num(n.t) || n.t < 0 || n.t > 4096) return false;
  if (!num(n.n) || n.n < 0 || n.n > 127 || Math.floor(n.n) !== n.n) return false;
  if (!num(n.d) || n.d <= 0 || n.d > 256) return false;
  if (n.v !== undefined && !inRange(n.v, 0, 1)) return false;
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

function validSong4W(song) {
  try {
    if (!song || typeof song !== 'object') return false;
    if (song.v !== 1) return false;
    if (typeof song.title !== 'string' || !song.title) return false;
    if (!inRange(song.bpm, 40, 240)) return false;
    if (!Array.isArray(song.tracks) || !song.tracks.length || song.tracks.length > MAX_TRACKS) return false;
    for (var i = 0; i < song.tracks.length; i++) if (!validTrack(song.tracks[i])) return false;
    return underBudget(song, SONG_BUDGET);
  } catch (e) { return false; }
}

function validStep(st) {
  if (!st || typeof st !== 'object') return false;
  if (WAVES.indexOf(st.wave) < 0) return false;
  if (STEP_TYPES.indexOf(st.type) < 0) return false;
  if (!num(st.freq) || st.freq < 20 || st.freq > 16000) return false;
  if (!num(st.freqEnd) || st.freqEnd < 20 || st.freqEnd > 16000) return false;
  if (!num(st.dur) || st.dur <= 0 || st.dur > 2) return false;
  if (!inRange(st.vol, 0, 1)) return false;
  return true;
}

function validSfx4W(sfx) {
  try {
    if (!sfx || typeof sfx !== 'object') return false;
    if (sfx.v !== 1) return false;
    if (typeof sfx.name !== 'string' || !sfx.name) return false;
    if (KINDS.indexOf(sfx.kind) < 0) return false;
    if (!Array.isArray(sfx.steps) || !sfx.steps.length || sfx.steps.length > MAX_STEPS) return false;
    for (var i = 0; i < sfx.steps.length; i++) if (!validStep(sfx.steps[i])) return false;
    return underBudget(sfx, SFX_BUDGET);
  } catch (e) { return false; }
}

function initCtx() {
  try {
    if (!S.ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      S.ctx = new AC();
      S.masterGain = S.ctx.createGain();
      S.masterGain.gain.value = 1;
      S.masterGain.connect(S.ctx.destination);
    }
    if (S.ctx.state === 'suspended') S.ctx.resume();
    return S.ctx;
  } catch (e) { return null; }
}

function noiseBuffer() {
  try {
    if (S.noiseBuf) return S.noiseBuf;
    var len = S.ctx.sampleRate | 0;
    var buf = S.ctx.createBuffer(1, len, S.ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    S.noiseBuf = buf;
    return buf;
  } catch (e) { return null; }
}

function toneAt(t0, freq, freqEnd, dur, vol, wave) {
  var osc = S.ctx.createOscillator();
  var g = S.ctx.createGain();
  osc.type = OSC_MAP[wave] || 'square';
  osc.frequency.setValueAtTime(Math.max(1, freq), t0);
  if (freqEnd !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
  g.gain.setValueAtTime(Math.max(0.0001, vol), t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(S.masterGain);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
  S.songNodes.push(osc);
}

function noiseAt(t0, freq, freqEnd, dur, vol) {
  var buf = noiseBuffer();
  if (!buf) return;
  var src = S.ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  var f = S.ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(freq, t0);
  if (freqEnd !== freq) f.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
  f.Q.value = 1.2;
  var g = S.ctx.createGain();
  g.gain.setValueAtTime(Math.max(0.0001, vol), t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f);
  f.connect(g);
  g.connect(S.masterGain);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
  S.songNodes.push(src);
}

function playSfx4W(sfx) {
  try {
    if (!validSfx4W(sfx)) return false;
    if (!initCtx()) return false;
    var main = effSfx();
    if (main <= 0.001) return true;
    var t0 = S.ctx.currentTime + 0.01;
    for (var i = 0; i < sfx.steps.length; i++) {
      (function (st, at) {
        var v = st.vol * main;
        if (v <= 0.0001) return;
        try {
          if (st.type === 'noise' || st.wave === 'noise') noiseAt(at, st.freq, st.freqEnd, st.dur, v);
          else toneAt(at, st.freq, st.freqEnd, st.dur, v, st.wave);
        } catch (e) { /* fail-open per step */ }
      })(sfx.steps[i], t0);
      t0 += sfx.steps[i].dur;
    }
    return true;
  } catch (e) { return false; }
}

function scheduleSong(song) {
  var beat = 60 / song.bpm;
  var main = effMusic();
  var t0 = S.ctx.currentTime + 0.06;
  var endBeats = 0;
  for (var ti = 0; ti < song.tracks.length; ti++) {
    var tr = song.tracks[ti];
    var tv = (tr.vol === undefined ? 1 : tr.vol) * main;
    for (var ni = 0; ni < tr.notes.length; ni++) {
      var n = tr.notes[ni];
      var at = t0 + n.t * beat;
      var dur = Math.max(0.03, n.d * beat * 0.92);
      var v = (n.v === undefined ? 1 : n.v) * tv;
      if (v <= 0.0001) continue;
      if (n.t + n.d > endBeats) endBeats = n.t + n.d;
      try {
        if (tr.wave === 'noise') noiseAt(at, midiHz(n.n), midiHz(n.n), dur, v * 0.6);
        else toneAt(at, midiHz(n.n), midiHz(n.n), dur, v * 0.5, tr.wave);
      } catch (e) { /* fail-open per note */ }
    }
  }
  return endBeats * beat;
}

function stopSong4W() {
  try {
    if (S.songTimer) { clearTimeout(S.songTimer); S.songTimer = 0; }
    for (var i = 0; i < S.songNodes.length; i++) {
      try { S.songNodes[i].stop(); } catch (e) {}
      try { S.songNodes[i].disconnect(); } catch (e) {}
    }
    S.songNodes = [];
    return true;
  } catch (e) { return false; }
}

function playSong4W(song, opts) {
  try {
    if (!validSong4W(song)) return false;
    if (!initCtx()) return false;
    stopSong4W();
    var loop = !!(opts && opts.loop);
    var secs = scheduleSong(song);
    if (loop && secs > 0) {
      S.songTimer = setTimeout(function tick() {
        try {
          S.songNodes = [];
          var s = scheduleSong(song);
          S.songTimer = setTimeout(tick, Math.max(50, s * 1000));
        } catch (e) { S.songTimer = 0; }
      }, Math.max(50, secs * 1000));
    }
    return true;
  } catch (e) { return false; }
}

function setMuted(m) {
  try {
    S.muted = !!m;
    if (!S.muted) initCtx();
    return S.muted;
  } catch (e) { return S.muted; }
}

function setVolumes(o) {
  try {
    if (!o || typeof o !== 'object') return false;
    if (o.master !== undefined) { if (!inRange(o.master, 0, 1)) return false; S.masterVolume = o.master; }
    if (o.music !== undefined) { if (!inRange(o.music, 0, 1)) return false; S.musicVolume = o.music; }
    if (o.sfx !== undefined) { if (!inRange(o.sfx, 0, 1)) return false; S.sfxVolume = o.sfx; }
    return true;
  } catch (e) { return false; }
}

window.Music4W = {
  v: 1,
  initCtx: initCtx,
  playSfx4W: playSfx4W,
  playSong4W: playSong4W,
  stopSong4W: stopSong4W,
  setMuted: setMuted,
  setVolumes: setVolumes,
  isMuted: function () { return S.muted; },
  validSong4W: validSong4W,
  validSfx4W: validSfx4W
};
})();
