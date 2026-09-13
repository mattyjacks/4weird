/* GraveGain4D math core (agent gg4d-01).
 *
 * Vanilla JS IIFE, idempotent via window.GraveGain4DMath. Never throws:
 * every hook is try/catch guarded. No DOM listeners. No DOM overlays are
 * created by this module (so there is nothing to block input).
 *
 * Canon: same lore as GraveGain2D/3D (LZ crash site -> elven groves ->
 * dwarven vaults). This file is pure 4D math for hypercube golf-putting:
 * the green folds back on itself, putts travel through XW/YW/ZW rotations,
 * and time-travel is just a stroll along +W.
 *
 * 4D-golf inspiration (CodeParade 4D Golf): the playable 3D world is a
 * hyperplane section of the 4D world. sliceT(w) returns that 3D slice.
 */
(function () {
    'use strict';
    try {
        if (window.GraveGain4DMath) return;

        var VERSION = '1.0.0';

        function num(n, fallback) {
            try {
                if (typeof n === 'number' && isFinite(n)) return n;
                var v = parseFloat(n);
                return (isFinite(v)) ? v : fallback;
            } catch (e) { return fallback; }
        }

        /* ================ vec4 ================
         * A 4D vector is { x, y, z, w }. W is ana/kata: the direction
         * the 3D slice slides through. Golf balls live here; renders
         * live in 3D after project4Dto3D.
         */
        function vec4(x, y, z, w) {
            try {
                return {
                    x: num(x, 0),
                    y: num(y, 0),
                    z: num(z, 0),
                    w: num(w, 0)
                };
            } catch (e) { return { x: 0, y: 0, z: 0, w: 0 }; }
        }

        function vec3(x, y, z) {
            try {
                return { x: num(x, 0), y: num(y, 0), z: num(z, 0) };
            } catch (e) { return { x: 0, y: 0, z: 0 }; }
        }

        function vec4add(a, b) {
            try {
                a = a || {}; b = b || {};
                return vec4(num(a.x, 0) + num(b.x, 0), num(a.y, 0) + num(b.y, 0),
                    num(a.z, 0) + num(b.z, 0), num(a.w, 0) + num(b.w, 0));
            } catch (e) { return vec4(0, 0, 0, 0); }
        }

        function vec4sub(a, b) {
            try {
                a = a || {}; b = b || {};
                return vec4(num(a.x, 0) - num(b.x, 0), num(a.y, 0) - num(b.y, 0),
                    num(a.z, 0) - num(b.z, 0), num(a.w, 0) - num(b.w, 0));
            } catch (e) { return vec4(0, 0, 0, 0); }
        }

        function vec4scale(a, s) {
            try {
                a = a || {}; s = num(s, 0);
                return vec4(num(a.x, 0) * s, num(a.y, 0) * s, num(a.z, 0) * s, num(a.w, 0) * s);
            } catch (e) { return vec4(0, 0, 0, 0); }
        }

        function vec4dot(a, b) {
            try {
                a = a || {}; b = b || {};
                return num(a.x, 0) * num(b.x, 0) + num(a.y, 0) * num(b.y, 0) +
                    num(a.z, 0) * num(b.z, 0) + num(a.w, 0) * num(b.w, 0);
            } catch (e) { return 0; }
        }

        function vec4length(a) {
            try {
                var d = vec4dot(a, a);
                return (d > 0) ? Math.sqrt(d) : 0;
            } catch (e) { return 0; }
        }

        function vec4norm(a) {
            try {
                var len = vec4length(a);
                if (!(len > 1e-9)) return vec4(0, 0, 0, 0);
                return vec4scale(a, 1 / len);
            } catch (e) { return vec4(0, 0, 0, 0); }
        }

        /* ================ mat4 ================
         * Row-major 4x4 stored as a flat 16-array:
         *   m[r * 4 + c]. Identity is the still dream; multiply composes
         * rotations so the hypercube tumbles without tearing.
         */
        function mat4(m) {
            try {
                if (m && typeof m.length === 'number' && m.length === 16) {
                    var out = [];
                    for (var i = 0; i < 16; i++) out.push(num(m[i], 0));
                    return out;
                }
                return mat4identity();
            } catch (e) { return mat4identity(); }
        }

        function mat4identity() {
            try {
                return [1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        0, 0, 0, 1];
            } catch (e) {
                return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
            }
        }

        function mat4mul(a, b) {
            try {
                a = mat4(a); b = mat4(b);
                var out = [];
                for (var r = 0; r < 4; r++) {
                    for (var c = 0; c < 4; c++) {
                        var s = 0;
                        for (var k = 0; k < 4; k++) s += a[r * 4 + k] * b[k * 4 + c];
                        out.push(s);
                    }
                }
                return out;
            } catch (e) { return mat4identity(); }
        }

        function mat4apply(m, v) {
            try {
                m = mat4(m); v = v || {};
                var p = [num(v.x, 0), num(v.y, 0), num(v.z, 0), num(v.w, 0)];
                var o = [0, 0, 0, 0];
                for (var r = 0; r < 4; r++) {
                    o[r] = m[r * 4 + 0] * p[0] + m[r * 4 + 1] * p[1] +
                           m[r * 4 + 2] * p[2] + m[r * 4 + 3] * p[3];
                }
                return vec4(o[0], o[1], o[2], o[3]);
            } catch (e) { return vec4(0, 0, 0, 0); }
        }

        /* ================ XW / YW / ZW rotations ================
         * 4D rotations spin a 3D axis against W. A putt aimed +X with a
         * little XW curls ana-ward and re-enters the slice further along,
         * which reads in 3D as the ball folding through itself. Dream it
         * as turning the page the green is printed on.
         */
        function rotXW(angle) {
            try {
                var c = Math.cos(num(angle, 0)), s = Math.sin(num(angle, 0));
                return [c, 0, 0, -s,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        s, 0, 0, c];
            } catch (e) { return mat4identity(); }
        }

        function rotYW(angle) {
            try {
                var c = Math.cos(num(angle, 0)), s = Math.sin(num(angle, 0));
                return [1, 0, 0, 0,
                        0, c, 0, -s,
                        0, 0, 1, 0,
                        0, s, 0, c];
            } catch (e) { return mat4identity(); }
        }

        function rotZW(angle) {
            try {
                var c = Math.cos(num(angle, 0)), s = Math.sin(num(angle, 0));
                return [1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, c, -s,
                        0, 0, s, c];
            } catch (e) { return mat4identity(); }
        }

        /* ================ 4D -> 3D projection ================
         * Perspective divide with w-distance: the 4D camera sits at
         * w = +wDist looking toward -W. Scale factor s = wDist / (wDist - w)
         * inflates ana-side geometry and shrinks kata-side geometry, so
         * hypercube putts swell as they approach our slice. Clamped, so a
         * ball never divides by zero even when it kisses the camera.
         */
        function project4Dto3D(v, wDist) {
            try {
                v = v || {};
                var d = num(wDist, 4);
                if (!(d > 0.0001)) d = 4;
                var w = num(v.w, 0);
                var denom = d - w;
                var lo = d * 0.05; /* never let the dream pop */
                if (denom < lo) denom = lo;
                if (denom > d * 4) denom = d * 4;
                var s = d / denom;
                return vec3(num(v.x, 0) * s, num(v.y, 0) * s, num(v.z, 0) * s);
            } catch (e) { return vec3(0, 0, 0); }
        }

        function projectList(points, wDist) {
            try {
                var arr = (points && points.length) ? points : [];
                var out = [];
                for (var i = 0; i < arr.length; i++) out.push(project4Dto3D(arr[i], wDist));
                return out;
            } catch (e) { return []; }
        }

        /* ================ tesseract ================
         * The 16 corners of the hypercube green, (±half, ±half, ±half,
         * ±half). Index bit i picks the sign of axis i (x=1, y=2, z=4,
         * w=8): corner 0 is (-,-,-,-), corner 15 is (+,+,+,+). Edges join
         * corners one bit apart: 32 rails the ball can roll along.
         */
        function tesseractVertices(half) {
            try {
                var h = num(half, 1);
                if (!(h > 0)) h = 1;
                var verts = [];
                for (var i = 0; i < 16; i++) {
                    verts.push(vec4(
                        (i & 1) ? h : -h,
                        (i & 2) ? h : -h,
                        (i & 4) ? h : -h,
                        (i & 8) ? h : -h
                    ));
                }
                return verts;
            } catch (e) { return []; }
        }

        function tesseractEdges() {
            try {
                var edges = [];
                for (var a = 0; a < 16; a++) {
                    for (var bit = 0; bit < 4; bit++) {
                        var b = a ^ (1 << bit);
                        if (b > a) edges.push([a, b]);
                    }
                }
                return edges;
            } catch (e) { return []; }
        }

        /* ================ dream-smooth interpolation ================
         * foldBlend(a, b, t): vectors folding onto themselves. Plain lerp
         * snaps; dreams never snap, so t is eased with smootherstep
         * (t*t*t*(t*(t*6-15)+10)): zero velocity at both ends, the putt
         * sighs to rest instead of clicking into place. t is clamped to
         * [0, 1]; time-travel scrubbing just walks t back and forth.
         */
        function clamp01(t) {
            try {
                t = num(t, 0);
                if (t < 0) return 0;
                if (t > 1) return 1;
                return t;
            } catch (e) { return 0; }
        }

        function smootherstep(t) {
            try {
                t = clamp01(t);
                return t * t * t * (t * (t * 6 - 15) + 10);
            } catch (e) { return 0; }
        }

        function dreamLerp(a, b, t) {
            try { return num(a, 0) + (num(b, 0) - num(a, 0)) * smootherstep(t); }
            catch (e) { return 0; }
        }

        function foldBlend(a, b, t) {
            try {
                a = a || {}; b = b || {};
                var e = smootherstep(t);
                return vec4(
                    num(a.x, 0) + (num(b.x, 0) - num(a.x, 0)) * e,
                    num(a.y, 0) + (num(b.y, 0) - num(a.y, 0)) * e,
                    num(a.z, 0) + (num(b.z, 0) - num(a.z, 0)) * e,
                    num(a.w, 0) + (num(b.w, 0) - num(a.w, 0)) * e
                );
            } catch (e) { return vec4(0, 0, 0, 0); }
        }

        /* ================ sliceT(w): the 3D section ================
         * CodeParade 4D Golf rule: you never see 4D, you see the 3D
         * hyperplane slice at w. sliceT(w) returns the playable section:
         * every tesseract edge crossing the hyperplane contributes one 3D
         * point (linear ana/kata crossing), plus the slice descriptor.
         * Slide w and the slice morphs cube -> truncated wonders -> cube:
         * that morph IS the time-travel fairway folding open.
         *
         * Signature is forgiving: sliceT(w[, half[, verts[, edges]]]).
         * Defaults build a unit tesseract, so sliceT(0) just works.
         */
        function sliceT(w, half, verts, edges) {
            try {
                var w0 = num(w, 0);
                var h = num(half, 1);
                if (!(h > 0)) h = 1;
                var vs = (verts && verts.length === 16) ? verts : tesseractVertices(h);
                var es = (edges && edges.length) ? edges : tesseractEdges();
                var pts = [];
                for (var i = 0; i < es.length; i++) {
                    try {
                        var a = vs[es[i][0]], b = vs[es[i][1]];
                        if (!a || !b) continue;
                        var wa = num(a.w, 0), wb = num(b.w, 0);
                        var lo = (wa < wb) ? wa : wb;
                        var hi = (wa > wb) ? wa : wb;
                        if (w0 < lo || w0 > hi) continue;
                        var span = wb - wa;
                        var t = (Math.abs(span) < 1e-9) ? 0 : (w0 - wa) / span;
                        if (t < 0) t = 0;
                        if (t > 1) t = 1;
                        pts.push(vec3(
                            num(a.x, 0) + (num(b.x, 0) - num(a.x, 0)) * t,
                            num(a.y, 0) + (num(b.y, 0) - num(a.y, 0)) * t,
                            num(a.z, 0) + (num(b.z, 0) - num(a.z, 0)) * t
                        ));
                    } catch (inner) { /* skip bad edge, keep dreaming */ }
                }
                return { w: w0, half: h, points: pts };
            } catch (e) { return { w: 0, half: 1, points: [] }; }
        }

        var api = null;
        try {
            api = {
                VERSION: VERSION,
                vec4: vec4,
                vec3: vec3,
                vec4add: vec4add,
                vec4sub: vec4sub,
                vec4scale: vec4scale,
                vec4dot: vec4dot,
                vec4length: vec4length,
                vec4norm: vec4norm,
                mat4: mat4,
                mat4identity: mat4identity,
                mat4mul: mat4mul,
                mat4apply: mat4apply,
                rotXW: rotXW,
                rotYW: rotYW,
                rotZW: rotZW,
                project4Dto3D: project4Dto3D,
                projectList: projectList,
                tesseractVertices: tesseractVertices,
                tesseractEdges: tesseractEdges,
                foldBlend: foldBlend,
                smootherstep: smootherstep,
                dreamLerp: dreamLerp,
                clamp01: clamp01,
                sliceT: sliceT
            };
        } catch (e) { api = { VERSION: '1.0.0' }; }

        try { window.GraveGain4DMath = api; } catch (e) { /* ignore */ }

        try {
            if (!window.GraveGainMods) window.GraveGainMods = [];
            window.GraveGainMods.push({ name: 'gravegain4d-math' });
        } catch (e) { /* ignore */ }
    } catch (e) { /* never throw: math core stays silent */ }
})();
