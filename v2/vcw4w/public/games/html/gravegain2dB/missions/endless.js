/* GraveGain2dB: Breach MoonRock — Endless mode (lane B6).
 * NEW file owned by B6. Procedural-in-SEQUENCING (not raw terrain):
 * seed + biome sequence + room graph + budgets + hazard/rescue/weapon/
 * elite/boss/reward tables. Room templates carry entry/exit sockets,
 * protected floor, destructible layer, support decls, spawns,
 * civilian/pickup anchors, nav zones, palette, safe route, breach location.
 * Vanilla JS, no imports, idempotent. Registers window.GraveGain2DB_Endless
 * and pushes a GraveGainMods entry.
 */
(function () {
  'use strict';
  if (window.GraveGain2DB_Endless) return; // idempotent under double-injection

  var VERSION = '0.1.0-b6';

  // --- Deterministic RNG (mulberry32) over a hashed seed string ---
  function hashSeed(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var BIOMES = ['groves', 'vaults', 'outpost', 'shallows', 'catacombs', 'tomb', 'observatory', 'gate', 'sanctum'];

  var HAZARDS = ['burn-roots', 'ore-chute surge', 'fuel fire', 'falling bells', 'vent gas', 'keystone sway', 'pylon fall', 'tower debris', 'core pulse'];
  var RESCUE = ['civilians', 'miners', 'scouts', 'divers', 'burial party', 'archivist', 'spotters', 'engineers', 'last civilians'];
  var WEAPONS = ['breach charge', 'root-torch', 'chute-jammer', 'fuel-siphon', 'bell-hook', 'vent-lantern', 'seal-thread', 'pylon-paint', 'support-cutter'];
  var ELITES = ['ash warden', 'forge hulk', 'fuel reaver', 'bell ringer', 'vent mother', 'seal keeper', 'lens horror', 'gate captain', 'core herald'];
  var BOSSES = ['GROVE WARDEN', 'FORGE GUARD', 'OUTPOST WAR-CHIEF', 'DROWNED CHOIR', 'NEST-MOTHER', 'TOMB-LORD', 'STAR-CALLER', 'GATE-WARDEN', 'SANCTUM CORE'];
  var REWARDS = ['seed-cache', 'ingots', 'fuel cells', 'salvage', 'relics', 'archive', 'lenses', 'gate-keys', 'core-shards'];

  // Room template schema: every template must carry all of these keys.
  var TEMPLATE_KEYS = ['id', 'entrySockets', 'exitSockets', 'protectedFloor', 'destructibleLayer', 'supports', 'spawns', 'civilianAnchors', 'pickupAnchors', 'navZones', 'palette', 'safeRoute', 'breachLocation'];
  var ROOM_TEMPLATES = [
    {
      id: 'breach-entry', entrySockets: ['west'], exitSockets: ['east'],
      protectedFloor: true, destructibleLayer: 'walls', supports: ['lintel'],
      spawns: ['risen'], civilianAnchors: [], pickupAnchors: ['ammo'],
      navZones: ['floor'], palette: 'moonrock-grey', safeRoute: 'west-to-east low',
      breachLocation: 'east wall'
    },
    {
      id: 'crossfire-hall', entrySockets: ['west'], exitSockets: ['east', 'north'],
      protectedFloor: true, destructibleLayer: 'pillars', supports: ['arch-left', 'arch-right'],
      spawns: ['risen', 'spitter'], civilianAnchors: ['alcove'], pickupAnchors: ['medkit', 'ammo'],
      navZones: ['floor', 'balcony'], palette: 'vault-amber', safeRoute: 'center trench to east',
      breachLocation: 'north pillar base'
    },
    {
      id: 'rescue-nook', entrySockets: ['south'], exitSockets: ['north'],
      protectedFloor: true, destructibleLayer: 'rubble', supports: ['beam'],
      spawns: ['lurker'], civilianAnchors: ['nook', 'nook-2'], pickupAnchors: ['relic'],
      navZones: ['floor'], palette: 'grove-green', safeRoute: 'south edge to north',
      breachLocation: 'rubble pile west'
    },
    {
      id: 'boss-arena', entrySockets: ['south'], exitSockets: ['south'],
      protectedFloor: true, destructibleLayer: 'arena-pillars', supports: ['ring-a', 'ring-b', 'ring-c'],
      spawns: ['boss'], civilianAnchors: [], pickupAnchors: ['boss-cache'],
      navZones: ['arena-floor', 'rim'], palette: 'sanctum-violet', safeRoute: 'rim circuit',
      breachLocation: 'arena crown'
    }
  ];

  function validateRoomTemplate(t) {
    if (!t) return false;
    for (var i = 0; i < TEMPLATE_KEYS.length; i++) {
      if (!(TEMPLATE_KEYS[i] in t)) return false;
    }
    if (!t.entrySockets.length || !t.exitSockets.length) return false;
    if (t.protectedFloor !== true) return false;
    if (!t.breachLocation || !t.safeRoute) return false;
    return true;
  }

  // Sector pacing: 1-2 identity, 3 boss, 4-5 mutation, 6 elite, 7 boss, 8+ high-risk rares.
  function sectorKind(sector) {
    if (sector <= 2) return 'identity';
    if (sector === 3) return 'boss';
    if (sector === 4 || sector === 5) return 'mutation';
    if (sector === 6) return 'elite';
    if (sector === 7) return 'boss';
    return 'high-risk-rares';
  }

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length) % arr.length]; }

  function buildRun(seedStr, maxSectors) {
    var rng = mulberry32(hashSeed(seedStr));
    var sectors = [];
    var n = maxSectors || 8;
    for (var s = 1; s <= n; s++) {
      var kind = sectorKind(s);
      var rooms = kind === 'boss' ? ['breach-entry', 'boss-arena'] : ['breach-entry', 'crossfire-hall', 'rescue-nook'];
      var budget = { hazard: kind === 'identity' ? 1 : 2, rescue: s % 2, weapon: 1, elite: kind === 'elite' ? 2 : (s >= 8 ? 1 : 0), boss: kind === 'boss' ? 1 : 0 };
      sectors.push({
        sector: s, kind: kind,
        biome: BIOMES[Math.floor(rng() * BIOMES.length) % BIOMES.length],
        rooms: rooms,
        budgets: budget,
        hazard: pick(rng, HAZARDS), rescue: pick(rng, RESCUE), weapon: pick(rng, WEAPONS),
        elite: kind === 'elite' || s >= 8 ? pick(rng, ELITES) : null,
        boss: kind === 'boss' ? BOSSES[(s - 1) % BOSSES.length] : null,
        reward: pick(rng, REWARDS)
      });
    }
    return { seed: seedStr, sectors: sectors };
  }

  // Daily server-seed hook: host injects the day string; client derives the run.
  function dailySeed(dateStr) { return 'moonrock-daily-' + (dateStr || new Date().toISOString().slice(0, 10)); }
  function dailyRun(dateStr, maxSectors) { return buildRun(dailySeed(dateStr), maxSectors); }

  // Leaderboards split: solo / duo / trio / quad / accessibility.
  // Content-mode is NOT a split — filtered out, never ranked.
  var LEADERBOARD_SPLITS = ['solo', '2', '3', '4', 'accessibility'];
  function leaderboardSplit(partySize, flags) {
    flags = flags || {};
    if (flags.contentMode) return null; // content-mode runs do not rank
    if (flags.accessibility) return 'accessibility';
    if (partySize <= 1) return 'solo';
    if (partySize === 2) return '2';
    if (partySize === 3) return '3';
    return '4';
  }

  function init() { return { version: VERSION, templates: ROOM_TEMPLATES.length }; }

  window.GraveGain2DB_Endless = {
    version: VERSION,
    biomes: BIOMES,
    roomTemplates: ROOM_TEMPLATES,
    templateKeys: TEMPLATE_KEYS,
    validateRoomTemplate: validateRoomTemplate,
    sectorKind: sectorKind,
    buildRun: buildRun,
    dailySeed: dailySeed,
    dailyRun: dailyRun,
    leaderboardSplits: LEADERBOARD_SPLITS,
    leaderboardSplit: leaderboardSplit,
    init: init
  };

  window.GraveGainMods = window.GraveGainMods || [];
  window.GraveGainMods.push({ name: 'gravegain2dB-endless', version: VERSION, init: init });
})();
