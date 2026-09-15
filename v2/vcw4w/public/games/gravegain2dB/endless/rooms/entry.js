/* GraveGain2dB — endless/rooms/entry.js (defines registry + entry room). */
(function () {
  'use strict';
  function getNS() {
    try {
      if (typeof window !== 'undefined' && window.GraveGain2dBEndlessRooms) return window.GraveGain2dBEndlessRooms;
      if (typeof globalThis !== 'undefined' && globalThis.GraveGain2dBEndlessRooms) return globalThis.GraveGain2dBEndlessRooms;
    } catch (_) {}
    return null;
  }
  var ns = getNS();
  if (!ns) {
    var store = Object.create(null);
    ns = {
      register: function (room) {
        try {
          if (!room || typeof room.id !== 'string') return { ok: false, errors: ['id required'] };
          var req = ['sockets', 'layers', 'spawns', 'anchors', 'nav', 'a11y'];
          var errs = [];
          req.forEach(function (k) { if (!room[k]) errs.push(k + ' required'); });
          if (errs.length) return { ok: false, errors: errs };
          store[String(room.id)] = room;
          return { ok: true };
        } catch (e) { return { ok: false, errors: [String((e && e.message) || e)] }; }
      },
      get: function (id) { try { return store[String(id)] || null; } catch (_) { return null; } },
      list: function () { try { return Object.keys(store).sort(); } catch (_) { return []; } }
    };
    try {
      if (typeof window !== 'undefined') window.GraveGain2dBEndlessRooms = ns;
      else if (typeof globalThis !== 'undefined') globalThis.GraveGain2dBEndlessRooms = ns;
    } catch (_) {}
    try { if (typeof module !== 'undefined' && module.exports) module.exports = ns; } catch (_) {}
  }
  ns.register({
    id: 'entry',
    kind: 'entry',
    sockets: { entry: ['west'], exit: ['east'] },
    layers: { protectedFloor: true, destructible: ['walls'], supports: ['lintel'], palette: 'moonrock-grey' },
    spawns: [{ enemy: 'zed', count: 1, wave: 0 }],
    anchors: { civilian: [], pickup: ['ammo'] },
    nav: { zones: ['floor'], safeRoute: 'west-to-east low', breachLocation: 'east wall' },
    a11y: { aimAssistAnchor: true, lowFlash: true, extraCheckpoint: false, civilianImmunityOption: true }
  });
})();
