/* GraveGain2dB — missions/mission02.js (data-driven via registerMissionExtra). */
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
    var base = null;
    try { base = ns() && ns().DIFFICULTIES; } catch (_) {}
    if (base) return JSON.parse(JSON.stringify(base));
    return {
      Cadet: { id: 'Cadet', enemyHpMult: 0.8, enemyDmgMult: 0.7, enemyDensityMult: 0.7, eliteChance: 0.02 },
      Breach: { id: 'Breach', enemyHpMult: 1.0, enemyDmgMult: 1.0, enemyDensityMult: 1.0, eliteChance: 0.06 },
      Nightmare: { id: 'Nightmare', enemyHpMult: 1.0, enemyDmgMult: 1.1, enemyDensityMult: 1.35, eliteChance: 0.12, coordination: true, note: 'No HP bloat.' }
    };
  }
  var extra = {
    id: 2,
    canonTitle: 'Mission 2 — Cleansing the Elven Groves',
    canonSubtitle: 'Echoes of the Green Chronicle',
    canonLocation: 'Bioluminescent Forest Vaults',
    canonBoss: 'Elven Necromancer',
    canonLogline: 'Break the fallen-seer anchors in the bleeding Mother Tree and earn Aelindra\u2019s trust.',
    loreUnlocks: ['elven_chronicle', 'elven_matriarch_grave', 'necro_red_eyes'],
    briefing: 'Biolume forest vaults: fallen-seer anchors bleed the Mother Tree. Burn tap-roots to drop bridges onto patrols, extract the grovekeepers, then break the Elven Necromancer. Shortcut: cut burning roots into safe bridges; fallback ledge stays open.',
    threat: 'Anchor-bound grove hostiles + spore cover',
    bossDisplay: { name: 'ELVEN NECROMANCER', banner: '⚔️ WARDEN: ELVEN NECROMANCER ⚔️' },
    zones: [
      { id: 'm02-z0-grove-edge', kind: 'safe', summary: 'Z0 safe muster at the grove edge. Zero hostiles; root-anchor drill.', enemies: [] },
      { id: 'm02-z1-taproots', kind: 'combat', summary: 'Z1 tap-root spans vs zeds + bone rifles in the canopy.', enemies: ['zed', 'bone-rifle'] },
      { id: 'm02-z2-hollow', kind: 'rescue', summary: 'Z2 hollow rescue: grovekeepers pinned behind the second bridge.', enemies: ['zed', 'sapper'], optional: true }
    ],
    checkpoint: { id: 'm02-hollow-gate', before: 'finale', desc: 'Pre-climax checkpoint at the hollow gate.', heals: true },
    finale: { kind: 'boss', name: 'Elven Necromancer', then: 'extraction', extraction: { id: 'm02-grove-extract', desc: 'Extract up the felled root bridge.' } },
    codex: 'grove_burn_roots',
    routes: {
      primary: { id: 'm02-primary', summary: 'Edge -> tap-roots -> hollow -> extract.', waypoints: [{ x: 40, y: 100 }, { x: 340, y: 140 }, { x: 640, y: 120 }] },
      shortcut: { id: 'm02-shortcut', summary: 'DESTRUCTIVE: burn both bridges early; fast but loses the seed-cache.', destructive: true, waypoints: [{ x: 340, y: 140 }, { x: 500, y: 200 }, { x: 640, y: 120 }] },
      fallback: { id: 'm02-fallback', summary: 'EMERGENCY: rim-tree ramp if both bridges fall.', emergency: true, waypoints: [{ x: 340, y: 140 }, { x: 420, y: 320 }, { x: 640, y: 120 }] }
    },
    difficulties: diffs(),
    dialogueBefore: [{ speaker: 'Aelindra', text: 'The Mother Tree bleeds. Burn the tap-roots — never the heart.' }],
    dialogueAfter: [{ speaker: 'Valley Net', text: 'Groves cleansed. Grovekeepers aboard.' }],
    parSeconds: 480
  };
  try { var r = ns(); if (r) r.registerMissionExtra(2, extra); } catch (_) {}
})();
