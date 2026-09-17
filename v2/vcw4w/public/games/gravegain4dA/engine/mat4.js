(function () {
    'use strict';

    // GraveGain4D 4x4 matrices. Row-major Float64-friendly plain arrays of
    // 16 numbers: m[r * 4 + c]. No THREE dependency; toThree() is guarded
    // so the engine unit-works without three.
    window.GraveGain4D = window.GraveGain4D || {};

    function identity() {
        return [1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1];
    }

    function clone(m) {
        return m.slice(0, 16);
    }

    // Standard row-major multiply: out = a * b (apply b first, then a).
    function multiply(a, b) {
        var out = new Array(16);
        var r, c, k, sum;
        for (r = 0; r < 4; r++) {
            for (c = 0; c < 4; c++) {
                sum = 0;
                for (k = 0; k < 4; k++) sum += a[r * 4 + k] * b[k * 4 + c];
                out[r * 4 + c] = sum;
            }
        }
        return out;
    }

    // Apply matrix to a plain Vec4 { x, y, z, w }.
    function applyToVec(m, v) {
        return {
            x: m[0] * v.x + m[1] * v.y + m[2] * v.z + m[3] * v.w,
            y: m[4] * v.x + m[5] * v.y + m[6] * v.z + m[7] * v.w,
            z: m[8] * v.x + m[9] * v.y + m[10] * v.z + m[11] * v.w,
            w: m[12] * v.x + m[13] * v.y + m[14] * v.z + m[15] * v.w
        };
    }

    // Rotation in a coordinate plane: axes i,j in {0:x,1:y,2:z,3:w}.
    function rotPlane(i, j, angle) {
        var m = identity();
        var c = Math.cos(angle);
        var s = Math.sin(angle);
        m[i * 4 + i] = c;
        m[i * 4 + j] = -s;
        m[j * 4 + i] = s;
        m[j * 4 + j] = c;
        return m;
    }

    function rotXY(angle) { return rotPlane(0, 1, angle); }
    function rotXZ(angle) { return rotPlane(0, 2, angle); }
    function rotXW(angle) { return rotPlane(0, 3, angle); }
    function rotYZ(angle) { return rotPlane(1, 2, angle); }
    function rotYW(angle) { return rotPlane(1, 3, angle); }
    function rotZW(angle) { return rotPlane(2, 3, angle); }

    // Homogeneous-style translation of the x/y/z axes: x' = x + tx * w
    // (unit-w points translate exactly). Full 4-axis affine shifts go
    // through translateVec below, since a w bias is not linearly
    // representable in a 4x4.
    function translation(tx, ty, tz) {
        var m = identity();
        m[3] = tx || 0;
        m[7] = ty || 0;
        m[11] = tz || 0;
        return m;
    }

    // Affine shift on all four axes (plain addition, JSON-safe in/out).
    function translateVec(v, tx, ty, tz, tw) {
        return {
            x: v.x + (tx || 0),
            y: v.y + (ty || 0),
            z: v.z + (tz || 0),
            w: v.w + (tw || 0)
        };
    }

    function transpose(m) {
        var out = new Array(16);
        var r, c;
        for (r = 0; r < 4; r++) {
            for (c = 0; c < 4; c++) out[r * 4 + c] = m[c * 4 + r];
        }
        return out;
    }

    // Guarded: only builds a THREE.Matrix4 when THREE is present, else null.
    // Row-major engine matrix is transposed into THREE's column-major set().
    function toThree(m) {
        try {
            if (typeof THREE !== 'undefined' && THREE && typeof THREE.Matrix4 === 'function') {
                var mat = new THREE.Matrix4();
                if (typeof mat.set === 'function') {
                    mat.set(
                        m[0], m[1], m[2], m[3],
                        m[4], m[5], m[6], m[7],
                        m[8], m[9], m[10], m[11],
                        m[12], m[13], m[14], m[15]
                    );
                }
                return mat;
            }
        } catch (e) {}
        return null;
    }

    window.GraveGain4D.Mat4 = {
        identity: identity,
        clone: clone,
        multiply: multiply,
        applyToVec: applyToVec,
        apply: applyToVec,
        rotPlane: rotPlane,
        rotXY: rotXY,
        rotXZ: rotXZ,
        rotXW: rotXW,
        rotYZ: rotYZ,
        rotYW: rotYW,
        rotZW: rotZW,
        translation: translation,
        translateVec: translateVec,
        transpose: transpose,
        toThree: toThree
    };
})();
