/* GraveGain2dB — missions/mission05.js (data-driven via registerMissionExtra). */
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
    id: 5,
    canonTitle: 'Mission 5 — Signal in the Shallows',
    canonSubtitle: 'Valley Net Uplink Restoration',
    canonLocation: 'Sub-surface Comms Relay 09',
    canonBoss: 'Corrupted Drone Array',
    canonLogline: 'Re-align Relay 09 through skull swarms to blind Hades\u2019 jamming and track his sanctum.',
    loreUnlocks: ['human_arty_fisher', 'necro_broadcast', 'world_farstar'],
    briefing: 'Relay 09 flooded: breach vertical shafts, dodge falling bells, power the emergency broadcast. Shortcut: drop every shaft (floods salvage); precision drops one shaft and bell-chains the rest. Divers trapped in the sump.',
    threat: 'Skull swarms + jamming drones',
    bossDisplay: { name: 'CORRUPTED DRONE ARRAY', banner: '⚔️ WARDEN: CORRUPTED DRONE ARRAY ⚔️' },
    zones: [
      { id: 'm05-z0-pump', kind: 'safe', summary: 'Z0 pump room. Zero hostiles; bell-sway drill.', enemies: [] },
      { id: 'm05-z1-shafts', kind: 'combat', summary: 'Z1 bell shafts vs wisp drones + zeds.', enemies: ['zed', 'bone-rifle'] },
      { id: 'm05-z2-sump', kind: 'rescue', summary: 'Z2 sump rescue: divers trapped below the bell-chamber.', enemies: ['zed', 'sapper'], optional: true }
    ],
    checkpoint: { id: 'm05-pumproom', before: 'finale', desc: 'Pre-climax checkpoint at the pump room.', heals: true },
    finale: { kind: 'defense', name: 'Corrupted Drone Array (hold the pumps)', then: 'extraction', extraction: { id: 'm05-sump-extract', desc: 'Extract through the drained bell-chamber.' } },
    codex: 'shallows_falling_bells',
    routes: {
      primary: { id: 'm05-primary', summary: 'Pump -> shafts -> sump -> broadcast.', waypoints: [{ x: 40, y: 100 }, { x: 340, y: 180 }, { x: 640, y: 220 }] },
      shortcut: { id: 'm05-shortcut', summary: 'DESTRUCTIVE: drop every shaft; fast, floods salvage.', destructive: true, waypoints: [{ x: 340, y: 180 }, { x: 500, y: 260 }, { x: 640, y: 220 }] },
      fallback: { id: 'm05-fallback', summary: 'EMERGENCY: service shaft if bells pin the crew.', emergency: true, waypoints: [{ x: 340, y: 180 }, { x: 420, y: 320 }, { x: 640, y: 220 }] }
    },
    difficulties: diffs(),
    dialogueBefore: [{ speaker: 'Valley Net', text: 'Relay 09 is drowning. Watch the chain sway — move on the third swing.' }],
    dialogueAfter: [{ speaker: 'Valley Net', text: 'Broadcast live. Hades is blind; his sanctum pings back.' }],
    parSeconds: 480
  };
  try { var r = ns(); if (r) r.registerMissionExtra(5, extra); } catch (_) {}
})();
