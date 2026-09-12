/* Battlesharks 2 v2 gameplay tuning overlay (slug: battlesharks2).
 *
 * LOCATION: public/games/html/battlesharks2-tune.js (v2 layer, OUTSIDE the
 * parity-locked battlesharks2/ tree). Injected by reference into the GENERATED
 * bundle only (scripts/sync-game-bundles.mjs, existsSync-guarded). NEVER copy
 * this file into public/games/html/battlesharks2/** and NEVER edit that tree.
 *
 * CONTRACT: vanilla IIFE, no imports, no input listeners (zero input theft —
 * no key/mouse/touch handlers, no default-action suppression, no
 * pointer-event changes).
 * Everything is feature-detected with try/catch; the overlay stays disabled
 * (window.BS2Tune.active === false) when the bundle globals are absent.
 *
 * READ MODEL (bundle truth, game.js — closure-private consts are NOT on
 * window, so the overlay only touches what a classic script exposes):
 *   - window.buyUpgrade / window.spawnAquariumItem (assigned fns — wrappable)
 *   - top-level `function` declarations ARE window properties in classic
 *     scripts, so window.showNotification / window.spawnEnemy /
 *     window.spawnFloatingCollectibles (the prey spawner is deliberately
 *     never referenced, so the food economy stays untouched) /
 *     window.triggerBossAlert / window.destroyEnemy / window.dealPlayerDamage /
 *     window.createExplosion are wrappable/callable when present. Internal
 *     bundle calls resolve through the same global record, so wrappers observe
 *     real events. Every wrap is guarded by typeof checks.
 *   - window.gameDebug { getScore, getHealth } for polling.
 *   - HUD DOM ids (index.html): hudScore, hudBiomass, hudDebris, hudMutagens,
 *     hudHealthText, viewportContainer, gameCanvas, btnOpenLab, startScreen,
 *     gameOverScreen, bossHPBarContainer.
 *   - state/player/boss/enemies arrays are closure-private: the overlay can
 *     neither read positions nor counts. Kill coordinates are therefore
 *     approximated (viewport-anchored floating text); spawn caps are enforced
 *     as RATE caps (drop excess spawn calls per time window), never as census
 *     caps. Pity drops nudge spawnFloatingCollectibles (bundle RNG picks the
 *     type) + toast guidance toward the Lab vent.
 *
 * SYSTEMS:
 *   1. Difficulty ramp governor — score-time tiers rate-cap spawnEnemy calls;
 *      pity mutagen nudge + toast after dry spells.
 *   2. Economy hints — wraps window.buyUpgrade; posts non-destructive DOM
 *      toasts with cost-effectiveness notes. NEVER changes prices (original is
 *      called with exact args; costs mirrored from bundle truth only).
 *   3. Boss director — wraps window.triggerBossAlert for a pre-fight toast;
 *      watches notifications for the bundle's defeat banner, then celebrates
 *      via window.createExplosion bursts (guarded) + DOM banner.
 *   4. Juice — hit-stop filter pulse on kills, kill-combo pill + floating
 *      text, low-HP heartbeat vignette. All pointer-events:none.
 */
(function () {
  "use strict";
  if (window.BS2Tune) return; // idempotent under double-injection

  var VERSION = "1.0.0";
  var POLL_MS = 500;
  var COMBO_WINDOW_MS = 3000;
  var PITY_DRY_MS = 75000;
  var PITY_COOLDOWN_MS = 90000;
  var LOW_HP_FRACTION = 0.3;

  // Mirrors content/battlesharks2-balance.ts + bundle buyUpgrade truth.
  // Read-only hints; bundle prices win on any mismatch.
  var UPGRADE_COSTS = {
    lasers: { debris: 20 },
    thruster: { debris: 30, biomass: 10 },
    shield: { debris: 40, mutagens: 1 },
    missiles: { debris: 50, mutagens: 2 },
    electric: { biomass: 35, mutagens: 1 },
    acid: { biomass: 25, mutagens: 2 },
    scales: { biomass: 50 }
  };
  var UPGRADE_HINTS = {
    lasers: "Best first buy — ranged clear for divers/sentinels.",
    thruster: "Unlocks SPACE dash + shockwave shove. Top mobility value.",
    shield: "Blocks one hit per recharge. Buy before the boss.",
    missiles: "Auto-DPS while you eat. Strongest late-game scaler.",
    electric: "Crowd-control zap. Pairs with aggressive feeding.",
    acid: "Melts high-HP sentinels + boss via damage clouds.",
    scales: "+50 max HP and 25% damage reduction. Tank cornerstone."
  };
  var NEXT_BUY = {
    lasers: "thruster",
    thruster: "scales",
    scales: "electric",
    electric: "shield",
    shield: "acid",
    acid: "missiles",
    missiles: null
  };

  var api = (window.BS2Tune = {
    version: VERSION,
    active: false,
    hooks: {
      buy: false, spawn: false, notify: false, boss: false,
      destroy: false, damage: false
    },
    stats: {
      kills: 0, combo: 0, bestCombo: 0,
      governorDrops: 0, pityFires: 0, bossFights: 0, bossWins: 0
    },
    reset: function () {
      try {
        api.stats.kills = 0; api.stats.combo = 0; api.stats.bestCombo = 0;
        api.stats.governorDrops = 0; api.stats.pityFires = 0;
        hideCombo();
      } catch (e) { /* ignore */ }
    }
  });

  var comboCount = 0;
  var comboTimer = 0;
  var spawnStamps = [];
  var lastMutagenSeen = 0;
  var lastMutagenAmount = -1;
  var lastPityFire = 0;
  var toastBox = null;
  var comboPill = null;
  var vignette = null;

  /* ---------- tiny utils (all guarded) ---------- */

  function $(id) {
    try { return document.getElementById(id); } catch (e) { return null; }
  }

  function num(text, fallback) {
    var n = parseInt(String(text == null ? "" : text).replace(/[^0-9-]/g, ""), 10);
    return isNaN(n) ? fallback : n;
  }

  function isRunning() {
    try {
      var start = $("startScreen");
      var over = $("gameOverScreen");
      var startHidden = !start || start.classList.contains("hidden");
      var overHidden = !over || over.classList.contains("hidden");
      return startHidden && overHidden;
    } catch (e) { return false; }
  }

  function readScore() {
    try {
      if (window.gameDebug && typeof window.gameDebug.getScore === "function") {
        var s = window.gameDebug.getScore();
        if (typeof s === "number" && !isNaN(s)) return s;
      }
    } catch (e) { /* fall through to HUD */ }
    try {
      var el = $("hudScore");
      if (el) return num(el.textContent, 0);
    } catch (e) { /* ignore */ }
    return 0;
  }

  function readHealth() {
    // Returns { hp, max } or null when unreadable.
    try {
      if (window.gameDebug && typeof window.gameDebug.getHealth === "function") {
        var hp = window.gameDebug.getHealth();
        if (typeof hp === "number" && !isNaN(hp)) {
          var max = 100;
          try {
            var hud = $("hudHealthText");
            if (hud) {
              var parts = String(hud.textContent).split("/");
              if (parts.length === 2) {
                var m = num(parts[1], 0);
                if (m > 0) max = m;
              }
            }
          } catch (e2) { /* keep 100 */ }
          return { hp: hp, max: max };
        }
      }
    } catch (e) { /* fall through to HUD */ }
    try {
      var hud2 = $("hudHealthText");
      if (hud2) {
        var p = String(hud2.textContent).split("/");
        if (p.length === 2) {
          var h = num(p[0], -1), mx = num(p[1], 0);
          if (h >= 0 && mx > 0) return { hp: h, max: mx };
        }
      }
    } catch (e2) { /* ignore */ }
    return null;
  }

  function readMutagens() {
    try {
      var el = $("hudMutagens");
      if (el) return num(el.textContent, -1);
    } catch (e) { /* ignore */ }
    return -1;
  }

  function canvasCenter() {
    try {
      var c = $("gameCanvas");
      if (c) {
        var r = c.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  function notifyOriginal(msg) {
    try {
      var fn = window.__bs2OrigNotify;
      if (typeof fn === "function") fn(String(msg));
    } catch (e) { /* overlay never throws into the bundle */ }
  }

  /* ---------- DOM layer (pointer-events:none everywhere) ---------- */

  function ensureCss() {
    try {
      if ($("bs2-tune-css")) return;
      var st = document.createElement("style");
      st.id = "bs2-tune-css";
      st.textContent =
        ".bs2-tune-toasts{position:absolute;left:50%;bottom:64px;transform:translateX(-50%);display:flex;flex-direction:column;gap:6px;align-items:center;z-index:40;pointer-events:none;max-width:92%}" +
        ".bs2-tune-toast{background:rgba(3,3,13,.88);border:1px solid rgba(0,242,254,.45);color:#bdf6ff;font:600 12px/1.4 Orbitron,Inter,sans-serif;padding:7px 12px;border-radius:10px;text-align:center;box-shadow:0 0 14px rgba(0,242,254,.25);animation:bs2ToastIn .18s ease-out}" +
        ".bs2-tune-toast.warn{border-color:rgba(255,59,48,.6);color:#ffd9d4;box-shadow:0 0 14px rgba(255,59,48,.3)}" +
        ".bs2-tune-toast.gold{border-color:rgba(255,235,59,.65);color:#fff3a0;box-shadow:0 0 16px rgba(255,235,59,.3)}" +
        "@keyframes bs2ToastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}" +
        ".bs2-tune-combo{position:absolute;top:54px;left:50%;transform:translateX(-50%);z-index:40;pointer-events:none;background:rgba(20,4,0,.85);border:1px solid rgba(255,149,0,.6);color:#ffcf7a;font:800 15px/1 Orbitron,Inter,sans-serif;padding:8px 16px;border-radius:999px;letter-spacing:.08em;display:none}" +
        ".bs2-tune-float{position:absolute;z-index:40;pointer-events:none;color:#8ef7ff;font:800 14px/1 Orbitron,Inter,sans-serif;text-shadow:0 0 8px rgba(0,242,254,.7);animation:bs2FloatUp 1s ease-out forwards}" +
        "@keyframes bs2FloatUp{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-46px)}}" +
        ".bs2-tune-vignette{position:absolute;inset:0;z-index:35;pointer-events:none;display:none;background:radial-gradient(ellipse at center,transparent 52%,rgba(255,0,30,.42) 100%);animation:bs2Heartbeat 1.1s ease-in-out infinite}" +
        "@keyframes bs2Heartbeat{0%,100%{opacity:.45}12%{opacity:1}24%{opacity:.6}36%{opacity:1}60%{opacity:.45}}" +
        ".bs2-tune-hitstop{filter:brightness(1.55) saturate(1.5)!important}" +
        ".bs2-tune-lab-pulse{animation:bs2LabPulse .8s ease-in-out 4}" +
        "@keyframes bs2LabPulse{0%,100%{box-shadow:0 0 0 rgba(0,242,254,0)}50%{box-shadow:0 0 22px rgba(0,242,254,.9)}}";
      document.head.appendChild(st);
    } catch (e) { /* ignore */ }
  }

  function viewport() {
    try { return $("viewportContainer") || document.body; }
    catch (e) { return document.body; }
  }

  function toast(msg, cls) {
    try {
      var host = viewport();
      if (!toastBox) {
        toastBox = document.createElement("div");
        toastBox.className = "bs2-tune-toasts";
        host.appendChild(toastBox);
      }
      var t = document.createElement("div");
      t.className = "bs2-tune-toast" + (cls ? " " + cls : "");
      t.textContent = String(msg).slice(0, 160);
      toastBox.appendChild(t);
      while (toastBox.children.length > 3) toastBox.removeChild(toastBox.firstChild);
      setTimeout(function () {
        try { if (t.parentNode) t.parentNode.removeChild(t); } catch (e) { /* ignore */ }
      }, 4200);
    } catch (e) { /* ignore */ }
  }

  function showCombo(n) {
    try {
      var host = viewport();
      if (!comboPill) {
        comboPill = document.createElement("div");
        comboPill.className = "bs2-tune-combo";
        host.appendChild(comboPill);
      }
      comboPill.style.display = "block";
      comboPill.textContent = "🔥 x" + n + " COMBO";
    } catch (e) { /* ignore */ }
  }

  function hideCombo() {
    try { if (comboPill) comboPill.style.display = "none"; }
    catch (e) { /* ignore */ }
  }

  function floatText(msg) {
    try {
      var host = viewport();
      var f = document.createElement("div");
      f.className = "bs2-tune-float";
      f.textContent = String(msg).slice(0, 48);
      f.style.left = (38 + Math.random() * 24) + "%";
      f.style.top = "34%";
      host.appendChild(f);
      setTimeout(function () {
        try { if (f.parentNode) f.parentNode.removeChild(f); } catch (e) { /* ignore */ }
      }, 1050);
    } catch (e) { /* ignore */ }
  }

  function hitStop() {
    // Micro hit-stop feel: a ~70ms brightness pulse on the canvas. The bundle
    // owns the rAF loop (closure-private), so the overlay never freezes it —
    // this is a visual impact accent only, and it never touches input.
    try {
      var c = $("gameCanvas");
      if (!c) return;
      c.classList.add("bs2-tune-hitstop");
      setTimeout(function () {
        try { c.classList.remove("bs2-tune-hitstop"); } catch (e) { /* ignore */ }
      }, 70);
    } catch (e) { /* ignore */ }
  }

  function ensureVignette(on) {
    try {
      var host = viewport();
      if (!vignette) {
        vignette = document.createElement("div");
        vignette.className = "bs2-tune-vignette";
        host.appendChild(vignette);
      }
      vignette.style.display = on ? "block" : "none";
    } catch (e) { /* ignore */ }
  }

  function pulseLabButton() {
    try {
      var b = $("btnOpenLab");
      if (!b || b.classList.contains("bs2-tune-lab-pulse")) return;
      b.classList.add("bs2-tune-lab-pulse");
      setTimeout(function () {
        try { b.classList.remove("bs2-tune-lab-pulse"); } catch (e) { /* ignore */ }
      }, 3400);
    } catch (e) { /* ignore */ }
  }

  /* ---------- kill/combo plumbing ---------- */

  function registerKill(label) {
    try {
      var now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
      if (now - comboTimer > COMBO_WINDOW_MS) comboCount = 0;
      comboTimer = now;
      comboCount += 1;
      api.stats.kills += 1;
      api.stats.combo = comboCount;
      if (comboCount > api.stats.bestCombo) api.stats.bestCombo = comboCount;
      if (comboCount >= 2) showCombo(comboCount);
      else hideCombo();
      hitStop();
      if (label) floatText(label + (comboCount >= 2 ? "  x" + comboCount : ""));
    } catch (e) { /* ignore */ }
  }

  function celebrateBossDefeat() {
    // Post-defeat celebration via the bundle's own particle system when
    // available; DOM banner regardless. Coordinates fall back to canvas
    // center because the boss object is closure-private.
    try {
      api.stats.bossWins += 1;
      comboCount = 0; hideCombo();
      var center = canvasCenter();
      try {
        if (typeof window.createExplosion === "function" && center) {
          var c = $("gameCanvas");
          var r = c ? c.getBoundingClientRect() : null;
          for (var i = 0; i < 5; i++) {
            (function (k) {
              setTimeout(function () {
                try {
                  var px = center.x, py = center.y;
                  if (r) {
                    // createExplosion takes canvas-space coords; convert the
                    // client center back using the canvas backing-store scale.
                    var sx = c.width / Math.max(1, r.width);
                    var sy = c.height / Math.max(1, r.height);
                    px = (center.x - r.left) * sx;
                    py = (center.y - r.top) * sy;
                    px += (Math.random() - 0.5) * 160;
                    py += (Math.random() - 0.5) * 120;
                  }
                  var colors = ["#ffeb3b", "#00f2fe", "#ff3b30", "#8b5cf6", "#05f3a2"];
                  window.createExplosion(px, py, colors[k % colors.length], 30);
                } catch (e) { /* ignore */ }
              }, k * 220);
            })(i);
          }
        }
      } catch (e) { /* ignore */ }
      toast("🏆 ROBO-KRAKEN DOWN — Apex Predator! +10,000 score", "gold");
    } catch (e) { /* ignore */ }
  }

  /* ---------- wraps (each defensive + idempotent) ---------- */

  function wrapBuy() {
    try {
      var orig = window.buyUpgrade;
      if (typeof orig !== "function" || orig.__bs2Wrapped) return;
      var wrapped = function (type) {
        var result;
        try { result = orig.apply(this, arguments); }
        catch (e) { result = undefined; }
        try {
          var hint = UPGRADE_HINTS[type];
          if (hint && isRunning()) {
            var next = NEXT_BUY[type];
            var suffix = next
              ? " Next value: " + next + " (" + costText(next) + ")."
              : " Full build — hunt the ROBO-KRAKEN!";
            toast("💡 " + String(type).toUpperCase() + ": " + hint + suffix);
          } else if (!hint && isRunning()) {
            toast("💡 Upgrade installed. Press E anytime to review the Lab.");
          }
        } catch (e2) { /* hints never break purchases */ }
        return result;
      };
      wrapped.__bs2Wrapped = true;
      window.buyUpgrade = wrapped;
      api.hooks.buy = true;
    } catch (e) { /* overlay stays degraded */ }
  }

  function costText(type) {
    try {
      var c = UPGRADE_COSTS[type];
      if (!c) return "see Lab";
      var parts = [];
      if (c.debris) parts.push(c.debris + " ⚙️");
      if (c.biomass) parts.push(c.biomass + " 🧬");
      if (c.mutagens) parts.push(c.mutagens + " 🧪");
      return parts.join(" + ");
    } catch (e) { return "see Lab"; }
  }

  function governorTier(score) {
    // Bundle truth: base difficulty is pinned at 1 (game.js never ramps it),
    // so early-game hunter/mine pressure is flat. The overlay rate-caps
    // spawnEnemy calls per score-time tier instead of touching bundle state.
    if (score >= 3500) return { perMs: 0, label: "boss" }; // pass-through
    if (score >= 2000) return { perMs: 350, label: "mid" };
    if (score >= 800) return { perMs: 700, label: "early+" };
    return { perMs: 2500, label: "grace" }; // first ~800 pts: max 1 threat / 2.5s
  }

  function wrapSpawn() {
    // Rate-cap hunters/mines (spawnEnemy) by score-time tier. Prey and
    // floating pickups are NEVER throttled (economy stays generous).
    try {
      var orig = window.spawnEnemy;
      if (typeof orig !== "function" || orig.__bs2Wrapped) return;
      var wrapped = function () {
        try {
          var tier = governorTier(readScore());
          if (tier.perMs > 0 && isRunning()) {
            var now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
            while (spawnStamps.length && now - spawnStamps[0] > tier.perMs) spawnStamps.shift();
            if (spawnStamps.length >= 1) {
              api.stats.governorDrops += 1;
              return; // drop this threat spawn; prey economy untouched
            }
            spawnStamps.push(now);
            if (spawnStamps.length > 4) spawnStamps.shift();
          }
        } catch (e) { /* governor never breaks spawning */ }
        return orig.apply(this, arguments);
      };
      wrapped.__bs2Wrapped = true;
      window.spawnEnemy = wrapped;
      api.hooks.spawn = true;
    } catch (e) { /* overlay stays degraded */ }
  }

  function wrapNotify() {
    // Single observation point: the bundle routes kills, pickups, shields and
    // the boss-defeat banner through showNotification. The wrapper always
    // calls the original first (bundle visuals win), then drives combo,
    // celebration and pity bookkeeping.
    try {
      var orig = window.showNotification;
      if (typeof orig !== "function" || orig.__bs2Wrapped) return;
      window.__bs2OrigNotify = orig;
      var wrapped = function (msg) {
        try { orig.apply(this, arguments); }
        catch (e) { /* bundle visual already attempted */ }
        try {
          var text = String(msg == null ? "" : msg);
          if (/ROBO-KRAKEN DESTROYED/i.test(text)) { celebrateBossDefeat(); return; }
          if (/DEVOUR ENEMY/i.test(text)) { registerKill("🦈 DEVOUR"); return; }
          if (/MUTAGEN.*RECOVERED/i.test(text)) {
            registerKill("+1 🧪");
            lastMutagenSeen = Date.now();
            return;
          }
          if (/^\+Mutagen/i.test(text)) { lastMutagenSeen = Date.now(); return; }
          if (/SHARK MUTATED TO LEVEL/i.test(text)) {
            floatText("📈 LEVEL UP");
            hitStop();
          }
        } catch (e2) { /* observation never breaks the bundle */ }
      };
      wrapped.__bs2Wrapped = true;
      window.showNotification = wrapped;
      api.hooks.notify = true;
    } catch (e) { /* overlay stays degraded */ }
  }

  function wrapBoss() {
    try {
      var orig = window.triggerBossAlert;
      if (typeof orig !== "function" || orig.__bs2Wrapped) return;
      var wrapped = function () {
        try {
          if (isRunning()) {
            api.stats.bossFights += 1;
            toast("⚠️ ROBO-KRAKEN INBOUND — shield up, save HP, keep missiles firing!", "warn");
            try {
              if (typeof window.showNotification === "function") {
                window.showNotification("⚠️ CRITICAL THREAT: ROBO-KRAKEN BS-BOSS");
              }
            } catch (e2) { /* toast already delivered */ }
          }
        } catch (e) { /* director never breaks the alert */ }
        return orig.apply(this, arguments);
      };
      wrapped.__bs2Wrapped = true;
      window.triggerBossAlert = wrapped;
      api.hooks.boss = true;
    } catch (e) { /* overlay stays degraded */ }
  }

  function wrapDestroy() {
    // destroyEnemy is the precise kill signal (bundle also notifies, so the
    // combo path is deduped by the COMBO window, not by source).
    try {
      var orig = window.destroyEnemy;
      if (typeof orig !== "function" || orig.__bs2Wrapped) return;
      var wrapped = function () {
        var r;
        try { r = orig.apply(this, arguments); }
        catch (e) { r = undefined; }
        try { if (isRunning()) registerKill("💥 KILL"); } catch (e2) { /* ignore */ }
        return r;
      };
      wrapped.__bs2Wrapped = true;
      window.destroyEnemy = wrapped;
      api.hooks.destroy = true;
    } catch (e) { /* overlay stays degraded */ }
  }

  function wrapDamage() {
    // Low-HP feedback trigger: a heartbeat is driven by the poll loop, this
    // hook just adds an immediate vignette flash on heavy hits.
    try {
      var orig = window.dealPlayerDamage;
      if (typeof orig !== "function" || orig.__bs2Wrapped) return;
      var wrapped = function (amount) {
        var r;
        try { r = orig.apply(this, arguments); }
        catch (e) { r = undefined; }
        try {
          var h = readHealth();
          if (h && h.hp / Math.max(1, h.max) < LOW_HP_FRACTION) ensureVignette(true);
        } catch (e2) { /* ignore */ }
        return r;
      };
      wrapped.__bs2Wrapped = true;
      window.dealPlayerDamage = wrapped;
      api.hooks.damage = true;
    } catch (e) { /* overlay stays degraded */ }
  }

  /* ---------- passive poll loop (no input listeners) ---------- */

  function poll() {
    try {
      if (!api.active) return;
      // Combo expiry.
      try {
        var now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
        if (comboCount > 0 && now - comboTimer > COMBO_WINDOW_MS) {
          comboCount = 0; hideCombo();
        }
      } catch (e) { /* ignore */ }
      // Low-HP heartbeat vignette.
      try {
        var h = readHealth();
        ensureVignette(!!(h && isRunning() && h.hp / Math.max(1, h.max) < LOW_HP_FRACTION));
      } catch (e) { /* ignore */ }
      // Pity mutagen: track HUD mutagen gains; on dry spells nudge + advise.
      try {
        var m = readMutagens();
        var t = Date.now();
        if (m >= 0 && m !== lastMutagenAmount) {
          lastMutagenAmount = m;
          lastMutagenSeen = t;
        }
        if (lastMutagenSeen === 0) lastMutagenSeen = t;
        if (isRunning() && m >= 0 && t - lastMutagenSeen > PITY_DRY_MS && t - lastPityFire > PITY_COOLDOWN_MS) {
          lastPityFire = t;
          api.stats.pityFires += 1;
          try {
            if (typeof window.spawnFloatingCollectibles === "function") {
              window.spawnFloatingCollectibles();
              window.spawnFloatingCollectibles();
            }
          } catch (e2) { /* nudge is best-effort; toast still helps */ }
          toast("🧪 Mutagen dry spell — deploy a Hydrothermal Vent from the Lab [E] for steady 🧪.");
          pulseLabButton();
        }
      } catch (e) { /* ignore */ }
    } catch (e) { /* poll never throws */ }
  }

  /* ---------- boot (deferred until bundle globals exist) ---------- */

  function boot() {
    try {
      var ready =
        typeof window.buyUpgrade === "function" ||
        typeof window.spawnAquariumItem === "function" ||
        typeof window.showNotification === "function" ||
        typeof window.spawnEnemy === "function" ||
        (window.gameDebug && typeof window.gameDebug.getScore === "function");
      if (!ready) return false;
      ensureCss();
      wrapBuy();
      wrapSpawn();
      wrapNotify();
      wrapBoss();
      wrapDestroy();
      wrapDamage();
      if (!api.hooks.buy && !api.hooks.spawn && !api.hooks.notify &&
          !api.hooks.boss && !api.hooks.destroy && !api.hooks.damage) {
        return false; // nothing hookable — stay disabled
      }
      api.active = true;
      lastMutagenSeen = Date.now();
      setInterval(poll, POLL_MS);
      return true;
    } catch (e) { return false; }
  }

  function bootWithRetry(attempts) {
    try {
      if (boot()) return;
      if (attempts > 0) {
        setTimeout(function () { bootWithRetry(attempts - 1); }, 1000);
      }
    } catch (e) { /* overlay stays disabled */ }
  }

  try {
    if (!boot()) {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () { bootWithRetry(5); });
      } else {
        bootWithRetry(5);
      }
    }
  } catch (e) { /* overlay stays disabled */ }
}());
