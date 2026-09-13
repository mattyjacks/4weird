/* =========================================================================
 * GraveGain4D - DreamForge generative voxel dream mode
 * (window.GraveGain4DDream)
 * -------------------------------------------------------------------------
 * Oasis / Decart-style generative dungeon morph, fully offline (no fetch).
 * A seeded prompt table (canon mission themes: grove / vault / wastes plus
 * every 4D dungeon theme + wildcards) regenerates the dungeon morph around
 * the player every N seconds: cup W-drift, hazard reshape, tesseract spin.
 * Deterministic from seed: every dream code regenerates the same sequence,
 * so codes are shareable. A morph meter (0..1) fills between morphs and a
 * shimmer transition hooks the render (CSS class + dreamingDungeon call).
 * Toggle in settings (localStorage) + hub card. Vanilla JS, ASCII-only,
 * never throws, fail-open (all game writes guarded).
 * ========================================================================= */
(function () {
    'use strict';
    if (typeof window === 'undefined') return;
    if (window.GraveGain4DDream && window.GraveGain4DDream.VERSION) return;

    var VERSION = '4d-dream-1';
    var STORE_KEY = 'gg4d-dream-enabled-v1';
    var DEFAULT_INTERVAL_S = 20;
    var MIN_INTERVAL_S = 5;
    var MAX_INTERVAL_S = 120;

    // Seeded prompt table. Canon first: grove / vault / wastes mission
    // themes, then every GraveGain4DWorlds.THEMES dungeon theme, then
    // wildcards that roll back into canon deterministically.
    var PROMPTS = [
        { id: 'elven_grove', label: 'Elven Grove Reverie', wild: false },
        { id: 'dwarven_vault', label: 'Dwarven Vault Delve', wild: false },
        { id: 'orc_wastes', label: 'Orc Waste Crossing', wild: false },
        { id: 'stone_crypt', label: 'Crypt Mouth Echo', wild: false },
        { id: 'metallic_ship', label: 'Hull Breach Drift', wild: false },
        { id: 'toxic_catacombs', label: 'Venom Deep Bloom', wild: false },
        { id: 'citadel_darkness', label: 'Dark Antechamber Veil', wild: false },
        { id: 'wild-bloom', label: 'Wild Bloom (grove-leaning)', wild: true, lean: 'elven_grove' },
        { id: 'wild-iron', label: 'Wild Iron (vault-leaning)', wild: true, lean: 'dwarven_vault' },
        { id: 'wild-ash', label: 'Wild Ash (waste-leaning)', wild: true, lean: 'orc_wastes' },
        { id: 'wild-void', label: 'Wild Void (any canon)', wild: true, lean: null }
    ];

    var state = {
        enabled: false,
        code: null,
        seed: 0,
        promptIndex: 0,
        step: 0,
        meter: 0,
        intervalS: DEFAULT_INTERVAL_S,
        timer: null,
        lastMorphAt: 0,
        morphs: [],   // history of applied morphs (capped)
        listeners: [] // onMorph callbacks
    };

    // ------------------------- pure helpers (node-testable) ----------------
    function hashSeed(seed) {
        if (typeof seed === 'number' && isFinite(seed)) return seed >>> 0;
        var s = String(seed === undefined || seed === null ? 'gravegain4d' : seed);
        var h = 2166136261;
        for (var i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    function mulberry32(a) {
        var t = a >>> 0;
        return function () {
            t = (t + 0x6D2B79F5) >>> 0;
            var z = t;
            z = Math.imul(z ^ (z >>> 15), z | 1);
            z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
            return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
        };
    }

    function capStr(v, n) {
        try { return String(v).slice(0, n || 32); }
        catch (_) { return ''; }
    }

    // Dream code: "<seed36>-<promptIdx36>-<step>" e.g. "k3j9-2-14".
    // Shareable: decode restores the exact deterministic stream position.
    function encodeCode(seedNum, promptIndex, step) {
        try {
            var s = (seedNum >>> 0).toString(36);
            var p = (Math.max(0, promptIndex | 0) % PROMPTS.length).toString(36);
            var t = Math.max(0, step | 0).toString(36);
            return s + '-' + p + '-' + t;
        } catch (_) { return '0-0-0'; }
    }

    function decodeCode(code) {
        try {
            var parts = String(code || '').toLowerCase().split('-');
            if (parts.length < 2) return null;
            var seed = parseInt(parts[0], 36);
            var pidx = parseInt(parts[1], 36);
            var step = parts.length > 2 ? parseInt(parts[2], 36) : 0;
            if (!isFinite(seed)) return null;
            if (!isFinite(pidx)) pidx = 0;
            if (!isFinite(step)) step = 0;
            return {
                seed: seed >>> 0,
                promptIndex: ((pidx % PROMPTS.length) + PROMPTS.length) % PROMPTS.length,
                step: Math.max(0, step)
            };
        } catch (_) { return null; }
    }

    function promptAt(index) {
        try {
            var i = ((Math.floor(index) % PROMPTS.length) + PROMPTS.length) % PROMPTS.length;
            return PROMPTS[i];
        } catch (_) { return PROMPTS[0]; }
    }

    // Deterministic morph for (seed, step): prompt cycles the table,
    // wildcards resolve their lean deterministically. No Math.random.
    function morphFor(seedNum, step) {
        try {
            var rand = mulberry32((seedNum >>> 0) ^ Math.imul((step | 0) + 1, 2654435761));
            var pidx = Math.floor(rand() * PROMPTS.length) % PROMPTS.length;
            var prompt = promptAt(pidx);
            var theme = prompt.id;
            if (prompt.wild) {
                if (prompt.lean) {
                    theme = prompt.lean;
                } else {
                    var canon = [PROMPTS[0], PROMPTS[1], PROMPTS[2], PROMPTS[3],
                        PROMPTS[4], PROMPTS[5], PROMPTS[6]];
                    theme = canon[Math.floor(rand() * canon.length) % canon.length].id;
                }
            }
            return {
                step: step | 0,
                prompt: prompt.id,
                promptLabel: prompt.label,
                theme: theme,
                wShift: +(rand() * 16 - 8).toFixed(2),
                hazardGrow: +(0.9 + rand() * 0.35).toFixed(3),
                spin: {
                    xw: +((rand() * 0.7 - 0.35).toFixed(3)),
                    yw: +((rand() * 0.7 - 0.35).toFixed(3)),
                    zw: +((rand() * 0.7 - 0.35).toFixed(3))
                },
                shimmerMs: 600 + Math.floor(rand() * 900)
            };
        } catch (_) { return null; }
    }

    // ------------------------- game hooks (fail-open) ----------------------
    function applyMorph(morph) {
        if (!morph) return false;
        var applied = false;
        try {
            var W = window.GraveGain4DWorlds || null;
            if (W && typeof W.dreamingDungeon === 'function') {
                // Route through the canon dreaming-dungeon reshaper: the
                // morph's W-shift becomes overshootW, hazard growth maps to
                // over/under-par pressure. Guarded; null return is fine.
                var strokesHint = morph.hazardGrow > 1.05 ? 1 : (morph.hazardGrow < 0.95 ? -1 : 0);
                var r = W.dreamingDungeon([{
                    hole: currentHole(),
                    strokes: strokesHint,
                    overshootW: -morph.wShift,
                    avgDrift: morph.wShift / 2
                }]);
                applied = !!r;
            }
        } catch (_) { applied = false; }
        try {
            // Theme nudge: inform the live game (read by renderer if present).
            var G = window.GraveGain4DGame || null;
            if (G && typeof G === 'object') {
                try { G.dreamTheme = morph.theme; } catch (_) { /* noop */ }
                try { G.dreamSpin = morph.spin; } catch (_) { /* noop */ }
            }
        } catch (_) { /* noop */ }
        try { shimmer(morph); } catch (_) { /* CSS hook is best-effort */ }
        try {
            state.morphs.push({ at: Date.now(), morph: morph });
            while (state.morphs.length > 24) state.morphs.shift();
        } catch (_) { /* noop */ }
        try {
            for (var i = 0; i < state.listeners.length; i++) {
                try { state.listeners[i](morph); } catch (_) { /* one bad listener must not break others */ }
            }
        } catch (_) { /* noop */ }
        return true;
    }

    function currentHole() {
        try {
            var G = window.GraveGain4DGame || null;
            var st = null;
            if (G && typeof G.getState === 'function') st = G.getState();
            else if (G && G.state) st = G.state;
            if (st && isFinite(Number(st.hole))) return Math.floor(Number(st.hole));
        } catch (_) { /* noop */ }
        return 1;
    }

    // Shimmer transition: brief CSS class on the game root + meter reset.
    function shimmer(morph) {
        try {
            state.meter = 0;
            state.lastMorphAt = Date.now();
            if (typeof document === 'undefined') return;
            var root = document.getElementById('gg4d-root') ||
                document.getElementById('gg4d-game') ||
                document.body;
            if (!root || !root.classList) return;
            root.classList.add('gg4d-dream-shimmer');
            var ms = (morph && morph.shimmerMs) || 900;
            if (ms < 100) ms = 100; if (ms > 3000) ms = 3000;
            setTimeout(function () {
                try { root.classList.remove('gg4d-dream-shimmer'); } catch (_) { /* noop */ }
            }, ms);
        } catch (_) { /* noop */ }
    }

    function loopTick() {
        try {
            if (!state.enabled) return;
            var spanMs = state.intervalS * 1000;
            var elapsed = Date.now() - (state.lastMorphAt || Date.now());
            state.meter = Math.max(0, Math.min(1, elapsed / spanMs));
            if (elapsed >= spanMs) {
                var m = morphFor(state.seed, state.step);
                state.step += 1;
                state.code = encodeCode(state.seed, state.promptIndex, state.step);
                if (m) applyMorph(m);
                state.lastMorphAt = Date.now();
                state.meter = 0;
            }
        } catch (_) { /* fail-open */ }
    }

    function ensureTimer() {
        if (state.timer) return;
        try { state.timer = setInterval(loopTick, 250); }
        catch (_) { state.timer = null; }
    }

    function stopTimer() {
        try { if (state.timer) clearInterval(state.timer); } catch (_) { /* noop */ }
        state.timer = null;
    }

    // ------------------------- public API ----------------------------------
    var api = {
        VERSION: VERSION,
        PROMPTS: PROMPTS.map(function (p) { return { id: p.id, label: p.label, wild: !!p.wild }; }),
        DEFAULT_INTERVAL_S: DEFAULT_INTERVAL_S,

        enable: function (code, intervalS) {
            try {
                var seed = (Date.now() ^ (Math.floor(Math.random() * 0xffffffff) >>> 0)) >>> 0;
                var pidx = 0, step = 0;
                if (code) {
                    var d = decodeCode(code);
                    if (d) { seed = d.seed; pidx = d.promptIndex; step = d.step; }
                    else { seed = hashSeed(code); }
                }
                state.seed = seed >>> 0;
                state.promptIndex = pidx;
                state.step = step;
                state.code = encodeCode(state.seed, state.promptIndex, state.step);
                var iv = Number(intervalS);
                state.intervalS = (isFinite(iv))
                    ? Math.max(MIN_INTERVAL_S, Math.min(MAX_INTERVAL_S, Math.floor(iv)))
                    : DEFAULT_INTERVAL_S;
                state.enabled = true;
                state.meter = 0;
                state.lastMorphAt = Date.now();
                ensureTimer();
                try {
                    if (typeof localStorage !== 'undefined') {
                        localStorage.setItem(STORE_KEY, '1');
                    }
                } catch (_) { /* private mode: ignore */ }
                return state.code;
            } catch (_) { return null; }
        },

        disable: function () {
            try {
                state.enabled = false;
                stopTimer();
                try {
                    if (typeof localStorage !== 'undefined') {
                        localStorage.setItem(STORE_KEY, '0');
                    }
                } catch (_) { /* ignore */ }
                return true;
            } catch (_) { return false; }
        },

        toggle: function () {
            try { return state.enabled ? (api.disable(), false) : (api.enable(state.code), true); }
            catch (_) { return false; }
        },

        isEnabled: function () { return !!state.enabled; },

        restoreSettings: function () {
            // Called at boot: re-enable only if the player left it on.
            try {
                if (typeof localStorage === 'undefined') return false;
                if (localStorage.getItem(STORE_KEY) === '1') {
                    api.enable(state.code);
                    return true;
                }
                return false;
            } catch (_) { return false; }
        },

        // Deterministic preview: morph at step offset without advancing.
        peek: function (stepsAhead) {
            try {
                var a = Math.max(0, Math.floor(Number(stepsAhead) || 0));
                return morphFor(state.seed, state.step + a);
            } catch (_) { return null; }
        },

        // Force one morph now (meter reset + shimmer), deterministic.
        morphNow: function () {
            try {
                var m = morphFor(state.seed, state.step);
                state.step += 1;
                state.code = encodeCode(state.seed, state.promptIndex, state.step);
                if (m) applyMorph(m);
                state.lastMorphAt = Date.now();
                state.meter = 0;
                return m;
            } catch (_) { return null; }
        },

        meter: function () {
            try { return Math.max(0, Math.min(1, Number(state.meter) || 0)); }
            catch (_) { return 0; }
        },

        dreamCode: function () { return state.code; },
        step: function () { return state.step | 0; },

        onMorph: function (fn) {
            try {
                if (typeof fn === 'function') { state.listeners.push(fn); return true; }
                return false;
            } catch (_) { return false; }
        },

        // Hub card descriptor (hub renders it; toggle wired via toggle()).
        hubCard: function () {
            return {
                id: 'dreamforge', title: 'DreamForge',
                blurb: 'Generative voxel dreams: the dungeon re-dreams itself around you.',
                enabled: !!state.enabled, code: state.code,
                action: 'toggle'
            };
        },

        _pure: {
            hashSeed: hashSeed,
            encodeCode: encodeCode,
            decodeCode: decodeCode,
            morphFor: morphFor,
            promptAt: promptAt
        }
    };

    window.GraveGain4DDream = api;
    // Boot-restore: honor the settings toggle without starting a morph storm.
    try { api.restoreSettings(); } catch (_) { /* fail-open */ }
})();
