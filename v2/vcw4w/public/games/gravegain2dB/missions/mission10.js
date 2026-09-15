/* GraveGain2dB — missions/mission10.js (data-driven via registerMissionExtra). */
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
      Nightmare: { id: 'Nightmare', enemyHpMult: 1.0, enemyDmgMult: 1.1, enemyDensityMult: 1.5, eliteChance: 0.12, coordination: true, note: 'No HP bloat; ordered cuts.' }
    };
  }
  var extra = {
    id: 10,
    canonTitle: 'Mission 10 — Lucifer\u2019s Shadow',
    canonSubtitle: 'The Final Confrontation',
    canonLocation: 'Lucifer Hades\u2019 Sanctum Core',
    canonBoss: 'Dr. Lucifer Hades (Consciousness Overlord)',
    canonLogline: 'Kill the Consciousness Overlord, deactivate the Array, and seal the Compact into a living peace.',
    loreUnlocks: ['lucifer_manifesto', 'lucifer_journal_47', 'human_earth_letter'],
    briefing: 'Sanctum core: armor supports share load — cut them in the marked order or the chamber seals with you inside. Drop the Overlord, collapse the chamber outward, outrun the moonfall. Victory on MoonRock; season hook: a core pulse escapes skyward.',
    threat: 'Sanctum guard + core armor',
    bossDisplay: { name: 'DR. LUCIFER HADES (CONSCIOUSNESS OVERLORD)', banner: '⚔️ FINAL WARDEN: DR. LUCIFER HADES ⚔️' },
    zones: [
      { id: 'm10-z0-veil', kind: 'safe', summary: 'Z0 sanctum veil (point of no return). Zero hostiles; cut-order drill.', enemies: [] },
      { id: 'm10-z1-armor', kind: 'combat', summary: 'Z1 armor supports vs sanctum guard + drone array.', enemies: ['zed', 'bone-rifle'] },
      { id: 'm10-z2-core', kind: 'rescue', summary: 'Z2 core rescue: last civilians of MoonRock + core-shard carry-over.', enemies: ['zed', 'sapper'], optional: true }
    ],
    checkpoint: { id: 'm10-veil', before: 'finale', desc: 'Pre-climax checkpoint at the sanctum veil — point of no return.', heals: true },
    finale: { kind: 'extraction', name: 'CORE COLLAPSE — outrun the moonfall', then: 'done', extraction: { id: 'm10-core-extract', desc: 'Collapse the chamber outward and run.' } },
    codex: 'sanctum_core_collapse',
    routes: {
      primary: { id: 'm10-primary', summary: 'Veil -> ordered armor cuts -> core collapse -> run.', waypoints: [{ x: 40, y: 100 }, { x: 360, y: 160 }, { x: 700, y: 120 }] },
      shortcut: { id: 'm10-shortcut', summary: 'ORDERED cuts only: blow all supports and the exit seals inside — do not.', destructive: true, waypoints: [{ x: 360, y: 160 }, { x: 520, y: 220 }, { x: 700, y: 120 }] },
      fallback: { id: 'm10-fallback', summary: 'EMERGENCY: veil vent if the order desyncs.', emergency: true, waypoints: [{ x: 360, y: 160 }, { x: 430, y: 320 }, { x: 700, y: 120 }] }
    },
    difficulties: diffs(),
    dialogueBefore: [{ speaker: 'Valley Net', text: 'Ordered cuts. The chamber folds outward — extraction stays green.' }],
    dialogueAfter: [{ speaker: 'Valley Net', text: 'MOONROCK SECURED. The Array is dark — but something skyward answers the pulse.' }],
    parSeconds: 420,
    victory: 'MOONROCK SECURED — season hook: a core pulse escapes skyward, and something answers.'
  };
  try { var r = ns(); if (r) r.registerMissionExtra(10, extra); } catch (_) {}
})();
