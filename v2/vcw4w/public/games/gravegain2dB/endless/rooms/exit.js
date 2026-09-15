/* GraveGain2dB — endless/rooms/exit.js (exit room). */
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
    id: 'exit',
    kind: 'exit',
    sockets: { entry: ['west', 'south'], exit: ['dustoff'] },
    layers: { protectedFloor: true, destructible: ['rubble'], supports: ['beam'], palette: 'grove-green' },
    spawns: [{ enemy: 'zed', count: 1, wave: 1 }],
    anchors: { civilian: ['nook'], pickup: ['relic', 'medkit'] },
    nav: { zones: ['floor', 'pad'], safeRoute: 'west edge to dustoff pad', breachLocation: 'rubble pile west' },
    a11y: { aimAssistAnchor: true, lowFlash: true, extraCheckpoint: true, civilianImmunityOption: true, waypointBeacon: true }
  };
  try { var r = ns(); if (r) r.register(room); else if (typeof window !== 'undefined') window.GraveGain2dBEndlessRoomExit = room; } catch (_) {}
})();
