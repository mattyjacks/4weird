/* GraveGain4D worlds: seeded hypercube dungeon builder.
 * Vanilla IIFE. Exposes window.GraveGain4DWorlds (created here, extended by timelines.js).
 * Original code. Theme NAMES mirror GraveGain3D's dungeon-generator (read-only
 * reference, never edited here); all 4D layout/spin/dreaming logic is new.
 * Fail-open: every public function guards inputs and never throws to callers.
 */
(function () {
  'use strict';

  var THEMES = [
    'metallic_ship',
    'elven_grove',
    'dwarven_vault',
    'orc_wastes',
    'toxic_catacombs',
    'citadel_darkness',
    'stone_crypt'
  ];

  var HOLE_COUNT = 10;
  var COURSE_SPAN = 60;   // x/z half-extent of tee placement
  var W_SPAN = 24;        // w half-extent (ana/kata axis)
  var CUP_MIN_DIST = 18;  // min tee->cup distance on a hole
  var CUP_MAX_DIST = 46;  // max tee->cup distance on a hole

  // Seeded PRNG (mulberry32). Seed may be any number/string; strings are hashed.
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

  function mulberry32(a) {
    var t = a >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) >>> 0;
      var z = t;
      z = Math.imul(z ^ (z >>> 15), z | 1);
      z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
      return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    };
  }

  function range(rand, lo, hi) {
    return lo + rand() * (hi - lo);
  }

  function pick(rand, arr) {
    return arr[Math.floor(rand() * arr.length) % arr.length];
  }

  function vec4(x, y, z, w) {
    return { x: x, y: y, z: z, w: w };
  }

  function randomVec4(rand, span, wSpan) {
    return vec4(
      range(rand, -span, span),
      range(rand, 0, 12),
      range(rand, -span, span),
      range(rand, -wSpan, wSpan)
    );
  }

  function dist4(a, b) {
    var dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z, dw = a.w - b.w;
    return Math.sqrt(dx * dx + dy * dy + dz * dz + dw * dw);
  }

  var MISSION_WORDS = ['vault', 'grove', 'wastes', 'crypt', 'citadel', 'ship', 'depths', 'gate', 'hollow', 'spire'];

  function buildHole(rand, n) {
    var theme = pick(rand, THEMES);
    var tee = randomVec4(rand, COURSE_SPAN, W_SPAN);
    // Cup: resample until it sits a fair 4D distance from the tee.
    var cup = randomVec4(rand, COURSE_SPAN, W_SPAN);
    var guard = 0;
    while ((dist4(tee, cup) < CUP_MIN_DIST || dist4(tee, cup) > CUP_MAX_DIST) && guard < 40) {
      cup = randomVec4(rand, COURSE_SPAN, W_SPAN);
      guard++;
    }
    var par = 3 + Math.floor(rand() * 3); // 3-5
    var hazardCount = 2 + Math.floor(rand() * 4); // 2-5 hazards
    var hazards = [];
    for (var i = 0; i < hazardCount; i++) {
      var center = vec4(
        range(rand, -COURSE_SPAN, COURSE_SPAN),
        range(rand, 0, 10),
        range(rand, -COURSE_SPAN, COURSE_SPAN),
        range(rand, -W_SPAN, W_SPAN)
      );
      var wRange = range(rand, 2, 10);
      hazards.push({
        center: center,
        radius: range(rand, 2.5, 7),
        wRange: wRange
      });
    }
    return {
      hole: n,
      missionId: 'g4d-' + String(n) + '-' + theme,
      title: 'Hole ' + n + ' — ' + theme.replace(/_/g, ' ') + ' ' + pick(rand, MISSION_WORDS),
      dungeonTheme: theme,
      par: par,
      tee: tee,
      cup: cup,
      hazards: hazards,
      tesseractSpin: {
        xw: range(rand, -0.35, 0.35),
        yw: range(rand, -0.35, 0.35),
        zw: range(rand, -0.35, 0.35)
      }
    };
  }

  // Last built course (module state). dreamingDungeon mutates the NEXT hole
  // from prior shots; getHole reads from here.
  var course = null;
  var courseSeed = null;

  function buildCourse(seed) {
    try {
      var rand = mulberry32(hashSeed(seed));
      var holes = [];
      for (var n = 1; n <= HOLE_COUNT; n++) {
        holes.push(buildHole(rand, n));
      }
      course = holes;
      courseSeed = seed === undefined || seed === null ? 'gravegain4d' : seed;
      return holes;
    } catch (e) {
      return [];
    }
  }

  function getHole(n) {
    try {
      if (!course) buildCourse(courseSeed);
      n = Number(n);
      if (!isFinite(n) || n < 1 || n > course.length) return null;
      return course[Math.floor(n) - 1] || null;
    } catch (e) {
      return null;
    }
  }

  // AI-Minecraft-inspired generative reshaping: the world builds around the
  // player. Given the shots taken on previous holes, mutate the upcoming
  // hole: drift the cup along W away from overshot lines, grow/shrink hazard
  // radii toward the player's miss pattern, and nudge tesseract spin rates.
  // prevShots: [{ hole, strokes, overshootW, avgDrift }] — all fields optional.
  // Returns the mutated next-hole object, or null (fail-open) when no course
  // exists yet or the argument is unusable.
  function dreamingDungeon(prevShots) {
    try {
      if (!course || !course.length) return null;
      if (!Array.isArray(prevShots) || prevShots.length === 0) return null;
      var last = prevShots[prevShots.length - 1] || {};
      var playedHole = Number(last.hole);
      if (!isFinite(playedHole)) playedHole = course.length;
      var nextIndex = Math.min(Math.max(Math.floor(playedHole), 0), course.length - 1);
      var next = course[nextIndex];
      if (!next) return null;

      var overshootW = isFinite(Number(last.overshootW)) ? Number(last.overshootW) : 0;
      var avgDrift = isFinite(Number(last.avgDrift)) ? Number(last.avgDrift) : 0;
      var strokes = isFinite(Number(last.strokes)) ? Number(last.strokes) : next.par;
      var overPar = strokes - next.par;

      // 1) Cup W-offset: drift the cup along W opposite the player's overshoot
      //    tendency so the next hole "dreams" a fresh line. Bounded to W_SPAN.
      var wPush = Math.max(-8, Math.min(8, -overshootW * 0.5 + (overPar > 0 ? 2 : -1)));
      next.cup = vec4(next.cup.x, next.cup.y, next.cup.z,
        Math.max(-W_SPAN, Math.min(W_SPAN, next.cup.w + wPush)));

      // 2) Hazards reshape around the player's miss pattern: when the player
      //    sprays (large drift), hazards near the tee line fatten and slide
      //    toward the drift side; when precise, they tighten toward the cup.
      var anchor = avgDrift !== 0 && Math.abs(avgDrift) > 4 ? next.tee : next.cup;
      for (var i = 0; i < next.hazards.length; i++) {
        var hz = next.hazards[i];
        var pull = Math.max(-1, Math.min(1, avgDrift / 12));
        hz.center.x = Math.max(-COURSE_SPAN, Math.min(COURSE_SPAN, hz.center.x + (anchor.x - hz.center.x) * 0.15 + pull * 3));
        hz.center.w = Math.max(-W_SPAN, Math.min(W_SPAN, hz.center.w + (anchor.w - hz.center.w) * 0.15));
        var growth = overPar > 1 ? 1.15 : (overPar < 0 ? 0.9 : 1.02);
        hz.radius = Math.max(1.5, Math.min(10, hz.radius * growth));
        hz.wRange = Math.max(1, Math.min(14, hz.wRange * growth));
      }

      // 3) Tesseract spin: hot players (under par) earn a calmer hypercube;
      //    struggling players get a livelier spin on the next hole.
      var spinScale = overPar > 1 ? 1.25 : (overPar < 0 ? 0.8 : 1.0);
      next.tesseractSpin.xw = Math.max(-0.6, Math.min(0.6, next.tesseractSpin.xw * spinScale));
      next.tesseractSpin.yw = Math.max(-0.6, Math.min(0.6, next.tesseractSpin.yw * spinScale));
      next.tesseractSpin.zw = Math.max(-0.6, Math.min(0.6, next.tesseractSpin.zw * spinScale));

      next.dreamed = true;
      next.dreamedFrom = { overshootW: overshootW, avgDrift: avgDrift, strokes: strokes };
      return next;
    } catch (e) {
      return null;
    }
  }

  var api = {
    THEMES: THEMES.slice(),
    HOLE_COUNT: HOLE_COUNT,
    buildCourse: buildCourse,
    getHole: getHole,
    dreamingDungeon: dreamingDungeon
  };

  var root = (typeof window !== 'undefined') ? window : this;
  root.GraveGain4DWorlds = root.GraveGain4DWorlds || {};
  root.GraveGain4DWorlds.THEMES = api.THEMES;
  root.GraveGain4DWorlds.HOLE_COUNT = api.HOLE_COUNT;
  root.GraveGain4DWorlds.buildCourse = api.buildCourse;
  root.GraveGain4DWorlds.getHole = api.getHole;
  root.GraveGain4DWorlds.dreamingDungeon = api.dreamingDungeon;
  root.GraveGain4DWorlds.dungeonVersion = '4d-worlds-1';
})();
