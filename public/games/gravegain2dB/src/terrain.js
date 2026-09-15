/* GraveGain2dB sim — terrain.js (A3 lane)
 * Chunked destructible terrain. Pure sim: typed arrays only, no host APIs.
 * Chunk = 16x16 cells; mats in Uint8Array + dirty flag, hp/flags/support beside.
 * Dirty flush is budgeted: at most DIRTY_PER_SEC chunks cleared per sim-second.
 */
(function () {
  'use strict';

  var NS = globalThis.GraveGain2dBSim = globalThis.GraveGain2dBSim || {};
  if (NS.createTerrain && NS.damageCell && NS.isSolid) {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = {
        createTerrain: NS.createTerrain,
        damageCell: NS.damageCell,
        isSolid: NS.isSolid,
        getCell: NS.getCell,
        setCell: NS.setCell,
        queueDamage: NS.queueDamage,
        terrainTick: NS.terrainTick
      };
    }
    return;
  }

  function tuning() {
    if (NS.TUNING) return NS.TUNING;
    if (typeof require === 'function') {
      try {
        var t = require('./tuning.js');
        if (t && t.TUNING) return t.TUNING;
      } catch (e) { /* sibling bundled ahead */ }
    }
    return { CHUNK: 16, DIRTY_PER_SEC: 16 };
  }

  function matTable() {
    if (NS.MAT_IDS) return NS.MAT_IDS;
    if (typeof require === 'function') {
      try {
        var m = require('./materials.js');
        if (m && m.MAT_IDS) return m.MAT_IDS;
      } catch (e) { /* sibling bundled ahead */ }
    }
    return { 0: { id: 0, hp: 0, solid: false, destructible: false, missionProtected: false } };
  }

  // Flag bits for chunk.flags
  var F_SOLID = 1;
  var F_DESTRUCT = 2;
  var F_PROTECT = 4;
  var F_HAZARD = 8;

  function chunkIndex() { return -1; } // placeholder replaced below (kept tiny, see keyOf)

  function keyOf(cx, cy) { return cx + ',' + cy; }

  function allocChunk() {
    return {
      mats: new Uint8Array(256),     // material id per cell
      hp: new Int16Array(256),       // remaining hp per cell
      flags: new Uint8Array(256),    // solid/destruct/protect/hazard bits
      support: new Uint16Array(256), // supportGroupId per cell (0 = none)
      dirty: false                   // render/invalidation flag
    };
  }

  function createTerrain(opts) {
    var o = opts || {};
    var T = tuning();
    var w = o.w || 120;
    var h = o.h || 34;
    var t = {
      w: w,
      h: h,
      chunkN: T.CHUNK,
      chunks: {},          // "cx,cy" -> chunk
      damageQueue: [],     // drained by sim.queueDamage step
      dirtyCount: 0,       // chunks currently flagged dirty
      dirtyBudget: T.DIRTY_PER_SEC, // refill each sim-second
      cellsChanged: 0      // since last updateNav
    };
    // Default ground slab (rows GROUND_ROW..h-1 solid gravestone on warded base).
    var groundRow = (typeof o.groundRow === 'number') ? o.groundRow : (h - 5);
    var variant = 0;
    for (var y = groundRow; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var last = (y === h - 1);
        setCell(t, x, y, {
          mat: last ? 7 : 2,
          hp: last ? 9999 : 80,
          solid: true,
          destructible: !last,
          missionProtected: last,
          supportGroupId: 0,
          hazardOnBreak: false,
          variant: (variant = (variant + 1) & 3)
        }, true);
      }
    }
    t.cellsChanged = 0;
    t.dirtyCount = 0;
    Object.keys(t.chunks).forEach(function (k) { t.chunks[k].dirty = false; });
    return t;
  }

  function chunkFor(t, cx, cy, create) {
    var k = keyOf(cx, cy);
    var c = t.chunks[k];
    if (!c && create) {
      c = allocChunk();
      // Seed hp/flags from material defaults for untouched (empty) cells:
      // mats default 0 (empty) -> flags 0 already. Nothing else needed.
      t.chunks[k] = c;
    }
    return c || null;
  }

  function inBounds(t, x, y) { return x >= 0 && y >= 0 && x < t.w && y < t.h; }

  function locOf(t, x, y) {
    var T = tuning();
    var n = T.CHUNK;
    return {
      c: chunkFor(t, Math.floor(x / n), Math.floor(y / n), false),
      i: (y % n) * n + (x % n)
    };
  }

  // Full TerrainCell in spec shape. Out of bounds: side/bottom walls read as
  // solid+protected (arena shell), sky above reads empty.
  function getCell(t, x, y) {
    if (x < 0 || x >= t.w) {
      return { mat: 7, hp: 9999, solid: true, destructible: false, missionProtected: true, supportGroupId: 0, hazardOnBreak: false, variant: 0 };
    }
    if (y < 0) {
      return { mat: 0, hp: 0, solid: false, destructible: false, missionProtected: false, supportGroupId: 0, hazardOnBreak: false, variant: 0 };
    }
    if (y >= t.h) {
      return { mat: 7, hp: 9999, solid: true, destructible: false, missionProtected: true, supportGroupId: 0, hazardOnBreak: false, variant: 0 };
    }
    var l = locOf(t, x, y);
    if (!l.c) {
      return { mat: 0, hp: 0, solid: false, destructible: false, missionProtected: false, supportGroupId: 0, hazardOnBreak: false, variant: 0 };
    }
    var f = l.c.flags[l.i];
    return {
      mat: l.c.mats[l.i],
      hp: l.c.hp[l.i],
      solid: !!(f & F_SOLID),
      destructible: !!(f & F_DESTRUCT),
      missionProtected: !!(f & F_PROTECT),
      supportGroupId: l.c.support[l.i],
      hazardOnBreak: !!(f & F_HAZARD),
      variant: 0
    };
  }

  function markDirty(t, x, y) {
    var T = tuning();
    var n = T.CHUNK;
    var c = chunkFor(t, Math.floor(x / n), Math.floor(y / n), true);
    if (!c.dirty) {
      c.dirty = true;
      t.dirtyCount++;
    }
  }

  function setCell(t, x, y, cell, skipDirty) {
    if (!inBounds(t, x, y)) return false;
    var T = tuning();
    var n = T.CHUNK;
    var c = chunkFor(t, Math.floor(x / n), Math.floor(y / n), true);
    var i = (y % n) * n + (x % n);
    c.mats[i] = cell.mat & 255;
    c.hp[i] = cell.hp;
    var f = 0;
    if (cell.solid) f |= F_SOLID;
    if (cell.destructible) f |= F_DESTRUCT;
    if (cell.missionProtected) f |= F_PROTECT;
    if (cell.hazardOnBreak) f |= F_HAZARD;
    c.flags[i] = f;
    c.support[i] = (cell.supportGroupId || 0) & 65535;
    if (!skipDirty) {
      markDirty(t, x, y);
      t.cellsChanged++;
    }
    return true;
  }

  function clearCell(t, x, y) {
    return setCell(t, x, y, {
      mat: 0, hp: 0, solid: false, destructible: false,
      missionProtected: false, supportGroupId: 0, hazardOnBreak: false, variant: 0
    });
  }

  function isSolid(t, x, y) {
    if (x < 0 || x >= t.w) return true;
    if (y < 0) return false;
    if (y >= t.h) return true;
    var l = locOf(t, x, y);
    if (!l.c) return false;
    return !!(l.c.flags[l.i] & F_SOLID);
  }

  function queueDamage(t, x, y, amount, cause) {
    if (!inBounds(t, x | 0, y | 0)) return false;
    t.damageQueue.push({ x: x | 0, y: y | 0, amount: amount, cause: cause || 'shot' });
    return true;
  }

  // Apply damage to one cell. Returns an event object (never null):
  // { broke, mat, supportGroupId, hazard, protected, ignored }
  function damageCell(t, x, y, amount, cause) {
    var cell = getCell(t, x, y);
    var ev = {
      x: x, y: y, cause: cause || 'shot',
      broke: false, mat: cell.mat, supportGroupId: cell.supportGroupId,
      hazard: false, prot: false, ignored: false
    };
    if (!inBounds(t, x, y)) { ev.ignored = true; return ev; }
    if (cell.mat === 0 || !cell.solid) { ev.ignored = true; return ev; }
    if (cell.missionProtected || !cell.destructible) { ev.prot = true; return ev; }
    var T = tuning();
    var n = T.CHUNK;
    var c = chunkFor(t, Math.floor(x / n), Math.floor(y / n), false);
    var i = (y % n) * n + (x % n);
    var hp = (c ? c.hp[i] : cell.hp) - amount;
    if (hp <= 0) {
      ev.broke = true;
      ev.hazard = cell.hazardOnBreak;
      clearCell(t, x, y);
    } else if (c) {
      c.hp[i] = hp;
      markDirty(t, x, y);
    }
    return ev;
  }

  // Budget refill: call once per step with dt; clears up to the accrued budget.
  // Returns number of chunks still dirty (render backlog signal).
  function terrainTick(t, dt) {
    var T = tuning();
    t.dirtyBudget += dt * T.DIRTY_PER_SEC;
    var cap = Math.floor(t.dirtyBudget);
    if (cap <= 0) return t.dirtyCount;
    var cleared = 0;
    var keys = Object.keys(t.chunks);
    for (var k = 0; k < keys.length && cleared < cap; k++) {
      var c = t.chunks[keys[k]];
      if (c.dirty) {
        c.dirty = false;
        cleared++;
        t.dirtyCount--;
      }
    }
    if (cleared > 0) {
      t.dirtyBudget -= cleared;
      if (t.dirtyBudget < 0) t.dirtyBudget = 0;
    }
    if (t.dirtyCount < 0) t.dirtyCount = 0;
    return t.dirtyCount;
  }

  NS.createTerrain = createTerrain;
  NS.getCell = getCell;
  NS.setCell = setCell;
  NS.clearCell = clearCell;
  NS.isSolid = isSolid;
  NS.queueDamage = queueDamage;
  NS.damageCell = damageCell;
  NS.terrainTick = terrainTick;
  NS.chunkIndex = chunkIndex;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      createTerrain: createTerrain, getCell: getCell, setCell: setCell,
      clearCell: clearCell, isSolid: isSolid, queueDamage: queueDamage,
      damageCell: damageCell, terrainTick: terrainTick
    };
  }
})();
