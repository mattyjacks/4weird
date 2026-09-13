/* GraveGain MMO cross-game titles (games lane, v2-native).
 * Vanilla IIFE, idempotent, zero imports, zero timers, zero network,
 * zero storage, zero DOM writes. Titles are earned once and shown in
 * every game (gravegain1d / gravegain2d / gravegain3d): the caller
 * passes a progress record, this module only judges it.
 *
 *   window.GraveGainMMOTitles = {
 *     VERSION, TITLES, titleFor, earnedTitles, describe
 *   }
 *
 * progress: { bossKills, frontsCleared, warbandWins, seasonWeeks,
 *   codexEntries, gamesPlayed[] }. Every public function is guarded
 * and NEVER throws: on any failure it returns a safe fallback value.
 *
 * Mode contract (mirrors gravegain-mmorpg-events.js): kid band gets cozy
 * copies; no drugs in any band (none exist here).
 */
(function () {
    'use strict';

    var VERSION = '1.0.0';

    function getWindow() {
        try {
            if (typeof window !== 'undefined') return window;
        } catch (e) { /* ignore */ }
        return null;
    }

    var win = getWindow();
    if (!win) return;
    if (win.GraveGainMMOTitles) return;

    /* check(progress) -> true when earned. Keep checks total-order safe. */
    var TITLES = [
        { id: 'first-blood',
          name: { kid: 'Brave First-Stepper', teen: 'First Blood', all: 'FIRST BLOOD' },
          hint: 'Clear any 1 world-boss front',
          check: function (p) { return p.frontsCleared >= 1; } },
        { id: 'titanbane',
          name: { kid: 'Giant Giggle-Tamer', teen: 'Titanbane', all: 'TITANBANE' },
          hint: 'Kill the Grave Titan on all 3 fronts',
          check: function (p) { return p.bossKills >= 1; } },
        { id: 'widowbane',
          name: { kid: 'Shy Spider Friend', teen: 'Widowbane', all: 'WIDOWBANE' },
          hint: 'Kill the Spire Widow on all 3 fronts',
          check: function (p) { return p.bossKills >= 2; } },
        { id: 'choirbane',
          name: { kid: 'Choir Hum-Alonger', teen: 'Choirbane', all: 'CHOIRBANE' },
          hint: 'Kill the Marrow Choir on all 3 fronts',
          check: function (p) { return p.bossKills >= 3; } },
        { id: 'thiefbane',
          name: { kid: 'Lantern-Sharer', teen: 'Thiefbane', all: 'THIEFBANE' },
          hint: 'Kill the Lantern Thief on all 3 fronts',
          check: function (p) { return p.bossKills >= 4; } },
        { id: 'warband-sworn',
          name: { kid: 'Best-Friends Badge', teen: 'Warband Sworn', all: 'WARBAND SWORN' },
          hint: 'Win 1 warband front fight',
          check: function (p) { return p.warbandWins >= 1; } },
        { id: 'warband-captain',
          name: { kid: 'Team Hug Captain', teen: 'Warband Captain', all: 'WARBAND CAPTAIN' },
          hint: 'Win 10 warband front fights',
          check: function (p) { return p.warbandWins >= 10; } },
        { id: 'driftskipper',
          name: { kid: 'Sparkle Skipper', teen: 'Driftskipper', all: 'DRIFTSKIPPER' },
          hint: 'Place top-10 in an Echo Drift Surge week',
          check: function (p) { return p.seasonWeeks >= 1; } },
        { id: 'moonsinger',
          name: { kid: 'Moon Lullaby Singer', teen: 'Moonsinger', all: 'MOONSINGER' },
          hint: 'Kill the Marrow Choir during Necrogenesis Moon',
          check: function (p) { return p.seasonWeeks >= 2 && p.bossKills >= 3; } },
        { id: 'codex-keeper',
          name: { kid: 'Sticker Book Star', teen: 'Codex Keeper', all: 'CODEX KEEPER' },
          hint: 'Carry 25 codex entries across games',
          check: function (p) { return p.codexEntries >= 25; } },
        { id: 'tri-gamer',
          name: { kid: 'Three-Game Explorer', teen: 'Tri-Gamer', all: 'TRI-GAMER' },
          hint: 'Play gravegain1d, gravegain2d and gravegain3d',
          check: function (p) { return p.gamesPlayed.length >= 3; } },
        { id: 'worlds-end',
          name: { kid: 'Super-Duper Hero', teen: 'Worlds End', all: 'WORLDS END' },
          hint: 'Earn every other title',
          check: function (p) { return p.otherCount >= 11; } }
    ];

    function normProgress(v) {
        var p = { bossKills: 0, frontsCleared: 0, warbandWins: 0, seasonWeeks: 0, codexEntries: 0, gamesPlayed: [], otherCount: 0 };
        try {
            if (!v) return p;
            var n = function (x) {
                try {
                    var k = Math.floor(Number(x));
                    if (isFinite(k) && k > 0) return k;
                } catch (e) { /* ignore */ }
                return 0;
            };
            p.bossKills = n(v.bossKills);
            p.frontsCleared = n(v.frontsCleared);
            p.warbandWins = n(v.warbandWins);
            p.seasonWeeks = n(v.seasonWeeks);
            p.codexEntries = n(v.codexEntries);
            try {
                if (v.gamesPlayed && v.gamesPlayed.length) {
                    var seen = {};
                    for (var i = 0; i < v.gamesPlayed.length; i++) {
                        var g = String(v.gamesPlayed[i]).toLowerCase();
                        if ((g === 'gravegain1d' || g === 'gravegain2d' || g === 'gravegain3d') && !seen[g]) {
                            seen[g] = true;
                            p.gamesPlayed.push(g);
                        }
                    }
                }
            } catch (e) { /* ignore */ }
        } catch (e) { /* ignore */ }
        return p;
    }

    function checkOne(t, p) {
        try {
            if (t && typeof t.check === 'function') return !!t.check(p);
        } catch (e) { /* ignore */ }
        return false;
    }

    function titleFor(id) {
        try {
            var s = String(id == null ? '' : id).toLowerCase();
            for (var i = 0; i < TITLES.length; i++) {
                if (TITLES[i].id === s) return TITLES[i];
            }
        } catch (e) { /* ignore */ }
        return null;
    }

    /* Judge a progress record; returns array of earned title ids. */
    function earnedTitles(progress) {
        try {
            var p = normProgress(progress);
            var out = [];
            for (var i = 0; i < TITLES.length; i++) {
                var t = TITLES[i];
                if (t.id === 'worlds-end') continue;
                try {
                    if (checkOne(t, p)) {
                        out.push(t.id);
                    }
                } catch (e) { /* ignore */ }
            }
            p.otherCount = out.length;
            try {
                var last = titleFor('worlds-end');
                if (last && checkOne(last, p)) out.push('worlds-end');
            } catch (e) { /* ignore */ }
            return out;
        } catch (e) { /* ignore */ }
        return [];
    }

    function describe(progress) {
        try {
            var earned = earnedTitles(progress);
            return earned.length + ' of ' + TITLES.length + ' titles earned.';
        } catch (e) { /* ignore */ }
        return '0 titles earned.';
    }

    win.GraveGainMMOTitles = {
        VERSION: VERSION,
        TITLES: TITLES,
        titleFor: titleFor,
        earnedTitles: earnedTitles,
        describe: describe
    };
})();
