/**
 * Last Words Zombies — per-game content-mode gore layer (V2 only).
 *
 * Lives OUTSIDE the parity-locked bundle: never edit
 * public/games/html/lastwordszombies/**. This file is injected into the
 * generated canonical bundle (/games/lastwordszombies/) by
 * scripts/sync-game-bundles.mjs and references the absolute canonical path
 * /games/html/gore-lastwordszombies.js, same as game-meta.js.
 *
 * Contract (shared infra: lib/content-modes.ts + content-mode-bridge.js,
 * both present — verified this session, mirrors gore-gravegain2d.js):
 *   - mode input: window.FourweirdContentMode = { mode, slug, goreEnabled,
 *     drugsAllowed, sanitize, filterNpcLine }; "?content=" query param, then
 *     localStorage "4weird-content-mode:lastwordszombies". Default: "teen"
 *     (matches defaultContentMode(); safe default, gore ON).
 *   - load order: this file is injected BEFORE content-mode-bridge.js, so the
 *     bridge's init "fourweird-content-mode" dispatch (detail { slug, mode,
 *     goreEnabled, drugsAllowed }) converges the mode via the listener below.
 *   - shared gore: window.FourweirdGore.spawn(x, y, opts) when present
 *     (positional — undefined coords burst at viewport center; kid mode draws
 *     sparkles, blood:false is a no-op); every call site is guarded.
 *
 * Hooks (all feature-detected, all wrapped in try/catch, game logic never
 * touched — only cosmetic particle/DOM effects):
 *   - kill/banish: wraps ParticleManager.prototype.spawnExplosion.
 *       teen|all: original burst PLUS extra red/green zombie-blood/ichor burst,
 *                 breach sparks, vignette flicker + tiny camera-shake flicker.
 *       kid:      original blood burst is SKIPPED; kills are "reboots" —
 *                 celebration bubbles + floating "+1 FRIEND SAVED" text.
  *   - kill text: wraps TypingController.prototype.triggerExplosion to add the
  *     kid "+1 FRIEND SAVED" sleeper text after the original scoring runs.
  *   - kid dictionary: in-place patch of the bundle's SHORT/MID/LONG_WORDS
  *     spawn lists (same array references the spawner reads per spawn, so
  *     already-running games converge without a reload) + additive
  *     WORD_DEFINITIONS entries for the kid words. Mirrors filterWords /
  *     kidWordList in content/lastwordszombies-modes.ts; teen/all restore
  *     the stashed bundle originals untouched. Re-applied on every setMode.
  *   - breach: MutationObserver on #health-bar-fill (width shrink == a unit
 *     crossed BREACH_LINE; damage only comes from breaches). teen|all leaves
 *     scorch decals; kid leaves "nap" pills ("breaches are naps").
 *
 * Exposes window.LastWordsGore. Graceful degradation: if THREE, the particle
 * classes, or the game itself are missing, only DOM/CSS effects run and
 * nothing throws.
 */
(function () {
  "use strict";

  var SLUG = "lastwordszombies";
  var VERSION = 1;

  var MODES = ["kid", "teen", "all"];

  function normalizeMode(value) {
    var v = null;
    try {
      if (typeof value === "string") v = value;
      else if (value && typeof value.mode === "string") v = value.mode;
      else if (value && typeof value.detail !== "undefined") return normalizeMode(value.detail);
    } catch (e) { v = null; }
    if (typeof v === "string") {
      v = v.toLowerCase().trim();
      if (v === "child" || v === "kids") v = "kid";
      if (v === "adult" || v === "mature" || v === "uncensored") v = "all";
      if (MODES.indexOf(v) !== -1) return v;
    }
    return null;
  }

  function readInitialMode() {
    // 1. Explicit host-provided global (shared contract: object, never bare).
    try {
      var g = window.FourweirdContentMode;
      var m = normalizeMode(g);
      if (m) return m;
    } catch (e) { /* ignore */ }
    // 2. Query param (canonical "?content=", legacy "?mode=" fallback).
    try {
      var params = new URLSearchParams(window.location.search);
      var qm = normalizeMode(params.get("content")) || normalizeMode(params.get("mode"));
      if (qm) return qm;
    } catch (e) { /* URLSearchParams may be unavailable */ }
    // 3. Persisted choice (canonical per-slug key, legacy fallback).
    try {
      var store = window.localStorage;
      var sm = store && (normalizeMode(store.getItem("4weird-content-mode:" + SLUG)) ||
        normalizeMode(store.getItem("fourweird-content-mode")));
      if (sm) return sm;
    } catch (e) { /* storage unavailable */ }
    // 4. Parent frame hint (canonical bundle runs in the play-shell iframe).
    try {
      if (document.referrer) {
        var rparams = new URL(document.referrer, window.location.href).searchParams;
        var rm = normalizeMode(rparams.get("content")) || normalizeMode(rparams.get("mode"));
        if (rm) return rm;
      }
    } catch (e) { /* ignore */ }
    // Shared safe default (defaultContentMode()): teen. The bridge dispatches
    // its init event on load and converges this via the listener below.
    return "teen";
  }

  var mode = readInitialMode();

  function isKid() { return mode === "kid"; }
  function isBloody() { return mode === "teen" || mode === "all"; }

  /* ---------- tiny DOM helpers ---------- */

  function $(id) {
    try { return document.getElementById(id); } catch (e) { return null; }
  }

  function gameFrame() {
    try {
      return document.querySelector(".TEMPLATE-4weird-game-frame") || document.body;
    } catch (e) { return document.body; }
  }

  function ensureCss() {
    try {
      if (document.getElementById("lwz-gore-style")) return;
      var style = document.createElement("style");
      style.id = "lwz-gore-style";
      style.textContent =
        ".lwz-scorch{position:absolute;width:90px;height:34px;border-radius:50%;" +
        "background:radial-gradient(ellipse at center,rgba(0,0,0,.85) 0%,rgba(120,10,10,.45) 55%,transparent 70%);" +
        "pointer-events:none;z-index:5;opacity:.9;transition:opacity 20s linear}" +
        ".lwz-nap{position:absolute;padding:4px 10px;border-radius:999px;font-family:Orbitron,monospace;" +
        "font-size:11px;letter-spacing:1px;color:#bff3ff;background:rgba(20,40,80,.75);" +
        "border:1px solid rgba(125,249,255,.6);pointer-events:none;z-index:5;opacity:.95;" +
        "transition:opacity 8s linear}" +
        ".lwz-float{position:absolute;font-family:Orbitron,monospace;font-weight:900;" +
        "pointer-events:none;z-index:6;transition:transform 1.4s ease-out,opacity 1.4s ease-out}";
      (document.head || document.documentElement).appendChild(style);
    } catch (e) { /* CSS is best-effort */ }
  }

  // Optional shared-infra gore bus. Positional spawn(x, y, opts) per the
  // bridge contract; undefined coords burst at viewport center. Never throws,
  // never required.
  function sharedSpawn(kind) {
    try {
      if (window.FourweirdGore && typeof window.FourweirdGore.spawn === "function") {
        var opts = { count: 10 };
        if (kind === "blood") opts = { count: 18 };
        if (kind === "bubble" || kind === "nap") { opts = { count: 16, sparkle: true }; }
        window.FourweirdGore.spawn(undefined, undefined, opts);
        return true;
      }
    } catch (e) { /* cosmetic only */ }
    return false;
  }

  function vignetteFlicker(color, peak) {
    try {
      var v = $("damage-vignette");
      if (!v) return;
      v.style.background = "radial-gradient(ellipse at center, transparent 55%, " + color + " 100%)";
      v.style.transition = "none";
      v.style.opacity = String(peak);
      window.setTimeout(function () {
        try {
          v.style.transition = "opacity .5s ease-out";
          v.style.opacity = "0";
        } catch (e) { /* ignore */ }
      }, 90);
    } catch (e) { /* cosmetic only */ }
  }

  function shakeFlicker(intensity) {
    try {
      if (window.game && typeof window.game.triggerCameraShake === "function") {
        window.game.triggerCameraShake(intensity);
      }
    } catch (e) { /* cosmetic only */ }
  }

  /* ---------- decals (breach aftermath) ---------- */

  var decalCount = 0;
  var MAX_DECALS = 12;

  function randomFramePos() {
    var frame = gameFrame();
    var w = 600, h = 300;
    try {
      var r = frame.getBoundingClientRect ? frame.getBoundingClientRect() : null;
      if (r && r.width > 50) { w = r.width; h = r.height; }
    } catch (e) { /* fallback sizes */ }
    return {
      x: Math.floor(40 + Math.random() * Math.max(60, w - 130)),
      y: Math.floor(60 + Math.random() * Math.max(60, h - 140))
    };
  }

  function addDecal(el, ttlMs, fadeMs) {
    try {
      var frame = gameFrame();
      if (!frame || frame === document.body) {
        // Body fallback: fixed positioning so it still renders.
        el.style.position = "fixed";
      }
      var pos = randomFramePos();
      el.style.left = pos.x + "px";
      el.style.top = pos.y + "px";
      frame.appendChild(el);
      decalCount += 1;
      window.setTimeout(function () { try { el.style.opacity = "0"; } catch (e) {} }, Math.max(0, ttlMs - fadeMs));
      window.setTimeout(function () {
        try { if (el.parentNode) el.parentNode.removeChild(el); } catch (e) {}
        decalCount = Math.max(0, decalCount - 1);
      }, ttlMs);
      // Hard cap: pop the oldest decal first.
      if (decalCount > MAX_DECALS) {
        try {
          var old = frame.querySelector(".lwz-scorch, .lwz-nap");
          if (old && old.parentNode) { old.parentNode.removeChild(old); decalCount -= 1; }
        } catch (e) { /* ignore */ }
      }
    } catch (e) { /* cosmetic only */ }
  }

  function scorchDecal() {
    try {
      ensureCss();
      var el = document.createElement("div");
      el.className = "lwz-scorch";
      el.setAttribute("aria-hidden", "true");
      addDecal(el, 25000, 20000);
      sharedSpawn("scorch");
    } catch (e) { /* cosmetic only */ }
  }

  function napDecal() {
    try {
      ensureCss();
      var el = document.createElement("div");
      el.className = "lwz-nap";
      el.setAttribute("aria-hidden", "true");
      el.textContent = "\uD83D\uDCA4 nap time…";
      addDecal(el, 10000, 8000);
      sharedSpawn("nap");
    } catch (e) { /* cosmetic only */ }
  }

  // DOM fallback float text (used when THREE/floaters are unavailable,
  // and always in kid mode as the "+1 FRIEND SAVED" carrier).
  function domFloatText(text, color) {
    try {
      ensureCss();
      var frame = gameFrame();
      var el = document.createElement("div");
      el.className = "lwz-float";
      el.setAttribute("aria-hidden", "true");
      el.textContent = text;
      el.style.color = color;
      el.style.textShadow = "0 0 12px " + color;
      var pos = randomFramePos();
      el.style.left = pos.x + "px";
      el.style.top = pos.y + "px";
      frame.appendChild(el);
      window.setTimeout(function () {
        try { el.style.transform = "translateY(-46px)"; el.style.opacity = "0"; } catch (e) {}
      }, 30);
      window.setTimeout(function () {
        try { if (el.parentNode) el.parentNode.removeChild(el); } catch (e) {}
      }, 1600);
    } catch (e) { /* cosmetic only */ }
  }

  /* ---------- kill/decrypt hooks ---------- */

  var hooks = { explosion: false, killText: false, breach: false };
  var killCount = 0;

  function globalOf(name) {
    // Classic scripts declare classes as global lexical bindings, not
    // window props — resolve by name without throwing on missing.
    try {
      /* eslint-disable-next-line no-eval */
      var v = (typeof window !== "undefined" && window[name]) || Function("return typeof " + name + "!==" + "undefined" + "?" + name + ":undefined")();
      return v;
    } catch (e) { return undefined; }
  }

  function hookExplosions() {
    try {
      var PM = globalOf("ParticleManager");
      if (!PM || !PM.prototype || typeof PM.prototype.spawnExplosion !== "function") return false;
      if (PM.prototype.__lwzGoreWrapped) { hooks.explosion = true; return true; }
      var original = PM.prototype.spawnExplosion;
      PM.prototype.spawnExplosion = function (position, colorName) {
        if (isKid()) {
          // NO blood in kid mode: the unit "reboots" into a sleepy friend.
          try {
            if (typeof this.spawnCelebration === "function" && position) {
              this.spawnCelebration(position.clone ? position.clone() : position);
            }
          } catch (e) { /* fall through to DOM fallback */ }
          try {
            var at = position && position.clone ? position.clone() : null;
            if (at && typeof this.spawnFloatingText === "function") {
              var THREE3 = globalOf("THREE");
              var up = (THREE3 && at.add) ? at.add(new THREE3.Vector3(0, 1.4, 0)) : at;
              this.spawnFloatingText(up, "+1 FRIEND SAVED", "#7df9ff", false);
            } else {
              domFloatText("\uD83D\uDCA4 +1 FRIEND SAVED", "#7df9ff");
            }
          } catch (e) { domFloatText("\uD83D\uDCA4 +1 FRIEND SAVED", "#7df9ff"); }
          sharedSpawn("bubble");
          return;
        }
        // teen|all: blood ON — original cyber-blood burst first.
        original.call(this, position, colorName);
        try {
          killCount += 1;
          // Extra gore: second red burst + white breach sparks, pushed
          // straight into the manager so ultraParticles setting is honored
          // by trim() caps. Particle is global-scope in particles.js.
          var Particle = globalOf("Particle");
          var THREE2 = globalOf("THREE");
          if (Particle && THREE2 && position && this.particles) {
            var colors = mode === "all"
              ? ["#ff174d", "#ff0055", "#00ff66"]
              : ["#ff6b6b", "#00ff66"];
            for (var i = 0; i < 12; i++) {
              var p = new Particle(
                this.scene,
                position.clone ? position.clone() : position,
                colors[i % colors.length],
                new THREE2.Vector3((Math.random() - 0.5) * 9, 3 + Math.random() * 7, (Math.random() - 0.5) * 9),
                0.07 + Math.random() * 0.12,
                1.0 + Math.random()
              );
              this.particles.push(p);
            }
            // Breach sparks: hot white flecks shooting upward.
            for (var s = 0; s < 6; s++) {
              this.particles.push(new Particle(
                this.scene,
                position.clone ? position.clone() : position,
                "#ffffff",
                new THREE2.Vector3((Math.random() - 0.5) * 10, 5 + Math.random() * 8, (Math.random() - 0.5) * 10),
                0.04 + Math.random() * 0.05,
                1.8 + Math.random()
              ));
            }
          }
        } catch (e) { /* extra gore is best-effort */ }
        vignetteFlicker(mode === "all" ? "rgba(255,23,77,.55)" : "rgba(255,107,107,.4)", 0.35);
        shakeFlicker(0.12);
        sharedSpawn("blood");
      };
      PM.prototype.__lwzGoreWrapped = true;
      hooks.explosion = true;
      return true;
    } catch (e) { return false; }
  }

  function hookKillText() {
    try {
      var TC = globalOf("TypingController");
      if (!TC || !TC.prototype || typeof TC.prototype.triggerExplosion !== "function") return false;
      if (TC.prototype.__lwzGoreWrapped) { hooks.killText = true; return true; }
      var original = TC.prototype.triggerExplosion;
      TC.prototype.triggerExplosion = function (zombie, zombies) {
        original.call(this, zombie, zombies);
        // Kid "reboot" caption rides on top of the normal score pop —
        // scoring/coins/streak logic in the original is untouched.
        if (!isKid()) return;
        try {
          var pos = null;
          if (zombie && zombie.group && zombie.group.position && zombie.group.position.clone) {
            pos = zombie.group.position.clone();
            var THREE = globalOf("THREE");
            if (THREE) pos.add(new THREE.Vector3(0, 2.1, 0));
          }
          if (pos && this.particles && typeof this.particles.spawnFloatingText === "function") {
            this.particles.spawnFloatingText(pos, "\uD83D\uDCA4 +1 FRIEND SAVED", "#7df9ff", false);
          } else {
            domFloatText("\uD83D\uDCA4 +1 FRIEND SAVED", "#7df9ff");
          }
        } catch (e) { /* caption is cosmetic */ }
      };
      TC.prototype.__lwzGoreWrapped = true;
      hooks.killText = true;
      return true;
    } catch (e) { return false; }
  }

  /* ---------- kid dictionary patch (word-list swap) ---------- */
  //
  // Mirrors filterWords + kidWordList in
  // content/lastwordszombies-modes.ts (that module is the TS source of
  // truth; this vanilla layer duplicates the data because classic scripts
  // share one realm and take no imports). In-place only: the bundle
  // declares these as const globals, so reassignment would throw — the
  // spawner reads the same array references per spawn, making the swap
  // (and restore) live with no reload and no game-logic edits.

  // Keep in sync with kidWordList in content/lastwordszombies-modes.ts.
  var KID_WORDS = [
    "cat", "dog", "fox", "owl", "bear", "frog", "duck", "fish",
    "lion", "tiger", "zebra", "panda", "koala", "mouse", "bunny", "puppy",
    "kitty", "sheep", "horse", "whale", "shark", "eagle", "snake", "lizard",
    "red", "blue", "green", "pink", "purple", "yellow", "orange", "teal",
    "apple", "berry", "grape", "lemon", "melon", "peach", "mango", "plum",
    "star", "moon", "cloud", "rain", "sunny", "snowy", "breeze", "comet",
    "ghost", "crypt", "bubble", "candy", "cuddle", "giggle", "jammie", "nap"
  ];

  // Keep in sync with KID_BLOCKED in content/lastwordszombies-modes.ts.
  var KID_BLOCKED_LIST = [
    "die", "gun", "kill", "blood", "murder", "weapon", "hell", "damn",
    "annihilation", "apocalyptic", "biohazard", "malware", "catastrophic"
  ];

  var wordsStashed = false;
  var savedLists = { short: null, mid: null, long: null };

  function isKidBlocked(word) {
    try {
      var w = String(word).toLowerCase();
      for (var i = 0; i < KID_BLOCKED_LIST.length; i += 1) {
        if (w === KID_BLOCKED_LIST[i]) return true;
      }
    } catch (e) { /* treat uncheckable as blocked below */ return true; }
    return false;
  }

  function swapInPlace(arr, src) {
    arr.length = 0;
    for (var i = 0; i < src.length; i += 1) arr.push(src[i]);
  }

  // Same-realm application of the TS filterWords rule: kid gets kidWordList
  // plus any bundle word that is short, lowercase, alphabetic and unblocked;
  // teen/all get the stashed bundle originals restored verbatim.
  function applyWordLists() {
    try {
      var SHORT = globalOf("SHORT_WORDS");
      var MID = globalOf("MID_WORDS");
      var LONG = globalOf("LONG_WORDS");
      var DEFS = globalOf("WORD_DEFINITIONS");
      if (!SHORT || !MID || !LONG ||
          typeof SHORT.length !== "number" ||
          typeof MID.length !== "number" ||
          typeof LONG.length !== "number") return false;
      if (!wordsStashed) {
        try {
          savedLists.short = SHORT.slice();
          savedLists.mid = MID.slice();
          savedLists.long = LONG.slice();
        } catch (e) { return false; }
        // Additive only: teen/all lookups never see a changed entry.
        try {
          if (DEFS && typeof DEFS === "object") {
            for (var d = 0; d < KID_WORDS.length; d += 1) {
              var kw = KID_WORDS[d];
              if (!DEFS[kw]) {
                DEFS[kw] = [
                  "n. A sleepy herd word — type it to tuck a wobbly zombie into its crypt nap. 🧟",
                  "n. A cozy word from the Friendly Zombie Roundup."
                ];
              }
            }
          }
        } catch (e) { /* definitions are best-effort; the lookup falls back */ }
        wordsStashed = true;
      }
      if (isKid()) {
        var seen = {};
        var merged = [];
        var k;
        for (k = 0; k < KID_WORDS.length; k += 1) {
          if (!seen[KID_WORDS[k]]) { seen[KID_WORDS[k]] = true; merged.push(KID_WORDS[k]); }
        }
        var bundle = savedLists.short.concat(savedLists.mid, savedLists.long);
        for (var b = 0; b < bundle.length; b += 1) {
          var w = bundle[b];
          if (typeof w !== "string" || w.length === 0 || w.length > 5) continue;
          if (!/^[a-z]+$/.test(w)) continue;
          var lw = w.toLowerCase();
          if (isKidBlocked(lw) || seen[lw]) continue;
          seen[lw] = true;
          merged.push(lw);
        }
        if (merged.length === 0) return false;
        swapInPlace(SHORT, merged);
        swapInPlace(MID, merged);
        swapInPlace(LONG, merged);
      } else {
        swapInPlace(SHORT, savedLists.short);
        swapInPlace(MID, savedLists.mid);
        swapInPlace(LONG, savedLists.long);
      }
      hooks.words = true;
      return true;
    } catch (e) { return false; }
  }

  /* ---------- breach hook (health-bar shrink observer) ---------- */

  var lastHealthWidth = null;

  function parseWidthPct(el) {
    try {
      var w = (el.style && el.style.width) || "";
      var n = parseFloat(String(w).replace("%", ""));
      return isFinite(n) ? n : null;
    } catch (e) { return null; }
  }

  function onBreach() {
    if (isKid()) {
      napDecal();
      vignetteFlicker("rgba(125,249,255,.35)", 0.3);
    } else {
      scorchDecal();
      vignetteFlicker("rgba(255,23,77,.5)", 0.45);
      shakeFlicker(0.15);
    }
    sharedSpawn("breach");
  }

  function hookBreach() {
    try {
      var bar = $("health-bar-fill");
      if (!bar) return false;
      if (lastHealthWidth === null) lastHealthWidth = parseWidthPct(bar);
      if (typeof MutationObserver === "undefined") {
        // Fallback: 1s poll. Cheap, self-correcting, cleaned up on unload.
        if (!hookBreach._poll) {
          hookBreach._poll = window.setInterval(function () {
            try {
              var b = $("health-bar-fill");
              if (!b) return;
              var w = parseWidthPct(b);
              if (w !== null && lastHealthWidth !== null && w < lastHealthWidth - 0.5) onBreach();
              if (w !== null) lastHealthWidth = w;
            } catch (e) { /* ignore */ }
          }, 1000);
          try {
            window.addEventListener("pagehide", function () { window.clearInterval(hookBreach._poll); });
          } catch (e) { /* ignore */ }
        }
        hooks.breach = true;
        return true;
      }
      if (bar.__lwzGoreObserved) { hooks.breach = true; return true; }
      var obs = new MutationObserver(function () {
        try {
          var w = parseWidthPct(bar);
          if (w !== null && lastHealthWidth !== null && w < lastHealthWidth - 0.5) onBreach();
          if (w !== null) lastHealthWidth = w;
        } catch (e) { /* ignore */ }
      });
      obs.observe(bar, { attributes: true, attributeFilter: ["style"] });
      bar.__lwzGoreObserved = true;
      hooks.breach = true;
      return true;
    } catch (e) { return false; }
  }

  function hookAll() {
    var ok = true;
    try { hookExplosions(); } catch (e) { ok = false; }
    try { hookKillText(); } catch (e) { ok = false; }
    try { hookBreach(); } catch (e) { ok = false; }
    try { applyWordLists(); } catch (e) { ok = false; }
    return ok && hooks.explosion && hooks.killText && hooks.breach && hooks.words;
  }

  // Game scripts load before this file, but retry briefly in case of slow
  // CDN (THREE) or deferred init — stops after ~10s, hooks stay best-effort.
  function retryHooks() {
    var tries = 0;
    var timer = window.setInterval(function () {
      tries += 1;
      var done = false;
      try { done = hookAll(); } catch (e) { done = false; }
      if (done || tries >= 20) window.clearInterval(timer);
    }, 500);
  }

  /* ---------- public API ---------- */

  function setMode(next) {
    var m = normalizeMode(next);
    if (!m || m === mode) return mode;
    mode = m;
    try {
      if (window.localStorage) window.localStorage.setItem("4weird-content-mode:" + SLUG, m);
    } catch (e) { /* storage unavailable */ }
    // Live switch: swap (kid) or restore (teen/all) the spawn word lists so
    // the running game converges without a reload.
    try { applyWordLists(); } catch (e) { /* next retry converges */ }
    return mode;
  }

  try {
    window.addEventListener("fourweird-content-mode", function (e) { setMode(e); });
  } catch (e) { /* CustomEvent unsupported */ }

  try { hookAll(); } catch (e) { /* retried below */ }
  try { retryHooks(); } catch (e) { /* hooks stay best-effort */ }
  try { ensureCss(); } catch (e) { /* ignore */ }

  window.LastWordsGore = {
    slug: SLUG,
    version: VERSION,
    getMode: function () { return mode; },
    setMode: setMode,
    getKills: function () { return killCount; },
    getDecals: function () { return decalCount; },
    hooks: hooks,
    // Test/bridge seam: re-apply the word-list swap/restore for the current
    // mode without game state (kid swaps in, teen/all restore).
    resyncWords: applyWordLists,
    // Test/bridge seam: force a breach visual without game state.
    previewBreach: onBreach
  };
})();
