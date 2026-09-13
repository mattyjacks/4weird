'use strict';

/**
 * vcwcode-tiling.js — pure side-by-side split-bounds math.
 *
 * Main-process helper: given the usable work area, compute the two
 * half-split rectangles for the dashboard window (left) and the game
 * window (right). Integer pixels, no overlap, no gap.
 *
 * Pure: no Electron imports, no side effects — safe to unit-test with node.
 */

/**
 * @param {{ x?: number, y?: number, width: number, height: number }} workArea
 * @returns {{ dash: {x,y,width,height}, game: {x,y,width,height} }}
 */
function splitBounds(workArea) {
  const x = Number(workArea && workArea.x) || 0;
  const y = Number(workArea && workArea.y) || 0;
  const width = Math.max(0, Math.floor(Number(workArea && workArea.width) || 0));
  const height = Math.max(0, Math.floor(Number(workArea && workArea.height) || 0));
  const leftW = Math.floor(width / 2);
  const rightW = width - leftW; // odd widths: extra pixel goes right (game)
  return {
    dash: { x, y, width: leftW, height },
    game: { x: x + leftW, y, width: rightW, height },
  };
}

module.exports = { splitBounds };
