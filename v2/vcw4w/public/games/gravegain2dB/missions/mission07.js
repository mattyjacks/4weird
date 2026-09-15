/* GraveGain2dB — missions/mission07.js (data-driven via registerMissionExtra). */
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
      Nightmare: { id: 'Nightmare', enemyHpMult: 1.0, enemyDmgMult: 1.1, enemyDensityMult: 1.4, eliteChance: 0.12, coordination: true, note: 'No HP bloat; precision-only.' }
    };
  }
  var extra = {
    id: 7,
    canonTitle: 'Mission 7 — The Tomb of Clint Oldman',
    canonSubtitle: 'Guy Young\u2019s Paradox',
    canonLocation: 'Colonial Crypt of Honor',
    canonBoss: 'Reanimated Patriarch Clint',
    canonLogline: 'Grant Clint Oldman — the man time broke — his second, final rest.',
    loreUnlocks: ['human_clint_oldman', 'human_guy_young', 'necro_gravestone'],
    briefing: 'Crypt of Honor: the keystone holds ceiling AND archive. Precision-only clear — cut AROUND the keystone, never through it. Thread supports, lift the seal, walk the archivist out. Wide blasts fail the mission.',
    threat: 'Crypt guard + collapsing tolerances',
    bossDisplay: { name: 'REANIMATED PATRIARCH CLINT', banner: '⚔️ WARDEN: REANIMATED PATRIARCH CLINT ⚔️' },
    zones: [
      { id: 'm07-z0-antechamber', kind: 'safe', summary: 'Z0 seal antechamber. Zero hostiles; keystone drill.', enemies: [] },
      { id: 'm07-z1-keystone', kind: 'combat', summary: 'Z1 keystone span: precision picks vs crypt guard.', enemies: ['zed', 'bone-rifle'] },
      { id: 'm07-z2-archive', kind: 'rescue', summary: 'Z2 archive rescue: archivist + archive loot (wide blasts destroy it).', enemies: ['zed'], optional: true }
    ],
    checkpoint: { id: 'm07-seal-antechamber', before: 'finale', desc: 'Pre-climax checkpoint at the seal antechamber.', heals: true },
    finale: { kind: 'boss', name: 'Reanimated Patriarch Clint (keystone must survive)', then: 'extraction', extraction: { id: 'm07-archive-extract', desc: 'Walk out with the archive intact.' } },
    codex: 'tomb_keystone_precision',
    routes: {
      primary: { id: 'm07-primary', summary: 'Antechamber -> keystone thread -> archive.', waypoints: [{ x: 40, y: 100 }, { x: 340, y: 140 }, { x: 640, y: 120 }] },
      shortcut: { id: 'm07-shortcut', summary: 'PRECISION thread: seal-thread cuts around the keystone; no wide shortcut exists.', destructive: false, waypoints: [{ x: 340, y: 140 }, { x: 500, y: 180 }, { x: 640, y: 120 }] },
      fallback: { id: 'm07-fallback', summary: 'EMERGENCY: crypt crawl if the seal reseats.', emergency: true, waypoints: [{ x: 340, y: 140 }, { x: 420, y: 320 }, { x: 640, y: 120 }] }
    },
    difficulties: diffs(),
    dialogueBefore: [{ speaker: 'Valley Net', text: 'No wide blasts. The keystone holds the ceiling and the archive both.' }],
    dialogueAfter: [{ speaker: 'Valley Net', text: 'Clint rests. The archive survives.' }],
    parSeconds: 480
  };
  try { var r = ns(); if (r) r.registerMissionExtra(7, extra); } catch (_) {}
})();
