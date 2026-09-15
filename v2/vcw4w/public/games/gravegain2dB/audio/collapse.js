'use strict';
/* GraveGain2dB audio — 5-stage collapse audio. Mirrors the support-group
 * lifecycle (stable -> damaged -> unstable -> collapsing -> collapsed):
 *   0 groan   low stressed creak bed while damaged
 *   1 crack   sharp transient when damage crosses a threshold
 *   2 creak   wobble-loop warning while unstable (⚠️ UNSTABLE is showing)
 *   3 rumble  rising filtered-noise fall while collapsing
 *   4 boom    impact + settling tail on collapse
 * One state per support-group id; stage calls are idempotent and ordered.
 * Global: window.GraveGain2dBAudioCollapse
 */
(function (root) {
  var STAGES = ['groan', 'crack', 'creak', 'rumble', 'boom'];

  function createCollapseState() {
    return { groups: {} }; // groupId -> { stage, startedAt }
  }

  function groupStage(state, groupId) {
    var g = state.groups[groupId];
    return g ? g.stage : -1;
  }

  // Advance groupId to stageIdx (0-4); replays only when moving forward
  // (or when force=true, e.g. repeated crack hits).
  function playStage(mixer, state, groupId, stageIdx, opts, nowMs) {
    opts = opts || {};
    var prev = groupStage(state, groupId);
    if (stageIdx <= prev && !opts.force) return null;
    var g = state.groups[groupId] || (state.groups[groupId] = {});
    g.stage = stageIdx;
    g.startedAt = nowMs || 0;
    var stage = STAGES[stageIdx];
    if (!stage) return null;
    if (!mixer.ctx) return { group: groupId, stage: stage, silent: true };
    var Mats = root.GraveGain2dBAudioMaterials;
    var Ch = root.GraveGain2dBAudioChannels;
    var material = opts.material || 'stone';
    var dist = opts.distance01 || 0;
    var inten = opts.intensity == null ? 0.8 : opts.intensity;
    if (stage === 'groan' && Mats) Mats.playImpact(mixer, material, inten * 0.4, dist);
    if (stage === 'crack' && Mats) Mats.playCrack(mixer, material, inten, dist);
    if (stage === 'creak' && Mats) Mats.playCrack(mixer, material, inten * 0.55, dist);
    if (stage === 'rumble' && Ch) rumble(mixer, Ch, inten, dist, 1.1);
    if (stage === 'boom' && Mats) {
      Mats.playBreak(mixer, material, inten, dist);
      if (Ch) rumble(mixer, Ch, inten * 0.8, dist, 0.7);
    }
    return { group: groupId, stage: stage };
  }

  function rumble(mixer, Ch, intensity, distance01, dur) {
    var dest = Ch.channelNode(mixer, 'world');
    if (!dest) return;
    var t = mixer.ctx.currentTime;
    var vol = Math.max(0.001, intensity * Ch.positionalGain(distance01));
    var len = Math.floor(mixer.ctx.sampleRate * dur);
    var buf = mixer.ctx.createBuffer(1, len, mixer.ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      var env = Math.sin((i / len) * Math.PI); // swell then settle
      data[i] = (Math.random() * 2 - 1) * env;
    }
    var src = mixer.ctx.createBufferSource();
    src.buffer = buf;
    var filt = mixer.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(160, t);
    filt.frequency.exponentialRampToValueAtTime(60, t + dur);
    var g = mixer.ctx.createGain();
    g.gain.setValueAtTime(vol * 0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(dest);
    src.start(t);
  }

  function resetGroup(state, groupId) {
    delete state.groups[groupId];
  }

  root.GraveGain2dBAudioCollapse = {
    STAGES: STAGES,
    createCollapseState: createCollapseState,
    groupStage: groupStage,
    playStage: playStage,
    resetGroup: resetGroup
  };
})(typeof window !== 'undefined' ? window : globalThis);
