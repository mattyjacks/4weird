/* GraveGain2dB — missions/mission08.js (data-driven via registerMissionExtra). */
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
    id: 8,
    canonTitle: 'Mission 8 — Orbital Strike Calibration',
    canonSubtitle: 'The MERCENARY Doctrine',
    canonLocation: 'Highland Peak Observatory',
    canonBoss: 'Bone Goliath Warlord',
    canonLogline: 'Paint the target from the Highland Peak so the kinetic strike shatters Hades\u2019 perimeter.',
    loreUnlocks: ['human_mercenary_doctrine', 'world_giantess_song', 'human_captains_log'],
    briefing: 'Highland Peak observatory: topple pylons along their lean, paint the muster field, survive the bombardment window. Shortcut: topple all at once (flattens the dome); precision sequences the fall and saves the lenses. Spotters on the dome first.',
    threat: 'Perimeter muster + pylon guard',
    bossDisplay: { name: 'BONE GOLIATH WARLORD', banner: '⚔️ WARDEN: BONE GOLIATH WARLORD ⚔️' },
    zones: [
      { id: 'm08-z0-airlock', kind: 'safe', summary: 'Z0 dome airlock. Zero hostiles; pylon-lean drill.', enemies: [] },
      { id: 'm08-z1-pylons', kind: 'combat', summary: 'Z1 pylon field vs warlord guard + bone rifles.', enemies: ['zed', 'bone-rifle'] },
      { id: 'm08-z2-dome', kind: 'rescue', summary: 'Z2 dome rescue: spotter crew + lens loot.', enemies: ['zed', 'sapper'], optional: true }
    ],
    checkpoint: { id: 'm08-dome-airlock', before: 'finale', desc: 'Pre-climax checkpoint at the dome airlock.', heals: true },
    finale: { kind: 'defense', name: 'Bone Goliath Warlord (survive the bombardment window)', then: 'extraction', extraction: { id: 'm08-dome-extract', desc: 'Extract from the dome after the strike.' } },
    codex: 'observatory_bombardment',
    routes: {
      primary: { id: 'm08-primary', summary: 'Airlock -> pylons -> dome -> strike.', waypoints: [{ x: 40, y: 100 }, { x: 360, y: 140 }, { x: 700, y: 120 }] },
      shortcut: { id: 'm08-shortcut', summary: 'DESTRUCTIVE: topple all pylons at once; fast, loses lenses.', destructive: true, waypoints: [{ x: 360, y: 140 }, { x: 520, y: 200 }, { x: 700, y: 120 }] },
      fallback: { id: 'm08-fallback', summary: 'EMERGENCY: service tunnel if the field seals.', emergency: true, waypoints: [{ x: 360, y: 140 }, { x: 430, y: 320 }, { x: 700, y: 120 }] }
    },
    difficulties: diffs(),
    dialogueBefore: [{ speaker: 'Valley Net', text: 'Pylons fall along their lean. Read the tilt, stand clear.' }],
    dialogueAfter: [{ speaker: 'Valley Net', text: 'Strike confirmed. The perimeter is shattered.' }],
    parSeconds: 480
  };
  try { var r = ns(); if (r) r.registerMissionExtra(8, extra); } catch (_) {}
})();
