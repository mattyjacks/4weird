(function () {
    'use strict';

    // =========================================================================
    // GRAVEGAIN4D - CAMPAIGN DIRECTOR (director4d.js)
    // Mission flow: before-dialogue -> floor-gen params -> objectives ->
    // boss phases -> after-dialogue -> StoryEngine-compatible save under the
    // gravegain4d key family + mirror to the shared story key. Star rating by
    // strokes-vs-par + time. Exposes window.GraveGain4DDirector (aliased as
    // window.GraveGain4DCampaign). Reads window.GraveGain4DMissions and
    // window.GraveGainStoryEngine only when present. Never throws: every
    // public method is guarded and returns a safe fallback.
    // =========================================================================

    var SAVE_KEY = 'gravegain4d_campaign_progress_v1';
    var SHARED_KEY = 'gravegain_shared_story_progress_v1';

    function missions() {
        try {
            var list = (typeof window !== 'undefined') ? window.GraveGain4DMissions : null;
            if (Array.isArray(list)) return list;
        } catch (_) { /* fall through */ }
        return [];
    }

    function blankProgress() {
        return { completedMissions: [], stars: {}, currentMissionId: null, totalStrokes: 0, rewindsUsed: 0 };
    }

    function getProgress() {
        try {
            if (typeof localStorage === 'undefined') return blankProgress();
            var raw = localStorage.getItem(SAVE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    if (!Array.isArray(parsed.completedMissions)) parsed.completedMissions = [];
                    if (!parsed.stars || typeof parsed.stars !== 'object') parsed.stars = {};
                    return parsed;
                }
            }
        } catch (_) { /* fall through to blank */ }
        return blankProgress();
    }

    function saveProgress(progress) {
        try {
            if (typeof localStorage === 'undefined') return false;
            localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
            return true;
        } catch (_) {
            return false;
        }
    }

    function getMission(id) {
        try {
            var want = Number(id);
            var list = missions();
            for (var i = 0; i < list.length; i++) {
                var m = list[i];
                if (!m) continue;
                if (m.missionId === want || m.id === want || m.missionId === id || m.id === id) return m;
            }
        } catch (_) { /* ignore */ }
        return null;
    }

    // Star rating: strokes-vs-par + time. Completion always earns >= 1.
    function starRating(strokes, par, seconds, parSeconds) {
        try {
            var p = (typeof par === 'number' && par > 0) ? par : 5;
            var s = (typeof strokes === 'number') ? strokes : p;
            var stars = 3;
            if (s > p) stars -= 1;
            if (s > p + 3) stars -= 1;
            if (typeof seconds === 'number' && typeof parSeconds === 'number' && parSeconds > 0) {
                if (seconds > parSeconds) stars -= 1;
            }
            if (stars < 1) stars = 1;
            if (stars > 3) stars = 3;
            return stars;
        } catch (_) {
            return 1;
        }
    }

    // Mirror a completion into the shared StoryEngine save family so hub
    // progress stays consistent. Uses the shared engine when loaded,
    // otherwise merges the shared localStorage record directly.
    function mirrorToShared(missionId, stars) {
        try {
            if (typeof window !== 'undefined' && window.GraveGainStoryEngine &&
                typeof window.GraveGainStoryEngine.completeMission === 'function') {
                window.GraveGainStoryEngine.completeMission(Number(missionId), stars);
                return true;
            }
        } catch (_) { /* fall through to direct merge */ }
        try {
            if (typeof localStorage === 'undefined') return false;
            var raw = localStorage.getItem(SHARED_KEY);
            var data = raw ? JSON.parse(raw) : null;
            if (!data || typeof data !== 'object') {
                data = { completedMissions: [], stars: {}, currentMissionId: null, totalStoryKills: 0 };
            }
            if (!Array.isArray(data.completedMissions)) data.completedMissions = [];
            if (!data.stars || typeof data.stars !== 'object') data.stars = {};
            var idNum = Number(missionId);
            if (data.completedMissions.indexOf(idNum) === -1) data.completedMissions.push(idNum);
            data.stars[idNum] = Math.max(data.stars[idNum] || 0, stars);
            localStorage.setItem(SHARED_KEY, JSON.stringify(data));
            return true;
        } catch (_) {
            return false;
        }
    }

    var Director = {
        SAVE_KEY: SAVE_KEY,
        SHARED_KEY: SHARED_KEY,

        getProgress: getProgress,
        saveProgress: saveProgress,
        getMission: getMission,
        starRating: starRating,

        getAllMissions: function () {
            try { return missions().slice(); } catch (_) { return []; }
        },

        isUnlocked: function (id) {
            try {
                var m = getMission(id);
                if (!m) return false;
                var by = (m.unlockedBy === undefined || m.unlockedBy === null) ? 0 : Number(m.unlockedBy);
                if (by === 0) return true;
                var progress = getProgress();
                return progress.completedMissions.indexOf(by) !== -1 ||
                    progress.completedMissions.indexOf(String(by)) !== -1;
            } catch (_) {
                return false;
            }
        },

        // Flow step 1: open a mission - marks it current, returns the
        // before-dialogue plus floor-gen params for the 4D engine.
        beginMission: function (id) {
            try {
                var m = getMission(id);
                if (!m) return null;
                var progress = getProgress();
                progress.currentMissionId = m.missionId !== undefined ? m.missionId : m.id;
                saveProgress(progress);
                return {
                    mission: m,
                    dialogueBefore: Array.isArray(m.dialogueBefore) ? m.dialogueBefore : [],
                    floorParams: Director.floorParamsFor(m)
                };
            } catch (_) {
                return null;
            }
        },

        // Flow step 2: floor-gen params derived from the mission def.
        floorParamsFor: function (mission) {
            try {
                if (!mission) return null;
                var mid = Number(mission.missionId !== undefined ? mission.missionId : mission.id) || 1;
                return {
                    theme: mission.dungeonTheme || 'metallic_ship',
                    minFloor: mission.minFloor || mid,
                    bossType: mission.bossType || null,
                    wAxisSeed: mid * 1009 + 77,
                    gateCount: gateCountFor(mission),
                    rewindBudget: rewindBudgetFor(mission),
                    par: mission.par || 5,
                    parSeconds: mission.parSeconds || 0
                };
            } catch (_) {
                return null;
            }
        },

        // Flow step 3: live objective state (engine pushes counts here).
        objectiveState: function (id) {
            try {
                var m = getMission(id);
                if (!m || !Array.isArray(m.objectives)) return [];
                return m.objectives.map(function (o) {
                    return { id: o.id, desc: o.desc, count: o.count, current: o.current || 0 };
                });
            } catch (_) {
                return [];
            }
        },

        // Flow step 4: which boss phase is active at a given boss hp fraction.
        bossPhase: function (id, hpFrac) {
            try {
                var m = getMission(id);
                if (!m || !Array.isArray(m.bossPhases) || !m.bossPhases.length) return null;
                var frac = (typeof hpFrac === 'number') ? hpFrac : 1;
                var phases = m.bossPhases;
                var idx = 0;
                if (frac <= 1 / 3) idx = phases.length - 1;
                else if (frac <= 2 / 3) idx = Math.min(1, phases.length - 1);
                return { index: idx, phase: phases[idx] };
            } catch (_) {
                return null;
            }
        },

        // Flow step 5: close a mission - stars, 4D save, shared mirror,
        // after-dialogue for the hub to play.
        completeMission: function (id, result) {
            try {
                var m = getMission(id);
                if (!m) return null;
                var r = result || {};
                var par = (typeof r.par === 'number') ? r.par : (m.par || 5);
                var stars = starRating(r.strokes, par, r.seconds, r.parSeconds !== undefined ? r.parSeconds : m.parSeconds);
                var progress = getProgress();
                var mid = m.missionId !== undefined ? m.missionId : m.id;
                var midNum = Number(mid);
                var already = progress.completedMissions.indexOf(midNum) !== -1 ||
                    progress.completedMissions.indexOf(mid) !== -1;
                if (!already) progress.completedMissions.push(midNum);
                var k = String(midNum);
                progress.stars[k] = Math.max(progress.stars[k] || 0, stars);
                if (typeof r.strokes === 'number') progress.totalStrokes += r.strokes;
                if (typeof r.rewinds === 'number') progress.rewindsUsed += r.rewinds;
                if (progress.currentMissionId === midNum || progress.currentMissionId === mid) {
                    progress.currentMissionId = null;
                }
                saveProgress(progress);
                var mirrored = false;
                try { mirrored = mirrorToShared(midNum, stars); } catch (_) { mirrored = false; }
                var codex = null;
                try {
                    if (typeof window !== 'undefined' && window.GraveGain4DCodex &&
                        typeof window.GraveGain4DCodex.unlockForMission === 'function') {
                        codex = window.GraveGain4DCodex.unlockForMission(midNum);
                    }
                } catch (_) { codex = null; }
                return {
                    mission: m,
                    stars: stars,
                    mirroredToShared: !!mirrored,
                    codexUnlocked: codex || [],
                    dialogueAfter: Array.isArray(m.dialogueAfter) ? m.dialogueAfter : [],
                    rewardGold: m.rewardGold || 0,
                    rewardUusd: m.rewardUusd || 0
                };
            } catch (_) {
                return null;
            }
        }
    };

    function gateCountFor(mission) {
        try {
            var list = mission.objectives || [];
            for (var i = 0; i < list.length; i++) {
                if (list[i] && list[i].id === 'gates_ana_kata') return Number(list[i].count) || 0;
            }
        } catch (_) { /* ignore */ }
        return 0;
    }

    function rewindBudgetFor(mission) {
        try {
            var list = mission.objectives || [];
            for (var i = 0; i < list.length; i++) {
                if (list[i] && list[i].id === 'rewind_limit') return Number(list[i].count) || 0;
            }
        } catch (_) { /* ignore */ }
        return 0;
    }

    try {
        if (typeof window !== 'undefined') {
            window.GraveGain4DDirector = Director;
            if (!window.GraveGain4DCampaign) window.GraveGain4DCampaign = Director;
        }
    } catch (_) { /* ignore */ }
})();
