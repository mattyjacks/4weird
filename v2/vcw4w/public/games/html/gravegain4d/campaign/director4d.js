/* GraveGain4D - director4d.js. Mission sequencing + difficulty ramp.
   Reads window.GG4D_Campaign registry. Never throws. */
(function () {
    'use strict';
    try {
        if (typeof window === 'undefined') return;
        function campaign() {
            try { return window.GG4D_Campaign || null; } catch (_) { return null; }
        }
        function rampFor(mission) {
            try {
                if (mission && mission.difficulty) return mission.difficulty;
                var n = mission ? Number(mission.id) : 1;
                if (!isFinite(n) || n < 1) n = 1;
                return {
                    hpMult: 1 + (n - 1) * 0.12,
                    dmgMult: 1 + (n - 1) * 0.05,
                    density: 0.7 + (n - 1) * 0.08,
                    eliteChance: 0.02 + (n - 1) * 0.022
                };
            } catch (_) {
                return { hpMult: 1, dmgMult: 1, density: 1, eliteChance: 0.05 };
            }
        }
        var Director = {
            VERSION: 'gg4d-director-1.0.0',
            order: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            ramp: rampFor,
            getMission: function (id) {
                try {
                    var c = campaign();
                    return c ? c.get(id) : null;
                } catch (_) { return null; }
            },
            next: function (id) {
                try {
                    var n = Number(id);
                    if (!isFinite(n) || n < 1 || n >= 10) return null;
                    var c = campaign();
                    return c ? c.get(n + 1) : null;
                } catch (_) { return null; }
            },
            prev: function (id) {
                try {
                    var n = Number(id);
                    if (!isFinite(n) || n <= 1) return null;
                    var c = campaign();
                    return c ? c.get(n - 1) : null;
                } catch (_) { return null; }
            },
            isUnlocked: function (id, clearedIds) {
                try {
                    var n = Number(id);
                    if (!isFinite(n)) return false;
                    if (n === 1) return true;
                    if (!Array.isArray(clearedIds)) return false;
                    return clearedIds.indexOf(n - 1) !== -1;
                } catch (_) { return false; }
            },
            // Difficulty ramp summary: w-slices descend 0..-9 as ids rise.
            sequence: function () {
                try {
                    var c = campaign();
                    if (!c) return [];
                    return c.all().map(function (m) {
                        return {
                            id: m.id, title: m.title,
                            wSlice: m.wSlice, timeFork: m.timeFork,
                            difficulty: rampFor(m)
                        };
                    });
                } catch (_) { return []; }
            },
            starRating: function (id, elapsedSeconds, deaths) {
                try {
                    var c = campaign();
                    var m = c ? c.get(id) : null;
                    var par = m ? Number(m.par || m.parSeconds) : NaN;
                    var stars = 3;
                    if (isFinite(par) && par > 0 && Number(elapsedSeconds) > par) stars -= 1;
                    if (Number(deaths) > 0) stars -= Math.min(Number(deaths), 2);
                    if (stars < 1) stars = 1;
                    if (stars > 3) stars = 3;
                    return stars;
                } catch (_) { return 1; }
            }
        };
        window.GG4D_CampaignDirector = Director;
    } catch (_) { /* never throw */ }
})();
