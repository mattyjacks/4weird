/* GraveGain2dB — missions/mission01.js (FULL vertical slice).
 * Canon: content/gravegain-epic-saga.ts M1 "Mission 1 — LZ Crash Site Defense"
 * boss "Goblin Zed Leader". Spec: Crashsite Breach / Colony Alpha crater /
 * secure survivors + black box / collapse memorial wall.
 * Vanilla JS, no imports/exports. Idempotent. Never throws at load.
 * Defines window.GraveGain2dBMissions.registerMissionExtra(id, extra) and
 * registers mission 1 fully. Missions 2-10 call registerMissionExtra.
 * Save/codex keys: GraveGain2DB_Save, gg2db_codex_v1 (2dB namespace only).
 */
(function () {
  'use strict';

  var SAVE_KEY = 'GraveGain2DB_Save';
  var CODEX_KEY = 'gg2db_codex_v1';

  var SCORE_KEYS = ['BreachTime', 'Rescues', 'Chain', 'Demolition', 'CleanExit'];
  var OBJECTIVE_CHAIN_M01 = ['BRIEF', 'SECURE_BOX', 'RESCUE_OPT', 'REACH_WALL', 'COLLAPSE_WALL', 'KILL_WARDEN', 'EXTRACT', 'DONE'];

  // No-HP-bloat difficulty contract: Nightmare varies density/coordination/
  // timers, never enemy HP (hpMult stays 1.0 on Breach + Nightmare).
  var DIFFICULTIES = {
    Cadet: { id: 'Cadet', enemyHpMult: 0.8, enemyDmgMult: 0.7, enemyDensityMult: 0.7, eliteChance: 0.02, civilianForgiveness: true, note: 'Training tuning. Fewer hostiles, forgiving civilians.' },
    Breach: { id: 'Breach', enemyHpMult: 1.0, enemyDmgMult: 1.0, enemyDensityMult: 1.0, eliteChance: 0.06, civilianForgiveness: false, note: 'Intended tuning.' },
    Nightmare: { id: 'Nightmare', enemyHpMult: 1.0, enemyDmgMult: 1.1, enemyDensityMult: 1.35, eliteChance: 0.12, civilianForgiveness: false, coordination: true, note: 'Denser mixed groups + tighter timers. Enemy HP NOT scaled.' }
  };

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

  function validateExtra(id, extra) {
    var errs = [];
    if (!isObj(extra)) return ['extra must be an object'];
    if (typeof extra.briefing !== 'string' || !extra.briefing) errs.push('briefing required');
    if (!Array.isArray(extra.zones) || extra.zones.length < 1) errs.push('zones required');
    if (!isObj(extra.finale)) errs.push('finale required');
    if (typeof extra.codex !== 'string' || !extra.codex) errs.push('codex required');
    if (!isObj(extra.routes)) errs.push('routes required');
    if (!isObj(extra.difficulties)) errs.push('difficulties required');
    else {
      ['Cadet', 'Breach', 'Nightmare'].forEach(function (k) {
        if (!isObj(extra.difficulties[k])) errs.push('difficulties.' + k + ' required');
      });
      var nm = extra.difficulties.Nightmare;
      if (nm && nm.enemyHpMult !== 1.0) errs.push('difficulties.Nightmare.enemyHpMult must be 1.0 (no-HP-bloat)');
      var br = extra.difficulties.Breach;
      if (br && br.enemyHpMult !== 1.0) errs.push('difficulties.Breach.enemyHpMult must be 1.0 (no-HP-bloat)');
    }
    return errs;
  }

  function getNS() {
    var ns = null;
    try {
      if (typeof window !== 'undefined' && window.GraveGain2dBMissions) ns = window.GraveGain2dBMissions;
      else if (typeof globalThis !== 'undefined' && globalThis.GraveGain2dBMissions) ns = globalThis.GraveGain2dBMissions;
    } catch (_) { ns = null; }
    return ns;
  }

  // Define namespace once (mission01 owns the registry shape).
  var ns = getNS();
  if (!ns) {
    var store = Object.create(null);
    ns = {
      SAVE_KEY: SAVE_KEY,
      CODEX_KEY: CODEX_KEY,
      SCORE_KEYS: SCORE_KEYS,
      DIFFICULTIES: DIFFICULTIES,
      registerMissionExtra: function (id, extra) {
        try {
          var errs = validateExtra(id, extra);
          if (errs.length) return { ok: false, errors: errs };
          store[String(id)] = extra;
          return { ok: true };
        } catch (e) {
          return { ok: false, errors: ['exception: ' + String((e && e.message) || e)] };
        }
      },
      getMissionExtra: function (id) {
        try { return store[String(id)] || null; } catch (_) { return null; }
      },
      listMissionExtras: function () {
        try { return Object.keys(store).sort(); } catch (_) { return []; }
      },
      validateExtra: validateExtra
    };
    try {
      if (typeof window !== 'undefined') window.GraveGain2dBMissions = ns;
      else if (typeof globalThis !== 'undefined') globalThis.GraveGain2dBMissions = ns;
    } catch (_) { /* ignore */ }
    try {
      if (typeof module !== 'undefined' && module.exports) module.exports = ns;
    } catch (_) { /* browser */ }
  }

  /* ---- MISSION 01 FULL DATA ---- */
  var mission01 = {
    id: 1,
    canonTitle: 'Mission 1 — LZ Crash Site Defense',
    canonSubtitle: 'The Descent on MoonRock',
    canonLocation: 'Colony LZ Sector Alpha',
    canonBoss: 'Goblin Zed Leader',
    canonLogline: 'Put the LZ\u2019s own risen burial detail — including James Wright — back to rest.',
    loreUnlocks: ['world_first_grave', 'necro_survivor', 'human_orientation'],
    briefing: 'Colony LZ Sector Alpha is overrun: the memorial-garden dead — including James Wright, the first colonist buried on MoonRock — have risen alongside crater-crawlers. Secure the dropship black box (SECURE_BOX), work the optional rescue pocket (RESCUE_OPT), reach the memorial wall, collapse it onto the horde, drop the warden-lite, and extract. Rifles off stun; aim for joints.',
    threat: 'Freshly-risen burial detail + crater swarm; memorial-wall garrison',
    bossDisplay: { name: 'GOBLIN ZED LEADER (WARDEN-LITE)', banner: '⚔️ WARDEN-LITE: GOBLIN ZED LEADER ⚔️' },
    // Z0 safe opening, Z1 zeds, Z2 bone rifles, Z3 shortcut teach, Z4 rescue,
    // checkpoint, Z5 memorial-wall (3 supports), warden-lite, extraction.
    zones: [
      { id: 'm01-z0-muster', kind: 'safe', summary: 'Z0 safe opening: sheltered muster behind the dropship ramp. Zero hostiles; drill targets only.', enemies: [], supports: [] },
      { id: 'm01-z1-craters', kind: 'combat', summary: 'Z1 crater field: Colony Zeds shamble from impact pits. Teaches move/aim/fire.', enemies: ['zed'], supports: [] },
      { id: 'm01-z2-rifles', kind: 'combat', summary: 'Z2 rifle nests: Bone Rifles fire cross-screen from scrap cover. Flank or break cover.', enemies: ['zed', 'bone-rifle'], supports: ['scrap-nest-a'] },
      { id: 'm01-z3-shortcut', kind: 'teach', summary: 'Z3 shortcut teach: cracked masonry span + glowing support bolts. BREACH shortcut skips the kill pocket; precision ledge stays open.', enemies: ['zed'], supports: ['cracked-span'], teaching: 'Shoot marked support bolts to drop the span; keystone is protected.' },
      { id: 'm01-z4-rescue', kind: 'rescue', summary: 'Z4 rescue pocket: trapped medic behind rubble. Free via precision escort or wall-behind collapse (never onto the civilian).', enemies: ['zed', 'sapper'], supports: ['rubble-mouth'], optional: true },
      { id: 'm01-z5-wall', kind: 'collapse', summary: 'Z5 memorial wall: 3 marked supports hold the zed-filled wall. Drop all 3 to collapse it onto the horde, then face the warden-lite.', enemies: ['zed', 'bone-rifle', 'sapper'], supports: ['wall-support-a', 'wall-support-b', 'wall-support-c'] }
    ],
    checkpoint: { id: 'm01-ridge-checkpoint', before: 'Z5 collapse', desc: 'Pre-climax checkpoint between Z4 rescue and Z5 wall. Heals; respawns here for collapse + warden-lite + extraction.', heals: true },
    finale: { kind: 'boss', name: 'GOBLIN ZED LEADER (WARDEN-LITE)', then: 'extraction', extraction: { id: 'm01-dustoff', desc: 'Hold the dustoff pad, then extract with survivors + black box.' } },
    codex: 'lz_memorial_wall',
    objectiveChain: OBJECTIVE_CHAIN_M01,
    scoreKeys: SCORE_KEYS,
    score: { parSeconds: 420, keys: SCORE_KEYS },
    routes: {
      primary: { id: 'm01-primary', summary: 'Ramp -> craters -> rifle nests -> rescue -> ridge checkpoint -> wall -> dustoff.', waypoints: [{ x: 40, y: 100 }, { x: 320, y: 120 }, { x: 560, y: 140 }, { x: 760, y: 120 }] },
      shortcut: { id: 'm01-shortcut', summary: 'DESTRUCTIVE: drop Z3 cracked span + Z5 wall early onto patrols; cross the rubble bridge.', destructive: true, waypoints: [{ x: 320, y: 120 }, { x: 520, y: 160 }, { x: 760, y: 120 }] },
      fallback: { id: 'm01-fallback', summary: 'EMERGENCY: Valley Net breach vents around the wall if the span seals; long way to dustoff.', emergency: true, waypoints: [{ x: 320, y: 120 }, { x: 400, y: 300 }, { x: 760, y: 120 }] }
    },
    difficulties: JSON.parse(JSON.stringify(DIFFICULTIES)),
    dialogueBefore: [
      { speaker: 'Valley Net', text: 'Dropship 420 is down in Sector Alpha. Memorial detail risen — including James Wright. Helmet seals locked.' },
      { speaker: 'Private Lisa Park', text: 'We buried James ourselves. We put our people back to rest. Rifles off stun.' }
    ],
    dialogueAfter: [
      { speaker: 'Valley Net', text: 'LZ secured. Black box aboard, wall fell where it had to. Extraction is hot.' }
    ],
    parSeconds: 420,
    saveKey: SAVE_KEY,
    codexKey: CODEX_KEY
  };

  try { ns.registerMissionExtra(1, mission01); } catch (_) { /* never throw */ }
})();
