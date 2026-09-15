/* GraveGain2dB — missions/mission06.js (data-driven via registerMissionExtra). */
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
      Nightmare: { id: 'Nightmare', enemyHpMult: 1.0, enemyDmgMult: 1.1, enemyDensityMult: 1.45, eliteChance: 0.12, coordination: true, note: 'No HP bloat.' }
    };
  }
  var extra = {
    id: 6,
    canonTitle: 'Mission 6 — The Alchemical Catacombs',
    canonSubtitle: 'President Good\u2019s Legacy',
    canonLocation: 'Botany Core Sub-levels',
    canonBoss: 'Toxic Chem-Golem',
    canonLogline: 'Purge Good\u2019s poisoned botany vats and kill the Chem-Golem choking the colony\u2019s lungs.',
    loreUnlocks: ['human_angel_good', 'necro_understanding', 'dwarf_mana_potions'],
    briefing: 'Botany vats poisoned: rupture sludge tanks upwind of lit vents, flush the nest, relieve the burial party in the chapel. Shortcut: pop every tank (melts relics); precision pops upwind tanks only.',
    threat: 'Vat spawn + vent nest',
    bossDisplay: { name: 'TOXIC CHEM-GOLEM', banner: '⚔️ WARDEN: TOXIC CHEM-GOLEM ⚔️' },
    zones: [
      { id: 'm06-z0-chapel-door', kind: 'safe', summary: 'Z0 chapel staging. Zero hostiles; tank/vent drill.', enemies: [] },
      { id: 'm06-z1-tanks', kind: 'combat', summary: 'Z1 tank row vs spore hosts + bone rifles.', enemies: ['zed', 'bone-rifle'] },
      { id: 'm06-z2-chapel', kind: 'rescue', summary: 'Z2 chapel rescue: burial party holds the sealed crypt.', enemies: ['zed', 'sapper'], optional: true }
    ],
    checkpoint: { id: 'm06-chapel-door', before: 'finale', desc: 'Pre-climax checkpoint at the chapel door.', heals: true },
    finale: { kind: 'boss', name: 'Toxic Chem-Golem', then: 'extraction', extraction: { id: 'm06-chapel-extract', desc: 'Extract through the flushed vents.' } },
    codex: 'catacombs_tank_vent',
    routes: {
      primary: { id: 'm06-primary', summary: 'Chapel -> tanks -> chapel crypt -> out.', waypoints: [{ x: 40, y: 100 }, { x: 340, y: 140 }, { x: 640, y: 120 }] },
      shortcut: { id: 'm06-shortcut', summary: 'DESTRUCTIVE: pop every tank; clears nest, melts relics.', destructive: true, waypoints: [{ x: 340, y: 140 }, { x: 500, y: 200 }, { x: 640, y: 120 }] },
      fallback: { id: 'm06-fallback', summary: 'EMERGENCY: vent crawl if tanks overrun.', emergency: true, waypoints: [{ x: 340, y: 140 }, { x: 420, y: 320 }, { x: 640, y: 120 }] }
    },
    difficulties: diffs(),
    dialogueBefore: [{ speaker: 'Arty Fisher', text: 'Rupture upwind of a lit vent. The nest flushes itself.' }],
    dialogueAfter: [{ speaker: 'Valley Net', text: 'Vats purged. The colony breathes again.' }],
    parSeconds: 480
  };
  try { var r = ns(); if (r) r.registerMissionExtra(6, extra); } catch (_) {}
})();
