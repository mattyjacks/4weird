(function () {
    'use strict';

    // GraveGain4D 4-vector ops. Plain { x, y, z, w } objects so maps stay
    // JSON-serializable. No THREE dependency; THREE converters below are
    // guarded so the engine unit-works with plain node (no DOM/THREE).
    window.GraveGain4D = window.GraveGain4D || {};

    function create(x, y, z, w) {
        return {
            x: x || 0,
            y: y || 0,
            z: z || 0,
            w: (w === undefined || w === null) ? 0 : w
        };
    }

    function clone(v) {
        return { x: v.x, y: v.y, z: v.z, w: v.w };
    }

    function add(a, b) {
        return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z, w: a.w + b.w };
    }

    function sub(a, b) {
        return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z, w: a.w - b.w };
    }

    function scale(v, s) {
        return { x: v.x * s, y: v.y * s, z: v.z * s, w: v.w * s };
    }

    function dot(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
    }

    function lengthSq(v) {
        return dot(v, v);
    }

    function length(v) {
        return Math.sqrt(lengthSq(v));
    }

    function norm(v) {
        var len = length(v);
        if (len === 0) return create(0, 0, 0, 0);
        return scale(v, 1 / len);
    }

    function lerp(a, b, t) {
        return {
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t,
            z: a.z + (b.z - a.z) * t,
            w: a.w + (b.w - a.w) * t
        };
    }

    function equals(a, b, eps) {
        eps = (eps === undefined || eps === null) ? 1e-9 : eps;
        return Math.abs(a.x - b.x) <= eps &&
            Math.abs(a.y - b.y) <= eps &&
            Math.abs(a.z - b.z) <= eps &&
            Math.abs(a.w - b.w) <= eps;
    }

    function toArray(v) {
        return [v.x, v.y, v.z, v.w];
    }

    function fromArray(arr) {
        arr = arr || [];
        return create(arr[0] || 0, arr[1] || 0, arr[2] || 0, arr[3] || 0);
    }

    // Guarded: only builds a THREE.Vector4 when THREE is present, else null.
    function toThree(v) {
        try {
            if (typeof THREE !== 'undefined' && THREE && typeof THREE.Vector4 === 'function') {
                return new THREE.Vector4(v.x, v.y, v.z, v.w);
            }
        } catch (e) {}
        return null;
    }

    // Guarded: reads a THREE.Vector4-like back into a plain Vec4, else null.
    function fromThree(tv) {
        try {
            if (typeof THREE !== 'undefined' && tv && typeof tv.x === 'number') {
                return create(tv.x, tv.y || 0, tv.z || 0, tv.w || 0);
            }
        } catch (e) {}
        return null;
    }

    window.GraveGain4D.Vec4 = {
        create: create,
        clone: clone,
        add: add,
        sub: sub,
        scale: scale,
        dot: dot,
        length: length,
        lengthSq: lengthSq,
        norm: norm,
        normalize: norm,
        lerp: lerp,
        equals: equals,
        toArray: toArray,
        fromArray: fromArray,
        toThree: toThree,
        fromThree: fromThree
    };
})();
