/**
 * GraveGain netplay core (v2-native extra, NOT a v1 bundle file).
 *
 * Shared multiplayer transport + overlay chrome for gravegain1d,
 * gravegain2d and gravegain3d. Injected by reference into the GENERATED
 * bundles only (scripts/sync-game-bundles.mjs); no bundle source is edited.
 *
 * Per-game adapters (implemented by sibling agents):
 *   gravegain1d -> mp-1d.js   (window.GraveGainMPAdapter, mode "1d")
 *   gravegain2d -> mp-2d.js   (window.GraveGainMPAdapter, mode "2d")
 *   gravegain3d -> mp-3d.js   (window.GraveGainMPAdapter, mode "3d")
 * This core auto-loads the adapter script by slug (absolute canonical path
 * /games/html/mp-<n>d.js first, relative ./mp-<n>d.js fallback), watches for
 * window.GraveGainMPAdapter, and calls GraveGainMP.init(adapter) itself.
 * Games may also call GraveGainMP.init(adapter) manually; it is idempotent.
 *
 * Adapter interface (window.GraveGainMPAdapter):
 *   {
 *     mode: "1d" | "2d" | "3d",
 *     read: function () -> object   // local state; map the headline metric
 *                                   // into {x, y, score, alive} (the only
 *                                   // keys the PUT route persists; anything
 *                                   // else is dropped server-side). May also
 *                                   // include `seed` for same-seed parties.
 *     render: function (foe, events) -> void,  // foe = opponent state object
 *                                              // ({} when unknown), events =
 *                                              // cached event array
 *     summary: function () -> string | {me, foe}, // optional scoreboard line
 *     emotes: [string, ...]                     // optional, max 8 used
 *   }
 *
 * Core API (window.GraveGainMP):
 *   {
 *     slug, seed, matchId, mode, side,
 *     init(adapter) -> bool,
 *     sendChat(text) -> void,
 *     sendEmote(text) -> void,
 *     rematch() -> void,
 *     leave() -> void
 *   }
 * mode is one of "dormant" (no ?match= yet / solo play, game unaffected),
 * "multi" (relaying) or "solo" (auth required; overlay shows the sign-in
 * note and the game keeps running offline).
 *
 * Vanilla IIFE, no dependencies, ASCII-only. Never throws into game code:
 * every entry point is try/caught, timers are guarded, and the only global
 * introduced here is window.GraveGainMP.
 */
(function () {
  "use strict";

  var UUID_RE = /^[0-9a-f-]{36}$/i;
  var ADAPTER_BY_SLUG = {
    gravegain1d: "mp-1d.js",
    gravegain2d: "mp-2d.js",
    gravegain3d: "mp-3d.js"
  };
  var LOOP_MS = 2000;
  var EVENTS_MS = 5000;
  var FEED_SHOWN = 6;

  var S = {
    slug: "unknown",
    matchId: "",
    seed: "",
    side: "",
    mode: "dormant",
    adapter: null,
    running: false,
    busy: false,
    soloNote: "",
    eventsOn: true,
    eventFails: 0,
    events: [],
    lastEvents: 0,
    joinPosted: false,
    leavePosted: false,
    timers: []
  };

  /* ---------- tiny helpers (all total, never throw) ---------- */

  function safe(fn, fallback) {
    try {
      return fn();
    } catch (e) {
      return fallback;
    }
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      if (c === "&") return "&amp;";
      if (c === "<") return "&lt;";
      if (c === ">") return "&gt;";
      if (c === '"') return "&quot;";
      return "&#39;";
    });
  }

  function detectSlug() {
    var tagged = safe(function () {
      return document.currentScript && document.currentScript.getAttribute("data-slug");
    }, "");
    if (tagged) return String(tagged);
    var m = safe(function () {
      return window.location.pathname.match(/\/games\/([^/]+)\//);
    }, null);
    if (m && m[1]) return String(m[1]);
    return "unknown";
  }

  function queryParam(name) {
    return safe(function () {
      return new URLSearchParams(window.location.search).get(name) || "";
    }, "");
  }

  /* ---------- transport: bridge first, fetch fallback ---------- */

  function hasBridge() {
    return safe(function () {
      return !!(window.FourWeirdServer && typeof window.FourWeirdServer.request === "function");
    }, false);
  }

  // Normalised result: { ok, status, data }. status 401 is set when the
  // bridge reports a login/sign-in failure string, or when fetch sees 401.
  async function req(path, opts) {
    opts = opts || {};
    var method = opts.method || "GET";
    var body = opts.body;
    try {
      if (hasBridge()) {
        var r = await window.FourWeirdServer.request(path, { method: method, body: body });
        if (r && r.success === false) {
          var msg = "";
          try {
            msg = String(r.error || "");
          } catch (e) {}
          var unauth = /login|sign[\s-]?in|401|unauthor|session/i.test(msg);
          return { ok: false, status: unauth ? 401 : 0, data: r };
        }
        return { ok: true, status: 200, data: r || {} };
      }
      var init = {
        method: method,
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      };
      if (body !== undefined) {
        init.body = typeof body === "string" ? body : JSON.stringify(body);
      }
      var res = await fetch(path, init);
      var data = null;
      try {
        data = await res.json();
      } catch (e) {
        data = {};
      }
      return { ok: res.ok, status: res.status, data: data || {} };
    } catch (e) {
      return { ok: false, status: 0, data: null };
    }
  }

  function note401(res) {
    if (res && res.status === 401) {
      enterSolo("sign in for multiplayer");
      return true;
    }
    return false;
  }

  /* ---------- state sanitising ---------- */

  // Sanitise adapter state for the relay. The PUT route persists the RPG
  // key set below (phone_state/desktop_state, 4 KB cap), and match state
  // is readable by the OPPONENT, so an allowlist keeps adapters from
  // leaking anything else into shared storage: finite numbers, booleans,
  // capped strings. Mirrors the allowlist in app/api/matches/[id]/route.ts
  // (progress is 0..100; score keeps the legacy platform-wars clamp
  // server-side, so adapters must ALSO send explicit kills/gold/floor keys
  // and treat foe.score as a lossy fallback only).
  var STATE_ALLOW = {
    x: "num", y: "num", score: "num",
    hp: "num", maxhp: "num", gold: "num", kills: "num", deaths: "num",
    floor: "num", sector: "num", level: "num", xp: "num", progress: "prog",
    alive: "bool", revive: "bool", winner: "bool",
    boss: 32, seed: 24, side: 16, emote: 16
  };

  function sanitizeState(raw) {
    var out = {};
    try {
      if (!raw || typeof raw !== "object") return out;
      for (var k in STATE_ALLOW) {
        if (!Object.prototype.hasOwnProperty.call(STATE_ALLOW, k)) continue;
        var v = raw[k];
        var kind = STATE_ALLOW[k];
        if ((kind === "num" || kind === "prog") && typeof v === "number" && isFinite(v)) {
          v = Math.max(-100000, Math.min(100000, v));
          if (kind === "prog") v = Math.max(0, Math.min(100, v));
          out[k] = v;
        } else if (kind === "bool" && typeof v === "boolean") {
          out[k] = v;
        } else if (typeof kind === "number" && typeof v === "string" && v) {
          out[k] = v.slice(0, kind);
        }
      }
      // seed also accepts a numeric party seed (see ?seed= parties).
      if (out.seed === undefined && raw && typeof raw.seed === "number" && isFinite(raw.seed)) {
        out.seed = raw.seed;
      }
    } catch (e) {}
    return out;
  }

  function sameEcho(a, b) {
    try {
      if (!a || !b) return false;
      if (a.score !== undefined && b.score !== undefined && a.score !== b.score) return false;
      if (a.x !== undefined && b.x !== undefined && a.x !== b.x) return false;
      if (a.y !== undefined && b.y !== undefined && a.y !== b.y) return false;
      return a.score !== undefined || a.x !== undefined || a.y !== undefined;
    } catch (e) {
      return false;
    }
  }

  /* ---------- overlay chrome (created at runtime, no bundle edits) ---------- */

  var el = { root: null, score: null, seed: null, feed: null, emotes: null, chatRow: null, chatInput: null, note: null, rematchBtn: null };

  function ensureStyle() {
    try {
      if (document.getElementById("ggmp-style")) return;
      var st = document.createElement("style");
      st.setAttribute("id", "ggmp-style");
      st.textContent =
        "#ggmp-overlay{position:fixed;right:8px;bottom:8px;z-index:2147483000;" +
        "max-width:280px;background:rgba(8,8,18,.92);color:#e8e8f2;" +
        "border:1px solid #4a4a6a;border-radius:8px;padding:8px 10px;" +
        "font:12px/1.45 system-ui,sans-serif;text-align:left}" +
        "#ggmp-overlay .ggmp-title{font-weight:700;letter-spacing:.06em;color:#b39ddb}" +
        "#ggmp-overlay .ggmp-seed{color:#8f8fa8;font-weight:400}" +
        "#ggmp-overlay .ggmp-score{margin:4px 0;font-weight:600}" +
        "#ggmp-overlay .ggmp-feed{list-style:none;margin:4px 0;padding:0;max-height:96px;overflow:hidden}" +
        "#ggmp-overlay .ggmp-feed li{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#c9c9de}" +
        "#ggmp-overlay .ggmp-row{margin-top:6px}" +
        "#ggmp-overlay button{background:#2a2a44;color:#e8e8f2;border:1px solid #55557a;" +
        "border-radius:4px;padding:2px 8px;margin:0 4px 4px 0;cursor:pointer;font-size:12px}" +
        "#ggmp-overlay input{background:#14141f;color:#e8e8f2;border:1px solid #55557a;" +
        "border-radius:4px;padding:2px 6px;width:150px;font-size:12px}" +
        "#ggmp-overlay .ggmp-note{color:#e0a3a3;margin-top:4px}";
      (document.head || document.documentElement).appendChild(st);
    } catch (e) {}
  }

  function buildOverlay() {
    try {
      if (el.root || !document.body) return;
      ensureStyle();
      var root = document.createElement("div");
      root.setAttribute("id", "ggmp-overlay");
      root.innerHTML =
        '<div class="ggmp-row ggmp-title">MULTIPLAYER <span class="ggmp-seed"></span></div>' +
        '<div class="ggmp-row ggmp-score">connecting...</div>' +
        '<ul class="ggmp-feed"></ul>' +
        '<div class="ggmp-row ggmp-emotes"></div>' +
        '<div class="ggmp-row"><button type="button" class="ggmp-chat-toggle">chat</button>' +
        '<button type="button" class="ggmp-rematch">rematch</button></div>' +
        '<div class="ggmp-row ggmp-chat" hidden><input maxlength="140" placeholder="chat (140 max)">' +
        '<button type="button" class="ggmp-send">send</button></div>' +
        '<div class="ggmp-row ggmp-note" hidden></div>';
      document.body.appendChild(root);
      el.root = root;
      el.score = root.querySelector(".ggmp-score");
      el.seed = root.querySelector(".ggmp-seed");
      el.feed = root.querySelector(".ggmp-feed");
      el.emotes = root.querySelector(".ggmp-emotes");
      el.chatRow = root.querySelector(".ggmp-chat");
      el.chatInput = root.querySelector(".ggmp-chat input");
      el.note = root.querySelector(".ggmp-note");
      el.rematchBtn = root.querySelector(".ggmp-rematch");
      var toggle = root.querySelector(".ggmp-chat-toggle");
      var send = root.querySelector(".ggmp-send");
      if (toggle) {
        toggle.addEventListener("click", function () {
          try {
            el.chatRow.hidden = !el.chatRow.hidden;
            if (!el.chatRow.hidden && el.chatInput) el.chatInput.focus();
          } catch (e) {}
        });
      }
      if (send) {
        send.addEventListener("click", function () {
          try {
            var v = el.chatInput ? el.chatInput.value : "";
            api.sendChat(v);
            if (el.chatInput) el.chatInput.value = "";
          } catch (e) {}
        });
      }
      if (el.chatInput) {
        el.chatInput.addEventListener("keydown", function (ev) {
          try {
            if (ev && ev.key === "Enter") {
              ev.stopPropagation();
              api.sendChat(el.chatInput.value);
              el.chatInput.value = "";
            }
          } catch (e) {}
        });
      }
      if (el.rematchBtn) {
        el.rematchBtn.addEventListener("click", function () {
          try {
            api.rematch();
          } catch (e) {}
        });
      }
      buildEmoteButtons();
      paintNote();
      paintSeed("");
    } catch (e) {}
  }

  function buildEmoteButtons() {
    try {
      if (!el.emotes) return;
      el.emotes.innerHTML = "";
      var list = [];
      try {
        if (S.adapter && Array.isArray(S.adapter.emotes)) list = S.adapter.emotes;
      } catch (e) {
        list = [];
      }
      for (var i = 0; i < Math.min(8, list.length); i += 1) {
        var label = String(list[i]).slice(0, 20);
        if (!label) continue;
        (function (text) {
          var b = document.createElement("button");
          b.setAttribute("type", "button");
          b.textContent = text;
          b.addEventListener("click", function () {
            try {
              api.sendEmote(text);
            } catch (e) {}
          });
          el.emotes.appendChild(b);
        })(label);
      }
    } catch (e) {}
  }

  function paintScore() {
    try {
      if (!el.score) return;
      var s = null;
      try {
        if (S.adapter && typeof S.adapter.summary === "function") s = S.adapter.summary();
      } catch (e) {
        s = null;
      }
      var line = "you vs foe";
      if (typeof s === "string" && s) {
        line = s.slice(0, 120);
      } else if (s && typeof s === "object") {
        var me = String(s.me == null ? "you" : s.me).slice(0, 40);
        var foe = String(s.foe == null ? "foe" : s.foe).slice(0, 40);
        line = me + " vs " + foe;
      }
      el.score.textContent = line;
    } catch (e) {}
  }

  function paintSeed(seedText) {
    try {
      if (!el.seed) return;
      var t = seedText != null ? String(seedText) : "";
      el.seed.textContent = t ? "seed " + t.slice(0, 40) : "";
    } catch (e) {}
  }

  function paintFeed() {
    try {
      if (!el.feed) return;
      var tail = S.events.slice(-FEED_SHOWN);
      var html = "";
      for (var i = 0; i < tail.length; i += 1) {
        var ev = tail[i] || {};
        var kind = String(ev.kind || "note").slice(0, 12);
        var text = String(ev.text || "").slice(0, 140);
        html += "<li>[" + esc(kind) + "] " + esc(text) + "</li>";
      }
      el.feed.innerHTML = html;
    } catch (e) {}
  }

  function paintNote() {
    try {
      if (!el.note) return;
      if (S.soloNote) {
        el.note.textContent = S.soloNote;
        el.note.hidden = false;
      } else {
        el.note.textContent = "";
        el.note.hidden = true;
      }
    } catch (e) {}
  }

  function pushEvent(kind, text) {
    try {
      S.events.push({ kind: String(kind).slice(0, 12), text: String(text).slice(0, 140), at: Date.now() });
      if (S.events.length > 20) S.events = S.events.slice(-20);
      paintFeed();
    } catch (e) {}
  }

  /* ---------- match sync ---------- */

  async function myUserId() {
    var r = await req("/api/auth/session");
    if (note401(r)) return null;
    var id = safe(function () {
      var d = r.data || {};
      if (d.user && typeof d.user.id === "string") return d.user.id;
      if (d.session && d.session.user && typeof d.session.user.id === "string") return d.session.user.id;
      if (typeof d.user_id === "string") return d.user_id;
      if (typeof d.id === "string") return d.id;
      return "";
    }, "");
    return id || null;
  }

  function eventFail() {
    S.eventFails += 1;
    if (S.eventFails >= 3) S.eventsOn = false;
  }

  async function postEvent(kind, text) {
    if (!S.eventsOn || !S.matchId) return;
    try {
      var r = await req("/api/matches/" + S.matchId + "/events", {
        method: "POST",
        body: { kind: kind, text: String(text).slice(0, 140) }
      });
      if (note401(r)) return;
      if (!r.ok) {
        eventFail();
        return;
      }
      S.eventFails = 0;
      pushEvent(kind, text);
    } catch (e) {}
  }

  async function pollEvents() {
    if (!S.eventsOn || !S.matchId) return;
    try {
      var r = await req("/api/matches/" + S.matchId + "/events");
      if (note401(r)) return;
      if (!r.ok) {
        eventFail();
        return;
      }
      S.eventFails = 0;
      var list = safe(function () {
        var d = r.data;
        if (Array.isArray(d)) return d;
        if (d && Array.isArray(d.events)) return d.events;
        if (d && Array.isArray(d.data)) return d.data;
        return null;
      }, null);
      if (Array.isArray(list)) {
        S.events = list
          .slice(-20)
          .map(function (ev) {
            try {
              if (typeof ev === "string") return { kind: "note", text: ev.slice(0, 140), at: Date.now() };
              return {
                kind: String((ev && ev.kind) || "note").slice(0, 12),
                text: String((ev && ev.text) || "").slice(0, 140),
                at: (ev && ev.at) || Date.now()
              };
            } catch (e) {
              return null;
            }
          })
          .filter(function (ev) {
            return !!(ev && ev.text);
          });
        paintFeed();
      }
    } catch (e) {}
  }

  async function resolveSide(match, sent) {
    if (S.side) return S.side;
    try {
      var me = await myUserId();
      if (me && match) {
        if (match.phone_id === me) {
          S.side = "phone";
          return S.side;
        }
        if (match.desktop_id === me) {
          S.side = "desktop";
          return S.side;
        }
      }
    } catch (e) {}
    // Fallback: infer from echo — the side whose stored state matches what
    // we just PUT must be ours.
    try {
      if (match && sent) {
        if (sameEcho(match.phone_state, sent) && !sameEcho(match.desktop_state, sent)) {
          S.side = "phone";
          return S.side;
        }
        if (sameEcho(match.desktop_state, sent) && !sameEcho(match.phone_state, sent)) {
          S.side = "desktop";
          return S.side;
        }
      }
    } catch (e) {}
    if (!S.side) S.side = "phone";
    return S.side;
  }

  async function relayOnce() {
    if (!S.adapter || !S.matchId) return;
    var raw = safe(function () {
      return S.adapter.read();
    }, null);
    var sent = sanitizeState(raw);
    try {
      if (raw && raw.seed != null) paintSeed(raw.seed);
    } catch (e) {}
    var put = await req("/api/matches/" + S.matchId, { method: "PUT", body: { state: sent } });
    if (note401(put)) return;
    var got = await req("/api/matches/" + S.matchId);
    if (note401(got)) return;
    if (!got.ok) return;
    var match = safe(function () {
      return (got.data && (got.data.match || got.data)) || null;
    }, null);
    if (!match) return;
    var side = await resolveSide(match, sent);
    if (!S.joinPosted) {
      S.joinPosted = true;
      try {
        await postEvent("join", side + " joined (" + S.slug + ")");
      } catch (e) {}
    }
    var foe = {};
    try {
      foe = (side === "phone" ? match.desktop_state : match.phone_state) || {};
    } catch (e) {
      foe = {};
    }
    try {
      S.adapter.render(foe, S.events.slice());
    } catch (e) {}
    paintScore();
  }

  async function tick() {
    if (!S.running || S.mode !== "multi") return;
    var hidden = safe(function () {
      return !!document.hidden;
    }, false);
    if (hidden) return;
    if (S.busy) return;
    S.busy = true;
    try {
      await relayOnce();
    } catch (e) {}
    try {
      var now = Date.now();
      if (now - S.lastEvents > EVENTS_MS) {
        S.lastEvents = now;
        await pollEvents();
      }
    } catch (e) {}
    S.busy = false;
  }

  function startLoop() {
    try {
      stopLoop(true);
      S.lastEvents = 0;
      var t = setInterval(function () {
        try {
          tick();
        } catch (e) {}
      }, LOOP_MS);
      S.timers.push(t);
      tick();
    } catch (e) {}
  }

  function stopLoop(keep) {
    try {
      for (var i = 0; i < S.timers.length; i += 1) {
        try {
          clearInterval(S.timers[i]);
        } catch (e) {}
      }
      if (!keep) S.timers = [];
      else S.timers = [];
    } catch (e) {}
  }

  function enterSolo(note) {
    try {
      S.mode = "solo";
      S.running = false;
      stopLoop();
      S.soloNote = note || "sign in for multiplayer";
      buildOverlay();
      paintNote();
      paintScore();
    } catch (e) {}
  }

  /* ---------- public API ---------- */

  var api = {
    slug: "unknown",
    seed: "",
    matchId: "",
    mode: "dormant",
    side: "",
    init: function (adapter) {
      try {
        if (adapter) S.adapter = adapter;
        var ad = S.adapter;
        api.side = S.side;
        api.mode = S.mode;
        if (!ad || typeof ad.read !== "function" || typeof ad.render !== "function") return false;
        if (!S.matchId) {
          S.mode = "dormant";
          api.mode = S.mode;
          return false;
        }
        if (S.running) return true;
        S.running = true;
        S.mode = "multi";
        api.mode = S.mode;
        buildOverlay();
        buildEmoteButtons();
        paintScore();
        startLoop();
        try {
          window.addEventListener("pagehide", function () {
            try {
              api.leave();
            } catch (e) {}
          });
        } catch (e) {}
        return true;
      } catch (e) {
        return false;
      }
    },
    sendChat: function (text) {
      try {
        var t = String(text == null ? "" : text).slice(0, 140);
        if (!t) return;
        postEvent("chat", t);
      } catch (e) {}
    },
    sendEmote: function (text) {
      try {
        var t = String(text == null ? "" : text).slice(0, 40);
        if (!t) return;
        postEvent("emote", t);
      } catch (e) {}
    },
    rematch: function () {
      try {
        if (el.rematchBtn) {
          el.rematchBtn.disabled = true;
          el.rematchBtn.textContent = "finding...";
        }
        var platform = S.side === "desktop" ? "desktop" : "phone";
        req("/api/matches", { method: "POST", body: { game_slug: S.slug, platform: platform } }).then(
          function (r) {
            try {
              if (note401(r)) return;
              var id = safe(function () {
                var d = r.data || {};
                return d.match_id || d.id || (d.match && d.match.id) || "";
              }, "");
              if (id && UUID_RE.test(String(id))) {
                var url = safe(function () {
                  var u = new URL(window.location.href);
                  u.searchParams.set("match", String(id));
                  if (S.seed) u.searchParams.set("seed", String(S.seed).slice(0, 40));
                  return u.toString();
                }, "");
                if (url) {
                  window.location.href = url;
                  return;
                }
              }
              if (el.rematchBtn) {
                el.rematchBtn.disabled = false;
                el.rematchBtn.textContent = "rematch";
              }
              pushEvent("note", "no opponent found, try again");
            } catch (e) {}
          }
        );
      } catch (e) {}
    },
    leave: function () {
      try {
        if (S.leavePosted || !S.matchId) return;
        S.leavePosted = true;
        postEvent("leave", (S.side || "player") + " left");
      } catch (e) {}
    }
  };

  function syncPublic() {
    try {
      api.slug = S.slug;
      api.seed = S.seed;
      api.matchId = S.matchId;
      api.mode = S.mode;
      api.side = S.side;
    } catch (e) {}
  }

  /* ---------- adapter auto-load by slug ---------- */

  function injectAdapter(file) {
    try {
      // Adapters live beside their bundle sources (copied next to the
      // served index.html by sync-game-bundles), so prefer the canonical
      // absolute path and fall back to a path relative to the game page.
      // Skip entirely when an adapter already registered (gravegain2d/3d
      // carry their own <script src="mp-*.js"> tag) to avoid double-load.
      try {
        if (window.GraveGainMPAdapter) return;
      } catch (e) {}
      var first = "/games/html/" + S.slug + "/" + file;
      var s = document.createElement("script");
      s.setAttribute("src", first);
      s.setAttribute("data-slug", S.slug);
      s.onerror = function () {
        try {
          var retry = document.createElement("script");
          retry.setAttribute("src", "./" + file);
          retry.setAttribute("data-slug", S.slug);
          (document.head || document.documentElement).appendChild(retry);
        } catch (e) {}
      };
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {}
  }

  function watchForAdapter() {
    try {
      var tries = 0;
      var w = setInterval(function () {
        try {
          tries += 1;
          var ad = null;
          try {
            ad = window.GraveGainMPAdapter;
          } catch (e) {
            ad = null;
          }
          if (ad) {
            try {
              clearInterval(w);
            } catch (e) {}
            api.init(ad);
            return;
          }
          if (tries >= 20) {
            try {
              clearInterval(w);
            } catch (e) {}
          }
        } catch (e) {}
      }, 500);
      S.timers.push(w);
    } catch (e) {}
  }

  /* ---------- boot (dormant unless ?match= present) ---------- */

  try {
    S.slug = detectSlug();
    var mid = queryParam("match");
    if (UUID_RE.test(mid || "")) S.matchId = mid;
    var sd = queryParam("seed");
    if (sd) S.seed = String(sd).slice(0, 40);
    syncPublic();
    try {
      window.GraveGainMP = api;
    } catch (e) {}
    syncPublic();
    var file = ADAPTER_BY_SLUG[S.slug];
    if (file && S.matchId) {
      injectAdapter(file);
      watchForAdapter();
    }
  } catch (e) {
    try {
      window.GraveGainMP = api;
    } catch (ignored) {}
  }
})();
