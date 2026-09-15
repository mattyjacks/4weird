/* GraveGain2dB — endless/rooms/arena.js (arena room). */
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
    id: 'arena',
    kind: 'arena',
    sockets: { entry: ['south'], exit: ['south'] },
    layers: { protectedFloor: true, destructible: ['arena-pillars'], supports: ['ring-a', 'ring-b', 'ring-c'], palette: 'sanctum-violet' },
    spawns: [{ enemy: 'warden-lite', count: 1, wave: 3 }, { enemy: 'zed', count: 2, wave: 2 }],
    anchors: { civilian: [], pickup: ['boss-cache'] },
    nav: { zones: ['arena-floor', 'rim'], safeRoute: 'rim circuit', breachLocation: 'arena crown' },
    a11y: { aimAssistAnchor: true, lowFlash: true, extraCheckpoint: true, civilianImmunityOption: true, screenShakeOff: true }
  };
  try { var r = ns(); if (r) r.register(room); else if (typeof window !== 'undefined') window.GraveGain2dBEndlessRoomArena = room; } catch (_) {}
})();
