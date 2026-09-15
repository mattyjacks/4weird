/* GraveGain2dB — missions/mission03.js (data-driven via registerMissionExtra). */
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
      Nightmare: { id: 'Nightmare', enemyHpMult: 1.0, enemyDmgMult: 1.1, enemyDensityMult: 1.35, eliteChance: 0.12, coordination: true, note: 'No HP bloat.' }
    };
  }
  var extra = {
    id: 3,
    canonTitle: 'Mission 3 — Deep In The Dwarven Vaults',
    canonSubtitle: 'Sparkite & Steel',
    canonLocation: 'Central Highlands Deep Mines',
    canonBoss: 'Dwarven Zed High Thane',
    canonLogline: 'Recover the Golem Hammer from the overrun sparkite forges and starve the Array of fuel.',
    loreUnlocks: ['dwarf_deep_forge', 'dwarf_paladin_oath', 'dwarf_brewery_report'],
    briefing: 'Sparkite forges overrun: jam the ore chutes, ride the lifts down, recover the Golem Hammer. Shortcut: blast the ore-plug and ride the chute; fallback service ladder if chutes jam.',
    threat: 'Forge garrison + chute patrols',
    bossDisplay: { name: 'DWARVEN ZED HIGH THANE', banner: '⚔️ WARDEN: DWARVEN ZED HIGH THANE ⚔️' },
    zones: [
      { id: 'm03-z0-headframe', kind: 'safe', summary: 'Z0 headframe deck. Zero hostiles; chute-drop drill.', enemies: [] },
      { id: 'm03-z1-chutes', kind: 'combat', summary: 'Z1 ore-chute descent vs miners + chain-wraiths.', enemies: ['zed', 'bone-rifle'] },
      { id: 'm03-z2-sump', kind: 'rescue', summary: 'Z2 sump rescue: crew pinned under the gantry spill.', enemies: ['zed', 'sapper'], optional: true }
    ],
    checkpoint: { id: 'm03-sump-checkpoint', before: 'finale', desc: 'Pre-climax checkpoint at the lift cage.', heals: true },
    finale: { kind: 'boss', name: 'Dwarven Zed High Thane', then: 'extraction', extraction: { id: 'm03-lift-extract', desc: 'Ride the lift cage out with the Hammer.' } },
    codex: 'vault_ore_chutes',
    routes: {
      primary: { id: 'm03-primary', summary: 'Deck -> chutes -> sump -> gallery -> lift out.', waypoints: [{ x: 40, y: 80 }, { x: 300, y: 220 }, { x: 720, y: 160 }] },
      shortcut: { id: 'm03-shortcut', summary: 'DESTRUCTIVE: blast the ore-plug, ride the full chute.', destructive: true, waypoints: [{ x: 300, y: 220 }, { x: 520, y: 300 }, { x: 720, y: 160 }] },
      fallback: { id: 'm03-fallback', summary: 'EMERGENCY: service ladder if chutes jam.', emergency: true, waypoints: [{ x: 300, y: 220 }, { x: 380, y: 120 }, { x: 720, y: 160 }] }
    },
    difficulties: diffs(),
    dialogueBefore: [{ speaker: 'Arty Fisher', text: 'Chains sing before they snap. Chutes are fast, lifts are safe.' }],
    dialogueAfter: [{ speaker: 'Valley Net', text: 'Vault sump clear. The Hammer is ours.' }],
    parSeconds: 480
  };
  try { var r = ns(); if (r) r.registerMissionExtra(3, extra); } catch (_) {}
})();
