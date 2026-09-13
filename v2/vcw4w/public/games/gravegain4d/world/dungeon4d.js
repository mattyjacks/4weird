/* GraveGain4D world: seeded tesseract-dungeon generator.
 * Vanilla IIFE. Exposes window.GraveGain4DWorld (created here).
 * Original code. Theme NAMES mirror GraveGain3D dungeon-generator and the
 * shared 10-mission engine (read-only references); all 4D layout logic is new.
 * Fail-open: every public function guards inputs and never throws to callers.
 * Uses window.GraveGain4DMath.mulberry32 when present, else local fallback.
 */
(function () {
  'use strict';

  var ROOT = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);

  if (ROOT.GraveGain4DWorld && ROOT.GraveGain4DWorld.dungeonVersion === '4d-dungeon-1') return;

  var THEMES = [
    'metallic_ship',
    'elven_grove',
    'dwarven_vault',
    'orc_wastes',
    'toxic_catacombs',
    'stone_crypt',
    'citadel_darkness'
  ];
  var DEFAULT_THEME = 'stone_crypt';

  // Per-theme enemy/gold spawn tables. Weights are relative; runtime rolls
  // seeded RNG against them. Gold values are base drops per kill/cache.
  var SPAWNS = {
    metallic_ship:   { enemies: [{ t: 'rust_zed', w: 4 }, { t: 'volt_ghoul', w: 3 }, { t: 'deck_wraith', w: 1 }], gold: [{ t: 'scrap', w: 5, v: 8 }, { t: 'coil_cache', w: 2, v: 25 }] },
    elven_grove:     { enemies: [{ t: 'thorn_zed', w: 4 }, { t: 'grove_wisp', w: 3 }, { t: 'corrupt_seer', w: 1 }], gold: [{ t: 'sap', w: 5, v: 8 }, { t: 'grove_relic', w: 2, v: 28 }] },
    dwarven_vault:   { enemies: [{ t: 'forge_zed', w: 3 }, { t: 'vault_mimic', w: 2 }, { t: 'deep_duergar', w: 2 }], gold: [{ t: 'sparkite', w: 4, v: 15 }, { t: 'vault_chest', w: 2, v: 40 }] },
    orc_wastes:      { enemies: [{ t: 'waste_zed', w: 5 }, { t: 'ash_orc', w: 3 }, { t: 'arena_brute', w: 1 }], gold: [{ t: 'bone_chit', w: 5, v: 6 }, { t: 'war_trophy', w: 2, v: 30 }] },
    toxic_catacombs: { enemies: [{ t: 'bile_zed', w: 4 }, { t: 'spore_ghoul', w: 3 }, { t: 'plague_monk', w: 1 }], gold: [{ t: 'phial', w: 5, v: 7 }, { t: 'antidote_cache', w: 2, v: 26 }] },
    stone_crypt:     { enemies: [{ t: 'crypt_zed', w: 4 }, { t: 'bone_archer', w: 2 }, { t: 'sarcophagus_lord', w: 1 }], gold: [{ t: 'bone_chit', w: 4, v: 7 }, { t: 'crypt_offering', w: 2, v: 30 }] },
    citadel_darkness:{ enemies: [{ t: 'shade_zed', w: 3 }, { t: 'null_acolyte', w: 3 }, { t: 'hadal_knight', w: 1 }], gold: [{ t: 'umbral_shard', w: 4, v: 14 }, { t: 'sanctum_relic', w: 2, v: 45 }] }
  };

  var CELL_SPAN = 30;  // x/z half-extent of a cell centre
  var CELL_SIZE = 22;  // x/z full size of a cell
  var CELL_H = 10;     // y full size
  var W_SPAN = 24;     // w half-extent across the floor
  var W_CELL = 12;     // w full size of a cell

  function hashSeed(seed) {
    if (typeof seed === 'number' && isFinite(seed)) return seed >>> 0;
    var s = String(seed === undefined || seed === null ? 'gravegain4d' : seed);
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function localMulberry32(a) {
    var t = a >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) >>> 0;
      var z = t;
      z = Math.imul(z ^ (z >>> 15), z | 1);
      z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
      return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeRng(seed) {
    try {
      var M = ROOT.GraveGain4DMath;
      if (M && typeof M.mulberry32 === 'function') return M.mulberry32(hashSeed(seed));
    } catch (e) { /* fall through to local */ }
    return localMulberry32(hashSeed(seed));
  }

  function toFinite(v, fb) {
    var f = (typeof fb === 'number' && isFinite(fb)) ? fb : 0;
    var n = (typeof v === 'number') ? v : parseFloat(v);
    return isFinite(n) ? n : f;
  }

  function resolveTheme(theme) {
    if (typeof theme === 'string' && SPAWNS.hasOwnProperty(theme)) return theme;
    return DEFAULT_THEME;
  }

  function range(rand, lo, hi) { return lo + rand() * (hi - lo); }
  function rangeInt(rand, lo, hi) { return lo + Math.floor(rand() * (hi - lo + 1)); }
  function pick(rand, arr) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(rand() * arr.length) % arr.length];
  }
  function v4(x, y, z, w) { return { x: x, y: y, z: z, w: w }; }

  // 8-cell tesseract layout: cube corners (±1,±1,±1) at two w slabs.
  // Cell i: low nibble bit0..2 -> x/y/z sign, bit3 -> w slab (ana/kata).
  function cellSigns(i) {
    return {
      sx: (i & 1) ? 1 : -1,
      sy: (i & 2) ? 1 : -1,
      sz: (i & 4) ? 1 : -1,
      sw: (i & 8) ? 1 : -1
    };
  }

  function rollSpawns(rand, theme, cellId) {
    var tab = SPAWNS[theme] || SPAWNS[DEFAULT_THEME];
    var enemies = [];
    var n = rangeInt(rand, 2, 4 + (cellId === 7 ? 2 : 0));
    for (var i = 0; i < n; i++) {
      var tot = 0, k;
      for (k = 0; k < tab.enemies.length; k++) tot += tab.enemies[k].w;
      var roll = rand() * tot, chosen = tab.enemies[0].t;
      for (k = 0; k < tab.enemies.length; k++) {
        roll -= tab.enemies[k].w;
        if (roll <= 0) { chosen = tab.enemies[k].t; break; }
      }
      enemies.push({
        type: chosen,
        pos: v4(range(rand, -CELL_SIZE / 2 + 2, CELL_SIZE / 2 - 2), 0, range(rand, -CELL_SIZE / 2 + 2, CELL_SIZE / 2 - 2), range(rand, -2, 2))
      });
    }
    var gold = [];
    var g = rangeInt(rand, 1, 3);
    for (var j = 0; j < g; j++) {
      var gt = 0, m;
      for (m = 0; m < tab.gold.length; m++) gt += tab.gold[m].w;
      var gr = rand() * gt, entry = tab.gold[0];
      for (m = 0; m < tab.gold.length; m++) {
        gr -= tab.gold[m].w;
        if (gr <= 0) { entry = tab.gold[m]; break; }
      }
      gold.push({
        type: entry.t, value: entry.v,
        pos: v4(range(rand, -CELL_SIZE / 2 + 2, CELL_SIZE / 2 - 2), 0, range(rand, -CELL_SIZE / 2 + 2, CELL_SIZE / 2 - 2), range(rand, -2, 2))
      });
    }
    return { enemies: enemies, gold: gold };
  }

  // Golf-like hole helper: par drives fairway length, not difficulty spikes.
  function genHole(par) {
    var p = Math.round(toFinite(par, 3));
    if (!(p >= 2 && p <= 6)) p = 3;
    return {
      par: p,
      fairwayLength: p <= 2 ? 'short' : (p <= 4 ? 'mid' : 'long'),
      maxStrokes: p + 3,
      cupBonus: p * 50
    };
  }

  // missionId selects hole index flavour; theme + seed drive layout.
  function genFloor(opts) {
    opts = opts || {};
    var theme = resolveTheme(opts.theme);
    var missionId = Math.round(toFinite(opts.missionId, 1));
    if (!(missionId >= 1 && missionId <= 10)) missionId = 1;
    var rand = makeRng(opts.seed !== undefined ? opts.seed : ('m' + missionId + ':' + theme));

    var cells = [];
    var wSlab = W_SPAN / 2;
    for (var i = 0; i < 8; i++) {
      var s = cellSigns(i);
      var cx = s.sx * CELL_SPAN / 2 + range(rand, -3, 3);
      var cy = range(rand, 0, 4);
      var cz = s.sz * CELL_SPAN / 2 + range(rand, -3, 3);
      var cw = s.sw * wSlab + range(rand, -2, 2);
      var role = (i === 0) ? 'tee' : (i === 7 ? 'green' : 'fairway');
      var hole = genHole(rangeInt(rand, 2, 5));
      var sp = rollSpawns(rand, theme, i);
      var anchor = (i === 7) ? {
        // Grave-hole anchor: the cup the putt must enter.
        pos: v4(cx + range(rand, -4, 4), 0, cz + range(rand, -4, 4), cw),
        captureRadius: 2.2,
        par: hole.par
      } : null;
      cells.push({
        id: i,
        role: role,
        bounds4: {
          min: v4(cx - CELL_SIZE / 2, cy - CELL_H / 2, cz - CELL_SIZE / 2, cw - W_CELL / 2),
          max: v4(cx + CELL_SIZE / 2, cy + CELL_H / 2, cz + CELL_SIZE / 2, cw + W_CELL / 2)
        },
        centre: v4(cx, cy, cz, cw),
        slab: (s.sw < 0) ? 'ana' : 'kata',
        theme: theme,
        anchor: anchor,
        par: hole.par,
        fairway: hole.fairwayLength,
        enemies: sp.enemies,
        gold: sp.gold,
        // Tesseract adjacency: neighbours differ by exactly one bit.
        links: tesseractLinks(i)
      });
    }

    var totalPar = 0, c;
    for (c = 0; c < cells.length; c++) totalPar += cells[c].par;

    return {
      missionId: missionId,
      theme: theme,
      seed: String(opts.seed !== undefined ? opts.seed : ('m' + missionId + ':' + theme)),
      cells: cells,
      tee: cells[0].centre,
      anchor: cells[7].anchor,
      totalPar: totalPar,
      flow: [0, 1, 2, 3, 4, 5, 6, 7],
      wSpan: W_SPAN
    };
  }

  function tesseractLinks(i) {
    var out = [];
    for (var b = 0; b < 4; b++) out.push(i ^ (1 << b));
    return out;
  }

  var api = {
    THEMES: THEMES.slice(),
    SPAWNS: SPAWNS,
    DEFAULT_THEME: DEFAULT_THEME,
    genFloor: genFloor,
    genHole: genHole,
    tesseractLinks: tesseractLinks,
    dungeonVersion: '4d-dungeon-1'
  };

  ROOT.GraveGain4DWorld = api;
  return api;
})();
