/* GraveGain MMO codex carryover (games lane, v2-native).
 * Vanilla IIFE, idempotent, zero imports, zero timers, zero network,
 * zero storage, zero DOM writes. The codex is the cross-game record of
 * what a player has found: bestiary pages, boss kills, cleared fronts,
 * seasons survived, warbands joined, lore scraps. Entries earned in one
 * game carry into the others; merging keeps the best rank per entry.
 *
 *   window.GraveGainMMOCodex = {
 *     VERSION, CATEGORIES, MAX_RANK, normalize, mergeCodex, carryoverSummary, describe
 *   }
 *
 * codex shape: { <entryId>: { category, rank, game } }. Rank is 0-3
 * (seen 0, noted 1, studied 2, mastered 3). Every public function is
 * guarded and NEVER throws: on any failure it returns a safe fallback.
 */
(function () {
    'use strict';

    var VERSION = '1.0.0';
    var MAX_RANK = 3;

    function getWindow() {
        try {
            if (typeof window !== 'undefined') return window;
        } catch (e) { /* ignore */ }
        return null;
    }

    var win = getWindow();
    if (!win) return;
    if (win.GraveGainMMOCodex) return;

    var CATEGORIES = ['bestiary', 'bosses', 'fronts', 'seasons', 'warbands', 'lore'];
    var GAMES = ['gravegain1d', 'gravegain2d', 'gravegain3d'];

    function normId(v) {
        try {
            var s = String(v == null ? '' : v).toLowerCase().replace(/[^a-z0-9-]/g, '');
            if (s) return s.slice(0, 64);
        } catch (e) { /* ignore */ }
        return '';
    }

    function normCategory(v) {
        try {
            var s = String(v == null ? '' : v).toLowerCase();
            for (var i = 0; i < CATEGORIES.length; i++) {
                if (CATEGORIES[i] === s) return s;
            }
        } catch (e) { /* ignore */ }
        return 'lore';
    }

    function normRank(v) {
        try {
            var n = Math.floor(Number(v));
            if (!isFinite(n) || n < 0) return 0;
            if (n > MAX_RANK) return MAX_RANK;
            return n;
        } catch (e) { /* ignore */ }
        return 0;
    }

    function normGame(v) {
        try {
            var s = String(v == null ? '' : v).toLowerCase();
            for (var i = 0; i < GAMES.length; i++) {
                if (GAMES[i] === s) return s;
            }
        } catch (e) { /* ignore */ }
        return '';
    }

    /* Clean one raw entry into canonical shape; null when unusable. */
    function normalize(raw) {
        try {
            if (!raw) return null;
            var id = normId(raw.id);
            if (!id) return null;
            return {
                id: id,
                category: normCategory(raw.category),
                rank: normRank(raw.rank),
                game: normGame(raw.game)
            };
        } catch (e) { /* ignore */ }
        return null;
    }

    function asMap(codex) {
        var out = {};
        try {
            if (!codex) return out;
            var keys = [];
            try { keys = Object.keys(codex); } catch (e) { keys = []; }
            for (var i = 0; i < keys.length; i++) {
                var clean = normalize(codex[keys[i]]);
                if (clean) out[clean.id] = clean;
                else {
                    var byKey = normalize({ id: keys[i], category: (codex[keys[i]] || {}).category, rank: (codex[keys[i]] || {}).rank, game: (codex[keys[i]] || {}).game });
                    if (byKey) out[byKey.id] = byKey;
                }
            }
        } catch (e) { /* ignore */ }
        return out;
    }

    /* Carryover merge: best rank per entry wins, ties keep the primary
     * game tag. Returns a fresh codex map. Never throws. */
    function mergeCodex(primary, secondary) {
        try {
            var out = asMap(primary);
            var extra = asMap(secondary);
            var keys = [];
            try { keys = Object.keys(extra); } catch (e) { keys = []; }
            for (var i = 0; i < keys.length; i++) {
                var cur = out[keys[i]];
                var nxt = extra[keys[i]];
                if (!cur) out[keys[i]] = nxt;
                else if (nxt.rank > cur.rank) out[keys[i]] = nxt;
            }
            return out;
        } catch (e) { /* ignore */ }
        return {};
    }

    /* Counts per category plus total; safe on any input. */
    function carryoverSummary(codex) {
        var sum = { total: 0, bestiary: 0, bosses: 0, fronts: 0, seasons: 0, warbands: 0, lore: 0, mastered: 0 };
        try {
            var map = asMap(codex);
            var keys = [];
            try { keys = Object.keys(map); } catch (e) { keys = []; }
            sum.total = keys.length;
            for (var i = 0; i < keys.length; i++) {
                var e = map[keys[i]];
                try {
                    if (sum[e.category] !== undefined) sum[e.category] += 1;
                    else sum.lore += 1;
                    if (e.rank >= MAX_RANK) sum.mastered += 1;
                } catch (err) { /* ignore */ }
            }
        } catch (e) { /* ignore */ }
        return sum;
    }

    function describe(codex) {
        try {
            var s = carryoverSummary(codex);
            return s.total + ' codex entries carried over (' + s.mastered + ' mastered).';
        } catch (e) { /* ignore */ }
        return '0 codex entries carried over.';
    }

    win.GraveGainMMOCodex = {
        VERSION: VERSION,
        CATEGORIES: CATEGORIES,
        MAX_RANK: MAX_RANK,
        normalize: normalize,
        mergeCodex: mergeCodex,
        carryoverSummary: carryoverSummary,
        describe: describe
    };
})();
