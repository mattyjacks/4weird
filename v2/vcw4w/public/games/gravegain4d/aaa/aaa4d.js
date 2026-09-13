/* GraveGain4D AAA layer (DS-GRAV4D-08, lane games).
 * window.GraveGain4DAAA — film grain + vignette, per-mission title cards,
 * stroke announcer (EAGLE/BIRDIE/PAR/BOGEY...) + multikill streaks (3D parity:
 * DOUBLE KILL ... GODLIKE), boss intro banners, tutorial toasts
 * (ana/kata/rewind/world-hop), run stats panel.
 * DOM-guarded: builds its own overlay under #g4d-stage (or body); every
 * method null-safe and callable headless.
 */
(function () {
  'use strict';

  var NS = (window.GraveGain4DAAA = window.GraveGain4DAAA || {});
  if (NS.__loaded) return;
  NS.__loaded = true;

  NS.STREAKS = [
    { n: 8, main: 'GODLIKE', sub: 'the fold fears you' },
    { n: 6, main: 'MASSACRE', sub: 'no witnesses across w' },
    { n: 5, main: 'RAMPAGE', sub: 'unstoppable' },
    { n: 4, main: 'QUAD KILL', sub: 'four fall as one' },
    { n: 3, main: 'TRIPLE KILL', sub: 'hat trick of ruin' },
    { n: 2, main: 'DOUBLE KILL', sub: 'two for one' }
  ];

  NS.STROKE_CALLS = [
    { maxUnder: -3, main: 'ALBATROSS', sub: 'a fourth-dimensional miracle' },
    { maxUnder: -2, main: 'EAGLE', sub: 'the fold applauds' },
    { maxUnder: -1, main: 'BIRDIE', sub: 'clean line through w' },
    { maxUnder: 0, main: 'PAR', sub: 'steady across timelines' },
    { maxUnder: 1, main: 'BOGEY', sub: 'the w-axis took its tithe' },
    { maxUnder: 2, main: 'DOUBLE BOGEY', sub: 'regroup, golfer' },
    { maxUnder: 99, main: 'MULLIGAN TIME', sub: 'spend a rewind, erase a sin' }
  ];

  NS.TUTORIALS = {
    ana: { title: 'ANA (+W)', body: 'Press Q (or swipe ▲): the ball slides sunward along W. Watch the ring grow on the radar.' },
    kata: { title: 'KATA (−W)', body: 'Press E (or swipe ▼): the ball slides widdershins along W. Ring shrinks, hue cools.' },
    rewind: { title: 'REWIND (R)', body: 'Spend a Mulligan Capacitor charge to erase your last stroke. Free charges refill each hole.' },
    worldhop: { title: 'WORLD-HOP', body: 'Exiting through a Fold gate changes world + timeline. Par resets; W resets to 0.' }
  };

  var S = {
    root: null, announcer: null, announceMain: null, announceSub: null,
    card: null, cardTitle: null, cardSub: null,
    boss: null, bossTitle: null, bossSub: null,
    toasts: null, stats: null, grain: null,
    combo: 0, comboTimer: 0, streak: 0, streakTimer: 0,
    run: { kills: 0, strokes: 0, holes: 0, eagles: 0, birdies: 0, pars: 0, bogeys: 0, rewinds: 0, startTime: 0 },
    reducedMotion: false
  };

  function $(id) {
    try { return document.getElementById(id); } catch (e) { return null; }
  }

  function mk(tag, cls, parent) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (parent) parent.appendChild(n);
    return n;
  }

  try {
    S.reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}

  function ensureRoot() {
    if (S.root) return S.root;
    var mount = $('g4d-stage') || $('g4d-hud') || document.body;
    if (!mount) return null;
    var root = document.createElement('div');
    root.id = 'g4d-aaa';
    root.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:40;' +
      'font-family:Orbitron,Outfit,Inter,system-ui,sans-serif;color:#f2f7ff;';
    try { mount.appendChild(root); } catch (e) { return null; }
    S.root = root;

    // Vignette (static, cheap).
    var vig = mk('div', 'g4d-vignette', root);
    vig.style.cssText = 'position:absolute;inset:0;background:radial-gradient(ellipse at center,' +
      'transparent 55%,rgba(0,0,10,.55) 100%);';

    // Film grain: tiny tiling canvas, redrawn on an interval (skipped on reduced motion).
    var grain = document.createElement('canvas');
    grain.width = 128; grain.height = 128;
    grain.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:.07;mix-blend-mode:overlay;';
    try { root.appendChild(grain); } catch (e) {}
    S.grain = grain;

    // Announcer (center callouts).
    var an = mk('div', 'g4d-announcer', root);
    an.id = 'g4d-announcer';
    an.style.cssText = 'position:absolute;top:22%;left:50%;transform:translate(-50%,-50%);text-align:center;opacity:0;' +
      'transition:opacity .25s ease-out;text-shadow:0 2px 12px #000;';
    var m = mk('div', 'g4d-announce-main', an);
    m.style.cssText = 'font-size:34px;font-weight:900;letter-spacing:.12em;color:#ffd35e;';
    var s = mk('div', 'g4d-announce-sub', an);
    s.style.cssText = 'font-size:13px;letter-spacing:.2em;text-transform:uppercase;opacity:.85;';
    S.announcer = an; S.announceMain = m; S.announceSub = s;

    // Title card (mission intros).
    var card = mk('div', 'g4d-title-card', root);
    card.style.cssText = 'position:absolute;inset:0;display:none;align-items:center;justify-content:center;' +
      'flex-direction:column;background:rgba(3,5,12,.0);text-align:center;';
    var ct = mk('div', 'g4d-card-kicker', card);
    ct.style.cssText = 'font-size:12px;letter-spacing:.4em;text-transform:uppercase;color:#9adcff;';
    var ct2 = mk('div', 'g4d-card-title', card);
    ct2.style.cssText = 'font-size:44px;font-weight:900;letter-spacing:.08em;margin:6px 0;text-shadow:0 3px 18px #000;';
    var cs = mk('div', 'g4d-card-sub', card);
    cs.style.cssText = 'font-size:14px;opacity:.85;max-width:min(520px,86vw);';
    S.card = card; S.cardKicker = ct; S.cardTitle = ct2; S.cardSub = cs;

    // Boss banner (top-center slab).
    var boss = mk('div', 'g4d-boss-banner', root);
    boss.style.cssText = 'position:absolute;top:12%;left:50%;transform:translateX(-50%);display:none;text-align:center;';
    var bt = mk('div', 'g4d-boss-title', boss);
    bt.style.cssText = 'font-size:26px;font-weight:900;letter-spacing:.14em;color:#ff8ba0;text-shadow:0 2px 12px #000;';
    var bs = mk('div', 'g4d-boss-sub', boss);
    bs.style.cssText = 'font-size:12px;letter-spacing:.25em;text-transform:uppercase;opacity:.85;';
    S.boss = boss; S.bossTitle = bt; S.bossSub = bs;

    // Tutorial toasts + run stats.
    var toasts = mk('div', 'g4d-toasts', root);
    toasts.style.cssText = 'position:absolute;left:8px;top:64px;display:flex;flex-direction:column;gap:6px;max-width:min(340px,80vw);';
    S.toasts = toasts;
    var stats = mk('div', 'g4d-run-stats', root);
    stats.id = 'g4d-run-stats';
    stats.style.cssText = 'position:absolute;left:8px;bottom:8px;display:none;background:rgba(8,12,24,.85);' +
      'border:1px solid rgba(120,200,255,.3);border-radius:8px;padding:6px 10px;font-size:12px;';
    S.stats = stats;

    if (!S.reducedMotion) {
      try {
        setInterval(function () {
          if (!S.grain) return;
          if (document.hidden) return;
          var c = S.grain.getContext('2d');
          if (!c) return;
          var img = c.createImageData(128, 128);
          for (var i = 0; i < img.data.length; i += 4) {
            var v = (Math.random() * 255) | 0;
            img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
          }
          c.putImageData(img, 0, 0);
        }, 180);
      } catch (e) {}
    }
    return root;
  }

  NS.announce = function (main, sub, ms) {
    if (!ensureRoot()) return;
    try {
      S.announceMain.textContent = main || '';
      S.announceSub.textContent = sub || '';
      S.announcer.style.opacity = '1';
      S.announcer.style.transform = 'translate(-50%,-50%) scale(1.04)';
      clearTimeout(S._anT);
      S._anT = setTimeout(function () {
        try {
          S.announcer.style.opacity = '0';
          S.announcer.style.transform = 'translate(-50%,-50%) scale(1)';
        } catch (e) {}
      }, ms || 1800);
    } catch (e) {}
  };

  /** Stroke callout: under = strokes - par (negative = under par). */
  NS.announceStrokes = function (strokes, par) {
    var under = (strokes || 0) - (par || 3);
    var call = NS.STROKE_CALLS[NS.STROKE_CALLS.length - 1];
    for (var i = 0; i < NS.STROKE_CALLS.length; i++) {
      if (under <= NS.STROKE_CALLS[i].maxUnder) { call = NS.STROKE_CALLS[i]; break; }
    }
    NS.announce(call.main, call.sub + ' — ' + strokes + ' on par ' + par);
    if (under <= -2) S.run.eagles++;
    else if (under === -1) S.run.birdies++;
    else if (under === 0) S.run.pars++;
    else S.run.bogeys++;
    S.run.strokes += (strokes || 0);
    return call.main;
  };

  /** Multikill feed (3D parity). Returns the callout or null. */
  NS.registerKill = function () {
    S.run.kills++;
    var now = Date.now();
    if (now - S.streakTimer > 4000) S.streak = 0;
    S.streak++;
    S.streakTimer = now;
    for (var i = 0; i < NS.STREAKS.length; i++) {
      if (S.streak === NS.STREAKS[i].n) {
        NS.announce(NS.STREAKS[i].main, NS.STREAKS[i].sub);
        return NS.STREAKS[i].main;
      }
    }
    return null;
  };

  NS.registerHit = function () {
    var now = Date.now();
    if (now - S.comboTimer > 3000) S.combo = 0;
    S.combo++;
    S.comboTimer = now;
    return S.combo;
  };

  NS.titleCard = function (kicker, title, sub, ms) {
    if (!ensureRoot()) return;
    try {
      S.cardKicker.textContent = kicker || 'HOLE 1 — PRIME TIMELINE';
      S.cardTitle.textContent = title || 'MoonRock Greens';
      S.cardSub.textContent = sub || '';
      S.card.style.display = 'flex';
      clearTimeout(S._cardT);
      S._cardT = setTimeout(function () {
        try { S.card.style.display = 'none'; } catch (e) {}
      }, ms || 2600);
    } catch (e) {}
  };

  NS.bossIntro = function (name, title, ms) {
    if (!ensureRoot()) return;
    try {
      S.bossTitle.textContent = name || 'WARDEN OF THE FOLD';
      S.bossSub.textContent = title || 'phase 1 of 3 — watch the W-meter';
      S.boss.style.display = 'block';
      clearTimeout(S._bossT);
      S._bossT = setTimeout(function () {
        try { S.boss.style.display = 'none'; } catch (e) {}
      }, ms || 3000);
    } catch (e) {}
    try {
      if (window.GraveGain4DUI) window.GraveGain4DUI.bossBar({ name: name, hp: 100, max: 100, phase: 1, phases: 3 });
    } catch (e) {}
  };

  var seenTutorials = {};
  NS.tutorial = function (key, once) {
    if (!ensureRoot()) return false;
    var t = NS.TUTORIALS[key];
    if (!t) return false;
    if (once !== false && seenTutorials[key]) return false;
    seenTutorials[key] = true;
    try {
      var n = document.createElement('div');
      n.style.cssText = 'background:rgba(8,12,24,.88);border:1px solid rgba(120,200,255,.35);' +
        'border-left:3px solid #ffd35e;border-radius:6px;padding:6px 10px;font-size:12px;pointer-events:auto;';
      n.innerHTML = '';
      var b = document.createElement('b');
      b.textContent = '⛳ ' + t.title;
      var p = document.createElement('div');
      p.textContent = t.body;
      p.style.opacity = '.85';
      n.appendChild(b); n.appendChild(p);
      S.toasts.appendChild(n);
      setTimeout(function () { try { n.remove(); } catch (e) {} }, 7000);
    } catch (e) { return false; }
    return true;
  };

  NS.runStart = function () {
    S.run = { kills: 0, strokes: 0, holes: 0, eagles: 0, birdies: 0, pars: 0, bogeys: 0, rewinds: 0, startTime: Date.now() };
  };

  NS.runHole = function () { S.run.holes++; };
  NS.runRewind = function () { S.run.rewinds++; };

  NS.runStats = function () {
    var dt = S.run.startTime ? Math.round((Date.now() - S.run.startTime) / 1000) : 0;
    return Object.assign({ seconds: dt }, S.run);
  };

  NS.showRunStats = function (show) {
    if (!ensureRoot()) return '';
    var r = NS.runStats();
    var line = '⛳ Holes ' + r.holes + ' · Strokes ' + r.strokes + ' · Kills ' + r.kills +
      ' · E/B/P/Bo ' + r.eagles + '/' + r.birdies + '/' + r.pars + '/' + r.bogeys +
      ' · Rewinds ' + r.rewinds + ' · ' + r.seconds + 's';
    try {
      S.stats.textContent = line;
      S.stats.style.display = (show === false) ? 'none' : 'block';
    } catch (e) {}
    return line;
  };

  NS.resetTutorials = function () { seenTutorials = {}; };

})(typeof window !== 'undefined' ? window : this);
