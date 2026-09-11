/**
 * Foveated vision for VibeCodeWorker game debugging.
 *
 * Latency idea: one small overview image per tick + up to N tiny
 * high-detail crops where the model wants more pixels; e.g. the screen
 * center in an FPS (crosshair/enemy contact); instead of one huge
 * full-resolution frame. Small crops cost a fraction of the tokens, so the
 * model decides faster and the follow-up tick stays real-time.
 *
 * All rects are normalized 0-1000 (500,500 = screen center), matching the
 * bot action coordinate space. Pure Node; safe to require in tests.
 */

'use strict';

const MAX_DETAILS = 3;
const MIN_SIZE = 80; // min crop edge in normalized units (8% of screen)
const MAX_SIZE = 1000;

const HIGH_HINTS = /fps|shooter|3d|combat|enemy|enemies|boss|firing|fire at|muzzle|damage|hit points|low hp|health low|chase|attack|crosshair|xono|grave|hl2/i;
const LOW_HINTS = /menu|loading|load screen|game over|paused|pause|dialog|inventory|settings|title screen|cutscene|cinematic/i;

/** Center square rect: size = edge length in normalized units. */
function centerRect(size, cx = 500, cy = 500, label = 'center') {
  const s = clampSize(size);
  const half = s / 2;
  return finalizeRect({ x: cx - half, y: cy - half, w: s, h: s, label });
}

function clampSize(n) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 400;
  return Math.max(MIN_SIZE, Math.min(MAX_SIZE, v));
}

function clampCoord(n) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1000, v));
}

/** Clamp a raw rect into the 0-1000 frame, enforce min size, keep label. */
function finalizeRect(raw) {
  const label = String((raw && raw.label) || 'detail').slice(0, 40) || 'detail';
  let w = clampSize(raw && raw.w != null ? raw.w : raw && raw.width);
  let h = clampSize(raw && raw.h != null ? raw.h : raw && raw.height);
  let x = Number(raw && raw.x);
  let y = Number(raw && raw.y);
  if (!Number.isFinite(x)) x = 500 - w / 2;
  if (!Number.isFinite(y)) y = 500 - h / 2;
  // Clamp origin so the box stays fully inside the frame.
  x = Math.max(0, Math.min(1000 - w, Math.round(x)));
  y = Math.max(0, Math.min(1000 - h, Math.round(y)));
  return { x, y, w, h, label };
}

function rectKey(r) {
  const q = (n) => Math.round(n / 50) * 50;
  return `${q(r.x)},${q(r.y)},${q(r.w)},${q(r.h)}`;
}

function isLowContext({ status = '', reasoning = '', genre = '' } = {}) {
  return LOW_HINTS.test(`${status} ${reasoning} ${genre}`);
}

function isHighContext({ status = '', reasoning = '', urgency = '', genre = '' } = {}) {
  if (String(urgency || '').toLowerCase() === 'high') return true;
  return HIGH_HINTS.test(`${status} ${reasoning} ${genre}`);
}

/**
 * Default detail crops when the model has not asked for anything yet.
 * - menus/loading: [] (overview only; fastest tick)
 * - normal play: one 450px center crop (content zone)
 * - combat/FPS/high urgency: 400px context + 220px fovea (crosshair home)
 */
function defaultFocusRegions({ status = '', reasoning = '', urgency = '', genre = '' } = {}) {
  if (isLowContext({ status, reasoning, genre }) && String(urgency || '').toLowerCase() !== 'high') return [];
  if (isHighContext({ status, reasoning, urgency, genre })) {
    return [
      { ...centerRect(400), label: 'center-context' },
      { ...centerRect(220), label: 'crosshair-fovea' },
    ];
  }
  return [{ ...centerRect(450), label: 'center' }];
}

/**
 * Validate model-requested focus rects. Accepts `focus`, `detail_requests`,
 * `fovea`, or `zoom` arrays of {x,y,w,h(,width,height),label}. Returns ≤max
 * clamped rects, deduped on a coarse grid. Garbage → [] (never throws).
 */
function sanitizeFocusRequests(input, max = MAX_DETAILS) {
  const cap = Math.max(0, Math.min(MAX_DETAILS, Math.round(Number(max) || 0)));
  if (cap === 0) return [];
  const raw = Array.isArray(input) ? input
    : Array.isArray(input && input.focus) ? input.focus
    : Array.isArray(input && input.detail_requests) ? input.detail_requests
    : Array.isArray(input && input.fovea) ? input.fovea
    : Array.isArray(input && input.zoom) ? input.zoom
    : null;
  if (!raw) return [];
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = finalizeRect(item);
    if (r.w < MIN_SIZE || r.h < MIN_SIZE) continue;
    const key = rectKey(r);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
    if (out.length >= cap) break;
  }
  return out;
}

/** Pull a focus request off a model decision object (any supported key). */
function parseModelFocus(decision) {
  if (!decision || typeof decision !== 'object') return [];
  return sanitizeFocusRequests(
    decision.focus || decision.detail_requests || decision.fovea || decision.zoom || [],
    MAX_DETAILS,
  );
}

/**
 * Merge operator/model requests over the defaults for the NEXT tick.
 * Explicit model rects win; defaults fill remaining slots. Total ≤ max.
 */
function mergeFocusRequests({ requested = [], context = {}, max = MAX_DETAILS } = {}) {
  const cap = Math.max(0, Math.min(MAX_DETAILS, Math.round(Number(max) || 0)));
  if (cap === 0) return [];
  const clean = sanitizeFocusRequests(requested, cap);
  const merged = [...clean];
  const seen = new Set(merged.map(rectKey));
  for (const d of defaultFocusRegions(context)) {
    if (merged.length >= cap) break;
    const key = rectKey(d);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(d);
  }
  return merged.slice(0, cap);
}

/** Prompt snippet advertising the focus option (appended when enabled). */
function buildFoveaPromptSnippet(detailCount = 0) {
  const n = Math.max(0, Math.min(MAX_DETAILS, Math.round(Number(detailCount) || 0)));
  const extra = n > 0
    ? ` This tick you also get ${n} detail crop(s) after the overview (labeled: ${Array.from({ length: n }, (_, i) => `crop${i + 1}`).join(', ')}; tight high-resolution zooms of the requested zones).`
    : '';
  return `FOVEATED VISION: image 1 is always a small full-screen overview (cheap, fast). ` +
    `You may ALSO request up to ${MAX_DETAILS} tiny high-detail crops for the NEXT tick - ` +
    `e.g. the FPS crosshair zone; by returning "focus": [{"x":300,"y":300,"w":400,"h":400,"label":"center"}] ` +
    `(0-1000 normalized, 500,500 = center; min 80x80). Small crops arrive at higher effective ` +
    `resolution than the overview for a fraction of full-frame tokens, so prefer them over asking ` +
    `for a bigger overview. Omit "focus" (or []) for menus/loading to keep the tick fast.${extra}`;
}

/**
 * Describe the current frame's detail crops for the prompt (labels + rects),
 * so the model can map crop2 -> screen region without guessing.
 */
function describeFrameForPrompt(details = []) {
  if (!Array.isArray(details) || !details.length) return '';
  return details.map((d, i) => {
    const r = d && d.rect ? d.rect : d;
    const label = String((d && d.label) || (r && r.label) || `crop${i + 1}`).slice(0, 40);
    const x = clampCoord(r && r.x);
    const y = clampCoord(r && r.y);
    const w = clampSize(r && (r.w || r.width));
    const h = clampSize(r && (r.h || r.height));
    return `crop${i + 1} "${label}" = overview rect [x=${x},y=${y},w=${w},h=${h}] (0-1000)`;
  }).join('; ');
}

/** Rough byte/token budget for logging: sums base64 lengths. */
function estimateFrameBudget({ overview = '', details = [] } = {}) {
  const over = typeof overview === 'string' ? overview.length : 0;
  const list = Array.isArray(details) ? details : [];
  const detBytes = list.reduce((a, d) => {
    const b = typeof d === 'string' ? d.length : (d && d.base64 ? d.base64.length : 0);
    return a + (Number.isFinite(b) ? b : 0);
  }, 0);
  return {
    overviewBytes: over,
    detailBytes: detBytes,
    totalBytes: over + detBytes,
    detailCount: list.length,
    // ~4 base64 chars per 3 bytes; prompt ~4 chars/token heuristic.
    estTokens: Math.round((over + detBytes) / 4 / 3),
  };
}

module.exports = {
  MAX_DETAILS,
  MIN_SIZE,
  centerRect,
  finalizeRect,
  defaultFocusRegions,
  sanitizeFocusRequests,
  parseModelFocus,
  mergeFocusRequests,
  buildFoveaPromptSnippet,
  describeFrameForPrompt,
  estimateFrameBudget,
};
