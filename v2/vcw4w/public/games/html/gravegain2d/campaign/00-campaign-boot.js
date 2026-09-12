/* GraveGain2D Campaign — 00 boot.
   Mission-extra registry + apply onto the SHARED story missions.
   Mirrors gravegain3d/campaign/00-campaign-boot.js, adapted for 2D:
   there is no AAA bus in the 2D game, so extras are applied
   synchronously at load (the shared missions script loads first, per
   index.html order) plus again on DOMContentLoaded / window load as a
   safety net for late registrations (m01…m10 load right after this).
   The shared missions file itself is never edited — only the page's
   runtime copies are mutated. Never throws during boot. */
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

    // 2D has no AAA bus: the shared missions are a plain synchronous
    // script loaded before this file, so apply right away. Re-apply on
    // DOMContentLoaded / load so late-registered extras still land.
    function scheduleApply() {
        try {
            applyAll();
        } catch (_) { /* never throw during boot */ }
        try {
            if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
                document.addEventListener('DOMContentLoaded', function () { applyAll(); });
            }
        } catch (_) { /* ignore */ }
        try {
            if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
                window.addEventListener('load', function () { applyAll(); });
            }
        } catch (_) { /* ignore */ }
    }

    var Campaign = null;
    try {
        Campaign = window.GraveGainCampaign || null;
    } catch (_) {
        Campaign = null;
    }
    // Extend an existing registry in place (never replace it); otherwise
    // create it. This keeps double-loads and cross-game reuse safe.
    if (!Campaign || typeof Campaign !== 'object') Campaign = {};

    // Preserve any extras registered before this boot ran.
    try {
        if (typeof Campaign.allExtras === 'function') {
            var pre = Campaign.allExtras();
            for (var k in pre) {
                try {
                    if (Object.prototype.hasOwnProperty.call(pre, k) && !extras[toKey(k)]) {
                        extras[toKey(k)] = pre[k];
                    }
                } catch (_) { /* ignore */ }
            }
        }
    } catch (_) { /* ignore */ }

    Campaign.registerMissionExtra = function (id, extra) {
        try {
            if (id === undefined || id === null || !extra) return false;
            extras[toKey(id)] = extra;
            // Late registration (after the apply already ran):
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
    };
    Campaign.getExtra = function (id) {
        try {
            var hit = extras[toKey(id)];
            return hit || null;
        } catch (_) {
            return null;
        }
    };
    Campaign.allExtras = function () {
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
    };
    // Returns the (already mutated) shared mission def, or null.
    Campaign.getMissionDef = function (id) {
        try {
            return findSharedMission(id);
        } catch (_) {
            return null;
        }
    };
    // True when the current run is a campaign (story mission) run.
    // 2D API: the live instance is window.GraveGainGame with
    // .currentMission set (see game.js initRun).
    Campaign.isCampaignRun = function (game) {
        try {
            return !!(game && game.currentMission);
        } catch (_) {
            return false;
        }
    };

    try {
        window.GraveGainCampaign = Campaign;
    } catch (_) { /* no window — nothing to attach to */ }
    try {
        scheduleApply();
    } catch (_) { /* never throw during boot */ }
})();
