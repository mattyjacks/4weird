(function () {
    'use strict';

    try {
        if (typeof window === 'undefined') return;
        if (window.GraveGain4DWorlds) return;

        var VERSION = '1.0.0';
        var MOD_NAME = 'gravegain4d-worlds';

        // -----------------------------------------------------------------
        // Optional math bridge: window.GraveGain4DMath (gg4d-01) with fallback
        // Load order must never matter, so every access is guarded.
        // -----------------------------------------------------------------
        function mathBridge() {
            try {
                if (window.GraveGain4DMath && typeof window.GraveGain4DMath === 'object') {
                    return window.GraveGain4DMath;
                }
            } catch (_) { /* ignore */ }
            return null;
        }

        function fallbackSliceT(w) {
            try {
                var m = mathBridge();
                if (m && typeof m.sliceT === 'function') return num(m.sliceT(w), 0);
                var n = num(w, 0);
                // Fold w into [0,1): deterministic slice coordinate.
                var t = n - Math.floor(n);
                if (t < 0) t = 0;
                if (t > 1) t = 1;
                return t;
            } catch (_) { return 0; }
        }

        function num(v, dflt) {
            try {
                if (typeof v === 'number' && isFinite(v)) return v;
                var n = Number(v);
                if (isFinite(n)) return n;
            } catch (_) { /* ignore */ }
            return dflt;
        }

        function uint32(seed) {
            try {
                if (typeof seed === 'number' && isFinite(seed)) return seed >>> 0;
                if (typeof seed === 'string') {
                    var h = 2166136261 >>> 0;
                    for (var i = 0; i < seed.length; i++) {
                        h ^= seed.charCodeAt(i);
                        h = Math.imul(h, 16777619) >>> 0;
                    }
                    return h >>> 0;
                }
                if (seed == null) return 0;
                return (Number(seed) >>> 0) || 0;
            } catch (_) { return 0; }
        }

        // Seeded PRNG (mulberry32) — deterministic per seed.
        function prng(seedInt) {
            var a = (seedInt >>> 0) || 0;
            return function () {
                try {
                    a = (a + 0x6D2B79F5) >>> 0;
                    var t = a;
                    t = Math.imul(t ^ (t >>> 15), t | 1);
                    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
                } catch (_) { return 0.5; }
            };
        }

        var __tlCounter = 0;

        function canonLocations() {
            return [
                'Colony LZ Sector Alpha',
                'Bioluminescent Forest Vaults',
                'Central Highlands Deep Mines',
                'LuckyStarShip hub',
                'MoonRock'
            ];
        }

        function canonThemes() {
            return [
                'metallic_ship',
                'elven_grove',
                'dwarven_vault',
                'orc_wastes',
                'toxic_catacombs',
                'stone_crypt',
                'citadel_darkness'
            ];
        }

        // -----------------------------------------------------------------
        // Timelines: 5D-Chess-style multiverse time travel.
        // rewind() never destroys history; fork() branches the present.
        // -----------------------------------------------------------------
        function createTimeline(seed) {
            try {
                var s = uint32(seed);
                __tlCounter += 1;
                var rnd = prng(s ^ 0x9E3779B9);
                var tlId = 'tl-' + s.toString(16) + '-' + __tlCounter;
                var tl = {
                    id: tlId,
                    seed: s,
                    tick: 0,
                    activeBranch: 0,
                    branches: [
                        { id: 0, originTick: 0, originBranch: -1, moves: [] }
                    ]
                };
                // Deterministic genesis move so empty timelines still differ.
                try { tl.branches[0].moves.push({ tick: 0, kind: 'genesis', roll: Math.floor(rnd() * 1000000) }); } catch (_) { /* ignore */ }
                return tl;
            } catch (_) {
                return { id: 'tl-0', seed: 0, tick: 0, activeBranch: 0, branches: [{ id: 0, originTick: 0, originBranch: -1, moves: [] }] };
            }
        }

        function activeBranchOf(tl) {
            try {
                if (!tl || !tl.branches || !tl.branches.length) return null;
                var idx = num(tl.activeBranch, 0);
                if (idx < 0 || idx >= tl.branches.length) idx = 0;
                return tl.branches[idx];
            } catch (_) { return null; }
        }

        function fork(timeline) {
            try {
                if (!timeline || !timeline.branches) return null;
                var src = activeBranchOf(timeline);
                if (!src) return null;
                var nextId = timeline.branches.length;
                var copy;
                try { copy = JSON.parse(JSON.stringify(src.moves || [])); }
                catch (_) { copy = (src.moves || []).slice(); }
                var branch = {
                    id: nextId,
                    originTick: num(timeline.tick, 0),
                    originBranch: num(timeline.activeBranch, 0),
                    moves: copy
                };
                timeline.branches.push(branch);
                timeline.activeBranch = nextId;
                return branch;
            } catch (_) { return null; }
        }

        function rewind(timeline, ticks) {
            try {
                if (!timeline) return null;
                var n = Math.floor(num(ticks, 0));
                if (!(n > 0)) return timeline;
                var cur = num(timeline.tick, 0);
                var next = cur - n;
                if (next < 0) next = 0;
                // 5D-style: keep a record of the rewind on the active branch
                // so the "future" is preserved as branch history.
                var br = activeBranchOf(timeline);
                if (br) {
                    try {
                        br.moves.push({ tick: cur, kind: 'rewind', from: cur, to: next });
                    } catch (_) { /* ignore */ }
                }
                timeline.tick = next;
                return timeline;
            } catch (_) {
                try { return timeline; } catch (__) { return null; }
            }
        }

        // -----------------------------------------------------------------
        // dreamWorld(seed): generative Oasis-style voxel alternate.
        // Deterministic from seed; reuses GraveGain dungeon themes.
        // -----------------------------------------------------------------
        function dreamWorld(seed) {
            try {
                var s = uint32(seed);
                var rnd = prng(s);
                var themes = canonThemes();
                var locs = canonLocations();
                var theme = themes[Math.floor(rnd() * themes.length) % themes.length];
                var location = locs[Math.floor(rnd() * locs.length) % locs.length];
                var W = 8, H = 4, D = 8;
                var cells = new Array(W * H * D);
                for (var y = 0; y < H; y++) {
                    for (var z = 0; z < D; z++) {
                        for (var x = 0; x < W; x++) {
                            var r = rnd();
                            var v = 0;
                            // Theme-flavoured density, still fully deterministic.
                            if (theme === 'elven_grove') v = r < 0.28 ? 2 : (r < 0.34 ? 3 : 0);
                            else if (theme === 'dwarven_vault') v = r < 0.34 ? 1 : (r < 0.38 ? 4 : 0);
                            else if (theme === 'citadel_darkness') v = r < 0.30 ? 4 : (r < 0.33 ? 1 : 0);
                            else v = r < 0.26 ? 1 : (r < 0.30 ? 2 : 0);
                            cells[(y * D + z) * W + x] = v;
                        }
                    }
                }
                var spawn = {
                    x: Math.floor(rnd() * W),
                    z: Math.floor(rnd() * D),
                    w: Math.floor(rnd() * 4)
                };
                var hole = {
                    x: Math.floor(rnd() * W),
                    z: Math.floor(rnd() * D),
                    w: Math.floor(rnd() * 4)
                };
                return {
                    seed: s,
                    kind: 'dream',
                    theme: theme,
                    location: location,
                    dims: { x: W, y: H, z: D, wSlices: 4 },
                    cells: cells,
                    spawn: spawn,
                    hole: hole
                };
            } catch (_) {
                return { seed: 0, kind: 'dream', theme: 'metallic_ship', location: 'MoonRock', dims: { x: 8, y: 4, z: 8, wSlices: 4 }, cells: [], spawn: { x: 0, z: 0, w: 0 }, hole: { x: 7, z: 7, w: 3 } };
            }
        }

        // -----------------------------------------------------------------
        // putt4D(state, impulse): 4D-golf slice putting.
        // impulse in x/z/w; friction; sliceT(w) hole capture.
        // -----------------------------------------------------------------
        var FRICTION = 0.86;
        var CAPTURE_R = 0.75;
        var W_CAPTURE = 0.5;

        function normVec(v) {
            try {
                return {
                    x: num(v && v.x, 0),
                    z: num(v && v.z, 0),
                    w: num(v && v.w, 0)
                };
            } catch (_) { return { x: 0, z: 0, w: 0 }; }
        }

        function putt4D(state, impulse) {
            try {
                var st = state && typeof state === 'object' ? state : {};
                var pos = normVec(st.pos || { x: 0, z: 0, w: 0 });
                var vel = normVec(st.vel || { x: 0, z: 0, w: 0 });
                var hole = normVec(st.hole || { x: 5, z: 5, w: 2 });
                var strokes = Math.floor(num(st.strokes, 0));
                var holed = !!st.holed;

                var imp = normVec(impulse || {});
                if (!holed) {
                    vel.x += imp.x;
                    vel.z += imp.z;
                    vel.w += imp.w;
                    strokes += 1;
                }

                // Integrate one step with friction.
                vel.x *= FRICTION;
                vel.z *= FRICTION;
                vel.w *= FRICTION;
                // Kill denormal drift.
                if (Math.abs(vel.x) < 1e-6) vel.x = 0;
                if (Math.abs(vel.z) < 1e-6) vel.z = 0;
                if (Math.abs(vel.w) < 1e-6) vel.w = 0;
                pos.x += vel.x;
                pos.z += vel.z;
                pos.w += vel.w;

                // Hole capture: radial distance in x/z plus w-slice gate.
                var holedNow = holed;
                try {
                    var dx = pos.x - hole.x;
                    var dz = pos.z - hole.z;
                    var radial = Math.sqrt(dx * dx + dz * dz);
                    var dw = Math.abs(pos.w - hole.w);
                    if (!holedNow && radial <= CAPTURE_R && dw <= W_CAPTURE) {
                        holedNow = true;
                        pos.x = hole.x; pos.z = hole.z; pos.w = hole.w;
                        vel.x = 0; vel.z = 0; vel.w = 0;
                    }
                } catch (_) { /* capture is best-effort */ }

                var out = {
                    pos: pos,
                    vel: vel,
                    hole: hole,
                    strokes: strokes,
                    holed: holedNow,
                    slice: fallbackSliceT(pos.w)
                };
                // Keep caller objects untouched; write back is caller's choice.
                return out;
            } catch (_) {
                try {
                    return {
                        pos: { x: 0, z: 0, w: 0 },
                        vel: { x: 0, z: 0, w: 0 },
                        hole: { x: 5, z: 5, w: 2 },
                        strokes: 0,
                        holed: false,
                        slice: 0
                    };
                } catch (__) { return null; }
            }
        }

        function sliceView(w) {
            try {
                var wn = num(w, 0);
                var t = fallbackSliceT(wn);
                var label;
                try {
                    if (t < 0.25) label = 'slice-alpha';
                    else if (t < 0.5) label = 'slice-beta';
                    else if (t < 0.75) label = 'slice-gamma';
                    else label = 'slice-delta';
                } catch (_) { label = 'slice-alpha'; }
                return { w: wn, t: t, label: label };
            } catch (_) {
                return { w: 0, t: 0, label: 'slice-alpha' };
            }
        }

        var api = {
            VERSION: VERSION,
            timelines: {
                createTimeline: createTimeline,
                fork: fork,
                rewind: rewind
            },
            dreamWorld: dreamWorld,
            putt4D: putt4D,
            sliceView: sliceView
        };

        try { window.GraveGain4DWorlds = api; } catch (_) { /* ignore */ }

        try {
            window.GraveGainMods = window.GraveGainMods || [];
            window.GraveGainMods.push({ name: MOD_NAME, version: VERSION, init: function () { return api; } });
        } catch (_) { /* registry is best-effort */ }
    } catch (_) { /* never throw on load */ }
})();
