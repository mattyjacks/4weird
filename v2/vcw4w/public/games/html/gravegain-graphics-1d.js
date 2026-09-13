/*
 * gravegain-graphics-1d.js — GraveGain1D signature art dressing (v2.0.0).
 *
 * Family-friendly sparkle layer for the 1D ley-line canvas game. Teen-clean
 * by design: warm grades, praise sparkles, emoji skies and rainbows only.
 *
 * Dressing only: adds DOM nodes around #gg1dStage and reads live state from
 * window.GraveGain1D plus guarded textContent reads. Never touches the game
 * tick, never writes game state, polling only (no input listeners).
 *
 * Vanilla IIFE, idempotent, never throws (every block guarded).
 */
(function () {
  'use strict';

  var FLAG = 'GraveGainGraphics1D';
  var VERSION = '2.0.0';
  var MAX_FLOATS = 24;
  var SECTOR_COUNT = 5;

  try {
    if (window[FLAG]) { return; }
  } catch (earlyErr) {
    return;
  }

  /* ---------- tiny safe helpers ---------- */

  function safeNum(v, dflt) {
    try {
      if (typeof v === 'number' && isFinite(v)) { return v; }
      var n = parseFloat(v);
      return isFinite(n) ? n : dflt;
    } catch (e) {
      return dflt;
    }
  }

  function clampSector(i) {
    try {
      var n = Math.floor(safeNum(i, 0));
      if (n < 0) { return 0; }
      if (n > SECTOR_COUNT - 1) { return SECTOR_COUNT - 1; }
      return n;
    } catch (e) {
      return 0;
    }
  }

  function getStage() {
    try {
      return document.getElementById('gg1dStage');
    } catch (e) {
      return null;
    }
  }

  /* ---------- sector style table ---------- */

  var SECTORS = [
    {
      name: 'Crash Flats',
      parade: ['\uD83C\uDF20', '\uD83D\uDEE0\uFE0F', '\uD83C\uDF35', '\u2B50', '\uD83C\uDF20', '\uD83E\uDEA8'],
      wash: 'linear-gradient(180deg, rgba(71,85,105,0.28), rgba(15,23,42,0.42))',
      weather: ['\u2601\uFE0F', '\u2728', '\uD83C\uDF20']
    },
    {
      name: 'Whisper Groves',
      parade: ['\uD83C\uDF32', '\uD83C\uDF43', '\uD83E\uDD89', '\u2728', '\uD83C\uDF32', '\uD83C\uDF40'],
      wash: 'linear-gradient(180deg, rgba(34,197,94,0.22), rgba(20,83,45,0.40))',
      weather: ['\uD83C\uDF26\uFE0F', '\u2728', '\uD83C\uDF08']
    },
    {
      name: 'Sparkite Cut',
      parade: ['\uD83D\uDC8E', '\u26A1', '\uD83D\uDD25', '\u2728', '\uD83D\uDC8E', '\u2B50'],
      wash: 'linear-gradient(180deg, rgba(245,158,11,0.25), rgba(120,53,15,0.42))',
      weather: ['\u2728', '\u2600\uFE0F', '\uD83C\uDF08']
    },
    {
      name: 'Ash Gate',
      parade: ['\uD83C\uDF0B', '\uD83C\uDF42', '\uD83D\uDD25', '\uD83C\uDF1F', '\uD83E\uDEA8', '\u2728'],
      wash: 'linear-gradient(180deg, rgba(239,68,68,0.20), rgba(69,10,10,0.42))',
      weather: ['\u2601\uFE0F', '\uD83C\uDF1F', '\u2728']
    },
    {
      name: 'Relay Approach',
      parade: ['\uD83D\uDEF8', '\uD83C\uDF0C', '\uD83D\uDC9C', '\u26A1', '\uD83D\uDD2E', '\u2728'],
      wash: 'linear-gradient(180deg, rgba(168,85,247,0.24), rgba(46,16,101,0.44))',
      weather: ['\uD83C\uDF0C', '\u2728', '\uD83C\uDF08']
    }
  ];

  var CELE_SETS = {
    rainbow: ['\uD83C\uDF08', '\u2728', '\uD83D\uDCA5', '\uD83C\uDF89', '\u2B50'],
    victory: ['\uD83C\uDF89', '\u2B50', '\uD83C\uDF08', '\u2728', '\uD83D\uDC4F'],
    weather: ['\uD83C\uDF08', '\u2728', '\uD83D\uDCA7', '\u2600\uFE0F']
  };

  var QUALITY_RANK = { potato: 0, balanced: 1, high: 2, ultra: 3 };

  var currentSector = 0;
  var cachedQuality = 'balanced';
  var cachedRank = 1;
  var lastScore = null;
  var booted = false;
  var floatCount = 0;

  var tickerEl = null;
  var tickerInner = null;
  var gradeEl = null;
  var layerEl = null;
  var starEl = null;
  var starNodes = [];
  var bossActive = false;
  var skullEl = null;

  /* ---------- quality (guarded) ---------- */

  function readQuality() {
    try {
      var g = window.FourWeirdGraphics;
      if (!g) { return 'balanced'; }
      try {
        if (typeof g.getQuality === 'function') {
          var q = g.getQuality();
          if (typeof q === 'string' && QUALITY_RANK[q] !== undefined) { return q; }
        }
      } catch (e1) { /* keep default */ }
      try {
        if (typeof g.quality === 'string' && QUALITY_RANK[g.quality] !== undefined) {
          return g.quality;
        }
      } catch (e2) { /* keep default */ }
      try {
        if (typeof g.tier === 'string' && QUALITY_RANK[g.tier] !== undefined) {
          return g.tier;
        }
      } catch (e3) { /* keep default */ }
    } catch (e) { /* keep default */ }
    return 'balanced';
  }

  function refreshQuality() {
    try {
      cachedQuality = readQuality();
      var r = QUALITY_RANK[cachedQuality];
      cachedRank = (typeof r === 'number') ? r : 1;
      if (cachedRank < 0 || cachedRank > 3) { cachedRank = 1; cachedQuality = 'balanced'; }
    } catch (e) {
      cachedQuality = 'balanced';
      cachedRank = 1;
    }
    return cachedQuality;
  }

  /* ---------- sector detection ---------- */

  function nameToIndex(t) {
    try {
      if (typeof t !== 'string' || !t) { return -1; }
      var low = t.toLowerCase();
      for (var i = 0; i < SECTORS.length; i++) {
        if (low.indexOf(SECTORS[i].name.toLowerCase()) >= 0) { return i; }
      }
    } catch (e) { /* fall through */ }
    return -1;
  }

  function sectorFromLiveState() {
    try {
      var G = window.GraveGain1D;
      if (!G) { return -1; }
      var cands = [];
      try { cands.push(G.sector, G.sectorIndex, G.biome, G.biomeIndex); } catch (e1) { /* ignore */ }
      try { if (G.run) { cands.push(G.run.sector, G.run.sectorIndex, G.run.biome); } } catch (e2) { /* ignore */ }
      try { if (G.state) { cands.push(G.state.sector, G.state.sectorIndex, G.state.biome); } } catch (e3) { /* ignore */ }
      for (var i = 0; i < cands.length; i++) {
        var c = cands[i];
        if (typeof c === 'number' && isFinite(c) && c >= 0 && c < SECTOR_COUNT) {
          return Math.floor(c);
        }
        if (typeof c === 'string') {
          var ni = nameToIndex(c);
          if (ni >= 0) { return ni; }
        }
      }
    } catch (e) { /* fall through */ }
    return -1;
  }

  function sectorFromDom() {
    try {
      var el = document.getElementById('gg1dSector');
      if (!el || typeof el.textContent !== 'string') { return -1; }
      var t = el.textContent;
      if (!t) { return -1; }
      var m = t.match(/[0-4]/);
      if (m) {
        var n = parseInt(m[0], 10);
        if (isFinite(n)) { return n; }
      }
      return nameToIndex(t);
    } catch (e) {
      return -1;
    }
  }

  function detectSector() {
    try {
      var s = sectorFromLiveState();
      if (s >= 0) { return s; }
      s = sectorFromDom();
      if (s >= 0) { return s; }
    } catch (e) { /* keep current */ }
    return currentSector;
  }

  /* ---------- DOM builders (createElement + textContent only) ---------- */

  function ensureStagePosition(stage) {
    try {
      if (!stage) { return; }
      var pos = '';
      try { pos = window.getComputedStyle(stage).position; } catch (e) { pos = stage.style.position || ''; }
      if (pos !== 'relative' && pos !== 'absolute' && pos !== 'fixed') {
        stage.style.position = 'relative';
      }
    } catch (e) { /* ignore */ }
  }

  function ensureTicker() {
    try {
      if (tickerEl && tickerEl.parentNode) { return tickerEl; }
      var stage = getStage();
      if (!stage || !stage.parentNode) { return null; }
      tickerEl = document.createElement('div');
      tickerEl.id = 'gg1dSkyTicker';
      try { tickerEl.setAttribute('role', 'presentation'); } catch (e1) { /* ignore */ }
      tickerEl.style.width = '100%';
      tickerEl.style.maxWidth = '100%';
      tickerEl.style.overflow = 'hidden';
      tickerEl.style.whiteSpace = 'nowrap';
      tickerEl.style.height = '24px';
      tickerEl.style.lineHeight = '24px';
      tickerEl.style.fontSize = '16px';
      tickerEl.style.position = 'relative';
      tickerEl.style.pointerEvents = 'none';
      tickerEl.style.userSelect = 'none';
      tickerInner = document.createElement('div');
      tickerInner.style.display = 'inline-block';
      tickerInner.style.whiteSpace = 'nowrap';
      tickerInner.style.willChange = 'transform';
      tickerEl.appendChild(tickerInner);
      stage.parentNode.insertBefore(tickerEl, stage);
      renderTicker(currentSector);
      return tickerEl;
    } catch (e) {
      return null;
    }
  }

  function renderTicker(idx) {
    try {
      if (!tickerInner) { return; }
      var s = SECTORS[clampSector(idx)];
      var glyphs = [];
      var r;
      for (r = 0; r < 3; r++) {
        for (var p = 0; p < s.parade.length; p++) { glyphs.push(s.parade[p]); }
      }
      for (var w = 0; w < s.weather.length; w++) { glyphs.push(s.weather[w]); }
      for (r = 0; r < 2; r++) {
        for (var q = 0; q < s.parade.length; q++) { glyphs.push(s.parade[q]); }
      }
      tickerInner.textContent = glyphs.join('  ') + '  ';
    } catch (e) { /* ignore */ }
  }

  function ensureGrade() {
    try {
      if (gradeEl && gradeEl.parentNode) { return gradeEl; }
      var stage = getStage();
      if (!stage) { return null; }
      ensureStagePosition(stage);
      gradeEl = document.createElement('div');
      gradeEl.id = 'gg1dBiomeWash';
      gradeEl.style.position = 'absolute';
      gradeEl.style.left = '0';
      gradeEl.style.top = '0';
      gradeEl.style.right = '0';
      gradeEl.style.bottom = '0';
      gradeEl.style.pointerEvents = 'none';
      gradeEl.style.zIndex = '10';
      gradeEl.style.background = SECTORS[currentSector].wash;
      stage.appendChild(gradeEl);
      return gradeEl;
    } catch (e) {
      return null;
    }
  }

  function ensureLayer() {
    try {
      if (layerEl && layerEl.parentNode) { return layerEl; }
      var stage = getStage();
      if (!stage) { return null; }
      ensureStagePosition(stage);
      layerEl = document.createElement('div');
      layerEl.id = 'gg1dCeleLayer';
      layerEl.style.position = 'absolute';
      layerEl.style.left = '0';
      layerEl.style.top = '0';
      layerEl.style.right = '0';
      layerEl.style.bottom = '0';
      layerEl.style.overflow = 'hidden';
      layerEl.style.pointerEvents = 'none';
      layerEl.style.zIndex = '30';
      stage.appendChild(layerEl);
      return layerEl;
    } catch (e) {
      return null;
    }
  }

  function ensureStars() {
    try {
      if (starEl && starEl.parentNode) { return starEl; }
      var stage = getStage();
      if (!stage) { return null; }
      ensureStagePosition(stage);
      starEl = document.createElement('div');
      starEl.id = 'gg1dStarSpecks';
      starEl.style.position = 'absolute';
      starEl.style.left = '0';
      starEl.style.top = '0';
      starEl.style.right = '0';
      starEl.style.bottom = '0';
      starEl.style.overflow = 'hidden';
      starEl.style.pointerEvents = 'none';
      starEl.style.zIndex = '11';
      starNodes = [];
      for (var i = 0; i < 42; i++) {
        var d = document.createElement('div');
        var sz = 1 + Math.floor(Math.random() * 2);
        d.style.position = 'absolute';
        d.style.left = (Math.random() * 100).toFixed(1) + '%';
        d.style.top = (Math.random() * 100).toFixed(1) + '%';
        d.style.width = sz + 'px';
        d.style.height = sz + 'px';
        d.style.borderRadius = '50%';
        d.style.background = '#ffffff';
        d.style.opacity = '0.6';
        d.setAttribute('data-phase', (Math.random() * 6.28).toFixed(2));
        starEl.appendChild(d);
        starNodes.push(d);
      }
      stage.appendChild(starEl);
      return starEl;
    } catch (e) {
      return null;
    }
  }

  function applyVisibility() {
    try {
      if (cachedRank >= 1) {
        var t = ensureTicker();
        if (t) { t.style.display = ''; }
        var l = ensureLayer();
        if (l) { l.style.display = ''; }
      } else {
        try { if (tickerEl) { tickerEl.style.display = 'none'; } } catch (e1) { /* ignore */ }
        try { if (layerEl) { layerEl.style.display = 'none'; } } catch (e2) { /* ignore */ }
      }
      if (cachedRank >= 2) {
        var st = ensureStars();
        if (st) { st.style.display = ''; }
      } else {
        try { if (starEl) { starEl.style.display = 'none'; } } catch (e3) { /* ignore */ }
      }
      try { ensureGrade(); } catch (e4) { /* grade is best-effort */ }
    } catch (e) { /* ignore */ }
  }

  /* ---------- rainbow engine ---------- */

  function spawnFloat(ch) {
    try {
      var layer = ensureLayer();
      if (!layer) { return; }
      try {
        while (layer.childNodes.length >= MAX_FLOATS && layer.firstChild) {
          layer.removeChild(layer.firstChild);
        }
      } catch (e1) { /* ignore */ }
      var s = document.createElement('span');
      s.textContent = ch;
      s.style.position = 'absolute';
      s.style.left = (8 + Math.random() * 80).toFixed(1) + '%';
      s.style.top = (55 + Math.random() * 30).toFixed(1) + '%';
      s.style.fontSize = (16 + Math.floor(Math.random() * 14)) + 'px';
      s.style.lineHeight = '1';
      s.style.pointerEvents = 'none';
      s.style.opacity = '1';
      s.style.zIndex = '31';
      s.style.transition = 'transform 1.2s linear, opacity 1.2s linear';
      layer.appendChild(s);
      floatCount++;
      var dx = Math.floor(Math.random() * 60) - 30;
      try {
        setTimeout(function () {
          try {
            s.style.transform = 'translate(' + dx + 'px,-90px)';
            s.style.opacity = '0';
          } catch (e2) { /* ignore */ }
        }, 30);
      } catch (e3) { /* ignore */ }
      try {
        setTimeout(function () {
          try {
            if (s.parentNode === layer) { layer.removeChild(s); }
          } catch (e4) { /* ignore */ }
        }, 1300);
      } catch (e5) { /* ignore */ }
    } catch (e) { /* ignore */ }
  }

  function celebrate(kind) {
    try {
      if (cachedRank < 1) { return; }
      var set = CELE_SETS.rainbow;
      try {
        if (typeof kind === 'string' && CELE_SETS[kind]) { set = CELE_SETS[kind]; }
      } catch (e1) { /* keep default set */ }
      var n = 3 + Math.floor(Math.random() * 3);
      for (var i = 0; i < n; i++) {
        spawnFloat(set[(floatCount + i) % set.length]);
      }
    } catch (e) { /* ignore */ }
  }

  function rainbowKillCelebration() {
    try {
      celebrate('rainbow');
    } catch (e) { /* ignore */ }
  }

  /* ---------- progress polling (kill / xp / gold) ---------- */

  var SCORE_FIELDS = ['kills', 'killCount', 'xp', 'experience', 'gold', 'coins', 'score'];
  var SCORE_IDS = ['gg1dKills', 'gg1dXP', 'gg1dGold', 'gg1dScore'];

  function readScoreFromGlobals() {
    try {
      var G = window.GraveGain1D;
      if (!G) { return null; }
      var scopes = [];
      try { scopes.push(G); } catch (e0) { /* ignore */ }
      try { if (G.run) { scopes.push(G.run); } } catch (e1) { /* ignore */ }
      try { if (G.state) { scopes.push(G.state); } } catch (e2) { /* ignore */ }
      try { if (G.stats) { scopes.push(G.stats); } } catch (e3) { /* ignore */ }
      for (var s = 0; s < scopes.length; s++) {
        for (var f = 0; f < SCORE_FIELDS.length; f++) {
          var v = null;
          try { v = scopes[s][SCORE_FIELDS[f]]; } catch (e4) { v = null; }
          var n = safeNum(v, NaN);
          try {
            if (typeof n === 'number' && isFinite(n)) { return n; }
          } catch (e5) { /* ignore */ }
        }
      }
    } catch (e) { /* fall through */ }
    return null;
  }

  function readScoreFromDom() {
    try {
      for (var i = 0; i < SCORE_IDS.length; i++) {
        var el = null;
        try { el = document.getElementById(SCORE_IDS[i]); } catch (e1) { el = null; }
        if (el && typeof el.textContent === 'string' && el.textContent) {
          var m = el.textContent.match(/-?\d+(\.\d+)?/);
          if (m) {
            var n = parseFloat(m[0]);
            if (isFinite(n)) { return n; }
          }
        }
      }
    } catch (e) { /* fall through */ }
    return null;
  }

  function readScore() {
    try {
      var g = readScoreFromGlobals();
      if (typeof g === 'number' && isFinite(g)) { return g; }
      var d = readScoreFromDom();
      if (typeof d === 'number' && isFinite(d)) { return d; }
    } catch (e) { /* fall through */ }
    return null;
  }

  function pollScore() {
    try {
      if (cachedRank < 1) { return; }
      var v = readScore();
      if (typeof v !== 'number' || !isFinite(v)) { return; }
      if (lastScore === null) {
        lastScore = v;
        return;
      }
      if (v > lastScore) {
        lastScore = v;
        rainbowKillCelebration();
      } else if (v < lastScore) {
        lastScore = v;
      }
    } catch (e) { /* ignore */ }
  }

  /* ---------- boss herald ---------- */

  function getBossBar() {
    try {
      return document.getElementById('gg1dBossBar');
    } catch (e) {
      return null;
    }
  }

  function bossVisible(bar) {
    try {
      if (!bar) { return false; }
      var disp = '';
      try { disp = window.getComputedStyle(bar).display; } catch (e1) { disp = ''; }
      if (!disp) {
        try { disp = bar.style.display || ''; } catch (e2) { disp = ''; }
      }
      if (disp === 'none') { return false; }
      try {
        if (bar.offsetHeight <= 0 || bar.offsetWidth <= 0) { return false; }
      } catch (e3) { /* ignore size check */ }
      return true;
    } catch (e) {
      return false;
    }
  }

  function ensureSkull(bar) {
    try {
      if (skullEl && skullEl.parentNode) { return skullEl; }
      if (!bar || !bar.parentNode) { return null; }
      skullEl = document.createElement('span');
      skullEl.id = 'gg1dBossSkull';
      skullEl.textContent = '\uD83D\uDC80';
      skullEl.style.display = 'inline-block';
      skullEl.style.fontSize = '18px';
      skullEl.style.lineHeight = '1';
      skullEl.style.marginLeft = '8px';
      skullEl.style.verticalAlign = 'middle';
      skullEl.style.opacity = '1';
      try {
        bar.parentNode.insertBefore(skullEl, bar.nextSibling);
      } catch (e1) {
        try { bar.parentNode.appendChild(skullEl); } catch (e2) { return null; }
      }
      return skullEl;
    } catch (e) {
      return null;
    }
  }

  function pollBoss(now) {
    try {
      var bar = getBossBar();
      var vis = bossVisible(bar);
      if (vis && !bossActive) {
        bossActive = true;
        try {
          bar.style.boxShadow = '0 0 18px 4px rgba(255,77,109,0.85)';
          bar.style.outline = '2px solid rgba(255,215,0,0.9)';
        } catch (e1) { /* ignore */ }
        try { ensureSkull(bar); } catch (e2) { /* ignore */ }
      } else if (!vis && bossActive) {
        bossActive = false;
        try {
          if (bar) {
            bar.style.boxShadow = '';
            bar.style.outline = '';
          }
        } catch (e3) { /* ignore */ }
        try {
          if (skullEl && skullEl.parentNode) { skullEl.parentNode.removeChild(skullEl); }
        } catch (e4) { /* ignore */ }
        skullEl = null;
      }
      if (bossActive) {
        try {
          var pulse = 0.55 + 0.45 * Math.abs(Math.sin(now / 450));
          if (skullEl) { skullEl.style.opacity = pulse.toFixed(2); }
          if (bar) {
            var glow = Math.floor(10 + 10 * pulse);
            bar.style.boxShadow = '0 0 ' + glow + 'px 4px rgba(255,77,109,0.85)';
          }
        } catch (e5) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }
  }

  /* ---------- public API ---------- */

  function setBiome(i) {
    try {
      currentSector = clampSector(i);
      try {
        if (gradeEl && gradeEl.parentNode) {
          gradeEl.style.background = SECTORS[currentSector].wash;
        } else {
          var g = ensureGrade();
          if (g) { g.style.background = SECTORS[currentSector].wash; }
        }
      } catch (e1) { /* ignore */ }
      try { renderTicker(currentSector); } catch (e2) { /* ignore */ }
      return currentSector;
    } catch (e) {
      return currentSector;
    }
  }

  function retune() {
    try {
      refreshQuality();
      applyVisibility();
      return cachedQuality;
    } catch (e) {
      return cachedQuality;
    }
  }

  /* ---------- main loop (rAF transforms, ~10Hz throttle) ---------- */

  var lastTick = 0;
  var lastSectorPoll = 0;
  var lastScorePoll = 0;
  var lastBossPoll = 0;
  var lastTwinkle = 0;
  var lastBootTry = 0;
  var tickCount = 0;
  var driftX = 0;

  function onDeciSecond(t) {
    try {
      if (!booted) {
        if (t - lastBootTry >= 1000) {
          lastBootTry = t;
          boot();
        }
        return;
      }
      tickCount++;
      try { retuneQuiet(); } catch (e1) { /* ignore */ }
      if (t - lastSectorPoll >= 500) {
        lastSectorPoll = t;
        var s = detectSector();
        if (s !== currentSector) { setBiome(s); }
      }
      if (t - lastScorePoll >= 300) {
        lastScorePoll = t;
        pollScore();
      }
      if (t - lastBossPoll >= 500) {
        lastBossPoll = t;
        pollBoss(t);
      }
      driftTicker();
      if (t - lastTwinkle >= 300) {
        lastTwinkle = t;
        twinkleStars(t);
      }
    } catch (e) { /* never throw */ }
  }

  function retuneQuiet() {
    try {
      var q = readQuality();
      if (q !== cachedQuality) {
        cachedQuality = q;
        var r = QUALITY_RANK[q];
        cachedRank = (typeof r === 'number') ? r : 1;
        applyVisibility();
      }
    } catch (e) { /* ignore */ }
  }

  function driftTicker() {
    try {
      if (cachedRank < 1) { return; }
      if (!tickerInner || !tickerEl) { return; }
      if (tickerEl.style.display === 'none') { return; }
      var span = 0;
      try { span = tickerInner.scrollWidth || 0; } catch (e1) { span = 0; }
      if (!span || span <= 0) { span = 600; }
      driftX = (driftX + 9) % span;
      tickerInner.style.transform = 'translateX(' + (-driftX) + 'px)';
    } catch (e) { /* ignore */ }
  }

  function twinkleStars(t) {
    try {
      if (cachedRank < 2) { return; }
      if (!starEl || starEl.style.display === 'none') { return; }
      for (var i = 0; i < starNodes.length; i++) {
        try {
          var ph = 0;
          try { ph = parseFloat(starNodes[i].getAttribute('data-phase')) || 0; } catch (e1) { ph = 0; }
          var o = 0.25 + 0.75 * Math.abs(Math.sin(t / 700 + ph));
          starNodes[i].style.opacity = o.toFixed(2);
        } catch (e2) { /* ignore one speck */ }
      }
    } catch (e) { /* ignore */ }
  }

  function loop(now) {
    try {
      var t = (typeof now === 'number' && isFinite(now)) ? now : new Date().getTime();
      if (t - lastTick >= 100) {
        lastTick = t;
        onDeciSecond(t);
      }
    } catch (e) { /* never throw */ }
    try {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(loop);
      } else {
        setTimeout(loop, 120);
      }
    } catch (e) { /* ignore */ }
  }

  function boot() {
    try {
      refreshQuality();
      var stage = getStage();
      if (!stage) {
        booted = false;
        return false;
      }
      ensureGrade();
      ensureLayer();
      applyVisibility();
      renderTicker(currentSector);
      var v = readScore();
      lastScore = (typeof v === 'number' && isFinite(v)) ? v : null;
      booted = true;
      return true;
    } catch (e) {
      booted = false;
      return false;
    }
  }

  /* ---------- publish API ---------- */

  var api = null;
  try {
    api = { VERSION: VERSION, celebrate: celebrate, setBiome: setBiome, retune: retune };
  } catch (e) {
    api = { VERSION: '2.0.0', celebrate: function () {}, setBiome: function () {}, retune: function () {} };
  }

  try {
    window[FLAG] = api;
  } catch (e) { /* ignore */ }

  try {
    window.GraveGainMods = window.GraveGainMods || [];
    window.GraveGainMods.push({ name: 'gravegain-graphics-1d', version: VERSION, init: retune });
  } catch (e) { /* registry is best-effort */ }

  try {
    boot();
  } catch (e) { /* loop still retries boot */ }

  try {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(loop);
    } else if (typeof setInterval === 'function') {
      setInterval(function () { try { loop(new Date().getTime()); } catch (e) { /* ignore */ } }, 120);
    } else {
      loop(new Date().getTime());
    }
  } catch (e) { /* ignore */ }
})();
