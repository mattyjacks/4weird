/* GraveGain2dB sim — materials.js (A3 lane)
 * Material table for Breach Physics. Pure data + tiny helpers, no host APIs.
 * Idempotent guard matches game.js so script order / double-load is safe.
 */
(function () {
  'use strict';

  var NS = globalThis.GraveGain2dBSim = globalThis.GraveGain2dBSim || {};
  if (NS.MATERIALS) {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = { MATERIALS: NS.MATERIALS, MAT_IDS: NS.MAT_IDS, makeCell: NS.makeCell };
    }
    return;
  }

  function needTuning() {
    if (NS.TUNING) return NS.TUNING;
    if (typeof require === 'function') {
      try {
        var t = require('./tuning.js');
        if (t && t.TUNING) return t.TUNING;
      } catch (e) { /* sibling not on disk (bundled order) */ }
    }
    return null;
  }

  // id: numeric cell code stored in chunk Uint8Array.
  // hp: hits of sustained/damage units before break (scaled by blastResist).
  // solid / destructible / missionProtected drive terrain + collapse rules.
  // beam: how Moonbeam-type damage treats it (flavor for damage routing).
  var MATERIALS = {
    empty:      { id: 0, key: 'empty',      name: 'Open',            hp: 0,   solid: false, destructible: false, missionProtected: false, blastResist: 0,   beam: 'pass',    burnable: false, glyph: ' ' },
    roots:      { id: 1, key: 'roots',      name: 'Tangle Roots',    hp: 20,  solid: true,  destructible: true,  missionProtected: false, blastResist: 0.2, beam: 'burn',    burnable: true,  glyph: 'r' },
    gravestone: { id: 2, key: 'gravestone', name: 'Grave Masonry',   hp: 80,  solid: true,  destructible: true,  missionProtected: false, blastResist: 0.7, beam: 'block',   burnable: false, glyph: 'g' },
    scrap:      { id: 3, key: 'scrap',      name: 'Scrap Metal',     hp: 60,  solid: true,  destructible: true,  missionProtected: false, blastResist: 0.5, beam: 'conduct', burnable: false, glyph: 's' },
    moonstone:  { id: 4, key: 'moonstone',  name: 'Moonstone',       hp: 50,  solid: true,  destructible: true,  missionProtected: false, blastResist: 0.4, beam: 'refract', burnable: false, glyph: 'm' },
    necro:      { id: 5, key: 'necro',      name: 'Necro Growth',    hp: 35,  solid: true,  destructible: true,  missionProtected: false, blastResist: 0.1, beam: 'rupture', burnable: true,  glyph: 'n' },
    barrier:    { id: 6, key: 'barrier',    name: 'Force Barrier',   hp: 120, solid: true,  destructible: true,  missionProtected: false, blastResist: 0.9, beam: 'shield',  burnable: false, glyph: 'b', nodeLinked: true },
    protect:    { id: 7, key: 'protect',    name: 'Warded Bedrock',  hp: 9999, solid: true, destructible: false, missionProtected: true,  blastResist: 1,   beam: 'block',   burnable: false, glyph: 'p' }
  };

  var MAT_IDS = {};
  Object.keys(MATERIALS).forEach(function (k) { MAT_IDS[MATERIALS[k].id] = MATERIALS[k]; });

  // Build a TerrainCell in spec shape:
  // { mat, hp, solid, destructible, missionProtected, supportGroupId, hazardOnBreak, variant }
  // variant is cosmetic (0-3), assigned by caller via injected rng.
  function makeCell(matKey, opts) {
    var m = MATERIALS[matKey] || MATERIALS.empty;
    var o = opts || {};
    return {
      mat: m.id,
      hp: (typeof o.hp === 'number') ? o.hp : m.hp,
      solid: m.solid,
      destructible: m.destructible,
      missionProtected: m.missionProtected,
      supportGroupId: (typeof o.supportGroupId === 'number') ? o.supportGroupId : 0,
      hazardOnBreak: !!o.hazardOnBreak,
      variant: (typeof o.variant === 'number') ? (o.variant & 3) : 0
    };
  }

  function matKeyFor(id) {
    var m = MAT_IDS[id];
    return m ? m.key : 'empty';
  }

  NS.MATERIALS = MATERIALS;
  NS.MAT_IDS = MAT_IDS;
  NS.makeCell = makeCell;
  NS.matKeyFor = matKeyFor;
  NS._needTuning = needTuning;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MATERIALS: MATERIALS, MAT_IDS: MAT_IDS, makeCell: makeCell, matKeyFor: matKeyFor };
  }
})();
