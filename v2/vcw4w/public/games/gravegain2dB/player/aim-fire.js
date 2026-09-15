'use strict';
/* GraveGain2dB movement lab — independent 360 aim + fire with
 * IMMEDIATE muzzle-flash + recoil hooks (synchronous in tryFire/tryAlt).
 * Aim priority: mouse (360) -> right stick (360) -> keyboard 8-dir fallback.
 * Works while running, jumping, dashing or climbing: aim never moves the body.
 * Global: window.GraveGain2dBPlayerAimFire
 */
(function (root) {
  var TAU = Math.PI * 2;

  var WEAPONS = {
    sidearm:  { ratePerSec: 6,  speed: 640, power: 1, kick: 26,  spread: 0.02, ammo: Infinity },
    rifle:    { ratePerSec: 9,  speed: 780, power: 1, kick: 22,  spread: 0.015, ammo: Infinity },
    scatter:  { ratePerSec: 2,  speed: 560, power: 4, kick: 120, spread: 0.16, pellets: 5, ammo: 24 },
    launcher: { ratePerSec: 1,  speed: 420, power: 12, kick: 170, spread: 0.01, ammo: 6, explosive: true },
    beam:     { ratePerSec: 30, speed: 0, power: 0.4, kick: 4, spread: 0, ammo: 100, beam: true }
  };

  function createAim() {
    return { angle: 0, mode: 'keys8', flip: false };
  }

  function createTrigger() {
    return { nextAt: -1e9, altNextAt: -1e9 };
  }

  // cam = { x, y, scale } world coords of the canvas top-left (see camera).
  function updateAim(aim, body, input, cam) {
    var cx = body.x + body.w / 2;
    var cy = body.y + body.h / 2;
    if (input.aimScreen && input.aimScreen.active) {
      var s = (cam && cam.scale) || 1;
      var wx = (cam ? cam.x : 0) + input.aimScreen.x / s;
      var wy = (cam ? cam.y : 0) + input.aimScreen.y / s;
      aim.angle = Math.atan2(wy - cy, wx - cx);
      aim.mode = 'mouse';
    } else if (input.stickAim && input.stickAim.active) {
      aim.angle = Math.atan2(input.stickAim.y, input.stickAim.x);
      aim.mode = 'stick';
    } else {
      var d = null;
      var inp = root.GraveGain2dBPlayerInput;
      if (inp && inp.aim8Dir) d = inp.aim8Dir(input, body.facing);
      else {
        var dx = (input.down.moveRight ? 1 : 0) - (input.down.moveLeft ? 1 : 0);
        var dy = (input.down.down ? 1 : 0) - (input.down.up ? 1 : 0);
        if (dx === 0 && dy === 0) dx = body.facing >= 0 ? 1 : -1;
        var l = Math.sqrt(dx * dx + dy * dy) || 1;
        d = { x: dx / l, y: dy / l };
      }
      aim.angle = Math.atan2(d.y, d.x);
      aim.mode = 'keys8';
    }
    var nx = Math.cos(aim.angle);
    aim.flip = nx < 0;
    return aim;
  }

  function muzzleOf(body, angle, dist) {
    var d = (dist == null ? 20 : dist);
    return {
      x: body.x + body.w / 2 + Math.cos(angle) * d,
      y: body.y + body.h / 2 + Math.sin(angle) * d
    };
  }

  // hooks = { onMuzzle(evt), onRecoil(body, evt) } — called synchronously.
  function tryFire(trig, body, aim, weaponKey, ammo, hooks, nowMs) {
    var def = WEAPONS[weaponKey] || WEAPONS.sidearm;
    if (nowMs < trig.nextAt) return null;
    if (ammo != null && ammo <= 0) return null;
    trig.nextAt = nowMs + 1000 / def.ratePerSec;
    var m = muzzleOf(body, aim.angle);
    var evt = {
      kind: 'shot', weapon: weaponKey,
      x: m.x, y: m.y, angle: aim.angle,
      speed: def.speed, power: def.power,
      spread: def.spread, pellets: def.pellets || 1,
      explosive: !!def.explosive, beam: !!def.beam
    };
    // Immediate feedback hooks: art spawns the flash this same frame,
    // movement feels the kick this same frame.
    if (hooks && typeof hooks.onMuzzle === 'function') hooks.onMuzzle(evt);
    if (hooks && typeof hooks.onRecoil === 'function') hooks.onRecoil(body, evt);
    else {
      body.vx -= Math.cos(aim.angle) * def.kick;
      body.vy -= Math.sin(aim.angle) * def.kick * 0.6;
    }
    return evt;
  }

  function tryAlt(trig, body, aim, hooks, nowMs) {
    if (nowMs < trig.altNextAt) return null;
    trig.altNextAt = nowMs + 1200;
    var m = muzzleOf(body, aim.angle, 24);
    var evt = { kind: 'grenade', x: m.x, y: m.y, angle: aim.angle, power: 8 };
    if (hooks && typeof hooks.onMuzzle === 'function') hooks.onMuzzle(evt);
    if (hooks && typeof hooks.onRecoil === 'function') hooks.onRecoil(body, evt);
    else {
      body.vx -= Math.cos(aim.angle) * 90;
      body.vy -= Math.sin(aim.angle) * 60;
    }
    return evt;
  }

  root.GraveGain2dBPlayerAimFire = {
    WEAPONS: WEAPONS,
    createAim: createAim,
    createTrigger: createTrigger,
    updateAim: updateAim,
    muzzleOf: muzzleOf,
    tryFire: tryFire,
    tryAlt: tryAlt
  };
})(typeof window !== 'undefined' ? window : globalThis);
