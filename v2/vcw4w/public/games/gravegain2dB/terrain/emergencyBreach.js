"use strict";
// GraveGain2dB Terrain — Valley-Net 5s emergency-breach fallback.
// If the player is trapped (no path to objective for 5s), fire dialogue hook,
// carve a one-way shaft to the objective, apply score penalty. Never soft-locks.
(function (global) {
  var TRAP_TIMEOUT_MS = 5000;
  var PENALTY = 250;

  function createMonitor() {
    return { trappedSince: null, breached: false, penaltyApplied: 0 };
  }

  // isReachable: () => boolean. nowMs: ms timestamp.
  // hooks: { onDialogue(monitor), onBreach(monitor, shaftCells), onPenalty(monitor, amount) }
  function update(monitor, isReachable, nowMs, hooks) {
    hooks = hooks || {};
    if (monitor.breached) return { state: "breached", fired: false };
    var ok = false;
    try { ok = !!isReachable(); } catch (e) { ok = false; }
    if (ok) {
      monitor.trappedSince = null;
      return { state: "ok", fired: false };
    }
    if (monitor.trappedSince === null) {
      monitor.trappedSince = nowMs;
      return { state: "trapped", fired: false };
    }
    if (nowMs - monitor.trappedSince >= TRAP_TIMEOUT_MS) {
      if (hooks.onDialogue) hooks.onDialogue(monitor);
      return { state: "breach-due", fired: true };
    }
    return { state: "trapped", fired: false };
  }

  // Carve vertical one-way shaft at shaftX from fromY toward toY.
  // Returns carved cells. One-way enforced by caller via nav (down-only).
  function breach(chunk, cellsApi, shaftX, fromY, toY) {
    var carved = [];
    var step = toY >= fromY ? 1 : -1;
    for (var y = fromY; step > 0 ? y <= toY : y >= toY; y += step) {
      var c = cellsApi.getCell(chunk, shaftX, y);
      if (!c) continue;
      if (c.missionProtected || c.material === "protected" || c.material === "barrier") continue;
      c.destroyed = true;
      c.collision = "none";
      c.hazardOnBreak = null;
      carved.push({ x: c.x, y: c.y });
    }
    return carved;
  }

  function applyPenalty(scoreState) {
    var s = scoreState || { score: 0 };
    s.score -= PENALTY;
    return { score: s.score, penalty: PENALTY };
  }

  // Full fallback: dialogue hook -> shaft -> penalty. Returns report.
  function runFallback(monitor, chunk, cellsApi, opts, hooks) {
    hooks = hooks || {};
    if (hooks.onDialogue) hooks.onDialogue(monitor, "valley-net-emergency-breach");
    var carved = breach(chunk, cellsApi, opts.shaftX, opts.fromY, opts.toY);
    if (hooks.onBreach) hooks.onBreach(monitor, carved);
    var pen = applyPenalty(opts.scoreState);
    monitor.breached = true;
    monitor.penaltyApplied = pen.penalty;
    if (hooks.onPenalty) hooks.onPenalty(monitor, pen.penalty);
    return { carved: carved, penalty: pen.penalty, breached: true };
  }

  var api = {
    TRAP_TIMEOUT_MS: TRAP_TIMEOUT_MS,
    PENALTY: PENALTY,
    createMonitor: createMonitor,
    update: update,
    breach: breach,
    applyPenalty: applyPenalty,
    runFallback: runFallback
  };

  global.GraveGain2dBTerrainEmergency = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
