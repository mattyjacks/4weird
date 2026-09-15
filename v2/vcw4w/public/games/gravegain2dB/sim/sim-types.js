/* GraveGain2dB sim types + shared constants (pure data, zero logic).
 *
 * Part of the 2dB deterministic simulation layer:
 *   sim/sim-types.js   (this file: constants + type docs, no logic)
 *   sim/sim-core.js    (entity storage, fixed 60Hz 12-phase step, RNG, snapshots)
 *   sim/sim-determinism-fixture.js (replay fixture + self-test notes)
 *
 * Load order: independent. This file reads live values from
 * window.GraveGain2dBSimCore when it is already loaded and otherwise falls
 * back to the same literals, so the two files can never disagree at runtime.
 * Netcode (lib/gravegain2dB-net.ts + public/games/gravegain2dB/net/) should
 * treat the typedefs below as the wire contract: InputFrame on the wire at
 * 60Hz, RoomSnapshot at 20Hz, SnapshotDelta for chunk/entity deltas.
 *
 * Purity: this file touches no DOM, no render contexts, no audio, no net I/O,
 * no storage, and uses no clock or entropy source. The ONLY host-global
 * reference allowed in sim/ is the guarded registration at the bottom.
 * Style: vanilla IIFE + 'use strict', matching gravegain2dA/game.js.
 */
(function () {
  'use strict';

  var core = null;
  try {
    if (typeof window !== 'undefined' && window.GraveGain2dBSimCore) {
      core = window.GraveGain2dBSimCore;
    }
  } catch (err) { core = null; }

  function pick(coreValue, fallback) {
    return (core && coreValue !== undefined && coreValue !== null) ? coreValue : fallback;
  }

  // ---- fixed timestep -------------------------------------------------------
  var TICK_HZ = pick(core && core.TICK_HZ, 60);
  var DT = pick(core && core.DT, 1 / 60);

  // ---- perf budgets (docs/gravegain2dB-game-spec.md acceptance targets) -----
  var BUDGETS = pick(core && core.BUDGETS, {
    MAX_PLAYERS: 4,
    MAX_ENEMIES: 40,
    MAX_PROJECTILES: 80,
    MAX_DEBRIS: 250,
    MAX_PICKUPS: 20,
    MAX_COLLAPSES: 6,
    MAX_DIRTY_CHUNKS: 16
  });

  // ---- input button bitmask (fits in 16 bits; wire-safe integer) ------------
  var BUTTON = pick(core && core.BUTTON, {
    LEFT: 1,
    RIGHT: 2,
    UP: 4,
    DOWN: 8,
    JUMP: 16,
    FIRE: 32,
    ALT: 64,
    DASH: 128,
    INTERACT: 256,
    SWAP1: 512,
    SWAP2: 1024,
    SWAP3: 2048,
    PAUSE: 4096
  });

  // ---- movement feel timings, in ticks (spec table: coyote 120ms, buffer 150ms)
  var TIMING_TICKS = pick(core && core.TIMING_TICKS, {
    COYOTE_TICKS: 7,
    JUMP_BUFFER_TICKS: 9,
    DASH_BUFFER_TICKS: 6,
    DASH_IFRAME_TICKS: 8,
    DASH_TICKS: 6
  });

  // ---- support lifecycle stages (terrain lane owns behavior; sim routes ids) -
  var SUPPORT_STAGES = [
    'stable',
    'damaged',
    'unstable',
    'collapsing',
    'collapsed',
    'cleanup'
  ];

  // ---- material ids referenced by terrain damage hooks -----------------------
  // The terrain lane (public/games/gravegain2dB/terrain/) owns material
  // behavior. Ids below mirror the spec's world-materials table so sim-side
  // damage calls and terrain-side handling spell names the same way.
  var MATERIALS = [
    'wood',
    'stone',
    'scrap',
    'crystal',
    'necro',
    'barrier'
  ];

  // ---- sim event types (world.events entries + snapshot.stats counters) -----
  var EVENTS = [
    'player-fired',
    'player-dashed',
    'player-jumped',
    'player-hurt',
    'player-down',
    'player-revived',
    'enemy-spawned',
    'enemy-killed',
    'projectile-impact',
    'projectile-expired',
    'damage-dealt',
    'terrain-damaged',
    'terrain-destroyed',
    'support-stage',
    'collapse-warning',
    'collapse-started',
    'pickup-spawned',
    'pickup-taken',
    'rescue-started',
    'rescue-done',
    'civilian-down',
    'objective-progress',
    'objective-done',
    'checkpoint',
    'debris-culled',
    'dirty-chunk-capped'
  ];

  /**
   * @typedef {Object} InputFrame
   * One player's input for exactly one sim tick. Produced at 60Hz by the
   * input lane, consumed by sim phase 1. All fields are plain JSON numbers.
   * @property {number} tick    Sim tick this frame applies to.
   * @property {number} player  Player slot 0..3.
   * @property {number} buttons Bitmask of BUTTON bits (unknown bits dropped).
   * @property {number} aimX    Aim direction x (-1..1, NaN coerced to 0).
   * @property {number} aimY    Aim direction y (-1..1, NaN coerced to 0).
   */

  /**
   * @typedef {Object} TerrainCell
   * Owned by the terrain lane; repeated here so snapshots stay readable.
   * 16x16 chunk grid cells addressed by integer cx, cy.
   * @property {number} cx        Chunk x index.
   * @property {number} cy        Chunk y index.
   * @property {string} material  One of MATERIALS ('barrier' = force barrier).
   * @property {number} hp        Remaining cell health (>= 0).
   * @property {boolean} solid     Currently collidable.
   * @property {boolean} protected Mission-critical cell: damage refused.
   * @property {string} supportStage One of SUPPORT_STAGES for supported cells.
   */

  /**
   * @typedef {Object} TerrainHooks
   * Injected interface the terrain lane provides to the sim. Every method is
   * optional; the sim falls back to flat ground (y >= 0 solid) when absent.
   * @property {function(number, number): boolean} [isSolidAt]
   *   Point solidity probe in world units. Must be deterministic.
   * @property {function(number, number, number, string): Object} [damageAt]
   *   Apply damage at a world point; returns {destroyed, stage} or null.
   * @property {function(): Array} [drainDirtyChunks]
   *   Changed chunk ids since last call (sim caps stored list at 16).
   */

  /**
   * @typedef {Object} WeaponDef
   * Data-driven weapon behavior executed by sim phases 6-8. Content (which
   * weapons exist) is owned by the arsenal lane; the sim only executes fields.
   * @property {string} id
   * @property {number} damage       Per-hit damage.
   * @property {number} projectileSpeed World units per second.
   * @property {number} cooldownTicks Ticks between shots.
   * @property {number} [pierce]     Entity hits before despawn (default 0).
   * @property {number} [lifeTicks]  Projectile lifetime (default 90).
   * @property {number} [terrainDamage] Damage dealt to terrain per hit.
   * @property {number} [kickback]   Self-knockback applied on fire.
   * @property {boolean} [explosive] Impact applies radius damage.
   * @property {number} [radius]     Explosion radius when explosive.
   */

  /**
   * @typedef {Object} RoomSnapshot
   * Full authoritative room state for one tick. Emitted at 20Hz to clients;
   * also the unit of save/reconnect bundles and determinism hashing.
   * @property {number} tick
   * @property {string} seed   Normalized world seed ('vr-' + base36).
   * @property {Array} players  Alive + downed player states (slot order).
   * @property {Array} enemies  Live enemy states (spawn-id order).
   * @property {Array} projectiles Live projectile states (spawn-id order).
   * @property {Array} pickups  Live pickup states (spawn-id order).
   * @property {number} debrisCount Live debris particles (capped at 250).
   * @property {Array<number>} dirtyChunks Changed chunk ids (capped at 16).
   * @property {Object} stats   Counters: kills, shotsFired, terrainBroken, etc.
   */

  /**
   * @typedef {Object} SnapshotDelta
   * Minimal diff between two RoomSnapshots (tickFrom -> tickTo): changed
   * entity rows keyed by id plus removals. Clients interpolate from these.
   * @property {number} tickFrom
   * @property {number} tickTo
   * @property {Array} changedPlayers
   * @property {Array} changedEnemies
   * @property {Array} changedProjectiles
   * @property {Array} changedPickups
   * @property {Array<number>} removedEnemies
   * @property {Array<number>} removedProjectiles
   * @property {Array<number>} removedPickups
   * @property {Array<number>} dirtyChunks
   */

  var api = {
    TICK_HZ: TICK_HZ,
    DT: DT,
    BUDGETS: BUDGETS,
    BUTTON: BUTTON,
    TIMING_TICKS: TIMING_TICKS,
    SUPPORT_STAGES: SUPPORT_STAGES,
    MATERIALS: MATERIALS,
    EVENTS: EVENTS
  };

  try {
    if (typeof window !== 'undefined') {
      window.GraveGain2dBSimTypes = api;
    }
  } catch (err) { /* non-browser host: consumers use the module export below */ }

  try {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = api;
    }
  } catch (err) { /* browser-only host: window registration above applies */ }
})();
