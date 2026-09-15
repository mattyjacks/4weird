/* GraveGain2dB Endless - boards (daily server-seed + leaderboards).
   Daily: server publishes one seed per day; all runners share rooms/order.
   Boards: solo / 2p / 3p / 4p / accessibility (separate, same rules).
   This file is the board schema + seed rule only - no network calls.
   Global surface: window.GraveGain2dBEndlessBoards only. */
(function () {
    'use strict';

    var KEY = 'GraveGain2dBEndlessBoards';

    var BOARDS = ['solo', '2p', '3p', '4p', 'accessibility'];

    var DAILY = {
        rule: 'Server seed of the day: seed = "gg2db-" + UTC date (YYYY-MM-DD). Room order and elite affixes derive from the seed; player damage/HP rules are identical across boards.',
        seedFormat: 'gg2db-YYYY-MM-DD',
        example: 'gg2db-2026-09-15',
        rotationUtc: '00:00 UTC'
    };

    var SCORING = {
        killPoints: 100,
        sectorClearBonus: 500,
        bossBonus: 1000,
        rescueBonus: 500,
        noDeathBonus: 400,
        note: 'Accessibility board uses identical scoring; it differs only in assist options allowed (aim assist, longer timers, collapse grace).'
    };

    var ASSISTS = {
        accessibility: ['aim-assist', 'longer-volley-windows', 'collapse-grace-10s', 'high-contrast-palettes'],
        rule: 'Assists are board-gated: accessibility-board runs may enable them; solo/2p/3p/4p runs may not.'
    };

    function boardId(name) {
        try {
            if (BOARDS.indexOf(String(name)) !== -1) return String(name);
        } catch (_) {}
        return null;
    }

    function dailySeed(utcDate) {
        try {
            var d = utcDate instanceof Date ? utcDate : new Date();
            var y = d.getUTCFullYear();
            var m = ('0' + (d.getUTCMonth() + 1)).slice(-2);
            var day = ('0' + d.getUTCDate()).slice(-2);
            return 'gg2db-' + y + '-' + m + '-' + day;
        } catch (_) {
            return 'gg2db-unknown';
        }
    }

    var api = {
        boards: BOARDS,
        daily: DAILY,
        scoring: SCORING,
        assists: ASSISTS,
        boardId: boardId,
        dailySeed: dailySeed
    };

    try {
        if (typeof window !== 'undefined') window[KEY] = api;
        else if (typeof globalThis !== 'undefined') globalThis[KEY] = api;
    } catch (_) {}
    try {
        if (typeof module !== 'undefined' && module.exports) module.exports = api;
    } catch (_) {}
})();
