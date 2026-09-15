/* GraveGain2dB: Breach MoonRock — B3 shared deterministic sim (engine.js)
 * PURE SIM ONLY: no DOM/Canvas/Audio/fetch/WebSocket/React/localStorage/clock.
 * All randomness flows through world.rng (mulberry32, seeded). Tick-driven only.
 * Co-op scale rule: amplify chaos/teamwork (more spawns, combo pickups, shared
 * objectives) — NEVER flat HP-bloat boredom. Extra players add encounters, not sponges.
 *
 * LOCKED 12-STEP UPDATE ORDER (do not reorder — netcode + replay depend on it):
 *  1 inputs  2 movement  3 abilities/weapons  4 projectiles/hazards  5 hits
 *  6 damage queues  7 terrain/collapse  8 nav  9 enemies/scripted
 *  10 death/revive/pickup/rescue/objectives  11 events  12 snapshot
 *
 * ENTITY/DEBRIS/PICKUP BUDGETS (hard caps, oldest-first eviction):
 *  40 enemies, 80 projectiles, 250 debris, 20 pickups, 6 collapse groups.
 *
 * B2 DELEGATION: entity storage, projectile spawn tables, damage resolution,
 * terrain mutation and nav fields delegate to B2 globals when present
 * (window.GraveGain2DB_Terrain / window.GraveGain2DB_Combat /
 * window.GraveGain2DB_Enemies). Every call is typeof-guarded; when absent the
 * engine uses the built-in fallback below so the sim still runs deterministically.
 * Enemy AI here is INTENT-expression stubs only (seek/flee/hold + telegraph);
 * full behaviour trees belong to B2/AI lanes.
 */
(function () {
  'use strict';
  var G = (typeof window !== 'undefined') ? window : ((typeof globalThis !== 'undefined') ? globalThis : {});
  if (G.GraveGain2DB_Engine && G.GraveGain2DB_Engine.__v === 1) return; // idempotent

  var BUDGETS = { enemies: 40, projectiles: 80, debris: 250, pickups: 20, collapseGroups: 6 };
  var STEP_ORDER = ['inputs', 'movement', 'abilities', 'projectiles', 'hits', 'damage',
    'terrain', 'nav', 'enemies', 'objectives', 'events', 'snapshot'];
  var SIM_HZ = 60;
  var WORLD_W = 2048, WORLD_H = 1152; // fixed-point-ish integer world units

  function mulberry32(seed) {
    var a = (seed >>> 0) || 0x9e3779b9;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // rng state lives on the world so snapshots stay deterministic
  function rand(world) { return world._rng(); }
  function randRange(world, lo, hi) { return lo + rand(world) * (hi - lo); }
  function randInt(world, lo, hi) { return lo + Math.floor(rand(world) * (hi - lo + 1)); }

  function clampNum(v, lo, hi) {
    if (typeof v !== 'number' || isNaN(v)) return lo;
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function hasB2(name, fn) {
    try {
      var mod = G[name];
      return !!(mod && typeof mod[fn] === 'function');
    } catch (e) { return false; }
  }

  function createWorld(seed, opts) {
    opts = opts || {};
    var world = {
      __kind: 'gg2db-world',
      seed: (seed >>> 0) || 1,
      tick: 0,
      endlessDepth: opts.endlessDepth || 0, // endless mode scales spawns, not HP
      players: {},      // id -> {x,y,vx,vy,aim,hp,maxHp,alive,cooldowns,race,cls,missedFrames,shieldUntil}
      enemies: [],      // {id,kind,x,y,vx,vy,hp,intent,tx,ty}
      projectiles: [],  // {id,owner,x,y,vx,vy,life,dmg,team}
      debris: [],       // {x,y,vx,vy,life}
      pickups: [],      // {id,kind,x,y,taken}
      damageQueue: [],  // {target,kind,amount,tick,source} — server-applied only
      terrain: { version: 0, holes: [], dirty: [] }, // B2 replaces internals when present
      nav: { version: 0, flowX: 0, flowY: 0 },
      collapseGroups: [], // max 6 active terrain-collapse zones
      objectives: { list: [], extraction: { open: false, x: 0, y: 0, progress: 0 } },
      checkpoints: [],    // {id,x,y,claimedBy:[]}
      events: [],         // {seq,type,data,tick} — reliable-channel feed
      eventSeq: 0,
      nextId: 1,
      _rng: null,
      _snap: null
    };
    world._rng = mulberry32(world.seed ^ 0xB3EC);
    // Endless seed: depth folds into spawn tables, never into HP pools.
    if (world.endlessDepth > 0) {
      for (var i = 0; i < world.endlessDepth; i++) rand(world);
    }
    return world;
  }

  function addPlayer(world, id, spawn) {
    spawn = spawn || { x: WORLD_W / 2, y: WORLD_H / 2 };
    world.players[id] = {
      id: id, x: clampNum(spawn.x, 0, WORLD_W), y: clampNum(spawn.y, 0, WORLD_H),
      vx: 0, vy: 0, aim: 0, hp: 100, maxHp: 100, alive: true,
      cooldowns: { fire: 0, dash: 0, alt: 0, interact: 0 },
      race: 0, cls: 0, missedFrames: 0, shieldUntil: 0,
      revives: 0, rescues: 0, kills: 0
    };
    return world.players[id];
  }

  function emit(world, type, data) {
    world.eventSeq += 1;
    var ev = { seq: world.eventSeq, type: type, data: data || {}, tick: world.tick };
    world.events.push(ev);
    if (world.events.length > 64) world.events.splice(0, world.events.length - 64);
    return ev;
  }

  function evictOldest(arr, cap) {
    if (arr.length > cap) arr.splice(0, arr.length - cap);
  }

  // ---- 12 steps -----------------------------------------------------------
  // 1: inputs — latch validated raw input frames onto players (no simulation yet)
  function stepInputs(world, inputs) {
    inputs = inputs || {};
    for (var id in world.players) {
      if (!Object.prototype.hasOwnProperty.call(world.players, id)) continue;
      var p = world.players[id];
      var f = Object.prototype.hasOwnProperty.call(inputs, id) ? inputs[id] : null;
      if (!f) { p.missedFrames += 1; p._frame = null; continue; }
      p.missedFrames = 0;
      p._frame = {
        moveX: clampNum(f.moveX, -1, 1), moveY: clampNum(f.moveY, -1, 1),
        aimAngle: clampNum(f.aimAngle, -Math.PI, Math.PI),
        buttons: (f.buttons >>> 0) & 0xFF
      };
    }
  }

  // 2: movement — integrate velocity from latched input (fixed accel/friction)
  function stepMovement(world) {
    for (var id in world.players) {
      if (!Object.prototype.hasOwnProperty.call(world.players, id)) continue;
      var p = world.players[id];
      if (!p.alive || !p._frame) continue;
      var ACC = 900 / SIM_HZ, MAXV = 220 / SIM_HZ * SIM_HZ / SIM_HZ; // 220 u/s
      p.vx += p._frame.moveX * ACC;
      p.vy += p._frame.moveY * ACC;
      var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      var max = 220;
      if (sp > max) { p.vx = p.vx / sp * max; p.vy = p.vy / sp * max; }
      p.vx *= 0.86; p.vy *= 0.86; // friction per tick
      p.x = clampNum(p.x + p.vx / SIM_HZ, 0, WORLD_W);
      p.y = clampNum(p.y + p.vy / SIM_HZ, 0, WORLD_H);
      p.aim = p._frame.aimAngle;
      void MAXV;
    }
    for (var i = 0; i < world.enemies.length; i++) {
      var e = world.enemies[i];
      e.x = clampNum(e.x + e.vx / SIM_HZ, 0, WORLD_W);
      e.y = clampNum(e.y + e.vy / SIM_HZ, 0, WORLD_H);
    }
  }

  // 3: abilities/weapons — fire-rate + cooldown gates, spawn via B2 tables or fallback
  function stepAbilities(world) {
    for (var id in world.players) {
      if (!Object.prototype.hasOwnProperty.call(world.players, id)) continue;
      var p = world.players[id];
      if (!p.alive || !p._frame) continue;
      for (var k in p.cooldowns) {
        if (Object.prototype.hasOwnProperty.call(p.cooldowns, k) && p.cooldowns[k] > 0) p.cooldowns[k] -= 1;
      }
      var b = p._frame.buttons;
      if ((b & 2) && p.cooldowns.fire <= 0) { // Fire
        p.cooldowns.fire = 9; // ~6.7 shots/s cap enforced sim-side
        spawnProjectile(world, id, p.x, p.y, p.aim, 520, 12, 'team-player');
      }
      if ((b & 4) && p.cooldowns.alt <= 0) { // Alt
        p.cooldowns.alt = 30;
        spawnProjectile(world, id, p.x, p.y, p.aim, 340, 26, 'team-player');
      }
      if ((b & 8) && p.cooldowns.dash <= 0) { // Dash (movement burst, i-frames lite)
        p.cooldowns.dash = 45;
        p.vx += Math.cos(p.aim) * 420; p.vy += Math.sin(p.aim) * 420;
        p.shieldUntil = world.tick + 6;
      }
    }
  }

  function spawnProjectile(world, owner, x, y, angle, speed, dmg, team) {
    if (world.projectiles.length >= BUDGETS.projectiles) world.projectiles.shift();
    var spec = null;
    if (hasB2('GraveGain2DB_Combat', 'makeProjectile')) {
      try { spec = G.GraveGain2DB_Combat.makeProjectile({ owner: owner, angle: angle, speed: speed, dmg: dmg, team: team }); } catch (e) { spec = null; }
    }
    var id = 'pr' + (world.nextId++);
    world.projectiles.push({
      id: id, owner: owner, x: x, y: y,
      vx: Math.cos(angle) * (spec && spec.speed || speed),
      vy: Math.sin(angle) * (spec && spec.speed || speed),
      life: 90, dmg: (spec && spec.dmg) || dmg, team: team
    });
    return id;
  }

  // 4: projectiles/hazards — integrate, expire, collapse-zone damage ticks
  function stepProjectiles(world) {
    for (var i = world.projectiles.length - 1; i >= 0; i--) {
      var pr = world.projectiles[i];
      pr.x += pr.vx / SIM_HZ; pr.y += pr.vy / SIM_HZ; pr.life -= 1;
      if (pr.life <= 0 || pr.x < 0 || pr.y < 0 || pr.x > WORLD_W || pr.y > WORLD_H) {
        world.projectiles.splice(i, 1);
        spawnDebris(world, pr.x, pr.y, 3);
      }
    }
    for (var c = 0; c < world.collapseGroups.length; c++) {
      var g = world.collapseGroups[c];
      g.ticks -= 1;
      if (g.ticks <= 0) { emit(world, 'collapse-end', { group: g.id }); world.collapseGroups.splice(c, 1); c--; }
    }
  }

  function spawnDebris(world, x, y, n) {
    for (var i = 0; i < n; i++) {
      if (world.debris.length >= BUDGETS.debris) world.debris.shift();
      world.debris.push({ x: x, y: y, vx: randRange(world, -120, 120), vy: randRange(world, -120, 120), life: randInt(world, 20, 60) });
    }
    for (var d = world.debris.length - 1; d >= 0; d--) {
      var p = world.debris[d];
      p.x += p.vx / SIM_HZ; p.y += p.vy / SIM_HZ; p.life -= 1;
      if (p.life <= 0) world.debris.splice(d, 1);
    }
  }

  // 5: hits — circle tests, enqueue damage claims (never apply here)
  function stepHits(world) {
    for (var i = world.projectiles.length - 1; i >= 0; i--) {
      var pr = world.projectiles[i];
      var consumed = false;
      if (pr.team === 'team-player') {
        for (var e = 0; e < world.enemies.length; e++) {
          var en = world.enemies[e];
          var dx = en.x - pr.x, dy = en.y - pr.y;
          if (dx * dx + dy * dy < 28 * 28) {
            queueDamage(world, { target: en.id, kind: 'enemy', amount: pr.dmg, source: pr.owner });
            consumed = true; break;
          }
        }
      } else {
        for (var id in world.players) {
          if (!Object.prototype.hasOwnProperty.call(world.players, id)) continue;
          var pl = world.players[id];
          if (!pl.alive || world.tick < pl.shieldUntil) continue;
          var ox = pl.x - pr.x, oy = pl.y - pr.y;
          if (ox * ox + oy * oy < 24 * 24) {
            queueDamage(world, { target: id, kind: 'player', amount: pr.dmg, source: pr.owner });
            consumed = true; break;
          }
        }
      }
      if (consumed) { world.projectiles.splice(i, 1); spawnDebris(world, pr.x, pr.y, 2); }
    }
  }

  function queueDamage(world, claim) {
    world.damageQueue.push({
      target: String(claim.target), kind: claim.kind === 'player' ? 'player' : 'enemy',
      amount: clampNum(claim.amount, 0, 999), tick: world.tick, source: String(claim.source || 'sim')
    });
  }

  // 6: damage queues — B2 resolves when present, else flat subtraction fallback
  function stepDamage(world) {
    if (hasB2('GraveGain2DB_Combat', 'resolveQueue')) {
      try { G.GraveGain2DB_Combat.resolveQueue(world, world.damageQueue); world.damageQueue.length = 0; return; }
      catch (e) { /* fall through to fallback */ }
    }
    for (var i = 0; i < world.damageQueue.length; i++) {
      var d = world.damageQueue[i];
      if (d.kind === 'player') {
        var p = world.players[d.target];
        if (p && p.alive && world.tick >= p.shieldUntil) {
          p.hp -= d.amount;
          emit(world, 'player-hit', { id: d.target, hp: Math.max(0, Math.round(p.hp)) });
        }
      } else {
        for (var e = 0; e < world.enemies.length; e++) {
          if (world.enemies[e].id === d.target) {
            world.enemies[e].hp -= d.amount;
            var pl = world.players[d.source];
            if (world.enemies[e].hp <= 0 && pl) pl.kills += 1;
            break;
          }
        }
      }
    }
    world.damageQueue.length = 0;
  }

  // 7: terrain/collapse — B2 mutates when present; cap 6 active groups, teamplay: shared cover
  function stepTerrain(world) {
    if (hasB2('GraveGain2DB_Terrain', 'tick')) {
      try { G.GraveGain2DB_Terrain.tick(world); return; }
      catch (e) { /* fallback below */ }
    }
    world.terrain.version += 0; // fallback: static terrain, version bumps only on holes
  }

  function addCollapseGroup(world, x, y, radius, ticks) {
    if (world.collapseGroups.length >= BUDGETS.collapseGroups) world.collapseGroups.shift();
    var g = { id: 'cg' + (world.nextId++), x: x, y: y, r: radius, ticks: ticks || 300 };
    world.collapseGroups.push(g);
    emit(world, 'collapse-start', { group: g.id, x: Math.round(x), y: Math.round(y) });
    return g.id;
  }

  // 8: nav — B2 flow-field refresh when present, else cheap team-centroid drift vector
  function stepNav(world) {
    if (hasB2('GraveGain2DB_Enemies', 'refreshNav')) {
      try { G.GraveGain2DB_Enemies.refreshNav(world); return; }
      catch (e) { /* fallback */ }
    }
    var cx = 0, cy = 0, n = 0;
    for (var id in world.players) {
      if (!Object.prototype.hasOwnProperty.call(world.players, id)) continue;
      var p = world.players[id];
      if (!p.alive) continue;
      cx += p.x; cy += p.y; n++;
    }
    if (n > 0) { world.nav.flowX = cx / n; world.nav.flowY = cy / n; }
    world.nav.version += 1;
  }

  // 9: enemies/scripted — INTENT STUBS ONLY (seek/flee/hold + telegraph); B2 owns brains
  function stepEnemies(world) {
    var want = Math.min(BUDGETS.enemies, 6 + world.endlessDepth * 2 + playerCount(world) * 3);
    if (world.enemies.length < want && world.tick % 30 === 0) spawnEnemy(world);
    for (var i = world.enemies.length - 1; i >= 0; i--) {
      var e = world.enemies[i];
      if (e.hp <= 0) {
        emit(world, 'enemy-down', { id: e.id, kind: e.kind });
        maybeDropPickup(world, e.x, e.y);
        spawnDebris(world, e.x, e.y, 5);
        world.enemies.splice(i, 1);
        continue;
      }
      // intent stub: steer by intent toward (tx,ty); flee inverts; telegraph pauses
      if (e.intent === 'telegraph') { e.vx *= 0.8; e.vy *= 0.8; if (world.tick >= e.actAt) e.intent = 'seek'; continue; }
      var s = e.speed || 90;
      var dx = e.tx - e.x, dy = e.ty - e.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      var dir = (e.intent === 'flee') ? -1 : 1;
      e.vx = dx / d * s * dir; e.vy = dy / d * s * dir;
      if (hasB2('GraveGain2DB_Enemies', 'think')) {
        try { G.GraveGain2DB_Enemies.think(world, e); } catch (err) { /* stub survives */ }
      }
      // scripted touch: enemy contact enqueues (never applies) player damage
      for (var id in world.players) {
        if (!Object.prototype.hasOwnProperty.call(world.players, id)) continue;
        var p = world.players[id];
        if (!p.alive) continue;
        var ox = p.x - e.x, oy = p.y - e.y;
        if (ox * ox + oy * oy < 30 * 30 && world.tick % 30 === 0) {
          queueDamage(world, { target: id, kind: 'player', amount: 8, source: e.id });
        }
      }
    }
  }

  function playerCount(world) {
    var n = 0;
    for (var k in world.players) if (Object.prototype.hasOwnProperty.call(world.players, k)) n++;
    return n;
  }

  function spawnEnemy(world) {
    if (world.enemies.length >= BUDGETS.enemies) return null;
    var kinds = ['husk', 'spitter', 'brute'];
    var kind = kinds[randInt(world, 0, kinds.length - 1)];
    // Co-op chaos scaling: pack spawns grow with players; HP stays flat (no bloat).
    var en = {
      id: 'en' + (world.nextId++), kind: kind,
      x: randRange(world, 64, WORLD_W - 64), y: randRange(world, 64, WORLD_H - 64),
      vx: 0, vy: 0, hp: kind === 'brute' ? 60 : 30, speed: kind === 'spitter' ? 70 : 95,
      intent: 'seek', tx: world.nav.flowX || WORLD_W / 2, ty: world.nav.flowY || WORLD_H / 2,
      actAt: world.tick + 120
    };
    if (hasB2('GraveGain2DB_Enemies', 'decorate')) {
      try { G.GraveGain2DB_Enemies.decorate(world, en); } catch (e) { /* keep stub */ }
    }
    world.enemies.push(en);
    return en.id;
  }

  // 10: death/revive/pickup/rescue/objectives — shared teamplay outcomes
  function stepObjectives(world) {
    for (var id in world.players) {
      if (!Object.prototype.hasOwnProperty.call(world.players, id)) continue;
      var p = world.players[id];
      if (!p._frame) continue;
      var b = p._frame.buttons;
      if (p.alive && (b & 16) && p.cooldowns.interact <= 0) { // Interact
        p.cooldowns.interact = 12;
        tryInteract(world, p);
      }
      if (p.alive) {
        for (var i = world.pickups.length - 1; i >= 0; i--) {
          var pk = world.pickups[i];
          if (pk.taken) continue;
          var dx = p.x - pk.x, dy = p.y - pk.y;
          if (dx * dx + dy * dy < 30 * 30) {
            pk.taken = true;
            applyPickup(world, p, pk);
            world.pickups.splice(i, 1);
          }
        }
      }
    }
    for (var q in world.players) {
      if (!Object.prototype.hasOwnProperty.call(world.players, q)) continue;
      var pl = world.players[q];
      if (pl.alive && pl.hp <= 0) {
        pl.alive = false; pl.hp = 0;
        emit(world, 'player-down', { id: q });
      }
    }
    // checkpoint + extraction progress (team-shared)
    var ex = world.objectives.extraction;
    if (ex.open) {
      var inside = 0, total = 0;
      for (var r in world.players) {
        if (!Object.prototype.hasOwnProperty.call(world.players, r)) continue;
        var rp = world.players[r];
        if (!rp.alive) continue;
        total++;
        var exd = (rp.x - ex.x) * (rp.x - ex.x) + (rp.y - ex.y) * (rp.y - ex.y);
        if (exd < 90 * 90) inside++;
      }
      ex.progress = total > 0 ? inside / total : 0;
      if (inside > 0 && inside === total) emit(world, 'extract-tick', { progress: ex.progress });
      if (ex.progress >= 1) { emit(world, 'extracted', { tick: world.tick }); ex.open = false; }
    }
  }

  function tryInteract(world, p) {
    // revive nearest downed teammate (teamwork over self-sustain)
    var best = null, bestD = 70 * 70;
    for (var id in world.players) {
      if (!Object.prototype.hasOwnProperty.call(world.players, id) || id === p.id) continue;
      var o = world.players[id];
      if (o.alive) continue;
      var dx = o.x - p.x, dy = o.y - p.y, d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = o; }
    }
    if (best) {
      best.alive = true; best.hp = best.maxHp * 0.5; best.shieldUntil = world.tick + 60;
      p.revives += 1;
      emit(world, 'revive', { by: p.id, id: best.id });
      return;
    }
    for (var i = 0; i < world.checkpoints.length; i++) {
      var c = world.checkpoints[i];
      var cx = c.x - p.x, cy = c.y - p.y;
      if (cx * cx + cy * cy < 70 * 70 && c.claimedBy.indexOf(p.id) === -1) {
        c.claimedBy.push(p.id);
        emit(world, 'checkpoint', { id: c.id, by: p.id });
        return;
      }
    }
  }

  function maybeDropPickup(world, x, y) {
    if (world.pickups.length >= BUDGETS.pickups) return;
    if (rand(world) < 0.35) {
      var kinds = ['medkit', 'ammo', 'shield'];
      world.pickups.push({ id: 'pk' + (world.nextId++), kind: kinds[randInt(world, 0, 2)], x: x, y: y, taken: false });
    }
  }

  function applyPickup(world, p, pk) {
    if (pk.kind === 'medkit') p.hp = Math.min(p.maxHp, p.hp + 40);
    else if (pk.kind === 'shield') p.shieldUntil = world.tick + 120;
    emit(world, 'pickup', { by: p.id, kind: pk.kind });
  }

  // 11: events — already emitted inline; here: cap is enforced in emit()
  function stepEvents(world) { void world; }

  // 12: snapshot — canonical world digest for netcode + replay hash
  function stepSnapshot(world) {
    world._snap = takeSnapshot(world);
  }

  function takeSnapshot(world) {
    var players = {};
    for (var id in world.players) {
      if (!Object.prototype.hasOwnProperty.call(world.players, id)) continue;
      var p = world.players[id];
      players[id] = {
        x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100,
        hp: Math.round(p.hp), alive: p.alive ? 1 : 0, aim: Math.round(p.aim * 1000) / 1000
      };
    }
    var enemies = world.enemies.map(function (e) {
      return [e.id, Math.round(e.x), Math.round(e.y), Math.round(e.hp), e.intent];
    });
    return {
      tick: world.tick, seed: world.seed,
      players: players, enemies: enemies,
      projectiles: world.projectiles.length, pickups: world.pickups.length,
      terrainVersion: world.terrain.version,
      objectives: world.objectives.extraction.open ? 1 : 0,
      eventSeq: world.eventSeq
    };
  }

  function snapshotHash(snap) {
    var s = JSON.stringify(snap);
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return ('0000000' + (h >>> 0).toString(16)).slice(-8);
  }

  // reward calc STUB — server finalises; never trust client claims (see net/protocol.js)
  function calcRewards(world) {
    var kills = 0, revives = 0;
    for (var id in world.players) {
      if (!Object.prototype.hasOwnProperty.call(world.players, id)) continue;
      kills += world.players[id].kills; revives += world.players[id].revives;
    }
    return { kills: kills, revives: revives, depth: world.endlessDepth, tick: world.tick, final: false };
  }

  function step(world, inputs) {
    stepInputs(world, inputs);      // 1
    stepMovement(world);            // 2
    stepAbilities(world);           // 3
    stepProjectiles(world);         // 4
    stepHits(world);                // 5
    stepDamage(world);              // 6
    stepTerrain(world);             // 7
    stepNav(world);                 // 8
    stepEnemies(world);             // 9
    stepObjectives(world);          // 10
    stepEvents(world);              // 11
    world.tick += 1;
    stepSnapshot(world);            // 12
    return world._snap;
  }

  // replay determinism stub: same seed + same input list => identical snapshot hash
  function replayCheck(seed, inputScript, ticks) {
    var w1 = createWorld(seed), w2 = createWorld(seed);
    var h1 = '', h2 = '';
    for (var t = 0; t < ticks; t++) {
      var inp = (inputScript && inputScript[t]) || {};
      h1 = snapshotHash(step(w1, inp));
      h2 = snapshotHash(step(w2, JSON.parse(JSON.stringify(inp))));
    }
    return { hashA: h1, hashB: h2, match: h1 === h2 };
  }

  var Engine = {
    __v: 1, BUDGETS: BUDGETS, STEP_ORDER: STEP_ORDER, SIM_HZ: SIM_HZ,
    WORLD_W: WORLD_W, WORLD_H: WORLD_H,
    mulberry32: mulberry32, createWorld: createWorld, addPlayer: addPlayer,
    step: step, emit: emit, takeSnapshot: takeSnapshot, snapshotHash: snapshotHash,
    calcRewards: calcRewards, replayCheck: replayCheck,
    addCollapseGroup: addCollapseGroup, spawnEnemy: spawnEnemy, spawnProjectile: spawnProjectile
  };
  G.GraveGain2DB_Engine = Engine;
  G.GraveGainMods = G.GraveGainMods || [];
  G.GraveGainMods.push('sim/engine.js');
})();
