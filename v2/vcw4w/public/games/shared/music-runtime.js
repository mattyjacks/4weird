(function () {
'use strict';
if (window.FourweirdMusic) return;

// FourweirdMusic - tiny vanilla music + sfx runtime for all games.
// Zero deps, never throws, no DOM writes. Lazy AudioContext created
// and resumed on first user gesture. Hook shape mirrors
// gravegain4d/audio/sound4d.js (initCtx / playSfx / volumes) and sfx
// recipes mirror gravegain3d/audio/sound-engine.js (osc + noise only).
// Song schema (16th-step): { bpm: 40-240, tracks: [{ w, n }] } where
// w is wave ('square'|'saw'|'tri'|'sine'|'noise') and each note in n
// is [step, midi, len, vol] (step = 16th-note index, len in steps).
// Sfx schema: { f0, f1, dur, type, vol, curve } with
// curve in ('exp'|'lin'|'swell').

var state = {
  ctx: null,
  master: null,
  volume: 0.8,
  songTimer: 0,
  songNodes: [],
  songToken: 0,
  gestureBound: false
};

function clampNum(v, lo, hi, fb) {
  try {
    v = Number(v);
    if (!isFinite(v)) return fb;
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  } catch (e) { return fb; }
}

function midiToFreq(m) {
  try {
    m = clampNum(m, 0, 127, 69);
    return 440 * Math.pow(2, (m - 69) / 12);
  } catch (e) { return 440; }
}

function mapWave(w) {
  try {
    if (w === 'square') return 'square';
    if (w === 'saw' || w === 'sawtooth') return 'sawtooth';
    if (w === 'tri' || w === 'triangle') return 'triangle';
    if (w === 'noise') return 'noise';
    return 'sine';
  } catch (e) { return 'sine'; }
}

function ensureCtx() {
  try {
    if (!state.ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      state.ctx = new AC();
      try {
        state.master = state.ctx.createGain();
        state.master.gain.setValueAtTime(state.volume, state.ctx.currentTime);
        state.master.connect(state.ctx.destination);
      } catch (e2) { state.master = null; }
    }
    if (state.ctx && state.ctx.state === 'suspended') {
      try { state.ctx.resume(); } catch (e3) { /* ignore */ }
    }
  } catch (e) { /* ignore */ }
  return state.ctx;
}

function bindGesture() {
  try {
    if (state.gestureBound) return;
    state.gestureBound = true;
    var wake = function () { try { ensureCtx(); } catch (e) { /* ignore */ } };
    var types = ['pointerdown', 'touchend', 'keydown'];
    for (var i = 0; i < types.length; i++) {
      try { window.addEventListener(types[i], wake, { once: true, passive: true }); }
      catch (e1) { try { window.addEventListener(types[i], wake); } catch (e2) { /* ignore */ } }
    }
  } catch (e) { /* ignore */ }
}

function trackNode(node) {
  try { state.songNodes.push(node); } catch (e) { /* ignore */ }
}

function clearSongNodes() {
  try {
    var nodes = state.songNodes;
    state.songNodes = [];
    for (var i = 0; i < nodes.length; i++) {
      try { nodes[i].stop(0); } catch (e1) { /* ignore */ }
      try { nodes[i].disconnect(); } catch (e2) { /* ignore */ }
    }
  } catch (e) { /* ignore */ }
}

function playToneAt(when, freq, dur, type, vol) {
  try {
    var ctx = state.ctx;
    if (!ctx) return;
    var dest = state.master || ctx.destination;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), when);
    g.gain.setValueAtTime(Math.max(0.001, vol), when);
    g.gain.exponentialRampToValueAtTime(0.001, when + Math.max(0.03, dur));
    osc.connect(g);
    g.connect(dest);
    try { osc.start(when); } catch (e1) { osc.start(); }
    try { osc.stop(when + Math.max(0.03, dur) + 0.02); } catch (e2) { /* ignore */ }
    trackNode(osc);
  } catch (e) { /* ignore */ }
}

function playNoiseAt(when, dur, vol, f0, f1) {
  try {
    var ctx = state.ctx;
    if (!ctx) return;
    var dest = state.master || ctx.destination;
    var n = Math.floor(ctx.sampleRate * Math.max(0.03, dur));
    var buf = ctx.createBuffer(1, Math.max(1, n), ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var flt = ctx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.Q.value = 2;
    flt.frequency.setValueAtTime(Math.max(30, f0 || 900), when);
    if (f1) {
      try { flt.frequency.exponentialRampToValueAtTime(Math.max(30, f1), when + Math.max(0.03, dur)); }
      catch (e1) { /* ignore */ }
    }
    var g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.001, vol), when);
    g.gain.exponentialRampToValueAtTime(0.001, when + Math.max(0.03, dur));
    src.connect(flt);
    flt.connect(g);
    g.connect(dest);
    try { src.start(when); } catch (e2) { src.start(); }
    try { src.stop(when + Math.max(0.03, dur) + 0.02); } catch (e3) { /* ignore */ }
    trackNode(src);
  } catch (e) { /* ignore */ }
}

function validSong(song) {
  try {
    if (!song || typeof song !== 'object') return false;
    var bpm = Number(song.bpm);
    if (!isFinite(bpm) || bpm < 40 || bpm > 240) return false;
    if (!song.tracks || !(song.tracks instanceof Array)) return false;
    if (song.tracks.length < 1 || song.tracks.length > 8) return false;
    for (var t = 0; t < song.tracks.length; t++) {
      var tr = song.tracks[t];
      if (!tr || typeof tr !== 'object') return false;
      if (!(tr.n instanceof Array) || tr.n.length > 512) return false;
    }
    return true;
  } catch (e) { return false; }
}

function stopSong() {
  try {
    state.songToken++;
    if (state.songTimer) {
      try { clearInterval(state.songTimer); } catch (e) { /* ignore */ }
      state.songTimer = 0;
    }
    clearSongNodes();
    return true;
  } catch (e) { return false; }
}

function playSong4W(song) {
  try {
    bindGesture();
    if (!ensureCtx()) return false;
    if (!validSong(song)) return false;
    stopSong();
    var ctx = state.ctx;
    var bpm = clampNum(song.bpm, 40, 240, 120);
    var stepDur = 60 / bpm / 4;
    var events = [];
    var maxStep = 0;
    for (var t = 0; t < song.tracks.length; t++) {
      var tr = song.tracks[t];
      var wave = mapWave(tr.w);
      for (var i = 0; i < tr.n.length; i++) {
        var nt = tr.n[i];
        if (!(nt instanceof Array) || nt.length < 2) continue;
        var step = clampNum(nt[0], 0, 4096, 0);
        var midi = clampNum(nt[1], 0, 127, 69);
        var len = nt.length > 2 ? clampNum(nt[2], 1, 256, 1) : 1;
        var vol = nt.length > 3 ? clampNum(nt[3], 0, 1, 0.8) : 0.8;
        events.push({ step: step, midi: midi, len: len, vol: vol, wave: wave });
        if (step > maxStep) maxStep = step;
      }
    }
    if (!events.length) return false;
    events.sort(function (a, b) { return a.step - b.step; });
    var token = ++state.songToken;
    var startAt = ctx.currentTime + 0.06;
    var loopLen = (maxStep + 4) * stepDur;
    if (!(loopLen > 0.25)) loopLen = stepDur * 16;
    var idx = 0;
    var schedulePass = function (passStart) {
      try {
        if (token !== state.songToken) return;
        for (var k = 0; k < events.length; k++) {
          var ev = events[k];
          var when = passStart + ev.step * stepDur;
          if (when < ctx.currentTime - 0.05) continue;
          var dur = Math.max(0.05, ev.len * stepDur * 0.9);
          var v = ev.vol * 0.5;
          if (ev.wave === 'noise') playNoiseAt(when, dur, v, 700 + (ev.midi * 8), 200);
          else playToneAt(when, midiToFreq(ev.midi), dur, ev.wave, v);
        }
      } catch (e) { /* ignore */ }
    };
    schedulePass(startAt);
    var nextPass = startAt + loopLen;
    state.songTimer = setInterval(function () {
      try {
        if (token !== state.songToken) {
          try { clearInterval(state.songTimer); } catch (e) { /* ignore */ }
          state.songTimer = 0;
          return;
        }
        while (nextPass < ctx.currentTime + 0.25) nextPass += loopLen;
        if (nextPass < ctx.currentTime + 0.3) {
          schedulePass(nextPass);
          nextPass += loopLen;
          void idx;
        }
      } catch (e) { /* ignore */ }
    }, 100);
    return true;
  } catch (e) { return false; }
}

function playSfx4W(sfx) {
  try {
    bindGesture();
    if (!ensureCtx()) return false;
    if (typeof sfx === 'string') {
      try { sfx = SFX_PRESETS[sfx] || null; } catch (e) { sfx = null; }
    }
    if (!sfx || typeof sfx !== 'object') return false;
    var ctx = state.ctx;
    var now = ctx.currentTime;
    var dest = state.master || ctx.destination;
    var f0 = clampNum(sfx.f0, 20, 8000, 440);
    var f1 = (sfx.f1 === undefined || sfx.f1 === null) ? 0 : clampNum(sfx.f1, 20, 8000, 0);
    var dur = clampNum(sfx.dur, 0.03, 2, 0.15);
    var vol = clampNum(sfx.vol === undefined ? 0.5 : sfx.vol, 0, 1, 0.5);
    var type = (typeof sfx.type === 'string') ? sfx.type : 'sine';
    if (type !== 'sine' && type !== 'square' && type !== 'sawtooth' && type !== 'triangle' && type !== 'noise') type = 'sine';
    var curve = (typeof sfx.curve === 'string') ? sfx.curve : 'exp';
    if (curve !== 'exp' && curve !== 'lin' && curve !== 'swell') curve = 'exp';
    vol = vol * state.volume;
    if (vol <= 0.001) return false;
    if (type === 'noise') {
      playNoiseAt(now, dur, vol, f0, f1 || 0);
      return true;
    }
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, f0), now);
    if (f1) {
      try { osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), now + dur); }
      catch (e1) { try { osc.frequency.linearRampToValueAtTime(Math.max(20, f1), now + dur); } catch (e2) { /* ignore */ } }
    }
    if (curve === 'lin') {
      g.gain.setValueAtTime(Math.max(0.001, vol), now);
      try { g.gain.linearRampToValueAtTime(0.001, now + dur); }
      catch (e3) { g.gain.exponentialRampToValueAtTime(0.001, now + dur); }
    } else if (curve === 'swell') {
      try {
        g.gain.setValueAtTime(0.001, now);
        g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), now + dur * 0.7);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      } catch (e4) { g.gain.setValueAtTime(Math.max(0.001, vol), now); }
    } else {
      g.gain.setValueAtTime(Math.max(0.001, vol), now);
      try { g.gain.exponentialRampToValueAtTime(0.001, now + dur); }
      catch (e5) { g.gain.linearRampToValueAtTime(0.001, now + dur); }
    }
    osc.connect(g);
    g.connect(dest);
    try { osc.start(now); } catch (e6) { osc.start(); }
    try { osc.stop(now + dur + 0.02); } catch (e7) { /* ignore */ }
    return true;
  } catch (e) { return false; }
}

var SFX_PRESETS = {
  raygun: { f0: 1400, f1: 200, dur: 0.18, type: 'sawtooth', vol: 0.4, curve: 'exp' },
  death: { f0: 320, f1: 30, dur: 0.4, type: 'sawtooth', vol: 0.5, curve: 'exp' },
  pickup: { f0: 880, f1: 1320, dur: 0.12, type: 'sine', vol: 0.35, curve: 'exp' },
  explosion: { f0: 90, f1: 25, dur: 0.4, type: 'sawtooth', vol: 0.6, curve: 'exp' },
  putt: { f0: 220, f1: 70, dur: 0.12, type: 'sine', vol: 0.5, curve: 'exp' },
  wshift: { f0: 400, f1: 1400, dur: 0.28, type: 'triangle', vol: 0.35, curve: 'lin' },
  rewind: { f0: 1200, f1: 120, dur: 0.45, type: 'sawtooth', vol: 0.35, curve: 'swell' },
  splat: { f0: 140, f1: 40, dur: 0.2, type: 'square', vol: 0.35, curve: 'exp' }
};

function setVolume(v) {
  try {
    state.volume = clampNum(v, 0, 1, state.volume);
    if (state.ctx && state.master) {
      try { state.master.gain.setValueAtTime(state.volume, state.ctx.currentTime); } catch (e) { /* ignore */ }
    }
    return state.volume;
  } catch (e) { return state.volume; }
}

function initCtx() {
  try {
    bindGesture();
    return ensureCtx();
  } catch (e) { return null; }
}

function stop() {
  try {
    return stopSong();
  } catch (e) { return false; }
}

try {
  window.FourweirdMusic = {
    playSong4W: playSong4W,
    playSfx4W: playSfx4W,
    stop: stop,
    setVolume: setVolume,
    initCtx: initCtx,
    SFX_PRESETS: SFX_PRESETS
  };
} catch (e) { /* ignore */ }

try {
  if (window.GraveGainMods && typeof window.GraveGainMods.push === 'function') {
    window.GraveGainMods.push({ name: 'fourweird-music-runtime' });
  }
} catch (e) { /* ignore */ }

})();
