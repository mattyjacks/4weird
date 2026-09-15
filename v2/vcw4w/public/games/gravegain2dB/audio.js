/* GraveGain2dB audio: 5 buses + synth families + collapse sting (A8).
 * Buses: master / music / fx / dialogue / UI — WebAudio gain graph.
 * Per-material synth families (rock/dirt/ore/wood/crystal/flesh...) via
 * noise+osc recipes; 5-stage collapse sting; layered music (bass/pad/arp).
 * Vanilla IIFE, idempotent, never throws. Export: window.GG2DB_Audio. */
(function () {
  "use strict";
  if (window.GG2DB_Audio) return;

  var BUS_NAMES = ["master", "music", "fx", "dialogue", "ui"];

  var AC = null;          // AudioContext (lazy, on first user gesture-safe call)
  var buses = {};         // name -> GainNode
  var gains = { master: 0.9, music: 0.55, fx: 0.8, dialogue: 0.9, ui: 0.7 };
  var muted = false;
  var noiseBuf = null;

  // Music layers: { bass, pad, arp } gains under music bus.
  var layers = {};
  var layerLevels = { bass: 0.8, pad: 0.7, arp: 0.0 };
  var musicTimer = 0;
  var musicStep = 0;

  function ac() {
    try {
      if (AC) return AC;
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      AC = new Ctor();
      var master = AC.createGain();
      master.gain.value = gains.master;
      master.connect(AC.destination);
      buses.master = master;
      var names = ["music", "fx", "dialogue", "ui"];
      for (var i = 0; i < names.length; i += 1) {
        var g = AC.createGain();
        g.gain.value = gains[names[i]];
        g.connect(master);
        buses[names[i]] = g;
      }
      // Music sub-layers.
      var keys = ["bass", "pad", "arp"];
      for (var j = 0; j < keys.length; j += 1) {
        var lg = AC.createGain();
        lg.gain.value = layerLevels[keys[j]];
        lg.connect(buses.music);
        layers[keys[j]] = lg;
      }
      return AC;
    } catch (e) { return null; }
  }

  function resume() {
    try {
      var c = ac();
      if (c && c.state === "suspended" && typeof c.resume === "function") c.resume();
    } catch (e) { /* ignore */ }
  }

  function getNoise() {
    try {
      var c = ac();
      if (!c) return null;
      if (noiseBuf) return noiseBuf;
      var len = c.sampleRate;
      noiseBuf = c.createBuffer(1, len, c.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i += 1) d[i] = Math.random() * 2 - 1;
      return noiseBuf;
    } catch (e) { return null; }
  }

  // Low-level voices -------------------------------------------------------
  function blip(bus, freq, dur, type, vol, slideTo) {
    try {
      var c = ac();
      if (!c || muted) return;
      var t = c.currentTime;
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = type || "square";
      o.frequency.setValueAtTime(freq || 440, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + (dur || 0.1));
      g.gain.setValueAtTime(vol || 0.2, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.1));
      o.connect(g);
      g.connect(buses[bus] || buses.fx);
      o.start(t);
      o.stop(t + (dur || 0.1) + 0.02);
      try { o.onended = function () { try { g.disconnect(); } catch (e) {} }; } catch (e) {}
    } catch (e) { /* ignore */ }
  }

  function thump(bus, dur, vol, cutoff) {
    try {
      var c = ac();
      if (!c || muted) return;
      var t = c.currentTime;
      var src = c.createBufferSource();
      src.buffer = getNoise();
      src.loop = true;
      var f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = cutoff || 800;
      var g = c.createGain();
      g.gain.setValueAtTime(vol || 0.3, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.2));
      src.connect(f);
      f.connect(g);
      g.connect(buses[bus] || buses.fx);
      src.start(t);
      src.stop(t + (dur || 0.2) + 0.02);
    } catch (e) { /* ignore */ }
  }

  // Per-material synth families -------------------------------------------
  // Each family: { blip:{...}, noise:{...} } — tweakable without touching sim.
  var FAMILIES = {
    rock:    { blip: { f: 140, d: 0.08, t: "square", v: 0.25, s: 70 },  noise: { d: 0.12, v: 0.3, c: 900 } },
    dirt:    { blip: { f: 220, d: 0.07, t: "sine", v: 0.2, s: 110 },    noise: { d: 0.1, v: 0.22, c: 500 } },
    ore:     { blip: { f: 880, d: 0.12, t: "triangle", v: 0.2, s: 1320 }, noise: { d: 0.08, v: 0.15, c: 3000 } },
    wood:    { blip: { f: 330, d: 0.07, t: "triangle", v: 0.22, s: 180 }, noise: { d: 0.09, v: 0.2, c: 1200 } },
    crystal: { blip: { f: 1320, d: 0.18, t: "sine", v: 0.18, s: 1980 }, noise: { d: 0.06, v: 0.1, c: 6000 } },
    flesh:   { blip: { f: 180, d: 0.1, t: "sawtooth", v: 0.16, s: 90 }, noise: { d: 0.12, v: 0.2, c: 700 } },
    metal:   { blip: { f: 520, d: 0.09, t: "square", v: 0.2, s: 260 },  noise: { d: 0.1, v: 0.25, c: 2500 } },
    generic: { blip: { f: 440, d: 0.08, t: "square", v: 0.18, s: 330 }, noise: { d: 0.08, v: 0.18, c: 1500 } }
  };

  function material(name) {
    try {
      resume();
      var fam = FAMILIES[name] || FAMILIES.generic;
      blip("fx", fam.blip.f, fam.blip.d, fam.blip.t, fam.blip.v, fam.blip.s);
      thump("fx", fam.noise.d, fam.noise.v, fam.noise.c);
      return true;
    } catch (e) { return false; }
  }

  // 5-stage collapse sting: rumble -> crack -> cascade -> boom -> settle.
  var STING = [
    { at: 0.0, fn: function () { thump("fx", 0.6, 0.35, 220); } },
    { at: 0.25, fn: function () { thump("fx", 0.25, 0.4, 1400); blip("fx", 200, 0.15, "sawtooth", 0.25, 60); } },
    { at: 0.55, fn: function () { thump("fx", 0.4, 0.35, 900); blip("fx", 330, 0.12, "square", 0.2, 110); } },
    { at: 0.95, fn: function () { thump("fx", 0.8, 0.5, 300); blip("fx", 90, 0.5, "sine", 0.4, 35); } },
    { at: 1.6, fn: function () { thump("fx", 0.5, 0.2, 400); blip("fx", 440, 0.3, "sine", 0.12, 220); } }
  ];

  function collapse() {
    try {
      resume();
      if (!ac() || muted) return false;
      for (var i = 0; i < STING.length; i += 1) {
        (function (s) {
          try { setTimeout(function () { try { s.fn(); } catch (e) {} }, Math.floor(s.at * 1000)); } catch (e) {}
        })(STING[i]);
      }
      return true;
    } catch (e) { return false; }
  }

  // Named one-shots ---------------------------------------------------------
  function ui(name) {
    try {
      resume();
      if (name === "click") blip("ui", 660, 0.05, "square", 0.12);
      else if (name === "hover") blip("ui", 880, 0.03, "sine", 0.06);
      else if (name === "back") blip("ui", 440, 0.06, "square", 0.12, 330);
      else if (name === "error") blip("ui", 160, 0.15, "sawtooth", 0.15, 110);
      else blip("ui", 550, 0.05, "square", 0.1);
      return true;
    } catch (e) { return false; }
  }

  function say(freq, dur) {
    try {
      resume();
      blip("dialogue", freq || 300, dur || 0.12, "sine", 0.2, (freq || 300) * 0.8);
      return true;
    } catch (e) { return false; }
  }

  // Layered music: tiny step-sequencer. Layers fade via musicLayer().
  var SCALE_NOTES = [55, 65.4, 82.4, 98, 110, 130.8, 164.8]; // A minor-ish
  function musicTick() {
    try {
      if (!AC || muted) return;
      var s = musicStep % 16;
      var root = SCALE_NOTES[(musicStep >> 4) % SCALE_NOTES.length];
      if (s % 4 === 0) {
        // bass on beats
        var o = AC.createOscillator();
        var g = AC.createGain();
        o.type = "sine";
        o.frequency.value = root;
        var t = AC.currentTime;
        g.gain.setValueAtTime(0.5, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
        o.connect(g); g.connect(layers.bass || buses.music);
        o.start(t); o.stop(t + 0.5);
      }
      if (s === 0 || s === 8) {
        // pad chord
        for (var i = 0; i < 3; i += 1) {
          var oo = AC.createOscillator();
          var gg = AC.createGain();
          oo.type = "triangle";
          oo.frequency.value = root * [2, 2.4, 3][i];
          var tt = AC.currentTime;
          gg.gain.setValueAtTime(0.08, tt);
          gg.gain.exponentialRampToValueAtTime(0.0001, tt + 1.6);
          oo.connect(gg); gg.connect(layers.pad || buses.music);
          oo.start(tt); oo.stop(tt + 1.7);
        }
      }
      if (s % 2 === 1) {
        // arp sparkle (layer gain gates audibility)
        var a = AC.createOscillator();
        var ag = AC.createGain();
        a.type = "sine";
        a.frequency.value = root * 4 * [1, 1.2, 1.5, 2][s % 4];
        var ta = AC.currentTime;
        ag.gain.setValueAtTime(0.12, ta);
        ag.gain.exponentialRampToValueAtTime(0.0001, ta + 0.2);
        a.connect(ag); ag.connect(layers.arp || buses.music);
        a.start(ta); a.stop(ta + 0.25);
      }
      musicStep += 1;
    } catch (e) { /* ignore */ }
  }

  function music(on) {
    try {
      resume();
      if (!ac()) return false;
      if (on && !musicTimer) {
        musicTimer = setInterval(musicTick, 220);
      } else if (!on && musicTimer) {
        clearInterval(musicTimer);
        musicTimer = 0;
      }
      return true;
    } catch (e) { return false; }
  }

  function musicLayer(name, level) {
    try {
      if (layerLevels[name] == null) return false;
      layerLevels[name] = Math.max(0, Math.min(1, level));
      if (layers[name] && AC) {
        layers[name].gain.setTargetAtTime(layerLevels[name], AC.currentTime, 0.2);
      }
      return true;
    } catch (e) { return false; }
  }

  function setBus(name, level) {
    try {
      if (BUS_NAMES.indexOf(name) < 0) return false;
      gains[name] = Math.max(0, Math.min(1.5, level));
      if (buses[name] && AC) buses[name].gain.setTargetAtTime(gains[name], AC.currentTime, 0.05);
      return true;
    } catch (e) { return false; }
  }

  function setMuted(m) {
    try {
      muted = !!m;
      if (buses.master && AC) buses.master.gain.setTargetAtTime(muted ? 0 : gains.master, AC.currentTime, 0.05);
      return muted;
    } catch (e) { return !!m; }
  }

  // Unlock on first gesture (autoplay policy).
  try {
    if (typeof window !== "undefined" && window.addEventListener) {
      var unlock = function () { try { resume(); } catch (e) {} };
      window.addEventListener("pointerdown", unlock, { passive: true });
      window.addEventListener("keydown", unlock);
    }
  } catch (e) { /* ignore */ }

  window.GG2DB_Audio = {
    buses: BUS_NAMES.slice(),
    unlock: resume, setBus: setBus, setMuted: setMuted,
    muted: function () { return muted; },
    material: material, collapse: collapse, ui: ui, say: say,
    music: music, musicLayer: musicLayer,
    blip: function (f, d, t, v, s) { try { resume(); blip("fx", f, d, t, v, s); } catch (e) {} }
  };
})();
