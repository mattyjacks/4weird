// WIRING: require from app/main.js readSavedWindowBounds() (window-state block) — e.g. const { readSavedBounds } = require('./vcwcode-window-state-guard');
'use strict';

const MIN_WIDTH = 800;
const MIN_HEIGHT = 600;

function isFiniteRect(saved) {
  return (
    saved &&
    Number.isFinite(saved.x) &&
    Number.isFinite(saved.y) &&
    Number.isFinite(saved.width) &&
    Number.isFinite(saved.height)
  );
}

function intersectsWorkArea(saved, workArea) {
  return (
    saved.x < workArea.x + workArea.width &&
    saved.x + saved.width > workArea.x &&
    saved.y < workArea.y + workArea.height &&
    saved.y + saved.height > workArea.y
  );
}

// readSavedBounds(jsonText, displays) -> bounds | null
// Pure mirror of main.js readSavedWindowBounds(): parses jsonText, validates
// finite x/y/width/height, requires the rect to still overlap at least one
// display workArea (stillVisible check), then clamps to min 800x600.
// `displays` is an array of { workArea: { x, y, width, height } }.
// Returns null on any parse/validation/off-screen input. Never throws.
function readSavedBounds(jsonText, displays) {
  try {
    const saved = JSON.parse(jsonText);
    if (!isFiniteRect(saved)) return null;
    const list = Array.isArray(displays) ? displays : [];
    const stillVisible = list.some(
      (d) => d && d.workArea && intersectsWorkArea(saved, d.workArea)
    );
    if (!stillVisible) return null;
    return {
      x: Math.round(saved.x),
      y: Math.round(saved.y),
      width: Math.max(MIN_WIDTH, Math.round(saved.width)),
      height: Math.max(MIN_HEIGHT, Math.round(saved.height)),
    };
  } catch (_) {
    return null;
  }
}

module.exports = { MIN_WIDTH, MIN_HEIGHT, readSavedBounds };
