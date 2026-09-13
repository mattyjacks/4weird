/* gravegain5d-universes.js - GraveGain5D multiverse lane (v0.2.0).
 *
 * The "crazier than 4D" layer: universe definitions + hop validation +
 * paradox pricing, shared by reference with the gravegain5d bundle.
 * 4D had flat-cost world-hops (V) on Prime/Echo/Dream; 5D adds Void, Bloom,
 * Static plus chain scaling, collapse fuses, and per-universe physics.
 *
 * v0.2.0 adds canon blurbs (Angel Good charter, Mirathiel ghosts, Aelindra
 * gardens, Hades hunger, Bloom festival, Static noise) + threat ratings +
 * combat-drift notes. Exports stay byte-compatible.
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
    var VERSION = '0.2.0';

    var UNIVERSES = [
        { id: 'prime', name: 'Prime Array', emoji: '🌌', gravity: 1.0, drift: 0.0, parDelta: 0, collapseTicks: 0, threat: 'Low', blurb: 'Charter water of the Array, held by President Angel Good. Lanterns burn steady here: straight putts, honest bounces, no collapse clock.', combat: 'No combat drift. Hold the line and play clean; textbook greens for steady openers.' },
        { id: 'echo', name: 'Echo Expanse', emoji: '🪞', gravity: 0.9, drift: 0.1, parDelta: 0, collapseTicks: 0, threat: 'Moderate', blurb: 'Haunted replay water where the ghosts of Mirathiel linger. Every shot leaves an echo that putts twice; the dead watch your form.', combat: 'Light drift (+0.1) tugs shots wide. Aim inside the ghost line and strike clean.' },
        { id: 'dream', name: 'Dream Shallows', emoji: '💭', gravity: 1.1, drift: -0.1, parDelta: 1, collapseTicks: 0, threat: 'Low', blurb: 'Sleepy garden water of Aelindra, all soft greens and slow hazards. Generous par and a floaty ball; drowsy traps punish rushers.', combat: 'Gentle counter-drift (-0.1) steadies long putts. Patient lines are rewarded; rushed shots doze off.' },
        { id: 'void', name: 'Void Maw', emoji: '🕳️', gravity: 1.4, drift: 0.3, parDelta: -1, collapseTicks: 12, threat: 'Extreme', blurb: 'Hungry dark where Hades files his spares. Heavy ball and hard drift, with a collapse fuse that runs fast when paradox burns hot.', combat: 'Heavy gravity (1.4) plus hard drift (+0.3). Vent paradox early and hop out before the collapse fuse blows.' },
        { id: 'bloom', name: 'Bloom Lattice', emoji: '🌸', gravity: 0.7, drift: -0.2, parDelta: 1, collapseTicks: 0, threat: 'Low', blurb: 'Festival water where the lattice celebrates every chain. Floaty, forgiving greens; chained hops bloom into combo bonuses.', combat: 'Light ball (0.7) with kind counter-drift (-0.2). Chain hops here to bloom combos, then bank the lead.' },
        { id: 'static', name: 'Static Storm', emoji: '📺', gravity: 1.2, drift: 0.0, parDelta: 0, collapseTicks: 8, threat: 'High', blurb: 'Screaming noise storm that eats compasses and aim. Scrambled reads and jitter greens, with a collapse fuse ticking underneath.', combat: 'No steady drift but aim scrambles every read. Putt fast, commit early, and hop out before it collapses.' }
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
