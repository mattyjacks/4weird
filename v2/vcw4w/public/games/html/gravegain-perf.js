/* GraveGain perf tuner v2 — CPU/GPU thread optimization for all 3 GraveGain games.
 *
 * Lives OUTSIDE the parity-locked bundles:
 *   public/games/html/gravegain-perf.js
 * Injected into the generated runtime copies (gravegain1d/2d/3d) by
 * scripts/sync-game-bundles.mjs alongside fourweird-workers.js,
 * gravegain-workers.js and fourweird-graphics.js. NEVER edit the
 * parity-locked sources.
 *
 * What it does (reuses existing infra, creates NO new Worker code):
 *   1. CPU (scaleGrain): detects hardwareConcurrency (guarded) and routes
 *      heavy per-tick math through window.GraveGainWorkers
 *      (dungeonRng/steerEnemies/integrateParticles/aggregateTiming) with
 *      window.FourWeirdWorkers.run as fallback. Throttles: steer every 6th
 *      tick max, particle integrate batched (single call per frame max,
 *      cap 300 parts), timing aggregate 1/sec. offloadSteer/offloadParticles
 *      return promises that always resolve null-safe (never reject into
 *      game loops; callers keep their local sync path on null).
 *   2. GPU (applyBudgets): reads the FourWeirdGraphics preset (guarded,
 *      default balanced), stores per-level budgets at
 *      window.GraveGainPerf.budgets for gore/graphics modules to read, and
 *      applies the DPR cap to the live THREE renderer if present
 *      (setPixelRatio). Re-applies on the 'fourweird-graphics' event.
 *      Dispatches nothing.
 *   3. Frame governor: rAF loop measuring avg frame ms over 60 frames;
 *      >26ms sustained steps quality down one notch via
 *      FourWeirdGraphics.apply (guarded), max 1 stepdown per 10s, never
 *      below potato; <12ms for 3 consecutive windows with an auto user
 *      preset steps up once per streak.
 *
 * Vanilla JS IIFE, idempotent (`if (window.GraveGainPerf) return`),
 * never throws (all try/catch), no input listeners, no Worker()/Blob,
 * no eval, no canvas contexts, no localStorage writes (reads only via
 * FourWeirdGraphics.load, guarded). No visible DOM by default; runtime
 * counters live in the hidden window.GraveGainPerfStats object only.
 */
(function () {
    'use strict';
    if (window.GraveGainPerf) return;

    var VERSION = '2.0.0';
    var ORDER = ['potato', 'balanced', 'high', 'ultra'];

    // GPU budgets per preset. Gore/graphics modules read these from
    // window.GraveGainPerf.budgets (no events dispatched, no DOM touched).
    var PRESET_BUDGETS = {
        potato:   { dpr: 0.5, particleMult: 0.25, decals: 20,  lights: 1, shadows: false },
        balanced: { dpr: 1.0, particleMult: 0.6,  decals: 40,  lights: 2, shadows: false },
        high:     { dpr: 1.5, particleMult: 1.0,  decals: 80,  lights: 3, shadows: true },
        ultra:    { dpr: 2.0, particleMult: 1.5,  decals: 120, lights: 4, shadows: true }
    };

    var STEER_EVERY = 6;          // steer offload: every 6th tick max
    var PARTICLE_CAP = 300;       // particle integrate: cap parts per call
    var TIMING_MS = 1000;         // timing aggregate: at most 1/sec
    var ROUTE_TIMEOUT = 400;      // worker call timeout ms (clamped 100..2000)
    var SKIP_LIST_MAX = 400;      // huge hordes stay on the local sync path
    var WINDOW_FRAMES = 60;       // governor evaluation window
    var DOWN_MS = 26;             // avg frame ms -> step down
    var UP_MS = 12;               // avg frame ms -> headroom streak
    var UP_WINDOWS = 3;           // consecutive fast windows -> step up once
    var STEPDOWN_COOLDOWN = 10000;// max 1 stepdown per 10s

    var state = {
        level: 'balanced',
        autoMode: false,          // true when the saved preset had auto: prefix
        frames: 0,
        windows: 0,
        avgMs: -1,
        underStreak: 0,
        lastStepDownAt: 0
    };
    var deltas = [];
    var steerCalls = 0;
    var particleFrame = -1;
    var lastTimingAt = 0;
    var rectCache = null; // v1 compat rect() TTL cache (WeakMap when available)

    // Hidden stats object: plain JS counters, never rendered to DOM.
    var hiddenStats = {
        version: VERSION,
        calls: { steer: 0, particles: 0, timing: 0, rng: 0 },
        offloaded: { steer: 0, particles: 0, timing: 0, rng: 0 },
        nulled: { steer: 0, particles: 0, timing: 0, rng: 0 },
        timingAgg: null,
        stepDowns: 0,
        stepUps: 0
    };

    function now() {
        try {
            if (typeof performance !== 'undefined' && performance.now) return performance.now();
        } catch (e) { /* fall through */ }
        try { return Date.now(); } catch (e2) { return 0; }
    }

    function validLevel(name) {
        try { return typeof name === 'string' && !!PRESET_BUDGETS[name]; } catch (e) { return false; }
    }

    // Promise that always resolves null — game loops must never see a reject.
    function safeNull() {
        try {
            if (typeof Promise === 'function') return Promise.resolve(null);
        } catch (e) { /* fall through to thenable */ }
        return { then: function (cb) { try { if (typeof cb === 'function') cb(null); } catch (e) { /* ignore */ } return this; } };
    }

    function safeResolve(value) {
        try {
            if (value === null || value === undefined) return safeNull();
            if (value && typeof value.then === 'function') {
                try {
                    return value.then(
                        function (v) { return (v === undefined ? null : v); },
                        function () { return null; }
                    );
                } catch (e) { return safeNull(); }
            }
            if (typeof Promise === 'function') {
                try { return Promise.resolve(value); } catch (e) { return safeNull(); }
            }
            return safeNull();
        } catch (e) { return safeNull(); }
    }

    function workersAvailable() {
        try {
            var GW = null;
            try { GW = window.GraveGainWorkers || null; } catch (e) { GW = null; }
            if (GW && typeof GW.ready === 'function') {
                try { if (GW.ready()) return true; } catch (e) { /* try fallback */ }
            }
            var FW = null;
            try { FW = window.FourWeirdWorkers || null; } catch (e) { FW = null; }
            if (FW && typeof FW.supported === 'function') {
                try { return !!FW.supported(); } catch (e) { return false; }
            }
            return false;
        } catch (e) { return false; }
    }

    // --- 1. CPU: scaleGrain + worker routing -----------------------------------
    // Detects core count (guarded) so callers can scale per-tick math grain.
    function scaleGrain() {
        try {
            var cores = 4;
            try {
                var hc = (typeof navigator !== 'undefined') ? navigator.hardwareConcurrency : 0;
                if (typeof hc === 'number' && hc >= 1 && isFinite(hc)) cores = Math.floor(hc);
            } catch (e) { /* default */ }
            var tier = cores <= 2 ? 'low' : (cores <= 4 ? 'medium' : (cores <= 8 ? 'high' : 'ultra'));
            return {
                cores: cores, tier: tier,
                steerEvery: STEER_EVERY, particleCap: PARTICLE_CAP, timingMs: TIMING_MS,
                workers: workersAvailable()
            };
        } catch (e) {
            return { cores: 4, tier: 'medium', steerEvery: STEER_EVERY, particleCap: PARTICLE_CAP, timingMs: TIMING_MS, workers: false };
        }
    }

    // Route one heavy-math call: GraveGainWorkers method first, then the
    // FourWeirdWorkers.run pool. Always resolves null-safe, never rejects.
    // No new Worker()/Blob code is created here — pools only.
    function routeHeavy(kind, payload, timeout) {
        try {
            var t = ROUTE_TIMEOUT;
            try {
                if (typeof timeout === 'number') t = Math.min(Math.max(timeout, 100), 2000);
            } catch (e) { /* default */ }
            try { hiddenStats.calls[kind] += 1; } catch (e) { /* ignore */ }
            var res = null;
            var attempted = false;
            try {
                var GW = window.GraveGainWorkers || null;
                if (GW) {
                    if (kind === 'steer' && typeof GW.steerEnemies === 'function') {
                        attempted = true;
                        res = GW.steerEnemies(payload.list, payload.px, payload.py);
                    } else if (kind === 'particles' && typeof GW.integrateParticles === 'function') {
                        attempted = true;
                        res = GW.integrateParticles(payload.parts, payload.dt);
                    } else if (kind === 'timing' && typeof GW.aggregateTiming === 'function') {
                        attempted = true;
                        res = GW.aggregateTiming(payload.samples);
                    } else if (kind === 'rng' && typeof GW.dungeonRng === 'function') {
                        attempted = true;
                        res = GW.dungeonRng(payload.seed, payload.n);
                    } else if (typeof GW.run === 'function') {
                        attempted = true;
                        var task = kind === 'steer' ? 'ai-steer'
                            : kind === 'particles' ? 'particle-integrate'
                            : kind === 'timing' ? 'timing-aggregate' : 'dungeon-rng';
                        res = GW.run(task, payload, { timeout: t });
                    }
                }
            } catch (e) { res = null; }
            if (!attempted) {
                try {
                    var FW = window.FourWeirdWorkers || null;
                    if (FW && typeof FW.run === 'function') {
                        var task2 = kind === 'steer' ? 'ai-steer'
                            : kind === 'particles' ? 'particle-integrate'
                            : kind === 'timing' ? 'timing-aggregate' : 'dungeon-rng';
                        attempted = true;
                        res = FW.run(task2, payload, { timeout: t });
                    }
                } catch (e) { res = null; }
            }
            if (!attempted || res === null || res === undefined) {
                try { hiddenStats.nulled[kind] += 1; } catch (e) { /* ignore */ }
                return safeNull(); // sync fallback: caller keeps its local path
            }
            try { hiddenStats.offloaded[kind] += 1; } catch (e) { /* ignore */ }
            return safeResolve(res);
        } catch (e) { return safeNull(); }
    }

    // Steer offload: at most every 6th tick; huge hordes stay local.
    function offloadSteer(list, px, py) {
        try {
            steerCalls += 1;
            if ((steerCalls % STEER_EVERY) !== 0) return safeNull();
            if (!list || typeof list.length !== 'number' || list.length === 0) return safeNull();
            if (list.length > SKIP_LIST_MAX) return safeNull();
            var slice = list;
            try {
                if (list.length > 120 && typeof list.slice === 'function') slice = list.slice(0, 120);
            } catch (e) { slice = list; }
            var x = 0, y = 0;
            try { x = Number(px) || 0; y = Number(py) || 0; } catch (e) { /* 0,0 */ }
            return routeHeavy('steer', { list: slice, px: x, py: y });
        } catch (e) { return safeNull(); }
    }

    // Particle integrate: batched to a single worker call per frame max, cap 300.
    function offloadParticles(parts, dt) {
        try {
            if (!parts || typeof parts.length !== 'number' || parts.length === 0) return safeNull();
            if (state.frames === particleFrame) return safeNull(); // one call per frame max
            particleFrame = state.frames;
            var slice = parts;
            try {
                if (parts.length > PARTICLE_CAP && typeof parts.slice === 'function') slice = parts.slice(0, PARTICLE_CAP);
            } catch (e) { slice = parts; }
            var step = 0.016;
            try { step = Number(dt); if (!(step > 0) || !isFinite(step)) step = 0.016; } catch (e) { /* default */ }
            return routeHeavy('particles', { parts: slice, dt: step });
        } catch (e) { return safeNull(); }
    }

    // Timing aggregate, best-effort, at most 1/sec; feeds the hidden stats.
    function maybeAggregateTiming() {
        try {
            var t = now();
            if (t - lastTimingAt < TIMING_MS) return;
            lastTimingAt = t;
            if (!deltas.length || !workersAvailable()) return;
            var samples = null;
            try { samples = deltas.slice(-60); } catch (e) { return; }
            var p = routeHeavy('timing', { samples: samples }, 800);
            try {
                if (p && typeof p.then === 'function') {
                    p.then(function (v) {
                        try { if (v !== null && v !== undefined) hiddenStats.timingAgg = v; } catch (e) { /* ignore */ }
                        return null;
                    });
                }
            } catch (e) { /* best-effort only */ }
        } catch (e) { /* ignore */ }
    }

    // --- 2. GPU: applyBudgets ---------------------------------------------------
    // Resolve the active FourWeirdGraphics preset (guarded, default balanced).
    // Reads via FourWeirdGraphics.load only — never writes localStorage here.
    function currentPreset() {
        try {
            var raw = null;
            try {
                var G = window.FourWeirdGraphics || null;
                if (G && typeof G.load === 'function') {
                    var saved = G.load();
                    if (saved && saved.preset) {
                        raw = String(saved.preset);
                        try {
                            if (raw.slice(0, 5) === 'auto:') state.autoMode = true;
                        } catch (e) { /* ignore */ }
                        raw = raw.replace(/^auto:/, '');
                    }
                } else if (G) {
                    try {
                        if (typeof G.getPreset === 'function') raw = G.getPreset();
                        else if (typeof G.preset === 'string') raw = G.preset;
                    } catch (e) { /* ignore */ }
                }
            } catch (e) { raw = null; }
            if (!raw) {
                try {
                    var el = document.documentElement && document.documentElement.getAttribute('data-fourweird-graphics');
                    if (el) raw = String(el).replace(/^auto:/, '');
                } catch (e) { /* ignore */ }
            }
            if (validLevel(raw)) return raw;
        } catch (e) { /* fall through */ }
        return 'balanced';
    }

    function budgetFor(level) {
        try {
            var b = PRESET_BUDGETS[level] || PRESET_BUDGETS.balanced;
            return {
                level: validLevel(level) ? level : 'balanced',
                dpr: b.dpr, particleMult: b.particleMult,
                decals: b.decals, lights: b.lights, shadows: b.shadows
            };
        } catch (e) {
            return { level: 'balanced', dpr: 1.0, particleMult: 0.6, decals: 40, lights: 2, shadows: false };
        }
    }

    function applyToRenderer(cap, shadows) {
        try {
            var names = ['GraveGainGame', 'GraveGain3D'];
            for (var i = 0; i < names.length; i++) {
                var renderer = null;
                try {
                    var host = window[names[i]] || null;
                    if (host && host.renderer) renderer = host.renderer;
                } catch (e) { renderer = null; }
                if (!renderer || typeof renderer.setPixelRatio !== 'function') continue;
                try {
                    var dpr = 1;
                    try {
                        dpr = (typeof window.devicePixelRatio === 'number' && window.devicePixelRatio > 0)
                            ? window.devicePixelRatio : 1;
                    } catch (e) { /* 1 */ }
                    renderer.setPixelRatio(Math.min(dpr, cap));
                } catch (e) { /* renderer busy */ }
                try {
                    if (shadows === false && renderer.shadowMap) renderer.shadowMap.enabled = false;
                } catch (e) { /* ignore */ }
            }
        } catch (e) { /* never throw */ }
    }

    // Read preset -> store budgets for gore/graphics modules -> apply DPR cap
    // to the live THREE renderer if present. Dispatches no events.
    function applyBudgets(preset) {
        try {
            var level = validLevel(preset) ? preset : currentPreset();
            state.level = level;
            var out = budgetFor(level);
            try { api.budgets = out; } catch (e) { /* window edge */ }
            applyToRenderer(out.dpr, out.shadows);
            return budgetFor(level);
        } catch (e) {
            try { return budgetFor('balanced'); } catch (e2) {
                return { level: 'balanced', dpr: 1.0, particleMult: 0.6, decals: 40, lights: 2, shadows: false };
            }
        }
    }

    // --- 3. Frame governor ------------------------------------------------------
    function maybeStepDown(t) {
        try {
            if (t - state.lastStepDownAt < STEPDOWN_COOLDOWN) return false; // max 1 per 10s
            var at = ORDER.indexOf(state.level);
            if (at <= 0) return false; // never below potato
            var next = ORDER[at - 1];
            try {
                var G = window.FourWeirdGraphics || null;
                if (G && typeof G.apply === 'function') G.apply(next);
            } catch (e) { /* guarded */ }
            state.level = next;
            state.lastStepDownAt = t;
            try { hiddenStats.stepDowns += 1; } catch (e) { /* ignore */ }
            applyBudgets(next);
            return true;
        } catch (e) { return false; }
    }

    function maybeStepUp() {
        try {
            if (!state.autoMode) return false; // manual presets are never raised
            var at = ORDER.indexOf(state.level);
            if (at < 0 || at >= ORDER.length - 1) return false;
            var next = ORDER[at + 1];
            try {
                var G = window.FourWeirdGraphics || null;
                if (G && typeof G.apply === 'function') G.apply(next);
            } catch (e) { /* guarded */ }
            state.level = next;
            try { hiddenStats.stepUps += 1; } catch (e) { /* ignore */ }
            applyBudgets(next);
            return true;
        } catch (e) { return false; }
    }

    function evaluateWindow() {
        try {
            if (!deltas.length) return;
            var sum = 0, i;
            for (i = 0; i < deltas.length; i++) sum += deltas[i];
            var avg = sum / deltas.length;
            state.avgMs = Math.round(avg * 100) / 100;
            state.windows += 1;
            if (avg > DOWN_MS) {
                state.underStreak = 0;
                maybeStepDown(now());
            } else if (avg < UP_MS) {
                state.underStreak += 1;
                if (state.underStreak >= UP_WINDOWS) {
                    state.underStreak = 0;
                    maybeStepUp(); // one step up per 3-window streak, auto presets only
                }
            } else {
                state.underStreak = 0;
            }
        } catch (e) { /* ignore */ }
    }

    function bootGovernor() {
        try {
            var raf = null;
            try {
                if (typeof window.requestAnimationFrame === 'function') {
                    raf = function (fn) { window.requestAnimationFrame(fn); };
                }
            } catch (e) { raf = null; }
            if (!raf) raf = function (fn) { try { setTimeout(fn, 16); } catch (e) { /* ignore */ } };
            var last = -1;
            var hidden = false;
            (function tick() {
                try {
                    try { hidden = !!(typeof document !== 'undefined' && document.hidden); } catch (e) { hidden = false; }
                    if (!hidden) {
                        var t = now();
                        if (last >= 0) {
                            var d = t - last;
                            if (d >= 0 && d < 250) {
                                deltas.push(d);
                                if (deltas.length > WINDOW_FRAMES) deltas.shift();
                                if (deltas.length >= WINDOW_FRAMES) {
                                    evaluateWindow();
                                    deltas.length = 0;
                                }
                            }
                        }
                        last = t;
                        state.frames += 1;
                        maybeAggregateTiming();
                    } else {
                        last = -1; // hidden: don't count the gap as a jank spike
                        state.underStreak = 0;
                    }
                } catch (e) { /* ignore */ }
                try { raf(tick); } catch (e2) {
                    try { setTimeout(tick, 50); } catch (e3) { /* ignore */ }
                }
            })();
        } catch (e) { /* ignore */ }
    }

    function governorState() {
        try {
            var grain = null;
            try { grain = scaleGrain(); } catch (e) { grain = null; }
            return {
                version: VERSION,
                level: state.level,
                autoMode: !!state.autoMode,
                avgMs: state.avgMs,
                frames: state.frames,
                windows: state.windows,
                underStreak: state.underStreak,
                lastStepDownAt: state.lastStepDownAt,
                cooldownMs: STEPDOWN_COOLDOWN,
                cores: grain ? grain.cores : 4
            };
        } catch (e) {
            return { version: VERSION, level: 'balanced', autoMode: false, avgMs: -1, frames: 0, windows: 0, underStreak: 0, lastStepDownAt: 0, cooldownMs: STEPDOWN_COOLDOWN, cores: 4 };
        }
    }

    // --- v1 compat shims (graceful aliases over the v2 core; no DOM writes) -----
    function qualityCompat() {
        try {
            var b = budgetFor(state.level);
            return {
                level: state.level, locked: false, paused: false,
                avgMs: state.avgMs, frames: state.frames,
                dpr: b.dpr, particleMult: b.particleMult,
                decals: b.decals, decalsMax: b.decals,
                lights: b.lights, shadows: b.shadows
            };
        } catch (e) {
            return { level: 'balanced', locked: false, paused: false, avgMs: -1, frames: 0 };
        }
    }

    function routeMathCompat(task, payload, opts) {
        try {
            var name = String(task || '');
            var p = payload || {};
            var timeout = undefined;
            try { if (opts && typeof opts.timeout === 'number') timeout = opts.timeout; } catch (e) { /* default */ }
            if (name === 'ai-steer' || name === 'steer') {
                var list = p.enemies || p.list || [];
                return offloadSteer(list, p.px, p.py);
            }
            if (name === 'particle-integrate' || name === 'particles') {
                return offloadParticles(p.parts, p.dt);
            }
            if (name === 'timing-aggregate' || name === 'timing') {
                return routeHeavy('timing', { samples: p.samples || [] }, timeout);
            }
            if (name === 'dungeon-rng' || name === 'rng-stream' || name === 'rng') {
                return routeHeavy('rng', { seed: p.seed, n: (typeof p.n === 'number' ? p.n : (p.samples ? p.samples.length : 0)) }, timeout);
            }
            return safeNull();
        } catch (e) { return safeNull(); }
    }

    // --- public API --------------------------------------------------------------
    var api = null;
    try {
        api = {
            VERSION: VERSION,
            budgets: budgetFor('balanced'),
            offloadSteer: offloadSteer,
            offloadParticles: offloadParticles,
            applyBudgets: applyBudgets,
            governorState: governorState,
            scaleGrain: scaleGrain,
            // v1 compat aliases (read/delegate only):
            quality: qualityCompat,
            routeMath: routeMathCompat,
            setQuality: function (name) {
                try {
                    if (!validLevel(name)) return qualityCompat();
                    try {
                        var G = window.FourWeirdGraphics || null;
                        if (G && typeof G.apply === 'function') G.apply(name);
                    } catch (e) { /* guarded */ }
                    applyBudgets(name);
                    return qualityCompat();
                } catch (e) { return qualityCompat(); }
            },
            unlock: function () {
                try {
                    state.autoMode = false;
                    applyBudgets();
                    return qualityCompat();
                } catch (e) { return qualityCompat(); }
            },
            stats: function () {
                try {
                    return {
                        version: VERSION, level: state.level,
                        autoMode: !!state.autoMode, avgMs: state.avgMs,
                        frames: state.frames, windows: state.windows,
                        samples: deltas.length, calls: hiddenStats.calls
                    };
                } catch (e) { return { version: VERSION }; }
            },
            // v1 compat: pruneDecals(limit) caps 2D gore decal nodes
            // ([data-gg2d-decal]) to `limit` (default: current budget),
            // removing oldest-first. Returns removals. Guarded no-op
            // when DOM is unavailable (never throws).
            pruneDecals: function (limit) {
                try {
                    var max = (typeof limit === 'number' && limit >= 0) ? Math.floor(limit)
                        : ((api && api.budgets && api.budgets.decals) || 40);
                    var nodes = document.querySelectorAll('[data-gg2d-decal]');
                    if (!nodes || nodes.length <= max) return 0;
                    var drop = nodes.length - max, removed = 0;
                    for (var i = 0; i < drop && i < nodes.length; i++) {
                        try {
                            var n = nodes[i];
                            if (n && n.parentNode) { n.parentNode.removeChild(n); removed++; }
                        } catch (e) { /* one bad node skips */ }
                    }
                    return removed;
                } catch (e) { return 0; }
            },
            // v1 compat: rect(el) returns a cached bounding rect
            // (500ms TTL per element via WeakMap when available).
            // Falls back to a zero rect. Never throws.
            rect: function (el) {
                try {
                    if (!el || typeof el.getBoundingClientRect !== 'function') {
                        return { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 };
                    }
                    var now = (typeof performance !== 'undefined' && performance.now)
                        ? performance.now() : Date.now();
                    try {
                        rectCache = rectCache || { map: (typeof WeakMap !== 'undefined' ? new WeakMap() : null), ttl: 500 };
                        if (rectCache.map) {
                            var hit = rectCache.map.get(el);
                            if (hit && (now - hit.t) < rectCache.ttl) return hit.r;
                            var r = el.getBoundingClientRect();
                            var snap = { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
                            try { rectCache.map.set(el, { t: now, r: snap }); } catch (e) { /* cache skip */ }
                            return snap;
                        }
                    } catch (e) { /* fall through to direct read */ }
                    return el.getBoundingClientRect();
                } catch (e) {
                    return { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 };
                }
            }
        };
        window.GraveGainPerf = api;
    } catch (e) { /* window unwritable */ }

    // Hidden stats object: counters only, never rendered to DOM.
    try { window.GraveGainPerfStats = hiddenStats; } catch (e) { /* ignore */ }

    // Boot: apply budgets once, start the governor, re-apply on preset changes.
    // Listens only for the 'fourweird-graphics' CustomEvent (not input); dispatches nothing.
    try { applyBudgets(); } catch (e) { /* ignore */ }
    try { bootGovernor(); } catch (e) { /* ignore */ }
    try {
        if (typeof window.addEventListener === 'function') {
            window.addEventListener('fourweird-graphics', function (ev) {
                try {
                    var p = (ev && ev.detail && ev.detail.preset) ? String(ev.detail.preset).replace(/^auto:/, '') : null;
                    applyBudgets(validLevel(p) ? p : undefined);
                } catch (e) { /* ignore */ }
            });
        }
    } catch (e) { /* ignore */ }
})();
