"use strict";
// GraveGain2dB Terrain — protected (mission-critical) cells. Never destructible.
(function (global) {
  function protectCell(cell) {
    if (!cell) return cell;
    cell.material = "protected";
    cell.missionProtected = true;
    cell.destructible = false;
    cell.hp = 999;
    cell.maxHp = 999;
    cell.collision = cell.collision || "solid";
    cell.destroyed = false;
    return cell;
  }

  function protectRect(chunk, cellsApi, x0, y0, x1, y1) {
    var out = [];
    for (var y = y0; y <= y1; y++) {
      for (var x = x0; x <= x1; x++) {
        var c = cellsApi.getCell(chunk, x, y);
        if (c) { protectCell(c); out.push(c.id); }
      }
    }
    return out;
  }

  function isProtected(cell) {
    return !!(cell && (cell.missionProtected || cell.material === "protected"));
  }

  // Attempt to damage; always blocked. Shared shape with materials.applyDamage.
  function tryDamage(cell) {
    if (!cell) return { destroyed: false, hpLeft: 0, blocked: true };
    return { destroyed: false, hpLeft: cell.hp, blocked: true };
  }

  var api = {
    protectCell: protectCell,
    protectRect: protectRect,
    isProtected: isProtected,
    tryDamage: tryDamage
  };

  global.GraveGain2dBTerrainProtected = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
