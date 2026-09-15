'use strict';
/* GraveGain2dB audio — 6 material sound families, one per breaching
 * material: wood/roots, stone, scrap metal, crystal, necro growth,
 * force barrier. Each family has impact / crack / break verbs synthesized
 * from oscillator + filtered-noise recipes. No-op without a live mixer.
 * Global: window.GraveGain2dBAudioMaterials
 */
(function (root) {
  var FAMILIES = ['wood', 'stone', 'metal', 'crystal', 'necro', 'barrier'];

  // Per-family synth recipe: { wave, baseHz, slideTo, noiseMs, noiseHz, decay }
  var RECIPES = {
    wood:    { wave: 'triangle', baseHz: 180, slideTo: 90,  noiseMs: 90,  noiseHz: 900,  decay: 0.18 },
    stone:   { wave: 'square',   baseHz: 120, slideTo: 55,  noiseMs: 140, noiseHz: 500,  decay: 0.25 },
    metal:   { wave: 'sawtooth', baseHz: 520, slideTo: 300, noiseMs: 160, noiseHz: 3200, decay: 0.35 },
    crystal: { wave: 'sine',     baseHz: 1180, slideTo: 1900, noiseMs: 200, noiseHz: 6000, decay: 0.5 },
    necro:   { wave: 'sawtooth', baseHz: 90,  slideTo: 45,  noiseMs: 220, noiseHz: 300,  decay: 0.4 },
    barrier: { wave: 'sine',     baseHz: 700, slideTo: 350, noiseMs: 120, noiseHz: 2400, decay: 0.3 }
  };

  function blip(mixer, recipe, intensity, distance01, channel) {
    if (!mixer.ctx) return;
    var Ch = root.GraveGain2dBAudioChannels;
    var dest = (Ch && Ch.channelNode(mixer, channel || 'world')) || null;
    if (!dest) return;
    var t = mixer.ctx.currentTime;
    var vol = Math.max(0.001, (intensity == null ? 0.7 : intensity) * Ch.positionalGain(distance01));
    var osc = mixer.ctx.createOscillator();
    var og = mixer.ctx.createGain();
    osc.type = recipe.wave;
    osc.frequency.setValueAtTime(recipe.baseHz, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, recipe.slideTo), t + recipe.decay);
    og.gain.setValueAtTime(vol * 0.5, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + recipe.decay);
    osc.connect(og);
    og.connect(dest);
    osc.start(t);
    osc.stop(t + recipe.decay + 0.02);
    noiseBurst(mixer, dest, t, recipe.noiseMs / 1000, recipe.noiseHz, vol * 0.6);
  }

  function noiseBurst(mixer, dest, t, dur, cutoff, vol) {
    var len = Math.max(1, Math.floor(mixer.ctx.sampleRate * dur));
    var buf = mixer.ctx.createBuffer(1, len, mixer.ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = mixer.ctx.createBufferSource();
    src.buffer = buf;
    var filt = mixer.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = cutoff;
    var g = mixer.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(dest);
    src.start(t);
  }

  function familyOf(material) {
    return RECIPES[material] ? material : 'stone';
  }

  function playImpact(mixer, material, intensity, distance01) {
    blip(mixer, RECIPES[familyOf(material)], intensity == null ? 0.5 : intensity, distance01, 'world');
  }

  function playCrack(mixer, material, intensity, distance01) {
    var r = RECIPES[familyOf(material)];
    blip(mixer, r, intensity == null ? 0.7 : intensity, distance01, 'world');
    blip(mixer, { wave: r.wave, baseHz: r.baseHz * 1.5, slideTo: r.slideTo, noiseMs: 60, noiseHz: r.noiseHz * 2, decay: 0.1 },
      (intensity == null ? 0.7 : intensity) * 0.6, distance01, 'world');
  }

  function playBreak(mixer, material, intensity, distance01) {
    var r = RECIPES[familyOf(material)];
    blip(mixer, { wave: r.wave, baseHz: r.baseHz * 0.7, slideTo: Math.max(20, r.slideTo * 0.6), noiseMs: r.noiseMs * 2, noiseHz: r.noiseHz, decay: r.decay * 1.6 },
      intensity == null ? 1 : intensity, distance01, 'world');
  }

  root.GraveGain2dBAudioMaterials = {
    FAMILIES: FAMILIES,
    RECIPES: RECIPES,
    familyOf: familyOf,
    playImpact: playImpact,
    playCrack: playCrack,
    playBreak: playBreak
  };
})(typeof window !== 'undefined' ? window : globalThis);
