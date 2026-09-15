/* GraveGain2D Multiplayer Adapter - "Dungeon Duel" (agent 6).
 * Vanilla JS, never throws, solo-safe (dormant without ?match=).
 * Exposes window.GraveGainMPAdapter = { mode, emotes, read, render,
 *   setMatch, onOutbound, drainOutbox, isActive, _pure }.
 * Overlay-only: never writes game state, only overlay DOM.
 * ASCII-only file.
 */
(function () {
  'use strict';

  var ROUND_MS = 5 * 60 * 1000;
  var WORLD_RANGE_X = 1200;
  var WORLD_RANGE_Y = 900;
  var FEED_MAX = 6;

  /* ---------- pure helpers (node-testable via adapter._pure) ---------- */

  function clampNum(v, lo, hi) {
    if (typeof v !== 'number' || !isFinite(v)) return lo;
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  }

  function str32(v) {
    try {
      if (v === null || v === undefined) return undefined;
      var s = String(v);
      if (!s) return undefined;
      return s.slice(0, 32);
    } catch (e) { return undefined; }
  }

  function parseQuery(search) {
    var out = {};
    try {
      var s = String(search || '');
      if (s.charAt(0) === '?') s = s.slice(1);
      var parts = s.split('&');
      for (var i = 0; i < parts.length; i++) {
        var kv = parts[i].split('=');
        var k = decodeURIComponent(kv[0] || '').trim();
        if (!k) continue;
        var v = kv.length > 1 ? decodeURIComponent(kv[1] || '') : '';
        out[k] = v;
      }
    } catch (e) {}
    return out;
  }

  function missionProgress(mission) {
    try {
      if (!mission) return undefined;
      var objs = mission.objectives;
      if (!Array.isArray(objs) || objs.length === 0) {
        return mission.completed ? 100 : 0;
      }
      var sum = 0, n = 0;
      for (var i = 0; i < objs.length; i++) {
        var o = objs[i] || {};
        var count = Number(o.count), cur = Number(o.current);
        if (!isFinite(count) || count <= 0) continue;
        if (!isFinite(cur)) cur = 0;
        sum += clampNum(cur / count, 0, 1);
        n++;
      }
      if (n === 0) return mission.completed ? 100 : 0;
      return Math.round((sum / n) * 100);
    } catch (e) { return undefined; }
  }

  // Leader compare: kills first, then gold. Returns 'me' | 'foe' | 'tie'.
  function duelLeader(me, foe) {    try {
      var mk = (me && isFinite(me.kills)) ? me.kills : 0;
      var fk = (foe && isFinite(foe.kills)) ? foe.kills : 0;
      if (mk !== fk) return mk > fk ? 'me' : 'foe';
      var mg = (me && isFinite(me.gold)) ? me.gold : 0;
      var fg = (foe && isFinite(foe.gold)) ? foe.gold : 0;
      if (mg !== fg) return mg > fg ? 'me' : 'foe';
      return 'tie';
    } catch (e) { return 'tie'; }
  }

  // Score codec: the netplay core persists only {x, y, score, alive} per
  // side, so the duel headline (kills primary, gold secondary) is packed
  // into one finite number: score = kills * SCORE_K + min(gold, CAP).
  // SCORE_K=1000 keeps kills exact up to 999 inside the core +-1e6 clamp;
  // rival gold saturates at 999 (displayed with a + suffix by callers).
  var SCORE_K = 1000;
  var SCORE_GOLD_CAP = 999;

  function encodeScore(kills, gold) {
    try {
      var k = (isFinite(kills) && kills > 0) ? Math.floor(kills) : 0;
      var g = (isFinite(gold) && gold > 0) ? Math.floor(gold) : 0;
      if (g > SCORE_GOLD_CAP) g = SCORE_GOLD_CAP;
      var s = k * SCORE_K + g;
      if (!isFinite(s) || s > 1000000) s = 1000000; // core clamps to +-1e6
      return s;
    } catch (e) { return 0; }
  }

  function decodeScore(score) {
    try {
      var s = (isFinite(score) && score > 0) ? Math.floor(score) : 0;
      return { kills: Math.floor(s / SCORE_K), gold: s % SCORE_K };
    } catch (e) { return { kills: 0, gold: 0 }; }
  }

  // Foe view: prefer explicit duel keys; fall back to decoded score.
  // boss rides the relay as a short string ('boss' when engaged, '' when
  // not) because the netplay core sanitizer + PUT allowlist persist boss
  // as a capped string (same convention as mp-1d/mp-3d); a bare boolean
  // would be dropped by the allowlist and the rival panel would go blind.
  function foeDuel(foe) {
    try {
      foe = (foe && typeof foe === 'object') ? foe : {};
      var d = decodeScore(foe.score);
      return {
        x: foe.x, y: foe.y,
        kills: isFinite(foe.kills) ? foe.kills : d.kills,
        gold: isFinite(foe.gold) ? foe.gold : d.gold,
        floor: isFinite(foe.floor) ? foe.floor : undefined,
        progress: isFinite(foe.progress) ? foe.progress : undefined,
        boss: (foe.boss === true || foe.boss === 1 || (typeof foe.boss === 'string' && foe.boss !== '')),
        winner: (foe.winner === true),
        alive: (foe.alive === undefined) ? undefined : !!foe.alive
      };
    } catch (e) { return { kills: 0, gold: 0, boss: false, winner: false }; }
  }

  function roundRemaining(nowMs, startMs, lenMs) {
    try {
      var len = isFinite(lenMs) ? lenMs : ROUND_MS;
      if (!isFinite(nowMs) || !isFinite(startMs)) return len;
      var left = startMs + len - nowMs;
      if (left < 0) left = 0;
      if (left > len) left = len;
      return left;
    } catch (e) { return ROUND_MS; }
  }

  function fmtClock(ms) {
    try {
      var s = Math.max(0, Math.ceil(ms / 1000));
      var m = Math.floor(s / 60), r = s % 60;
      return (m < 10 ? '0' + m : '' + m) + ':' + (r < 10 ? '0' + r : '' + r);
    } catch (e) { return '05:00'; }
  }

  // Map foe world coords to screen % over the arena, relative to me.
  // Returns { left, top, mode: 'ghost' | 'edge' } or null when unusable.
  function mapFoeToScreen(me, foe) {
    try {
      if (!me || !foe) return null;
      if (!isFinite(me.x) || !isFinite(me.y)) return null;
      if (!isFinite(foe.x) || !isFinite(foe.y)) return null;
      var dx = foe.x - me.x, dy = foe.y - me.y;
      var far = Math.abs(dx) > WORLD_RANGE_X || Math.abs(dy) > WORLD_RANGE_Y;
      var left = 50 + (dx / WORLD_RANGE_X) * 50;
      var top = 50 + (dy / WORLD_RANGE_Y) * 50;
      left = clampNum(left, 2, 98);
      top = clampNum(top, 2, 98);
      return { left: left, top: top, mode: far ? 'edge' : 'ghost' };
    } catch (e) { return null; }
  }

  /* ---------- live game reads (best-effort, never throw) ---------- */

  function getGame() {
    try {
      if (typeof window === 'undefined') return null;
      return window.GraveGainGame || null;
    } catch (e) { return null; }
  }

  function getQuery() {
    try {
      if (typeof window === 'undefined' || !window.location) return {};
      return parseQuery(window.location.search);
    } catch (e) { return {}; }
  }

  function readState() {
    var out = {};
    try {
      var g = getGame();
      var q = getQuery();
      var seed = str32(q.seed);
      if (seed !== undefined) out.seed = seed;
      if (!g) return out;
      var p = g.player || null;
      if (p) {
        if (isFinite(p.x)) out.x = p.x;
        if (isFinite(p.y)) out.y = p.y;
        if (isFinite(p.hp)) out.hp = p.hp;
        if (isFinite(p.maxHp)) out.maxhp = p.maxHp;
        out.deaths = p.isDead ? 1 : 0;
      }
      var gold = isFinite(g.runGold) ? g.runGold : (isFinite(g.gold) ? g.gold : undefined);
      if (gold !== undefined) out.gold = gold;
      if (isFinite(g.runKills)) out.kills = g.runKills;
      // Headline metric for the relay (core persists {x, y, score, alive}).
      try {
        out.score = encodeScore(g.runKills, (gold === undefined ? 0 : gold));
        out.alive = !!(p && !p.isDead);
      } catch (e2) {}
      if (isFinite(g.floorIndex)) out.floor = g.floorIndex;
      var prog = missionProgress(g.currentMission || null);
      if (prog !== undefined) out.progress = prog;
      try {
        if (Array.isArray(g.enemies)) {
          var bossAlive = false;
          for (var i = 0; i < g.enemies.length; i++) {
            var e = g.enemies[i];
            if (!e || e.type !== 'boss') continue;
            if (isFinite(e.hp)) { if (e.hp > 0) { bossAlive = true; break; } }
            else { bossAlive = true; break; }
          }
          // boss rides the relay as a capped string ('boss'/''), matching the
          // core STATE_ALLOW + PUT allowlist string convention for boss.
          out.boss = bossAlive ? 'boss' : '';
        }
      } catch (e2) {}
      if (g.currentMission && g.currentMission.completed) out.winner = true;
      else if (p) out.winner = false;
    } catch (e) {}
    return out;
  }

  /* ---------- adapter state ---------- */

  var S = {
    match: null,          // { id, created_at, seed } from core or ?match=
    matchStart: 0,        // ms epoch round clock started
    mounted: false,
    els: null,
    outbox: [],
    onOutboundCb: null,
    prevFoe: null,        // { kills, gold, boss, winner }
    prevMe: null,         // { kills, gold, boss }
    prevLeader: 'tie',
    decided: false,       // timer/mission verdict shown
    feedCount: 0,
    tickTimer: 0
  };

  function isActive() {
    try {
      if (S.match && S.match.id) return true;
      var q = getQuery();
      return !!(q.match);
    } catch (e) { return false; }
  }

  function emitOutbound(msg) {
    try {
      S.outbox.push(msg);
      if (typeof S.onOutboundCb === 'function') {
        try { S.onOutboundCb(msg); } catch (e) {}
      }
    } catch (e) {}
  }

  function resolveMatchStart(matchInfo) {
    try {
      var cands = [];
      if (matchInfo) {
        cands.push(matchInfo.created_at);
        cands.push(matchInfo.createdAt);
        cands.push(matchInfo.started_at);
        if (matchInfo.match) {
          cands.push(matchInfo.match.created_at);
          cands.push(matchInfo.match.createdAt);
        }
      }
      if (S.match) {
        cands.push(S.match.created_at);
        cands.push(S.match.createdAt);
      }
      for (var i = 0; i < cands.length; i++) {
        var t = Date.parse ? Date.parse(cands[i]) : NaN;
        if (isFinite(t) && t > 0) return t;
      }
    } catch (e) {}
    return 0;
  }

  /* ---------- overlay DOM (runtime only, ASCII) ---------- */

  var CSS_ID = 'gg2d-duel-css';

  function ensureCss(doc) {
    try {
      if (doc.getElementById(CSS_ID)) return;
      var st = doc.createElement('style');
      st.id = CSS_ID;
      st.textContent =
        '.gg2d-duel{position:absolute;inset:0;pointer-events:none;z-index:60;font-family:monospace,sans-serif;}' +
        '.gg2d-panel{position:absolute;background:rgba(8,8,14,.82);border:1px solid #a855f7;color:#e9e4ff;' +
        'border-radius:8px;padding:6px 10px;font-size:12px;line-height:1.5;}' +
        '.gg2d-score{top:8px;left:8px;pointer-events:auto;min-width:210px;}' +
        '.gg2d-score .t{color:#fbbf24;font-weight:bold;letter-spacing:1px;}' +
        '.gg2d-score .lead-me{color:#4ade80;} .gg2d-score .lead-foe{color:#f87171;} .gg2d-score .lead-tie{color:#e9e4ff;}' +
        '.gg2d-ghost{position:absolute;transform:translate(-50%,-50%);text-align:center;transition:left .3s,top .3s;}' +
        '.gg2d-ghost .mk{font-size:26px;filter:grayscale(40%) opacity(.9);}' +
        '.gg2d-ghost .tag{background:rgba(8,8,14,.85);border:1px solid #a855f7;border-radius:6px;color:#e9e4ff;' +
        'font-size:10px;padding:1px 6px;white-space:nowrap;}' +
        '.gg2d-feed{bottom:8px;left:8px;max-width:320px;}' +
        '.gg2d-feed div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
        '.gg2d-actions{top:8px;right:8px;pointer-events:auto;text-align:right;}' +
        '.gg2d-actions button{pointer-events:auto;background:#1e1b2e;color:#e9e4ff;border:1px solid #a855f7;' +
        'border-radius:6px;padding:3px 8px;margin:2px;font-size:11px;cursor:pointer;font-family:inherit;}' +
        '.gg2d-actions button:hover{background:#2d2547;}' +
        '.gg2d-banner{position:absolute;top:34%;left:50%;transform:translate(-50%,-50%);background:rgba(8,8,14,.92);' +
        'border:2px solid #fbbf24;border-radius:12px;color:#fff;font-size:22px;font-weight:bold;' +
        'padding:18px 34px;text-align:center;pointer-events:auto;}' +
        '.gg2d-banner small{display:block;font-size:12px;font-weight:normal;color:#e9e4ff;margin-top:6px;}' +
        '.gg2d-banner button{pointer-events:auto;margin-top:10px;background:#a855f7;color:#fff;border:0;' +
        'border-radius:6px;padding:6px 16px;font-size:13px;cursor:pointer;font-family:inherit;}';
      doc.head.appendChild(st);
    } catch (e) {}
  }

  function anchorNode(doc) {
    try {
      var c = doc.getElementById('canvasContainer');
      if (c) {
        try {
          var pos = doc.defaultView ? doc.defaultView.getComputedStyle(c).position : '';
          if (pos === 'static') c.style.position = 'relative';
        } catch (e) {}
        return c;
      }
      return doc.body;
    } catch (e) { return null; }
  }

  function el(tag, cls, text) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (text !== undefined) d.textContent = text;
    return d;
  }

  function mountOverlay() {
    if (S.mounted && S.els) return S.els;
    var doc;
    try { doc = document; } catch (e) { return null; }
    if (!doc || !doc.createElement) return null;
    try {
      ensureCss(doc);
      var host = anchorNode(doc);
      if (!host) return null;
      var old = doc.getElementById('gg2d-duel-root');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var root = el('div', 'gg2d-duel');
      root.id = 'gg2d-duel-root';
      root.setAttribute('aria-live', 'polite');

      var score = el('div', 'gg2d-panel gg2d-score');
      var title = el('div', 't', 'DUNGEON DUEL');
      var timer = el('div', 'tm', 'ROUND 05:00');
      var seed = el('div', 'sd', '');
      var lines = el('div', 'ln', '');
      score.appendChild(title);
      score.appendChild(timer);
      score.appendChild(seed);
      score.appendChild(lines);

      var ghost = el('div', 'gg2d-ghost');
      ghost.style.display = 'none';
      var mk = el('div', 'mk', 'R');
      mk.textContent = 'RIVAL';
      var tag = el('div', 'tag', 'RIVAL');
      ghost.appendChild(mk);
      ghost.appendChild(tag);

      var feed = el('div', 'gg2d-panel gg2d-feed');

      var actions = el('div', 'gg2d-panel gg2d-actions');
      var emotes = ['GG', 'HEAL', 'RUN!'];
      for (var i = 0; i < emotes.length; i++) {
        (function (txt) {
          var b = el('button', null, txt);
          b.setAttribute('data-emote', txt);
          b.addEventListener('click', function () {
            try {
              sendEmoteOut(txt);
              feedMsg('YOU ping: ' + txt);
            } catch (e) {}
          });
          actions.appendChild(b);
        })(emotes[i]);
      }
      var ping = el('button', null, 'REVIVE PING');
      ping.addEventListener('click', function () {
        try {
          sendEmoteOut('HEAL');
          feedMsg('YOU ping: REVIVE (HEAL)');
        } catch (e) {}
      });
      actions.appendChild(ping);

      root.appendChild(score);
      root.appendChild(ghost);
      root.appendChild(feed);
      root.appendChild(actions);
      host.appendChild(root);

      S.els = { root: root, score: score, timer: timer, seed: seed, lines: lines, ghost: ghost, gtag: tag, feed: feed, actions: actions };
      S.mounted = true;
      return S.els;
    } catch (e) { return null; }
  }

  function feedMsg(text) {
    try {
      if (!S.els || !S.els.feed) return;
      var d = document.createElement('div');
      d.textContent = String(text).slice(0, 120);
      S.els.feed.insertBefore(d, S.els.feed.firstChild);
      while (S.els.feed.children.length > FEED_MAX) {
        S.els.feed.removeChild(S.els.feed.lastChild);
      }
      S.feedCount++;
    } catch (e) {}
  }

  function showBanner(title, sub, showRematch) {
    try {
      if (!S.els || !S.els.root) return;
      var old = document.getElementById('gg2d-duel-banner');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var b = el('div', 'gg2d-banner');
      b.id = 'gg2d-duel-banner';
      // textContent only (ASCII); title passed in by us.
      b.textContent = title;
      if (sub) {
        var sm = el('small', null, sub);
        b.appendChild(sm);
      }
      if (showRematch) {
        var r = el('button', null, 'REMATCH');
        r.addEventListener('click', function () {
          try {
            var viaCore = requestRematchOut();
            if (!viaCore) {
              var bn = document.getElementById('gg2d-duel-banner');
              if (bn && bn.parentNode) bn.parentNode.removeChild(bn);
              feedMsg('REMATCH requested. New 5:00 round.');
            } else {
              feedMsg('REMATCH requested via lobby.');
            }
          } catch (e) {}
        });
        b.appendChild(r);
      }
      S.els.root.appendChild(b);
    } catch (e) {}
  }

  // Send an emote through the netplay core when it is live; otherwise
  // queue it in the local outbox for any external driver.
  function sendEmoteOut(text) {
    try {
      var t = String(text).slice(0, 40);
      var sent = false;
      try {
        if (typeof window !== 'undefined' && window.GraveGainMP &&
            typeof window.GraveGainMP.sendEmote === 'function') {
          window.GraveGainMP.sendEmote(t);
          sent = true;
        }
      } catch (e) {}
      if (!sent) emitOutbound({ kind: 'emote', text: t });
    } catch (e) {}
  }

  function requestRematchOut() {
    try {
      var sent = false;
      try {
        if (typeof window !== 'undefined' && window.GraveGainMP &&
            typeof window.GraveGainMP.rematch === 'function') {
          window.GraveGainMP.rematch();
          sent = true;
        }
      } catch (e) {}
      if (!sent) {
        emitOutbound({ kind: 'rematch' });
        S.decided = false;
        S.matchStart = Date.now();
      }
      return sent;
    } catch (e) { return false; }
  }

  function normEvents(events) {
    var out = [];
    try {
      if (!events) return out;
      var arr = Array.isArray(events) ? events : [events];
      for (var i = 0; i < arr.length; i++) {
        var e = arr[i];
        if (e === null || e === undefined) continue;
        if (typeof e === 'string') { out.push({ text: e }); continue; }
        if (typeof e === 'object') {
          var o = { text: str32(e.text || e.msg || e.type || '') || 'event' };
          if (e.type !== undefined) o.type = str32(e.type);
          if (e.by !== undefined) o.by = str32(e.by);
          if (e.text !== undefined || e.msg !== undefined) o.text = String(e.text !== undefined ? e.text : e.msg).slice(0, 120);
          out.push(o);
        }
      }
    } catch (e) {}
    return out;
  }

  function renderDuel(rawFoe, events, matchInfo) {
    try {
      var foe = foeDuel(rawFoe);
      var evts = normEvents(events);

      // Adopt match info when core passes it.
      try {
        if (matchInfo && typeof matchInfo === 'object') {
          var mid = matchInfo.id || matchInfo.match_id || (matchInfo.match && matchInfo.match.id);
          if (mid) {
            S.match = {
              id: String(mid).slice(0, 64),
              created_at: matchInfo.created_at || matchInfo.createdAt || null,
              seed: matchInfo.seed || (matchInfo.match && matchInfo.match.seed) || null
            };
          }
          var t = resolveMatchStart(matchInfo);
          if (t > 0) S.matchStart = t;
        }
        if (!S.match) {
          var q = getQuery();
          if (q.match) S.match = { id: String(q.match).slice(0, 64), created_at: null, seed: q.seed || null };
        }
        if (!S.matchStart) S.matchStart = Date.now();
      } catch (e) {}

      var els = mountOverlay();
      if (!els) return;

      var me = readState();
      var now = Date.now();
      var left = roundRemaining(now, S.matchStart, ROUND_MS);
      els.timer.textContent = 'ROUND ' + fmtClock(left);

      // Same-seed party display.
      try {
        var seedTxt = '';
        var q2 = getQuery();
        var s = str32((S.match && S.match.seed) || q2.seed);
        if (s !== undefined) seedTxt = 'SEED ' + s + ' - same dungeon, fair race';
        els.seed.textContent = seedTxt;
      } catch (e) { try { els.seed.textContent = ''; } catch (e2) {} }

      // Ghost marker.
      try {
        var pos = mapFoeToScreen(me, foe);
        if (pos) {
          els.ghost.style.display = 'block';
          els.ghost.style.left = pos.left + '%';
          els.ghost.style.top = pos.top + '%';
          var fl = isFinite(foe.kills) ? foe.kills : 0;
          var fg2 = isFinite(foe.gold) ? foe.gold : 0;
          var extra = pos.mode === 'edge' ? ' (FAR)' : '';
          var btag = foe.boss ? ' - BOSS!' : '';
          els.gtag.textContent = ('RIVAL k' + fl + ' g' + fg2 + btag + extra).slice(0, 48);
        } else {
          // Coords unusable: edge portrait + stats instead.
          els.ghost.style.display = 'block';
          els.ghost.style.left = '96%';
          els.ghost.style.top = '40%';
          var fl2 = isFinite(foe.kills) ? foe.kills : 0;
          var fg3 = isFinite(foe.gold) ? foe.gold : 0;
          var hp = (isFinite(foe.hp) && isFinite(foe.maxhp)) ? ' hp' + foe.hp + '/' + foe.maxhp : '';
          els.gtag.textContent = ('RIVAL k' + fl2 + ' g' + fg3 + hp).slice(0, 48);
        }
      } catch (e) {}

      // Scoreboard with leader highlight.
      try {
        var leader = duelLeader(me, foe);
        var mk2 = isFinite(me.kills) ? me.kills : 0;
        var mg2 = isFinite(me.gold) ? me.gold : 0;
        var fk2 = isFinite(foe.kills) ? foe.kills : 0;
        var fg4 = isFinite(foe.gold) ? foe.gold : 0;
        var mf = isFinite(me.floor) ? me.floor : 1;
        var ff = isFinite(foe.floor) ? foe.floor : '?';
        var cls = leader === 'me' ? 'lead-me' : (leader === 'foe' ? 'lead-foe' : 'lead-tie');
        els.lines.innerHTML = '';
        var d1 = document.createElement('div');
        d1.textContent = 'YOU   k' + mk2 + ' g' + mg2 + ' f' + mf;
        var d2 = document.createElement('div');
        d2.textContent = 'RIVAL k' + fk2 + ' g' + fg4 + ' f' + ff;
        d2.className = cls;
        if (leader === 'me') d1.className = 'lead-me';
        els.lines.appendChild(d1);
        els.lines.appendChild(d2);
      } catch (e) {}

      // Transition-driven announcements: lead changes, kills, boss.
      try {
        var pf = S.prevFoe, pm = S.prevMe;
        var ck = isFinite(foe.kills) ? foe.kills : 0;
        var cg = isFinite(foe.gold) ? foe.gold : 0;
        var cboss = !!foe.boss;
        var cmk = isFinite(me.kills) ? me.kills : 0;
        var cmg = isFinite(me.gold) ? me.gold : 0;
        var cmboss = !!me.boss;

        if (pf) {
          if (ck > pf.kills) feedMsg('RIVAL slays (' + ck + ' kills)');
          if (!pf.boss && cboss) feedMsg('RIVAL engages the BOSS');
          if (pf.boss && !cboss && ck > pf.kills) {
            if (pm && cmboss) feedMsg('BOSS STEAL - rival took your boss');
            else feedMsg('RIVAL slew the BOSS');
          }
          if (typeof foe.progress === 'number' && typeof pf.progress === 'number' && foe.progress > pf.progress) {
            feedMsg('RIVAL mission ' + foe.progress + '%');
          }
        } else if (ck > 0 || cg > 0) {
          feedMsg('RIVAL joins k' + ck + ' g' + cg);
        }
        if (pm) {
          if (cmk > pm.kills) feedMsg('YOU slay (' + cmk + ' kills)');
          if (!pm.boss && cmboss) feedMsg('YOU engage the BOSS');
          if (pm.boss && !cmboss && cmk > pm.kills) feedMsg('YOU slew the BOSS');
        }
        var leaderNow = duelLeader(me, foe);
        if (S.prevLeader && leaderNow !== S.prevLeader && leaderNow !== 'tie' && (pf || pm)) {
          feedMsg(leaderNow === 'me' ? 'COMEBACK - you take the lead' : 'LEAD CHANGE - rival takes the lead');
        }
        S.prevLeader = leaderNow;
        S.prevFoe = { kills: ck, gold: cg, boss: cboss, winner: !!foe.winner, progress: isFinite(foe.progress) ? foe.progress : 0 };
        S.prevMe = { kills: cmk, gold: cmg, boss: cmboss };
      } catch (e) {}

      // Raw events from core -> feed.
      try {
        for (var i = 0; i < evts.length; i++) {
          var ev = evts[i];
          var txt = String(ev.text || 'event').slice(0, 120);
          var typ = ev.type ? String(ev.type).toLowerCase() : '';
          if (typ.indexOf('emote') >= 0) feedMsg('RIVAL emote: ' + txt);
          else if (typ.indexOf('kill') >= 0) feedMsg('RIVAL kill: ' + txt);
          else if (typ.indexOf('boss') >= 0) feedMsg('BOSS: ' + txt);
          else if (typ.indexOf('mission') >= 0 || typ.indexOf('win') >= 0) feedMsg(txt);
          else feedMsg(txt);
        }
      } catch (e) {}

      // Verdicts: mission-complete ends instantly; timer end decides on kills+gold.
      try {
        if (!S.decided) {
          if (foe.winner && me.winner) {
            S.decided = true;
            showBanner('DRAW', 'Both delvers cleared the mission.', true);
          } else if (foe.winner) {
            S.decided = true;
            showBanner('LOSE', 'Rival completed the mission first.', true);
          } else if (me.winner) {
            S.decided = true;
            showBanner('WIN', 'You completed the mission first.', true);
          } else if (left <= 0) {
            S.decided = true;
            var lead = duelLeader(me, foe);
            if (lead === 'me') showBanner('WIN', 'Time - most kills+gold takes the round.', true);
            else if (lead === 'foe') showBanner('LOSE', 'Time - rival out-looted you.', true);
            else showBanner('DRAW', 'Time - dead even. Rematch?', true);
          }
        }
      } catch (e) {}
    } catch (e) {}
  }

  function tickLoop() {
    // Keep the round clock + scoreboard alive even when core only
    // calls render() on foe updates.
    try {
      if (!S.mounted || !S.els) return;
      if (S.decided) return;
      var left = roundRemaining(Date.now(), S.matchStart, ROUND_MS);
      S.els.timer.textContent = 'ROUND ' + fmtClock(left);
      if (left <= 0) {
        try {
          var me = readState();
          var foe = (S.prevFoe) ? { kills: S.prevFoe.kills, gold: S.prevFoe.gold } : {};
          var lead = duelLeader(me, foe);
          S.decided = true;
          if (lead === 'me') showBanner('WIN', 'Time - most kills+gold takes the round.', true);
          else if (lead === 'foe') showBanner('LOSE', 'Time - rival out-looted you.', true);
          else showBanner('DRAW', 'Time - dead even. Rematch?', true);
        } catch (e) {}
      }
    } catch (e) {}
  }

  /* ---------- public adapter ---------- */

  var adapter = {
    // Contract mode is 'duel'. NOTE: the netplay core header documents
    // adapter modes as "1d"|"2d"|"3d", but no core code path reads the
    // mode field (it keys off slug + read/render/summary/emotes), so the
    // contract value is kept. Revisit if the core ever gates on it.
    mode: 'duel',
    emotes: ['GG', 'HEAL', 'RUN!'],
    read: function () { try { return readState(); } catch (e) { return {}; } },
    render: function (foe, events, matchInfo) { try { renderDuel(foe, events, matchInfo); } catch (e) {} },
    // Short scoreboard line for the core overlay chrome.
    summary: function () {
      try {
        var me = readState();
        var mk = isFinite(me.kills) ? me.kills : 0;
        var mg = isFinite(me.gold) ? me.gold : 0;
        var fk = (S.prevFoe && isFinite(S.prevFoe.kills)) ? S.prevFoe.kills : 0;
        var fg = (S.prevFoe && isFinite(S.prevFoe.gold)) ? S.prevFoe.gold : 0;
        var left = 'ROUND ' + fmtClock(roundRemaining(Date.now(), S.matchStart || Date.now(), ROUND_MS));
        return { me: 'YOU k' + mk + ' g' + mg, foe: 'RIVAL k' + fk + ' g' + fg + ' ' + left };
      } catch (e) { return 'YOU vs RIVAL'; }
    },
    setMatch: function (m) {
      try {
        if (m && typeof m === 'object') {
          S.match = {
            id: String(m.id || m.match_id || '').slice(0, 64),
            created_at: m.created_at || m.createdAt || null,
            seed: m.seed || null
          };
          var t = resolveMatchStart(m);
          S.matchStart = t > 0 ? t : Date.now();
          return true;
        }
      } catch (e) {}
      return false;
    },
    onOutbound: function (cb) {
      try { S.onOutboundCb = (typeof cb === 'function') ? cb : null; } catch (e) {}
    },
    drainOutbox: function () {
      try {
        var q = S.outbox;
        S.outbox = [];
        return q;
      } catch (e) { return []; }
    },
    isActive: function () { try { return isActive(); } catch (e) { return false; } },
    _pure: {
      clampNum: clampNum,
      str32: str32,
      parseQuery: parseQuery,
      missionProgress: missionProgress,
      duelLeader: duelLeader,
      encodeScore: encodeScore,
      decodeScore: decodeScore,
      foeDuel: foeDuel,
      roundRemaining: roundRemaining,
      fmtClock: fmtClock,
      mapFoeToScreen: mapFoeToScreen,
      ROUND_MS: ROUND_MS
    }
  };

  /* ---------- boot (solo-safe: overlay only with ?match=) ---------- */

  try {
    if (typeof window !== 'undefined' && window) {
      try { window.GraveGainMPAdapter = adapter; } catch (e) {}
      try {
        var evtName = 'gravegain-mp-adapter-ready';
        if (typeof window.dispatchEvent === 'function') {
          var ev;
          if (typeof window.CustomEvent === 'function') {
            ev = new window.CustomEvent(evtName, { detail: { mode: 'duel' } });
          } else if (typeof document !== 'undefined' && document && document.createEvent) {
            ev = document.createEvent('CustomEvent');
            if (ev && ev.initCustomEvent) ev.initCustomEvent(evtName, false, false, { mode: 'duel' });
          }
          if (ev) window.dispatchEvent(ev);
        }
      } catch (e) {}
      try {
        var boot = function () {
          try {
            if (!isActive()) return; // solo: dormant, no DOM writes
            var q = getQuery();
            S.match = { id: String(q.match).slice(0, 64), created_at: null, seed: q.seed || null };
            S.matchStart = Date.now();
            mountOverlay();
            feedMsg('DUNGEON DUEL - 5:00 kill+gold race. GL.');
            if (S.tickTimer) { try { clearInterval(S.tickTimer); } catch (e) {} }
            S.tickTimer = setInterval(tickLoop, 1000);
          } catch (e) {}
        };
        if (typeof document !== 'undefined' && document) {
          if (document.readyState === 'loading' && document.addEventListener) {
            document.addEventListener('DOMContentLoaded', boot);
          } else {
            boot();
          }
        }
      } catch (e) {}
    }
  } catch (e) {}

  // CommonJS hook for node smoke tests only (browsers ignore).
  try {
    if (typeof module !== 'undefined' && module && module.exports) {
      module.exports = adapter;
    }
  } catch (e) {}
})();
