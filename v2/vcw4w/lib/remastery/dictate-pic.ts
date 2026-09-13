// 4weird DictatePic sprite/layer pure helpers (remastery README §3.2, Wave 3).
// Serializable math only — no canvas/DOM, no window, no deps, no secrets.

export const BLEND_MODES = [
  "source-over",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
] as const;

export type BlendMode = (typeof BLEND_MODES)[number];

export function isBlendMode(v: unknown): v is BlendMode {
  return typeof v === "string" && (BLEND_MODES as readonly string[]).includes(v);
}

export interface SliceRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function assertFinitePositive(n: unknown, name: string): asserts n is number {
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) {
    throw new RangeError(`${name} must be a finite positive number`);
  }
}

/**
 * Slice a spritesheet into row-major frame rects.
 * Floors partial frames (leftover pixels ignored).
 * Returns [] when the frame is bigger than the sheet.
 * Throws on non-finite / non-positive dims.
 */
export function sliceSpritesheet(
  sheetW: number,
  sheetH: number,
  frameW: number,
  frameH: number,
): SliceRect[] {
  assertFinitePositive(sheetW, "sheetW");
  assertFinitePositive(sheetH, "sheetH");
  assertFinitePositive(frameW, "frameW");
  assertFinitePositive(frameH, "frameH");
  const cols = Math.floor(sheetW / frameW);
  const rows = Math.floor(sheetH / frameH);
  if (cols <= 0 || rows <= 0) return [];
  const rects: SliceRect[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      rects.push({ x: col * frameW, y: row * frameH, w: frameW, h: frameH });
    }
  }
  return rects;
}

/**
 * Scale a rect by a finite positive factor, rounding to integer
 * pixels (pixel-crisp axiom). Throws on bad scale/rect.
 */
export function scaleRect(r: SliceRect, scale: number): SliceRect {
  if (
    typeof r !== "object" ||
    r === null ||
    !Number.isFinite(r.x) ||
    !Number.isFinite(r.y) ||
    !Number.isFinite(r.w) ||
    !Number.isFinite(r.h)
  ) {
    throw new RangeError("r must be a SliceRect with finite x/y/w/h");
  }
  assertFinitePositive(scale, "scale");
  return {
    x: Math.round(r.x * scale),
    y: Math.round(r.y * scale),
    w: Math.round(r.w * scale),
    h: Math.round(r.h * scale),
  };
}

/**
 * Coerce a brush size to an integer in [min, max]. Fail-open: garbage
 * (non-numeric, NaN, infinite) returns min. Never throws.
 */
export function clampBrushSize(v: unknown, min = 1, max = 64): number {
  let lo = typeof min === "number" && Number.isFinite(min) ? Math.floor(min) : 1;
  let hi = typeof max === "number" && Number.isFinite(max) ? Math.floor(max) : 64;
  if (lo > hi) {
    const tmp = lo;
    lo = hi;
    hi = tmp;
  }
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, Math.floor(n)));
}

/**
 * Clamp layer opacity to an alpha in 0..1. Fail-open: NaN /
 * non-numeric → 1. Never throws.
 */
export function layerOpacityToAlpha(opacity: number): number {
  if (typeof opacity !== "number" || Number.isNaN(opacity)) return 1;
  if (!Number.isFinite(opacity)) return opacity > 0 ? 1 : 0;
  return Math.min(1, Math.max(0, opacity));
}
