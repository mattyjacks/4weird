/* gravegain5d-universes.js — GraveGain5D multiverse lane (v0.1.0-scaffold).
 *
 * The "crazier than 4D" layer: universe definitions + hop validation +
 * paradox pricing, shared by reference with the gravegain5d bundle.
 * 4D had flat-cost world-hops (V) on Prime/Echo/Dream; 5D adds Void, Bloom,
 * Static plus chain scaling, collapse fuses, and per-universe physics.
 *
 * Vanilla IIFE, idempotent, never throws. Reads live state from
 * window.GraveGain5D only; never writes game state.
 */
(function () {
    'use strict';
    if (typeof window === 'undefined') return;
    var FLAG = 'GraveGain5DUniverses';
    if (window.GraveGain5DUniverses && window.GraveGain5DUniverses.VERSION) return;
    if (window[FLAG] && window[FLAG].VERSION) return;
    var VERSION = '0.1.0-scaffold';

    var UNIVERSES = [
        { id: 'prime', name: 'Prime Array', emoji: '🌌', gravity: 1.0, drift: 0.0, parDelta: 0, collapseTicks: 0 },
        { id: 'echo', name: 'Echo Expanse', emoji: '🪞', gravity: 0.9, drift: 0.1, parDelta: 0, collapseTicks: 0 },
        { id: 'dream', name: 'Dream Shallows', emoji: '💭', gravity: 1.1, drift: -0.1, parDelta: 1, collapseTicks: 0 },
        { id: 'void', name: 'Void Maw', emoji: '🕳️', gravity: 1.4, drift: 0.3, parDelta: -1, collapseTicks: 12 },
        { id: 'bloom', name: 'Bloom Lattice', emoji: '🌸', gravity: 0.7, drift: -0.2, parDelta: 1, collapseTicks: 0 },
        { id: 'static', name: 'Static Storm', emoji: '📺', gravity: 1.2, drift: 0.0, parDelta: 0, collapseTicks: 8 }
    ];

    function byId(id) {
        for (var i = 0; i < UNIVERSES.length; i++) {
            if (UNIVERSES[i].id === id) return UNIVERSES[i];
        }
        return UNIVERSES[0];
    }

    function hopCost(chain, free) {
        if (free) return 0;
        var c = typeof chain === 'number' && isFinite(chain) ? chain : 0;
        return 8 + Math.max(0, c) * 6;
    }

    function canHop(state) {
        try {
            if (!state || state.over) return { ok: false, reason: 'run-over' };
            return { ok: true, cost: hopCost(state.chain, state.cls === 'drifter') };
        } catch (_) { return { ok: false, reason: 'error' }; }
    }

    function describe(id) {
        var u = byId(id);
        return u.emoji + ' ' + u.name + ' (g' + u.gravity + ', drift ' + u.drift + ', par ' + (u.parDelta >= 0 ? '+' : '') + u.parDelta + ')';
    }

    var api = {
        VERSION: VERSION,
        UNIVERSES: UNIVERSES,
        byId: byId,
        hopCost: hopCost,
        canHop: canHop,
        describe: describe
    };

    try { window.GraveGain5DUniverses = api; } catch (_) {}
    try { window[FLAG] = api; } catch (_) {}
    try {
        window.GraveGainMods = window.GraveGainMods || [];
        window.GraveGainMods.push({ name: 'gravegain5d-universes', version: VERSION, init: function () { return true; } });
    } catch (_) {}
})();
