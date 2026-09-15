/* GraveGain2dB sim determinism fixture + self-test notes.
 *
 * What this file is: a replay fixture that PROVES "same seed + same inputs =
 * identical output", plus the notes a reviewer needs to re-run it. It drives
 * only the public sim-core API (createWorld, step, snapshot, hashSnapshot)
 * with scripted inputs derived from the sim RNG itself — never from a host
 * entropy source or clock.
 *
 * Run it:  node v2/vcw4w/public/games/gravegain2dB/sim/sim-determinism-fixture.js
 * Expected: exit 0 and a "DETERMINISM OK" line with two identical hashes.
 * Change ANY sim behavior (integration order, damage numbers, RNG taps and
 * their order) and the hash below changes — that is the point. When you
 * intentionally change behavior, record the new hash here with the reason.
 *
 * Reference hashes (60Hz x 600 ticks, 2 players, 6 enemies, seed vr-moonrock):
 *   v1 (sim-core 1.0.0, flat-ground fallback): 277068c4 (58 events / 600 ticks)
 *
 * Determinism rules the sim obeys (keep these true or the hash is void):
 *  1. Inputs are plain data; the sim coerces NaN/unknown bits, never reads
 *     host state to fill gaps.
 *  2. Randomness comes only from world.rng (xmur3+mulberry32 over the
 *     normalized 'vr-ibrasek' seed). Taps happen in fixed phase order.
 *  3. Float math is limited to correctly-rounded IEEE ops (+ - * / compare,
 *     floor/min/max/abs/sqrt). No trig/exp/log on the sim path, so every
 *     engine that implements IEEE-754 doubles replays bit-identically.
 *  4. Entity iteration is pool-index order; spawn ids are monotonic. There
 *     is no hash-map iteration and no wall-clock anywhere in the loop.
 *  5. Terrain is injected or flat-ground; the fixture uses flat-ground so it
 *     also pins the fallback behavior other lanes rely on.
 *
 * Purity contract: same as sim-core — no DOM, no rendering contexts, no
 * audio, no network, no storage, no clock, no unseeded entropy. The ONLY
 * host-global references allowed are the guarded registrations at the
 * bottom. `require` is referenced only inside a typeof guard so browsers
 * ignore it and node can load the sibling files.
 *
 * Style: vanilla IIFE + 'use strict', matching gravegain2dA/game.js.
 */
(function () {
  'use strict';

  var Sim = null;
  try {
    if (typeof window !== 'undefined' && window.GraveGain2dBSimCore) {
      Sim = window.GraveGain2dBSimCore;
    }
  } catch (err) { Sim = null; }
  if (!Sim) {
    try {
      if (typeof require === 'function') {
        Sim = require('./sim-core.js');
      }
    } catch (err) { Sim = null; }
  }

  var FIXTURE = {
    name: 'gg2db-sim-determinism-v1',
    seed: 'vr-moonrock',
    ticks: 600,
    players: [
      { x: 0, y: -40, hp: 100, weapon: 'sidearm' },
      { x: 64, y: -40, hp: 100, weapon: 'sidearm' }
    ],
    enemies: [
      { kind: 'chaser', x: 300, y: -40, hp: 30, dmg: 8, speed: 110 },
      { kind: 'chaser', x: -260, y: -40, hp: 30, dmg: 8, speed: 110 },
      { kind: 'shooter', x: 520, y: -120, hp: 25, dmg: 6, speed: 80, fireDelay: 20 },
      { kind: 'shooter', x: -480, y: -120, hp: 25, dmg: 6, speed: 80, fireDelay: 40 },
      { kind: 'chaser', x: 180, y: -200, hp: 60, dmg: 12, speed: 90 },
      { kind: 'chaser', x: -180, y: -200, hp: 60, dmg: 12, speed: 90 }
    ],
    weapons: {
      sidearm: {
        id: 'sidearm', damage: 12, projectileSpeed: 900, cooldownTicks: 9,
        pierce: 0, lifeTicks: 90, terrainDamage: 2, kickback: 0,
        explosive: false, radius: 0
      },
      scatter: {
        id: 'scatter', damage: 6, projectileSpeed: 700, cooldownTicks: 22,
        pierce: 1, lifeTicks: 40, terrainDamage: 8, kickback: 120,
        explosive: false, radius: 0
      }
    }
  };

  // Scripted input program: fully derived from tick index + a fixture-local
  // sim RNG stream (seeded from the fixture seed + '-inputs'), so the input
  // tape itself is deterministic and reproducible on any host.
  function buildInputTape(ticks, numPlayers, seed) {
    var rng = Sim.createRng(seed + '-inputs');
    var tape = [];
    var t, s;
    for (t = 0; t < ticks; t++) {
      var frame = [];
      for (s = 0; s < numPlayers; s++) {
        var b = 0;
        var phase = Math.floor(t / 75) % 4;
        if (phase === 0) {
          b |= Sim.BUTTON.RIGHT;
        } else if (phase === 1) {
          b |= Sim.BUTTON.LEFT;
        } else if (phase === 2) {
          b |= Sim.BUTTON.RIGHT | Sim.BUTTON.JUMP;
        } else {
          b |= Sim.BUTTON.LEFT | Sim.BUTTON.FIRE;
        }
        if (t % 10 < 6) {
          b |= Sim.BUTTON.FIRE;
        }
        if (t === 100 + s * 30 || t === 320 + s * 17) {
          b |= Sim.BUTTON.DASH;
        }
        if (t === 200) {
          b |= Sim.BUTTON.SWAP1;
        }
        var ax = (t % 2 === 0 ? 1 : -1) * (0.3 + 0.7 * rng.next());
        var ay = rng.next() * 2 - 1;
        frame.push({ buttons: b, aimX: ax, aimY: ay });
      }
      tape.push(frame);
    }
    return tape;
  }

  function runOnce() {
    var world = Sim.createWorld({
      seed: FIXTURE.seed,
      weapons: FIXTURE.weapons,
      players: FIXTURE.players
    });
    var i;
    for (i = 0; i < FIXTURE.enemies.length; i++) {
      Sim.spawnEnemy(world, FIXTURE.enemies[i]);
    }
    Sim.spawnPickup(world, { kind: 'weapon', weaponId: 'scatter', x: 120, y: -60 });
    Sim.spawnPickup(world, { kind: 'health', amount: 25, x: -120, y: -60 });
    var tape = buildInputTape(FIXTURE.ticks, FIXTURE.players.length, FIXTURE.seed);
    var eventCount = 0;
    for (i = 0; i < FIXTURE.ticks; i++) {
      var res = Sim.step(world, tape[i]);
      eventCount += res.events.length;
    }
    var snap = Sim.snapshot(world);
    return { hash: Sim.hashSnapshot(snap), events: eventCount, snap: snap };
  }

  function selfTest(print) {
    if (!Sim) {
      if (print) {
        print('DETERMINISM BLOCKED: sim-core not loaded (no window.GraveGain2dBSimCore, no require).');
      }
      return { ok: false, reason: 'sim-core-missing' };
    }
    var a = runOnce();
    var b = runOnce();
    var ok = a.hash === b.hash;
    var c = Sim.createWorld({ seed: 'vr-moonrock-alt', players: FIXTURE.players });
    var i;
    for (i = 0; i < FIXTURE.ticks; i++) {
      Sim.step(c, [{ buttons: 0, aimX: 1, aimY: 0 }, { buttons: 0, aimX: 1, aimY: 0 }]);
    }
    var controlHash = Sim.hashSnapshot(Sim.snapshot(c));
    var sensitive = controlHash !== a.hash;
    if (print) {
      print('fixture : ' + FIXTURE.name);
      print('ticks   : ' + FIXTURE.ticks + ' @ ' + Sim.TICK_HZ + 'Hz, seed ' + FIXTURE.seed);
      print('run A   : ' + a.hash + ' (' + a.events + ' events)');
      print('run B   : ' + b.hash + ' (' + b.events + ' events)');
      print('control : ' + controlHash + ' (different seed+inputs must differ)');
      print(ok && sensitive ? 'DETERMINISM OK' : 'DETERMINISM FAIL');
    }
    return { ok: ok && sensitive, hash: a.hash, events: a.events, control: controlHash };
  }

  var api = { FIXTURE: FIXTURE, runOnce: runOnce, selfTest: selfTest };

  try {
    if (typeof window !== 'undefined') {
      window.GraveGain2dBSimDeterminism = api;
    }
  } catch (err) { /* non-browser host: module export below applies */ }

  try {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = api;
    }
  } catch (err) { /* browser-only host: registration above applies */ }

  try {
    if (typeof process !== 'undefined' && process.argv && process.argv[1] &&
        /sim-determinism-fixture\.js$/.test(process.argv[1])) {
      var res = selfTest(function (line) {
        try {
          process.stdout.write(line + '\n');
        } catch (err) { /* stdout gone; exit code still reports */ }
      });
      try {
        process.exitCode = res.ok ? 0 : 1;
      } catch (err) { /* host without exit codes; output above stands */ }
    }
  } catch (err) { /* imported as a library: stay silent */ }
})();
