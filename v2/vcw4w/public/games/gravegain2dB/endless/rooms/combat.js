/* GraveGain2dB — endless/rooms/combat.js (combat room). */
(function () {
  'use strict';
  function ns() {
    try {
      if (typeof window !== 'undefined' && window.GraveGain2dBEndlessRooms) return window.GraveGain2dBEndlessRooms;
      if (typeof globalThis !== 'undefined' && globalThis.GraveGain2dBEndlessRooms) return globalThis.GraveGain2dBEndlessRooms;
    } catch (_) {}
    return null;
  }
  var room = {
    id: 'combat',
    kind: 'combat',
    sockets: { entry: ['west'], exit: ['east', 'north'] },
    layers: { protectedFloor: true, destructible: ['pillars'], supports: ['arch-left', 'arch-right'], palette: 'vault-amber' },
    spawns: [{ enemy: 'zed', count: 3, wave: 1 }, { enemy: 'bone-rifle', count: 2, wave: 1 }, { enemy: 'sapper', count: 1, wave: 2 }],
    anchors: { civilian: ['alcove'], pickup: ['medkit', 'ammo'] },
    nav: { zones: ['floor', 'balcony'], safeRoute: 'center trench to east', breachLocation: 'north pillar base' },
    a11y: { aimAssistAnchor: true, lowFlash: true, extraCheckpoint: false, civilianImmunityOption: true, dangerRing: true }
  };
  try { var r = ns(); if (r) r.register(room); else if (typeof window !== 'undefined') window.GraveGain2dBEndlessRoomCombat = room; } catch (_) {}
})();
