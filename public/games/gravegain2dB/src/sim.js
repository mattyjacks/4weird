/* GraveGain2dB sim — sim.js (A3 lane)
 * Fixed-timestep pure simulation: player physics, pools, destruction
 * pipeline (queueDamage -> resolveCollapse -> updateNav), anti-softlock
 * breach shaft, deterministic hash. No host APIs: state + injected rng only.
 * Exposes globalThis.GraveGain2dBSim (visible as a global in browser script tags).
 */
(function () {
  'use strict';

  var NS = globalThis.GraveGain2dBSim = globalThis.GraveGain2dBSim || {};
  if (NS.createSim && NS.step && NS.__simLoaded) {
    return; // idempotent: same guard shape as game.js
  }

  function req(name, path) {
    if (NS[name]) return NS[name];
    if (typeof require === 'function') {
      try {
        var m = require(path);
        if (m && m[name]) return m[name];
      } catch (e) { /* sibling bundled ahead via script order */ }
    }
    return null;
  }

  function T() {
    return req('TUNING', './tuning.js') || {
      TILE: 32, RUN_SPEED: 260, JUMP_VEL: 560, GRAVITY: 1800, MAX_FALL: 900,
      AIR_STEER: 0.8, DASH_SPEED: 700, DASH_TIME: 0.14, DASH_CD: 0.9,
      DASH_IFRAMES: 0.2, COYOTE: 0.12, JUMP_BUFFER: 0.15,
      FIXED_DT: 1 / 60, MAX_DT: 1 / 20, POOL_PROJ: 80, POOL_DEBRIS: 250,
      POOL_PICKUP: 20, DAMAGE_PER_TICK_CAP: 64,
      WARN_STAGE1_T: 1.2, WARN_STAGE2_T: 0.6,
      TRAPPED_BREACH_T: 5.0, BREACH_SHAFT_MAX_H: 32
    };
  }

  function ARENA() {
    return req('ARENA', './tuning.js') || {
      TILES_W: 120, TILES_H: 34, TILE: 32, SPAWN: { x: 96, y: 832 }
    };
  }

  // Deterministic rng (mulberry32). Callers may inject their own rand fn.
  function mulberry32(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makePool(n, factory) {
    var arr = new Array(n);
    for (var i = 0; i < n; i++) { arr[i] = factory(i); arr[i].alive = false; }
    return { list: arr, cursor: 0 };
  }

  function poolAcquire(p) {
    var list = p.list;
    for (var i = 0; i < list.length; i++) {
      var s = (p.cursor + i) % list.length;
      if (!list[s].alive) { p.cursor = (s + 1) % list.length; list[s].alive = true; return list[s]; }
    }
    return null;
  }

  function poolAlive(p) {
    var n = 0;
    for (var i = 0; i < p.list.length; i++) if (p.list[i].alive) n++;
    return n;
  }

  function createSim(opts) {
    var o = opts || {};
    var tun = T();
    var arena = ARENA();
    var createTerrain = req('createTerrain', './terrain.js');
    var createSupports = req('createSupports', './supports.js');
    var rand = (typeof o.rand === 'function') ? o.rand : mulberry32(typeof o.seed === 'number' ? o.seed : 1337);
    var w = o.w || arena.TILES_W;
    var h = o.h || arena.TILES_H;
    var sim = {
      seed: (typeof o.seed === 'number') ? o.seed : 1337,
      rand: rand,
      time: 0,
      tickCount: 0,
      w: w,
      h: h,
      terrain: createTerrain ? createTerrain({ w: w, h: h }) : null,
      supports: createSupports ? createSupports() : null,
      player: {
        x: arena.SPAWN.x, y: arena.SPAWN.y, vx: 0, vy: 0,
        w: 20, hgt: 28, face: 1, onGround: false,
        coyoteT: 0, bufferT: 0, dashT: 0, dashCdT: 0, dashDir: 1,
        iframesT: 0, trappedT: 0, alive: true
      },
      proj: makePool(tun.POOL_PROJ, function () { return { x: 0, y: 0, vx: 0, vy: 0, dmg: 0, life: 0, cause: '' }; }),
      debris: makePool(tun.POOL_DEBRIS, function () { return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, mat: 0 }; }),
      pickups: makePool(tun.POOL_PICKUP, function () { return { x: 0, y: 0, kind: '', life: 0 }; }),
      navVersion: 1,
      events: []
    };
    return sim;
  }

  function newRun(sim, opts) {
    var o = opts || {};
    var tun = T();
    var arena = ARENA();
    sim.time = 0;
    sim.tickCount = 0;
    sim.rand = (typeof o.rand === 'function') ? o.rand : mulberry32(typeof o.seed === 'number' ? o.seed : sim.seed);
    sim.seed = (typeof o.seed === 'number') ? o.seed : sim.seed;
    if (!o.keepTerrain) {
      var createTerrain = req('createTerrain', './terrain.js');
      if (createTerrain) sim.terrain = createTerrain({ w: sim.w, h: sim.h });
    } else if (sim.terrain) {
      sim.terrain.damageQueue.length = 0;
      sim.terrain.cellsChanged = 0;
    }
    var createSupports = req('createSupports', './supports.js');
    if (createSupports && !o.keepTerrain) sim.supports = createSupports();
    var p = sim.player;
    var sx = (o.spawn && typeof o.spawn.x === 'number') ? o.spawn.x : arena.SPAWN.x;
    var sy = (o.spawn && typeof o.spawn.y === 'number') ? o.spawn.y : arena.SPAWN.y;
    p.x = sx; p.y = sy; p.vx = 0; p.vy = 0;
    p.onGround = false; p.coyoteT = 0; p.bufferT = 0;
    p.dashT = 0; p.dashCdT = 0; p.iframesT = 0; p.trappedT = 0;
    p.face = 1; p.alive = true;
    [sim.proj, sim.debris, sim.pickups].forEach(function (pool) {
      for (var i = 0; i < pool.list.length; i++) pool.list[i].alive = false;
      pool.cursor = 0;
    });
    sim.navVersion = 1;
    sim.events.length = 0;
    return sim;
  }

  // ---- collision helpers (tile grid) ----

  function solidAtPx(sim, px, py) {
    var isSolid = req('isSolid', './terrain.js');
    if (!isSolid || !sim.terrain) return py >= sim.h * T().TILE; // floor only w/o terrain
    var t = T().TILE;
    return isSolid(sim.terrain, Math.floor(px / t), Math.floor(py / t));
  }

  function rectHitsSolid(sim, cx, cy, w, hgt) {
    var hw = w / 2, hh = hgt / 2;
    var pts = [
      [cx - hw, cy - hh], [cx + hw, cy - hh],
      [cx - hw, cy + hh], [cx + hw, cy + hh],
      [cx - hw, cy], [cx + hw, cy],
      [cx, cy - hh], [cx, cy + hh]
    ];
    for (var i = 0; i < pts.length; i++) {
      if (solidAtPx(sim, pts[i][0], pts[i][1])) return true;
    }
    return false;
  }

  function moveAxis(sim, p, dx, dy) {
    var hit = false;
    var grounded = false;
    var dist = Math.abs(dx + dy);
    var steps = Math.max(1, Math.ceil(dist / 4));
    var sx = dx / steps, sy = dy / steps;
    for (var i = 0; i < steps; i++) {
      var nx = p.x + sx, ny = p.y + sy;
      if (rectHitsSolid(sim, nx, ny, p.w, p.hgt)) {
        hit = true;
        if (sy > 0) grounded = true;
        // slide: allow the free axis (callers move X then Y separately)
        break;
      }
      p.x = nx; p.y = ny;
    }
    return { hit: hit, grounded: grounded };
  }

  // ---- player actions ----

  function tryJump(sim) {
    sim.player.bufferT = T().JUMP_BUFFER;
    return true;
  }

  function tryDash(sim, dir) {
    var tun = T();
    var p = sim.player;
    if (!p.alive || p.dashCdT > 0 || p.dashT > 0) return false;
    var d = (dir === -1 || dir === 1) ? dir : p.face;
    p.dashDir = d;
    p.face = d;
    p.dashT = tun.DASH_TIME;
    p.dashCdT = tun.DASH_CD;
    p.iframesT = Math.max(p.iframesT, tun.DASH_IFRAMES);
    return true;
  }

  function stepPlayer(sim, dt, input) {
    var tun = T();
    var p = sim.player;
    var inp = input || {};
    if (!p.alive) return;
    var move = inp.move || 0;
    if (move !== 0) p.face = move > 0 ? 1 : -1;

    if (inp.jumpPressed) p.bufferT = tun.JUMP_BUFFER;
    else if (p.bufferT > 0) p.bufferT = Math.max(0, p.bufferT - dt);
    if (p.coyoteT > 0) p.coyoteT = Math.max(0, p.coyoteT - dt);
    if (p.dashCdT > 0) p.dashCdT = Math.max(0, p.dashCdT - dt);
    if (p.iframesT > 0) p.iframesT = Math.max(0, p.iframesT - dt);
    if (inp.dashPressed) tryDash(sim, move !== 0 ? move : p.face);

    if (p.dashT > 0) {
      p.dashT = Math.max(0, p.dashT - dt);
      p.vx = p.dashDir * tun.DASH_SPEED;
      p.vy = 0;
    } else {
      var target = move * tun.RUN_SPEED;
      if (p.onGround) p.vx = target;
      else p.vx = p.vx + (target - p.vx) * Math.min(1, tun.AIR_STEER * 10 * dt * 0.12 + tun.AIR_STEER * dt * 2);
      p.vy = Math.min(tun.MAX_FALL, p.vy + tun.GRAVITY * dt);
      if ((p.onGround || p.coyoteT > 0) && p.bufferT > 0) {
        p.vy = -tun.JUMP_VEL;
        p.bufferT = 0;
        p.coyoteT = 0;
        p.onGround = false;
      }
    }

    var rx = moveAxis(sim, p, p.vx * dt, 0);
    if (rx.hit) p.vx = 0;
    var ry = moveAxis(sim, p, 0, p.vy * dt);
    if (ry.hit) {
      if (p.vy > 0) {
        p.onGround = true;
        p.coyoteT = tun.COYOTE;
      }
      p.vy = 0;
    } else if (p.vy !== 0 || !ry.grounded) {
      if (p.vy > 1 || !p.onGround) {
        // left a ledge while falling: keep coyote running, clear ground flag
        if (!ry.grounded && p.vy >= 0 && p.onGround) p.onGround = solidAtPx(sim, p.x, p.y + p.hgt / 2 + 2);
        if (!solidAtPx(sim, p.x, p.y + p.hgt / 2 + 2) && p.vy >= 0) p.onGround = false;
      }
    }
  }

  // ---- spawners (pooled) ----

  function spawnShot(sim, x, y, vx, vy, dmg, cause) {
    var s = poolAcquire(sim.proj);
    if (!s) return null;
    s.x = x; s.y = y; s.vx = vx; s.vy = vy;
    s.dmg = dmg; s.life = 3; s.cause = cause || 'shot';
    return s;
  }

  function spawnDebris(sim, x, y, mat, n, spread) {
    var tun = T();
    var made = 0;
    for (var i = 0; i < n; i++) {
      var d = poolAcquire(sim.debris);
      if (!d) {
        // budget full: recycle oldest via ring overwrite
        var list = sim.debris.list;
        d = list[sim.debris.cursor];
        sim.debris.cursor = (sim.debris.cursor + 1) % list.length;
        d.alive = true;
      }
      var sp = (spread || 160);
      d.x = x; d.y = y;
      d.vx = (sim.rand() * 2 - 1) * sp;
      d.vy = -sim.rand() * sp;
      d.maxLife = 0.9 + sim.rand() * 0.9;
      d.life = d.maxLife;
      d.mat = mat;
      made++;
    }
    return made;
  }

  function spawnPickup(sim, x, y, kind, life) {
    var s = poolAcquire(sim.pickups);
    if (!s) return null;
    s.x = x; s.y = y; s.kind = kind; s.life = (typeof life === 'number') ? life : 20;
    return s;
  }

  function explode(sim, tx, ty, radiusTiles, dmg, cause) {
    var qd = req('queueDamage', './terrain.js');
    if (!qd || !sim.terrain) return 0;
    var r = Math.max(1, radiusTiles | 0);
    var n = 0;
    for (var y = ty - r; y <= ty + r; y++) {
      for (var x = tx - r; x <= tx + r; x++) {
        var dx = x - tx, dy = y - ty;
        if (dx * dx + dy * dy <= r * r + 0.5) {
          if (qd(sim.terrain, x, y, dmg, cause || 'blast')) n++;
        }
      }
    }
    return n;
  }

  // ---- pipeline steps ----

  function stepQueueDamage(sim) {
    var tun = T();
    var t = sim.terrain;
    if (!t || t.damageQueue.length === 0) return;
    var damageCell = req('damageCell', './terrain.js');
    var damageSupport = req('damageSupport', './supports.js');
    if (!damageCell) { t.damageQueue.length = 0; return; }
    var cap = Math.min(tun.DAMAGE_PER_TICK_CAP, t.damageQueue.length);
    for (var i = 0; i < cap; i++) {
      var q = t.damageQueue.shift();
      var ev = damageCell(t, q.x, q.y, q.amount, q.cause);
      if (ev.ignored || ev.prot) continue;
      if (ev.broke) {
        var cx = (q.x + 0.5) * T().TILE, cy = (q.y + 0.5) * T().TILE;
        spawnDebris(sim, cx, cy, ev.mat, 3, 170);
        if (ev.supportGroupId && damageSupport && sim.supports) {
          var r = damageSupport(sim.supports, ev.supportGroupId, q.amount);
          if (r.wentUnstable) sim.events.push({ type: 'unstable', groupId: ev.supportGroupId, tag: 'UNSTABLE', x: q.x, y: q.y });
        }
        if (ev.hazard) sim.events.push({ type: 'hazard', x: q.x, y: q.y, mat: ev.mat });
        sim.events.push({ type: 'break', x: q.x, y: q.y, mat: ev.mat, cause: q.cause });
      }
    }
  }

  function stepResolveCollapse(sim, dt) {
    if (!sim.supports) return;
    var resolveCollapse = req('resolveCollapse', './supports.js');
    if (!resolveCollapse) return;
    var out = resolveCollapse(sim.supports, sim.terrain, dt, {
      onCollapse: function (g, broken) {
        for (var i = 0; i < broken.length; i++) {
          var b = broken[i];
          spawnDebris(sim, (b.x + 0.5) * T().TILE, (b.y + 0.5) * T().TILE, b.mat, 4, 220);
        }
      }
    });
    for (var i = 0; i < out.length; i++) sim.events.push(out[i]);
  }

  function stepUpdateNav(sim) {
    if (sim.terrain && sim.terrain.cellsChanged > 0) {
      sim.navVersion++;
      sim.terrain.cellsChanged = 0;
    }
  }

  function stepProjectiles(sim, dt) {
    var qd = req('queueDamage', './terrain.js');
    var list = sim.proj.list;
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (!s.alive) continue;
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      var dead = s.life <= 0;
      if (!dead && sim.terrain && qd) {
        var t = T().TILE;
        var tx = Math.floor(s.x / t), ty = Math.floor(s.y / t);
        var isSolid = req('isSolid', './terrain.js');
        if (isSolid && isSolid(sim.terrain, tx, ty)) {
          qd(sim.terrain, tx, ty, s.dmg, s.cause);
          var d = poolAcquire(sim.debris);
          if (d) {
            d.x = s.x; d.y = s.y; d.vx = -s.vx * 0.15; d.vy = -60;
            d.maxLife = 0.5; d.life = 0.5; d.mat = 3;
          }
          dead = true;
        }
      }
      if (dead) s.alive = false;
    }
  }

  function stepDebrisPickups(sim, dt) {
    var tun = T();
    var dl = sim.debris.list;
    for (var i = 0; i < dl.length; i++) {
      var d = dl[i];
      if (!d.alive) continue;
      d.life -= dt;
      if (d.life <= 0) { d.alive = false; continue; }
      d.vy = Math.min(tun.MAX_FALL, d.vy + tun.GRAVITY * 0.6 * dt);
      d.x += d.vx * dt;
      d.y += d.vy * dt;
    }
    var pl = sim.pickups.list;
    for (var j = 0; j < pl.length; j++) {
      var u = pl[j];
      if (!u.alive) continue;
      u.life -= dt;
      if (u.life <= 0) u.alive = false;
    }
  }

  function stepTrapped(sim, dt) {
    var tun = T();
    var p = sim.player;
    if (!p.alive) return;
    var hw = p.w / 2 + 3, hh = p.hgt / 2 + 3;
    var left = solidAtPx(sim, p.x - hw, p.y);
    var right = solidAtPx(sim, p.x + hw, p.y);
    var above = solidAtPx(sim, p.x, p.y - hh);
    if (left && right && above) p.trappedT += dt;
    else p.trappedT = Math.max(0, p.trappedT - 2 * dt);
    if (p.trappedT >= tun.TRAPPED_BREACH_T) {
      p.trappedT = 0;
      breachShaft(sim);
    }
  }

  // Carve a 2-wide vertical shaft above the player until open sky
  // (or BREACH_SHAFT_MAX_H). Never touches missionProtected cells.
  function breachShaft(sim) {
    var tun = T();
    var t = sim.terrain;
    var tile = T().TILE;
    var ptx = Math.floor(p.x / tile);
    var pty = Math.floor(p.y / tile);
    var getCell = req('getCell', './terrain.js');
    var setCell = req('setCell', './terrain.js');
    var opened = 0, skipped = 0, openRun = 0;
    var maxH = tun.BREACH_SHAFT_MAX_H;
    if (!t || !getCell || !setCell) {
      sim.events.push({ type: 'breach', x: ptx, y: pty, opened: 0, partial: true });
      return 0;
    }
    for (var y = pty - 1; y >= 0 && (pty - y) <= maxH; y--) {
      var rowOpen = true;
      for (var x = ptx; x <= ptx + 1; x++) {
        var c = getCell(t, x, y);
        if (c.mat === 0 || !c.solid) continue;
        if (c.missionProtected || !c.destructible) { rowOpen = rowOpen && false; skipped++; continue; }
        setCell(t, x, y, {
          mat: 0, hp: 0, solid: false, destructible: false,
          missionProtected: false, supportGroupId: 0, hazardOnBreak: false, variant: 0
        });
        opened++;
        spawnDebris(sim, (x + 0.5) * tile, (y + 0.5) * tile, c.mat, 2, 140);
      }
      var a = getCell(t, ptx, y), b = getCell(t, ptx + 1, y);
      if ((a.mat === 0 || !a.solid) && (b.mat === 0 || !b.solid)) openRun++;
      else openRun = 0;
      if (openRun >= 3) break;
      if (!rowOpen && openRun === 0 && skipped > 8) break;
    }
    sim.events.push({ type: 'breach', x: ptx, y: pty, opened: opened, partial: skipped > 0 });
    return opened;
  }

  // ---- main step ----

  function step(sim, dt, input) {
    var tun = T();
    var h = (typeof dt === 'number' && dt > 0) ? Math.min(dt, tun.MAX_DT) : tun.FIXED_DT;
    sim.time += h;
    sim.tickCount++;
    stepPlayer(sim, h, input);
    stepProjectiles(sim, h);
    stepQueueDamage(sim);          // 1) queued damage
    stepResolveCollapse(sim, h);   // 2) support collapse
    stepUpdateNav(sim);            // 3) nav invalidation
    stepDebrisPickups(sim, h);
    stepTrapped(sim, h);
    var terrainTick = req('terrainTick', './terrain.js');
    if (terrainTick && sim.terrain) terrainTick(sim.terrain, h);
    return sim;
  }

  // Fixed-timestep convenience for the frame loop owner (game.js).
  function tick(sim, input) {
    return step(sim, T().FIXED_DT, input);
  }

  // Deterministic FNV-1a hash over key state (positions rounded to 1e-3).
  function hash(sim) {
    var s = 't' + sim.tickCount + '|p' +
      Math.round(sim.player.x * 1000) + ',' + Math.round(sim.player.y * 1000) + ',' +
      Math.round(sim.player.vx * 1000) + ',' + Math.round(sim.player.vy * 1000) + '|n' + sim.navVersion;
    if (sim.terrain) {
      var keys = Object.keys(sim.terrain.chunks).sort();
      s += '|c' + keys.length;
      for (var k = 0; k < keys.length; k++) {
        var c = sim.terrain.chunks[keys[k]];
        var acc = 0;
        for (var i = 0; i < c.mats.length; i += 7) acc = (acc + c.mats[i] * (i + 1)) | 0;
        var hpAcc = 0;
        for (var j = 0; j < c.hp.length; j += 11) hpAcc = (hpAcc + c.hp[j]) | 0;
        s += ':' + keys[k] + '=' + (acc | 0) + '.' + (hpAcc | 0);
      }
    }
    if (sim.supports) {
      var gk = Object.keys(sim.supports.groups).sort();
      for (var g = 0; g < gk.length; g++) {
        var gr = sim.supports.groups[gk[g]];
        s += '|g' + gr.id + gr.state + Math.round(gr.hp);
      }
    }
    s += '|a' + poolAlive(sim.proj) + ',' + poolAlive(sim.debris) + ',' + poolAlive(sim.pickups);
    var h32 = 0x811c9dc5;
    for (var n = 0; n < s.length; n++) {
      h32 ^= s.charCodeAt(n);
      h32 = Math.imul(h32, 0x01000193);
    }
    return ('0000000' + (h32 >>> 0).toString(16)).slice(-8);
  }

  NS.createSim = createSim;
  NS.newRun = newRun;
  NS.step = step;
  NS.tick = tick;
  NS.hash = hash;
  NS.tryJump = tryJump;
  NS.tryDash = tryDash;
  NS.spawnShot = spawnShot;
  NS.spawnDebris = spawnDebris;
  NS.spawnPickup = spawnPickup;
  NS.explode = explode;
  NS.breachShaft = breachShaft;
  NS.poolAlive = poolAlive;
  if (!NS.TUNING) NS.TUNING = T();
  if (!NS.ARENA) NS.ARENA = ARENA();
  NS.__simLoaded = true;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      createSim: createSim, newRun: newRun, step: step, tick: tick, hash: hash,
      tryJump: tryJump, tryDash: tryDash, spawnShot: spawnShot,
      spawnDebris: spawnDebris, spawnPickup: spawnPickup, explode: explode,
      breachShaft: breachShaft, poolAlive: poolAlive
    };
  }
})();
