'use strict';
// vcwcode window-bounds helper — pure validate/clamp (no side effects, no deps).

const MIN_WIDTH = 800;
const MIN_HEIGHT = 600;

function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

function validateBounds(b) {
  if (!b || typeof b !== 'object') return false;
  if (!isFiniteNumber(b.x) || !isFiniteNumber(b.y)) return false;
  if (!isFiniteNumber(b.width) || !isFiniteNumber(b.height)) return false;
  if (b.width < MIN_WIDTH || b.height < MIN_HEIGHT) return false;
  return true;
}

function clampBounds(b, workArea) {
  const wa = workArea && typeof workArea === 'object'
    ? {
        x: isFiniteNumber(workArea.x) ? workArea.x : 0,
        y: isFiniteNumber(workArea.y) ? workArea.y : 0,
        width: isFiniteNumber(workArea.width) && workArea.width > 0 ? workArea.width : 1920,
        height: isFiniteNumber(workArea.height) && workArea.height > 0 ? workArea.height : 1080,
      }
    : { x: 0, y: 0, width: 1920, height: 1080 };
  const src = b && typeof b === 'object' ? b : {};
  let width = isFiniteNumber(src.width) ? Math.floor(src.width) : MIN_WIDTH;
  let height = isFiniteNumber(src.height) ? Math.floor(src.height) : MIN_HEIGHT;
  width = Math.max(MIN_WIDTH, Math.min(width, wa.width));
  height = Math.max(MIN_HEIGHT, Math.min(height, wa.height));
  let x = isFiniteNumber(src.x) ? Math.floor(src.x) : wa.x;
  let y = isFiniteNumber(src.y) ? Math.floor(src.y) : wa.y;
  x = Math.max(wa.x, Math.min(x, wa.x + wa.width - width));
  y = Math.max(wa.y, Math.min(y, wa.y + wa.height - height));
  return { x, y, width, height };
}

module.exports = { validateBounds, clampBounds, MIN_WIDTH, MIN_HEIGHT };
