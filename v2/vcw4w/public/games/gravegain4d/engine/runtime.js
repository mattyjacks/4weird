(function (global) {
    'use strict';
    // GraveGain4DEngine — realtime/chrono/turnbased runtime with fail-open
    // stubs when siblings (Math/Config/Timeline/Graphics) are absent.
    // Plain script, no imports, idempotent.
    try {
        if (global && global.GraveGain4DEngine) return;
    } catch (_) { return; }
    var MODES = ['realtime', 'chrono', 'turnbased'];
    var state = {
        canvasId: null, canvas: null, ctx: null,
        mode: 'realtime', running: false, rafId: 0, timerId: 0,
        lastT: 0, strokes: 0, par: 3, hole: 1,
        world: null
    };
    function math() {
        try { return (global && global.GraveGain4DMath) || null; } catch (_) { return null; }
    }
    function cfg() {
        try { return (global && global.GraveGain4DConfig) || null; } catch (_) { return null; }
    }
    function timeline() {
        try { return (global && global.GraveGain4DTimeline) || null; } catch (_) { return null; }
    }
    function graphics() {
        try { return (global && global.GraveGain4DGraphics) || null; } catch (_) { return null; }
    }
    function defaultWorld() {
        return {
            ball: { pos: { x: 0, y: 0, z: 0, w: 0 }, vel: { x: 0, y: 0, z: 0, w: 0 } },
            hole: { pos: { x: 5, y: 0, z: 0, w: 0 }, radius: 0.6 },
            time: 0, turn: 0
        };
    }
    function getCanvas(id) {
        try {
            if (!id || typeof document === 'undefined') return null;
            return document.getElementById(id);
        } catch (_) { return null; }
    }
    function stepPhysics(world, dt) {
        try {
            if (!world || !world.ball) return world;
            var c = cfg();
            var friction = (c && c.speeds && typeof c.speeds.ballFriction === 'number') ? c.speeds.ballFriction : 0.92;
            var wDrag = (c && c.speeds && typeof c.speeds.wDrag === 'number') ? c.speeds.wDrag : 0.96;
            var p = world.ball.pos || { x: 0, y: 0, z: 0, w: 0 };
            var v = world.ball.vel || { x: 0, y: 0, z: 0, w: 0 };
            var damp = Math.pow(Math.max(0, Math.min(1, friction)), Math.max(0, dt * 60));
            v = { x: v.x * damp, y: v.y * damp, z: v.z * damp, w: v.w * damp * wDrag };
            p = { x: p.x + v.x * dt, y: p.y + v.y * dt, z: p.z + v.z * dt, w: p.w + v.w * dt };
            world.ball.pos = p;
            world.ball.vel = v;
            world.time = (typeof world.time === 'number' ? world.time : 0) + dt;
            return world;
        } catch (_) { return world; }
    }
    var api = {
        VERSION: '1.0.0',
        MODES: MODES.slice(),
        init: function (canvasId, opts) {
            try {
                state.canvasId = (typeof canvasId === 'string') ? canvasId : null;
                state.canvas = getCanvas(state.canvasId);
                state.ctx = (state.canvas && typeof state.canvas.getContext === 'function')
                    ? state.canvas.getContext('2d') : null;
                var o = (opts && typeof opts === 'object') ? opts : {};
                if (o.mode && MODES.indexOf(o.mode) !== -1) state.mode = o.mode;
                if (typeof o.par === 'number' && isFinite(o.par)) state.par = Math.max(1, Math.min(7, Math.floor(o.par)));
                else {
                    var c = cfg();
                    state.par = (c && c.par && typeof c.par.default === 'number') ? c.par.default : 3;
                }
                if (typeof o.hole === 'number' && isFinite(o.hole)) state.hole = Math.floor(o.hole);
                state.world = (o.world && typeof o.world === 'object') ? o.world : defaultWorld();
                state.strokes = 0;
                var tl = timeline();
                if (tl && typeof tl.snapshot === 'function') { try { tl.snapshot(state.world); } catch (_) { /* ignore */ } }
                return true;
            } catch (_) { return false; }
        },
        setMode: function (mode) {
            try {
                if (MODES.indexOf(mode) === -1) return false;
                state.mode = mode;
                return true;
            } catch (_) { return false; }
        },
        getMode: function () { return state.mode; },
        putt: function (aim4, power) {
            try {
                var M = math();
                var vel;
                if (M && typeof M.hypercubeBallistic === 'function') vel = M.hypercubeBallistic(aim4, power);
                else {
                    var ax = 0, ay = 0, az = 0, aw = 0;
                    try {
                        if (aim4 && typeof aim4 === 'object') {
                            ax = isFinite(+aim4.x) ? +aim4.x : 0;
                            ay = isFinite(+aim4.y) ? +aim4.y : 0;
                            az = isFinite(+aim4.z) ? +aim4.z : 0;
                            aw = isFinite(+aim4.w) ? +aim4.w : 0;
                        }
                    } catch (_) { /* zeros */ }
                    var l = Math.sqrt(ax * ax + ay * ay + az * az + aw * aw);
                    var pw = isFinite(+power) ? Math.max(0, Math.min(100, +power)) : 0;
                    if (l < 1e-12) vel = { x: 0, y: 0, z: 0, w: 0 };
                    else vel = { x: ax / l * pw * 1.5, y: ay / l * pw * 1.5, z: az / l * pw * 1.5, w: aw / l * pw * 1.5 };
                }
                if (!state.world) state.world = defaultWorld();
                if (!state.world.ball) state.world.ball = { pos: { x: 0, y: 0, z: 0, w: 0 }, vel: vel };
                else state.world.ball.vel = vel;
                state.strokes += 1;
                if (state.mode === 'turnbased') {
                    try { this.update(1 / 60, {}, state.world); } catch (_) { /* ignore */ }
                    state.world.turn = (typeof state.world.turn === 'number' ? state.world.turn : 0) + 1;
                }
                var tl = timeline();
                if (tl && typeof tl.snapshot === 'function') { try { tl.snapshot(state.world); } catch (_) { /* ignore */ } }
                return vel;
            } catch (_) { return { x: 0, y: 0, z: 0, w: 0 }; }
        },
        mulligan: function (n) {
            try {
                var tl = timeline();
                if (!tl || typeof tl.rewind !== 'function') return null;
                var prev = tl.rewind(n == null ? 1 : n);
                if (prev) {
                    state.world = prev;
                    if (state.strokes > 0) state.strokes -= 1;
                }
                return prev;
            } catch (_) { return null; }
        },
        // reverseTime: anytime time-reverse (T at any point). Charges the
        // player mana+stamina via GraveGain4DPlayer.reverseTime when a
        // player object is passed; otherwise just rewinds the timeline.
        // Never throws. Alternate worlds are NOT here (GraveGain5D).
        reverseTime: function (player) {
            try {
                if (player && global && global.GraveGain4DPlayer &&
                    typeof global.GraveGain4DPlayer.reverseTime === 'function') {
                    var r = global.GraveGain4DPlayer.reverseTime(player);
                    if (!r || !r.ok) return r;
                }
                var prev = this.mulligan(1);
                return { ok: !!prev, reason: prev ? 'reversed' : 'no-history' };
            } catch (_) { return { ok: false, reason: 'error' }; }
        },
        // onPlayerDeath: death reverses time instead of game over. Applies
        // the resource tax (maxHp loss + mana/stamina drain) via
        // GraveGain4DPlayer.applyDeathRewind and rewinds the timeline.
        // Returns { rewound } — false means true game over. Never throws.
        onPlayerDeath: function (player) {
            try {
                var P = (global && global.GraveGain4DPlayer) || null;
                var res = (P && typeof P.applyDeathRewind === 'function')
                    ? P.applyDeathRewind(player)
                    : { died: true, rewound: false };
                if (res && res.rewound) {
                    try { this.mulligan(1); } catch (_) { /* ignore */ }
                    return { rewound: true };
                }
                return { rewound: false };
            } catch (_) { return { rewound: false }; }
        },
        update: function (dt, input, world) {
            try {
                var w = world || state.world || (state.world = defaultWorld());
                var step = (typeof dt === 'number' && isFinite(dt) && dt > 0) ? Math.min(dt, 0.1) : 1 / 60;
                if (state.mode === 'chrono') step *= 0.35;
                if (state.mode === 'turnbased') {
                    if (!input || input.commit !== true) return w;
                    step = 1 / 60;
                }
                return stepPhysics(w, step);
            } catch (_) { return world || state.world; }
        },
        render: function (world) {
            try {
                var w = world || state.world;
                var G = graphics();
                if (G && typeof G.draw === 'function') { try { G.draw(state.canvas, w, state); } catch (_) { /* ignore */ } return true; }
                if (state.ctx && state.canvas) {
                    try {
                        state.ctx.clearRect(0, 0, state.canvas.width || 300, state.canvas.height || 150);
                    } catch (_) { /* ignore */ }
                }
                return true;
            } catch (_) { return false; }
        },
        loop: function (fn) {
            try {
                if (state.running) return true;
                state.running = true;
                state.lastT = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
                var self = this;
                function frame(now) {
                    try {
                        if (!state.running) return;
                        var t = (typeof now === 'number') ? now : ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now());
                        var dt = Math.min(0.1, Math.max(0, (t - state.lastT) / 1000));
                        state.lastT = t;
                        self.update(dt, {}, state.world);
                        self.render(state.world);
                        if (typeof fn === 'function') { try { fn(dt, state.world); } catch (_) { /* ignore */ } }
                    } catch (_) { /* keep looping */ }
                    try {
                        if (typeof requestAnimationFrame !== 'undefined') state.rafId = requestAnimationFrame(frame);
                        else state.timerId = setTimeout(function () { frame(); }, 16);
                    } catch (_) { state.running = false; }
                }
                try {
                    if (typeof requestAnimationFrame !== 'undefined') state.rafId = requestAnimationFrame(frame);
                    else state.timerId = setTimeout(function () { frame(); }, 16);
                } catch (_) { state.running = false; return false; }
                return true;
            } catch (_) { return false; }
        },
        stop: function () {
            try {
                state.running = false;
                try { if (typeof cancelAnimationFrame !== 'undefined' && state.rafId) cancelAnimationFrame(state.rafId); } catch (_) { /* ignore */ }
                try { if (state.timerId) clearTimeout(state.timerId); } catch (_) { /* ignore */ }
                state.rafId = 0; state.timerId = 0;
                return true;
            } catch (_) { return false; }
        },
        stroke: function () { try { state.strokes += 1; return state.strokes; } catch (_) { return 0; } },
        getStrokes: function () { try { return state.strokes; } catch (_) { return 0; } },
        parFor: function () { try { return state.par; } catch (_) { return 3; } },
        scoreVsPar: function () { try { return state.strokes - state.par; } catch (_) { return 0; } },
        getWorld: function () { try { return state.world; } catch (_) { return null; } },
        _state: state
    };
    try {
        if (global) global.GraveGain4DEngine = api;
    } catch (_) { /* fail-open */ }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
