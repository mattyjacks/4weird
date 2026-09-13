/**
 * GraveGain4DMath — dependency-free 4D math core for GraveGain4D.
 *
 * Inspired by the "3D slice of 4D space" feel of 4D golf-likes and by
 * hypercube (tesseract) geometry. Implemented from first principles —
 * no copied assets, no imports, no external dependencies.
 *
 * Exposes `window.GraveGain4DMath` (idempotent: re-executing this file
 * is a no-op). All entry points are fail-open: bad / missing / NaN
 * inputs never throw — they return safe defaults (zero vectors,
 * identity matrices, clamped scalars).
 *
 * Contents:
 * - Vec4      { create, add, sub, scale, dot, length, norm, lerp }
 * - Mat4      identity + rotationXY/XZ/YZ/XW/YW/ZW + mul + mulVec
 *             + createMatrixStack (push/pop/current helpers)
 * - project4Dto3D(p, wDistance, wSlice) — 4D -> 3D perspective slice
 * - sliceVisibility(p, wSlice, thickness) — 0..1 W-slab opacity
 * - tesseract() — { verts: 16 Vec4, edges: 32 pairs }
 * - hypercubeEdges(n) — generic n-cube edge list
 * - foldingPulse(t) — time-varying "vectors folding" transform
 * - mulberry32(seed) — seeded RNG
 * - clamp / clamp01 / lerpScalar helpers
 *
 * Conventions:
 * - A Vec4 is a plain object { x, y, z, w }. Every Vec4 op also
 *   accepts [x, y, z, w] arrays (or partials) and normalizes them.
 * - A Mat4 is a 16-number row-major array:
 *     m[r * 4 + c], rows/cols 0..3 over (x, y, z, w).
 *
 * @preserve GraveGain4DMath v1.0.0 (vanilla JS, IIFE, fail-open)
 */
(function (global) {
  "use strict";

  try {
    if (global && global.GraveGain4DMath) {
      return; // idempotent: already installed
    }
  } catch (guardErr) {
    return;
  }

  /* ------------------------------------------------------------------ */
  /* scalar helpers (fail-open)                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Coerce anything to a finite number, else fall back.
   * @param {*} v input
   * @param {number} [fallback=0] fallback value
   * @returns {number} finite number
   */
  function toFinite(v, fallback) {
    var fb = typeof fallback === "number" && isFinite(fallback) ? fallback : 0;
    var n = typeof v === "number" ? v : parseFloat(v);
    return isFinite(n) ? n : fb;
  }

  /**
   * Clamp a value into [min, max] (fail-open: NaN -> min).
   * @param {*} v value
   * @param {number} [min=0] lower bound
   * @param {number} [max=1] upper bound
   * @returns {number} clamped value
   */
  function clamp(v, min, max) {
    var lo = toFinite(min, 0);
    var hi = toFinite(max, 1);
    if (lo > hi) {
      var tmp = lo;
      lo = hi;
      hi = tmp;
    }
    var n = toFinite(v, lo);
    if (n < lo) {
      return lo;
    }
    if (n > hi) {
      return hi;
    }
    return n;
  }

  /**
   * Clamp a value into [0, 1].
   * @param {*} v value
   * @returns {number} clamped value
   */
  function clamp01(v) {
    return clamp(v, 0, 1);
  }

  /**
   * Scalar linear interpolation (fail-open).
   * @param {*} a from
   * @param {*} b to
   * @param {*} t mix in [0, 1]
   * @returns {number} interpolated value
   */
  function lerpScalar(a, b, t) {
    var fa = toFinite(a, 0);
    var fb = toFinite(b, 0);
    var ft = toFinite(t, 0);
    if (!isFinite(ft)) {
      return fa;
    }
    return fa + (fb - fa) * ft;
  }

  /* ------------------------------------------------------------------ */
  /* Vec4                                                                */
  /* ------------------------------------------------------------------ */

  /**
   * Normalize any Vec4-ish input to { x, y, z, w } (fail-open).
   * Accepts {x,y,z,w} objects, [x,y,z,w] arrays, or garbage -> zero.
   * @param {*} p input
   * @returns {{x:number,y:number,z:number,w:number}} safe vector
   */
  function toVec(p) {
    var zero = { x: 0, y: 0, z: 0, w: 0 };
    if (p == null) {
      return zero;
    }
    try {
      if (typeof p === "object" && typeof p.length === "number" && !(p instanceof Object && "x" in p)) {
        // array-like [x, y, z, w]
        return {
          x: toFinite(p[0], 0),
          y: toFinite(p[1], 0),
          z: toFinite(p[2], 0),
          w: toFinite(p[3], 0)
        };
      }
      if (typeof p === "object") {
        return {
          x: toFinite(p.x, 0),
          y: toFinite(p.y, 0),
          z: toFinite(p.z, 0),
          w: toFinite(p.w, 0)
        };
      }
    } catch (e) {
      return zero;
    }
    return zero;
  }

  /** Vec4 namespace. */
  var Vec4 = {
    /**
     * Create a Vec4 (fail-open: non-finite components -> 0).
     * @param {*} x x
     * @param {*} y y
     * @param {*} z z
     * @param {*} w w
     * @returns {{x:number,y:number,z:number,w:number}} vector
     */
    create: function (x, y, z, w) {
      return {
        x: toFinite(x, 0),
        y: toFinite(y, 0),
        z: toFinite(z, 0),
        w: toFinite(w, 0)
      };
    },

    /**
     * Component-wise add.
     * @param {*} a vector-ish
     * @param {*} b vector-ish
     * @returns {{x:number,y:number,z:number,w:number}} a + b
     */
    add: function (a, b) {
      var va = toVec(a);
      var vb = toVec(b);
      return { x: va.x + vb.x, y: va.y + vb.y, z: va.z + vb.z, w: va.w + vb.w };
    },

    /**
     * Component-wise subtract.
     * @param {*} a vector-ish
     * @param {*} b vector-ish
     * @returns {{x:number,y:number,z:number,w:number}} a - b
     */
    sub: function (a, b) {
      var va = toVec(a);
      var vb = toVec(b);
      return { x: va.x - vb.x, y: va.y - vb.y, z: va.z - vb.z, w: va.w - vb.w };
    },

    /**
     * Scale by a scalar.
     * @param {*} v vector-ish
     * @param {*} s scalar-ish
     * @returns {{x:number,y:number,z:number,w:number}} v * s
     */
    scale: function (v, s) {
      var vv = toVec(v);
      var fs = toFinite(s, 0);
      return { x: vv.x * fs, y: vv.y * fs, z: vv.z * fs, w: vv.w * fs };
    },

    /**
     * Dot product.
     * @param {*} a vector-ish
     * @param {*} b vector-ish
     * @returns {number} a . b
     */
    dot: function (a, b) {
      var va = toVec(a);
      var vb = toVec(b);
      return va.x * vb.x + va.y * vb.y + va.z * vb.z + va.w * vb.w;
    },

    /**
     * Euclidean length.
     * @param {*} v vector-ish
     * @returns {number} |v| (>= 0)
     */
    length: function (v) {
      var vv = toVec(v);
      var l = Math.sqrt(vv.x * vv.x + vv.y * vv.y + vv.z * vv.z + vv.w * vv.w);
      return isFinite(l) ? l : 0;
    },

    /**
     * Normalize to unit length (fail-open: zero vector -> zero vector).
     * @param {*} v vector-ish
     * @returns {{x:number,y:number,z:number,w:number}} unit vector or zero
     */
    norm: function (v) {
      var vv = toVec(v);
      var l = Math.sqrt(vv.x * vv.x + vv.y * vv.y + vv.z * vv.z + vv.w * vv.w);
      if (!isFinite(l) || l < 1e-12) {
        return { x: 0, y: 0, z: 0, w: 0 };
      }
      return { x: vv.x / l, y: vv.y / l, z: vv.z / l, w: vv.w / l };
    },

    /**
     * Linear interpolation between vectors (t clamped to [0, 1]).
     * @param {*} a from (vector-ish)
     * @param {*} b to (vector-ish)
     * @param {*} t mix
     * @returns {{x:number,y:number,z:number,w:number}} interpolated vector
     */
    lerp: function (a, b, t) {
      var va = toVec(a);
      var vb = toVec(b);
      var ft = clamp01(t);
      return {
        x: va.x + (vb.x - va.x) * ft,
        y: va.y + (vb.y - va.y) * ft,
        z: va.z + (vb.z - va.z) * ft,
        w: va.w + (vb.w - va.w) * ft
      };
    }
  };

  /* ------------------------------------------------------------------ */
  /* Mat4 (row-major, 16 numbers)                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Normalize any Mat4-ish input to a 16-number row-major array.
   * @param {*} m input
   * @returns {number[]} 16 finite numbers (identity on garbage)
   */
  function toMat(m) {
    var id = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    if (m == null) {
      return id;
    }
    try {
      if (typeof m.length === "number" && m.length >= 16) {
        var out = new Array(16);
        for (var i = 0; i < 16; i++) {
          out[i] = toFinite(m[i], i % 5 === 0 ? 1 : 0);
        }
        return out;
      }
    } catch (e) {
      return id;
    }
    return id;
  }

  /**
   * Build a rotation in the plane spanned by axes i and j.
   * @param {number} i first axis 0..3
   * @param {number} j second axis 0..3
   * @param {*} angle radians-ish
   * @returns {number[]} row-major rotation matrix (identity on bad input)
   */
  function planeRotation(i, j, angle) {
    var m = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    try {
      var ai = clamp(Math.floor(toFinite(i, 0)), 0, 3);
      var aj = clamp(Math.floor(toFinite(j, 1)), 0, 3);
      var a = toFinite(angle, 0);
      if (!isFinite(a)) {
        return m;
      }
      if (ai === aj) {
        return m;
      }
      var c = Math.cos(a);
      var s = Math.sin(a);
      if (!isFinite(c) || !isFinite(s)) {
        return m;
      }
      m[ai * 4 + ai] = c;
      m[ai * 4 + aj] = -s;
      m[aj * 4 + ai] = s;
      m[aj * 4 + aj] = c;
      return m;
    } catch (e) {
      return m;
    }
  }

  /** Mat4 namespace. */
  var Mat4 = {
    /**
     * 4x4 identity matrix.
     * @returns {number[]} row-major identity
     */
    identity: function () {
      return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    },

    /**
     * Rotation in the X/Y plane.
     * @param {*} angle radians
     * @returns {number[]} rotation matrix
     */
    rotationXY: function (angle) {
      return planeRotation(0, 1, angle);
    },

    /**
     * Rotation in the X/Z plane.
     * @param {*} angle radians
     * @returns {number[]} rotation matrix
     */
    rotationXZ: function (angle) {
      return planeRotation(0, 2, angle);
    },

    /**
     * Rotation in the Y/Z plane.
     * @param {*} angle radians
     * @returns {number[]} rotation matrix
     */
    rotationYZ: function (angle) {
      return planeRotation(1, 2, angle);
    },

    /**
     * Rotation in the X/W plane (4D-specific).
     * @param {*} angle radians
     * @returns {number[]} rotation matrix
     */
    rotationXW: function (angle) {
      return planeRotation(0, 3, angle);
    },

    /**
     * Rotation in the Y/W plane (4D-specific).
     * @param {*} angle radians
     * @returns {number[]} rotation matrix
     */
    rotationYW: function (angle) {
      return planeRotation(1, 3, angle);
    },

    /**
     * Rotation in the Z/W plane (4D-specific).
     * @param {*} angle radians
     * @returns {number[]} rotation matrix
     */
    rotationZW: function (angle) {
      return planeRotation(2, 3, angle);
    },

    /**
     * Multiply two matrices: out = a * b (column-vector convention).
     * @param {*} a left matrix-ish
     * @param {*} b right matrix-ish
     * @returns {number[]} row-major product (identity on bad input)
     */
    mul: function (a, b) {
      var ma = toMat(a);
      var mb = toMat(b);
      var out = new Array(16);
      try {
        for (var r = 0; r < 4; r++) {
          for (var c = 0; c < 4; c++) {
            var sum = 0;
            for (var k = 0; k < 4; k++) {
              sum += ma[r * 4 + k] * mb[k * 4 + c];
            }
            out[r * 4 + c] = isFinite(sum) ? sum : 0;
          }
        }
        return out;
      } catch (e) {
        return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
      }
    },

    /**
     * Transform a Vec4 by a matrix: out = m * v.
     * @param {*} m matrix-ish
     * @param {*} v vector-ish
     * @returns {{x:number,y:number,z:number,w:number}} transformed vector
     */
    mulVec: function (m, v) {
      var mm = toMat(m);
      var vv = toVec(v);
      try {
        var arr = [vv.x, vv.y, vv.z, vv.w];
        var out = [0, 0, 0, 0];
        for (var r = 0; r < 4; r++) {
          var sum = 0;
          for (var c = 0; c < 4; c++) {
            sum += mm[r * 4 + c] * arr[c];
          }
          out[r] = isFinite(sum) ? sum : 0;
        }
        return { x: out[0], y: out[1], z: out[2], w: out[3] };
      } catch (e) {
        return { x: 0, y: 0, z: 0, w: 0 };
      }
    }
  };

  /**
   * Create a tiny matrix stack (push / pop / current).
   * Fail-open: pop on an empty stack keeps identity; bad pushes are ignored.
   * @returns {{push:function(*):number[],pop:function():number[],current:function():number[],depth:function():number}} stack
   */
  function createMatrixStack() {
    var stack = [Mat4.identity()];
    return {
      push: function (m) {
        try {
          var top = stack[stack.length - 1];
          var next = Mat4.mul(top, toMat(m));
          stack.push(next);
          return next.slice();
        } catch (e) {
          return stack[stack.length - 1].slice();
        }
      },
      pop: function () {
        try {
          if (stack.length > 1) {
            stack.pop();
          }
          return stack[stack.length - 1].slice();
        } catch (e) {
          return Mat4.identity();
        }
      },
      current: function () {
        try {
          return stack[stack.length - 1].slice();
        } catch (e) {
          return Mat4.identity();
        }
      },
      depth: function () {
        try {
          return stack.length;
        } catch (e) {
          return 1;
        }
      }
    };
  }

  /* ------------------------------------------------------------------ */
  /* 4D -> 3D slice projection                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Project a 4D point into the 3D slice at wSlice using W perspective.
   *
   * The point is shifted so the slice sits at the origin of W, then
   * scaled by s = wDistance / (wDistance - dw). Larger wDistance is
   * closer to orthographic; small wDistance is dramatic perspective.
   *
   * @param {*} p 4D point-ish
   * @param {*} wDistance camera distance along W (> 0, default 3)
   * @param {*} wSlice slice position along W (default 0)
   * @returns {{x:number,y:number,z:number,s:number,w:number}} projected point + scale
   */
  function project4Dto3D(p, wDistance, wSlice) {
    var v = toVec(p);
    var d = toFinite(wDistance, 3);
    var slice = toFinite(wSlice, 0);
    if (!isFinite(d) || d <= 0.0001) {
      d = 3;
    }
    if (!isFinite(slice)) {
      slice = 0;
    }
    try {
      var dw = v.w - slice;
      var denom = d - dw;
      if (!isFinite(denom) || Math.abs(denom) < 1e-6) {
        denom = denom < 0 ? -1e-6 : 1e-6;
      }
      var s = d / denom;
      if (!isFinite(s)) {
        s = 1;
      }
      s = clamp(s, -8, 8);
      return { x: v.x * s, y: v.y * s, z: v.z * s, s: s, w: v.w };
    } catch (e) {
      return { x: 0, y: 0, z: 0, s: 1, w: 0 };
    }
  }

  /**
   * Visibility of a 4D point inside a W slab around wSlice.
   * Returns 1 at the slice centre, fading linearly to 0 at the edge.
   *
   * @param {*} p 4D point-ish
   * @param {*} wSlice slice position along W (default 0)
   * @param {*} thickness half-thickness of the slab (> 0, default 1)
   * @returns {number} opacity in [0, 1]
   */
  function sliceVisibility(p, wSlice, thickness) {
    var v = toVec(p);
    var slice = toFinite(wSlice, 0);
    var th = toFinite(thickness, 1);
    if (!isFinite(slice)) {
      slice = 0;
    }
    if (!isFinite(th) || th <= 0) {
      th = 1;
    }
    try {
      var dist = Math.abs(v.w - slice);
      if (!isFinite(dist)) {
        return 0;
      }
      if (dist >= th) {
        return 0;
      }
      return clamp01(1 - dist / th);
    } catch (e) {
      return 0;
    }
  }

  /* ------------------------------------------------------------------ */
  /* hypercube geometry                                                  */
  /* ------------------------------------------------------------------ */

  /**
   * Edge list of a generic n-dimensional hypercube.
   * Vertices are numbered 0..2^n - 1 (bit k = coordinate k sign);
   * two vertices share an edge when they differ in exactly one bit.
   *
   * @param {*} n dimensions (integer, clamped to [1, 8], default 4)
   * @returns {Array<Array<number>>} [i, j] index pairs
   */
  function hypercubeEdges(n) {
    var dims = clamp(Math.floor(toFinite(n, 4)), 1, 8);
    if (!isFinite(dims)) {
      dims = 4;
    }
    var edges = [];
    try {
      var count = Math.pow(2, dims);
      for (var i = 0; i < count; i++) {
        for (var b = 0; b < dims; b++) {
          var j = i ^ (1 << b);
          if (j > i) {
            edges.push([i, j]);
          }
        }
      }
      return edges;
    } catch (e) {
      return [];
    }
  }

  /**
   * Unit tesseract: 16 vertices at (+/-1, +/-1, +/-1, +/-1) plus the
   * 32 edges joining vertices that differ in exactly one coordinate.
   *
   * @returns {{verts:Array<{x:number,y:number,z:number,w:number}>,edges:Array<Array<number>>}} tesseract
   */
  function tesseract() {
    try {
      var verts = [];
      for (var i = 0; i < 16; i++) {
        verts.push({
          x: i & 1 ? 1 : -1,
          y: i & 2 ? 1 : -1,
          z: i & 4 ? 1 : -1,
          w: i & 8 ? 1 : -1
        });
      }
      return { verts: verts, edges: hypercubeEdges(4) };
    } catch (e) {
      return { verts: [], edges: [] };
    }
  }

  /* ------------------------------------------------------------------ */
  /* folding pulse (trippy "vectors folding" effect)                     */
  /* ------------------------------------------------------------------ */

  /**
   * Time-varying fold transform: nested 4D rotations whose angles
   * oscillate with time, plus a gentle breathing scale on X/Y/Z.
   * Drive it with seconds (e.g. performance.now() / 1000) and apply
   * the returned matrix to tesseract verts each frame.
   *
   * Fail-open: non-finite t behaves like t = 0.
   *
   * @param {*} t time in seconds
   * @returns {number[]} row-major 4x4 fold matrix
   */
  function foldingPulse(t) {
    var time = toFinite(t, 0);
    if (!isFinite(time)) {
      time = 0;
    }
    try {
      var a = Math.sin(time * 0.7) * 0.9;
      var b = Math.sin(time * 0.45 + 1.3) * 1.1;
      var c = Math.sin(time * 0.9 + 2.1) * 0.6;
      var breathe = 1 + 0.08 * Math.sin(time * 1.7);
      if (!isFinite(a)) {
        a = 0;
      }
      if (!isFinite(b)) {
        b = 0;
      }
      if (!isFinite(c)) {
        c = 0;
      }
      if (!isFinite(breathe)) {
        breathe = 1;
      }
      var m = Mat4.mul(Mat4.rotationXW(a), Mat4.rotationYW(b));
      m = Mat4.mul(m, Mat4.rotationZW(c));
      m = Mat4.mul(m, Mat4.rotationXY(time * 0.15));
      // breathing scale on the spatial axes only (W untouched)
      m[0] *= breathe;
      m[5] *= breathe;
      m[10] *= breathe;
      return m;
    } catch (e) {
      return Mat4.identity();
    }
  }

  /* ------------------------------------------------------------------ */
  /* seeded RNG                                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Mulberry32 seeded PRNG.
   * Fail-open: any seed coerces to a uint32 (garbage -> 0).
   *
   * @param {*} seed seed-ish
   * @returns {function():number} () -> float in [0, 1)
   */
  function mulberry32(seed) {
    var s = 0;
    try {
      var n = typeof seed === "number" ? seed : parseInt(seed, 10);
      if (!isFinite(n)) {
        n = 0;
      }
      s = n >>> 0;
    } catch (e) {
      s = 0;
    }
    return function () {
      try {
        s = (s + 0x6d2b79f5) >>> 0;
        var z = s;
        z = Math.imul(z ^ (z >>> 15), z | 1);
        z = z ^ (z + Math.imul(z ^ (z >>> 7), z | 61));
        return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
      } catch (e) {
        return 0;
      }
    };
  }

  /* ------------------------------------------------------------------ */
  /* publish                                                             */
  /* ------------------------------------------------------------------ */

  var api = {
    VERSION: "1.0.0",
    Vec4: Vec4,
    Mat4: Mat4,
    createMatrixStack: createMatrixStack,
    project4Dto3D: project4Dto3D,
    sliceVisibility: sliceVisibility,
    tesseract: tesseract,
    hypercubeEdges: hypercubeEdges,
    foldingPulse: foldingPulse,
    mulberry32: mulberry32,
    clamp: clamp,
    clamp01: clamp01,
    lerpScalar: lerpScalar,
    toVec: toVec
  };

  try {
    if (global) {
      global.GraveGain4DMath = api;
    }
  } catch (e) {
    // fail-open: API simply stays local if the global is not writable
  }
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
