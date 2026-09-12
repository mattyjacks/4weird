/* GraveGain3D Campaign — 00 boot.
   Mission-extra registry + lazy apply onto the SHARED story missions.
   Loads BEFORE campaign/m01.js … m10.js (numeric order), so the registry
   must exist first; the mission packs register via
   window.GraveGainCampaign.registerMissionExtra(id, extra).
   After ALL scripts load, on AAA.ready(), extras are applied to the shared
   window.GraveGainStoryMissions IN PLACE (overwrite dialogueBefore /
   dialogueAfter, attach mission._campaign = extra) so the runtime clone in
   initRun() carries the campaign data. The shared missions file itself is
   never edited — only the page's runtime copies are mutated.
   Never throws during boot: every step is guarded. */
(function () {
    'use strict';

    var extras = Object.create(null);
    var applied = false;

    function toKey(id) {
        try {
            var n = Number(id);
            if (isFinite(n)) return String(n);
        } catch (_) { /* fall through */ }
        return String(id);
    }

    function getSharedMissions() {
        try {
            if (typeof window === 'undefined') return null;
            var list = window.GraveGainStoryMissions;
            if (!list || typeof list.length !== 'number') return null;
            return list;
        } catch (_) {
            return null;
        }
    }

    function findSharedMission(id) {
        try {
            if (window.GraveGainStoryEngine &&
                typeof window.GraveGainStoryEngine.getMission === 'function') {
                return window.GraveGainStoryEngine.getMission(Number(id) || id);
            }
        } catch (_) { /* fall through to linear scan */ }
        try {
            var list = getSharedMissions();
            if (!list) return null;
            var want = Number(id);
            for (var i = 0; i < list.length; i++) {
                if (list[i] && (list[i].id === want || list[i].id === id)) return list[i];
            }
        } catch (_) { /* ignore */ }
        return null;
    }

    function applyExtraToMission(mission, extra) {
        if (!mission || !extra || typeof mission !== 'object' || typeof extra !== 'object') return;
        try {
            if (Array.isArray(extra.dialogueBefore)) mission.dialogueBefore = extra.dialogueBefore;
            if (Array.isArray(extra.dialogueAfter)) mission.dialogueAfter = extra.dialogueAfter;
            mission._campaign = extra;
        } catch (_) { /* one bad mission must not break the rest */ }
    }

    function applyAll() {
        try {
            var list = getSharedMissions();
            if (!list) return false;
            for (var i = 0; i < list.length; i++) {
                try {
                    var mission = list[i];
                    if (!mission) continue;
                    var extra = extras[toKey(mission.id)];
                    if (extra) applyExtraToMission(mission, extra);
                } catch (_) { /* keep going */ }
            }
            applied = true;
            return true;
        } catch (_) {
            return false;
        }
    }

    // Apply lazily once the AAA bus exists (i.e. after ALL scripts loaded).
    // If AAA is not present yet, retry briefly; as a last resort, also try
    // on window load so extras still land even without the AAA bus.
    function scheduleApply() {
        try {
            if (typeof window === 'undefined') return;
            var AAA = window.GraveGainAAA;
            if (AAA && typeof AAA.ready === 'function') {
                AAA.ready(function () { applyAll(); });
                return;
            }
        } catch (_) { /* fall through to retry */ }
        try {
            var tries = 0;
            var timer = setInterval(function () {
                tries += 1;
                try {
                    var bus = window.GraveGainAAA;
                    if (bus && typeof bus.ready === 'function') {
                        clearInterval(timer);
                        bus.ready(function () { applyAll(); });
                    } else if (tries >= 80) {
                        clearInterval(timer);
                        applyAll(); // AAA never appeared; apply anyway
                    }
                } catch (_) { /* keep retrying */ }
            }, 250);
            if (typeof window.addEventListener === 'function') {
                window.addEventListener('load', function () { applyAll(); });
            }
        } catch (_) { /* never throw during boot */ }
    }

    var Campaign = {
        registerMissionExtra: function (id, extra) {
            try {
                if (id === undefined || id === null || !extra) return false;
                extras[toKey(id)] = extra;
                // Late registration (after the lazy apply already ran):
                // attach this one extra immediately so it is not lost.
                if (applied) {
                    try {
                        var mission = findSharedMission(id);
                        if (mission) applyExtraToMission(mission, extra);
                    } catch (_) { /* ignore */ }
                }
                return true;
            } catch (_) {
                return false;
            }
        },
        getExtra: function (id) {
            try {
                var hit = extras[toKey(id)];
                return hit || null;
            } catch (_) {
                return null;
            }
        },
        allExtras: function () {
            try {
                var copy = {};
                for (var k in extras) {
                    try {
                        if (Object.prototype.hasOwnProperty.call(extras, k)) copy[k] = extras[k];
                    } catch (_) { /* ignore */ }
                }
                return copy;
            } catch (_) {
                return {};
            }
        },
        // Returns the (already mutated) shared mission def, or null.
        getMissionDef: function (id) {
            try {
                return findSharedMission(id);
            } catch (_) {
                return null;
            }
        },
        // True when the current run is a campaign (story mission) run.
        isCampaignRun: function (game) {
            try {
                return !!(game && game.currentMission);
            } catch (_) {
                return false;
            }
        }
    };

    try {
        window.GraveGainCampaign = Campaign;
    } catch (_) { /* no window — nothing to attach to */ }
    try {
        scheduleApply();
    } catch (_) { /* never throw during boot */ }
})();
