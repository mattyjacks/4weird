/* GraveGain enemy-model roster overlay (v2-native, parity-safe).
 *
 * Lives OUTSIDE parity-locked bundles: public/games/html/gravegain-enemies.js,
 * injected into the generated runtime copy by scripts/sync-game-bundles.mjs
 * (wiring lane owns that script — this file never edits parity trees).
 *
 * What it does (advisory-only, never mutates game logic):
 *   - VARIANTS: 24+ enemy variants beyond the base set (shambler/swarm/brute/
 *     necro + 5 gate bosses). Same models in every age band; only taunts and
 *     gore differ (kid = silly, teen = tense, all = profane; blood itself is
 *     owned by the gore lanes, never spawned here).
 *   - Director: polls live game enemy lists (2D window.GraveGainGame.enemies,
 *     1D window.GraveGain1D / GraveGainGame, 3D window.GraveGainGame.enemies
 *     with position objects) and tags each enemy with `_variant` (variant id)
 *     + `_tint` (color3D hex, consumed by the models-3d lane if present) +
 *     `_behaviorHint` (charger/spitter/brute/summoner/lurker note). 1D/2D
 *     skin is surfaced via overlay floaters (variant emoji + name), never by
 *     rewriting the bundle's emoji/sprite fields.
 *   - Boss phases: every gate boss gains an enrage line + summon-pattern note
 *     surfaced as a one-shot overlay floater at 50% and 25% hp.
 *
 * Contract: vanilla IIFE, no deps, never throws, idempotent
 * (`if (window.GraveGainEnemies) return`), guarded try/catch everywhere,
 * capped (floaters/announced sets), throttled poll (~1Hz), pauses when
 * `document.hidden`.
 */
(function () {
  "use strict";
  if (window.GraveGainEnemies) return; // idempotent under double-injection

  var VERSION = "1.0.0-sub08";

  // behavior enum: charger | spitter | brute | summoner | lurker
  // threat: 1 (fodder) .. 5 (mini-boss). hpMul/atkMul scale the base kind.
  var VARIANTS = [
    { id: "lantern-husk", name: "Lantern Husk", emoji: "🏮", color3D: "#f59e0b", hpMul: 1.1, atkMul: 1.0, behavior: "lurker", threat: 2,
      taunt: { kid: "My lantern is pumpkin-orange!", teen: "It hungers in the lamplight.", all: "Come closer — the flame is starving, damn you." } },
    { id: "grave-gardener", name: "Grave Gardener", emoji: "🪏", color3D: "#65a30d", hpMul: 1.4, atkMul: 0.9, behavior: "brute", threat: 2,
      taunt: { kid: "I plant jellybean bones!", teen: "It buries what it catches.", all: "I dig the holes you bastards bleed in." } },
    { id: "array-acolyte", name: "Array Acolyte", emoji: "🔮", color3D: "#8b5cf6", hpMul: 0.9, atkMul: 1.3, behavior: "spitter", threat: 3,
      taunt: { kid: "Beep boop, spooky math!", teen: "The Array speaks through it.", all: "The Array drinks through me — kneel, hell take you." } },
    { id: "thorn-revenant", name: "Thorn Revenant", emoji: "🌵", color3D: "#16a34a", hpMul: 1.3, atkMul: 1.1, behavior: "charger", threat: 3,
      taunt: { kid: "Hug me, I'm pointy!", teen: "Thorns first, teeth after.", all: "Bleed on my thorns, you son of a grave." } },
    { id: "spark-imp", name: "Spark Imp", emoji: "⚡", color3D: "#facc15", hpMul: 0.6, atkMul: 1.4, behavior: "charger", threat: 1,
      taunt: { kid: "Zappy zippy zoom!", teen: "Fast, sparking, vicious.", all: "Catch me, asshole — I dare you." } },
    { id: "orc-gore-shaman", name: "Orc Gore-Shaman", emoji: "🧌", color3D: "#b91c1c", hpMul: 1.5, atkMul: 1.2, behavior: "summoner", threat: 4,
      taunt: { kid: "Drummy rumbly tummy!", teen: "Its drum wakes the fallen.", all: "My drum drinks blood — yours, bastard." } },
    { id: "dice-golem", name: "Dice Golem", emoji: "🎲", color3D: "#e2e8f0", hpMul: 2.0, atkMul: 1.0, behavior: "brute", threat: 3,
      taunt: { kid: "Roll a six, get a hug!", teen: "Every roll lands heavy.", all: "Snake eyes, fucker — house always wins." } },
    { id: "memorial-warden", name: "Memorial Warden", emoji: "🗿", color3D: "#94a3b8", hpMul: 2.2, atkMul: 1.1, behavior: "brute", threat: 4,
      taunt: { kid: "Shhh, statues are napping!", teen: "It guards names you can't read.", all: "Your name's next on the stone, damn you." } },
    { id: "fog-lurker", name: "Fog Lurker", emoji: "🌫️", color3D: "#64748b", hpMul: 0.8, atkMul: 1.2, behavior: "lurker", threat: 3,
      taunt: { kid: "Peekaboo, I'm misty!", teen: "Don't follow it into the fog.", all: "Walk in, bastard. Nobody walks out." } },
    { id: "chem-thrall", name: "Chem Thrall", emoji: "🧪", color3D: "#22d3ee", hpMul: 1.0, atkMul: 1.1, behavior: "spitter", threat: 2,
      taunt: { kid: "Fizzy bubbly goo!", teen: "It sweats burning chemicals.", all: "One splash melts you screaming, shithead." } },
    { id: "root-chanter", name: "Root Chanter", emoji: "🌳", color3D: "#15803d", hpMul: 1.2, atkMul: 1.0, behavior: "summoner", threat: 2,
      taunt: { kid: "The trees sing la-la!", teen: "Roots answer its humming.", all: "The roots will drag you down, damn it." } },
    { id: "pulse-skull", name: "Pulse Skull", emoji: "💀", color3D: "#f472b6", hpMul: 0.5, atkMul: 1.5, behavior: "charger", threat: 1,
      taunt: { kid: "Bonk bonk, rattle rattle!", teen: "It pulses before it bursts.", all: "Tick-tock, fucker — I'm your headache." } },
    { id: "ash-reaper", name: "Ash Reaper", emoji: "🌋", color3D: "#ea580c", hpMul: 1.6, atkMul: 1.3, behavior: "charger", threat: 4,
      taunt: { kid: "Sneezy ashy cloud!", teen: "Where it walks, ash falls.", all: "Ashes to ashes, bastard — starting with you." } },
    { id: "vault-tick", name: "Vault Tick", emoji: "🪲", color3D: "#a16207", hpMul: 0.7, atkMul: 1.0, behavior: "lurker", threat: 1,
      taunt: { kid: "Tickly little beetle!", teen: "It latched on. Pull it off.", all: "I'll drain you dry, you tick of shit." } },
    { id: "moonmoth-swarm", name: "Moonmoth Swarm", emoji: "🦋", color3D: "#c4b5fd", hpMul: 0.6, atkMul: 1.1, behavior: "charger", threat: 2,
      taunt: { kid: "Flutter flutter, pretty wings!", teen: "They blot out the moon.", all: "Pretty wings, ugly death — run, fucker." } },
    { id: "furnace-hulk", name: "Furnace Hulk", emoji: "🔥", color3D: "#dc2626", hpMul: 2.4, atkMul: 1.4, behavior: "brute", threat: 5,
      taunt: { kid: "Big toasty marshmallow!", teen: "Its chest is a furnace door.", all: "I'll roast you alive, you bastard." } },
    { id: "tithe-collector", name: "Tithe Collector", emoji: "🪙", color3D: "#fbbf24", hpMul: 1.1, atkMul: 1.0, behavior: "lurker", threat: 2,
      taunt: { kid: "Coins for the piggy bank!", teen: "It collects more than coin.", all: "Pay up in blood, cheapskate. Hell collects." } },
    { id: "hex-crow", name: "Hex Crow", emoji: "🐦‍⬛", color3D: "#334155", hpMul: 0.6, atkMul: 1.2, behavior: "spitter", threat: 1,
      taunt: { kid: "Caw caw, silly bird!", teen: "Its caw hexes the air.", all: "Caw, damn you — I peck out liars' eyes." } },
    { id: "suture-horror", name: "Suture Horror", emoji: "🧵", color3D: "#fda4af", hpMul: 1.7, atkMul: 1.1, behavior: "brute", threat: 3,
      taunt: { kid: "Stitchy patchy buddy!", teen: "Stitched from too many dead.", all: "I'm sewn from bastards tougher than you." } },
    { id: "howl-anchor", name: "Howl Anchor", emoji: "📻", color3D: "#38bdf8", hpMul: 1.3, atkMul: 0.8, behavior: "summoner", threat: 3,
      taunt: { kid: "Loud radio goes WOOO!", teen: "Its signal calls the pack.", all: "Hear that? That's your funeral frequency, shithead." } },
    { id: "gallow-bloom", name: "Gallow Bloom", emoji: "🥀", color3D: "#9d174d", hpMul: 1.0, atkMul: 1.4, behavior: "spitter", threat: 3,
      taunt: { kid: "A sleepy droopy flower!", teen: "Its pollen burns the lungs.", all: "Breathe deep, fucker. Last breath's on me." } },
    { id: "rust-knight", name: "Rust Knight", emoji: "🛡️", color3D: "#b45309", hpMul: 1.9, atkMul: 1.2, behavior: "brute", threat: 4,
      taunt: { kid: "Clanky squeaky robot!", teen: "Rust hasn't slowed its swing.", all: "My blade's rusted with better bastards than you." } },
    { id: "wail-choir", name: "Wail Choir", emoji: "🎭", color3D: "#a78bfa", hpMul: 1.0, atkMul: 1.2, behavior: "summoner", threat: 4,
      taunt: { kid: "Sing along, la la la!", teen: "Their song freezes your hands.", all: "We sing you into the dirt, damn your soul." } },
    { id: "mire-strangler", name: "Mire Strangler", emoji: "🐊", color3D: "#0f766e", hpMul: 1.5, atkMul: 1.3, behavior: "lurker", threat: 3,
      taunt: { kid: "Splishy splashy puddle pal!", teen: "The water isn't water.", all: "The mire keeps what it catches, asshole." } },
    { id: "cinder-monk", name: "Cinder Monk", emoji: "🕯️", color3D: "#fb923c", hpMul: 1.2, atkMul: 1.2, behavior: "charger", threat: 2,
      taunt: { kid: "Shiny candle friend!", teen: "It prays in embers.", all: "Ash guide me — I'll burn you clean, bastard." } },
    { id: "ballot-box-mimic", name: "Ballot-Box Mimic", emoji: "🗳️", color3D: "#4d7c0f", hpMul: 1.8, atkMul: 0.9, behavior: "lurker", threat: 2,
      taunt: { kid: "Vote for cookies!", teen: "Don't trust the box. Ever.", all: "Your vote's already counted — against you, fucker." } }
  ];

  // Boss-phase notes: enrage line per age band + summon-pattern note.
  // Keyed by boss mech id from gravegain1d/game.js (wright, mirathiel,
  // warden, karguk, titan); matched fuzzily against boss names too.
  var BOSS_PHASES = {
    wright: { enrage: { kid: "James pouts: NO more naps!", teen: "The First Risen screams the gate shut.", all: "WRIGHT: I'll bury you bastards standing up!" }, summon: "summons 2 Risen Shamblers" },
    mirathiel: { enrage: { kid: "Echo goes WOBBLY-wobbly!", teen: "The Echo fractures into screaming shards.", all: "MIRATHIEL: Shatter, damn you — shatter with me!" }, summon: "summons Skull Swarm ring" },
    warden: { enrage: { kid: "Clanky Warden stomps extra loud!", teen: "The Forge-Golem vents white-hot fury.", all: "WARDEN: Forge take you, hell take your kin!" }, summon: "summons 2 Vault Ticks + shield wall" },
    karguk: { enrage: { kid: "Karguk bangs the drum SUPER fast!", teen: "War Drum frenzy — the pack howls.", all: "KARGUK: Blood for the drum, bastard — YOURS!" }, summon: "war-drum pulse: buffs nearby non-bosses" },
    titan: { enrage: { kid: "Big Titan does a grumpy dance!", teen: "The Herald cracks the sky open.", all: "TITAN: Kneel, you goddamn spark — the Array is eternal!" }, summon: "summons mixed wave + pulse skulls" }
  };

  function bossKeyFor(boss) {
    try {
      var hay = ((boss && boss.mech) ? String(boss.mech) : "") + " " + ((boss && boss.name) ? String(boss.name) : "");
      hay = hay.toLowerCase();
      var keys = ["wright", "mirathiel", "warden", "karguk", "titan"];
      for (var i = 0; i < keys.length; i++) if (hay.indexOf(keys[i]) !== -1) return keys[i];
      if (hay.indexOf("gate") !== -1) return "titan";
      if (hay.indexOf("blood") !== -1) return "karguk";
    } catch (e) { /* ignore */ }
    return null;
  }

  // ---------- seeded pick ----------
  function mulberry32(seed) {
    var a = seed | 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashStr(s) {
    var h = 2166136261;
    s = String(s);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h | 0;
  }

  // Deterministic variant for a (seed, cycle, slot) triple. Higher cycles
  // bias toward higher-threat variants. Pure function — safe to call anywhere.
  function pickVariant(seed, cycle) {
    try {
      seed = (seed | 0) || 1;
      cycle = Math.max(0, cycle | 0);
      var rng = mulberry32((seed ^ Math.imul(cycle + 1, 2654435761)) | 0);
      var minThreat = cycle >= 4 ? 3 : cycle >= 2 ? 2 : 1;
      var pool = [];
      for (var i = 0; i < VARIANTS.length; i++) if (VARIANTS[i].threat >= minThreat) pool.push(VARIANTS[i]);
      if (!pool.length) pool = VARIANTS;
      return pool[Math.floor(rng() * pool.length)];
    } catch (e) { return VARIANTS[0]; }
  }

  function variantById(id) {
    for (var i = 0; i < VARIANTS.length; i++) if (VARIANTS[i].id === id) return VARIANTS[i];
    return null;
  }

  // ---------- content-mode (same priority as gore lanes) ----------
  var STORE_KEYS = ["4weird-content-mode:gravegain2d", "4weird-content-mode:gravegain1d", "4weird-content-mode:gravegain3d"];
  function readMode() {
    try {
      var m = new URLSearchParams(window.location.search).get("content");
      if (m === "kid" || m === "teen" || m === "all") return m;
    } catch (e) { /* ignore */ }
    try {
      for (var i = 0; i < STORE_KEYS.length; i++) {
        var s = window.localStorage.getItem(STORE_KEYS[i]);
        if (s === "kid" || s === "teen" || s === "all") return s;
      }
    } catch (e) { /* ignore */ }
    try {
      var g = window.FourweirdContentMode;
      if (g && (g.mode === "kid" || g.mode === "teen" || g.mode === "all")) return g.mode;
    } catch (e) { /* ignore */ }
    return "teen";
  }

  // ---------- overlay floaters (cosmetic only) ----------
  var MAX_FLOATERS = 24;
  var announced = {}; // enemy id -> true (cap: reset per gate/cycle)
  var announcedCount = 0;
  var bossPhaseShown = {}; // boss object id + phase -> true
  var lastTauntAt = 0;

  function container() { return document.getElementById("canvasContainer") || document.body; }

  function ensureLayer() {
    try {
      var host = container();
      var layer = document.getElementById("gg-enemies-layer");
      if (layer && layer.parentNode === host) return layer;
      if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
      layer = document.createElement("div");
      layer.id = "gg-enemies-layer";
      layer.setAttribute("aria-hidden", "true");
      layer.style.cssText = "position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:35;";
      try {
        var cs = window.getComputedStyle(host);
        if (cs.position === "static") host.style.position = "relative";
      } catch (e) { /* ignore */ }
      host.appendChild(layer);
      return layer;
    } catch (e) { return null; }
  }

  function prune(layer) {
    try {
      while (layer.childNodes.length > MAX_FLOATERS) layer.removeChild(layer.firstChild);
    } catch (e) { /* ignore */ }
  }

  function addFloater(text, color, xPct, yPct) {
    try {
      var layer = ensureLayer();
      if (!layer) return;
      prune(layer);
      var f = document.createElement("div");
      f.textContent = text;
      f.style.cssText = "position:absolute;left:" + xPct + "%;top:" + yPct + "%;transform:translate(-50%,-100%);" +
        "font-weight:800;font-size:14px;color:" + color + ";text-shadow:0 2px 6px rgba(0,0,0,0.85);" +
        "pointer-events:none;white-space:nowrap;transition:top 1.4s ease-out,opacity 1.4s;";
      layer.appendChild(f);
      window.requestAnimationFrame(function () {
        try { f.style.top = Math.max(2, yPct - 8) + "%"; f.style.opacity = "0"; } catch (e) { /* ignore */ }
      });
      window.setTimeout(function () { try { if (f.parentNode) f.parentNode.removeChild(f); } catch (e) { /* ignore */ } }, 1600);
    } catch (e) { /* cosmetic; never throw */ }
  }

  // ---------- live-instance scan ----------
  function liveGames() {
    var out = [];
    try {
      if (window.GraveGainGame) out.push({ tag: "2d/3d", g: window.GraveGainGame });
      if (window.GraveGain1D && window.GraveGain1D !== window.GraveGainGame) out.push({ tag: "1d", g: window.GraveGain1D });
      if (window.G && window.G !== window.GraveGainGame) out.push({ tag: "1d-G", g: window.G });
    } catch (e) { /* ignore */ }
    return out;
  }

  function enemyList(g) {
    try {
      if (!g) return null;
      if (Array.isArray(g.enemies)) return g.enemies;
      if (g.run && Array.isArray(g.run.enemies)) return g.run.enemies;
      if (g.s && Array.isArray(g.s.enemies)) return g.s.enemies;
      if (g.state && Array.isArray(g.state.enemies)) return g.state.enemies;
    } catch (e) { /* ignore */ }
    return null;
  }

  function runSeedCycle(g) {
    var seed = 1, cycle = 0;
    try {
      var src = g.run || g.s || g.state || g;
      if (src) {
        if (typeof src.seed === "number") seed = src.seed;
        else if (typeof g.seed === "number") seed = g.seed;
        if (typeof src.cycle === "number") cycle = src.cycle;
        else if (typeof src.sector === "number") cycle = Math.floor(src.sector / 5);
      }
    } catch (e) { /* ignore */ }
    return { seed: seed | 0, cycle: Math.max(0, cycle | 0) };
  }

  function tagEnemy(e, seed, cycle) {
    if (!e || typeof e !== "object") return;
    if (e.isBoss) return; // bosses keep their identity; phases handled separately
    if (e._variant) return; // already tagged — advisory tag sticks for this spawn
    try {
      var slot = typeof e.id === "number" ? e.id : hashStr(e.name || e.kind || "e");
      var rng = mulberry32(((seed | 0) ^ Math.imul((slot | 0) + 1, 2246822519) ^ Math.imul((cycle | 0) + 1, 3266489917)) | 0);
      // ~55% of endless-table spawns get a variant skin (cycle 0 keeps the base set readable).
      var p = cycle > 0 ? 0.55 : 0.25;
      if (rng() > p) return;
      var v = pickVariant((seed + (slot | 0)) | 0, cycle);
      e._variant = v.id;       // advisory skin id — consumed by overlay + 3d lane
      e._tint = v.color3D;     // 3D tint hint for models-3d lane (if present)
      e._behaviorHint = v.behavior;
      // One-shot spawn floater per enemy (capped).
      var key = "e" + String(e.id !== undefined ? e.id : (v.id + slot));
      if (!announced[key] && announcedCount < 200) {
        announced[key] = true; announcedCount++;
        addFloater(v.emoji + " " + v.name, v.color3D, 12 + rng() * 76, 30 + rng() * 40);
      }
    } catch (err) { /* never break the game loop */ }
  }

  function checkBoss(g, list) {
    try {
      var bosses = [];
      var src = g.run || g.s || g.state || g;
      if (src && src.boss && typeof src.boss === "object" && src.boss.hp > 0) bosses.push(src.boss);
      for (var i = 0; i < list.length; i++) {
        var e = list[i];
        if (e && e.isBoss && e.hp > 0 && bosses.indexOf(e) === -1) bosses.push(e);
      }
      for (var b = 0; b < bosses.length; b++) {
        var boss = bosses[b];
        var key = bossKeyFor(boss);
        if (!key || !BOSS_PHASES[key]) continue;
        var frac = boss.maxHp ? boss.hp / boss.maxHp : 1;
        var phase = frac <= 0.25 ? "q25" : frac <= 0.5 ? "q50" : null;
        if (!phase) continue;
        var bkey = String(boss.id !== undefined ? boss.id : boss.name) + phase;
        if (bossPhaseShown[bkey]) continue;
        bossPhaseShown[bkey] = true;
        var mode = readMode();
        var line = BOSS_PHASES[key].enrage[mode] || BOSS_PHASES[key].enrage.teen;
        boss._enragePhase = phase; // advisory tag for other lanes
        addFloater("💀 " + line, "#ef4444", 50, 18);
        addFloater("➕ " + BOSS_PHASES[key].summon, "#fbbf24", 50, 28);
      }
    } catch (e) { /* ignore */ }
  }

  function maybeTaunt(list) {
    try {
      var now = Date.now();
      if (now - lastTauntAt < 20000) return; // at most one taunt line per 20s
      var tagged = [];
      for (var i = 0; i < list.length; i++) {
        var e = list[i];
        if (e && e._variant && e.hp > 0 && !e.isBoss) tagged.push(e);
      }
      if (!tagged.length) return;
      var pick = tagged[Math.floor(Math.random() * tagged.length)];
      var v = variantById(pick._variant);
      if (!v) return;
      var mode = readMode();
      lastTauntAt = now;
      addFloater(v.emoji + " “" + (v.taunt[mode] || v.taunt.teen) + "”", "#e2e8f0", 50, 70);
    } catch (e) { /* ignore */ }
  }

  function tick() {
    try {
      if (document.hidden) return; // pause when hidden
      var games = liveGames();
      for (var i = 0; i < games.length; i++) {
        var g = games[i].g;
        var list = enemyList(g);
        if (!list) continue;
        // Cap scan slice so huge endless tables can't stall the frame.
        var n = Math.min(list.length, 120);
        var sc = runSeedCycle(g);
        for (var j = 0; j < n; j++) tagEnemy(list[j], sc.seed, sc.cycle);
        checkBoss(g, list);
        maybeTaunt(list);
      }
    } catch (e) { /* never break the game loop */ }
  }

  window.addEventListener("fourweird-content-mode", function () {
    try { lastTauntAt = 0; } catch (e) { /* ignore */ }
  });

  window.GraveGainEnemies = {
    VERSION: VERSION,
    VARIANTS: VARIANTS,
    BOSS_PHASES: BOSS_PHASES,
    pickVariant: pickVariant,
    variantById: variantById
  };

  window.setInterval(tick, 900);
  if (document.readyState !== "loading") { try { tick(); } catch (e) { /* ignore */ } }
  else document.addEventListener("DOMContentLoaded", function () { try { tick(); } catch (e) { /* ignore */ } });
})();
