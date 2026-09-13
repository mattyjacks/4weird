/**
 * Fovea overlay helpers for TestingH / TestingV exports.
 *
 * The agent loop logs one slim `fovea` event per crop-plan change into the
 * playtest manifest (rects only, no pixels). At export time this module:
 *   1. picks the representative crop set (latest event with rects),
 *   2. maps normalized 0-1000 rects onto source pixels for ffmpeg crops,
 *   3. formats the rect + thumbnail args for export_testing_layouts.ps1,
 * so the testing videos draw the detail-crop boundaries AND show the crop
 * renders picture-in-picture.
 *
 * Pure Node; safe to require in tests and in export_testing_layouts.js.
 */

'use strict';

let fovea = null;
try {
  fovea = require('./brain/foveated_vision');
} catch (_) {
  fovea = null;
}

/** Fallback plan when the manifest has no fovea events (overview-only run). */
function defaultOverlayRects() {
  if (fovea && typeof fovea.defaultFocusRegions === 'function') {
    try {
      return fovea.defaultFocusRegions({ urgency: 'high', genre: 'fps' });
    } catch (_) { /* fall through */ }
  }
  return [
    { x: 300, y: 300, w: 400, h: 400, label: 'center-context' },
    { x: 390, y: 390, w: 220, h: 220, label: 'crosshair-fovea' },
  ];
}

function cleanRect(r) {
  if (fovea && typeof fovea.sanitizeFocusRequests === 'function') {
    const out = fovea.sanitizeFocusRequests([r], 3);
    if (out.length) return out[0];
  }
  const x = Math.max(0, Math.min(1000, Math.round(Number(r && r.x) || 0)));
  const y = Math.max(0, Math.min(1000, Math.round(Number(r && r.y) || 0)));
  const w = Math.max(80, Math.min(1000, Math.round(Number(r && (r.w || r.width)) || 400)));
  const h = Math.max(80, Math.min(1000, Math.round(Number(r && (r.h || r.height)) || 400)));
  return { x, y, w, h, label: String((r && r.label) || 'detail').slice(0, 40) || 'detail' };
}

/**
 * Pick the representative crop set from manifest events.
 * Returns { rects (≤3), atMs (number|null), isDefault (bool) }.
 * Latest event with rects wins; empty/garbage → default plan.
 */
function selectFoveaCrops(events) {
  const list = Array.isArray(events) ? events : [];
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i];
    if (!e || e.type !== 'fovea' || !Array.isArray(e.rects) || !e.rects.length) continue;
    const rects = e.rects.map(cleanRect).filter(Boolean).slice(0, 3);
    if (!rects.length) continue;
    const atMs = Number.isFinite(Number(e.atMs)) ? Number(e.atMs) : null;
    return { rects, atMs, isDefault: false };
  }
  return { rects: defaultOverlayRects(), atMs: null, isDefault: true };
}

/** Map a normalized rect onto source pixels (ints, clamped, min 2px). */
function rectToSourcePixels(rect, srcW, srcH) {
  const W = Math.max(2, Math.round(Number(srcW) || 0));
  const H = Math.max(2, Math.round(Number(srcH) || 0));
  const r = cleanRect(rect);
  const w = Math.max(2, Math.min(W, Math.round((r.w / 1000) * W)));
  const h = Math.max(2, Math.min(H, Math.round((r.h / 1000) * H)));
  const x = Math.min(Math.max(0, Math.round((r.x / 1000) * W)), Math.max(0, W - w));
  const y = Math.min(Math.max(0, Math.round((r.y / 1000) * H)), Math.max(0, H - h));
  return { x, y, w, h };
}

/** Sanitize a label for the `label:x,y,w,h|...` overlay arg. */
function cleanLabel(label, fallback) {
  const s = String(label || fallback || 'crop').replace(/[|:]/g, '').trim().slice(0, 40);
  return s || 'crop';
}

/** Format rects for export_testing_layouts.ps1 -Fovea. */
function foveaArg(rects, isDefault) {
  const list = (Array.isArray(rects) ? rects : []).map((r) => {
    const c = cleanRect(r);
    return `${cleanLabel(c.label, 'crop')}:${c.x},${c.y},${c.w},${c.h}`;
  });
  if (!list.length) return 'default';
  return `${isDefault ? 'default-plan|' : ''}${list.join('|')}`;
}

module.exports = {
  defaultOverlayRects,
  cleanRect,
  selectFoveaCrops,
  rectToSourcePixels,
  cleanLabel,
  foveaArg,
};
