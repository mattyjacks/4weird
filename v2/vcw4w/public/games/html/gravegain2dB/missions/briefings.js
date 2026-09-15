/* GraveGain2dB: Breach MoonRock — Mission 1 radio briefings (lane B4).
 * Path: v2/vcw4w/public/games/html/gravegain2dB/missions/briefings.js
 * Vanilla JS, no imports/exports (loaded via script tags, before mission1.js).
 * PURE DATA: no DOM/Canvas/Audio/fetch/WebSocket/React/localStorage/time calls.
 * Idempotent guard; exposes window.GraveGain2DB_Briefings; pushes GraveGainMods entry.
 * mission1.js poll-guards this global and falls back to its inline briefing.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window.GraveGain2DB_Briefings) return;

  var VERSION = '0.1.0-b4';

  var BRIEFINGS = {
    mission1: {
      id: 'mission1-briefing',
      source: 'briefings.js',
      title: 'MISSION 1 — LZ CRASH SITE DEFENSE',
      location: 'Colony Alpha crater',
      lines: [
        { from: 'CMDR OKONKWO', text: 'Mayday, Mayday — dropship Kestrel is down in Colony Alpha crater. Survivors pinging.' },
        { from: 'SGT REYES', text: 'LZ Crash Site is hot. Secure the survivors, recover the black box, then move.' },
        { from: 'DR. VOSS', text: 'The spore-spewers nest in the basin mist. Burn the mist and they lose cover — Reyes, keep it precise near my team.' },
        { from: 'CMDR OKONKWO', text: 'The memorial wall above the basin is cracked. Bring it down ON the horde — not on our people. Okonkwo out.' }
      ],
      debrief: [
        { from: 'CMDR OKONKWO', text: 'Survivors aboard, black box secured, Warden down. The wall fell where it had to. Colony Alpha remembers.' },
        { from: 'SGT REYES', text: 'Dustoff complete. See you at the Groves, soldier.' }
      ]
    }
  };

  var api = {
    version: VERSION,
    get: function (id) { return BRIEFINGS[id] || null; },
    list: function () { return Object.keys(BRIEFINGS); }
  };

  window.GraveGain2DB_Briefings = api;
  window.GraveGainMods = window.GraveGainMods || [];
  window.GraveGainMods.push({ name: 'b4-briefings', version: VERSION, init: function () { return api; } });
})();
