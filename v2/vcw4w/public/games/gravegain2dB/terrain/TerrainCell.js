"use strict";
// GraveGain2dB Terrain — 16x16 chunk-grid TerrainCell store.
// Globals only under window.GraveGain2dBTerrain*. Browser + node compatible.
(function (global) {
  var CHUNK = 16;

  var _uid = 0;
  function nextId(prefix) {
    _uid += 1;
    return (prefix || "cell") + "-" + _uid;
  }

  // TerrainCell factory. All fields explicit so saves stay deterministic.
  function createCell(x, y, opts) {
    var o = opts || {};
    return {
      id: o.id || nextId("tc"),
      x: x | 0,
      y: y | 0,
      material: o.material || "roots",
      hp: typeof o.hp === "number" ? o.hp : 10,
      maxHp: typeof o.maxHp === "number" ? o.maxHp : (typeof o.hp === "number" ? o.hp : 10),
      collision: o.collision || "solid", // solid | platform | none
      destructible: o.destructible !== undefined ? !!o.destructible : true,
      missionProtected: !!o.missionProtected,
      supportGroupId: o.supportGroupId || null,
      hazardOnBreak: o.hazardOnBreak || null, // null | "spikes" | "gas" | "collapse-debris"
      visualVariant: typeof o.visualVariant === "number" ? o.visualVariant : 0,
      destroyed: !!o.destroyed
    };
  }

  // Chunk store: exactly 16x16 cells, indexed [y][x].
  function createChunk(chunkX, chunkY, fillMaterial) {
    var cells = [];
    for (var y = 0; y < CHUNK; y++) {
      var row = [];
      for (var x = 0; x < CHUNK; x++) {
        row.push(createCell(x, y, { material: fillMaterial || "roots" }));
      }
      cells.push(row);
    }
    return { chunkX: chunkX | 0, chunkY: chunkY | 0, size: CHUNK, cells: cells };
  }

  function getCell(chunk, x, y) {
    if (!chunk || !chunk.cells) return null;
    if (x < 0 || y < 0 || x >= CHUNK || y >= CHUNK) return null;
    return chunk.cells[y][x];
  }

  function setCell(chunk, cell) {
    if (!chunk || !cell) return false;
    if (cell.x < 0 || cell.y < 0 || cell.x >= CHUNK || cell.y >= CHUNK) return false;
    chunk.cells[cell.y][cell.x] = cell;
    return true;
  }

  function isPassable(cell) {
    if (!cell) return false;
    if (cell.destroyed) return true;
    return cell.collision === "none";
  }

  function serialize(chunk) {
    return JSON.stringify({ chunkX: chunk.chunkX, chunkY: chunk.chunkY, size: CHUNK, cells: chunk.cells });
  }

  function deserialize(json) {
    var o = typeof json === "string" ? JSON.parse(json) : json;
    var chunk = createChunk(o.chunkX || 0, o.chunkY || 0, "roots");
    for (var y = 0; y < CHUNK; y++) {
      for (var x = 0; x < CHUNK; x++) {
        var c = o.cells && o.cells[y] ? o.cells[y][x] : null;
        if (c) chunk.cells[y][x] = createCell(x, y, c);
      }
    }
    return chunk;
  }

  var api = {
    CHUNK_SIZE: CHUNK,
    createCell: createCell,
    createChunk: createChunk,
    getCell: getCell,
    setCell: setCell,
    isPassable: isPassable,
    serialize: serialize,
    deserialize: deserialize
  };

  global.GraveGain2dBTerrainCells = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
