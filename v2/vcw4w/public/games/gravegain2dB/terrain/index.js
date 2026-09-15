"use strict";
// GraveGain2dB Terrain — index. Browser global rollup (node: use individual requires).
(function (global) {
  function load(name, path) {
    if (!global[name]) {
      try {
        if (typeof require !== "undefined") global[name] = require(path);
      } catch (e) { /* browser: sibling <script> tags populate globals */ }
    }
  }
  load("GraveGain2dBTerrainCells", "./TerrainCell.js");
  load("GraveGain2dBTerrainMaterials", "./materials.js");
  load("GraveGain2dBTerrainSupport", "./supportGroups.js");
  load("GraveGain2dBTerrainProtected", "./protectedCells.js");
  load("GraveGain2dBTerrainEmergency", "./emergencyBreach.js");
  load("GraveGain2dBTerrainDebris", "./debrisPool.js");
  load("GraveGain2dBTerrainFixture", "./fixtureMission.js");

  var api = {
    Cells: global.GraveGain2dBTerrainCells || null,
    Materials: global.GraveGain2dBTerrainMaterials || null,
    Support: global.GraveGain2dBTerrainSupport || null,
    Protected: global.GraveGain2dBTerrainProtected || null,
    Emergency: global.GraveGain2dBTerrainEmergency || null,
    Debris: global.GraveGain2dBTerrainDebris || null,
    Fixture: global.GraveGain2dBTerrainFixture || null,
    VERSION: "2dB-terrain-1"
  };

  global.GraveGain2dBTerrain = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
