/* GraveGain2dB: Breach MoonRock — B2 Destruction Laboratory: terrain sim (Phase 2).
 * PURE SIM: no DOM/Canvas/Audio/fetch/WebSocket/localStorage. Deterministic via seeded RNG.
 * Load order: B1 first, then sim/terrain.js, then sim/collapse.js.
 * PRECISION-vs-DESTRUCTIVE DUAL-SOLUTION CONTRACT (per encounter):
 *   Every encounter MUST document two valid solutions:
 *     (1) precision: reach objective with zero missionProtected damage and no support-group collapse.
 *     (2) destructive: reach objective using destruction shortcut (non-protected cells only);
 *   if neither route exists, emergency-fallback route (one-way shaft + rescue penalty) MUST exist.
 *   See defineEncounter() below; collapse.js validateMission() checks primary + shortcut + fallback.
 */
(function () {
if (window.GraveGain2DB_Terrain) return;
'use strict';

var CHUNK = 16;
var DIRTY_BUDGET_PER_SEC = 16;

function mulberry32(seed) {
  var s = (seed >>> 0) || 1;
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    var t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Material table. hp = hits/points. collision: 0 none, 1 soft, 2 solid.
// BURN/CUT/FAST etc. are behavior tags consumed by combat sim (not executed here).
var MATERIALS = {
  roots:     { key: 'roots',     icon: '\uD83C\uDF3F', hp: 20,  collision: 1, destructible: true,  tags: ['burn', 'cut', 'fast'], conduct: false, bulletResist: 0.0, refract: false, explosiveFracture: false, spread: false, nodeGated: false },
  wood:      { key: 'wood',      icon: '\uD83E\uDEB5', hp: 35,  collision: 2, destructible: true,  tags: ['burn', 'cut', 'fast'], conduct: false, bulletResist: 0.0, refract: false, explosiveFracture: false, spread: false, nodeGated: false },
  gravestone:{ key: 'gravestone',icon: 'HEADSTONE', hp: 120, collision: 2, destructible: true,  tags: ['bullet-resistant'], conduct: false, bulletResist: 0.85, refract: false, explosiveFracture: false, spread: false, nodeGated: false },
  rock:      { key: 'rock',      icon: 'ROCK', hp: 100, collision: 2, destructible: true,  tags: ['bullet-resistant'], conduct: false, bulletResist: 0.6, refract: false, explosiveFracture: false, spread: false, nodeGated: false },
  scrap:     { key: 'scrap',     icon: '\u2699\uFE0F', hp: 60,  collision: 2, destructible: true,  tags: ['conduct', 'shrapnel'], conduct: true, bulletResist: 0.2, refract: false, explosiveFracture: false, spread: false, nodeGated: false },
  scrap2:    { key: 'scrap2',    icon: '\uD83D\uDD29', hp: 60,  collision: 2, destructible: true,  tags: ['conduct', 'shrapnel'], conduct: true, bulletResist: 0.2, refract: false, explosiveFracture: false, spread: false, nodeGated: false },
  moonstone: { key: 'moonstone', icon: '\uD83D\uDC8E', hp: 80,  collision: 2, destructible: true,  tags: ['refract', 'explosive-fracture'], conduct: false, bulletResist: 0.3, refract: true, explosiveFracture: true, spread: false, nodeGated: false },
  necro:     { key: 'necro',     icon: '\uD83E\uDEC0', hp: 50,  collision: 1, destructible: true,  tags: ['spread', 'burst'], conduct: false, bulletResist: 0.0, refract: false, explosiveFracture: false, spread: true, nodeGated: false },
  necro2:    { key: 'necro2',    icon: '\uD83E\uDDA0', hp: 50,  collision: 1, destructible: true,  tags: ['spread', 'burst'], conduct: false, bulletResist: 0.0, refract: false, explosiveFracture: false, spread: true, nodeGated: false },
  barrier:   { key: 'barrier',   icon: '\uD83D\uDFEA', hp: 9999,collision: 2, destructible: true,  tags: ['node-gated', 'shield'], conduct: false, bulletResist: 1.0, refract: false, explosiveFracture: false, spread: false, nodeGated: true },
  shield:    { key: 'shield',    icon: '\uD83D\uDEE1\uFE0F', hp: 9999, collision: 2, destructible: true, tags: ['node-gated', 'shield'], conduct: false, bulletResist: 1.0, refract: false, explosiveFracture: false, spread: false, nodeGated: true },
  protected: { key: 'protected', icon: '\uD83E\uDDF1', hp: Infinity, collision: 2, destructible: false, tags: ['indestructible'], conduct: false, bulletResist: 1.0, refract: false, explosiveFracture: false, spread: false, nodeGated: false }
};

function makeCell(material, opts) {
  var m = MATERIALS[material] ? material : 'rock';
  var o = opts || {};
  return {
    material: m,
    hp: (typeof o.hp === 'number') ? o.hp : MATERIALS[m].hp,
    maxHp: (typeof o.hp === 'number') ? o.hp : MATERIALS[m].hp,
    collision: (typeof o.collision === 'number') ? o.collision : MATERIALS[m].collision,
    destructible: (typeof o.destructible === 'boolean') ? o.destructible : MATERIALS[m].destructible,
    missionProtected: o.missionProtected === true,
    supportGroupId: (typeof o.supportGroupId === 'string') ? o.supportGroupId : null,
    hazardOnBreak: (typeof o.hazardOnBreak === 'string') ? o.hazardOnBreak : null,
    visualVariant: (typeof o.visualVariant === 'number') ? o.visualVariant : 0,
    destroyed: false
  };
}

function chunkKey(cx, cy) { return cx + ':' + cy; }

function createGrid(seed, w, h, filler) {
  var rng = mulberry32(seed >>> 0);
  var width = Math.max(16, w | 0 || 64);
  var height = Math.max(16, h | 0 || 64);
  var cells = new Array(width * height);
  var i, m;
  var keys = Object.keys(MATERIALS);
  for (i = 0; i < cells.length; i++) {
    if (typeof filler === 'string' && MATERIALS[filler]) m = filler;
    else if (typeof filler === 'function') m = filler(i % width, (i / width) | 0, rng);
    else m = keys[(rng() * keys.length) | 0];
    cells[i] = makeCell(m, { visualVariant: (rng() * 4) | 0 });
  }
  return {
    seed: seed >>> 0, width: width, height: height, cells: cells,
    dirtyChunks: {},
    dirtyOrder: [],
    events: []
  };
}

function inBounds(grid, x, y) { return x >= 0 && y >= 0 && x < grid.width && y < grid.height; }

function getCell(grid, x, y) {
  if (!inBounds(grid, x, y)) return null;
  return grid.cells[y * grid.width + x];
}

function markDirty(grid, x, y) {
  var k = chunkKey((x / CHUNK) | 0, (y / CHUNK) | 0);
  if (!grid.dirtyChunks[k]) { grid.dirtyChunks[k] = true; grid.dirtyOrder.push(k); }
  return k;
}

function setCell(grid, x, y, cell) {
  if (!inBounds(grid, x, y)) return false;
  grid.cells[y * grid.width + x] = cell;
  markDirty(grid, x, y);
  return true;
}

// PROTECTED-CELL ENFORCEMENT: abilities/weapons can NEVER break missionProtected cells.
// damageCell/destroyCell return { ok:false, reason:'protected' } and leave hp untouched.
function damageCell(grid, x, y, amount, source) {
  var c = getCell(grid, x, y);
  if (!c || c.destroyed) return { ok: false, reason: 'missing' };
  if (c.missionProtected) return { ok: false, reason: 'protected', source: source || null };
  if (!c.destructible) return { ok: false, reason: 'indestructible' };
  c.hp -= Math.max(0, amount | 0 || 0);
  markDirty(grid, x, y);
  if (c.hp <= 0) return destroyCell(grid, x, y, source);
  return { ok: true, destroyed: false, hp: c.hp };
}

function destroyCell(grid, x, y, source) {
  var c = getCell(grid, x, y);
  if (!c || c.destroyed) return { ok: false, reason: 'missing' };
  if (c.missionProtected) return { ok: false, reason: 'protected', source: source || null };
  if (!c.destructible) return { ok: false, reason: 'indestructible' };
  c.destroyed = true;
  c.collision = 0;
  markDirty(grid, x, y);
  var ev = { type: 'cell-destroyed', x: x, y: y, material: c.material,
    hazardOnBreak: c.hazardOnBreak, supportGroupId: c.supportGroupId, source: source || null };
  grid.events.push(ev);
  return { ok: true, destroyed: true, event: ev };
}

function protectCell(grid, x, y) {
  var c = getCell(grid, x, y);
  if (!c) return false;
  c.missionProtected = true;
  markDirty(grid, x, y);
  return true;
}

function unprotectCell(grid, x, y) {
  var c = getCell(grid, x, y);
  if (!c) return false;
  c.missionProtected = false;
  markDirty(grid, x, y);
  return true;
}

// Dirty-chunk tracking: flush at most `budget` (default 16/sec) per call.
function peekDirty(grid) { return grid.dirtyOrder.slice(); }
function flushDirty(grid, budget) {
  var n = (typeof budget === 'number') ? budget : DIRTY_BUDGET_PER_SEC;
  var out = [];
  while (n-- > 0 && grid.dirtyOrder.length) {
    var k = grid.dirtyOrder.shift();
    delete grid.dirtyChunks[k];
    out.push(k);
  }
  return out;
}
function drainEvents(grid) { var e = grid.events; grid.events = []; return e; }

// Deterministic grid hash (FNV-1a over material+hp+flags). Same seed+ops => same hash.
function hashGrid(grid) {
  var h = 0x811c9dc5;
  for (var i = 0; i < grid.cells.length; i++) {
    var c = grid.cells[i];
    var s = c.material + '|' + (c.hp === Infinity ? 'INF' : c.hp) + '|' + c.collision + '|' +
      (c.destructible ? 1 : 0) + '|' + (c.missionProtected ? 1 : 0) + '|' +
      (c.supportGroupId || '') + '|' + (c.destroyed ? 1 : 0) + ';';
    for (var j = 0; j < s.length; j++) { h ^= s.charCodeAt(j); h = Math.imul(h, 0x01000193); }
  }
  return (h >>> 0).toString(16);
}

// Dual-solution encounter contract: documents precision + destructive solutions.
function defineEncounter(id, precision, destructive) {
  return {
    id: id,
    precision: precision || { route: [], breaksNothingProtected: true },
    destructive: destructive || { route: [], breaksOnlyNonProtected: true },
    contract: 'precision-vs-destructive: both routes must avoid missionProtected cells'
  };
}

var api = {
  CHUNK: CHUNK, DIRTY_BUDGET_PER_SEC: DIRTY_BUDGET_PER_SEC, MATERIALS: MATERIALS,
  mulberry32: mulberry32, makeCell: makeCell, createGrid: createGrid,
  getCell: getCell, setCell: setCell, damageCell: damageCell, destroyCell: destroyCell,
  protectCell: protectCell, unprotectCell: unprotectCell,
  markDirty: markDirty, peekDirty: peekDirty, flushDirty: flushDirty, drainEvents: drainEvents,
  hashGrid: hashGrid, defineEncounter: defineEncounter
};
window.GraveGain2DB_Terrain = api;
if (!window.GraveGainMods) window.GraveGainMods = [];
window.GraveGainMods.push({ mod: 'gravegain2dB-terrain', version: 1, api: api });
})();
