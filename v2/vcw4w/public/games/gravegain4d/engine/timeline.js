(function (global) {
    'use strict';
    // GraveGain4DTimeline — 4D time travel (THE feature over GraveGain3D).
    // Canon 2026-09-13: GraveGain4D is time-travel-only. Alternate worlds
    // moved to GraveGain5D. Reverse time at ANY point (T / rewind edge):
    // manual reverses cost mana+stamina (see GraveGain4DPlayer.REWIND_COST),
    // death auto-reverses and taxes maxHp+mana+stamina instead of game over.
    // Branch store: { branches: [{ id, label, events }], active }.
    // Idempotent IIFE, zero deps, fail-open (never throws).
    var nextId = 1;
    function clone(state) {
        try {
            if (state === undefined) return null;
            return JSON.parse(JSON.stringify(state));
        } catch (_) {
            try {
                if (state && typeof state === 'object') {
                    var out = {};
                    for (var k in state) { try { out[k] = state[k]; } catch (_) { /* skip */ } }
                    return out;
                }
                return state;
            } catch (_) { return null; }
        }
    }
    function makeBranch(label) {
        var n = nextId++;
        return { id: 'branch-' + n, label: String(label || ('line-' + n)), events: [] };
    }
    var store = { branches: [], active: null };
    try {
        var root = makeBranch('main');
        store.branches.push(root);
        store.active = root.id;
    } catch (_) { /* fail-open */ }
    function findBranch(id) {
        try {
            for (var i = 0; i < store.branches.length; i++) {
                if (store.branches[i] && store.branches[i].id === id) return store.branches[i];
            }
        } catch (_) { /* ignore */ }
        return null;
    }
    function activeBranch() {
        var b = findBranch(store.active);
        if (!b && store.branches.length) { b = store.branches[0]; store.active = b.id; }
        return b;
    }
    // Cost model mirror (authoritative values live on GraveGain4DPlayer).
    var REWIND_COST = {
        manual: { mana: 15, stamina: 10 },
        death: { maxHpLoss: 10, manaDrainFrac: 0.5, staminaDrainFrac: 0.5, reviveHpFrac: 0.5 }
    };
    var api = {
        VERSION: '1.1.0',
        REWIND_COST: REWIND_COST,
        store: store,
        snapshot: function (state) {
            try {
                var b = activeBranch();
                if (!b) return null;
                var ev = { t: Date.now(), state: clone(state) };
                b.events.push(ev);
                if (b.events.length > 200) b.events.splice(0, b.events.length - 200);
                return ev;
            } catch (_) { return null; }
        },
        rewind: function (n) {
            try {
                var b = activeBranch();
                if (!b) return null;
                var count = Math.floor(Number(n));
                if (!isFinite(count) || count < 1) count = 1;
                while (count > 0 && b.events.length > 0) { b.events.pop(); count--; }
                if (!b.events.length) return null;
                return clone(b.events[b.events.length - 1].state);
            } catch (_) { return null; }
        },
        fork: function (label) {
            try {
                var src = activeBranch();
                if (!src) return null;
                var nb = makeBranch(label || ('fork-' + (store.branches.length + 1)));
                try { nb.events = JSON.parse(JSON.stringify(src.events || [])); }
                catch (_) { nb.events = (src.events || []).slice(); }
                store.branches.push(nb);
                store.active = nb.id;
                return nb;
            } catch (_) { return null; }
        },
        switchTo: function (id) {
            try {
                var b = findBranch(id);
                if (!b) return false;
                store.active = b.id;
                return true;
            } catch (_) { return false; }
        },
        // reverseTime: anytime reverse alias for rewind (T at any point).
        // Same semantics: pops n frames, returns the restored state.
        reverseTime: function (n) {
            try { return api.rewind(n == null ? 1 : n); }
            catch (_) { return null; }
        },
        // deathReverse: called when the player dies. Rewinds time instead
        // of ending the run; the resource cost itself is applied by
        // GraveGain4DPlayer.applyDeathRewind (maxHp+mana+stamina). This
        // only restores the timeline frame. Never throws.
        deathReverse: function () {
            try {
                var st = api.rewind(1);
                if (st) return { rewound: true, state: st };
                return { rewound: false, state: null };
            } catch (_) { return { rewound: false, state: null }; }
        },
        current: function () {
            try {
                var b = activeBranch();
                if (!b || !b.events.length) return null;
                return clone(b.events[b.events.length - 1].state);
            } catch (_) { return null; }
        },
        serialize: function () {
            try { return JSON.stringify(store); }
            catch (_) { return '{"branches":[],"active":null}'; }
        },
        restore: function (json) {
            try {
                var raw = (typeof json === 'string') ? JSON.parse(json) : json;
                if (!raw || !Array.isArray(raw.branches)) return false;
                store.branches = raw.branches;
                store.active = (typeof raw.active === 'string') ? raw.active : (store.branches[0] ? store.branches[0].id : null);
                return true;
            } catch (_) { return false; }
        },
        reset: function () {
            try {
                store.branches = [];
                var root = makeBranch('main');
                store.branches.push(root);
                store.active = root.id;
                return true;
            } catch (_) { return false; }
        }
    };
    try {
        if (global) {
            if (!global.GraveGain4DTimeline) global.GraveGain4DTimeline = api;
        }
    } catch (_) { /* fail-open */ }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
