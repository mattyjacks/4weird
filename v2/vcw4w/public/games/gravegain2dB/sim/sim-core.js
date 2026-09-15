/* GraveGain2dB sim core: pure deterministic 2D run-and-gun simulation.
 *
 * - Entity storage: preallocated pools at fixed perf budgets
 *   (4 players / 40 enemies / 80 projectiles / 250 debris / 20 pickups /
 *   6 collapses / 16 dirty chunks). No allocation happens inside step().
 * - Fixed timestep: 60Hz, DT = 1/60. The render/input lanes own all timing;
 *   the sim only counts integer ticks.
 * - Seeded RNG: xmur3 string hash + mulberry32 stream. Seeds are normalized
 *   to 'vr-' + lowercase base36 so daily/server seeds have one spelling.
 * - 12-phase update sequence, executed in order by step():
 *    1 ingest inputs      2 timers/cooldowns    3 player locomotion
 *    4 enemy steering     5 physics+collision   6 weapon fire/spawn
 *    7 projectile sweep   8 damage resolution   9 terrain/support hooks
 *   10 pickup/rescue      11 debris+cleanup     12 events/snapshot-ready
 * - Event production: every observable outcome is appended to world.events
 *   with its tick; step() returns the tick's slice for queueing/snapshots.
 * - Snapshot generation: snapshot() returns a plain-JSON RoomSnapshot;
 *   hashSnapshot() gives an FNV-1a hex digest for replay comparison;
 *   diffSnapshots() gives a SnapshotDelta; restoreSnapshot() reloads one.
 *
 * Purity contract (reviewer grep gate): no DOM, no 2D/GL context, no audio,
 * no network, no storage, no wall-clock, no unseeded entropy. The RNG is
 * passed in via the world (created from the seed). The ONLY host-global
 * references in this file are the guarded registrations at the bottom.
 * Floats use only +, -, *, /, comparisons, Math.floor/min/max/abs/sqrt
 * (correctly-rounded IEEE ops); no trig/exp/log anywhere in the sim path.
 *
 * Terrain is an INJECTED interface owned by the terrain lane
 * (public/games/gravegain2dB/terrain/): { isSolidAt, damageAt,
 * drainDirtyChunks }. All methods optional; without one the sim falls back
 * to flat ground (y >= 0 solid, nothing destructible). The sim never stores
 * terrain cells itself; it only routes damage numbers and records dirty ids.
 *
 * Style: vanilla IIFE + 'use strict', matching gravegain2dA/game.js.
 */
(function () {
  'use strict';

  // ---- fixed timestep -------------------------------------------------------
  var TICK_HZ = 60;
  var DT = 1 / 60;

  // ---- perf budgets (spec acceptance targets) --------------------------------
  var BUDGETS = {
    MAX_PLAYERS: 4,
    MAX_ENEMIES: 40,
    MAX_PROJECTILES: 80,
    MAX_DEBRIS: 250,
    MAX_PICKUPS: 20,
    MAX_COLLAPSES: 6,
    MAX_DIRTY_CHUNKS: 16
  };

  // ---- input button bitmask ---------------------------------------------------
  var BUTTON = {
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
  };
  var BUTTON_MASK = 8191;

  // ---- movement feel timings, in ticks (coyote 120ms, buffer 150ms) -----------
  var TIMING_TICKS = {
    COYOTE_TICKS: 7,
    JUMP_BUFFER_TICKS: 9,
    DASH_BUFFER_TICKS: 6,
    DASH_IFRAME_TICKS: 8,
    DASH_TICKS: 6
  };

  var VERSION = '2dB-sim-core/1.0.0';

  // ---- seeded RNG: xmur3 hash + mulberry32 stream ------------------------------
  function normalizeSeed(seed) {
    var body = String(seed === undefined || seed === null ? 'moonrock' : seed);
    if (body.slice(0, 3) === 'vr-') {
      body = body.slice(3);
    }
    body = body.toLowerCase().replace(/[^0-9a-z]/g, '');
    if (body.length === 0) {
      body = 'moonrock';
    }
    return 'vr-' + body;
  }

  function xmur3(str) {
    var h = 1779033703 ^ str.length;
    var i;
    for (i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }

  function mulberry32(a) {
    return function () {
      var t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createRng(seedString) {
    var normalized = normalizeSeed(seedString);
    var seedFn = xmur3(normalized);
    var next = mulberry32(seedFn());
    return {
      seed: normalized,
      next: next,
      range: function (lo, hi) {
        return lo + (hi - lo) * next();
      },
      int: function (lo, hi) {
        return lo + Math.floor(next() * (hi - lo + 1));
      },
      pick: function (arr) {
        if (!arr || arr.length === 0) {
          return undefined;
        }
        return arr[Math.floor(next() * arr.length)];
      }
    };
  }

  // ---- small helpers (allocation-free where it matters) -------------------------
  function clamp(v, lo, hi) {
    if (v !== v) {
      return 0;
    }
    return v < lo ? lo : v > hi ? hi : v;
  }

  function isNum(v) {
    return typeof v === 'number' && v === v;
  }

  // ---- default tunables ----------------------------------------------------------
  function defaultConfig() {
    return {
      seed: 'vr-moonrock',
      gravity: 2200,
      moveSpeed: 260,
      airControl: 0.65,
      jumpSpeed: 760,
      doubleJumpSpeed: 680,
      dashSpeed: 620,
      playerRadius: 14,
      playerHp: 100,
      enemyRadius: 14,
      rescueTicks: 90,
      magnetRadius: 46,
      pickupRadius: 20
    };
  }

  function defaultWeapons() {
    return {
      sidearm: {
        id: 'sidearm', damage: 12, projectileSpeed: 900, cooldownTicks: 9,
        pierce: 0, lifeTicks: 90, terrainDamage: 2, kickback: 0, explosive: false, radius: 0
      }
    };
  }

  function mergeConfig(base, over) {
    var out = {};
    var k;
    for (k in base) {
      if (Object.prototype.hasOwnProperty.call(base, k)) {
        out[k] = base[k];
      }
    }
    if (over) {
      for (k in over) {
        if (Object.prototype.hasOwnProperty.call(over, k) && over[k] !== undefined) {
          out[k] = over[k];
        }
      }
    }
    return out;
  }

  // ---- world construction ----------------------------------------------------------
  function makePlayer(slot) {
    return {
      id: slot, slot: slot, active: false,
      x: 0, y: 0, vx: 0, vy: 0,
      hp: 100, maxHp: 100, downed: false,
      grounded: false, coyote: 0, jumpBuffer: 0, dashBuffer: 0,
      jumpsUsed: 0, dashTick: -100000, dashDirX: 1, dashDirY: 0,
      iframes: 0, fireCooldown: 0, altCooldown: 0,
      weapon: 'sidearm', aimX: 1, aimY: 0,
      reviving: -1, reviveTicks: 0,
      kills: 0, rescues: 0
    };
  }

  function makeEnemy() {
    return {
      id: 0, alive: false, kind: 'chaser',
      x: 0, y: 0, vx: 0, vy: 0,
      hp: 30, maxHp: 30, dmg: 8,
      speed: 110, grounded: false,
      fireCooldown: 0, flash: 0
    };
  }

  function makeProjectile() {
    return {
      id: 0, alive: false, owner: -1, hostile: false,
      x: 0, y: 0, vx: 0, vy: 0,
      damage: 10, pierce: 0, life: 0,
      terrainDamage: 0, explosive: false, radius: 0,
      weaponId: ''
    };
  }

  function makeDebris() {
    return { alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, glyph: 0 };
  }

  function makePickup() {
    return {
      id: 0, alive: false, kind: 'weapon',
      x: 0, y: 0, vx: 0, vy: 0,
      weaponId: '', amount: 0, life: 0
    };
  }

  function createWorld(opts) {
    var o = opts || {};
    var cfg = mergeConfig(defaultConfig(), o.config);
    var rng = createRng(o.seed !== undefined ? o.seed : cfg.seed);
    var i;
    var world = {
      version: VERSION,
      tick: 0,
      seed: rng.seed,
      rng: rng,
      config: cfg,
      weapons: mergeConfig(defaultWeapons(), o.weapons),
      terrain: o.terrain || null,
      hooks: o.hooks || {},
      nextEnemyId: 1,
      nextProjectileId: 1,
      nextPickupId: 1,
      players: [],
      enemies: [],
      projectiles: [],
      debris: [],
      pickups: [],
      collapses: [],
      dirtyChunks: [],
      events: [],
      stats: {
        kills: 0, shotsFired: 0, hits: 0,
        terrainBroken: 0, pickupsTaken: 0, rescues: 0,
        collapses: 0, debrisCulled: 0
      }
    };
    for (i = 0; i < BUDGETS.MAX_PLAYERS; i++) {
      world.players.push(makePlayer(i));
    }
    for (i = 0; i < BUDGETS.MAX_ENEMIES; i++) {
      world.enemies.push(makeEnemy());
    }
    for (i = 0; i < BUDGETS.MAX_PROJECTILES; i++) {
      world.projectiles.push(makeProjectile());
    }
    for (i = 0; i < BUDGETS.MAX_DEBRIS; i++) {
      world.debris.push(makeDebris());
    }
    for (i = 0; i < BUDGETS.MAX_PICKUPS; i++) {
      world.pickups.push(makePickup());
    }
    var spawns = o.players || [];
    for (i = 0; i < spawns.length && i < BUDGETS.MAX_PLAYERS; i++) {
      joinPlayer(world, i, spawns[i]);
    }
    return world;
  }

  function joinPlayer(world, slot, spawn) {
    var p = world.players[slot];
    if (!p) {
      return null;
    }
    var s = spawn || {};
    p.active = true;
    p.x = isNum(s.x) ? s.x : slot * 32;
    p.y = isNum(s.y) ? s.y : 0;
    p.vx = 0;
    p.vy = 0;
    p.maxHp = isNum(s.hp) ? s.hp : world.config.playerHp;
    p.hp = p.maxHp;
    p.downed = false;
    p.weapon = typeof s.weapon === 'string' && world.weapons[s.weapon] ? s.weapon : 'sidearm';
    p.aimX = 1;
    p.aimY = 0;
    return p;
  }

  function spawnEnemy(world, def) {
    var d = def || {};
    var i, e = null;
    for (i = 0; i < world.enemies.length; i++) {
      if (!world.enemies[i].alive) {
        e = world.enemies[i];
        break;
      }
    }
    if (!e) {
      return null;
    }
    e.id = world.nextEnemyId++;
    e.alive = true;
    e.kind = typeof d.kind === 'string' ? d.kind : 'chaser';
    e.x = isNum(d.x) ? d.x : 0;
    e.y = isNum(d.y) ? d.y : 0;
    e.vx = 0;
    e.vy = 0;
    e.maxHp = isNum(d.hp) ? d.hp : 30;
    e.hp = e.maxHp;
    e.dmg = isNum(d.dmg) ? d.dmg : 8;
    e.speed = isNum(d.speed) ? d.speed : 110;
    e.grounded = false;
    e.fireCooldown = isNum(d.fireDelay) ? d.fireDelay : 30;
    e.flash = 0;
    emit(world, 'enemy-spawned', { id: e.id, kind: e.kind, x: r2(e.x), y: r2(e.y) });
    return e;
  }

  // ---- events -------------------------------------------------------------------------
  function emit(world, type, data) {
    var ev = { tick: world.tick, type: type };
    if (data) {
      for (var k in data) {
        if (Object.prototype.hasOwnProperty.call(data, k)) {
          ev[k] = data[k];
        }
      }
    }
    world.events.push(ev);
  }

  function r2(v) {
    return Math.round(v * 100) / 100;
  }

  // ---- terrain fallbacks -----------------------------------------------------------------
  function solidAt(world, x, y) {
    var t = world.terrain;
    if (t && typeof t.isSolidAt === 'function') {
      return !!t.isSolidAt(x, y);
    }
    return y >= 0;
  }

  function damageTerrain(world, x, y, amount, cause) {
    var t = world.terrain;
    if (!t || typeof t.damageAt !== 'function' || !(amount > 0)) {
      return null;
    }
    var res = null;
    try {
      res = t.damageAt(x, y, amount, cause) || null;
    } catch (err) {
      res = null;
    }
    if (res) {
      if (res.destroyed) {
        world.stats.terrainBroken++;
        emit(world, 'terrain-destroyed', { x: r2(x), y: r2(y), cause: cause || '' });
      } else {
        emit(world, 'terrain-damaged', {
          x: r2(x), y: r2(y), cause: cause || '',
          stage: res.stage || ''
        });
      }
      if (res.stage && res.supportId !== undefined) {
        emit(world, 'support-stage', {
          supportId: res.supportId, stage: res.stage, x: r2(x), y: r2(y)
        });
      }
    }
    return res;
  }

  function markDirtyChunk(world, id) {
    if (id === undefined || id === null) {
      return;
    }
    var list = world.dirtyChunks;
    var i;
    for (i = 0; i < list.length; i++) {
      if (list[i] === id) {
        return;
      }
    }
    if (list.length >= BUDGETS.MAX_DIRTY_CHUNKS) {
      emit(world, 'dirty-chunk-capped', { dropped: id });
      return;
    }
    list.push(id);
  }

  function drainTerrainDirty(world) {
    var t = world.terrain;
    if (!t || typeof t.drainDirtyChunks !== 'function') {
      return;
    }
    var ids = null;
    try {
      ids = t.drainDirtyChunks() || [];
    } catch (err) {
      ids = [];
    }
    var i;
    for (i = 0; i < ids.length; i++) {
      markDirtyChunk(world, ids[i]);
    }
  }

  // ---- input sanitizing (phase 1 helper) -----------------------------------------------------
  function sanitizeInput(raw, slot, tick) {
    var r = raw || {};
    var buttons = r.buttons | 0;
    if (buttons !== buttons) {
      buttons = 0;
    }
    buttons = buttons & BUTTON_MASK;
    var aimX = isNum(r.aimX) ? clamp(r.aimX, -1, 1) : 0;
    var aimY = isNum(r.aimY) ? clamp(r.aimY, -1, 1) : 0;
    if (aimX === 0 && aimY === 0) {
      aimX = 1;
    }
    var len = Math.sqrt(aimX * aimX + aimY * aimY);
    if (len > 0) {
      aimX /= len;
      aimY /= len;
    }
    return { tick: tick, player: slot, buttons: buttons, aimX: aimX, aimY: aimY };
  }

  // ---- damage (phase 8 helper) -------------------------------------------------------------------
  function damagePlayer(world, p, amount, cause) {
    if (!p.active || p.downed || p.iframes > 0 || !(amount > 0)) {
      return 0;
    }
    var dealt = Math.min(p.hp, amount);
    p.hp -= dealt;
    emit(world, 'damage-dealt', {
      target: 'player', id: p.id, amount: r2(dealt), cause: cause || ''
    });
    if (p.hp <= 0) {
      p.hp = 0;
      p.downed = true;
      p.vx = 0;
      p.vy = 0;
      emit(world, 'player-down', { id: p.id, cause: cause || '' });
    } else {
      emit(world, 'player-hurt', { id: p.id, hp: r2(p.hp), cause: cause || '' });
    }
    return dealt;
  }

  function damageEnemy(world, e, amount, cause, byPlayer) {
    if (!e.alive || !(amount > 0)) {
      return 0;
    }
    var dealt = Math.min(e.hp, amount);
    e.hp -= dealt;
    e.flash = 4;
    world.stats.hits++;
    emit(world, 'damage-dealt', {
      target: 'enemy', id: e.id, amount: r2(dealt), cause: cause || ''
    });
    if (e.hp <= 0) {
      e.alive = false;
      world.stats.kills++;
      if (byPlayer !== undefined && byPlayer >= 0 && world.players[byPlayer]) {
        world.players[byPlayer].kills++;
      }
      emit(world, 'enemy-killed', {
        id: e.id, kind: e.kind, x: r2(e.x), y: r2(e.y),
        by: byPlayer === undefined ? -1 : byPlayer
      });
      spawnDebris(world, e.x, e.y, 6, 1);
    }
    return dealt;
  }

  // ---- debris pool (phase 11 helper) -----------------------------------------------------------------
  function spawnDebris(world, x, y, count, glyph) {
    var spawned = 0;
    var i, d;
    for (i = 0; i < world.debris.length && spawned < count; i++) {
      d = world.debris[i];
      if (!d.alive) {
        d.alive = true;
        d.x = x;
        d.y = y;
        d.vx = world.rng.range(-160, 160);
        d.vy = world.rng.range(-320, -40);
        d.maxLife = world.rng.range(20, 50);
        d.life = d.maxLife;
        d.glyph = glyph | 0;
        spawned++;
      }
    }
    if (spawned < count) {
      world.stats.debrisCulled += count - spawned;
      emit(world, 'debris-culled', { dropped: count - spawned });
    }
    return spawned;
  }

  function fireProjectile(world, def, owner, hostile, x, y, dx, dy) {
    var i, pr = null;
    for (i = 0; i < world.projectiles.length; i++) {
      if (!world.projectiles[i].alive) {
        pr = world.projectiles[i];
        break;
      }
    }
    if (!pr) {
      return null;
    }
    pr.id = world.nextProjectileId++;
    pr.alive = true;
    pr.owner = owner;
    pr.hostile = !!hostile;
    pr.x = x;
    pr.y = y;
    pr.vx = dx * def.projectileSpeed;
    pr.vy = dy * def.projectileSpeed;
    pr.damage = def.damage;
    pr.pierce = def.pierce | 0;
    pr.life = def.lifeTicks | 0 || 90;
    pr.terrainDamage = def.terrainDamage | 0;
    pr.explosive = !!def.explosive;
    pr.radius = def.radius | 0;
    pr.weaponId = def.id;
    world.stats.shotsFired++;
    return pr;
  }

  function explode(world, x, y, radius, damage, cause, byPlayer) {
    var i, e, dx, dy, dist;
    for (i = 0; i < world.enemies.length; i++) {
      e = world.enemies[i];
      if (!e.alive) {
        continue;
      }
      dx = e.x - x;
      dy = e.y - y;
      dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius + world.config.enemyRadius) {
        damageEnemy(world, e, damage, cause, byPlayer);
      }
    }
    var p;
    for (i = 0; i < world.players.length; i++) {
      p = world.players[i];
      if (!p.active || p.downed) {
        continue;
      }
      dx = p.x - x;
      dy = p.y - y;
      dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius + world.config.playerRadius) {
        damagePlayer(world, p, damage * 0.5, cause);
      }
    }
    damageTerrain(world, x, y, damage, cause);
    spawnDebris(world, x, y, 10, 2);
  }

  // ---- the fixed 12-phase step ----------------------------------------------------------------------------
  function step(world, rawInputs) {
    var base = world.events.length;
    var inputs = [];
    var s;
    for (s = 0; s < BUDGETS.MAX_PLAYERS; s++) {
      var raw = rawInputs && rawInputs[s] !== undefined
        ? rawInputs[s]
        : (rawInputs && rawInputs[String(s)] !== undefined ? rawInputs[String(s)] : null);
      inputs.push(sanitizeInput(raw, s, world.tick));
    }

    phaseTimers(world);
    phaseLocomotion(world, inputs);
    phaseEnemies(world);
    phasePhysics(world);
    phaseFire(world, inputs);
    phaseProjectiles(world);
    phaseDamage(world);
    phaseTerrain(world);
    phasePickups(world);
    phaseCleanup(world);
    phaseEvents(world);

    var out = [];
    var i;
    for (i = base; i < world.events.length; i++) {
      out.push(world.events[i]);
    }
    var result = { tick: world.tick, events: out };
    world.tick++;
    return result;
  }

  // Phase 2: tick down every timer exactly once.
  function phaseTimers(world) {
    var i, p, e, pr, pk;
    for (i = 0; i < world.players.length; i++) {
      p = world.players[i];
      if (!p.active) {
        continue;
      }
      if (p.coyote > 0) {
        p.coyote--;
      }
      if (p.jumpBuffer > 0) {
        p.jumpBuffer--;
      }
      if (p.dashBuffer > 0) {
        p.dashBuffer--;
      }
      if (p.iframes > 0) {
        p.iframes--;
      }
      if (p.fireCooldown > 0) {
        p.fireCooldown--;
      }
      if (p.altCooldown > 0) {
        p.altCooldown--;
      }
    }
    for (i = 0; i < world.enemies.length; i++) {
      e = world.enemies[i];
      if (!e.alive) {
        continue;
      }
      if (e.fireCooldown > 0) {
        e.fireCooldown--;
      }
      if (e.flash > 0) {
        e.flash--;
      }
    }
    for (i = 0; i < world.projectiles.length; i++) {
      pr = world.projectiles[i];
      if (pr.alive && pr.life > 0) {
        pr.life--;
      }
    }
    for (i = 0; i < world.pickups.length; i++) {
      pk = world.pickups[i];
      if (pk.alive && pk.life > 0) {
        pk.life--;
      }
    }
  }

  // Phase 3: convert sanitized inputs into velocities. Ladders never auto-climb:
  // UP/DOWN only express intent; vertical motion comes from jumps, dash, or hooks.
  function phaseLocomotion(world, inputs) {
    var cfg = world.config;
    var i;
    for (i = 0; i < world.players.length; i++) {
      var p = world.players[i];
      if (!p.active || p.downed) {
        continue;
      }
      var b = inputs[i].buttons;
      p.aimX = inputs[i].aimX;
      p.aimY = inputs[i].aimY;

      var moveX = 0;
      if (b & BUTTON.LEFT) {
        moveX -= 1;
      }
      if (b & BUTTON.RIGHT) {
        moveX += 1;
      }
      var dashing = (world.tick - p.dashTick) < TIMING_TICKS.DASH_TICKS;
      if (!dashing) {
        var target = moveX * cfg.moveSpeed;
        if (p.grounded) {
          p.vx = target;
        } else {
          var rate = cfg.airControl;
          p.vx = p.vx + (target - p.vx) * rate * DT * 10;
        }
      }

      if (b & BUTTON.JUMP) {
        p.jumpBuffer = TIMING_TICKS.JUMP_BUFFER_TICKS;
      }
      if (p.grounded) {
        p.coyote = TIMING_TICKS.COYOTE_TICKS;
        p.jumpsUsed = 0;
      }
      if (p.jumpBuffer > 0) {
        if (p.coyote > 0) {
          p.vy = -cfg.jumpSpeed;
          p.grounded = false;
          p.coyote = 0;
          p.jumpBuffer = 0;
          p.jumpsUsed = 1;
          emit(world, 'player-jumped', { id: p.id, kind: 'jump', x: r2(p.x), y: r2(p.y) });
        } else if (p.jumpsUsed < 2) {
          p.vy = -cfg.doubleJumpSpeed;
          p.jumpsUsed = 2;
          p.jumpBuffer = 0;
          emit(world, 'player-jumped', { id: p.id, kind: 'double', x: r2(p.x), y: r2(p.y) });
        }
      }

      if (b & BUTTON.DASH) {
        p.dashBuffer = TIMING_TICKS.DASH_BUFFER_TICKS;
      }
      if (p.dashBuffer > 0 && (world.tick - p.dashTick) > TIMING_TICKS.DASH_TICKS + 20) {
        var ddx = moveX !== 0 ? moveX : (p.aimX !== 0 ? (p.aimX > 0 ? 1 : -1) : 1);
        p.dashTick = world.tick;
        p.dashBuffer = 0;
        p.iframes = Math.max(p.iframes, TIMING_TICKS.DASH_IFRAME_TICKS);
        p.vx = ddx * cfg.dashSpeed;
        p.vy = 0;
        emit(world, 'player-dashed', { id: p.id, dir: ddx, x: r2(p.x), y: r2(p.y) });
      }

      if (world.hooks && typeof world.hooks.locomotion === 'function') {
        try {
          world.hooks.locomotion(world, p, inputs[i]);
        } catch (err) { /* hooks must never break the fixed sequence */ }
      }
    }
  }

  // Phase 4: enemy steering. Default kinds below; a hooks.steer(world, enemy)
  // override may replace velocity intent for custom bosses.
  function phaseEnemies(world) {
    var i, e, p, bi;
    for (bi = 0; bi < world.enemies.length; bi++) {
      e = world.enemies[bi];
      if (!e.alive) {
        continue;
      }
      if (world.hooks && typeof world.hooks.steer === 'function') {
        try {
          world.hooks.steer(world, e);
        } catch (err) { /* keep default intent on hook failure */ }
      } else {
        var best = null;
        var bestD = 0;
        for (i = 0; i < world.players.length; i++) {
          p = world.players[i];
          if (!p.active || p.downed) {
            continue;
          }
          var dx = p.x - e.x;
          var dy = p.y - e.y;
          var d = dx * dx + dy * dy;
          if (best === null || d < bestD) {
            best = p;
            bestD = d;
          }
        }
        if (best !== null) {
          var dir = best.x > e.x ? 1 : best.x < e.x ? -1 : 0;
          if (e.kind === 'shooter') {
            var want = 260;
            var gap = best.x - e.x;
            if (gap > want + 24) {
              e.vx = e.speed * 0.7;
            } else if (gap < want - 24) {
              e.vx = -e.speed * 0.7;
            } else {
              e.vx = 0;
            }
            if (e.fireCooldown <= 0 && bestD < 700 * 700) {
              e.fireCooldown = 80;
              var sx = best.x - e.x;
              var sy = best.y - e.y;
              var len = Math.sqrt(sx * sx + sy * sy) || 1;
              fireProjectile(world, {
                id: 'enemy-bolt', damage: e.dmg, projectileSpeed: 420,
                cooldownTicks: 0, pierce: 0, lifeTicks: 120,
                terrainDamage: 0, explosive: false, radius: 0
              }, -1, true, e.x, e.y - 10, sx / len, sy / len);
            }
          } else {
            e.vx = dir * e.speed;
            if (e.grounded && solidAt(world, e.x + dir * (world.config.enemyRadius + 2), e.y - 4)) {
              e.vy = -world.config.jumpSpeed * 0.55;
              e.grounded = false;
            }
          }
        } else {
          e.vx = 0;
        }
      }
      e.vy += world.config.gravity * DT;
    }
  }

  // Phase 5: integrate + resolve against terrain probes. Order is fixed:
  // X first, then Y. Grounded is recomputed every tick from the Y resolve.
  function moveBody(world, b, radius) {
    var nx = b.x + b.vx * DT;
    if (b.vx > 0 && (solidAt(world, nx + radius, b.y - radius) || solidAt(world, nx + radius, b.y))) {
      nx = b.x;
      b.vx = 0;
    } else if (b.vx < 0 && (solidAt(world, nx - radius, b.y - radius) || solidAt(world, nx - radius, b.y))) {
      nx = b.x;
      b.vx = 0;
    }
    b.x = nx;

    var ny = b.y + b.vy * DT;
    b.grounded = false;
    if (b.vy >= 0 && (solidAt(world, b.x - radius * 0.7, ny) || solidAt(world, b.x + radius * 0.7, ny))) {
      b.y = Math.floor(ny);
      var probe = 0;
      while (probe < 8 && solidAt(world, b.x, b.y)) {
        b.y -= 1;
        probe++;
      }
      b.vy = 0;
      b.grounded = true;
    } else if (b.vy < 0 && (solidAt(world, b.x - radius * 0.7, ny - radius * 2) || solidAt(world, b.x + radius * 0.7, ny - radius * 2))) {
      b.vy = 0;
      b.y = ny + 1;
    } else {
      b.y = ny;
    }
  }

  function phasePhysics(world) {
    var i, p, e;
    for (i = 0; i < world.players.length; i++) {
      p = world.players[i];
      if (!p.active || p.downed) {
        continue;
      }
      var dashing = (world.tick - p.dashTick) < TIMING_TICKS.DASH_TICKS;
      if (!dashing) {
        p.vy += world.config.gravity * DT;
      }
      moveBody(world, p, world.config.playerRadius);
    }
    for (i = 0; i < world.enemies.length; i++) {
      e = world.enemies[i];
      if (!e.alive) {
        continue;
      }
      moveBody(world, e, world.config.enemyRadius);
    }
  }

  // Phase 6: weapon fire spawns projectiles. Muzzle/recoil surface as events
  // so the presenter can draw them without touching the sim.
  function phaseFire(world, inputs) {
    var i;
    for (i = 0; i < world.players.length; i++) {
      var p = world.players[i];
      if (!p.active || p.downed) {
        continue;
      }
      var b = inputs[i].buttons;
      if (b & BUTTON.SWAP1) {
        p.weapon = 'sidearm';
      }
      var def = world.weapons[p.weapon] || world.weapons.sidearm;
      if (!(b & BUTTON.FIRE) || p.fireCooldown > 0) {
        continue;
      }
      p.fireCooldown = def.cooldownTicks | 0;
      var mx = p.x + p.aimX * (world.config.playerRadius + 6);
      var my = p.y - world.config.playerRadius + p.aimY * (world.config.playerRadius + 6);
      var pr = fireProjectile(world, def, p.slot, false, mx, my, p.aimX, p.aimY);
      if (pr && def.kickback > 0) {
        p.vx -= p.aimX * def.kickback;
        p.vy -= p.aimY * def.kickback * 0.5;
      }
      emit(world, 'player-fired', {
        id: p.id, weapon: def.id,
        mx: r2(mx), my: r2(my),
        dx: r2(p.aimX), dy: r2(p.aimY)
      });
      if (world.hooks && typeof world.hooks.onFire === 'function') {
        try {
          world.hooks.onFire(world, p, def, pr);
        } catch (err) { /* presenter hook; never breaks the sim */ }
      }
    }
  }

  // Phase 7: integrate projectiles; test terrain, then entities.
  function phaseProjectiles(world) {
    var i, pr, e, p;
    for (i = 0; i < world.projectiles.length; i++) {
      pr = world.projectiles[i];
      if (!pr.alive) {
        continue;
      }
      if (pr.life <= 0) {
        pr.alive = false;
        emit(world, 'projectile-expired', { id: pr.id, weapon: pr.weaponId });
        continue;
      }
      pr.x += pr.vx * DT;
      pr.y += pr.vy * DT;

      if (solidAt(world, pr.x, pr.y)) {
        pr.alive = false;
        if (pr.terrainDamage > 0) {
          damageTerrain(world, pr.x, pr.y, pr.terrainDamage, pr.weaponId);
        }
        if (pr.explosive) {
          explode(world, pr.x, pr.y, pr.radius || 60, pr.damage, pr.weaponId, pr.hostile ? -1 : pr.owner);
        }
        emit(world, 'projectile-impact', {
          id: pr.id, weapon: pr.weaponId, kind: 'terrain',
          x: r2(pr.x), y: r2(pr.y)
        });
        continue;
      }

      var hit = false;
      if (pr.hostile) {
        for (var pi = 0; pi < world.players.length; pi++) {
          p = world.players[pi];
          if (!p.active || p.downed) {
            continue;
          }
          var pdx = p.x - pr.x;
          var pdy = (p.y - world.config.playerRadius) - pr.y;
          var prr = world.config.playerRadius + 4;
          if (pdx * pdx + pdy * pdy <= prr * prr) {
            damagePlayer(world, p, pr.damage, pr.weaponId);
            if (pr.terrainDamage > 0) {
              damageTerrain(world, pr.x, pr.y, pr.terrainDamage, pr.weaponId);
            }
            if (pr.explosive) {
              explode(world, pr.x, pr.y, pr.radius || 60, pr.damage, pr.weaponId, -1);
            }
            emit(world, 'projectile-impact', {
              id: pr.id, weapon: pr.weaponId, kind: 'player',
              target: p.id, x: r2(pr.x), y: r2(pr.y)
            });
            hit = true;
            break;
          }
        }
      } else {
        for (var ei = 0; ei < world.enemies.length; ei++) {
          e = world.enemies[ei];
          if (!e.alive) {
            continue;
          }
          var edx = e.x - pr.x;
          var edy = (e.y - world.config.enemyRadius) - pr.y;
          var err2 = world.config.enemyRadius + 5;
          if (edx * edx + edy * edy <= err2 * err2) {
            damageEnemy(world, e, pr.damage, pr.weaponId, pr.owner);
            if (pr.terrainDamage > 0) {
              damageTerrain(world, pr.x, pr.y, pr.terrainDamage, pr.weaponId);
            }
            if (pr.explosive) {
              explode(world, pr.x, pr.y, pr.radius || 60, pr.damage, pr.weaponId, pr.owner);
            }
            emit(world, 'projectile-impact', {
              id: pr.id, weapon: pr.weaponId, kind: 'enemy',
              target: e.id, x: r2(pr.x), y: r2(pr.y)
            });
            if (world.hooks && typeof world.hooks.onProjectileHit === 'function') {
              try {
                world.hooks.onProjectileHit(world, pr, e);
              } catch (err) { /* presenter hook; never breaks the sim */ }
            }
            hit = true;
            break;
          }
        }
      }
      if (hit) {
        if (pr.pierce > 0) {
          pr.pierce--;
        } else {
          pr.alive = false;
        }
      }
    }
  }

  // Phase 8: contact damage + expired-projectile sweep. Friendly fire is OFF
  // by default: hostile entities can only hurt players, player shots only
  // enemies. Custom modes opt in via hooks.friendlyFire(world) === true.
  function phaseDamage(world) {
    var ff = false;
    if (world.hooks && typeof world.hooks.friendlyFire === 'function') {
      try {
        ff = !!world.hooks.friendlyFire(world);
      } catch (err) {
        ff = false;
      }
    }
    var i, j, e, p, dx, dy, rr;
    for (i = 0; i < world.enemies.length; i++) {
      e = world.enemies[i];
      if (!e.alive) {
        continue;
      }
      for (j = 0; j < world.players.length; j++) {
        p = world.players[j];
        if (!p.active || p.downed) {
          continue;
        }
        dx = p.x - e.x;
        dy = (p.y - world.config.playerRadius) - (e.y - world.config.enemyRadius);
        rr = world.config.playerRadius + world.config.enemyRadius;
        if (dx * dx + dy * dy <= rr * rr) {
          damagePlayer(world, p, e.dmg, 'contact:' + e.kind);
        }
      }
      if (ff) {
        for (var k = 0; k < world.enemies.length; k++) {
          var o = world.enemies[k];
          if (o === e || !o.alive) {
            continue;
          }
          dx = o.x - e.x;
          dy = o.y - e.y;
          rr = world.config.enemyRadius * 2;
          if (dx * dx + dy * dy <= rr * rr) {
            damageEnemy(world, o, e.dmg * 0.25, 'friendly:' + e.kind, -1);
          }
        }
      }
    }
  }

  // Phase 9: route terrain damage bookkeeping. Terrain cells + support
  // lifecycle live in the terrain lane; the sim only drains dirty-chunk ids
  // (capped at 16) and tracks collapse slots (capped at 6).
  function phaseTerrain(world) {
    drainTerrainDirty(world);
    if (world.hooks && typeof world.hooks.collapse === 'function') {
      try {
        world.hooks.collapse(world);
      } catch (err) { /* collapse presentation; never breaks the sim */ }
    }
  }

  function trackCollapse(world, supportId, stage, x, y) {
    var i, c = null;
    for (i = 0; i < world.collapses.length; i++) {
      if (world.collapses[i].supportId === supportId) {
        c = world.collapses[i];
        break;
      }
    }
    if (!c) {
      if (world.collapses.length >= BUDGETS.MAX_COLLAPSES) {
        return null;
      }
      c = { supportId: supportId, stage: stage, x: x, y: y };
      world.collapses.push(c);
    } else {
      c.stage = stage;
      c.x = x;
      c.y = y;
    }
    if (stage === 'cleanup') {
      for (i = 0; i < world.collapses.length; i++) {
        if (world.collapses[i].supportId === supportId) {
          world.collapses.splice(i, 1);
          break;
        }
      }
      return null;
    }
    if (stage === 'collapsing') {
      world.stats.collapses++;
      emit(world, 'collapse-started', { supportId: supportId, x: r2(x), y: r2(y) });
    } else if (stage === 'unstable') {
      emit(world, 'collapse-warning', { supportId: supportId, x: r2(x), y: r2(y) });
    }
    return c;
  }

  // Phase 10: pickups (magnet + take), rescue channel, objective passthrough.
  function phasePickups(world) {
    var cfg = world.config;
    var i, j, pk, p, dx, dy;
    for (i = 0; i < world.pickups.length; i++) {
      pk = world.pickups[i];
      if (!pk.alive) {
        continue;
      }
      if (pk.life <= 0) {
        pk.alive = false;
        continue;
      }
      pk.vy += cfg.gravity * 0.4 * DT;
      pk.x += pk.vx * DT;
      pk.y += pk.vy * DT;
      if (solidAt(world, pk.x, pk.y)) {
        pk.y = Math.floor(pk.y);
        pk.vy = 0;
        pk.vx = 0;
      }
      for (j = 0; j < world.players.length; j++) {
        p = world.players[j];
        if (!p.active || p.downed) {
          continue;
        }
        dx = p.x - pk.x;
        dy = (p.y - cfg.playerRadius) - pk.y;
        var d2 = dx * dx + dy * dy;
        if (d2 <= cfg.magnetRadius * cfg.magnetRadius) {
          var d = Math.sqrt(d2) || 1;
          pk.vx += (dx / d) * 900 * DT;
          pk.vy += (dy / d) * 900 * DT;
        }
        if (d2 <= cfg.pickupRadius * cfg.pickupRadius) {
          pk.alive = false;
          world.stats.pickupsTaken++;
          if (pk.kind === 'weapon' && world.weapons[pk.weaponId]) {
            p.weapon = pk.weaponId;
          } else if (pk.kind === 'health') {
            p.hp = Math.min(p.maxHp, p.hp + (pk.amount || 25));
          }
          emit(world, 'pickup-taken', {
            id: p.id, kind: pk.kind,
            weapon: pk.weaponId || '', amount: pk.amount || 0
          });
          break;
        }
      }
    }

    for (i = 0; i < world.players.length; i++) {
      p = world.players[i];
      if (!p.active || p.downed) {
        continue;
      }
      if (p.reviving >= 0) {
        var mate = world.players[p.reviving];
        if (!mate || !mate.active || !mate.downed) {
          p.reviving = -1;
          p.reviveTicks = 0;
        } else {
          dx = mate.x - p.x;
          dy = mate.y - p.y;
          if (dx * dx + dy * dy > 70 * 70) {
            p.reviving = -1;
            p.reviveTicks = 0;
            emit(world, 'rescue-started', { id: p.id, cancelled: true });
          } else {
            p.reviveTicks++;
            if (p.reviveTicks >= cfg.rescueTicks) {
              mate.downed = false;
              mate.hp = Math.max(1, Math.floor(mate.maxHp * 0.4));
              p.reviving = -1;
              p.reviveTicks = 0;
              world.stats.rescues++;
              p.rescues++;
              emit(world, 'player-revived', { id: mate.id, by: p.id });
            }
          }
        }
      }
    }

    if (world.hooks && typeof world.hooks.objectives === 'function') {
      try {
        world.hooks.objectives(world);
      } catch (err) { /* mission logic; never breaks the sim */ }
    }
  }

  function spawnPickup(world, def) {
    var d = def || {};
    var i, pk = null;
    for (i = 0; i < world.pickups.length; i++) {
      if (!world.pickups[i].alive) {
        pk = world.pickups[i];
        break;
      }
    }
    if (!pk) {
      return null;
    }
    pk.id = world.nextPickupId++;
    pk.alive = true;
    pk.kind = typeof d.kind === 'string' ? d.kind : 'weapon';
    pk.x = isNum(d.x) ? d.x : 0;
    pk.y = isNum(d.y) ? d.y : 0;
    pk.vx = isNum(d.vx) ? d.vx : 0;
    pk.vy = isNum(d.vy) ? d.vy : 0;
    pk.weaponId = typeof d.weaponId === 'string' ? d.weaponId : '';
    pk.amount = isNum(d.amount) ? d.amount : 0;
    pk.life = isNum(d.life) ? d.life : 1800;
    emit(world, 'pickup-spawned', {
      id: pk.id, kind: pk.kind, x: r2(pk.x), y: r2(pk.y)
    });
    return pk;
  }

  // Phase 11: debris integration + lifetime, corpse-free enemy sweep is in
  // phase 8 (eat-in-place, no tombstones). Enforces the 250-debris budget.
  function phaseCleanup(world) {
    var i, d;
    for (i = 0; i < world.debris.length; i++) {
      d = world.debris[i];
      if (!d.alive) {
        continue;
      }
      d.life--;
      if (d.life <= 0) {
        d.alive = false;
        continue;
      }
      d.vy += world.config.gravity * 0.6 * DT;
      d.x += d.vx * DT;
      d.y += d.vy * DT;
      if (solidAt(world, d.x, d.y)) {
        d.y = Math.floor(d.y);
        d.vy = 0;
        d.vx *= 0.9;
      }
    }
  }

  // Phase 12: snapshot-ready bookkeeping. Events are already appended with
  // the current tick; this phase only drains terrain ids so the snapshot the
  // caller takes right after step() is complete.
  function phaseEvents(world) {
    drainTerrainDirty(world);
  }

  // ---- snapshots ---------------------------------------------------------------------------
  function snapPlayer(p) {
    return {
      id: p.id, active: p.active,
      x: r2(p.x), y: r2(p.y), vx: r2(p.vx), vy: r2(p.vy),
      hp: r2(p.hp), downed: p.downed, grounded: p.grounded,
      weapon: p.weapon, aimX: r2(p.aimX), aimY: r2(p.aimY),
      kills: p.kills, rescues: p.rescues
    };
  }

  function snapEnemy(e) {
    return {
      id: e.id, kind: e.kind,
      x: r2(e.x), y: r2(e.y), vx: r2(e.vx), vy: r2(e.vy),
      hp: r2(e.hp)
    };
  }

  function snapProjectile(pr) {
    return {
      id: pr.id, hostile: pr.hostile,
      x: r2(pr.x), y: r2(pr.y), vx: r2(pr.vx), vy: r2(pr.vy),
      weapon: pr.weaponId
    };
  }

  function snapPickup(pk) {
    return {
      id: pk.id, kind: pk.kind,
      x: r2(pk.x), y: r2(pk.y),
      weapon: pk.weaponId, amount: pk.amount
    };
  }

  function debrisCount(world) {
    var n = 0;
    var i;
    for (i = 0; i < world.debris.length; i++) {
      if (world.debris[i].alive) {
        n++;
      }
    }
    return n;
  }

  function snapshot(world) {
    var i;
    var snap = {
      tick: world.tick,
      seed: world.seed,
      players: [],
      enemies: [],
      projectiles: [],
      pickups: [],
      debrisCount: debrisCount(world),
      dirtyChunks: world.dirtyChunks.slice(),
      stats: {
        kills: world.stats.kills,
        shotsFired: world.stats.shotsFired,
        hits: world.stats.hits,
        terrainBroken: world.stats.terrainBroken,
        pickupsTaken: world.stats.pickupsTaken,
        rescues: world.stats.rescues,
        collapses: world.stats.collapses,
        debrisCulled: world.stats.debrisCulled
      }
    };
    for (i = 0; i < world.players.length; i++) {
      if (world.players[i].active) {
        snap.players.push(snapPlayer(world.players[i]));
      }
    }
    for (i = 0; i < world.enemies.length; i++) {
      if (world.enemies[i].alive) {
        snap.enemies.push(snapEnemy(world.enemies[i]));
      }
    }
    for (i = 0; i < world.projectiles.length; i++) {
      if (world.projectiles[i].alive) {
        snap.projectiles.push(snapProjectile(world.projectiles[i]));
      }
    }
    for (i = 0; i < world.pickups.length; i++) {
      if (world.pickups[i].alive) {
        snap.pickups.push(snapPickup(world.pickups[i]));
      }
    }
    return snap;
  }

  function hashSnapshot(snap) {
    var str = JSON.stringify(snap);
    var h = 2166136261;
    var i;
    for (i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ('0000000' + (h >>> 0).toString(16)).slice(-8);
  }

  function indexById(rows) {
    var map = {};
    var i;
    for (i = 0; i < rows.length; i++) {
      map[rows[i].id] = rows[i];
    }
    return map;
  }

  function diffRows(prevRows, nextRows) {
    var prev = indexById(prevRows);
    var next = indexById(nextRows);
    var changed = [];
    var removed = [];
    var k;
    for (k in next) {
      if (!Object.prototype.hasOwnProperty.call(prev, k) ||
          JSON.stringify(prev[k]) !== JSON.stringify(next[k])) {
        changed.push(next[k]);
      }
    }
    for (k in prev) {
      if (!Object.prototype.hasOwnProperty.call(next, k)) {
        removed.push(Number(k));
      }
    }
    removed.sort(function (a, b) {
      return a - b;
    });
    return { changed: changed, removed: removed };
  }

  function diffSnapshots(prev, next) {
    var de = diffRows(prev.enemies, next.enemies);
    var dp = diffRows(prev.projectiles, next.projectiles);
    var dk = diffRows(prev.pickups, next.pickups);
    return {
      tickFrom: prev.tick,
      tickTo: next.tick,
      changedPlayers: diffRows(prev.players, next.players).changed,
      changedEnemies: de.changed,
      changedProjectiles: dp.changed,
      changedPickups: dk.changed,
      removedEnemies: de.removed,
      removedProjectiles: dp.removed,
      removedPickups: dk.removed,
      dirtyChunks: next.dirtyChunks.slice()
    };
  }

  function restoreSnapshot(world, snap) {
    var i, s = snap || {};
    world.tick = s.tick | 0;
    world.dirtyChunks = (s.dirtyChunks || []).slice(0, BUDGETS.MAX_DIRTY_CHUNKS);
    var stats = s.stats || {};
    var keys = ['kills', 'shotsFired', 'hits', 'terrainBroken', 'pickupsTaken', 'rescues', 'collapses', 'debrisCulled'];
    for (i = 0; i < keys.length; i++) {
      world.stats[keys[i]] = stats[keys[i]] | 0;
    }
    for (i = 0; i < world.players.length; i++) {
      world.players[i].active = false;
    }
    var rows = s.players || [];
    for (i = 0; i < rows.length && i < world.players.length; i++) {
      var p = world.players[rows[i].id] || world.players[i];
      if (!p) {
        continue;
      }
      p.active = true;
      p.x = rows[i].x || 0;
      p.y = rows[i].y || 0;
      p.vx = rows[i].vx || 0;
      p.vy = rows[i].vy || 0;
      p.hp = rows[i].hp === undefined ? p.maxHp : rows[i].hp;
      p.downed = !!rows[i].downed;
      p.weapon = rows[i].weapon || 'sidearm';
      p.aimX = rows[i].aimX === undefined ? 1 : rows[i].aimX;
      p.aimY = rows[i].aimY || 0;
      p.kills = rows[i].kills | 0;
      p.rescues = rows[i].rescues | 0;
    }
    for (i = 0; i < world.enemies.length; i++) {
      world.enemies[i].alive = false;
    }
    var erows = s.enemies || [];
    for (i = 0; i < erows.length; i++) {
      var e = null;
      var j;
      for (j = 0; j < world.enemies.length; j++) {
        if (!world.enemies[j].alive) {
          e = world.enemies[j];
          break;
        }
      }
      if (!e) {
        break;
      }
      e.alive = true;
      e.id = erows[i].id;
      if (e.id >= world.nextEnemyId) {
        world.nextEnemyId = e.id + 1;
      }
      e.kind = erows[i].kind || 'chaser';
      e.x = erows[i].x || 0;
      e.y = erows[i].y || 0;
      e.vx = erows[i].vx || 0;
      e.vy = erows[i].vy || 0;
      e.hp = erows[i].hp === undefined ? 30 : erows[i].hp;
    }
    for (i = 0; i < world.projectiles.length; i++) {
      world.projectiles[i].alive = false;
    }
    for (i = 0; i < world.pickups.length; i++) {
      world.pickups[i].alive = false;
    }
    return world;
  }

  var api = {
    VERSION: VERSION,
    TICK_HZ: TICK_HZ,
    DT: DT,
    BUDGETS: BUDGETS,
    BUTTON: BUTTON,
    BUTTON_MASK: BUTTON_MASK,
    TIMING_TICKS: TIMING_TICKS,
    normalizeSeed: normalizeSeed,
    createRng: createRng,
    defaultConfig: defaultConfig,
    defaultWeapons: defaultWeapons,
    createWorld: createWorld,
    joinPlayer: joinPlayer,
    spawnEnemy: spawnEnemy,
    spawnPickup: spawnPickup,
    spawnDebris: spawnDebris,
    trackCollapse: trackCollapse,
    damagePlayer: damagePlayer,
    damageEnemy: damageEnemy,
    step: step,
    snapshot: snapshot,
    hashSnapshot: hashSnapshot,
    diffSnapshots: diffSnapshots,
    restoreSnapshot: restoreSnapshot
  };

  try {
    if (typeof window !== 'undefined') {
      window.GraveGain2dBSimCore = api;
    }
  } catch (err) { /* non-browser host: module export below applies */ }

  try {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = api;
    }
  } catch (err) { /* browser-only host: registration above applies */ }
})();
