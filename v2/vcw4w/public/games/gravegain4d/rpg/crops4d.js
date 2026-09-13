(function () {
    'use strict';

    // GraveGain4D botany-deck crops — offline timers harvested on hub return.
    // First four entries mirror gravegain3d/engine/game-data.js BotanySeeds
    // EXACT numbers (id, space, timeSec, yield, value in gold/unit, emoji);
    // the last two are rift-touched 4D strains (new).
    // All state JSON-serializable under state.hub.crops.

    const BotanySeeds = [
        { id: 'cannabis', name: 'Cannabis Sativa', space: 15, time: 60, yield: 3, value: 60, emoji: '🌿', riftTouched: false },
        { id: 'mushroom', name: 'Magic Mushroom', space: 8, time: 45, yield: 2, value: 85, emoji: '🍄', riftTouched: false },
        { id: 'bloodrose', name: 'Blood Rose', space: 10, time: 30, yield: 1, value: 140, emoji: '🌹', riftTouched: false },
        { id: 'sparkite', name: 'Sparkite Spore', space: 12, time: 90, yield: 4, value: 110, emoji: '⚡', riftTouched: false },
        { id: 'voidbloom', name: 'Voidbloom (Rift-Touched)', space: 14, time: 120, yield: 5, value: 220, emoji: '🌀', riftTouched: true },
        { id: 'chronomoss', name: 'Chronomoss (Rift-Touched)', space: 6, time: 150, yield: 2, value: 320, emoji: '⏳', riftTouched: true }
    ];

    function getSeed(id) {
        return BotanySeeds.find((s) => s.id === id) || null;
    }

    function nowMs(now) {
        return typeof now === 'number' && isFinite(now) ? now : Date.now();
    }

    function createCrops() {
        // plots: [{ seedId, plantedAt (epoch ms) }]
        return { plots: [] };
    }

    function serialize(slice) {
        const plots = [];
        if (slice && Array.isArray(slice.plots)) {
            for (const p of slice.plots) {
                if (!p || typeof p !== 'object') continue;
                const seed = getSeed(p.seedId);
                if (!seed) continue;
                const plantedAt = Number(p.plantedAt);
                if (!isFinite(plantedAt)) continue;
                plots.push({ seedId: seed.id, plantedAt });
                if (plots.length >= 32) break;
            }
        }
        return { plots };
    }

    function deserialize(data) {
        if (!data || typeof data !== 'object') return createCrops();
        return serialize(data);
    }

    function capacityInfo(quartersLevel) {
        // Capacity gates crop slots: prefer GG4D_Quarters when loaded,
        // otherwise fall back to the mirrored GG3D table.
        try {
            const Q = window.GG4D_Quarters;
            if (Q && typeof Q.capacityFor === 'function' && typeof Q.cropSlotsFor === 'function') {
                return { space: Q.capacityFor(quartersLevel), slots: Q.cropSlotsFor(quartersLevel) };
            }
        } catch (e) { /* fall through to mirror table */ }
        const caps = [100, 150, 200, 250, 300, 350];
        const lv = Math.max(1, Math.min(6, Math.floor(quartersLevel) || 1));
        return { space: caps[lv - 1], slots: lv + 1 };
    }

    function usedSpace(cropsSlice) {
        let used = 0;
        const plots = (cropsSlice && cropsSlice.plots) || [];
        for (const p of plots) {
            const seed = p && getSeed(p.seedId);
            if (seed) used += seed.space;
        }
        return used;
    }

    // Returns { ok, reason?, ... } without mutating on failure.
    function canPlant(cropsSlice, seedId, quartersLevel) {
        const seed = getSeed(seedId);
        if (!seed) return { ok: false, reason: 'unknown-seed' };
        const plots = (cropsSlice && cropsSlice.plots) || [];
        const cap = capacityInfo(quartersLevel);
        if (plots.length >= cap.slots) return { ok: false, reason: 'no-slots', slots: cap.slots };
        if (usedSpace(cropsSlice) + seed.space > cap.space) {
            return { ok: false, reason: 'no-space', space: cap.space, used: usedSpace(cropsSlice) };
        }
        return { ok: true, slots: cap.slots, space: cap.space };
    }

    // Plants a seed now. Returns { ok, reason?, plot? }.
    function plant(cropsSlice, seedId, quartersLevel, now) {
        const check = canPlant(cropsSlice, seedId, quartersLevel);
        if (!check.ok) return check;
        const plot = { seedId, plantedAt: nowMs(now) };
        cropsSlice.plots.push(plot);
        return { ok: true, plot, slots: check.slots, space: check.space };
    }

    // Elapsed-time growth for one plot: { elapsedSec, neededSec, ready, progress }.
    function growthFor(plot, now) {
        const seed = plot && getSeed(plot.seedId);
        if (!seed) return { elapsedSec: 0, neededSec: 0, ready: false, progress: 0 };
        const elapsedSec = Math.max(0, (nowMs(now) - Number(plot.plantedAt || 0)) / 1000);
        const ready = elapsedSec >= seed.time;
        return {
            elapsedSec: Math.floor(elapsedSec),
            neededSec: seed.time,
            ready,
            progress: Math.max(0, Math.min(1, elapsedSec / seed.time))
        };
    }

    function readyPlots(cropsSlice, now) {
        const out = [];
        const plots = (cropsSlice && cropsSlice.plots) || [];
        for (let i = 0; i < plots.length; i += 1) {
            if (growthFor(plots[i], now).ready) out.push(i);
        }
        return out;
    }

    // Harvest one ready plot -> gold (yield * value). Mutates cropsSlice.
    // bank: { gold } mutated in place when provided.
    function harvestPlot(cropsSlice, index, bank, now) {
        const plots = (cropsSlice && cropsSlice.plots) || [];
        const plot = plots[index];
        if (!plot) return { ok: false, reason: 'no-plot' };
        const g = growthFor(plot, now);
        if (!g.ready) return { ok: false, reason: 'not-ready', elapsedSec: g.elapsedSec, neededSec: g.neededSec };
        const seed = getSeed(plot.seedId);
        const gold = seed.yield * seed.value;
        plots.splice(index, 1);
        if (bank && typeof bank === 'object') bank.gold = (Number(bank.gold) || 0) + gold;
        return { ok: true, seedId: seed.id, gold };
    }

    // Harvest every ready plot (hub-return sweep). Mutates cropsSlice + bank.
    function harvestAll(cropsSlice, bank, now) {
        const ready = readyPlots(cropsSlice, now).sort((a, b) => b - a);
        let totalGold = 0;
        const harvested = [];
        for (const idx of ready) {
            const r = harvestPlot(cropsSlice, idx, bank, now);
            if (r.ok) {
                totalGold += r.gold;
                harvested.push(r.seedId);
            }
        }
        return { ok: true, count: harvested.length, gold: totalGold, seeds: harvested };
    }

    window.GG4D_Crops = {
        BotanySeeds: BotanySeeds.map((s) => ({ ...s })),
        getSeed,
        createCrops,
        serialize,
        deserialize,
        capacityInfo,
        usedSpace,
        canPlant,
        plant,
        growthFor,
        readyPlots,
        harvestPlot,
        harvestAll
    };
})();
