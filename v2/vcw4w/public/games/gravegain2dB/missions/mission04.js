/* GraveGain2dB — missions/mission04.js (data-driven via registerMissionExtra). */
(function () {
  'use strict';
  function ns() {
    try {
      if (typeof window !== 'undefined' && window.GraveGain2dBMissions) return window.GraveGain2dBMissions;
      if (typeof globalThis !== 'undefined' && globalThis.GraveGain2dBMissions) return globalThis.GraveGain2dBMissions;
    } catch (_) {}
    return null;
  }
  function diffs() {
    try { var b = ns() && ns().DIFFICULTIES; if (b) return JSON.parse(JSON.stringify(b)); } catch (_) {}
    return {
      Cadet: { id: 'Cadet', enemyHpMult: 0.8, enemyDmgMult: 0.7, enemyDensityMult: 0.7, eliteChance: 0.02 },
      Breach: { id: 'Breach', enemyHpMult: 1.0, enemyDmgMult: 1.0, enemyDensityMult: 1.0, eliteChance: 0.06 },
      Nightmare: { id: 'Nightmare', enemyHpMult: 1.0, enemyDmgMult: 1.1, enemyDensityMult: 1.4, eliteChance: 0.12, coordination: true, note: 'No HP bloat.' }
    };
  }
  var extra = {
    id: 4,
    canonTitle: 'Mission 4 — Orc Nomad Outpost Siege',
    canonSubtitle: 'Rage of the Southern Wastes',
    canonLocation: 'Crimson Sand Redoubts',
    canonBoss: 'Huge Orc Zed Berserker',
    canonLogline: 'Hold Groknak\u2019s gate against his own risen blood and prove humans hit like orcs.',
    loreUnlocks: ['orc_regeneration', 'orc_rage_book', 'goblin_brave_nix'],
    briefing: 'Crimson Sand redoubts: ramps ring the fuel farm. Breach the ramps, torch the reserve, board the moving supply train. Shortcut: drop raider ramps onto fuel trucks; fallback culvert if the gate seals.',
    threat: 'Outpost garrison + ramp raiders',
    bossDisplay: { name: 'HUGE ORC ZED BERSERKER', banner: '⚔️ WARDEN: HUGE ORC ZED BERSERKER ⚔️' },
    zones: [
      { id: 'm04-z0-approach', kind: 'safe', summary: 'Z0 dune muster. Zero hostiles; ramp-joint drill.', enemies: [] },
      { id: 'm04-z1-ramps', kind: 'combat', summary: 'Z1 ramp ring vs berserkers + bone rifles.', enemies: ['zed', 'bone-rifle'] },
      { id: 'm04-z2-depot', kind: 'rescue', summary: 'Z2 depot rescue: scout team pinned at the fuel depot.', enemies: ['zed', 'sapper'], optional: true }
    ],
    checkpoint: { id: 'm04-depot-gate', before: 'finale', desc: 'Pre-climax checkpoint at the depot gate.', heals: true },
    finale: { kind: 'boss', name: 'Huge Orc Zed Berserker', then: 'extraction', extraction: { id: 'm04-train-extract', desc: 'Board the moving supply train.' } },
    codex: 'outpost_fuel_denial',
    routes: {
      primary: { id: 'm04-primary', summary: 'Dunes -> ramps -> depot -> train.', waypoints: [{ x: 40, y: 100 }, { x: 360, y: 140 }, { x: 700, y: 120 }] },
      shortcut: { id: 'm04-shortcut', summary: 'DESTRUCTIVE: drop ramps onto fuel trucks; huge blast, no loot.', destructive: true, waypoints: [{ x: 360, y: 140 }, { x: 520, y: 200 }, { x: 700, y: 120 }] },
      fallback: { id: 'm04-fallback', summary: 'EMERGENCY: culvert under the gate if ramps seal.', emergency: true, waypoints: [{ x: 360, y: 140 }, { x: 430, y: 320 }, { x: 700, y: 120 }] }
    },
    difficulties: diffs(),
    dialogueBefore: [{ speaker: 'Groknak', text: 'My gate. My blood. We hit like orcs today.' }],
    dialogueAfter: [{ speaker: 'Valley Net', text: 'Outpost gate held. Train is rolling.' }],
    parSeconds: 480
  };
  try { var r = ns(); if (r) r.registerMissionExtra(4, extra); } catch (_) {}
})();
