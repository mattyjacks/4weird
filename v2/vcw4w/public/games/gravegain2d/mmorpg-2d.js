/* GraveGain2D MMORPG Adapter - "Dungeon Siege" (2D).
 * Vanilla JS, ASCII-only, never throws, solo-safe (dormant without ?mmorpg=<serverId>).
 * Exposes window.GraveGainMPAdapterMMORPG2D = { mode:'siege2d', read, render }.
 * Overlay-only: never writes game state, only overlay DOM.
 * 4-player dungeon rooms, boss DPS race, potion-share ping.
 * ASCII-only file.
 */
(function () {
  'use strict';

  var FEED_MAX = 6;
  var ROOM_MAX = 4;
  var WORLD_RANGE_X = 1200;
  var WORLD_RANGE_Y = 900;

  /* ---------- pure helpers (node-testable via adapter._pure) ---------- */

  function clampNum(v, lo, hi) {
    if (typeof v !== 'number' || !isFinite(v)) return lo;
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  }

  function fin(v) {
    return (typeof v === 'number' && isFinite(v)) ? v : undefined;
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
      if (isFinite(mission.progress)) return clampNum(Math.round(mission.progress), 0, 100);
      if (isFinite(mission.percent)) return clampNum(Math.round(mission.percent), 0, 100);
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

  // Octant compass for a delta: N/NE/E/SE/S/SW/W/NW. Screen-y grows down,
  // so negative dy is north.
  function compassFor(dx, dy) {
    try {
      if (!isFinite(dx) || !isFinite(dy)) return '?';
      if (dx === 0 && dy === 0) return 'HERE';
      var ang = Math.atan2(dx, -dy) * 180 / Math.PI; // 0 = N, clockwise
      if (ang < 0) ang += 360;
      var names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      return names[Math.round(ang / 45) % 8];
    } catch (e) { return '?'; }
  }

  function distFor(dx, dy) {
    try {
      if (!isFinite(dx) || !isFinite(dy)) return undefined;
      return Math.round(Math.sqrt(dx * dx + dy * dy));
    } catch (e) { return undefined; }
  }

  // Map peer world coords to screen % relative to me.
  // Returns { left, top, mode: 'near' | 'edge' } or null when unusable.
  function mapPeerToScreen(me, peer) {
    try {
      if (!me || !peer) return null;
      if (!isFinite(me.x) || !isFinite(me.y)) return null;
      if (!isFinite(peer.x) || !isFinite(peer.y)) return null;
      var dx = peer.x - me.x, dy = peer.y - me.y;
      var far = Math.abs(dx) > WORLD_RANGE_X || Math.abs(dy) > WORLD_RANGE_Y;
      var left = 50 + (dx / WORLD_RANGE_X) * 50;
      var top = 50 + (dy / WORLD_RANGE_Y) * 50;
      left = clampNum(left, 2, 98);
      top = clampNum(top, 2, 98);
      return { left: left, top: top, mode: far ? 'edge' : 'near' };
    } catch (e) { return null; }
  }

  // Normalize one inbound peer (room member) to a safe view. Never throws.
  function peerView(p, idx) {
    try {
      if (p === null || p === undefined) return null;
      if (typeof p !== 'object') return null;
      var v = {};
      var id = str32(p.id || p.peerId || p.name || ('p' + idx));
      v.id = (id === undefined) ? ('p' + idx) : id;
      var nm = str32(p.name || p.id || v.id);
      v.name = (nm === undefined) ? v.id : nm;
      var fx = fin(p.x), fy = fin(p.y);
      if (fx !== undefined) v.x = fx;
      if (fy !== undefined) v.y = fy;
      var hp = fin(p.hp), mh = fin(p.maxhp !== undefined ? p.maxhp : p.maxHp);
      if (hp !== undefined) v.hp = hp;
      if (mh !== undefined) v.maxhp = mh;
      var gold = fin(p.gold), kills = fin(p.kills), deaths = fin(p.deaths);
      if (gold !== undefined) v.gold = Math.floor(gold);
      if (kills !== undefined) v.kills = Math.floor(kills);
      if (deaths !== undefined) v.deaths = Math.floor(deaths);
      if (typeof p.alive === 'boolean') v.alive = p.alive;
      else if (hp !== undefined && mh !== undefined) v.alive = hp > 0;
      else if (hp !== undefined) v.alive = hp > 0;
      var bh = fin(p.bossHp), bm = fin(p.bossMax !== undefined ? p.bossMax : p.bossMaxHp);
      var bp = fin(p.bossHpPct !== undefined ? p.bossHpPct : p.bossPct);
      if (bh !== undefined && bm !== undefined && bm > 0) v.bossPct = clampNum(bh / bm * 100, 0, 100);
      else if (bp !== undefined) v.bossPct = clampNum(bp, 0, 100);
      var dps = fin(p.bossDps !== undefined ? p.bossDps : p.dps);
      if (dps !== undefined && dps >= 0) v.dps = dps;
      var pr = fin(p.progress);
      if (pr !== undefined) v.progress = clampNum(Math.round(pr), 0, 100);
      return v;
    } catch (e) { return null; }
  }

  function normPeers(peers) {
    var out = [];
    try {
      if (!peers) return out;
      var arr = Array.isArray(peers) ? peers : [peers];
      if (!Array.isArray(peers) && typeof peers === 'object') {
        var keys = [];
        try { keys = Object.keys(peers); } catch (e) { keys = []; }
        if (keys.length && !Array.isArray(peers)) {
          arr = [];
          for (var k = 0; k < keys.length; k++) arr.push(peers[keys[k]]);
        }
      }
      for (var i = 0; i < arr.length && out.length < (ROOM_MAX - 1); i++) {
        var v = peerView(arr[i], i);
        if (v) out.push(v);
      }
    } catch (e) {}
    return out;
  }

  // Room score: kills first, then gold. Returns index of leader in rows, -1 tie/empty.
  function roomLeaderIdx(rows) {
    try {
      if (!rows || rows.length === 0) return -1;
      var best = 0, tied = false;
      for (var i = 1; i < rows.length; i++) {
        var bk = rows[best].kills || 0, ik = rows[i].kills || 0;
        if (ik !== bk) {
          if (ik > bk) { best = i; tied = false; }
          continue;
        }
        var bg = rows[best].gold || 0, ig = rows[i].gold || 0;
        if (ig !== bg) {
          if (ig > bg) { best = i; tied = false; }
          continue;
        }
        tied = true;
      }
      return tied ? -1 : best;
    } catch (e) { return -1; }
  }

  // Shared world-boss pct: lowest known hp pct wins (most damage dealt).
  function sharedBossPct(localPct, peers) {
    try {
      var best = (isFinite(localPct)) ? clampNum(localPct, 0, 100) : undefined;
      for (var i = 0; i < (peers || []).length; i++) {
        var p = peers[i] || {};
        if (isFinite(p.bossPct)) {
          var v = clampNum(p.bossPct, 0, 100);
          if (best === undefined || v < best) best = v;
        }
      }
      return best;
    } catch (e) { return undefined; }
  }

  /* ---------- live game reads (best-effort, never throw) ---------- */

  var GAME_KEYS = ['GraveGainGame', 'GraveGain2D', 'GG2DGame', 'game', 'Game'];
  var PLAYER_KEYS = ['player', 'hero', 'avatar', 'character', 'you'];

  function getQuery() {
    try {
      if (typeof window === 'undefined' || !window.location) return {};
      return parseQuery(window.location.search);
    } catch (e) { return {}; }
  }

  function findGame() {
    try {
      if (typeof window === 'undefined') return null;
      for (var i = 0; i < GAME_KEYS.length; i++) {
        try {
          var g = window[GAME_KEYS[i]];
          if (g && typeof g === 'object') {
            var p = findPlayer(g);
            if (p || isFinite(g.runKills) || isFinite(g.runGold) || isFinite(g.gold)) return g;
          }
        } catch (e) {}
      }
      return null;
    } catch (e) { return null; }
  }

  function findPlayer(g) {
    try {
      if (!g || typeof g !== 'object') return null;
      for (var i = 0; i < PLAYER_KEYS.length; i++) {
        try {
          var p = g[PLAYER_KEYS[i]];
          if (p && typeof p === 'object' && (isFinite(p.x) || isFinite(p.hp))) return p;
        } catch (e) {}
      }
      return null;
    } catch (e) { return null; }
  }

  // DOM fallback: first finite number found in one of the ids, or in an
  // element whose id/class matches the name pattern. Returns undefined.
  function domNum(doc, ids, pattern) {
    try {
      if (!doc) return undefined;
      for (var i = 0; i < ids.length; i++) {
        try {
          var n = doc.getElementById(ids[i]);
          if (n && n.textContent) {
            var m = String(n.textContent).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
            if (m && isFinite(Number(m[0]))) return Number(m[0]);
          }
        } catch (e) {}
      }
      try {
        var all = doc.querySelectorAll ? doc.querySelectorAll('[id],[class]') : [];
        for (var j = 0; j < all.length; j++) {
          var n2 = all[j];
          var tag = ((n2.id || '') + ' ' + (n2.className || '')).toLowerCase();
          if (pattern.test(tag) && n2.textContent) {
            var m2 = String(n2.textContent).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
            if (m2 && isFinite(Number(m2[0]))) return Number(m2[0]);
          }
        }
      } catch (e) {}
      return undefined;
    } catch (e) { return undefined; }
  }

  function readState() {
    var out = {};
    try {
      var g = findGame();
      var doc = null;
      try { doc = (typeof document !== 'undefined') ? document : null; } catch (e) { doc = null; }
      if (!g) {
        // DOM-only fallback when no live globals are present.
        try {
          if (doc) {
            var hx = domNum(doc, ['hud-x', 'player-x'], /player.?x|pos.?x/);
            var hy = domNum(doc, ['hud-y', 'player-y'], /player.?y|pos.?y/);
            var hh = domNum(doc, ['hud-hp', 'hp', 'health'], /health|^hp|hp.?bar|hp.?val/);
            var hm = domNum(doc, ['hud-maxhp', 'maxhp'], /max.?hp/);
            var go = domNum(doc, ['hud-gold', 'gold'], /gold|coin/);
            var ki = domNum(doc, ['hud-kills', 'kills'], /kill/);
            var de = domNum(doc, ['hud-deaths', 'deaths'], /death/);
            if (hx !== undefined) out.x = hx;
            if (hy !== undefined) out.y = hy;
            if (hh !== undefined) out.hp = hh;
            if (hm !== undefined) out.maxhp = hm;
            if (go !== undefined) out.gold = Math.floor(go);
            if (ki !== undefined) out.kills = Math.floor(ki);
            if (de !== undefined) out.deaths = Math.floor(de);
          }
        } catch (e) {}
        return out;
      }
      var p = findPlayer(g);
      if (p) {
        var px = fin(p.x), py = fin(p.y);
        var hp = fin(p.hp), mh = fin(p.maxHp !== undefined ? p.maxHp : p.maxhp);
        if (px !== undefined) out.x = px;
        if (py !== undefined) out.y = py;
        if (hp !== undefined) out.hp = hp;
        if (mh !== undefined) out.maxhp = mh;
        var dc = fin(g.runDeaths !== undefined ? g.runDeaths : g.deaths);
        if (dc === undefined) dc = fin(p.deaths !== undefined ? p.deaths : p.deathCount);
        if (dc !== undefined) out.deaths = Math.floor(dc);
        else if (typeof p.isDead === 'boolean') out.deaths = p.isDead ? 1 : 0;
      }
      var gold = fin(g.runGold);
      if (gold === undefined) gold = fin(g.gold);
      if (gold === undefined && p) gold = fin(p.gold);
      if (gold !== undefined) out.gold = Math.floor(gold);
      var kills = fin(g.runKills);
      if (kills === undefined) kills = fin(g.kills);
      if (kills === undefined && p) kills = fin(p.kills);
      if (kills !== undefined) out.kills = Math.floor(kills);
      var prog = missionProgress(g.currentMission || g.mission || null);
      if (prog !== undefined) out.progress = prog;
      // DOM fills only keys still unknown.
      try {
        if (doc) {
          if (out.hp === undefined) {
            var dh = domNum(doc, ['hud-hp', 'hp', 'health'], /health|^hp|hp.?bar|hp.?val/);
            if (dh !== undefined) out.hp = dh;
          }
          if (out.maxhp === undefined) {
            var dm = domNum(doc, ['hud-maxhp', 'maxhp'], /max.?hp/);
            if (dm !== undefined) out.maxhp = dm;
          }
          if (out.gold === undefined) {
            var dg = domNum(doc, ['hud-gold', 'gold'], /gold|coin/);
            if (dg !== undefined) out.gold = Math.floor(dg);
          }
          if (out.kills === undefined) {
            var dk = domNum(doc, ['hud-kills', 'kills'], /kill/);
            if (dk !== undefined) out.kills = Math.floor(dk);
          }
        }
      } catch (e) {}
    } catch (e) {}
    return out;
  }

  // Local world-boss scan: first boss enemy hp pct, else undefined.
  function localBoss() {
    try {
      var g = findGame();
      if (!g || !Array.isArray(g.enemies)) return undefined;
      for (var i = 0; i < g.enemies.length; i++) {
        var e = g.enemies[i];
        if (!e || e.type !== 'boss') continue;
        var hp = fin(e.hp), mh = fin(e.maxHp !== undefined ? e.maxHp : e.maxhp);
        var nm = str32(e.name);
        if (hp !== undefined && mh !== undefined && mh > 0) {
          return { pct: clampNum(hp / mh * 100, 0, 100), name: (nm === undefined ? 'WORLD BOSS' : nm) };
        }
        if (hp !== undefined && hp > 0) {
          return { pct: undefined, name: (nm === undefined ? 'WORLD BOSS' : nm), engaged: true };
        }
        return { pct: undefined, name: (nm === undefined ? 'WORLD BOSS' : nm), engaged: true };
      }
      return undefined;
    } catch (e) { return undefined; }
  }

  /* ---------- adapter state ---------- */

  var S = {
    server: null,
    mounted: false,
    els: null,
    outbox: [],
    onOutboundCb: null,
    prevPeers: null,
    prevBossPct: undefined,
    prevLeader: -2,
    voted: {},
    tickTimer: 0
  };

  function isActive() {
    try {
      if (S.server) return true;
      var q = getQuery();
      return !!(q.mmorpg);
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

  function sendVote(kind, peerId, text) {
    try {
      var sent = false;
      try {
        if (typeof window !== 'undefined' && window.GraveGainMP &&
            typeof window.GraveGainMP.sendVote === 'function') {
          window.GraveGainMP.sendVote(kind, peerId);
          sent = true;
        }
      } catch (e) {}
      if (!sent) emitOutbound({ kind: kind, peer: String(peerId).slice(0, 32), text: String(text || '').slice(0, 40) });
    } catch (e) {}
  }

  function sendPing(text) {
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
      if (!sent) emitOutbound({ kind: 'ping', text: t });
    } catch (e) {}
  }

  /* ---------- overlay DOM (runtime only, ASCII) ---------- */

  var CSS_ID = 'gg2d-siege-css';

  function ensureCss(doc) {
    try {
      if (doc.getElementById(CSS_ID)) return;
      var st = doc.createElement('style');
      st.id = CSS_ID;
      st.textContent =
        '.gg2d-siege{position:absolute;inset:0;pointer-events:none;z-index:61;font-family:monospace,sans-serif;}' +
        '.gg2d-siege-panel{position:absolute;background:rgba(8,10,16,.85);border:1px solid #22d3ee;color:#e9e4ff;' +
        'border-radius:8px;padding:6px 10px;font-size:12px;line-height:1.5;}' +
        '.gg2d-siege-room{top:8px;left:8px;min-width:230px;}' +
        '.gg2d-siege-room .t{color:#22d3ee;font-weight:bold;letter-spacing:1px;}' +
        '.gg2d-siege-room .lead{color:#4ade80;}' +
        '.gg2d-siege-boss{top:8px;left:50%;transform:translateX(-50%);min-width:240px;max-width:46%;text-align:center;}' +
        '.gg2d-siege-boss .t{color:#f87171;font-weight:bold;letter-spacing:1px;}' +
        '.gg2d-siege-bar{height:10px;background:#1e1b2e;border:1px solid #f87171;border-radius:5px;margin-top:4px;overflow:hidden;}' +
        '.gg2d-siege-bar i{display:block;height:100%;background:#f87171;width:100%;}' +
        '.gg2d-siege-peer{position:absolute;transform:translate(-50%,-50%);text-align:center;}' +
        '.gg2d-siege-peer .mk{font-size:22px;}' +
        '.gg2d-siege-peer .tag{background:rgba(8,10,16,.88);border:1px solid #22d3ee;border-radius:6px;color:#e9e4ff;' +
        'font-size:10px;padding:1px 6px;white-space:nowrap;}' +
        '.gg2d-siege-peer.edge .tag{border-color:#fbbf24;color:#fbbf24;}' +
        '.gg2d-siege-peer.down .tag{border-color:#f87171;color:#f87171;}' +
        '.gg2d-siege-feed{bottom:8px;left:8px;max-width:330px;}' +
        '.gg2d-siege-feed div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
        '.gg2d-siege-actions{bottom:8px;right:8px;text-align:right;}' +
        '.gg2d-siege-actions button{pointer-events:auto;background:#1e1b2e;color:#e9e4ff;border:1px solid #22d3ee;' +
        'border-radius:6px;padding:3px 8px;margin:2px;font-size:11px;cursor:pointer;font-family:inherit;}' +
        '.gg2d-siege-actions button:hover{background:#2d2547;}' +
        '.gg2d-siege-actions button:disabled{opacity:.45;cursor:default;}';
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
      var old = doc.getElementById('gg2d-siege-root');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var root = el('div', 'gg2d-siege');
      root.id = 'gg2d-siege-root';
      root.setAttribute('aria-live', 'polite');

      var room = el('div', 'gg2d-siege-panel gg2d-siege-room');
      var title = el('div', 't', 'DUNGEON SIEGE');
      var sub = el('div', 'sb', '');
      var rows = el('div', 'rw', '');
      room.appendChild(title);
      room.appendChild(sub);
      room.appendChild(rows);

      var boss = el('div', 'gg2d-siege-panel gg2d-siege-boss');
      var bt = el('div', 't', 'WORLD BOSS');
      var bl = el('div', 'bl', 'no contact');
      var bar = el('div', 'gg2d-siege-bar');
      var fill = el('i', null);
      try { fill.textContent = ''; } catch (e) {}
      bar.appendChild(fill);
      boss.appendChild(bt);
      boss.appendChild(bl);
      boss.appendChild(bar);

      var layer = el('div', 'gg2d-siege-layer');

      var feed = el('div', 'gg2d-siege-panel gg2d-siege-feed');

      var actions = el('div', 'gg2d-siege-panel gg2d-siege-actions');
      var potion = el('button', null, 'POTION SHARE');
      potion.addEventListener('click', function () {
        try {
          sendPing('POTION');
          feedMsg('YOU ping: POTION SHARE');
        } catch (e) {}
      });
      actions.appendChild(potion);
      var votes = el('div', 'vv', '');
      actions.appendChild(votes);

      root.appendChild(room);
      root.appendChild(boss);
      root.appendChild(layer);
      root.appendChild(feed);
      root.appendChild(actions);
      host.appendChild(root);

      S.els = { root: root, room: room, sub: sub, rows: rows, boss: boss, bl: bl, fill: fill, layer: layer, feed: feed, actions: actions, votes: votes, peers: {} };
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
    } catch (e) {}
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
          if (e.peer !== undefined) o.peer = str32(e.peer);
          if (e.text !== undefined || e.msg !== undefined) o.text = String(e.text !== undefined ? e.text : e.msg).slice(0, 120);
          out.push(o);
        }
      }
    } catch (e) {}
    return out;
  }

  function peerMarker(els, peer, me) {
    try {
      var m = els.peers[peer.id];
      if (!m) {
        m = { wrap: el('div', 'gg2d-siege-peer'), mk: null, tag: null };
        m.mk = el('div', 'mk', 'A');
        m.mk.textContent = 'A';
        m.tag = el('div', 'tag', peer.name);
        m.wrap.appendChild(m.mk);
        m.wrap.appendChild(m.tag);
        els.layer.appendChild(m.wrap);
        els.peers[peer.id] = m;
      }
      var pos = mapPeerToScreen(me, peer);
      var down = (peer.alive === false);
      var cls = 'gg2d-siege-peer' + ((!pos || pos.mode === 'edge') ? ' edge' : '') + (down ? ' down' : '');
      m.wrap.className = cls;
      if (pos) {
        m.wrap.style.display = 'block';
        m.wrap.style.left = pos.left + '%';
        m.wrap.style.top = pos.top + '%';
      } else {
        m.wrap.style.display = 'block';
        m.wrap.style.left = '96%';
        m.wrap.style.top = '40%';
      }
      var label;
      if (isFinite(peer.x) && isFinite(peer.y) && isFinite(me.x) && isFinite(me.y)) {
        var dx = peer.x - me.x, dy = peer.y - me.y;
        var dd = distFor(dx, dy);
        label = peer.name + ' ' + compassFor(dx, dy) + ' d' + (dd === undefined ? '?' : dd);
      } else {
        label = peer.name + ' ? d?';
      }
      if (isFinite(peer.hp) && isFinite(peer.maxhp)) label += ' hp' + Math.floor(peer.hp) + '/' + Math.floor(peer.maxhp);
      else if (isFinite(peer.hp)) label += ' hp' + Math.floor(peer.hp);
      if (down) label += ' DOWN';
      m.tag.textContent = label.slice(0, 48);
      try { m.mk.textContent = down ? 'X' : 'A'; } catch (e) {}
      return true;
    } catch (e) { return false; }
  }

  function pruneMarkers(els, peers) {
    try {
      var keep = {};
      for (var i = 0; i < peers.length; i++) keep[peers[i].id] = true;
      for (var id in els.peers) {
        if (!keep[id]) {
          try {
            var m = els.peers[id];
            if (m && m.wrap && m.wrap.parentNode) m.wrap.parentNode.removeChild(m.wrap);
          } catch (e) {}
          delete els.peers[id];
        }
      }
    } catch (e) {}
  }

  function renderVotes(els, peers) {
    try {
      els.votes.innerHTML = '';
      for (var i = 0; i < peers.length; i++) {
        (function (peer) {
          try {
            if (peer.alive !== false) return;
            var key = 'revive:' + peer.id;
            var b = el('button', null, S.voted[key] ? 'VOTED ' + peer.name : 'REVIVE ' + peer.name);
            if (S.voted[key]) b.disabled = true;
            b.addEventListener('click', function () {
              try {
                sendVote('revive-vote', peer.id, 'REVIVE ' + peer.name);
                S.voted[key] = true;
                b.disabled = true;
                b.textContent = 'VOTED ' + peer.name;
                feedMsg('YOU vote: REVIVE ' + peer.name);
              } catch (e) {}
            });
            els.votes.appendChild(b);
          } catch (e) {}
        })(peers[i]);
      }
    } catch (e) {}
  }

  function renderSiege(rawPeers, events) {
    try {
      var peers = normPeers(rawPeers);
      var evts = normEvents(events);

      try {
        if (!S.server) {
          var q = getQuery();
          if (q.mmorpg) S.server = String(q.mmorpg).slice(0, 64);
        }
      } catch (e) {}

      var els = mountOverlay();
      if (!els) return;

      var me = readState();
      var meRow = {
        name: 'YOU',
        kills: isFinite(me.kills) ? me.kills : 0,
        gold: isFinite(me.gold) ? me.gold : 0,
        hp: me.hp, maxhp: me.maxhp,
        progress: me.progress,
        alive: !((isFinite(me.hp) && me.hp <= 0))
      };

      // Room header: 4-player dungeon rooms.
      try {
        var n = 1 + peers.length;
        var srv = S.server ? (' SRV ' + S.server) : '';
        els.sub.textContent = ('ROOM ' + n + '/' + ROOM_MAX + srv).slice(0, 48);
      } catch (e) {}

      // Dungeon scoreboard: kills/gold race.
      try {
        var rows = [meRow];
        for (var i = 0; i < peers.length; i++) rows.push(peers[i]);
        var lead = roomLeaderIdx(rows);
        els.rows.innerHTML = '';
        for (var r = 0; r < rows.length; r++) {
          (function (row, ri) {
            var d = document.createElement('div');
            var hpTxt = (isFinite(row.hp) && isFinite(row.maxhp)) ? (' hp' + Math.floor(row.hp) + '/' + Math.floor(row.maxhp)) : '';
            var downTxt = (row.alive === false) ? ' DOWN' : '';
            d.textContent = (row.name + ' k' + (row.kills || 0) + ' g' + (row.gold || 0) + hpTxt + downTxt).slice(0, 56);
            if (ri === lead) d.className = 'lead';
            els.rows.appendChild(d);
          })(rows[r], r);
        }
        // DPS race line under the board.
        try {
          var dpsRows = [];
          for (var d2 = 0; d2 < peers.length; d2++) {
            if (isFinite(peers[d2].dps)) dpsRows.push(peers[d2]);
          }
          dpsRows.sort(function (a, b) { return (b.dps || 0) - (a.dps || 0); });
          if (dpsRows.length > 0) {
            var dl = document.createElement('div');
            var parts = [];
            for (var d3 = 0; d3 < dpsRows.length; d3++) {
              parts.push((d3 === 0 ? '* ' : '') + dpsRows[d3].name + ' ' + Math.floor(dpsRows[d3].dps) + 'dps');
            }
            dl.textContent = ('BOSS DPS: ' + parts.join(' | ')).slice(0, 56);
            els.rows.appendChild(dl);
          }
        } catch (e) {}
        if (S.prevLeader !== lead && lead >= 0 && S.prevPeers) {
          feedMsg(lead === 0 ? 'COMEBACK - you top the room' : 'LEAD CHANGE - ' + rows[lead].name + ' tops the room');
        }
        S.prevLeader = lead;
      } catch (e) {}

      // Shared world-boss bar.
      try {
        var lb = localBoss();
        var localPct = (lb && isFinite(lb.pct)) ? lb.pct : undefined;
        var bossName = (lb && lb.name) ? lb.name : 'WORLD BOSS';
        var pct = sharedBossPct(localPct, peers);
        if (pct !== undefined) {
          els.bl.textContent = (bossName + ' ' + Math.round(pct) + '%').slice(0, 48);
          try { els.fill.style.width = pct + '%'; } catch (e) {}
          if (S.prevBossPct !== undefined) {
            if (pct < S.prevBossPct - 0.5) feedMsg('BOSS hurt: ' + Math.round(pct) + '% left');
            if (pct <= 25 && S.prevBossPct > 25) feedMsg('BOSS at 25% - burn phase');
            if (pct <= 0) feedMsg('BOSS SLAIN - loot the room');
          } else if (pct < 100) {
            feedMsg('BOSS engaged: ' + Math.round(pct) + '% left');
          }
          S.prevBossPct = pct;
        } else if (lb && lb.engaged) {
          els.bl.textContent = (bossName + ' engaged').slice(0, 48);
          feedMsg('YOU engage the BOSS');
          S.prevBossPct = undefined;
        } else {
          els.bl.textContent = 'no contact';
          S.prevBossPct = undefined;
        }
      } catch (e) {}

      // Rival apparitions: screen-edge compass + distance.
      try {
        for (var m = 0; m < peers.length; m++) peerMarker(els, peers[m], me);
        pruneMarkers(els, peers);
      } catch (e) {}

      // Revive-vote buttons (pointer-events:auto only on buttons via CSS).
      try { renderVotes(els, peers); } catch (e) {}

      // Transition announcements: joins, downs, revives, potion pings.
      try {
        var prev = S.prevPeers;
        if (!prev && peers.length > 0) {
          feedMsg(peers.length + ' rival(s) enter the dungeon');
        } else if (prev) {
          var pmap = {};
          for (var p1 = 0; p1 < prev.length; p1++) pmap[prev[p1].id] = prev[p1];
          for (var p2 = 0; p2 < peers.length; p2++) {
            var cur = peers[p2], old = pmap[cur.id];
            if (!old) { feedMsg(cur.name + ' enters the dungeon'); continue; }
            if (old.alive !== false && cur.alive === false) feedMsg(cur.name + ' is DOWN - vote REVIVE');
            if (old.alive === false && cur.alive !== false) feedMsg(cur.name + ' is back up');
            if (isFinite(cur.kills) && isFinite(old.kills) && cur.kills > old.kills) {
              feedMsg(cur.name + ' slays (' + cur.kills + ' kills)');
            }
          }
        }
        S.prevPeers = peers;
      } catch (e) {}

      // Raw events from core -> feed.
      try {
        for (var e2 = 0; e2 < evts.length; e2++) {
          var ev = evts[e2];
          var txt = String(ev.text || 'event').slice(0, 120);
          var typ = ev.type ? String(ev.type).toLowerCase() : '';
          var by = ev.by ? String(ev.by).slice(0, 24) + ': ' : '';
          if (typ.indexOf('potion') >= 0) feedMsg(by + 'POTION SHARE: ' + txt);
          else if (typ.indexOf('revive') >= 0) feedMsg('REVIVE VOTE: ' + txt);
          else if (typ.indexOf('boss') >= 0) feedMsg('BOSS: ' + txt);
          else if (typ.indexOf('down') >= 0 || typ.indexOf('dead') >= 0) feedMsg(txt);
          else if (typ.indexOf('emote') >= 0 || typ.indexOf('ping') >= 0) feedMsg(by + 'ping: ' + txt);
          else feedMsg(txt);
        }
      } catch (e) {}
    } catch (e) {}
  }

  function tickLoop() {
    try {
      if (!S.mounted || !S.els) return;
      // Keep room header truthful if peers time out elsewhere; cheap upkeep.
      try {
        var q = getQuery();
        if (!S.server && q.mmorpg) S.server = String(q.mmorpg).slice(0, 64);
      } catch (e) {}
    } catch (e) {}
  }

  /* ---------- public adapter ---------- */

  var adapter = {
    mode: 'siege2d',
    read: function () { try { return readState(); } catch (e) { return {}; } },
    render: function (peers, events) { try { renderSiege(peers, events); } catch (e) {} },
    setServer: function (s) {
      try {
        if (s && typeof s === 'object') {
          if (s.id) S.server = String(s.id).slice(0, 64);
          else if (s.serverId) S.server = String(s.serverId).slice(0, 64);
          else return false;
          return true;
        }
        if (typeof s === 'string' && s) {
          S.server = s.slice(0, 64);
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
    summary: function () {
      try {
        var me = readState();
        var mk = isFinite(me.kills) ? me.kills : 0;
        var mg = isFinite(me.gold) ? me.gold : 0;
        var n = 1 + (S.prevPeers ? S.prevPeers.length : 0);
        return { me: 'YOU k' + mk + ' g' + mg, room: 'ROOM ' + n + '/' + ROOM_MAX };
      } catch (e) { return 'SIEGE ROOM'; }
    },
    _pure: {
      clampNum: clampNum,
      str32: str32,
      parseQuery: parseQuery,
      missionProgress: missionProgress,
      compassFor: compassFor,
      distFor: distFor,
      mapPeerToScreen: mapPeerToScreen,
      peerView: peerView,
      normPeers: normPeers,
      roomLeaderIdx: roomLeaderIdx,
      sharedBossPct: sharedBossPct,
      ROOM_MAX: ROOM_MAX,
      FEED_MAX: FEED_MAX
    }
  };

  /* ---------- boot (solo-safe: dormant without ?mmorpg=) ---------- */

  try {
    if (typeof window !== 'undefined' && window) {
      try { window.GraveGainMPAdapterMMORPG2D = adapter; } catch (e) {}
      try {
        var evtName = 'gravegain-mmorpg-2d-ready';
        if (typeof window.dispatchEvent === 'function') {
          var ev;
          if (typeof window.CustomEvent === 'function') {
            ev = new window.CustomEvent(evtName, { detail: { mode: 'siege2d' } });
          } else if (typeof document !== 'undefined' && document && document.createEvent) {
            ev = document.createEvent('CustomEvent');
            if (ev && ev.initCustomEvent) ev.initCustomEvent(evtName, false, false, { mode: 'siege2d' });
          }
          if (ev) window.dispatchEvent(ev);
        }
      } catch (e) {}
      try {
        var boot = function () {
          try {
            if (!isActive()) return; // solo: dormant, no DOM writes
            var q = getQuery();
            if (q.mmorpg) S.server = String(q.mmorpg).slice(0, 64);
            mountOverlay();
            feedMsg('DUNGEON SIEGE - 4-player room. GL.');
            if (S.tickTimer) { try { clearInterval(S.tickTimer); } catch (e) {} }
            S.tickTimer = setInterval(tickLoop, 5000);
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
