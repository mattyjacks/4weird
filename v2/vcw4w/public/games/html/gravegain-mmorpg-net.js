/* GraveGain MMORPG networking core (shared by GraveGain 1D/2D/3D/4D/5D).
 * Vanilla JS, ASCII-only, never throws, solo-safe (works offline with zero peers).
 * Transport: WebSocket primary + HTTP poll fallback (fetch/XHR), same shape all 5 games use.
 * Snapshot rate: 10Hz. Peer list capped at 32. Reconnect uses exponential backoff.
 * All inputs sanitized: numbers clamped/finite, strings truncated to <=32 chars.
 */
(function () {
  "use strict";

  var MAX_PEERS = 32;
  var MAX_STR = 32;
  var TICK_MS = 100;
  var POLL_MS = 1000;
  var BACKOFF_BASE_MS = 500;
  var BACKOFF_MAX_MS = 30000;

  function isObj(v) {
    return v !== null && typeof v === "object";
  }

  function clampNum(v, lo, hi, fb) {
    try {
      var n = Number(v);
      if (!isFinite(n)) { return fb; }
      if (!isFinite(Number(lo))) { lo = n; }
      if (!isFinite(Number(hi))) { hi = n; }
      if (lo > hi) { var t = lo; lo = hi; hi = t; }
      if (n < lo) { return lo; }
      if (n > hi) { return hi; }
      return n;
    } catch (e) {
      return fb;
    }
  }

  function sanitizeStr(v) {
    try {
      var s = String(v === undefined || v === null ? "" : v);
      // ASCII-only: drop non-printable ASCII and anything >= 127.
      var out = "";
      for (var i = 0; i < s.length && out.length < MAX_STR; i++) {
        var c = s.charCodeAt(i);
        if (c >= 32 && c < 127) { out += s.charAt(i); }
      }
      return out.slice(0, MAX_STR);
    } catch (e) {
      return "";
    }
  }

  function normBand(v) {
    try {
      var s = sanitizeStr(v).toLowerCase();
      if (s === "kids" || s === "kid" || s === "child" || s === "children") { return "kids"; }
      if (s === "teens" || s === "teen" || s === "youth") { return "teens"; }
      if (s === "adults" || s === "adult" || s === "grownups" || s === "mature") { return "adults"; }
      return "";
    } catch (e) {
      return "";
    }
  }

  // Shared game-kind allowlist: 1D/2D/3D + 4D holes + 5D universes.
  var GAME_KINDS = ["gravegain1d", "gravegain2d", "gravegain3d", "gravegain4d", "gravegain5d"];

  function normGameKind(v) {
    try {
      var s = sanitizeStr(v).toLowerCase();
      for (var i = 0; i < GAME_KINDS.length; i++) {
        if (s === GAME_KINDS[i]) { return s; }
      }
      return "";
    } catch (e) {
      return "";
    }
  }

  function isGameKind(v) {
    try {
      return normGameKind(v) !== "";
    } catch (e) {
      return false;
    }
  }

  // Pure: adults enter kids/teens/adults; teens enter kids/teens; kids enter kids only.
  function canEnter(playerBand, serverBand) {
    try {
      var p = normBand(playerBand);
      var s = normBand(serverBand);
      if (!p || !s) { return false; }
      if (p === "adults") { return true; }
      if (p === "teens") { return s === "kids" || s === "teens"; }
      return s === "kids";
    } catch (e) {
      return false;
    }
  }

  // Pure: hostFree ? 0 : serverCostPerMin / max(1, playerCount). Never NaN/negative.
  function costPerPlayer(serverCostPerMin, playerCount, hostFree) {
    try {
      if (hostFree) { return 0; }
      var cost = Number(serverCostPerMin);
      if (!isFinite(cost) || cost < 0) { return 0; }
      var n = Math.floor(Number(playerCount));
      if (!isFinite(n) || n < 1) { n = 1; }
      if (n > 1000000) { n = 1000000; }
      var per = cost / n;
      if (!isFinite(per) || per < 0) { return 0; }
      return per;
    } catch (e) {
      return 0;
    }
  }

  function sanitizeSnapshot(snap) {
    try {
      var s = isObj(snap) ? snap : {};
      // Accept floor (1D/2D) or sector (3D); keep whichever present, default floor.
      // 4D adds hole/world; 5D adds universe/paradox/combo (all optional, sanitized).
      var hasSector = s.sector !== undefined && s.sector !== null && String(s.sector) !== "";
      var area = hasSector
        ? { sector: clampNum(s.sector, 0, 9999, 1) }
        : { floor: clampNum(s.floor, 0, 9999, 1) };
      var gk = null;
      try { gk = normGameKind(s.gameKind !== undefined ? s.gameKind : (s.game !== undefined ? s.game : s.kind)); } catch (e) { gk = ""; }
      var out = {
        x: clampNum(s.x, -100000, 100000, 0),
        y: clampNum(s.y, -100000, 100000, 0),
        hp: clampNum(s.hp, 0, 999999, 100),
        maxhp: clampNum(s.maxhp, 1, 999999, 100),
        gold: clampNum(s.gold, 0, 999999999, 0),
        kills: clampNum(Math.floor(Number(s.kills)), 0, 999999999, 0),
        progress: clampNum(s.progress, 0, 1, 0),
        boss: clampNum(s.boss, 0, 999999999, 0),
        winner: s.winner ? true : false,
        seed: sanitizeStr(s.seed),
        serverId: sanitizeStr(s.serverId),
        ageBand: normBand(s.ageBand) || "kids",
        gameKind: gk || "gravegain3d"
      };
      if (hasSector) { out.sector = area.sector; } else { out.floor = area.floor; }
      try {
        if (s.hole !== undefined && s.hole !== null && String(s.hole) !== "") {
          out.hole = clampNum(s.hole, 0, 9999, 1);
        }
      } catch (e) { /* keep base snapshot */ }
      try {
        if (s.world !== undefined && s.world !== null && String(s.world) !== "") {
          out.world = sanitizeStr(s.world);
        }
      } catch (e) { /* keep base snapshot */ }
      try {
        if (s.universe !== undefined && s.universe !== null && String(s.universe) !== "") {
          out.universe = sanitizeStr(s.universe);
        }
      } catch (e) { /* keep base snapshot */ }
      try {
        if (s.paradox !== undefined && s.paradox !== null && String(s.paradox) !== "") {
          out.paradox = clampNum(s.paradox, 0, 999999, 0);
        }
      } catch (e) { /* keep base snapshot */ }
      try {
        if (s.combo !== undefined && s.combo !== null && String(s.combo) !== "") {
          out.combo = clampNum(Math.floor(Number(s.combo)), 0, 999999, 0);
        }
      } catch (e) { /* keep base snapshot */ }
      return out;
    } catch (e) {
      return { x: 0, y: 0, hp: 100, maxhp: 100, gold: 0, kills: 0, floor: 1, progress: 0, boss: 0, winner: false, seed: "", serverId: "", ageBand: "kids", gameKind: "gravegain3d" };
    }
  }

  function sanitizePeer(p) {
    try {
      if (!isObj(p)) { return null; }
      var snap = sanitizeSnapshot(p.snapshot || p);
      return {
        id: sanitizeStr(p.id || p.playerId || "peer"),
        snapshot: snap,
        seen: Date.now()
      };
    } catch (e) {
      return null;
    }
  }

  var state = {
    connected: false,
    opts: {},
    socket: null,
    peers: [],
    subs: [],
    lastSnap: null,
    url: "",
    pollUrl: "",
    playerId: "solo",
    ageBand: "kids",
    serverId: "",
    backoffAttempt: 0,
    backoffTimer: null,
    tickTimer: null,
    pollTimer: null,
    pollInFlight: false,
    transport: "solo"
  };

  function notifyPeers() {
    try {
      var copy = [];
      for (var i = 0; i < state.peers.length; i++) {
        copy.push({
          id: state.peers[i].id,
          snapshot: state.peers[i].snapshot
        });
      }
      for (var j = 0; j < state.subs.length; j++) {
        try { state.subs[j](copy); } catch (e) { /* never throw */ }
      }
      return copy;
    } catch (e) {
      return [];
    }
  }

  function setPeers(list) {
    try {
      var next = [];
      var seen = {};
      var arr = list instanceof Array ? list : [];
      for (var i = 0; i < arr.length && next.length < MAX_PEERS; i++) {
        var p = sanitizePeer(arr[i]);
        if (!p || !p.id || seen[p.id]) { continue; }
        seen[p.id] = true;
        next.push(p);
      }
      state.peers = next;
      notifyPeers();
    } catch (e) { /* never throw */ }
  }

  function upsertPeer(p) {
    try {
      var clean = sanitizePeer(p);
      if (!clean || !clean.id) { return; }
      for (var i = 0; i < state.peers.length; i++) {
        if (state.peers[i].id === clean.id) {
          state.peers[i] = clean;
          notifyPeers();
          return;
        }
      }
      state.peers.push(clean);
      while (state.peers.length > MAX_PEERS) { state.peers.shift(); }
      notifyPeers();
    } catch (e) { /* never throw */ }
  }

  function clearTimers() {
    try {
      if (state.tickTimer) { clearInterval(state.tickTimer); state.tickTimer = null; }
      if (state.pollTimer) { clearInterval(state.pollTimer); state.pollTimer = null; }
      if (state.backoffTimer) { clearTimeout(state.backoffTimer); state.backoffTimer = null; }
    } catch (e) { /* never throw */ }
  }

  function closeSocket() {
    try {
      if (state.socket) {
        try { state.socket.onopen = null; } catch (e) {}
        try { state.socket.onclose = null; } catch (e) {}
        try { state.socket.onerror = null; } catch (e) {}
        try { state.socket.onmessage = null; } catch (e) {}
        try { state.socket.close(); } catch (e) {}
      }
    } catch (e) { /* never throw */ }
    state.socket = null;
  }

  function backoffDelay() {
    try {
      var a = clampNum(state.backoffAttempt, 0, 10, 0);
      var d = BACKOFF_BASE_MS * Math.pow(2, a);
      if (!isFinite(d) || d < 0) { d = BACKOFF_BASE_MS; }
      if (d > BACKOFF_MAX_MS) { d = BACKOFF_MAX_MS; }
      return Math.floor(d);
    } catch (e) {
      return BACKOFF_BASE_MS;
    }
  }

  function scheduleReconnect() {
    try {
      if (!state.connected) { return; }
      if (state.backoffTimer) { return; }
      if (!state.url) { return; }
      var delay = backoffDelay();
      state.backoffAttempt = clampNum(state.backoffAttempt + 1, 0, 10, 0);
      state.backoffTimer = setTimeout(function () {
        state.backoffTimer = null;
        try { openSocket(); } catch (e) { /* never throw */ }
      }, delay);
    } catch (e) { /* never throw */ }
  }

  function openSocket() {
    try {
      if (!state.connected || !state.url) { return false; }
      var WS = null;
      try { WS = typeof WebSocket !== "undefined" ? WebSocket : null; } catch (e) { WS = null; }
      if (!WS) {
        state.transport = state.pollUrl ? "poll" : "solo";
        return false;
      }
      closeSocket();
      var ws = new WS(state.url);
      state.socket = ws;
      try {
        ws.onopen = function () {
          try {
            state.backoffAttempt = 0;
            state.transport = "ws";
            if (state.lastSnap) { send(state.lastSnap); }
          } catch (e) { /* never throw */ }
        };
      } catch (e) {}
      try {
        ws.onmessage = function (ev) {
          try {
            var data = ev && ev.data !== undefined ? ev.data : "";
            var msg = typeof data === "string" ? JSON.parse(data) : data;
            if (msg instanceof Array) { setPeers(msg); }
            else if (isObj(msg) && msg.peers instanceof Array) { setPeers(msg.peers); }
            else if (isObj(msg) && (msg.id || msg.playerId || msg.snapshot)) { upsertPeer(msg); }
          } catch (e) { /* ignore malformed frames */ }
        };
      } catch (e) {}
      var onDown = function () {
        try {
          if (state.socket === ws) { state.socket = null; }
          if (state.transport === "ws") { state.transport = state.pollUrl ? "poll" : "solo"; }
          scheduleReconnect();
        } catch (e) { /* never throw */ }
      };
      try { ws.onclose = onDown; } catch (e) {}
      try { ws.onerror = onDown; } catch (e) {}
      return true;
    } catch (e) {
      return false;
    }
  }

  function pollOnce() {
    try {
      if (!state.connected || !state.pollUrl) { return; }
      if (state.pollInFlight) { return; }
      var body = null;
      try {
        body = JSON.stringify({
          id: state.playerId,
          serverId: state.serverId,
          ageBand: state.ageBand,
          snapshot: state.lastSnap
        });
      } catch (e) { body = "{}"; }
      var done = function (list) {
        state.pollInFlight = false;
        try { if (list instanceof Array) { setPeers(list); } } catch (e) {}
      };
      var fail = function () { state.pollInFlight = false; };
      state.pollInFlight = true;
      try {
        if (typeof fetch !== "undefined") {
          fetch(state.pollUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: body
          }).then(function (res) {
            try { return res && res.json ? res.json() : null; } catch (e) { return null; }
          }).then(function (json) {
            try {
              if (json instanceof Array) { done(json); }
              else if (isObj(json) && json.peers instanceof Array) { done(json.peers); }
              else { done(null); }
            } catch (e) { fail(); }
          }).catch(fail);
          return;
        }
      } catch (e) { fail(); return; }
      try { fail(); } catch (e) {}
    } catch (e) { /* never throw */ }
  }

  function connect(opts) {
    try {
      disconnect();
      var o = isObj(opts) ? opts : {};
      state.url = sanitizeStr(o.url || "");
      // pollUrl may be a longer URL; keep raw but cap length defensively.
      try {
        var pu = String(o.pollUrl || o.poll || "");
        state.pollUrl = pu.slice(0, 512);
      } catch (e) { state.pollUrl = ""; }
      state.playerId = sanitizeStr(o.playerId || o.id || "solo") || "solo";
      state.ageBand = normBand(o.ageBand) || "kids";
      state.serverId = sanitizeStr(o.serverId || "");
      state.connected = true;
      state.backoffAttempt = 0;
      state.transport = "solo";
      setPeers([]);
      var opened = false;
      try { opened = openSocket(); } catch (e) { opened = false; }
      if (!opened) { state.transport = state.pollUrl ? "poll" : "solo"; }
      try {
        state.tickTimer = setInterval(function () {
          try { tick(); } catch (e) { /* never throw */ }
        }, TICK_MS);
      } catch (e) { state.tickTimer = null; }
      if (state.pollUrl) {
        try {
          var ms = clampNum(o.pollMs, 250, 10000, POLL_MS);
          state.pollTimer = setInterval(function () {
            try { pollOnce(); } catch (e) { /* never throw */ }
          }, ms);
        } catch (e) { state.pollTimer = null; }
      }
      try {
        if (typeof o.onPeers === "function") { onPeers(o.onPeers); }
      } catch (e) {}
      return true;
    } catch (e) {
      return false;
    }
  }

  function disconnect() {
    try {
      state.connected = false;
      clearTimers();
      closeSocket();
      state.transport = "solo";
      return true;
    } catch (e) {
      return false;
    }
  }

  function send(snapshot) {
    try {
      var clean = sanitizeSnapshot(snapshot);
      state.lastSnap = clean;
      try {
        if (state.socket && state.socket.readyState === 1) {
          state.socket.send(JSON.stringify({ id: state.playerId, snapshot: clean }));
        }
      } catch (e) { /* fall through to poll/solo */ }
      return clean;
    } catch (e) {
      return sanitizeSnapshot(null);
    }
  }

  function onPeers(cb) {
    try {
      if (typeof cb !== "function") { return function () {}; }
      state.subs.push(cb);
      if (state.subs.length > MAX_PEERS) { state.subs.shift(); }
      var active = true;
      try { cb(notifyPeersCopy()); } catch (e) { /* never throw */ }
      return function () {
        try {
          active = false;
          for (var i = state.subs.length - 1; i >= 0; i--) {
            if (state.subs[i] === cb) { state.subs.splice(i, 1); }
          }
        } catch (e) { /* never throw */ }
      };
    } catch (e) {
      return function () {};
    }
  }

  function notifyPeersCopy() {
    try {
      var copy = [];
      for (var i = 0; i < state.peers.length; i++) {
        copy.push({ id: state.peers[i].id, snapshot: state.peers[i].snapshot });
      }
      return copy;
    } catch (e) {
      return [];
    }
  }

  // Manual 10Hz pump: solo-safe no-op when offline; returns current peer copy.
  function tick() {
    try {
      if (!state.connected) { return notifyPeersCopy(); }
      // Keep poll fallback fresh on manual ticks too (guarded + throttled).
      try {
        var now = Date.now();
        if (state.pollUrl && (!tick._last || now - tick._last > 900)) {
          tick._last = now;
          pollOnce();
        }
      } catch (e) {}
      return notifyPeers();
    } catch (e) {
      return [];
    }
  }

  var api = {
    connect: connect,
    disconnect: disconnect,
    send: send,
    onPeers: onPeers,
    tick: tick,
    costShare: costPerPlayer,
    ageBandCanEnter: canEnter,
    gameKinds: GAME_KINDS,
    normGameKind: normGameKind,
    isGameKind: isGameKind,
    _pure: {
      clampNum: clampNum,
      costPerPlayer: costPerPlayer,
      canEnter: canEnter,
      sanitizeStr: sanitizeStr,
      sanitizeSnapshot: sanitizeSnapshot,
      normGameKind: normGameKind,
      isGameKind: isGameKind
    }
  };

  try {
    if (typeof window !== "undefined") {
      window.GraveGainMMORPG = api;
    }
  } catch (e) { /* never throw */ }
  try {
    if (typeof globalThis !== "undefined" && !globalThis.GraveGainMMORPG) {
      globalThis.GraveGainMMORPG = api;
    }
  } catch (e) { /* never throw */ }
  try {
    if (typeof module !== "undefined" && module.exports) {
      module.exports = api;
    }
  } catch (e) { /* never throw */ }

  return api;
})();
