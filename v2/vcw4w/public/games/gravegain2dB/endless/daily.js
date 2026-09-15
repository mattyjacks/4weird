/* GraveGain2dB — endless/daily.js (daily seed + leaderboard splits).
 * Daily keys: gg2db_daily_<YYYY-MM-DD> (+ board suffix per split).
 * Boards: gg2db_endless_solo, gg2db_endless_2p, gg2db_endless_3p,
 * gg2db_endless_4p, gg2db_endless_a11y. 2dB namespace only.
 */
(function () {
  'use strict';
  var DAILY_PREFIX = 'gg2db_daily_';
  var BOARD_KEYS = ['gg2db_endless_solo', 'gg2db_endless_2p', 'gg2db_endless_3p', 'gg2db_endless_4p', 'gg2db_endless_a11y'];

  function dayString(d) {
    try {
      var dt = d ? new Date(d) : new Date();
      return dt.toISOString().slice(0, 10);
    } catch (_) { return '1970-01-01'; }
  }
  function dailySeed(d) { return 'moonrock-daily-' + dayString(d); }
  function dailyKey(d) { return DAILY_PREFIX + dayString(d); }
  function boardKey(partySize, flags) {
    flags = flags || {};
    if (flags.a11y) return 'gg2db_endless_a11y';
    if (partySize <= 1) return 'gg2db_endless_solo';
    if (partySize === 2) return 'gg2db_endless_2p';
    if (partySize === 3) return 'gg2db_endless_3p';
    return 'gg2db_endless_4p';
  }
  function dailyRun(day) {
    var seed = dailySeed(day);
    try {
      var g = (typeof window !== 'undefined' && window.GraveGain2dBEndlessGen) ||
        (typeof globalThis !== 'undefined' && globalThis.GraveGain2dBEndlessGen) || null;
      if (g && typeof g.buildDag === 'function') return g.buildDag(seed, 6);
    } catch (_) {}
    return { seed: seed, depth: 6, nodes: [{ idx: 0, room: 'entry' }], edges: [] };
  }

  var api = {
    DAILY_PREFIX: DAILY_PREFIX,
    BOARD_KEYS: BOARD_KEYS,
    dayString: dayString,
    dailySeed: dailySeed,
    dailyKey: dailyKey,
    boardKey: boardKey,
    dailyRun: dailyRun
  };
  try {
    if (typeof window !== 'undefined') window.GraveGain2dBEndlessDaily = api;
    else if (typeof globalThis !== 'undefined') globalThis.GraveGain2dBEndlessDaily = api;
  } catch (_) {}
  try { if (typeof module !== 'undefined' && module.exports) module.exports = api; } catch (_) {}
})();
