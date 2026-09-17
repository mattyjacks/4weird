/* GraveGain4D dream-rift: portal4d.js — rift portals with golf-hole cup exits.
 *
 * Two gate kinds, echoing GraveGain descend portals:
 *   - w-gate: hurls the ball/hero along ana (+w) or kata (-w) to a target
 *     w-slice, with a NecroGenesis shimmer + dwarven-gold ring flash.
 *   - brane-flip gate: swaps Light<->Gloom brane attunement; elven glow-trees
 *     projected in 4D bend toward whichever brane is active.
 *
 * Every portal owns a golf-hole cup as its exit: putt the ball into the cup
 * (within cup radius + slow enough) to descend — the cup swallows the ball,
 * the portal fires, and depth+1 begins. Cups never move during dream regens
 * (dreamgen pins 'cup'/'portal' tags — register portals via attach()).
 *
 * Deterministic: portal ids + cup placement derive from the dream seed.
 * Vanilla JS IIFE, idempotent via window.GG4D_Portals. Never throws.
 * No fullscreen / dblclick code.
 */
(function () {
    'use strict';
    try {
        if (typeof window === 'undefined') return;
        if (window.GG4D_Portals) return;

        var VERSION = '1.0.0';

        var KINDS = ['w-gate', 'brane-flip'];

        var CUP = { radius: 0.55, captureSpeed: 2.2, glow: '#e8c33a' };

        function num(v, dflt) {
            try {
                if (typeof v === 'number' && isFinite(v)) return v;
                var n = Number(v);
                if (isFinite(n)) return n;
            } catch (_) { /* ignore */ }
            return dflt;
        }

        function dream() {
            try { return window.GG4D_Dream || null; } catch (_) { return null; }
        }

        function ensureState(state) {
            try {
                state = state && typeof state === 'object' ? state : {};
                if (!state.portals || typeof state.portals !== 'object') state.portals = {};
                if (!Array.isArray(state.portals.gates)) state.portals.gates = [];
                if (state.portals.depth == null) state.portals.depth = 0;
                if (!state.portals.brane) state.portals.brane = 'light';
                if (!state.portals.lastDescend) state.portals.lastDescend = null;
                return state;
            } catch (_) {
                return { portals: { gates: [], depth: 0, brane: 'light', lastDescend: null } };
            }
        }

        /* Spawn gates deterministically from seed. Each gate gets a cup
         * offset a few units away — the fairway between gate and cup is the
         * golf hole. Returns the gate list (also stored in state). */
        function generate(state, seed, opts) {
            try {
                state = ensureState(state);
                opts = opts && typeof opts === 'object' ? opts : {};
                var D = dream();
                var s = D ? D.uint32(seed) : (Number(seed) >>> 0 || 7);
                var count = Math.max(1, Math.min(6, Math.floor(num(opts.count, 3))));
                var span = Math.max(4, num(opts.span, 20));
                var rnd = (function (a) {
                    a = (a ^ 0x51ED2707) >>> 0;
                    return function () {
                        try {
                            a = (a + 0x6D2B79F5) >>> 0;
                            var t = a;
                            t = Math.imul(t ^ (t >>> 15), t | 1);
                            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
                        } catch (_) { return 0.5; }
                    };
                })(s);
                var gates = [];
                for (var i = 0; i < count; i++) {
                    var kind = KINDS[Math.floor(rnd() * KINDS.length) % KINDS.length];
                    var gx = Math.round((rnd() * 2 - 1) * span * 10) / 10;
                    var gy = Math.round((rnd() * 2 - 1) * span * 10) / 10;
                    if (gx * gx + gy * gy < 25) { gx += (gx >= 0 ? 6 : -6); gy += (gy >= 0 ? 6 : -6); }
                    var ang = rnd() * Math.PI * 2;
                    var fairway = 4 + rnd() * 4;
                    gates.push({
                        id: 'gate-' + (s >>> 0).toString(16) + '-' + i,
                        kind: kind,
                        x: gx, y: gy,
                        // w-gate target slice; brane-flip ignores wTarget.
                        wTarget: kind === 'w-gate' ? (rnd() < 0.5 ? 2 : -2) : 0,
                        wDir: kind === 'w-gate' ? (rnd() < 0.5 ? 'ana' : 'kata') : 'flip',
                        cup: {
                            id: 'cup-' + (s >>> 0).toString(16) + '-' + i,
                            x: Math.round((gx + Math.cos(ang) * fairway) * 10) / 10,
                            y: Math.round((gy + Math.sin(ang) * fairway) * 10) / 10,
                            radius: CUP.radius,
                            gateId: 'gate-' + (s >>> 0).toString(16) + '-' + i,
                            sunk: false
                        },
                        braneTint: kind === 'brane-flip' ? '#b79cff' : '#e8c33a',
                        armed: true
                    });
                }
                state.portals.gates = gates;
                return gates.slice();
            } catch (_) { return []; }
        }

        /* attach(dungeon, state): pin portal + cup rooms in the dungeon model
         * so dreamgen redreams never move them. Call after both exist. */
        function attach(state, dungeon) {
            try {
                state = ensureState(state);
                if (!dungeon || !Array.isArray(dungeon.rooms)) return 0;
                if (!dungeon.objectives) dungeon.objectives = [];
                var pinned = 0;
                state.portals.gates.forEach(function (g) {
                    try {
                        dungeon.objectives.push({ x: g.x, y: g.y, r: 1.5, kind: 'portal', id: g.id });
                        dungeon.objectives.push({ x: g.cup.x, y: g.cup.y, r: CUP.radius + 0.6, kind: 'cup', id: g.cup.id });
                        // Tag matching rooms if positions coincide.
                        dungeon.rooms.forEach(function (room) {
                            try {
                                var dx = num(room.x, 0) - num(g.x, 0);
                                var dy = num(room.y, 0) - num(g.y, 0);
                                if (dx * dx + dy * dy < 2.25 && room.tags.indexOf('portal') < 0) {
                                    room.tags.push('portal'); pinned++;
                                }
                                var cx = num(room.x, 0) - num(g.cup.x, 0);
                                var cy = num(room.y, 0) - num(g.cup.y, 0);
                                if (cx * cx + cy * cy < 2.25 && room.tags.indexOf('cup') < 0) {
                                    room.tags.push('cup'); pinned++;
                                }
                            } catch (_) { /* ignore */ }
                        });
                    } catch (_) { /* ignore */ }
                });
                return pinned;
            } catch (_) { return 0; }
        }

        function gateById(state, id) {
            try {
                state = ensureState(state);
                for (var i = 0; i < state.portals.gates.length; i++) {
                    if (state.portals.gates[i].id === id) return state.portals.gates[i];
                }
                return null;
            } catch (_) { return null; }
        }

        function cupById(state, id) {
            try {
                state = ensureState(state);
                for (var i = 0; i < state.portals.gates.length; i++) {
                    var c = state.portals.gates[i].cup;
                    if (c && c.id === id) return c;
                }
                return null;
            } catch (_) { return null; }
        }

        /* putt(state, ball, dt): advance one golf-putt check. ball: {x,y,vx,vy}.
         * Returns null normally, or { gate, cup, descend } when a ball drops. */
        function putt(state, ball) {
            try {
                state = ensureState(state);
                if (!ball) return null;
                var bx = num(ball.x, 0), by = num(ball.y, 0);
                var speed = Math.sqrt(Math.pow(num(ball.vx, 0), 2) + Math.pow(num(ball.vy, 0), 2));
                for (var i = 0; i < state.portals.gates.length; i++) {
                    var g = state.portals.gates[i];
                    if (!g || !g.armed || !g.cup || g.cup.sunk) continue;
                    var dx = bx - num(g.cup.x, 0), dy = by - num(g.cup.y, 0);
                    var r = Math.max(0.1, num(g.cup.radius, CUP.radius));
                    if (dx * dx + dy * dy <= r * r && speed <= CUP.captureSpeed) {
                        return descend(state, g.id, ball);
                    }
                }
                return null;
            } catch (_) { return null; }
        }

        /* descend(state, gateId, ball): the cup swallows the ball — fire the
         * gate, bump depth, emit the descend report (seed hex included). */
        function descend(state, gateId, ball) {
            var out = { gate: null, depth: 0, brane: 'light', wApplied: 0, seedHex: '0x00000000' };
            try {
                state = ensureState(state);
                var g = gateById(state, gateId);
                if (!g) return out;
                out.gate = g;
                g.cup.sunk = true;
                g.armed = false;
                state.portals.depth = Math.max(0, Math.floor(num(state.portals.depth, 0))) + 1;
                out.depth = state.portals.depth;
                if (g.kind === 'w-gate') {
                    out.wApplied = num(g.wTarget, 0);
                    out.toast = g.wDir === 'ana'
                        ? 'Descend! The cup drinks the ball — hurled ana-ward through shimmering gold.'
                        : 'Descend! The cup drinks the ball — dropped kata-ward into the cold dark.';
                    if (ball && typeof ball === 'object') {
                        try { ball.w = num(ball.w, 0) + out.wApplied; ball.x = g.x; ball.y = g.y; } catch (_) { /* ignore */ }
                    }
                } else {
                    state.portals.brane = state.portals.brane === 'light' ? 'gloom' : 'light';
                    out.brane = state.portals.brane;
                    out.wApplied = 0;
                    out.toast = out.brane === 'gloom'
                        ? 'Brane-flip! Glow-trees bend toward Gloom — NecroGenesis veins open below.'
                        : 'Brane-flip! Glow-trees bend toward Light — elven dawn breaks over the crypt.';
                    if (ball && typeof ball === 'object') {
                        try { ball.x = g.x; ball.y = g.y; } catch (_) { /* ignore */ }
                    }
                }
                var D = dream();
                out.seedHex = D ? D.hexSeed(D.uint32(state.portals.depth + ':descend:' + g.id)) : '0x00000000';
                state.portals.lastDescend = {
                    gateId: g.id, kind: g.kind, depth: out.depth,
                    brane: state.portals.brane, hex: out.seedHex
                };
                return out;
            } catch (_) { return out; }
        }

        function resetCups(state) {
            try {
                state = ensureState(state);
                state.portals.gates.forEach(function (g) {
                    try { if (g && g.cup) { g.cup.sunk = false; g.armed = true; } } catch (_) { /* ignore */ }
                });
            } catch (_) { /* ignore */ }
        }

        function serialize(state) {
            try {
                state = ensureState(state);
                return {
                    gates: JSON.parse(JSON.stringify(state.portals.gates)),
                    depth: state.portals.depth,
                    brane: state.portals.brane,
                    lastDescend: state.portals.lastDescend
                };
            } catch (_) { return { gates: [], depth: 0, brane: 'light', lastDescend: null }; }
        }

        function restore(state, snap) {
            try {
                state = ensureState(state);
                if (snap && typeof snap === 'object') {
                    if (Array.isArray(snap.gates)) state.portals.gates = snap.gates.slice();
                    if (snap.depth != null) state.portals.depth = Math.max(0, Math.floor(num(snap.depth, 0)));
                    if (snap.brane === 'light' || snap.brane === 'gloom') state.portals.brane = snap.brane;
                    state.portals.lastDescend = snap.lastDescend || null;
                }
                return state;
            } catch (_) { return state; }
        }

        window.GG4D_Portals = {
            VERSION: VERSION,
            KINDS: KINDS.slice(),
            CUP: { radius: CUP.radius, captureSpeed: CUP.captureSpeed, glow: CUP.glow },
            ensureState: ensureState,
            generate: generate,
            attach: attach,
            gateById: gateById,
            cupById: cupById,
            putt: putt,
            descend: descend,
            resetCups: resetCups,
            serialize: serialize,
            restore: restore
        };
    } catch (_) { /* never throw */ }
})();
