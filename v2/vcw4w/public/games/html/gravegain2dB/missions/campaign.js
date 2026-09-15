/* GraveGain2dB: Breach MoonRock — Campaign missions 2-10 (lane B6).
 * NEW file owned by B6. NEVER edit mission1.js (B4 owns mission 1).
 * Vanilla JS, no imports, idempotent. Registers window.GraveGain2DB_Campaign
 * and pushes a GraveGainMods entry.
 *
 * Shared 10-mission sequence alignment (B4 owns slot 1, B6 owns slots 2-10):
 *   1 (B4/mission1.js): LZ Crash Site — movement/fire tutorial, 15 hostiles.
 *   2 (here): Elven Groves — burn-roots / bridge demolition.
 *   3 (here): Dwarven Vaults — ore-chutes / lift rigging.
 *   4 (here): Orc Outpost — ramp breaching / fuel denial.
 *   5 (here): Shallows — shaft drops / falling-bell hazard.
 *   6 (here): Catacombs — tank rupture / vent flushing.
 *   7 (here): Tomb — breach WITHOUT crushing (precision-only clear).
 *   8 (here): Observatory — pylon toppling / orbital bombardment call-in.
 *   9 (here): Gate — tower collapse / platform sequencing.
 *  10 (here): Sanctum — armor-support cuts / core collapse. MoonRock victory + season hook.
 */
(function () {
  'use strict';
  if (window.GraveGain2DB_Campaign) return; // idempotent under double-injection

  var VERSION = '0.1.0-b6';

  // Difficulty params shared shape: { Cadet: {...}, Breach: {...}, Nightmare: {...} }
  function diff(hpMultC, dmgMultC, hpMultB, dmgMultB, hpMultN, dmgMultN, densityN) {
    return {
      Cadet: { enemyHpMult: hpMultC, enemyDmgMult: dmgMultC, enemyDensityMult: 0.7, eliteChance: 0.02, parSeconds: 600 },
      Breach: { enemyHpMult: hpMultB, enemyDmgMult: dmgMultB, enemyDensityMult: 1.0, eliteChance: 0.06, parSeconds: 480 },
      Nightmare: { enemyHpMult: hpMultN, enemyDmgMult: dmgMultN, enemyDensityMult: densityN, eliteChance: 0.12, parSeconds: 360 }
    };
  }

  // Every mission validates: reachable entry -> objective -> exit, protected extraction.
  // entry/objective/exit are zone ids; extraction.protectedFloor must be true.
  var MISSIONS = [
    {
      id: 2, slug: 'elven-groves', title: 'MISSION 2 — ELVEN GROVES',
      briefing: 'Root-bridges feed the grove warden. Burn the tap-roots, drop both bridges, then extract. Civilians sheltering in the hollow — bring them out.',
      zones: [
        { id: 'grove-entry', entry: true, objective: false, exitTo: 'root-bridge' },
        { id: 'root-bridge', entry: false, objective: true, exitTo: 'hollow' },
        { id: 'hollow', entry: false, objective: false, exitTo: 'grove-extract' },
        { id: 'grove-extract', entry: false, objective: false, exitTo: null }
      ],
      entry: 'grove-entry', objective: 'root-bridge', exit: 'grove-extract',
      teaching: 'Breach lesson: burn-roots first — fire spreads along tap-roots and drops bridges without wasting charges.',
      rescueLoot: 'Hollow rescue path: 2 civilians + seed-cache loot behind the second bridge.',
      checkpoint: 'Pre-climax checkpoint at hollow gate before the warden wakes.',
      finale: { kind: 'boss', name: 'GROVE WARDEN' },
      codex: 'grove_burn_roots',
      routes: { destructive: 'Blow both bridges early — fast but loses the seed-cache.', precision: 'Burn roots only, walk the bridge down intact, keep the cache.' },
      extraction: { zone: 'grove-extract', protectedFloor: true },
      difficulty: diff(0.8, 0.8, 1.0, 1.0, 1.4, 1.3, 1.3)
    },
    {
      id: 3, slug: 'dwarven-vaults', title: 'MISSION 3 — DWARVEN VAULTS',
      briefing: 'Ore-chutes feed the vault forge. Jam the chutes, ride the lifts down, crack the vault. Miners trapped on the gantry — cut them loose.',
      zones: [
        { id: 'vault-entry', entry: true, objective: false, exitTo: 'ore-chutes' },
        { id: 'ore-chutes', entry: false, objective: true, exitTo: 'lift-shaft' },
        { id: 'lift-shaft', entry: false, objective: false, exitTo: 'vault-extract' },
        { id: 'vault-extract', entry: false, objective: false, exitTo: null }
      ],
      entry: 'vault-entry', objective: 'ore-chutes', exit: 'vault-extract',
      teaching: 'Breach lesson: ore-chutes are supports — jam one and the lift counterweight drops you a free ride.',
      rescueLoot: 'Gantry rescue path: 3 miners + ingot loot in the chute overflow.',
      checkpoint: 'Pre-climax checkpoint at the lift brake before the forge guard.',
      finale: { kind: 'boss', name: 'FORGE GUARD' },
      codex: 'vault_ore_chutes',
      routes: { destructive: 'Blast all chutes — buries the ingots but opens the vault fast.', precision: 'Jam chutes selectively, ride the lift, keep the ingots.' },
      extraction: { zone: 'vault-extract', protectedFloor: true },
      difficulty: diff(0.8, 0.8, 1.0, 1.0, 1.45, 1.3, 1.35)
    },
    {
      id: 4, slug: 'orc-outpost', title: 'MISSION 4 — ORC OUTPOST',
      briefing: 'Ramps ring the outpost fuel farm. Breach the ramps, torch the fuel, get out before the blaze. A scout team is pinned at the depot — break them out.',
      zones: [
        { id: 'outpost-approach', entry: true, objective: false, exitTo: 'fuel-farm' },
        { id: 'fuel-farm', entry: false, objective: true, exitTo: 'depot' },
        { id: 'depot', entry: false, objective: false, exitTo: 'outpost-extract' },
        { id: 'outpost-extract', entry: false, objective: false, exitTo: null }
      ],
      entry: 'outpost-approach', objective: 'fuel-farm', exit: 'outpost-extract',
      teaching: 'Breach lesson: ramps are fuel lines — one charge on a ramp joint starves two burners.',
      rescueLoot: 'Depot rescue path: pinned scout team + fuel-cell loot (spend before extraction — volatile).',
      checkpoint: 'Pre-climax checkpoint at the depot gate before the war-chief.',
      finale: { kind: 'boss', name: 'OUTPOST WAR-CHIEF' },
      codex: 'outpost_fuel_denial',
      routes: { destructive: 'Torch the whole farm — huge blast, no fuel cells left.', precision: 'Cut ramps, siphon cells, torch only the reserve.' },
      extraction: { zone: 'outpost-extract', protectedFloor: true },
      difficulty: diff(0.85, 0.85, 1.0, 1.05, 1.5, 1.35, 1.4)
    },
    {
      id: 5, slug: 'shallows', title: 'MISSION 5 — THE SHALLOWS',
      briefing: 'Flooded shafts, and the bells are coming down. Drop the shafts, dodge the falling bells, drain the sump. Divers trapped below — pump them a path.',
      zones: [
        { id: 'shallows-entry', entry: true, objective: false, exitTo: 'bell-shafts' },
        { id: 'bell-shafts', entry: false, objective: true, exitTo: 'sump' },
        { id: 'sump', entry: false, objective: false, exitTo: null }
      ],
      entry: 'shallows-entry', objective: 'bell-shafts', exit: 'sump',
      teaching: 'Breach lesson: falling bells telegraph — watch the chain sway, move on the third swing.',
      rescueLoot: 'Sump rescue path: 2 divers + salvage loot in the drained bell-chamber.',
      checkpoint: 'Pre-climax checkpoint at the pump room before the drowned choir.',
      finale: { kind: 'defense', name: 'DROWNED CHOIR (hold the pumps)' },
      codex: 'shallows_falling_bells',
      routes: { destructive: 'Drop every shaft — floods the salvage chamber.', precision: 'Drop one shaft, bell-chain the rest, keep salvage dry.' },
      extraction: { zone: 'sump', protectedFloor: true },
      difficulty: diff(0.85, 0.85, 1.05, 1.05, 1.5, 1.4, 1.4)
    },
    {
      id: 6, slug: 'catacombs', title: 'MISSION 6 — CATACOMBS',
      briefing: 'Sludge tanks line the vents. Rupture the tanks, flush the vents, collapse the nest. A burial party holds the chapel — relieve them.',
      zones: [
        { id: 'catacombs-entry', entry: true, objective: false, exitTo: 'tank-row' },
        { id: 'tank-row', entry: false, objective: true, exitTo: 'chapel' },
        { id: 'chapel', entry: false, objective: false, exitTo: null }
      ],
      entry: 'catacombs-entry', objective: 'tank-row', exit: 'chapel',
      teaching: 'Breach lesson: tanks + vents combo — rupture a tank upwind of a lit vent and the nest flushes itself.',
      rescueLoot: 'Chapel rescue path: burial party + relic loot in the sealed crypt.',
      checkpoint: 'Pre-climax checkpoint at the chapel door before the nest-mother.',
      finale: { kind: 'boss', name: 'NEST-MOTHER' },
      codex: 'catacombs_tank_vent',
      routes: { destructive: 'Pop every tank — clears the nest, melts the relics.', precision: 'Pop upwind tanks only, vent-flush the rest, save the crypt.' },
      extraction: { zone: 'chapel', protectedFloor: true },
      difficulty: diff(0.9, 0.9, 1.05, 1.1, 1.55, 1.4, 1.45)
    },
    {
      id: 7, slug: 'tomb', title: 'MISSION 7 — THE TOMB',
      briefing: 'The Tomb must be breached WITHOUT crushing it — the keystone holds the ceiling and the archive both. No wide blasts. Thread the supports, lift the seal, walk out with the archive intact.',
      zones: [
        { id: 'tomb-entry', entry: true, objective: false, exitTo: 'keystone' },
        { id: 'keystone', entry: false, objective: true, exitTo: 'archive' },
        { id: 'archive', entry: false, objective: false, exitTo: null }
      ],
      entry: 'tomb-entry', objective: 'keystone', exit: 'archive',
      teaching: 'Breach lesson: precision-only clear — the keystone is load-bearing; cut AROUND it, never through it.',
      rescueLoot: 'Archive rescue path: archivist + archive loot (destroyed by any wide blast — precision route only).',
      checkpoint: 'Pre-climax checkpoint at the seal antechamber before the tomb-lord.',
      finale: { kind: 'boss', name: 'TOMB-LORD (keystone must survive)' },
      codex: 'tomb_keystone_precision',
      routes: { destructive: 'NOT AVAILABLE — wide blasts collapse the archive and fail the mission.', precision: 'Thread the supports, lift the seal, keystone survives.' },
      extraction: { zone: 'archive', protectedFloor: true },
      difficulty: diff(0.9, 0.9, 1.1, 1.1, 1.6, 1.45, 1.5)
    },
    {
      id: 8, slug: 'observatory', title: 'MISSION 8 — OBSERVATORY',
      briefing: 'Pylons anchor the bombardment array. Topple the pylons, paint the target, call the sky down on the muster field. Spotters on the dome — get them clear first.',
      zones: [
        { id: 'observatory-entry', entry: true, objective: false, exitTo: 'pylon-field' },
        { id: 'pylon-field', entry: false, objective: true, exitTo: 'dome' },
        { id: 'dome', entry: false, objective: false, exitTo: null }
      ],
      entry: 'observatory-entry', objective: 'pylon-field', exit: 'dome',
      teaching: 'Breach lesson: pylons fall along their lean — read the tilt, stand clear, let gravity do the breaching.',
      rescueLoot: 'Dome rescue path: spotter crew + lens loot in the dome housing.',
      checkpoint: 'Pre-climax checkpoint at the dome airlock before the star-caller.',
      finale: { kind: 'defense', name: 'STAR-CALLER (survive the bombardment window)' },
      codex: 'observatory_bombardment',
      routes: { destructive: 'Topple all pylons at once — flattens the dome and the lenses.', precision: 'Topple in sequence, shield the dome, keep the lenses.' },
      extraction: { zone: 'dome', protectedFloor: true },
      difficulty: diff(0.9, 0.95, 1.1, 1.15, 1.6, 1.5, 1.5)
    },
    {
      id: 9, slug: 'gate', title: 'MISSION 9 — THE GATE',
      briefing: 'Twin towers gate the road to the Sanctum, platforms stepping between. Sequence the platforms, drop the towers outward, hold the gate for the convoy.',
      zones: [
        { id: 'gate-entry', entry: true, objective: false, exitTo: 'platform-steps' },
        { id: 'platform-steps', entry: false, objective: true, exitTo: 'twin-towers' },
        { id: 'twin-towers', entry: false, objective: false, exitTo: null }
      ],
      entry: 'gate-entry', objective: 'platform-steps', exit: 'twin-towers',
      teaching: 'Breach lesson: towers fall outward if you cut the inner face — drop them AWAY from the convoy road.',
      rescueLoot: 'Platform rescue path: convoy engineers + gate-key loot on the middle platform.',
      checkpoint: 'Pre-climax checkpoint at the gatehouse before the gate-warden.',
      finale: { kind: 'boss', name: 'GATE-WARDEN' },
      codex: 'gate_tower_platforms',
      routes: { destructive: 'Drop both towers inward — blocks the road, convoy fails.', precision: 'Inner-face cuts, towers fall outward, road stays open.' },
      extraction: { zone: 'twin-towers', protectedFloor: true },
      difficulty: diff(0.95, 0.95, 1.15, 1.2, 1.65, 1.5, 1.55)
    },
    {
      id: 10, slug: 'sanctum', title: 'MISSION 10 — SANCTUM CORE',
      briefing: 'The Sanctum armor holds the MoonRock core. Cut the armor supports, collapse the core chamber, end the NecroGenesis at its source. Then run — the moon is coming down. VICTORY on MoonRock. Season hook: the core pulse escapes skyward… something out there answers.',
      zones: [
        { id: 'sanctum-entry', entry: true, objective: false, exitTo: 'armor-supports' },
        { id: 'armor-supports', entry: false, objective: true, exitTo: 'core-chamber' },
        { id: 'core-chamber', entry: false, objective: false, exitTo: null }
      ],
      entry: 'sanctum-entry', objective: 'armor-supports', exit: 'core-chamber',
      teaching: 'Breach lesson: armor supports share load — cut them in the marked order or the chamber seals with you inside.',
      rescueLoot: 'Final rescue path: last civilians of MoonRock + core-shard loot (season carry-over).',
      checkpoint: 'Pre-climax checkpoint at the sanctum veil — point of no return before the core.',
      finale: { kind: 'extraction', name: 'CORE COLLAPSE — outrun the moonfall' },
      codex: 'sanctum_core_collapse',
      routes: { destructive: 'Blow all supports — collapses the chamber with the exit inside. Do not.', precision: 'Ordered cuts, chamber folds outward, extraction stays green.' },
      extraction: { zone: 'core-chamber', protectedFloor: true },
      difficulty: diff(1.0, 1.0, 1.2, 1.25, 1.75, 1.6, 1.6),
      victory: 'MOONROCK SECURED — the NecroGenesis source is collapsed. Season hook: a core pulse escapes skyward, and something answers.'
    }
  ];

  function byId(id) {
    for (var i = 0; i < MISSIONS.length; i++) {
      if (MISSIONS[i].id === id) return MISSIONS[i];
    }
    return null;
  }

  // Stub validator: reachable entry -> objective -> exit chain + protected extraction.
  function validate(m) {
    if (!m || !m.entry || !m.objective || !m.exit) return false;
    if (!m.extraction || m.extraction.protectedFloor !== true) return false;
    var ids = {};
    for (var i = 0; i < m.zones.length; i++) ids[m.zones[i].id] = m.zones[i];
    if (!ids[m.entry] || !ids[m.objective] || !ids[m.exit]) return false;
    // Walk exitTo chain from entry; must pass through objective and reach exit.
    var seen = {}, cur = m.entry, passedObjective = (m.entry === m.objective);
    while (cur && !seen[cur]) {
      seen[cur] = true;
      if (cur === m.objective) passedObjective = true;
      if (cur === m.exit) return passedObjective;
      cur = ids[cur] ? ids[cur].exitTo : null;
    }
    return false;
  }

  function validateAll() {
    var out = [];
    for (var i = 0; i < MISSIONS.length; i++) {
      out.push({ id: MISSIONS[i].id, slug: MISSIONS[i].slug, ok: validate(MISSIONS[i]) });
    }
    return out;
  }

  function init() { return { version: VERSION, count: MISSIONS.length }; }

  window.GraveGain2DB_Campaign = {
    version: VERSION,
    missions: MISSIONS,
    get: byId,
    validate: validate,
    validateAll: validateAll,
    init: init
  };

  window.GraveGainMods = window.GraveGainMods || [];
  window.GraveGainMods.push({ name: 'gravegain2dB-campaign', version: VERSION, init: init });
})();
