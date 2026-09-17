/* GraveGain4D Campaign - 00-boot4d.js.
   Registry for the 10-mission 4D campaign. Loads BEFORE m01..m10
   (numeric order). Mission packs register via
   window.GG4D_Campaign.register(missionDef).
   Never throws: every step guarded. */
(function () {
    'use strict';
    try {
        if (typeof window === 'undefined') return;
        if (window.GG4D_Campaign) return;
        var order = [];
        var byId = Object.create(null);
        function toKey(id) {
            try {
                var n = Number(id);
                if (isFinite(n)) return 'm' + String(Math.round(n)).padStart(2, '0');
            } catch (_) { /* fall through */ }
            return String(id);
        }
        var Campaign = {
            VERSION: 'gg4d-campaign-1.0.0',
            SAGA: 'GraveGain: MoonRock / LuckyStarShip / NecroGenesis',
            register: function (def) {
                try {
                    if (!def || typeof def !== 'object') return false;
                    var n = Number(def.id);
                    if (!isFinite(n) || n < 1 || n > 10) return false;
                    var key = toKey(n);
                    if (byId[key]) return false;
                    def.key = key;
                    byId[key] = def;
                    order.push(def);
                    order.sort(function (a, b) { return Number(a.id) - Number(b.id); });
                    return true;
                } catch (_) { return false; }
            },
            get: function (id) {
                try { return byId[toKey(id)] || null; } catch (_) { return null; }
            },
            all: function () {
                try { return order.slice(); } catch (_) { return []; }
            },
            count: function () {
                try { return order.length; } catch (_) { return 0; }
            },
            isCampaignRun: function (game) {
                try { return !!(game && game.currentMission4D); } catch (_) { return false; }
            }
        };
        window.GG4D_Campaign = Campaign;
        window.GG4D_CampaignMissions = order;
    } catch (_) { /* never throw during boot */ }
})();
