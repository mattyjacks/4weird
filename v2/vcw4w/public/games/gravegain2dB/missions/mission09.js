/* GraveGain2dB — missions/mission09.js (data-driven via registerMissionExtra). */
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
      Nightmare: { id: 'Nightmare', enemyHpMult: 1.0, enemyDmgMult: 1.1, enemyDensityMult: 1.5, eliteChance: 0.12, coordination: true, note: 'No HP bloat.' }
    };
  }
  var extra = {
    id: 9,
    canonTitle: 'Mission 9 — Gate of the NecroGenesis',
    canonSubtitle: 'The Breach of the Array',
    canonLocation: 'The Citadel Perimeter',
    canonBoss: 'Necro-Array Titan',
    canonLogline: 'Breach the Citadel with all four races and drop the Titan guarding Hades\u2019 door.',
    loreUnlocks: ['necro_report', 'human_treaty', 'elven_druid_lament'],
    briefing: 'Citadel perimeter: twin towers gate the convoy road. Sequence platforms, cut inner faces so towers fall OUTWARD, hold the gate for the convoy. Inward drops block the road and fail the convoy.',
    threat: 'Titan guard + tower garrison',
    bossDisplay: { name: 'NECRO-ARRAY TITAN', banner: '⚔️ WARDEN: NECRO-ARRAY TITAN ⚔️' },
    zones: [
      { id: 'm09-z0-gatehouse', kind: 'safe', summary: 'Z0 gatehouse muster. Zero hostiles; platform-sequence drill.', enemies: [] },
      { id: 'm09-z1-platforms', kind: 'combat', summary: 'Z1 platform steps vs titan guard + bone rifles.', enemies: ['zed', 'bone-rifle'] },
      { id: 'm09-z2-towers', kind: 'rescue', summary: 'Z2 tower rescue: convoy engineers + gate-key loot.', enemies: ['zed', 'sapper'], optional: true }
    ],
    checkpoint: { id: 'm09-gatehouse', before: 'finale', desc: 'Pre-climax checkpoint at the gatehouse.', heals: true },
    finale: { kind: 'boss', name: 'Necro-Array Titan', then: 'extraction', extraction: { id: 'm09-gate-extract', desc: 'Plant the breach beacon and extract; arena collapses into the trench.' } },
    codex: 'gate_tower_platforms',
    routes: {
      primary: { id: 'm09-primary', summary: 'Gatehouse -> platforms -> towers -> beacon.', waypoints: [{ x: 40, y: 100 }, { x: 360, y: 160 }, { x: 700, y: 120 }] },
      shortcut: { id: 'm09-shortcut', summary: 'DESTRUCTIVE (WRONG WAY): inward drops block the road — do not.', destructive: true, waypoints: [{ x: 360, y: 160 }, { x: 520, y: 220 }, { x: 700, y: 120 }] },
      fallback: { id: 'm09-fallback', summary: 'EMERGENCY: sally port if platforms seal.', emergency: true, waypoints: [{ x: 360, y: 160 }, { x: 430, y: 320 }, { x: 700, y: 120 }] }
    },
    difficulties: diffs(),
    dialogueBefore: [{ speaker: 'Groknak', text: 'Towers fall outward. Cut the inner face — keep the road open.' }],
    dialogueAfter: [{ speaker: 'Valley Net', text: 'Gate held. The beacon is planted; the arena falls into the trench.' }],
    parSeconds: 420
  };
  try { var r = ns(); if (r) r.registerMissionExtra(9, extra); } catch (_) {}
})();
