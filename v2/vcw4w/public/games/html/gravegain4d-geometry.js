/* GraveGain4D hypercube geometry engine (agent g4d2-02).
 *
 * Vanilla JS IIFE, idempotent via window.GraveGain4DGeometry. Never throws:
 * every hook is try/catch guarded. No DOM listeners. No DOM overlays are
 * created by this module. Pure math only: no BoxGeometry, no renderer fork,
 * no scene graph — the integrator feeds these vertices/segments into the
 * existing GraveGainGraphics3D / GraveGain3DModels path by reference.
 *
 * Canon: same lore as GraveGain2D/3D (LZ crash site -> elven groves ->
 * dwarven vaults). This file is the tesseract workbench for hypercube
 * golf-putting: the green folds back on itself, putts travel through
 * XW/YW/ZW rotations, and time-travel is just a stroll along +W (ana).
 *
 * Contents:
 *   - tesseract vertex/edge generator (16 corners, 32 rails)
 *   - 4D rotation matrices for all six planes (XY, XZ, XW, YZ, YW, ZW)
 *   - 4D-to-3D perspective projection with w-distance
 *   - W-slice hyperplane renderer (line segments for a given w)
 *   - hypersphere SDF helpers (S3: the 4D golf ball's dream-shell)
 *   - ana/kata direction helpers (+W is ana, -W is kata)
 */
(function () {
    'use strict';
    try {
        if (window.GraveGain4DGeometry) return;

        var VERSION = '1.0.0';

        function num(n, fallback) {
            try {
                if (typeof n === 'number' && isFinite(n)) return n;
                var v = parseFloat(n);
                return (isFinite(v)) ? v : fallback;
            } catch (e) { return fallback; }
        }

        function vec4(x, y, z, w) {
            try {
                return { x: num(x, 0), y: num(y, 0), z: num(z, 0), w: num(w, 0) };
            } catch (e) { return { x: 0, y: 0, z: 0, w: 0 }; }
        }

        function vec3(x, y, z) {
            try {
                return { x: num(x, 0), y: num(y, 0), z: num(z, 0) };
            } catch (e) { return { x: 0, y: 0, z: 0 }; }
        }

        /* ================ tesseract ================
         * The 16 corners of the hypercube green, (+/-half)^4. Index bit i
         * picks the sign of axis i (x=1, y=2, z=4, w=8): corner 0 is
         * (-,-,-,-), corner 15 is (+,+,+,+). Edges join corners one bit
         * apart: 32 rails the ball can roll along.
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

        function tesseract(half) {
            try {
                return { vertices: tesseractVertices(half), edges: tesseractEdges() };
            } catch (e) { return { vertices: [], edges: [] }; }
        }

        /* ================ 4D rotation matrices ================
         * Row-major 4x4 stored as a flat 16-array: m[r * 4 + c]. Six planes
         * span SO(4): XY/XZ/YZ tumble the visible cube, XW/YW/ZW curl putts
         * ana-ward through the slice. Each is the identity with one cos/sin
         * block on its plane; composing them tumbles the hypercube whole.
         */
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

        function mat4(m) {
            try {
                if (m && typeof m.length === 'number' && m.length === 16) {
                    var out = [];
                    for (var i = 0; i < 16; i++) out.push(num(m[i], i % 5 === 0 ? 1 : 0));
                    return out;
                }
                return mat4identity();
            } catch (e) { return mat4identity(); }
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

        /* Plane rotation builder: axes (i, j) get the cos/-sin/sin/cos block.
         * Axis order is x=0, y=1, z=2, w=3.
         */
        function rotPlane(i, j, angle) {
            try {
                var c = Math.cos(num(angle, 0)), s = Math.sin(num(angle, 0));
                var m = mat4identity();
                m[i * 4 + i] = c;  m[i * 4 + j] = -s;
                m[j * 4 + i] = s;  m[j * 4 + j] = c;
                return m;
            } catch (e) { return mat4identity(); }
        }

        function rotXY(angle) { try { return rotPlane(0, 1, angle); } catch (e) { return mat4identity(); } }
        function rotXZ(angle) { try { return rotPlane(0, 2, angle); } catch (e) { return mat4identity(); } }
        function rotXW(angle) { try { return rotPlane(0, 3, angle); } catch (e) { return mat4identity(); } }
        function rotYZ(angle) { try { return rotPlane(1, 2, angle); } catch (e) { return mat4identity(); } }
        function rotYW(angle) { try { return rotPlane(1, 3, angle); } catch (e) { return mat4identity(); } }
        function rotZW(angle) { try { return rotPlane(2, 3, angle); } catch (e) { return mat4identity(); } }

        var PLANES = ['XY', 'XZ', 'XW', 'YZ', 'YW', 'ZW'];

        function rotationMatrix(plane, angle) {
            try {
                var p = String(plane || '').toUpperCase();
                if (p === 'XY') return rotXY(angle);
                if (p === 'XZ') return rotXZ(angle);
                if (p === 'XW') return rotXW(angle);
                if (p === 'YZ') return rotYZ(angle);
                if (p === 'YW') return rotYW(angle);
                if (p === 'ZW') return rotZW(angle);
                return mat4identity();
            } catch (e) { return mat4identity(); }
        }

        /* composeRotations(steps): steps are { plane, angle } pairs or raw
         * 16-arrays. Applied left to right: the first step touches the ball
         * first (out = last * ... * first). Dreams compose; they never tear.
         */
        function composeRotations(steps) {
            try {
                var out = mat4identity();
                var arr = (steps && steps.length) ? steps : [];
                for (var i = 0; i < arr.length; i++) {
                    var step = arr[i];
                    var m = null;
                    try {
                        if (step && typeof step.length === 'number' && step.length === 16) {
                            m = mat4(step);
                        } else if (step && step.plane) {
                            m = rotationMatrix(step.plane, step.angle);
                        } else { continue; }
                    } catch (inner) { continue; }
                    out = mat4mul(m, out);
                }
                return out;
            } catch (e) { return mat4identity(); }
        }

        function rotateVertices(verts, m) {
            try {
                var arr = (verts && verts.length) ? verts : [];
                var out = [];
                for (var i = 0; i < arr.length; i++) out.push(mat4apply(m, arr[i]));
                return out;
            } catch (e) { return []; }
        }

        /* ================ 4D -> 3D projection ================
         * Perspective divide with w-distance: the 4D camera sits at
         * w = +wDist looking toward -W. Scale s = wDist / (wDist - w)
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

        function projectVertices(verts, m, wDist) {
            try {
                return projectList(rotateVertices(verts, m), wDist);
            } catch (e) { return []; }
        }

        /* ================ W-slice hyperplane renderer ================
         * The playable 3D world is the hyperplane section at w. A tesseract
         * has 8 cubic cells (axis k fixed at +/-half); each cell crossing
         * the hyperplane contributes a convex polygon, and each polygon edge
         * is one line segment. Slide w and the slice morphs cube ->
         * truncated wonders -> cube: that morph IS the fairway folding open.
         *
         * sliceSegments(w[, half[, verts[, edges]]]) returns
         *   [{ a: {x,y,z}, b: {x,y,z} }, ...]
         * in plain 3D (w is constant across the slice, so it is dropped).
         * slicePoints(w, ...) returns the unordered crossing points, matching
         * the GraveGain4DMath sliceT vocabulary for the integrator.
         */
        function edgeCrossing(a, b, w0) {
            try {
                if (!a || !b) return null;
                var wa = num(a.w, 0), wb = num(b.w, 0);
                var lo = (wa < wb) ? wa : wb;
                var hi = (wa > wb) ? wa : wb;
                if (w0 < lo || w0 > hi) return null;
                var span = wb - wa;
                var t = (Math.abs(span) < 1e-9) ? 0 : (w0 - wa) / span;
                if (t < 0) t = 0;
                if (t > 1) t = 1;
                return vec3(
                    num(a.x, 0) + (num(b.x, 0) - num(a.x, 0)) * t,
                    num(a.y, 0) + (num(b.y, 0) - num(a.y, 0)) * t,
                    num(a.z, 0) + (num(b.z, 0) - num(a.z, 0)) * t
                );
            } catch (e) { return null; }
        }

        /* The 12 edges of one cubic cell: cell fixes axis k at one sign, so
         * its corners vary the other three bits; edges join corners one bit
         * apart within that 3-bit subspace.
         */
        function cellEdges(k, signBit) {
            try {
                var corners = [];
                for (var i = 0; i < 16; i++) {
                    var bit = (i >> k) & 1;
                    if (bit === signBit) corners.push(i);
                }
                var edges = [];
                for (var a = 0; a < corners.length; a++) {
                    for (var j = 0; j < 4; j++) {
                        if (j === k) continue;
                        var b = corners[a] ^ (1 << j);
                        if (b > corners[a]) edges.push([corners[a], b]);
                    }
                }
                return edges;
            } catch (e) { return []; }
        }

        function orderPolygon(points) {
            try {
                var pts = (points && points.length) ? points.slice() : [];
                if (pts.length < 3) return pts;
                /* Centroid + Newell normal, then sort by angle in the plane. */
                var cx = 0, cy = 0, cz = 0, n = pts.length;
                for (var i = 0; i < n; i++) {
                    cx += num(pts[i].x, 0); cy += num(pts[i].y, 0); cz += num(pts[i].z, 0);
                }
                cx /= n; cy /= n; cz /= n;
                var nx = 0, ny = 0, nz = 0;
                for (var j = 0; j < n; j++) {
                    var p = pts[j], q = pts[(j + 1) % n];
                    var px = num(p.x, 0), py = num(p.y, 0), pz = num(p.z, 0);
                    var qx = num(q.x, 0), qy = num(q.y, 0), qz = num(q.z, 0);
                    nx += (py - cy) * (qz - cz) - (pz - cz) * (qy - cy);
                    ny += (pz - cz) * (qx - cx) - (px - cx) * (qz - cz);
                    nz += (px - cx) * (qy - cy) - (py - cy) * (qx - cx);
                }
                var nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
                if (!(nl > 1e-9)) return pts;
                nx /= nl; ny /= nl; nz /= nl;
                /* Basis: pick a helper not parallel to the normal. */
                var hx = 0, hy = 0, hz = 1;
                if (Math.abs(nz) > 0.9) { hx = 0; hy = 1; hz = 0; }
                var ux = hy * nz - hz * ny, uy = hz * nx - hx * nz, uz = hx * ny - hy * nx;
                var ul = Math.sqrt(ux * ux + uy * uy + uz * uz);
                if (!(ul > 1e-9)) return pts;
                ux /= ul; uy /= ul; uz /= ul;
                var vx = ny * uz - nz * uy, vy = nz * ux - nx * uz, vz = nx * uy - ny * ux;
                var tagged = [];
                for (var m = 0; m < n; m++) {
                    var dx = num(pts[m].x, 0) - cx,
                        dy = num(pts[m].y, 0) - cy,
                        dz = num(pts[m].z, 0) - cz;
                    tagged.push({ p: pts[m], a: Math.atan2(dx * vx + dy * vy + dz * vz, dx * ux + dy * uy + dz * uz) });
                }
                tagged.sort(function (s, t) { return s.a - t.a; });
                var ordered = [];
                for (var o = 0; o < tagged.length; o++) ordered.push(tagged[o].p);
                return ordered;
            } catch (e) { return (points && points.length) ? points.slice() : []; }
        }

        function sliceSegments(w, half, verts, edges) {
            try {
                var w0 = num(w, 0);
                var h = num(half, 1);
                if (!(h > 0)) h = 1;
                var vs = (verts && verts.length === 16) ? verts : tesseractVertices(h);
                void edges; /* cells derive their own edges; param kept for sliceT parity */
                var segments = [];
                for (var k = 0; k < 4; k++) {
                    for (var s = 0; s < 2; s++) {
                        try {
                            var cell = cellEdges(k, s);
                            var pts = [];
                            for (var i = 0; i < cell.length; i++) {
                                var hit = edgeCrossing(vs[cell[i][0]], vs[cell[i][1]], w0);
                                if (hit) pts.push(hit);
                            }
                            if (pts.length < 2) continue;
                            if (pts.length === 2) {
                                segments.push({ a: pts[0], b: pts[1] });
                                continue;
                            }
                            var ring = orderPolygon(pts);
                            for (var j = 0; j < ring.length; j++) {
                                segments.push({ a: ring[j], b: ring[(j + 1) % ring.length] });
                            }
                        } catch (inner) { /* skip bad cell, keep dreaming */ }
                    }
                }
                return segments;
            } catch (e) { return []; }
        }

        function slicePoints(w, half, verts, edges) {
            try {
                var w0 = num(w, 0);
                var h = num(half, 1);
                if (!(h > 0)) h = 1;
                var vs = (verts && verts.length === 16) ? verts : tesseractVertices(h);
                var es = (edges && edges.length) ? edges : tesseractEdges();
                var pts = [];
                for (var i = 0; i < es.length; i++) {
                    var hit = edgeCrossing(vs[es[i][0]], vs[es[i][1]], w0);
                    if (hit) pts.push(hit);
                }
                return pts;
            } catch (e) { return []; }
        }

        /* ================ hypersphere SDF helpers ================
         * S3 is the 3-sphere shell: center {x,y,z,w}, radius r. The signed
         * distance field dreams the golf ball as a shell of intent — negative
         * inside, zero on the skin, positive out in the rough. All helpers
         * accept partial centers (missing axes default to 0).
         */
        function hypersphereSDF(p, center, radius) {
            try {
                p = p || {}; center = center || {};
                var r = num(radius, 1);
                if (!(r >= 0)) r = 1;
                var dx = num(p.x, 0) - num(center.x, 0);
                var dy = num(p.y, 0) - num(center.y, 0);
                var dz = num(p.z, 0) - num(center.z, 0);
                var dw = num(p.w, 0) - num(center.w, 0);
                return Math.sqrt(dx * dx + dy * dy + dz * dz + dw * dw) - r;
            } catch (e) { return 0; }
        }

        function hypersphereNormal(p, center) {
            try {
                p = p || {}; center = center || {};
                var d = vec4(
                    num(p.x, 0) - num(center.x, 0),
                    num(p.y, 0) - num(center.y, 0),
                    num(p.z, 0) - num(center.z, 0),
                    num(p.w, 0) - num(center.w, 0)
                );
                var len = Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z + d.w * d.w);
                if (!(len > 1e-9)) return vec4(1, 0, 0, 0);
                return vec4(d.x / len, d.y / len, d.z / len, d.w / len);
            } catch (e) { return vec4(1, 0, 0, 0); }
        }

        function hypersphereContains(p, center, radius) {
            try {
                return hypersphereSDF(p, center, radius) <= 0;
            } catch (e) { return false; }
        }

        /* Segment-vs-hypersphere: returns { hit, t0, t1 } with t in [0, 1]
         * along a -> b, or { hit: false } on a clean miss. A putt line that
         * clips the dream-shell reports where it enters and leaves.
         */
        function hypersphereIntersectSegment(a, b, center, radius) {
            try {
                a = a || {}; b = b || {}; center = center || {};
                var r = num(radius, 1);
                if (!(r >= 0)) r = 1;
                var dx = num(b.x, 0) - num(a.x, 0);
                var dy = num(b.y, 0) - num(a.y, 0);
                var dz = num(b.z, 0) - num(a.z, 0);
                var dw = num(b.w, 0) - num(a.w, 0);
                var ox = num(a.x, 0) - num(center.x, 0);
                var oy = num(a.y, 0) - num(center.y, 0);
                var oz = num(a.z, 0) - num(center.z, 0);
                var ow = num(a.w, 0) - num(center.w, 0);
                var A = dx * dx + dy * dy + dz * dz + dw * dw;
                if (!(A > 1e-12)) {
                    var inside = (ox * ox + oy * oy + oz * oz + ow * ow) <= r * r;
                    return inside ? { hit: true, t0: 0, t1: 0 } : { hit: false };
                }
                var B = 2 * (ox * dx + oy * dy + oz * dz + ow * dw);
                var C = ox * ox + oy * oy + oz * oz + ow * ow - r * r;
                var disc = B * B - 4 * A * C;
                if (!(disc >= 0)) return { hit: false };
                var sq = Math.sqrt(disc);
                var t0 = (-B - sq) / (2 * A), t1 = (-B + sq) / (2 * A);
                if (t1 < 0 || t0 > 1) return { hit: false };
                if (t0 < 0) t0 = 0;
                if (t1 > 1) t1 = 1;
                return { hit: true, t0: t0, t1: t1 };
            } catch (e) { return { hit: false }; }
        }

        /* ================ ana / kata direction helpers ================
         * +W is ana (the way the slice slides when time-travels forward),
         * -W is kata (back where the putt already rested). Helpers speak in
         * unit vec4 so putts can step sideways through the green's dream.
         */
        function anaDirection() {
            try { return vec4(0, 0, 0, 1); }
            catch (e) { return { x: 0, y: 0, z: 0, w: 1 }; }
        }

        function kataDirection() {
            try { return vec4(0, 0, 0, -1); }
            catch (e) { return { x: 0, y: 0, z: 0, w: -1 }; }
        }

        function anaKataAxis(sign) {
            try {
                return (num(sign, 1) >= 0) ? anaDirection() : kataDirection();
            } catch (e) { return vec4(0, 0, 0, 1); }
        }

        function slideW(v, delta) {
            try {
                v = v || {};
                return vec4(num(v.x, 0), num(v.y, 0), num(v.z, 0), num(v.w, 0) + num(delta, 0));
            } catch (e) { return vec4(0, 0, 0, 0); }
        }

        /* wSide(w[, eps]): which side of the playable slice is this w on?
         * Returns 'ana' (above), 'kata' (below), or 'slice' (on it).
         */
        function wSide(w, eps) {
            try {
                var w0 = num(w, 0), e = num(eps, 1e-6);
                if (!(e > 0)) e = 1e-6;
                if (w0 > e) return 'ana';
                if (w0 < -e) return 'kata';
                return 'slice';
            } catch (e2) { return 'slice'; }
        }

        var api = null;
        try {
            api = {
                VERSION: VERSION,
                PLANES: PLANES.slice(),
                tesseractVertices: tesseractVertices,
                tesseractEdges: tesseractEdges,
                tesseract: tesseract,
                mat4: mat4,
                mat4identity: mat4identity,
                mat4mul: mat4mul,
                mat4apply: mat4apply,
                rotXY: rotXY,
                rotXZ: rotXZ,
                rotXW: rotXW,
                rotYZ: rotYZ,
                rotYW: rotYW,
                rotZW: rotZW,
                rotationMatrix: rotationMatrix,
                composeRotations: composeRotations,
                rotateVertices: rotateVertices,
                project4Dto3D: project4Dto3D,
                projectList: projectList,
                projectVertices: projectVertices,
                sliceSegments: sliceSegments,
                slicePoints: slicePoints,
                hypersphereSDF: hypersphereSDF,
                hypersphereNormal: hypersphereNormal,
                hypersphereContains: hypersphereContains,
                hypersphereIntersectSegment: hypersphereIntersectSegment,
                anaDirection: anaDirection,
                kataDirection: kataDirection,
                anaKataAxis: anaKataAxis,
                slideW: slideW,
                wSide: wSide,
                vec4: vec4,
                vec3: vec3
            };
        } catch (e) { api = { VERSION: '1.0.0' }; }

        try { window.GraveGain4DGeometry = api; } catch (e) { /* ignore */ }

        try {
            if (!window.GraveGainMods) window.GraveGainMods = [];
            window.GraveGainMods.push({ name: 'gravegain4d-geometry' });
        } catch (e) { /* ignore */ }
    } catch (e) { /* never throw: geometry engine stays silent */ }
})();
