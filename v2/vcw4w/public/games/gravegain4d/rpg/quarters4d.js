(function () {
    'use strict';

    // GraveGain4D crew quarters — 6 upgrade levels mirroring
    // gravegain3d/engine/game-data.js QuartersUpgrades EXACT numbers
    // (level, size, capacity/space, cost-to-REACH that level in $UUSD).
    // Capacity gates crop slots in crops4d.js (space + slot cap).
    // All state JSON-serializable under state.hub.quarters.

    const QuartersUpgrades = [
        { level: 1, size: '400x300 px', capacity: 100, cost: 250 },
        { level: 2, size: '600x400 px', capacity: 150, cost: 500 },
        { level: 3, size: '800x500 px', capacity: 200, cost: 900 },
        { level: 4, size: '1000x600 px', capacity: 250, cost: 1400 },
        { level: 5, size: '1200x700 px', capacity: 300, cost: 2000 },
        { level: 6, size: '1400x800 px', capacity: 350, cost: 2500 }
    ];

    const MAX_LEVEL = 6;

    // Crop plot slots scale with quarters level; planted seed space must
    // additionally fit inside the level's space capacity.
    function cropSlotsFor(level) {
        const lv = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level) || 1));
        return lv + 1; // L1=2 slots ... L6=7 slots
    }

    function getUpgrade(level) {
        const lv = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level) || 1));
        return QuartersUpgrades[lv - 1];
    }

    function capacityFor(level) {
        return getUpgrade(level).capacity;
    }

    // Cost to go from `level` to `level + 1` = target level's cost
    // (mirrors GG3D hub-quarters.js: next = QuartersUpgrades[level]).
    function costToNext(level) {
        const lv = Math.floor(level) || 1;
        if (lv >= MAX_LEVEL) return null; // MAX LEVEL REACHED
        return QuartersUpgrades[lv].cost;
    }

    function createQuarters() {
        return { level: 1 };
    }

    function serialize(slice) {
        const level = (slice && typeof slice.level === 'number')
            ? Math.max(1, Math.min(MAX_LEVEL, Math.floor(slice.level)))
            : 1;
        return { level };
    }

    function deserialize(data) {
        if (!data || typeof data !== 'object') return createQuarters();
        return serialize(data);
    }

    // wallet: { uusd } — mutated in place. Returns { ok, reason?, level?, cost? }.
    function buyUpgrade(quartersSlice, wallet) {
        if (!quartersSlice || typeof quartersSlice.level !== 'number') {
            return { ok: false, reason: 'bad-quarters-state' };
        }
        if (quartersSlice.level >= MAX_LEVEL) return { ok: false, reason: 'max-level' };
        const cost = costToNext(quartersSlice.level);
        const w = wallet || {};
        if ((Number(w.uusd) || 0) < cost) return { ok: false, reason: 'insufficient-uusd', cost };
        w.uusd -= cost;
        quartersSlice.level += 1;
        return { ok: true, level: quartersSlice.level, cost };
    }

    function describe(level) {
        const u = getUpgrade(level);
        const next = costToNext(level);
        return {
            level: u.level,
            size: u.size,
            capacity: u.capacity,
            slots: cropSlotsFor(level),
            nextCost: next
        };
    }

    window.GG4D_Quarters = {
        QuartersUpgrades: QuartersUpgrades.map((u) => ({ ...u })),
        MAX_LEVEL,
        cropSlotsFor,
        getUpgrade,
        capacityFor,
        costToNext,
        createQuarters,
        serialize,
        deserialize,
        buyUpgrade,
        describe
    };
})();
