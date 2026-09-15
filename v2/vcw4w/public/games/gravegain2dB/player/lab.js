'use strict';
/* GraveGain2dB movement lab — empty-arena harness proving the feel loop:
 * run / jump / double-jump / dash / independent aim / fire, coyote +
 * jump + dash buffers, hold-to-grab ladders, camera, death/restart.
 * Loose coupling: art/hud/audio globals are picked up at CALL time from
 * `root` so the lab runs standalone and richer once the integrator wires
 * sibling systems. No progression, just excellent feel.
 * Global: window.GraveGain2dBPlayerLab
 */
(function (root) {
  function P(name) { return root[name] || null; }

  // Empty arena fixture: flat floor, two platforms, one ladder, side walls.
  function createArena() {
    var solids = [
      { x: -80, y: 640, w: 1440, h: 80 },   // floor
      { x: -80, y: 0, w: 40, h: 640 },      // left wall
      { x: 1320, y: 0, w: 40, h: 640 },     // right wall
      { x: 260, y: 500, w: 220, h: 24 },    // low platform
      { x: 760, y: 380, w: 220, h: 24 }     // high platform
    ];
    var ladders = [
      { x: 600, y: 440, w: 40, h: 200 }     // floor -> high platform lane
    ];
    return {
      solids: solids,
      ladders: ladders,
      spawn: { x: 120, y: 560 },
      bounds: { minX: -80, minY: -40, maxX: 1360, maxY: 720 }
    };
  }

  function makeWorld(arena) {
    function overlap(b, s) {
      return b.x < s.x + s.w && b.x + b.w > s.x && b.y < s.y + s.h && b.y + b.h > s.y;
    }
    return {
      gravityScale: 1,
      ladderAt: function (x, y) {
        for (var i = 0; i < arena.ladders.length; i++) {
          var l = arena.ladders[i];
          if (x >= l.x && x <= l.x + l.w && y >= l.y && y <= l.y + l.h) return true;
        }
        return false;
      },
      moveX: function (b, dx) {
        b.x += dx;
        for (var i = 0; i < arena.solids.length; i++) {
          if (overlap(b, arena.solids[i])) {
            if (dx > 0) b.x = arena.solids[i].x - b.w;
            else if (dx < 0) b.x = arena.solids[i].x + arena.solids[i].w;
            return true;
          }
        }
        return false;
      },
      moveY: function (b, dy) {
        b.y += dy;
        var res = { hitFloor: false, hitCeiling: false };
        for (var i = 0; i < arena.solids.length; i++) {
          var s = arena.solids[i];
          if (overlap(b, s)) {
            if (dy > 0) { b.y = s.y - b.h; res.hitFloor = true; }
            else if (dy < 0) { b.y = s.y + s.h; res.hitCeiling = true; }
            else { res.hitFloor = true; }
          }
        }
        return res;
      }
    };
  }

  function createLab(opts) {
    opts = opts || {};
    var Movement = P('GraveGain2dBPlayerMovement');
    var AimFire = P('GraveGain2dBPlayerAimFire');
    var Camera = P('GraveGain2dBPlayerCamera');
    var Life = P('GraveGain2dBPlayerLife');
    if (!Movement || !AimFire || !Camera || !Life) {
      throw new Error('GraveGain2dBPlayerLab: sibling player/* globals missing');
    }
    var arena = createArena();
    var world = makeWorld(arena);
    var body = Movement.createBody(arena.spawn.x, arena.spawn.y, 22, 34);
    var aim = AimFire.createAim();
    var trig = AimFire.createTrigger();
    var vitals = Life.createVitals({ hpMax: 100 });
    var cam = Camera.createCamera(opts.viewW || 1280, opts.viewH || 720);
    cam.x = 0; cam.y = 0;
    var shots = []; // sim-side projectile stubs for the lab (pooled by art)
    var fxQueue = null; // drained by the integrator into art pools each frame
    var sprites = {};   // per-actor squash & stretch state for ArtFx
    function spriteFor(id) {
      var Fx = P('GraveGain2dBArtFx');
      if (!Fx) return null;
      if (!sprites[id]) sprites[id] = Fx.createSpriteFx();
      return sprites[id];
    }
    var hooks = {
      onMuzzle: function (evt) {
        shots.push(evt);
        var Fx = P('GraveGain2dBArtFx');
        if (Fx) {
          if (!fxQueue) fxQueue = Fx.createFxQueue();
          Fx.emitMuzzle(fxQueue, evt.x, evt.y, evt.angle, evt.weapon);
          var st = spriteFor('player0');
          if (st) Fx.muzzleKick(st);
        }
        if (Camera && evt.weapon === 'launcher') Camera.addTrauma(cam, 0.35);
        else if (Camera && evt.kind === 'grenade') Camera.addTrauma(cam, 0.25);
      },
      onRecoil: function (b, evt) {
        var kick = (AimFire.WEAPONS[evt.weapon] || {}).kick || 24;
        b.vx -= Math.cos(evt.angle) * kick;
        b.vy -= Math.sin(evt.angle) * kick * 0.6;
        var Fx = P('GraveGain2dBArtFx');
        if (Fx) {
          var rst = spriteFor('player0');
          if (rst) Fx.kickSprite(rst, evt.angle, kick);
        }
      }
    };
    return {
      arena: arena, world: world, body: body, aim: aim,
      trig: trig, vitals: vitals, cam: cam, shots: shots,
      hooks: hooks, sprites: sprites,
      fxQueue: function () { return fxQueue; },
      nowMs: 0,
      update: function (input, dt, nowMs) {
        this.nowMs = nowMs;
        Movement.step(body, input, world, nowMs, dt);
        AimFire.updateAim(aim, body, input, { x: cam.x, y: cam.y, scale: cam.scale });
        if (input.down.fire) {
          var s = AimFire.tryFire(trig, body, aim, 'rifle', Infinity, hooks, nowMs);
          if (s) this.shots.push(s);
        }
        if (input.pressed && input.pressed.altfire) {
          var g = AimFire.tryAlt(trig, body, aim, hooks, nowMs);
          if (g) this.shots.push(g);
        }
        var ev = Life.updateDowned(vitals, nowMs);
        Camera.follow(cam, [Object.assign({ dead: vitals.dead }, body)], arena.bounds, dt);
        // Lab shots fly straight and die off-arena (no sim dependency).
        for (var i = this.shots.length - 1; i >= 0; i--) {
          var sh = this.shots[i];
          if (sh.beam || sh.kind === 'grenade') continue;
          sh.x += Math.cos(sh.angle) * sh.speed * dt;
          sh.y += Math.sin(sh.angle) * sh.speed * dt;
          if (sh.x < arena.bounds.minX || sh.x > arena.bounds.maxX ||
              sh.y < arena.bounds.minY || sh.y > arena.bounds.maxY) {
            this.shots.splice(i, 1);
          }
        }
        return ev;
      },
      killAndRestart: function () {
        Life.damage(vitals, 9999, 'debug', this.nowMs, Movement, body);
        Life.respawn(vitals, 'lab-spawn');
        body.x = arena.spawn.x; body.y = arena.spawn.y;
        body.vx = 0; body.vy = 0;
        return Life.restartMission([vitals]);
      }
    };
  }

  root.GraveGain2dBPlayerLab = {
    createArena: createArena,
    makeWorld: makeWorld,
    createLab: createLab
  };
})(typeof window !== 'undefined' ? window : globalThis);
