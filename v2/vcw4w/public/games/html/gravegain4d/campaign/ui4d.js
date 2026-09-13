/* GraveGain4D - ui4d.js. Objectives tracker + mission-complete card data.
   Pure data/format helpers for the 4D HUD. Never touches fullscreen.
   Never throws. */
(function () {
    'use strict';
    try {
        if (typeof window === 'undefined') return;
        function campaign() {
            try { return window.GG4D_Campaign || null; } catch (_) { return null; }
        }
        function trackerLines(mission, progress) {
            try {
                if (!mission || !Array.isArray(mission.objectives)) return ['No objectives.'];
                var p = progress || {};
                return mission.objectives.map(function (o, i) {
                    try {
                        var cur = Number(p[o.id] !== undefined ? p[o.id] : 0) || 0;
                        var need = Number(o.count) || 1;
                        var done = cur >= need ? '✅' : '◻️';
                        return done + ' ' + (i + 1) + '. ' + o.desc + ' (' + Math.min(cur, need) + '/' + need + ')';
                    } catch (_) { return String((o && o.desc) || 'Objective'); }
                });
            } catch (_) { return []; }
        }
        function completeCard(missionId, stars, elapsedSeconds) {
            try {
                var c = campaign();
                var m = c ? c.get(missionId) : null;
                if (!m) return null;
                var r = m.rewards || {};
                return {
                    title: 'MISSION COMPLETE',
                    mission: m.title,
                    subtitle: m.subtitle || '',
                    stars: stars,
                    starsText: '★★★'.slice(0, stars) + '☆☆☆'.slice(0, 3 - stars),
                    time: elapsedSeconds,
                    par: m.par || m.parSeconds || 0,
                    killCredits: r.killCredits || 0,
                    gold: r.gold || 0,
                    uusd: r.uusd || 0,
                    unlock: r.unlock || null,
                    nextId: (Number(missionId) < 10) ? Number(missionId) + 1 : null,
                    wSlice: m.wSlice
                };
            } catch (_) { return null; }
        }
        window.GG4D_CampaignUI = {
            VERSION: 'gg4d-ui-1.0.0',
            trackerLines: trackerLines,
            completeCard: completeCard,
            titlecard: function (missionId) {
                try {
                    var c = campaign();
                    var m = c ? c.get(missionId) : null;
                    if (!m) return null;
                    return { title: m.title, subtitle: m.subtitle || '', wSlice: m.wSlice, timeFork: m.timeFork };
                } catch (_) { return null; }
            }
        };
    } catch (_) { /* never throw */ }
})();
