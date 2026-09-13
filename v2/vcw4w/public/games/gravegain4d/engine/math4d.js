(function (global) {
    'use strict';
    // GraveGain4DMath (flat API) — idempotent augment over 4d-engine.js.
    // If window.GraveGain4DMath already exists (rich Vec4/Mat4 API), we keep
    // every existing key and only fill in the flat helpers this lane needs.
    // Zero deps, plain script, fail-open (never throws on bad input).
    function toFinite(v, fb) {
        var f = (typeof fb === 'number' && isFinite(fb)) ? fb : 0;
        var n = (typeof v === 'number') ? v : parseFloat(v);
        return isFinite(n) ? n : f;
    }
    function toV(p) {
        try {
            if (p == null) return { x: 0, y: 0, z: 0, w: 0 };
            if (typeof p === 'object' && typeof p.length === 'number' && !('x' in p)) {
                return { x: toFinite(p[0], 0), y: toFinite(p[1], 0), z: toFinite(p[2], 0), w: toFinite(p[3], 0) };
            }
            if (typeof p === 'object') {
                return { x: toFinite(p.x, 0), y: toFinite(p.y, 0), z: toFinite(p.z, 0), w: toFinite(p.w, 0) };
            }
        } catch (_) { /* fall through */ }
        return { x: 0, y: 0, z: 0, w: 0 };
    }
    function toMat(m) {
        var id = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
        try {
            if (m != null && typeof m.length === 'number' && m.length >= 16) {
                var out = new Array(16);
                for (var i = 0; i < 16; i++) out[i] = toFinite(m[i], (i % 5 === 0) ? 1 : 0);
                return out;
            }
        } catch (_) { /* fall through */ }
        return id;
    }
    function v4(x, y, z, w) {
        return { x: toFinite(x, 0), y: toFinite(y, 0), z: toFinite(z, 0), w: toFinite(w, 0) };
    }
    function add4(a, b) { var A = toV(a), B = toV(b); return { x: A.x + B.x, y: A.y + B.y, z: A.z + B.z, w: A.w + B.w }; }
    function sub4(a, b) { var A = toV(a), B = toV(b); return { x: A.x - B.x, y: A.y - B.y, z: A.z - B.z, w: A.w - B.w }; }
    function scale4(v, s) { var V = toV(v), S = toFinite(s, 0); return { x: V.x * S, y: V.y * S, z: V.z * S, w: V.w * S }; }
    function dot4(a, b) { var A = toV(a), B = toV(b); return A.x * B.x + A.y * B.y + A.z * B.z + A.w * B.w; }
    function len4(v) { var V = toV(v); var l = Math.sqrt(V.x * V.x + V.y * V.y + V.z * V.z + V.w * V.w); return isFinite(l) ? l : 0; }
    function norm4(v) {
        var V = toV(v);
        var l = Math.sqrt(V.x * V.x + V.y * V.y + V.z * V.z + V.w * V.w);
        if (!isFinite(l) || l < 1e-12) return { x: 0, y: 0, z: 0, w: 0 };
        return { x: V.x / l, y: V.y / l, z: V.z / l, w: V.w / l };
    }
    function clampIdx(n, fb) {
        var v = Math.floor(toFinite(n, fb));
        if (!isFinite(v)) return fb;
        if (v < 0) return 0;
        if (v > 3) return 3;
        return v;
    }
    function rotatePlane(p, i, j, angle) {
        var V = toV(p);
        try {
            var ai = clampIdx(i, 0), aj = clampIdx(j, 1);
            var a = toFinite(angle, 0);
            if (!isFinite(a) || ai === aj) return V;
            var arr = [V.x, V.y, V.z, V.w];
            var c = Math.cos(a), s = Math.sin(a);
            if (!isFinite(c) || !isFinite(s)) return V;
            var u = arr[ai], q = arr[aj];
            arr[ai] = u * c - q * s;
            arr[aj] = u * s + q * c;
            return { x: arr[0], y: arr[1], z: arr[2], w: arr[3] };
        } catch (_) { return V; }
    }
    function rotXY(p, a) { return rotatePlane(p, 0, 1, a); }
    function rotXZ(p, a) { return rotatePlane(p, 0, 2, a); }
    function rotXW(p, a) { return rotatePlane(p, 0, 3, a); }
    function rotYW(p, a) { return rotatePlane(p, 1, 3, a); }
    function rotZW(p, a) { return rotatePlane(p, 2, 3, a); }
    function rotYZ(p, a) { return rotatePlane(p, 1, 2, a); }
    var mat4 = {
        identity: function () { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; },
        mul: function (a, b) {
            var A = toMat(a), B = toMat(b);
            var out = new Array(16);
            try {
                for (var r = 0; r < 4; r++) {
                    for (var c = 0; c < 4; c++) {
                        var sum = 0;
                        for (var k = 0; k < 4; k++) sum += A[r * 4 + k] * B[k * 4 + c];
                        out[r * 4 + c] = isFinite(sum) ? sum : 0;
                    }
                }
                return out;
            } catch (_) { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
        },
        apply: function (m, v) {
            var M = toMat(m), V = toV(v);
            try {
                var arr = [V.x, V.y, V.z, V.w], o = [0, 0, 0, 0];
                for (var r = 0; r < 4; r++) {
                    var s = 0;
                    for (var c = 0; c < 4; c++) s += M[r * 4 + c] * arr[c];
                    o[r] = isFinite(s) ? s : 0;
                }
                return { x: o[0], y: o[1], z: o[2], w: o[3] };
            } catch (_) { return { x: 0, y: 0, z: 0, w: 0 }; }
        }
    };
    // Perspective divide on (w - cam.w). cam may be a number (camW),
    // an object {w, dist}, or null (defaults w=0, dist=3).
    function project(p4, cam) {
        var P = toV(p4);
        var camW = 0, dist = 3;
        try {
            if (typeof cam === 'number') camW = toFinite(cam, 0);
            else if (cam != null && typeof cam === 'object') {
                if ('w' in cam) camW = toFinite(cam.w, 0);
                if ('dist' in cam) dist = toFinite(cam.dist, 3);
                if ('distance' in cam) dist = toFinite(cam.distance, dist);
                if ('wDistance' in cam) dist = toFinite(cam.wDistance, dist);
            }
        } catch (_) { /* defaults */ }
        if (!isFinite(dist) || dist <= 0.0001) dist = 3;
        if (!isFinite(camW)) camW = 0;
        try {
            var dw = P.w - camW;
            var denom = dist - dw;
            if (!isFinite(denom) || Math.abs(denom) < 1e-6) denom = (denom < 0) ? -1e-6 : 1e-6;
            var s = dist / denom;
            if (!isFinite(s)) s = 1;
            if (s > 8) s = 8;
            if (s < -8) s = -8;
            return { x: P.x * s, y: P.y * s, z: P.z * s, scale: s, wDepth: dw };
        } catch (_) { return { x: 0, y: 0, z: 0, scale: 1, wDepth: 0 }; }
    }
    function coordOf(idx, axis) { return (idx & (1 << axis)) ? 1 : -1; }
    function tesseract(size) {
        var s = toFinite(size, 1);
        if (!isFinite(s) || s <= 0) s = 1;
        if (s > 1000) s = 1000;
        try {
            var verts16 = [];
            for (var i = 0; i < 16; i++) {
                verts16.push({ x: coordOf(i, 0) * s, y: coordOf(i, 1) * s, z: coordOf(i, 2) * s, w: coordOf(i, 3) * s });
            }
            var edges32 = [];
            for (var a = 0; a < 16; a++) {
                for (var b = 0; b < 4; b++) {
                    var j = a ^ (1 << b);
                    if (j > a) edges32.push([a, j]);
                }
            }
            // 8 cubic cells: for each axis (0..3) x side (-1,+1), the 8 verts
            // pinned to that side form a cube.
            var cells8 = [];
            for (var ax = 0; ax < 4; ax++) {
                for (var sd = 0; sd < 2; sd++) {
                    var want = (sd === 1) ? 1 : -1;
                    var cell = [];
                    for (var v = 0; v < 16; v++) {
                        if (coordOf(v, ax) === want) cell.push(v);
                    }
                    cells8.push(cell);
                }
            }
            return { verts16: verts16, edges32: edges32, cells8: cells8 };
        } catch (_) { return { verts16: [], edges32: [], cells8: [] }; }
    }
    // 4D-golf putt physics: velocity = normalized aim * power * scale.
    function hypercubeBallistic(aim4, power) {
        var A = toV(aim4);
        var P = toFinite(power, 0);
        if (!isFinite(P)) P = 0;
        if (P < 0) P = 0;
        if (P > 100) P = 100;
        try {
            var n = norm4(A);
            var k = 1.5;
            return { x: n.x * P * k, y: n.y * P * k, z: n.z * P * k, w: n.w * P * k };
        } catch (_) { return { x: 0, y: 0, z: 0, w: 0 }; }
    }
    var anaKata = {
        X: { x: 1, y: 0, z: 0, w: 0 },
        Y: { x: 0, y: 1, z: 0, w: 0 },
        Z: { x: 0, y: 0, z: 1, w: 0 },
        W: { x: 0, y: 0, z: 0, w: 1 },
        ANA: { x: 0, y: 0, z: 0, w: 1 },
        KATA: { x: 0, y: 0, z: 0, w: -1 }
    };
    var flat = {
        VERSION: '1.0.0',
        v4: v4, add4: add4, sub4: sub4, scale4: scale4, dot4: dot4, len4: len4, norm4: norm4,
        rotatePlane: rotatePlane,
        rotXY: rotXY, rotXZ: rotXZ, rotYZ: rotYZ, rotXW: rotXW, rotYW: rotYW, rotZW: rotZW,
        mat4: mat4, project: project, tesseract: tesseract,
        hypercubeBallistic: hypercubeBallistic, anaKata: anaKata
    };
    try {
        var g = global || {};
        var existing = null;
        try { existing = g.GraveGain4DMath; } catch (_) { existing = null; }
        if (existing && typeof existing === 'object') {
            for (var key in flat) {
                try { if (existing[key] === undefined) existing[key] = flat[key]; } catch (_) { /* ignore */ }
            }
            // Backfill cross aliases so both lanes interoperate.
            try {
                if (!existing.Vec4) existing.Vec4 = { create: v4, add: add4, sub: sub4, scale: scale4, dot: dot4, length: len4, norm: norm4 };
            } catch (_) { /* ignore */ }
            try {
                if (!existing.Mat4) existing.Mat4 = { identity: mat4.identity, mul: mat4.mul, mulVec: mat4.apply };
            } catch (_) { /* ignore */ }
            try { if (!existing.project4Dto3D) existing.project4Dto3D = function (p, d, s) { return project(p, { dist: d, w: s }); }; } catch (_) { /* ignore */ }
            g.GraveGain4DMath = existing;
        } else {
            flat.Vec4 = { create: v4, add: add4, sub: sub4, scale: scale4, dot: dot4, length: len4, norm: norm4 };
            flat.Mat4 = { identity: mat4.identity, mul: mat4.mul, mulVec: mat4.apply };
            flat.project4Dto3D = function (p, d, s) { return project(p, { dist: d, w: s }); };
            g.GraveGain4DMath = flat;
        }
    } catch (_) { /* fail-open: global not writable */ }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
