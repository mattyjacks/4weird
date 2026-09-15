'use strict';
/* GraveGain2dB audio — 5-channel mixer (weapons / world / music / ui /
 * ambient) under one master. Lazy AudioContext: every op is a safe no-op
 * until resume() runs on a user gesture. No assets, all synthesized.
 * Global: window.GraveGain2dBAudioChannels
 */
(function (root) {
  var CHANNELS = ['weapons', 'world', 'music', 'ui', 'ambient'];

  var DEFAULT_GAINS = {
    weapons: 0.8, world: 0.85, music: 0.6, ui: 0.5, ambient: 0.5
  };

  function createMixer() {
    return {
      ctx: null,
      master: null,
      gains: {}, // name -> GainNode
      muted: {},
      volumes: Object.assign({}, DEFAULT_GAINS)
    };
  }

  // Must be called from a user gesture at least once.
  function resume(mixer) {
    var AC = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) || null;
    if (!AC) return null;
    if (!mixer.ctx) {
      mixer.ctx = new AC();
      mixer.master = mixer.ctx.createGain();
      mixer.master.gain.value = 1;
      mixer.master.connect(mixer.ctx.destination);
      for (var i = 0; i < CHANNELS.length; i++) {
        var g = mixer.ctx.createGain();
        g.gain.value = mixer.volumes[CHANNELS[i]];
        g.connect(mixer.master);
        mixer.gains[CHANNELS[i]] = g;
      }
    }
    if (mixer.ctx.state === 'suspended') mixer.ctx.resume();
    return mixer.ctx;
  }

  function setVolume(mixer, name, v) {
    mixer.volumes[name] = v;
    var g = mixer.gains[name];
    if (g && mixer.ctx) g.gain.setTargetAtTime(mixer.muted[name] ? 0 : v, mixer.ctx.currentTime, 0.02);
  }

  function mute(mixer, name, m) {
    mixer.muted[name] = !!m;
    setVolume(mixer, name, mixer.volumes[name]);
  }

  function muteAll(mixer, m) {
    if (mixer.master && mixer.ctx) {
      mixer.master.gain.setTargetAtTime(m ? 0 : 1, mixer.ctx.currentTime, 0.02);
    }
    mixer.masterMuted = !!m;
  }

  function channelNode(mixer, name) {
    return mixer.gains[name] || null;
  }

  // Positional attenuation helper: distance01 0 (near) .. 1 (far).
  function positionalGain(distance01) {
    var d = Math.max(0, Math.min(1, distance01 || 0));
    return (1 - d) * (1 - d);
  }

  root.GraveGain2dBAudioChannels = {
    CHANNELS: CHANNELS,
    DEFAULT_GAINS: DEFAULT_GAINS,
    createMixer: createMixer,
    resume: resume,
    setVolume: setVolume,
    mute: mute,
    muteAll: muteAll,
    channelNode: channelNode,
    positionalGain: positionalGain
  };
})(typeof window !== 'undefined' ? window : globalThis);
