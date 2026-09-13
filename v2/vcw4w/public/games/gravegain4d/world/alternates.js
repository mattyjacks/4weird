/* GraveGain4D alternate worlds — DEPRECATED, moved to GraveGain5D.
 * Canon ruling 2026-09-13: GraveGain4D is time-travel-only (feature over
 * GraveGain3D = reverse time anytime + death-rewind with resource cost).
 * Alternate worlds (MoonRock Prime / Necro-Echo / MERCENARY-Dream) belong
 * to GraveGain5D. This file is kept as a fail-open shim so old saves and
 * old callers do not throw: single world, shift() refuses with
 * reason 'moved-to-5d', mirrorFloor() returns the floor unchanged.
 * New code: use GraveGain4DTimeline / GraveGain4DWorlds time-travel APIs.
 * Vanilla IIFE. Exposes window.GraveGain4DAlternates (created here).
 * Fail-open: every public function guards inputs and never throws.
 */
(function () {
  'use strict';

  var ROOT = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);

  if (ROOT.GraveGain4DAlternates && ROOT.GraveGain4DAlternates.alternatesVersion === '4d-alternates-1') return;

  var COOLDOWN_MS = 15000;

  var WORLDS = {
    moonrock_prime: {
      id: 'moonrock_prime',
      name: 'MoonRock Prime',
      palette: { fog: 0x0a1628, ambient: 0x9fc5ff, tint: 0x4a6fa5, accent: 0xe2e8f0 },
      spawnMod: { enemyMul: 1.0, goldMul: 1.0 },
      energyMod: 1.0,
      lore: 'The LZ as it was meant to be: clean regolith, blue floodlights, no dead. Hitting through here feels honest — the ball flies true.'
    },
    necro_echo: {
      id: 'necro_echo',
      name: 'Necro-Echo',
      palette: { fog: 0x150826, ambient: 0x8b5cf6, tint: 0x5b21b6, accent: 0x22c55e },
      spawnMod: { enemyMul: 1.5, goldMul: 1.25 },
      energyMod: 0.9,
      lore: 'Hades array feedback. Every grave you dug echoes back with interest: more husks, richer offerings, heavier air on every swing.'
    },
    mercenary_dream: {
      id: 'mercenary_dream',
      name: 'MERCENARY-Dream',
      palette: { fog: 0x2b0d0d, ambient: 0xf59e0b, tint: 0xef4444, accent: 0xfbbf24 },
      spawnMod: { enemyMul: 0.75, goldMul: 1.5 },
      energyMod: 1.15,
      lore: 'Lisa Park\u2019s prize-dream: hazard pay made manifest. Fewer teeth in the dark, fatter caches, and a tailwind on every drive.'
    }
  };

  var ORDER = ['moonrock_prime', 'necro_echo', 'mercenary_dream'];
  var currentId = 'moonrock_prime';
  var lastShiftAt = 0;

  function now() {
    try {
      if (typeof Date.now === 'function') return Date.now();
    } catch (e) { /* fall through */ }
    return 0;
  }

  function resolveId(id) {
    if (typeof id === 'string' && WORLDS.hasOwnProperty(id)) return id;
    return null;
  }

  function get(id) {
    var r = resolveId(id) || currentId;
    return WORLDS[r];
  }

  function cooldownLeftMs() {
    var left = COOLDOWN_MS - (now() - lastShiftAt);
    return left > 0 ? left : 0;
  }

  // Shift the active alternate world. DEPRECATED: alternate worlds moved
  // to GraveGain5D. Always refuses (except a no-op re-select of the single
  // kept world) with { ok:false, reason:'moved-to-5d' }; never throws.
  function shift(worldId) {
    var id = resolveId(worldId);
    if (!id) return { ok: false, world: get(), reason: 'moved-to-5d' };
    if (id === currentId) return { ok: true, world: get(), reason: 'single-world-noop' };
    return { ok: false, world: get(), reason: 'moved-to-5d' };
  }

  function current() { return get(); }
  function list() { return ORDER.slice(); }

  function toFinite(v, fb) {
    var f = (typeof fb === 'number' && isFinite(fb)) ? fb : 0;
    var n = (typeof v === 'number') ? v : parseFloat(v);
    return isFinite(n) ? n : f;
  }

  // Same-floor alternate mirroring: DEPRECATED (moved to GraveGain5D).
  // Returns the floor object unchanged (single-world identity) so old
  // callers keep rendering the same dungeon. Never throws.
  function mirrorFloor(floor, worldId) {
    if (!floor || typeof floor !== 'object' || !floor.cells) return floor || null;
    try { if (floor.alternate && floor.alternate !== currentId) floor.alternate = currentId; } catch (_) { /* ignore */ }
    return floor;
  }

  var api = {
    WORLDS: WORLDS,
    ORDER: ORDER.slice(),
    COOLDOWN_MS: COOLDOWN_MS,
    get: get,
    current: current,
    list: list,
    shift: shift,
    cooldownLeftMs: cooldownLeftMs,
    mirrorFloor: mirrorFloor,
    alternatesVersion: '4d-alternates-1'
  };

  ROOT.GraveGain4DAlternates = api;
  return api;
})();
