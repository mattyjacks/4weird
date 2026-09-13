/* GraveGain2D endless-dungeon expansion (v2-native, parity-safe).
 *
 * Lives OUTSIDE parity-locked bundles:
 *   public/games/html/gravegain2d-endless.js
 * injected into the generated runtime copy by scripts/sync-game-bundles.mjs
 * (wiring lane owns that script — this file never edits parity trees).
 *
 * What it does (advisory-only, never rewrites game logic):
 *   - Floor mutators: each endless depth rolls 1-2 mutators (darkness, swarm,
 *     gold-curse, chrono-storm, blood-moon, thin-air, mimic-veins, necro-surge)
 *     surfaced as an overlay banner + `current()` descriptor. Same mechanics
 *     every age band; only words differ (kid = cozy, teen = tense-clean,
 *     all = grim, ≤1 strong word per string).
 *   - Depth scaling curves: extends the bundle's own math
 *     (buildDungeonLayer: diffScale = 1.0 + floorIndex * 0.15;
 *     populateMissionTargets: 1 + floorIndex * 0.1) past the story range with
 *     soft caps so floors 20+ stay hard but finite.
 *   - Endless boss rotation: cycles the three bundle bosses
 *     (Human Zed / Huge Orc Zed / Elven Necromancer) with a deterministic
 *     depth-seeded order + variant tag hooks for the bestiary lane.
 *   - Sibling hooks: registers with window.GraveGainEvents / GraveGainSidequests
 *     (or GraveGainEmergent), GraveGainLoot (or GraveGainArsenal), GraveGainBestiary
 *     (or GraveGainEnemies) when present; every hook is feature-detected,
 *     try/catch-guarded, and skipped silently when the sibling is absent.
 *
 * Contract: vanilla IIFE, no deps, never throws, idempotent
 * (`if (window.GraveGain2DEndless) return`), throttled poll (~1Hz), pauses
 * when `document.hidden`. No gore spawned here (gore lanes own visuals), no
 * drugs logic (agebands lane owns botany gating).
 */
(function () {
  "use strict";
  if (window.GraveGain2DEndless) return; // idempotent under double-injection

  var VERSION = "1.0.0";

  // ---------- age-band mode (contract: ?content= > storage > global > event) ----------
  var SLUG = "gravegain2d";
  function resolveMode() {
    try {
      var q = new URLSearchParams(window.location.search).get("content");
      if (q === "kid" || q === "teen" || q === "all") return q;
    } catch (_) { /* ignore */ }
    try {
      var stored = window.localStorage.getItem("4weird-content-mode:" + SLUG) ||
        window.localStorage.getItem("FourweirdContentMode");
      if (stored === "kid" || stored === "teen" || stored === "all") return stored;
    } catch (_) { /* ignore */ }
    try {
      var g = window.FourweirdContentMode;
      if (g && (g.mode === "kid" || g.mode === "teen" || g.mode === "all")) return g.mode;
    } catch (_) { /* ignore */ }
    return "teen"; // fail-closed default per mode contract
  }

  // ---------- floor mutators ----------
  // effect: short machine-readable tag consumed by wiring/QA.
  // desc: age-banded flavor, one line each. Kid = cozy, teen = tense-clean,
  // all = grim (≤1 strong word per string, never aimed at the player).
  var MUTATORS = [
    { id: "darkness", name: "Deep Dark",
      effect: "vision-radius-down",
      desc: {
        kid: "The halls are extra sleepy-dark — keep your night-light close!",
        teen: "Lights out below. Watch the corners and keep your lamp lit.",
        all: "The dark down here is thick as grave-soil. Keep your lamp lit, damn it." } },
    { id: "swarm", name: "Swarm Surge",
      effect: "enemy-density-up",
      desc: {
        kid: "So many grumbly buddies came to play — gentle bonks for everyone!",
        teen: "Movement in the vents. They are coming in numbers — hold the line.",
        all: "They are pouring out of the walls. Put every last bastard back down." } },
    { id: "gold-curse", name: "Gold Curse",
      effect: "loot-up-enemies-up",
      desc: {
        kid: "Extra shiny coins, but the grumps guard them extra tight!",
        teen: "Rich veins below — and everything down there knows it.",
        all: "Gold thick as blood down here. Everything with teeth is guarding it." } },
    { id: "chrono-storm", name: "Chrono Storm",
      effect: "enemy-speed-up",
      desc: {
        kid: "The tick-tock wind makes everyone zoom-zoom wiggly fast!",
        teen: "Time stutters below. Hostiles are moving faster than they should.",
        all: "Time is bleeding down here. The dead are fast — stay faster." } },
    { id: "blood-moon", name: "Blood Moon",
      effect: "elite-rate-up",
      desc: {
        kid: "The moonberry moon makes the big buddies extra bouncy!",
        teen: "Red moon through the cracks. The big ones are restless.",
        all: "Red moon rising through the cracks. The big ones are hungry." } },
    { id: "thin-air", name: "Thin Air",
      effect: "player-regen-down",
      desc: {
        kid: "The air is sleepy-thin — take cozy breaths and rest lots!",
        teen: "Thin air below. Pace yourself and bandage early.",
        all: "The air thins to rot and dust. Bandage early or bleed out." } },
    { id: "mimic-veins", name: "Mimic Veins",
      effect: "treasury-trapped",
      desc: {
        kid: "Some treasure chests are giggly tricksters in disguise!",
        teen: "Not every chest is a chest. Check twice before you grab.",
        all: "Half the chests down here have teeth. Check twice, hell take you." } },
    { id: "necro-surge", name: "Necro Surge",
      effect: "summoner-rate-up",
      desc: {
        kid: "The hum-hum song keeps waking sleepy skeletons back up!",
        teen: "The Array hum is louder here. The risen keep getting back up.",
        all: "The Array is screaming here. The risen just will not stay down." } }
  ];

  function mutatorById(id) {
    for (var i = 0; i < MUTATORS.length; i++) {
      if (MUTATORS[i].id === id) return MUTATORS[i];
    }
    return null;
  }

  function descFor(mutator, mode) {
    var m = typeof mutator === "string" ? mutatorById(mutator) : mutator;
    if (!m) return "";
    if (mode !== "kid" && mode !== "teen" && mode !== "all") mode = resolveMode();
    return m.desc[mode] || m.desc.teen;
  }

  // Deterministic depth-seeded pick (mulberry32 on depth) so a floor's
  // mutators are stable across re-polls within one session.
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pickMutators(depth) {
    var d = Math.max(1, Math.floor(depth) || 1);
    if (d < 4) return []; // story floors stay clean; endless starts at L4
    var rand = mulberry32(d * 2654435761 % 4294967296);
    var count = d >= 10 ? 2 : 1;
    var pool = MUTATORS.slice();
    var out = [];
    for (var i = 0; i < count && pool.length; i++) {
      var idx = Math.floor(rand() * pool.length);
      out.push(pool.splice(idx, 1)[0]);
    }
    return out;
  }

  // ---------- depth scaling curves ----------
  // Bundle truth: buildDungeonLayer diffScale = 1.0 + floorIndex * 0.15;
  // populateMissionTargets floorScale = 1 + floorIndex * 0.1.
  // Endless curves continue that line, then soft-cap so L25+ plateaus.
  function hpAt(depth) {
    var d = Math.max(1, depth);
    var linear = 1 + d * 0.15;
    if (d <= 12) return linear;
    return 1 + 12 * 0.15 + (linear - (1 + 12 * 0.15)) * 0.35;
  }
  function dmgAt(depth) {
    var d = Math.max(1, depth);
    var linear = 1 + d * 0.1;
    if (d <= 12) return linear;
    return 1 + 12 * 0.1 + (linear - (1 + 12 * 0.1)) * 0.4;
  }
  function lootAt(depth) {
    // Gold-curse floors pay more; base drift stays near 1x so economy holds.
    return 1 + Math.min(1.5, Math.max(0, depth - 3) * 0.06);
  }
  function densityAt(depth) {
    // Extra ambient mobs per non-spawn room, capped at +4.
    return Math.min(4, Math.floor(Math.max(0, depth - 3) / 3));
  }

  // ---------- endless boss rotation ----------
  // Bundle bosses (game.js EnemyTypes): Human Zed (ranged), Huge Orc Zed
  // (brute), Elven Necromancer (summoner). Rotation is deterministic per
  // depth so co-op clients and QA agree on "who guards L8".
  var BOSS_ROTATION = ["human-zed", "huge-orc-zed", "elven-necromancer"];

  function bossForDepth(depth) {
    var d = Math.max(1, Math.floor(depth) || 1);
    if (d < 6) return null; // bundle keeps ambient bosses rare before L6
    var cycle = Math.floor((d - 6) / 2); // one boss holds two floors
    return BOSS_ROTATION[cycle % BOSS_ROTATION.length];
  }

  function bossLabel(id, mode) {
    if (mode !== "kid" && mode !== "teen" && mode !== "all") mode = resolveMode();
    var names = {
      "human-zed": { kid: "Beep-Boop Buddy", teen: "Rogue Human Zed", all: "Rogue Human Zed" },
      "huge-orc-zed": { kid: "Big Cuddly Grump", teen: "Huge Orc Zed", all: "Huge Orc Zed" },
      "elven-necromancer": { kid: "Silly Hat Wizard", teen: "Elven Necromancer", all: "Elven Necromancer" }
    };
    var entry = names[id];
    return entry ? (entry[mode] || entry.teen) : id;
  }

  // ---------- live-game bridge (poll, never patch) ----------
  var state = { depth: 0, mutators: [], boss: null, announced: {} };

  function liveGame() {
    try { return window.GraveGainGame || null; } catch (_) { return null; }
  }

  function currentDepth() {
    var g = liveGame();
    try {
      if (g && typeof g.floorIndex === "number") return g.floorIndex;
    } catch (_) { /* ignore */ }
    return state.depth || 1;
  }

  function current() {
    var depth = currentDepth();
    return { depth: depth, mutators: pickMutators(depth), boss: bossForDepth(depth) };
  }

  function notifySiblings(snapshot) {
    // Events / sidequests lane: announce the endless floor (best-effort).
    try {
      var ev = window.GraveGainEvents;
      if (ev && typeof ev.emit === "function") {
        ev.emit("endless-floor", snapshot);
      } else if (ev && typeof ev.push === "function") {
        ev.push({ type: "endless-floor", snapshot: snapshot });
      }
    } catch (_) { /* sibling absent or busy */ }
    try {
      var sq = window.GraveGainSidequests || window.GraveGainEmergent;
      if (sq && typeof sq.track === "function") {
        sq.track("endless-depth", snapshot.depth);
      } else if (sq && typeof sq.nextEvent === "function") {
        // Pure-data sibling (A9 canonical): pull-only, never push state.
        sq.nextEvent({ depth: snapshot.depth });
      }
    } catch (_) { /* ignore */ }
    try {
      var loot = window.GraveGainLoot || window.GraveGainArsenal;
      if (loot && typeof loot.noteEndlessFloor === "function") {
        loot.noteEndlessFloor(snapshot);
      }
    } catch (_) { /* ignore */ }
    try {
      var best = window.GraveGainBestiary || window.GraveGainEnemies;
      if (best && typeof best.noteEndlessFloor === "function") {
        best.noteEndlessFloor(snapshot);
      } else if (best && typeof best.pickVariant === "function" && snapshot.boss) {
        best.pickVariant(snapshot.boss, snapshot.depth);
      }
    } catch (_) { /* ignore */ }
  }

  // Lightweight floor banner (pointer-events:none, textContent-only, capped).
  var bannerEl = null;
  var bannerTimer = 0;
  function announce(snapshot) {
    try {
      if (!snapshot.mutators.length && !snapshot.boss) return;
      var key = snapshot.depth + ":" + snapshot.mutators.map(function (m) { return m.id; }).join("+");
      if (state.announced[key]) return;
      state.announced[key] = true;
      var keys = Object.keys(state.announced);
      if (keys.length > 40) delete state.announced[keys[0]];
      if (!bannerEl) {
        bannerEl = document.createElement("div");
        bannerEl.setAttribute("data-gg2d-endless", "banner");
        bannerEl.style.cssText = "position:fixed;top:12px;left:50%;transform:translateX(-50%);" +
          "padding:6px 14px;border-radius:999px;background:rgba(2,6,23,.82);color:#e2e8f0;" +
          "font:12px/1.4 system-ui,sans-serif;pointer-events:none;z-index:2147483000;opacity:0;" +
          "transition:opacity .4s;white-space:nowrap;max-width:92vw;overflow:hidden;text-overflow:ellipsis;";
        document.body.appendChild(bannerEl);
      }
      var mode = resolveMode();
      var bits = ["Layer " + snapshot.depth];
      snapshot.mutators.forEach(function (m) { bits.push(m.name); });
      if (snapshot.boss) bits.push(bossLabel(snapshot.boss, mode) + " stirs");
      bannerEl.textContent = "🕳️ " + bits.join(" • ");
      bannerEl.style.opacity = "1";
      if (bannerTimer) clearTimeout(bannerTimer);
      bannerTimer = setTimeout(function () {
        try { if (bannerEl) bannerEl.style.opacity = "0"; } catch (_) { /* ignore */ }
      }, 3600);
    } catch (_) { /* overlay is cosmetic */ }
  }

  function poll() {
    try {
      if (document.hidden) return;
      var depth = currentDepth();
      if (depth === state.depth) return;
      state.depth = depth;
      var snapshot = {
        depth: depth,
        mutators: pickMutators(depth),
        boss: bossForDepth(depth),
        hpMul: hpAt(depth),
        dmgMul: dmgAt(depth),
        lootMul: lootAt(depth),
        bonusDensity: densityAt(depth)
      };
      state.mutators = snapshot.mutators;
      state.boss = snapshot.boss;
      notifySiblings(snapshot);
      announce(snapshot);
    } catch (_) { /* never break the game loop */ }
  }

  var pollTimer = 0;
  function init() {
    if (pollTimer) return;
    try {
      pollTimer = setInterval(poll, 1000);
    } catch (_) { /* ignore */ }
    try { poll(); } catch (_) { /* ignore */ }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.GraveGain2DEndless = {
    VERSION: VERSION,
    MUTATORS: MUTATORS,
    BOSS_ROTATION: BOSS_ROTATION,
    mutatorById: mutatorById,
    descFor: descFor,
    pickMutators: pickMutators,
    hpAt: hpAt,
    dmgAt: dmgAt,
    lootAt: lootAt,
    densityAt: densityAt,
    bossForDepth: bossForDepth,
    bossLabel: bossLabel,
    resolveMode: resolveMode,
    current: current,
    init: init
  };

  try {
    window.GraveGainMods = window.GraveGainMods || [];
    window.GraveGainMods.push({ name: "gravegain2d-endless", version: VERSION, init: init });
  } catch (_) { /* registry is best-effort */ }
})();
