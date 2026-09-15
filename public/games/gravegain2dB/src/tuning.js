/* GraveGain2dB sim — tuning.js (A3 lane)
 * Pure data: movement, pools, chunks, collapse, arena.
 * No host APIs here: no timers, no rng calls, no rendering handles.
 * Idempotent: safe to load twice or alongside game.js (same guard shape).
 */
(function () {
  'use strict';

  var NS = globalThis.GraveGain2dBSim = globalThis.GraveGain2dBSim || {};
  if (NS.TUNING && NS.ARENA) {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = { TUNING: NS.TUNING, ARENA: NS.ARENA };
    }
    return;
  }

  // Movement physics (px / seconds).
  // run 260px/s, jump 560, gravity 1800, dash 700 for 0.14s with 0.9s cooldown,
  // coyote 0.12s, jump buffer 0.15s.
  var TUNING = {
    TILE: 32,
    RUN_SPEED: 260,
    JUMP_VEL: 560,
    GRAVITY: 1800,
    MAX_FALL: 900,
    AIR_STEER: 0.8,
    DASH_SPEED: 700,
    DASH_TIME: 0.14,
    DASH_CD: 0.9,
    DASH_IFRAMES: 0.2,
    COYOTE: 0.12,
    JUMP_BUFFER: 0.15,
    FIXED_DT: 1 / 60,
    MAX_DT: 1 / 20,

    // Object pools (hard budgets per spec / acceptance criteria).
    POOL_PROJ: 80,
    POOL_DEBRIS: 250,
    POOL_PICKUP: 20,
    MAX_ENEMIES_ZONE: 40,

    // Terrain chunks: 16x16 cells, at most 16 dirty chunks flushed per second.
    CHUNK: 16,
    DIRTY_PER_SEC: 16,

    // Collapse: 2-step warning before a large drop.
    WARN_STAGE1_T: 1.2, // cracks + dust + wobble, tag shows UNSTABLE
    WARN_STAGE2_T: 0.6, // imminent: heavy shake, collapse follows at 0
    DAMAGE_PER_TICK_CAP: 64, // queued damage events applied per step

    // Anti-softlock: player fully enclosed this long -> breach shaft overhead.
    TRAPPED_BREACH_T: 5.0,
    BREACH_SHAFT_MAX_H: 32
  };

  // Launch-slice arena (tile units + derived px units, spawn in px).
  var TILE = TUNING.TILE;
  var ARENA = {
    TILES_W: 120,
    TILES_H: 34,
    TILE: TILE,
    PX_W: 120 * TILE,
    PX_H: 34 * TILE,
    SPAWN: { x: 3 * TILE, y: 26 * TILE },
    EXTRACT: { tx: 115, ty: 26 },
    GROUND_ROW: 29 // rows at/after this are solid ground by default builder
  };

  NS.TUNING = TUNING;
  NS.ARENA = ARENA;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TUNING: TUNING, ARENA: ARENA };
  }
})();
