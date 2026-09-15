'use strict';
/* GraveGain2dB audio — facade wiring channels + material families +
 * 5-stage collapse + 6-layer music into one handle for the integrator.
 * Convenience one-shots (shoot/explosion/pickup/rescue/ui) route to the
 * right channel with content-mode softening (kid mode drops harsh noise).
 * Global: window.GraveGain2dBAudio
 */
(function (root) {
  function createAudio(opts) {
    opts = opts || {};
    var Ch = root.GraveGain2dBAudioChannels;
    var Collapse = root.GraveGain2dBAudioCollapse;
    var Music = root.GraveGain2dBAudioMusic;
    var mixer = Ch ? Ch.createMixer() : null;
    return {
      mixer: mixer,
      collapse: Collapse ? Collapse.createCollapseState() : null,
      music: Music ? Music.createMusic() : null,
      mode: opts.mode || 'teen', // kid | teen | adults
      resume: function () { return Ch ? Ch.resume(mixer) : null; },
      setMode: function (m) { this.mode = m; return m; }
    };
  }

  function shoot(audio, weapon) {
    if (!audio.mixer || !audio.mixer.ctx) return null;
    var Ch = root.GraveGain2dBAudioChannels;
    var dest = Ch.channelNode(audio.mixer, 'weapons');
    if (!dest) return null;
    var harsh = audio.mode === 'kid' ? 0.4 : 1;
    pew(audio.mixer, dest, weapon === 'scatter' ? 300 : 700, harsh);
    return { kind: 'shoot', weapon: weapon };
  }

  function pew(mixer, dest, hz, vol) {
    var t = mixer.ctx.currentTime;
    var osc = mixer.ctx.createOscillator();
    var g = mixer.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(hz, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, hz * 0.3), t + 0.09);
    g.gain.setValueAtTime(0.25 * vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  function explosion(audio, size01, distance01) {
    if (!audio.mixer || !audio.mixer.ctx) return null;
    var Mats = root.GraveGain2dBAudioMaterials;
    var Collapse = root.GraveGain2dBAudioCollapse;
    if (Mats) Mats.playBreak(audio.mixer, 'stone', 0.6 + (size01 || 0.5) * 0.4, distance01);
    if (Collapse) Collapse.playStage(audio.mixer, audio.collapse, '__oneshot', 4, { intensity: 0.9, distance01: distance01 }, 0);
    return { kind: 'explosion', size: size01 || 0.5 };
  }

  function impact(audio, material, intensity, distance01) {
    var Mats = root.GraveGain2dBAudioMaterials;
    if (!Mats || !audio.mixer) return null;
    Mats.playImpact(audio.mixer, material, intensity, distance01);
    return { kind: 'impact', material: material };
  }

  function collapseStage(audio, groupId, stageIdx, opts, nowMs) {
    var Collapse = root.GraveGain2dBAudioCollapse;
    if (!Collapse || !audio.mixer) return null;
    return Collapse.playStage(audio.mixer, audio.collapse, groupId, stageIdx, opts, nowMs);
  }

  function pickup(audio) {
    if (!audio.mixer || !audio.mixer.ctx) return null;
    var Ch = root.GraveGain2dBAudioChannels;
    var dest = Ch.channelNode(audio.mixer, 'ui');
    if (!dest) return null;
    ding(audio.mixer, dest, 660);
    ding(audio.mixer, dest, 880, 0.09);
    return { kind: 'pickup' };
  }

  function rescue(audio) {
    if (!audio.mixer || !audio.mixer.ctx) return null;
    var Ch = root.GraveGain2dBAudioChannels;
    var dest = Ch.channelNode(audio.mixer, 'ui');
    if (!dest) return null;
    ding(audio.mixer, dest, 523.25);
    ding(audio.mixer, dest, 659.25, 0.12);
    ding(audio.mixer, dest, 783.99, 0.24);
    return { kind: 'rescue' };
  }

  function ding(mixer, dest, hz, delay) {
    var t = mixer.ctx.currentTime + (delay || 0);
    var osc = mixer.ctx.createOscillator();
    var g = mixer.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = hz;
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  function uiClick(audio) {
    if (!audio.mixer || !audio.mixer.ctx) return null;
    var Ch = root.GraveGain2dBAudioChannels;
    var dest = Ch.channelNode(audio.mixer, 'ui');
    if (!dest) return null;
    ding(audio.mixer, dest, 440);
    return { kind: 'ui' };
  }

  function setMood(audio, mood) {
    var Music = root.GraveGain2dBAudioMusic;
    if (!Music || !audio.mixer) return null;
    return Music.setMood(audio.mixer, audio.music, mood);
  }

  root.GraveGain2dBAudio = {
    createAudio: createAudio,
    shoot: shoot,
    explosion: explosion,
    impact: impact,
    collapseStage: collapseStage,
    pickup: pickup,
    rescue: rescue,
    uiClick: uiClick,
    setMood: setMood
  };
})(typeof window !== 'undefined' ? window : globalThis);
