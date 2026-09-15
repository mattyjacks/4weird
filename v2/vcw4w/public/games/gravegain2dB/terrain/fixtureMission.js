"use strict";
// GraveGain2dB Terrain — fixture mission proving 3 routes reach the objective:
// primary (open gap), destructive-shortcut (blast scrap wall), fallback (Valley-Net shaft).
// Browser + node compatible. Requires sibling modules via global or require.
(function (global) {
  function load(dep) {
    if (global["GraveGain2dB" + dep]) return global["GraveGain2dB" + dep];
    try { return require("./" + dep.charAt(0).toLowerCase() + dep.slice(1)); } catch (e) { return null; }
  }

  function cells() { return load("TerrainCells"); }
  function mats() { return load("TerrainMaterials"); }
  function prot() { return load("TerrainProtected"); }
  function supp() { return load("TerrainSupport"); }

  var START = { x: 1, y: 1 };
  var OBJECTIVE = { x: 14, y: 14 };
  var WALL_X = 8;
  var GAP = [[8, 14], [8, 15]];
  var SHORTCUT = [[8, 6], [8, 7]];
  var SHAFT = { x: 8, fromY: 0, toY: 15 };

  function buildFixture() {
    var C = cells(), M = mats(), P = prot(), S = supp();
    var chunk = C.createChunk(0, 0, "roots");
    // Open floor: everything walkable by default.
    for (var y = 0; y < 16; y++) {
      for (var x = 0; x < 16; x++) {
        var c = C.getCell(chunk, x, y);
        c.collision = "none";
        c.destroyed = false;
        c.hp = 1; c.maxHp = 1;
      }
    }
    function solidAt(x, y, material, hp) {
      var c = C.getCell(chunk, x, y);
      var d = M.spawnDefaults({ material: material });
      c.material = material;
      c.hp = hp || d.hp; c.maxHp = c.hp;
      c.collision = "solid"; c.destroyed = false;
      c.destructible = M.getMaterial(material).destructible;
      return c;
    }
    // Dividing wall x=8, y=0..13 solid stone; gap y=14..15 stays open (primary).
    for (var wy = 0; wy <= 13; wy++) {
      if (wy === 6 || wy === 7) solidAt(WALL_X, wy, "scrap", 25);
      else solidAt(WALL_X, wy, "stone", 40);
    }
    // One necro cell for hazard proof (not on critical path).
    solidAt(3, 3, "necro", 30);
    // Protected objective + guard cell.
    P.protectCell(C.getCell(chunk, OBJECTIVE.x, OBJECTIVE.y));
    P.protectCell(C.getCell(chunk, 14, 13));
    // Support group demo: anchors top of wall, attached upper wall.
    var group = S.createGroup("sg-fixture-1", [S.key(8, 0)], [S.key(8, 1), S.key(8, 2)]);
    return {
      chunk: chunk, start: START, objective: OBJECTIVE,
      wallX: WALL_X, gap: GAP, shortcut: SHORTCUT, shaft: SHAFT,
      supportGroupId: group.id, supportGroup: group,
      protected: [[14, 14], [14, 13]]
    };
  }

  // BFS reachability over passable cells. Returns { reachable, length, path }.
  function findPath(chunk, start, goal) {
    var C = cells();
    var prev = {};
    var seen = {};
    var q = [[start.x, start.y]];
    seen[start.x + "," + start.y] = true;
    prev[start.x + "," + start.y] = null;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (q.length) {
      var cur = q.shift();
      if (cur[0] === goal.x && cur[1] === goal.y) {
        var path = [];
        var k = cur[0] + "," + cur[1];
        while (k) { path.unshift(k); k = prev[k]; }
        return { reachable: true, length: path.length, path: path };
      }
      for (var i = 0; i < dirs.length; i++) {
        var nx = cur[0] + dirs[i][0], ny = cur[1] + dirs[i][1];
        var kk = nx + "," + ny;
        if (nx < 0 || ny < 0 || nx >= 16 || ny >= 16 || seen[kk]) continue;
        var cell = C.getCell(chunk, nx, ny);
        // Start/goal always traversable; else need passable.
        var ok = (nx === goal.x && ny === goal.y) ? true : C.isPassable(cell);
        if (nx === start.x && ny === start.y) ok = true;
        if (!ok) continue;
        seen[kk] = true;
        prev[kk] = cur[0] + "," + cur[1];
        q.push([nx, ny]);
      }
    }
    return { reachable: false, length: -1, path: [] };
  }

  var api = {
    START: START, OBJECTIVE: OBJECTIVE, WALL_X: WALL_X,
    GAP: GAP, SHORTCUT: SHORTCUT, SHAFT: SHAFT,
    buildFixture: buildFixture, findPath: findPath
  };

  global.GraveGain2dBTerrainFixture = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
