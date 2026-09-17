(function () {
    'use strict';

    // GraveGain4D progression — XP curve, level-up stat points, save shape.
    // GG3D game-data.js carries no XP thresholds, so the fallback curve
    // xpForLevel(level) = floor(100 * level ^ 1.6) is used (level = target
    // level, i.e. XP needed to go from level-1 to level; total level 1 = 0).

    const MAX_LEVEL = 30;
    const STAT_POINTS_PER_LEVEL = 3;

    function xpForLevel(level) {
        if (level <= 1) return 0;
        return Math.floor(100 * Math.pow(level, 1.6));
    }

    // Cumulative XP required to REACH each level (index = level).
    const XpThresholds = [0];
    for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
        XpThresholds[lvl] = lvl === 1 ? 0 : XpThresholds[lvl - 1] + xpForLevel(lvl);
    }

    function levelForXp(xp) {
        let level = 1;
        for (let lvl = 2; lvl <= MAX_LEVEL; lvl++) {
            if (xp >= XpThresholds[lvl]) level = lvl;
            else break;
        }
        return level;
    }

    // Level-ups grant stat points the player distributes freely.
    const StatPool = ['might', 'focus', 'vigor', 'drift'];

    function statGainsForLevel(level) {
        return { points: STAT_POINTS_PER_LEVEL, pool: StatPool.slice() };
    }

    function createStats() {
        return { might: 0, focus: 0, vigor: 0, drift: 0, unspent: 0 };
    }

    function applyLevelUps(state, newXp) {
        state.xp = newXp;
        const newLevel = levelForXp(newXp);
        if (newLevel > state.level) {
            const gained = (newLevel - state.level) * STAT_POINTS_PER_LEVEL;
            state.level = newLevel;
            state.stats.unspent += gained;
        }
        return state;
    }

    function createProgression() {
        return { level: 1, xp: 0, stats: createStats() };
    }

    // JSON save shape (versioned for forward-compat).
    function serialize(state) {
        return {
            version: 1,
            level: state.level,
            xp: state.xp,
            stats: { ...state.stats }
        };
    }

    function deserialize(data) {
        const p = createProgression();
        if (!data || typeof data !== 'object') return p;
        if (typeof data.level === 'number') p.level = Math.max(1, Math.min(MAX_LEVEL, data.level));
        if (typeof data.xp === 'number') p.xp = Math.max(0, data.xp);
        if (data.stats && typeof data.stats === 'object') {
            for (const key of ['might', 'focus', 'vigor', 'drift', 'unspent']) {
                if (typeof data.stats[key] === 'number') p.stats[key] = Math.max(0, data.stats[key]);
            }
        }
        return p;
    }

    window.GG4D_Progression = {
        MAX_LEVEL,
        STAT_POINTS_PER_LEVEL,
        StatPool,
        XpThresholds,
        xpForLevel,
        levelForXp,
        statGainsForLevel,
        createStats,
        createProgression,
        applyLevelUps,
        serialize,
        deserialize
    };
})();
