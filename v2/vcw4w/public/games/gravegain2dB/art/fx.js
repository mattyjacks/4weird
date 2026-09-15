'use strict';
/* GraveGain2dB emoji art — feel effects: squash & stretch, screen shake
 * hooks, muzzle flash, material debris bursts, instability warning tags.
 * State is per-sprite spring data + a transient transient-fx list the
 * integrator drains into the debris/particle pools each frame.
 * Global: window.GraveGain2dBArtFx
 */
(function (root) {
  function createSpriteFx() {
    return { sx: 1, sy: 1, vx: 0, vy: 0, rot: 0, vr: 0, flash: 0 };
  }

  // Classic squash (land) / stretch (jump/dash) kicks.
  function squash(st, amount) {
    st.vx -= amount; st.vy += amount;
  }
  function stretch(st, amount) {
    st.vx += amount; st.vy -= amount;
  }
  function kickSprite(st, angle, power) {
    var p = (power || 60) / 900;
    st.vx += Math.cos(angle) * p;
    st.vy += Math.sin(angle) * p;
    st.vr += (Math.random() - 0.5) * 2 * p;
  }
  function muzzleKick(st) {
    st.vx -= 0.25; st.flash = 1;
  }

  // Spring back to (1,1) every frame; call with fixed dt.
  function updateSprite(st, dt) {
    var stiff = 180, damp = 12;
    st.vx += ((1 - st.sx) * stiff - st.vx * damp) * dt;
    st.vy += ((1 - st.sy) * stiff - st.vy * damp) * dt;
    st.sx += st.vx * dt * 10;
    st.sy += st.vy * dt * 10;
    st.rot += st.vr * dt;
    st.vr *= (1 - Math.min(1, dt * 8));
    if (st.flash > 0) st.flash = Math.max(0, st.flash - dt * 10);
    return st;
  }

  // Transient fx queue: drained by the renderer into pools + camera.
  function createFxQueue() { return []; }

  // Muzzle flash hook — called synchronously from AimFire.tryFire.
  // The queue entry carries everything pools need; camera trauma is
  // applied by the lab/integrator via shakeFor().
  function emitMuzzle(queue, x, y, angle, weapon) {
    queue.push({ kind: 'muzzle', x: x, y: y, angle: angle, weapon: weapon, ttl: 0.06 });
    return queue[queue.length - 1];
  }

  function shakeFor(kind) {
    if (kind === 'launcher' || kind === 'grenade') return 0.3;
    if (kind === 'scatter') return 0.12;
    return 0.03;
  }

  // Material debris burst hook — terrain layer calls this on cell break.
  function emitDebrisBurst(queue, material, x, y, count, power) {
    queue.push({
      kind: 'debris', material: material, x: x, y: y,
      count: count || 6, power: power || 260, ttl: 1.1
    });
  }

  function emitPoof(queue, x, y, mode) {
    queue.push({ kind: 'poof', x: x, y: y, mode: mode || 'teen', ttl: 0.4 });
  }

  // Brief on-structure tag; the HUD draws it via drawWarningTag.
  function emitUnstable(queue, x, y, stage) {
    queue.push({ kind: 'unstable', x: x, y: y, stage: stage, ttl: 1.2 });
  }

  function updateQueue(queue, dt) {
    for (var i = queue.length - 1; i >= 0; i--) {
      queue[i].ttl -= dt;
      if (queue[i].ttl <= 0) queue.splice(i, 1);
    }
    return queue;
  }

  // Canvas helper: `⚠️ UNSTABLE` tag directly on the structure.
  function drawWarningTag(ctx, atlas, x, y, text) {
    if (!ctx || !atlas) return;
    ctx.save();
    ctx.font = 'bold 13px system-ui,sans-serif';
    ctx.textAlign = 'center';
    var label = '⚠️ ' + (text || 'UNSTABLE');
    var w = ctx.measureText(label).width + 14;
    ctx.fillStyle = 'rgba(20,8,8,0.82)';
    ctx.fillRect(x - w / 2, y - 30, w, 20);
    ctx.strokeStyle = '#ffb020';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - w / 2, y - 30, w, 20);
    ctx.fillStyle = '#ffd870';
    ctx.fillText(label, x, y - 15);
    ctx.restore();
  }

  function reducedMotion(opts) {
    return !!(opts && (opts.reducedFlash || opts.reducedShake));
  }

  root.GraveGain2dBArtFx = {
    createSpriteFx: createSpriteFx,
    squash: squash,
    stretch: stretch,
    kickSprite: kickSprite,
    muzzleKick: muzzleKick,
    updateSprite: updateSprite,
    createFxQueue: createFxQueue,
    emitMuzzle: emitMuzzle,
    shakeFor: shakeFor,
    emitDebrisBurst: emitDebrisBurst,
    emitPoof: emitPoof,
    emitUnstable: emitUnstable,
    updateQueue: updateQueue,
    drawWarningTag: drawWarningTag,
    reducedMotion: reducedMotion
  };
})(typeof window !== 'undefined' ? window : globalThis);
