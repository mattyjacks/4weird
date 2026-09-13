/* GraveGain thread/GPU tuner (G3, v2-native, parity-safe).
 *
 * Lives OUTSIDE the parity-locked bundles:
 *   public/games/html/gravegain-thread-tuner.js
 * Loaded early (before game boot) for gravegain1d + gravegain2d + gravegain3d.
 * NEVER edits engine files (performance-manager.js, graphics-worker.js,
 * graphics-settings.js, gravegain-workers.js) — runtime patches only, all
 * guarded with try/catch + typeof checks so the games never break without it.
 *
 * What it does (main thread owns draw/input/audio only):
 *   1. Frame-time governor: rAF delta EMA (alpha 0.08). EMA > 20ms for a full
 *      60-frame window -> step quality down (pixel ratio + particle caps);
 *      EMA < 12ms for two consecutive windows -> step quality up. Broadcasts
 *      `gravegain-tuner` CustomEvent so overlays (voxel / 2.5D / perf) can shed
 *      without being hard-wired here. Cooperates with gravegain-perf.js and
 *      engine PerformanceManager (pixel-ratio writes are min-wins, never up).
 *   2. Worker-pool sizing: recommended pool size from
 *      navigator.hardwareConcurrency (clamped 2..8, leaves one core for the
 *      main thread); hints window.FourWeirdWorkers when it exposes sizing.
 *   3. Chunked AI scheduling hook: scheduleAI(list, fn, chunkSize) slices
 *      heavy per-tick work across idle callbacks / setTimeout(0) so no tick
 *      blocks > ~8ms. Chunk size auto-derives from the EMA.
 *   4. Texture downscale hint: publishes textureScale per quality level via
 *      dataset flag + event + game.tunerTextureScale (overlays honor it).
 *   5. Instanced-render batching flag for THREE scenes: sets
 *      tunerInstancing on the 3D game object + event so scene layers can
 *      prefer InstancedMesh batching on potato/balanced.
 *
 * Exposes window.GraveGainThreadTuner = { VERSION, getStats, setQuality,
 * scheduleAI, chunkedForEach, recommendedPoolSize }. Pushes
 * { name, version, init } to window.GraveGainMods for wiring/QA detection.
 *
 * Vanilla IIFE, idempotent (`if (window.GraveGainThreadTuner) return`),
 * guarded, never throws, creates no DOM, adds no input/pointer-lock listeners.
 */
(function () {
    'use strict';
    if (window.GraveGainThreadTuner) return;

    var VERSION = '1.0.0';
    var ORDER = ['potato', 'balanced', 'high', 'ultra'];
    var DOWN_MS = 20;      // EMA above this for a full window -> step down
    var UP_MS = 12;        // EMA below this for two windows -> step up
    var WINDOW_FRAMES = 60;
    var EMA_ALPHA = 0.08;
    var SLICE_BUDGET_MS = 8;

    // Per-level budgets. particleCap multiplies spawn counts (combined with
    // any engine/graphics-plus budgetScale already applied — multiplicative,
    // never replaces). pixelRatioCap is a ceiling: we only ever lower the
    // live renderer ratio, never raise it (min-wins with engine manager).
    var BUDGETS = {
        potato:   { pixelRatioCap: 0.5,  particleCap: 0.25, textureScale: 0.5,  instancing: true },
        balanced: { pixelRatioCap: 0.85, particleCap: 0.6,  textureScale: 0.75, instancing: true },
        high:     { pixelRatioCap: 1.25, particleCap: 1.0,  textureScale: 1.0,  instancing: false },
        ultra:    { pixelRatioCap: 1.5,  particleCap: 1.2,  textureScale: 1.0,  instancing: false }
    };

    var state = {
        quality: 'high',
        emaMs: 16.7,
        frames: 0,
        upWindows: 0,
        running: false,
        poolSize: recommendedPoolSize(),
        drops: 0,
        raises: 0,
        lastChange: null
    };

    function recommendedPoolSize() {
        try {
            var cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) | 0;
            if (!cores || cores < 1) return 4;
            // Leave one core for the main thread; clamp to a sane worker pool.
            return Math.min(8, Math.max(2, cores - 1));
        } catch (_) {
            return 4;
        }
    }

    function clampQuality(name) {
        return BUDGETS[name] ? name : 'high';
    }

    function findGames() {
        // All three GraveGain games, whichever are present. Never throws.
        var out = [];
        try {
            if (window.GraveGainGame) out.push({ slug: '3d', game: window.GraveGainGame });
        } catch (_) { /* ignore */ }
        try {
            if (window.GraveGain2DGame) out.push({ slug: '2d', game: window.GraveGain2DGame });
        } catch (_) { /* ignore */ }
        try {
            if (window.GraveGain1DGame) out.push({ slug: '1d', game: window.GraveGain1DGame });
        } catch (_) { /* ignore */ }
        return out;
    }

    function now() {
        try {
            if (typeof performance !== 'undefined' && performance.now) return performance.now();
        } catch (_) { /* ignore */ }
        return Date.now();
    }

    function emit(reason) {
        try {
            window.dispatchEvent(new window.CustomEvent('gravegain-tuner', {
                detail: {
                    quality: state.quality,
                    emaMs: Math.round(state.emaMs * 10) / 10,
                    reason: reason || 'manual',
                    budget: BUDGETS[state.quality],
                    poolSize: state.poolSize
                }
            }));
        } catch (_) { /* ignore */ }
    }

    function applyPixelRatio(game, cap) {
        try {
            var renderer = game && game.renderer;
            if (!renderer || typeof renderer.setPixelRatio !== 'function') return;
            var current = 1;
            try { current = renderer.getPixelRatio ? renderer.getPixelRatio() : 1; } catch (_) { /* ignore */ }
            var next = Math.min(current, cap);
            if (next <= 0 || !isFinite(next)) return;
            if (next < current - 0.001) {
                renderer.setPixelRatio(next);
                try {
                    var el = renderer.domElement;
                    var w = (game.container && game.container.clientWidth) || (el && el.clientWidth) || 1000;
                    var h = (game.container && game.container.clientHeight) || (el && el.clientHeight) || 600;
                    if (typeof renderer.setSize === 'function') renderer.setSize(w, h, false);
                } catch (_) { /* resize is best-effort */ }
                // Keep the engine PerformanceManager in sync so its next
                // sample() does not snap the ratio back behind our back.
                try {
                    if (game.performance) game.performance.pixelRatio = Math.min(game.performance.pixelRatio || next, next);
                } catch (_) { /* ignore */ }
            }
        } catch (_) { /* ignore */ }
    }

    function applyParticleCap(game, cap) {
        try {
            var vfx = game && game.vfx;
            if (!vfx || typeof vfx !== 'object') return;
            vfx.tunerCap = cap;
            if (vfx.__threadTunerWrapped) return;
            vfx.__threadTunerWrapped = true;
            ['spawnSparks', 'spawnBlood', 'spawn', 'burst'].forEach(function (method) {
                try {
                    if (typeof vfx[method] !== 'function') return;
                    var orig = vfx[method].bind(vfx);
                    vfx[method] = function () {
                        try {
                            var args = Array.prototype.slice.call(arguments);
                            var scale = Number(vfx.tunerCap);
                            if (!isFinite(scale) || scale <= 0) scale = 1;
                            // Scale the first numeric count-like argument.
                            for (var i = args.length - 1; i >= 0; i--) {
                                if (typeof args[i] === 'number' && isFinite(args[i]) && args[i] > 1) {
                                    args[i] = Math.max(1, Math.round(args[i] * scale));
                                    break;
                                }
                            }
                            return orig.apply(null, args);
                        } catch (_) {
                            try { return orig.apply(null, arguments); } catch (_) { return null; }
                        }
                    };
                } catch (_) { /* per-method guard */ }
            });
        } catch (_) { /* ignore */ }
    }

    function applyQuality(reason) {
        var budget = BUDGETS[state.quality];
        if (!budget) return;
        var games = findGames();
        for (var i = 0; i < games.length; i++) {
            try {
                var game = games[i].game;
                applyPixelRatio(game, budget.pixelRatioCap);
                applyParticleCap(game, budget.particleCap);
                // Texture downscale hint: flag + property overlays honor.
                try { game.tunerTextureScale = budget.textureScale; } catch (_) { /* ignore */ }
                // Instanced-render batching flag for THREE scenes.
                try { game.tunerInstancing = !!budget.instancing; } catch (_) { /* ignore */ }
            } catch (_) { /* per-game guard */ }
        }
        try {
            if (document && document.documentElement && document.documentElement.dataset) {
                document.documentElement.dataset.gravegainTexture = String(budget.textureScale);
                document.documentElement.dataset.gravegainTuner = state.quality;
            }
        } catch (_) { /* ignore */ }
        // Hint the shared worker pool when it exposes sizing (never fails).
        try {
            var pool = window.FourWeirdWorkers;
            if (pool && typeof pool.setPoolSize === 'function') pool.setPoolSize(state.poolSize);
        } catch (_) { /* ignore */ }
        state.lastChange = { quality: state.quality, at: now(), reason: reason || 'manual' };
        emit(reason);
    }

    function stepDown(reason) {
        var idx = ORDER.indexOf(state.quality);
        if (idx < 0) idx = 2;
        if (idx <= 0) return false; // already potato
        state.quality = ORDER[idx - 1];
        state.drops++;
        applyQuality(reason || 'ema-slow');
        return true;
    }

    function stepUp(reason) {
        var idx = ORDER.indexOf(state.quality);
        if (idx < 0) idx = 2;
        if (idx >= ORDER.length - 1) return false; // already ultra
        state.quality = ORDER[idx + 1];
        state.raises++;
        applyQuality(reason || 'ema-fast');
        return true;
    }

    function governorTick(dtMs) {
        if (!isFinite(dtMs) || dtMs < 0) return;
        if (dtMs > 250) dtMs = 250; // tab-switch spike guard
        state.emaMs = state.emaMs + EMA_ALPHA * (dtMs - state.emaMs);
        state.frames++;
        if (state.frames < WINDOW_FRAMES) return;
        state.frames = 0;
        if (state.emaMs > DOWN_MS) {
            state.upWindows = 0;
            stepDown('ema-slow');
        } else if (state.emaMs < UP_MS) {
            state.upWindows++;
            if (state.upWindows >= 2) {
                state.upWindows = 0;
                stepUp('ema-fast');
            }
        } else {
            state.upWindows = 0;
        }
    }

    function governorLoop() {
        if (state.running) return;
        state.running = true;
        var last = now();
        var hidden = false;
        try {
            if (typeof document !== 'undefined' && document.addEventListener) {
                document.addEventListener('visibilitychange', function () {
                    try { hidden = !!document.hidden; } catch (_) { /* ignore */ }
                });
                hidden = !!document.hidden;
            }
        } catch (_) { /* ignore */ }
        function frame() {
            try {
                var t = now();
                var dt = t - last;
                last = t;
                // While hidden, rAF is throttled — skip sampling so the EMA
                // is not poisoned by background gaps; re-arm on next tick.
                if (!hidden) governorTick(dt);
                else last = now();
            } catch (_) { /* governor never throws */ }
            try {
                if (typeof requestAnimationFrame === 'function') requestAnimationFrame(frame);
                else setTimeout(frame, 16);
            } catch (_) { state.running = false; }
        }
        try {
            if (typeof requestAnimationFrame === 'function') requestAnimationFrame(frame);
            else setTimeout(frame, 16);
        } catch (_) { state.running = false; }
    }

    // ---- chunked AI scheduling hook ----

    function autoChunkSize(total) {
        // Slower machine (high EMA) -> smaller slices, more yields.
        try {
            if (state.emaMs > DOWN_MS) return 24;
            if (state.emaMs > 17) return 48;
            return 96;
        } catch (_) { return 64; }
    }

    // scheduleAI(list, fn, chunkSize?): process list in time-sliced chunks
    // (<= ~8ms per slice), resolving with an array of fn() return values.
    // Pure scheduling — fn runs on the main thread; route pure-math batches
    // through window.GraveGainWorkers instead when available.
    function scheduleAI(list, fn, chunkSize) {
        return new Promise(function (resolve) {
            try {
                if (!list || !list.length || typeof fn !== 'function') { resolve([]); return; }
                var n = list.length;
                var size = (chunkSize | 0) > 0 ? (chunkSize | 0) : autoChunkSize(n);
                var out = new Array(n);
                var i = 0;
                function slice() {
                    var t0 = now();
                    try {
                        while (i < n && (now() - t0) < SLICE_BUDGET_MS) {
                            var end = Math.min(n, i + size);
                            for (; i < end; i++) {
                                try { out[i] = fn(list[i], i); } catch (_) { out[i] = null; }
                            }
                            if ((now() - t0) >= SLICE_BUDGET_MS) break;
                        }
                    } catch (_) { /* per-slice guard */ }
                    if (i < n) {
                        try {
                            if (typeof requestIdleCallback === 'function') requestIdleCallback(slice, { timeout: 50 });
                            else setTimeout(slice, 0);
                        } catch (_) { setTimeout(slice, 0); }
                    } else {
                        resolve(out);
                    }
                }
                slice();
            } catch (_) { resolve([]); }
        });
    }

    function chunkedForEach(list, fn, chunkSize) {
        return scheduleAI(list, fn, chunkSize).then(function () { return list; });
    }

    function getStats() {
        var budget = BUDGETS[state.quality] || null;
        return {
            version: VERSION,
            quality: state.quality,
            emaMs: Math.round(state.emaMs * 10) / 10,
            poolSize: state.poolSize,
            cores: null,
            budget: budget ? { pixelRatioCap: budget.pixelRatioCap, particleCap: budget.particleCap, textureScale: budget.textureScale, instancing: budget.instancing } : null,
            drops: state.drops,
            raises: state.raises,
            lastChange: state.lastChange,
            games: findGames().map(function (g) { return g.slug; })
        };
    }

    function setQuality(name, reason) {
        var q = clampQuality(name);
        if (q !== state.quality) {
            state.quality = q;
            applyQuality(reason || 'manual');
        } else {
            applyQuality(reason || 'manual');
        }
        return state.quality;
    }

    function init() {
        try { state.poolSize = recommendedPoolSize(); } catch (_) { /* ignore */ }
        governorLoop();
        // Re-apply to late-booting games (script loads early, games boot on
        // their own DOMContentLoaded): poll briefly, then stop.
        var tries = 0;
        (function awaitGames() {
            try {
                var games = findGames();
                if (games.length) { applyQuality('boot'); return; }
            } catch (_) { /* ignore */ }
            tries++;
            if (tries < 50) {
                try { setTimeout(awaitGames, 200); } catch (_) { /* ignore */ }
            }
        })();
        return api;
    }

    var api = {
        VERSION: VERSION,
        getStats: getStats,
        setQuality: setQuality,
        scheduleAI: scheduleAI,
        chunkedForEach: chunkedForEach,
        recommendedPoolSize: recommendedPoolSize,
        ORDER: ORDER.slice(),
        init: init
    };

    window.GraveGainThreadTuner = api;

    window.GraveGainMods = window.GraveGainMods || [];
    try {
        window.GraveGainMods.push({ name: 'gravegain-thread-tuner', version: VERSION, init: init });
    } catch (_) {
        try { window.GraveGainMods[window.GraveGainMods.length] = { name: 'gravegain-thread-tuner', version: VERSION, init: init }; } catch (_) { /* ignore */ }
    }

    // Autostart: load early, degrade gracefully when games boot later.
    try { init(); } catch (_) { /* never break page boot */ }
})();
