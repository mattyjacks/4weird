'use strict';
/* GraveGain2dB audio — 6 dynamic music layers mixed by game mood:
 *   drums / bass / arp (pulse lead) / tension / rescue / boss
 * setMood({ combat, tension, rescue, boss }) fades layer gains; an
 * explicit start/stop step sequencer (112 BPM, 8 steps) drives drums +
 * bass + arp with tiny osc patterns. Silent until mixer.resume().
 * Global: window.GraveGain2dBAudioMusic
 */
(function (root) {
  var LAYERS = ['drums', 'bass', 'arp', 'tension', 'rescue', 'boss'];
  var STEP_MS = 60000 / 112 / 2; // 8th notes at 112 BPM

  function createMusic() {
    return {
      gains: { drums: 0, bass: 0, arp: 0, tension: 0, rescue: 0, boss: 0 },
      nodes: {}, // layer -> GainNode (built on start)
      playing: false,
      step: 0,
      timer: null,
      mood: { combat: 0, tension: 0, rescue: 0, boss: 0 }
    };
  }

  // Mood weights 0..1 -> per-layer target gains.
  function setMood(mixer, music, mood) {
    music.mood = {
      combat: clamp01(mood.combat), tension: clamp01(mood.tension),
      rescue: clamp01(mood.rescue), boss: clamp01(mood.boss)
    };
    var m = music.mood;
    var targets = {
      drums: Math.max(m.combat, m.boss),
      bass: Math.max(m.combat * 0.9, m.boss),
      arp: Math.max(m.combat * 0.6, m.rescue * 0.5),
      tension: m.tension,
      rescue: m.rescue * (1 - m.boss * 0.7),
      boss: m.boss
    };
    for (var i = 0; i < LAYERS.length; i++) {
      var l = LAYERS[i];
      music.gains[l] = targets[l];
      var node = music.nodes[l];
      if (node && mixer.ctx) {
        node.gain.setTargetAtTime(targets[l] * 0.5, mixer.ctx.currentTime, 0.4);
      }
    }
    return targets;
  }

  function clamp01(v) {
    v = (v == null ? 0 : v);
    return Math.max(0, Math.min(1, v));
  }

  function start(mixer, music) {
    if (music.playing || !mixer.ctx) return false;
    var Ch = root.GraveGain2dBAudioChannels;
    var dest = (Ch && Ch.channelNode(mixer, 'music')) || null;
    if (!dest) return false;
    for (var i = 0; i < LAYERS.length; i++) {
      var g = mixer.ctx.createGain();
      g.gain.value = music.gains[LAYERS[i]] * 0.5;
      g.connect(dest);
      music.nodes[LAYERS[i]] = g;
    }
    music.playing = true;
    music.step = 0;
    function tick() {
      if (!music.playing) return;
      scheduleStep(mixer, music, music.step % 8);
      music.step++;
      music.timer = setTimeout(tick, STEP_MS);
    }
    tick();
    return true;
  }

  function stop(music) {
    music.playing = false;
    if (music.timer) { clearTimeout(music.timer); music.timer = null; }
    music.nodes = {};
  }

  var BASS_LINE = [55, 55, 65.4, 55, 49, 55, 73.4, 65.4];
  var ARP_LINE = [220, 261.6, 329.6, 261.6, 220, 329.6, 392, 329.6];

  function scheduleStep(mixer, music, s) {
    var t = mixer.ctx.currentTime;
    if (music.gains.drums > 0.02 && s % 2 === 0) {
      kick(mixer, music.nodes.drums, t, 0.5 * music.gains.drums);
    }
    if (music.gains.drums > 0.02 && s === 4) {
      kick(mixer, music.nodes.drums, t, 0.7 * music.gains.drums);
    }
    if (music.gains.bass > 0.02) {
      tone(mixer, music.nodes.bass, t, BASS_LINE[s], 'sawtooth', STEP_MS / 1000 * 0.9, 0.25 * music.gains.bass);
    }
    if (music.gains.arp > 0.02) {
      tone(mixer, music.nodes.arp, t, ARP_LINE[s], 'square', 0.12, 0.12 * music.gains.arp);
    }
    if (music.gains.boss > 0.02 && s === 0) {
      tone(mixer, music.nodes.boss, t, 36.7, 'sawtooth', 0.5, 0.5 * music.gains.boss);
    }
    if (music.gains.tension > 0.02) {
      tone(mixer, music.nodes.tension, t, 440 + s * 7, 'sine', 0.25, 0.08 * music.gains.tension);
    }
    if (music.gains.rescue > 0.02 && s % 4 === 2) {
      tone(mixer, music.nodes.rescue, t, 523.25, 'triangle', 0.3, 0.2 * music.gains.rescue);
      tone(mixer, music.nodes.rescue, t + 0.13, 659.25, 'triangle', 0.3, 0.2 * music.gains.rescue);
    }
  }

  function kick(mixer, dest, t, vol) {
    var osc = mixer.ctx.createOscillator();
    var g = mixer.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.12);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  function tone(mixer, dest, t, hz, wave, dur, vol) {
    var osc = mixer.ctx.createOscillator();
    var g = mixer.ctx.createGain();
    osc.type = wave;
    osc.frequency.value = hz;
    g.gain.setValueAtTime(Math.max(0.001, vol), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  root.GraveGain2dBAudioMusic = {
    LAYERS: LAYERS,
    STEP_MS: STEP_MS,
    createMusic: createMusic,
    setMood: setMood,
    start: start,
    stop: stop
  };
})(typeof window !== 'undefined' ? window : globalThis);
