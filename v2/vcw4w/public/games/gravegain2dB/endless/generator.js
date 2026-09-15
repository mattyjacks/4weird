/* GraveGain2dB — endless/generator.js (xmur3 + mulberry32 seeded DAG).
 * Save keys: gg2db_endless_solo, gg2db_endless_2p, gg2db_endless_3p,
 * gg2db_endless_4p, gg2db_endless_a11y. Campaign save: GraveGain2DB_Save.
 * Codex: gg2db_codex_v1. 2dB namespace only.
 */
(function () {
  'use strict';

  var SAVE_KEYS = {
    solo: 'gg2db_endless_solo',
    '2p': 'gg2db_endless_2p',
    '3p': 'gg2db_endless_3p',
    '4p': 'gg2db_endless_4p',
    a11y: 'gg2db_endless_a11y'
  };
  var CAMPAIGN_SAVE_KEY = 'GraveGain2DB_Save';
  var CODEX_KEY = 'gg2db_codex_v1';
  var ROOM_IDS = ['entry', 'combat', 'arena', 'exit'];

  function xmur3(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
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
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rngFromSeed(seed) {
    var hash = xmur3(String(seed))();
    return mulberry32(hash);
  }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length) % arr.length]; }

  // Seeded DAG: depth nodes, entry first, exit last, edges only forward
  // (no cycles). Each node carries room + biome + budget.
  var BIOMES = ['crater', 'vaults', 'groves', 'outpost', 'shallows', 'catacombs', 'tomb', 'observatory', 'gate', 'sanctum'];

  function buildDag(seed, depth) {
    var rng = rngFromSeed(seed);
    var n = Math.max(3, depth || 6);
    var nodes = [];
    for (var i = 0; i < n; i++) {
      var room = i === 0 ? 'entry' : (i === n - 1 ? 'exit' : pick(rng, ['combat', 'arena', 'combat', 'exit']));
      nodes.push({
        idx: i,
        room: room,
        biome: BIOMES[Math.floor(rng() * BIOMES.length) % BIOMES.length],
        budget: { hazard: 1 + (i % 2), rescue: i % 2, elite: i >= 4 ? 1 : 0 }
      });
    }
    var edges = [];
    for (var a = 0; a < n - 1; a++) {
      edges.push([a, a + 1]); // spine guarantees reachability
      if (a + 2 < n && rng() < 0.5) edges.push([a, a + 2]); // forward shortcut, still acyclic
    }
    return { seed: String(seed), depth: n, nodes: nodes, edges: edges };
  }

  function saveKeyFor(partySize, flags) {
    flags = flags || {};
    if (flags.a11y) return SAVE_KEYS.a11y;
    if (partySize <= 1) return SAVE_KEYS.solo;
    if (partySize === 2) return SAVE_KEYS['2p'];
    if (partySize === 3) return SAVE_KEYS['3p'];
    return SAVE_KEYS['4p'];
  }

  var api = {
    SAVE_KEYS: SAVE_KEYS,
    CAMPAIGN_SAVE_KEY: CAMPAIGN_SAVE_KEY,
    CODEX_KEY: CODEX_KEY,
    ROOM_IDS: ROOM_IDS,
    xmur3: xmur3,
    mulberry32: mulberry32,
    rngFromSeed: rngFromSeed,
    buildDag: buildDag,
    saveKeyFor: saveKeyFor
  };
  try {
    if (typeof window !== 'undefined') window.GraveGain2dBEndlessGen = api;
    else if (typeof globalThis !== 'undefined') globalThis.GraveGain2dBEndlessGen = api;
  } catch (_) {}
  try { if (typeof module !== 'undefined' && module.exports) module.exports = api; } catch (_) {}
})();
