/* ============================================================================
 * audio.js — B8 audio channels + material sounds for GraveGain2dB.
 * Vanilla JS, no imports, idempotent. WebAudio synth only (no assets);
 * all sounds generated, so content-mode gating is trivially cosmetic.
 * Channels: master / music / fx / dialogue / UI / voice (per-channel gain).
 * Material families: roots crackle, stone crumble, metal clang, crystal ring,
 *   necro pulse, barrier hum. Collapse 5-stage: creak->debris->impact->tail->
 *   music punct. Music layers: explore / contact / horde / boss / extract /
 *   victory (crossfaded, intensity-driven).
 * Exposes window.GraveGain2DB_Audio + pushes to window.GraveGainMods.
 * ========================================================================== */
(function () {
'use strict';
if (window.GraveGain2DB_Audio) return; // idempotent

var VERSION = '1.0.0-b8';
var ctx = null, buses = {}, musicState = { layer: 'explore', intensity: 0, timer: 0 };

function ensure() {
  if (ctx) return true;
  try {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    var names = ['master', 'music', 'fx', 'dialogue', 'ui', 'voice'];
    for (var i = 0; i < names.length; i++) {
      var g = ctx.createGain();
      g.gain.value = names[i] === 'master' ? 0.9 : 1.0;
      g.connect(i === 0 ? ctx.destination : buses.master);
      buses[names[i]] = g;
    }
    return true;
  } catch (_) { return false; }
}
function setVolume(channel, v) {
  if (buses[channel]) buses[channel].gain.value = Math.max(0, Math.min(1, v));
}
function tone(channel, freq, dur, type, vol, slideTo) {
  if (!ensure()) return;
  try {
    var t = ctx.currentTime;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(buses[channel] || buses.fx);
    o.start(t); o.stop(t + dur + 0.02);
  } catch (_) {}
}
function noise(channel, dur, vol, filterFreq, q) {
  if (!ensure()) return;
  try {
    var t = ctx.currentTime, len = Math.max(1, (dur * ctx.sampleRate) | 0);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = 'bandpass';
    f.frequency.value = filterFreq || 800; f.Q.value = q || 1;
    var g = ctx.createGain(); g.gain.value = vol || 0.25;
    src.connect(f); f.connect(g); g.connect(buses[channel] || buses.fx);
    src.start(t);
  } catch (_) {}
}

/* ---- material sound families (cosmetic skins over identical triggers) ---- */
var MATERIALS = {
  roots:   function () { noise('fx', 0.25, 0.3, 2400, 2); tone('fx', 180, 0.15, 'sawtooth', 0.08, 90); },   // crackle
  stone:   function () { noise('fx', 0.35, 0.35, 300, 0.8); tone('fx', 70, 0.3, 'sine', 0.25, 40); },        // crumble
  metal:   function () { tone('fx', 620, 0.4, 'square', 0.12, 590); tone('fx', 930, 0.3, 'sine', 0.1, 900); }, // clang
  crystal: function () { tone('fx', 1320, 0.6, 'sine', 0.12, 1760); tone('fx', 1980, 0.5, 'sine', 0.07); },   // ring
  necro:   function () { tone('fx', 55, 0.8, 'sawtooth', 0.2, 110); noise('fx', 0.5, 0.12, 200, 1); },        // pulse
  barrier: function () { tone('fx', 220, 0.5, 'sine', 0.1, 220); tone('fx', 331, 0.5, 'sine', 0.06); }         // hum
};
function playMaterial(material) {
  var fn = MATERIALS[material] || MATERIALS.stone;
  fn();
}

/* ---- collapse 5-stage: creak -> debris -> impact -> tail -> music punct ---- */
function playCollapse(stage) {
  if (!ensure()) return;
  switch (stage) {
    case 0: tone('fx', 120, 1.2, 'sawtooth', 0.1, 60); break;              // creak
    case 1: noise('fx', 0.8, 0.3, 900, 0.7); break;                        // debris
    case 2: tone('fx', 60, 0.7, 'sine', 0.4, 30); noise('fx', 0.5, 0.35, 150, 1); break; // impact
    case 3: noise('fx', 1.5, 0.12, 400, 0.5); break;                       // tail
    case 4: tone('music', 440, 0.5, 'triangle', 0.2, 880); break;          // music punct
    default: break;
  }
}

/* ---- music layers: explore/contact/horde/boss/extract/victory ---- */
var LAYERS = {
  explore: { base: 110, tempo: 0,    dark: 0.05 },
  contact: { base: 130, tempo: 0.3,  dark: 0.15 },
  horde:   { base: 98,  tempo: 0.6,  dark: 0.35 },
  boss:    { base: 82,  tempo: 0.8,  dark: 0.55 },
  extract: { base: 147, tempo: 0.5,  dark: 0.2 },
  victory: { base: 165, tempo: 0.4,  dark: 0.0 }
};
function setMusicLayer(layer, intensity) {
  if (!LAYERS[layer]) return;
  musicState.layer = layer;
  musicState.intensity = Math.max(0, Math.min(1, intensity === undefined ? 0.5 : intensity));
}
function musicTick() {
  // called per beat by host; intensity crossfades volume, layer sets root
  if (!ensure()) return;
  var L = LAYERS[musicState.layer];
  var v = 0.06 + musicState.intensity * 0.14;
  tone('music', L.base, 0.45, 'triangle', v);
  tone('music', L.base * 1.5, 0.4, 'sine', v * 0.6);
  if (L.dark > 0.2) tone('music', L.base / 2, 0.6, 'sawtooth', v * L.dark);
  if (musicState.layer === 'victory') tone('music', L.base * 2, 0.5, 'sine', v * 0.8);
}

var Audio2DB = {
  VERSION: VERSION,
  ensure: ensure, setVolume: setVolume,
  tone: tone, noise: noise,
  playMaterial: playMaterial, MATERIALS: Object.keys(MATERIALS),
  playCollapse: playCollapse,
  setMusicLayer: setMusicLayer, musicTick: musicTick, LAYERS: Object.keys(LAYERS),
  ui: function (kind) { // UI + dialogue + voice blips
    if (kind === 'select') tone('ui', 660, 0.08, 'sine', 0.15);
    else if (kind === 'back') tone('ui', 440, 0.08, 'sine', 0.15);
    else if (kind === 'dialogue') tone('dialogue', 300, 0.12, 'triangle', 0.15, 380);
    else if (kind === 'voice') tone('voice', 220, 0.2, 'sawtooth', 0.08, 260);
    else tone('ui', 550, 0.06, 'sine', 0.12);
  }
};
window.GraveGain2DB_Audio = Audio2DB;
window.GraveGainMods = window.GraveGainMods || [];
window.GraveGainMods.push({ name: 'gravegain2dB-audio', version: VERSION });
})();
