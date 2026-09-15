"use strict";
// GraveGain2dB Terrain — 7 materials with damage behavior table.
// Globals only under window.GraveGain2dBTerrain*.
(function (global) {
  // damage behavior: hp, tool multiplier profile, breaksInto, hazard, notes.
  var MATERIALS = {
    roots:      { hp: 10,  destructible: true,  collision: "solid", blastResist: 0.0, toolMult: { pick: 1.5, shovel: 1.5, blade: 1.0 }, breaksInto: "fiber",    hazardOnBreak: null,            chainCollapse: false },
    stone:      { hp: 40,  destructible: true,  collision: "solid", blastResist: 0.5, toolMult: { pick: 1.5, shovel: 0.5, blade: 0.5 }, breaksInto: "rubble",   hazardOnBreak: null,            chainCollapse: false },
    scrap:      { hp: 25,  destructible: true,  collision: "solid", blastResist: 0.25, toolMult: { pick: 1.0, shovel: 1.0, blade: 1.5 }, breaksInto: "scrapbits", hazardOnBreak: null,            chainCollapse: false },
    moonstone:  { hp: 60,  destructible: true,  collision: "solid", blastResist: 0.75, toolMult: { pick: 1.0, shovel: 0.5, blade: 0.5 }, breaksInto: "moondust",  hazardOnBreak: null,            chainCollapse: false },
    necro:      { hp: 30,  destructible: true,  collision: "solid", blastResist: 0.25, toolMult: { pick: 1.0, shovel: 1.0, blade: 1.0 }, breaksInto: "ash",       hazardOnBreak: "gas",           chainCollapse: false },
    barrier:    { hp: 999, destructible: false, collision: "solid", blastResist: 1.0, toolMult: { pick: 0.0, shovel: 0.0, blade: 0.0 }, breaksInto: null,          hazardOnBreak: null,            chainCollapse: false },
    protected:  { hp: 999, destructible: false, collision: "solid", blastResist: 1.0, toolMult: { pick: 0.0, shovel: 0.0, blade: 0.0 }, breaksInto: null,          hazardOnBreak: null,            chainCollapse: false }
  };

  function getMaterial(name) {
    return MATERIALS[name] || null;
  }

  function listMaterials() {
    return Object.keys(MATERIALS);
  }

  // Returns damage dealt after tool + blast modifiers. Protected/barrier => 0.
  function damageFor(materialName, baseDamage, tool, isBlast) {
    var m = getMaterial(materialName);
    if (!m) return 0;
    if (!m.destructible) return 0;
    var mult = (tool && m.toolMult[tool]) !== undefined ? m.toolMult[tool] : 1.0;
    var dmg = baseDamage * mult;
    if (isBlast) dmg = dmg * (1.0 - m.blastResist);
    return Math.max(0, Math.round(dmg));
  }

  // Applies damage to a TerrainCell in place. Returns { destroyed, hpLeft, blocked }.
  function applyDamage(cell, baseDamage, tool, isBlast) {
    if (!cell) return { destroyed: false, hpLeft: 0, blocked: true };
    if (cell.destroyed) return { destroyed: true, hpLeft: 0, blocked: false };
    if (cell.missionProtected) return { destroyed: false, hpLeft: cell.hp, blocked: true };
    var m = getMaterial(cell.material);
    if (!m || !m.destructible || cell.destructible === false) {
      return { destroyed: false, hpLeft: cell.hp, blocked: true };
    }
    var dmg = damageFor(cell.material, baseDamage, tool, isBlast);
    cell.hp -= dmg;
    if (cell.hp <= 0) {
      cell.hp = 0;
      cell.destroyed = true;
      cell.collision = "none";
      if (m.hazardOnBreak && !cell.hazardOnBreak) cell.hazardOnBreak = m.hazardOnBreak;
      return { destroyed: true, hpLeft: 0, blocked: false };
    }
    return { destroyed: false, hpLeft: cell.hp, blocked: false };
  }

  function spawnDefaults(cell) {
    var m = getMaterial(cell.material);
    if (!m) return { hp: 10, collision: "solid", destructible: true };
    return { hp: m.hp, collision: m.collision, destructible: m.destructible };
  }

  var api = {
    MATERIALS: MATERIALS,
    getMaterial: getMaterial,
    listMaterials: listMaterials,
    damageFor: damageFor,
    applyDamage: applyDamage,
    spawnDefaults: spawnDefaults
  };

  global.GraveGain2dBTerrainMaterials = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
