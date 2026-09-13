/* GraveGain3D endless expansion (E18, v2-native, parity-safe).
 *
 * Lives OUTSIDE parity-locked bundles:
 *   public/games/html/gravegain3d-endless.js
 * Wiring lane injects it into the generated gravegain3d runtime copy via
 * scripts/sync-game-bundles.mjs (this file never edits parity trees).
 *
 * What it does (advisory-only, never rewrites game logic):
 *   - 7-theme floor rotation extensions mirroring world/dungeon-generator.js
 *     THEMES (metallic_ship, elven_grove, dwarven_vault, orc_wastes,
 *     toxic_catacombs, stone_crypt, citadel_darkness) + per-theme endless
 *     blurbs, hazard notes, and elite bias.
 *   - Depth modifiers: hp/atk/xp/loot/density scaling + boss/elite cadence.
 *   - Boss-rush hooks: every 5th floor is a boss floor; phases + summon
 *     notes surfaced advisory-only (tags + floater text, no stat rewrites).
 *   - Endless-exclusive elites: 6 new elites; when window.GraveGainBestiary
 *     is present they compose with its roster (byTier/randomOf/byId), with
 *     local fallback when it is absent.
 *   - Loot/event/quest bridges: delegate to window.GraveGainLoot,
 *     window.GraveGainEmergent / GraveGainEvents / GraveGainSidequests /
 *     window.GraveGainArsenal when present; local fallback tables otherwise.
 *   - Age-band safe: same elites/models in every band; kill FX routes via
 *     window.FourweirdGore.spawn when present, else window.GraveGain3DGore.
 *     kid = sparkles + praise words (never blood); teen = blood, minimal
 *     gore; all = over-the-top gore. Drugs never granted here (all-only via
 *     the hub-planter lane); endless quest text stays drug-free for kid/teen.
 *
 * Contract: vanilla IIFE, no deps, no imports, never throws, idempotent
 * (`if (window.GraveGain3DEndless) return`), guarded try/catch everywhere,
 * capped tables, throttled poll (~1Hz), pauses when `document.hidden`.
 */
(function () {
  'use strict';
  if (window.GraveGain3DEndless) return; // idempotent under double-injection

  var VERSION = '1.0.0';
  var MOD_NAME = 'gravegain3d-endless';

  /* ---------------- mode contract (G1/G7 owned, read-only here) ---------------- */
  var MODES = ['kid', 'teen', 'all'];
  var cachedMode = null;

  function queryParam() {
    try {
      var s = (typeof window.location === 'object' && window.location)
        ? String(window.location.search || '') : '';
      var m = /[?&]content=(kid|teen|all)/.exec(s);
      return m ? m[1] : null;
    } catch (_) { return null; }
  }

  function storedMode() {
    try {
      var keys = ['4weird-content-mode:gravegain3d', '4weird-content-mode', 'FourweirdContentMode'];
      for (var i = 0; i < keys.length; i++) {
        var v = null;
        try { v = window.localStorage.getItem(keys[i]); } catch (_) { v = null; }
        if (v === 'kid' || v === 'teen' || v === 'all') return v;
      }
    } catch (_) { /* ignore */ }
    return null;
  }

  function resolveMode() {
    try {
      if (cachedMode) return cachedMode;
      var q = queryParam();
      if (q) { cachedMode = q; return q; }
      var st = storedMode();
      if (st) { cachedMode = st; return st; }
      var g = window.FourweirdContentMode;
      if (g && (g.mode === 'kid' || g.mode === 'teen' || g.mode === 'all')) {
        cachedMode = g.mode; return g.mode;
      }
    } catch (_) { /* ignore */ }
    return 'teen'; // fail-closed: tense but clean
  }

  function refreshMode() { cachedMode = null; resolveMode(); }

  try {
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('fourweird-content-mode', function () {
        try { refreshMode(); } catch (_) { /* ignore */ }
      });
    }
  } catch (_) { /* listener optional */ }

  /* ---------------- 7-theme floor rotation extensions ---------------- */
  // ids mirror world/dungeon-generator.js THEMES exactly.
  var THEME_ROTATION = [
    { id: 'stone_crypt', name: 'Stone Crypt Deeps', emoji: '🪦',
      blurb: 'The crypt keeps digging itself deeper. The names on the walls run out; the floors do not.',
      hazards: 'bone drifts + stagnant water', eliteBias: ['marrow-sovereign', 'ossuary-choir'] },
    { id: 'metallic_ship', name: 'LuckyStarShip Underdecks', emoji: '🛸',
      blurb: 'Below the LuckyStarShip the old colony decks repeat — metal halls, humming vents, red-eyed crew.',
      hazards: 'charged plating + water runoff', eliteBias: ['array-herald', 'sparkite-fiend'] },
    { id: 'elven_grove', name: 'Rootbound Grove', emoji: '🌳',
      blurb: 'Elder Mirathiel\u2019s roots followed the dungeon down. They still mark brave steps — and trip the careless.',
      hazards: 'crystal blooms + water', eliteBias: ['thorn-revenant', 'root-chanter'] },
    { id: 'dwarven_vault', name: 'Vault of Kingsfall', emoji: '⛏️',
      blurb: 'The dwarven vaults descend past every map. Gold glints; so do eyes. The forge never cooled.',
      hazards: 'lava seams + sparkite veins', eliteBias: ['ashen-knight', 'dice-golem'] },
    { id: 'orc_wastes', name: 'Warchief\u2019s Wastes', emoji: '🔥',
      blurb: 'Groknak\u2019s old battlegrounds, sunk and burning. Orc war-drums echo up from floors nobody charted.',
      hazards: 'sand chokes + sparkite shards', eliteBias: ['orc-gore-shaman', 'dusk-prowler'] },
    { id: 'toxic_catacombs', name: 'Dreamcap Catacombs', emoji: '🍄',
      blurb: 'Botany run-off pools below the ship. Glowcaps light the safe path; dreamcaps grow only for the worthy.',
      hazards: 'toxic seep + water', eliteBias: ['sporefiend', 'chem-thrall'] },
    { id: 'citadel_darkness', name: 'Citadel of the Array', emoji: '👁️',
      blurb: 'Hades\u2019 Array citadel — violet dark, bone walls, lava veins. Every fifth floor, something crowned waits.',
      hazards: 'bone piles + lava + sparkite', eliteBias: ['array-herald', 'pale-choir'] }
  ];

  function themeForDepth(depth) {
    try {
      var d = Math.max(1, Math.floor(Number(depth)) || 1);
      return THEME_ROTATION[(d - 1) % THEME_ROTATION.length] || THEME_ROTATION[0];
    } catch (_) { return THEME_ROTATION[0]; }
  }

  /* ---------------- depth modifiers ---------------- */
  var BOSS_EVERY = 5;
  var ELITE_EVERY = 3;

  function scaleCap(v, cap) { return v > cap ? cap : v; }

  var modifiers = {
    bossEvery: BOSS_EVERY,
    eliteEvery: ELITE_EVERY,
    hpMul: function (depth) {
      try { var d = Math.max(1, Math.floor(Number(depth)) || 1); return scaleCap(1 + (d - 1) * 0.12, 6); }
      catch (_) { return 1; }
    },
    atkMul: function (depth) {
      try { var d = Math.max(1, Math.floor(Number(depth)) || 1); return scaleCap(1 + (d - 1) * 0.05, 3); }
      catch (_) { return 1; }
    },
    xpMul: function (depth) {
      try { var d = Math.max(1, Math.floor(Number(depth)) || 1); return scaleCap(1 + (d - 1) * 0.08, 4); }
      catch (_) { return 1; }
    },
    lootMul: function (depth) {
      try { var d = Math.max(1, Math.floor(Number(depth)) || 1); return scaleCap(1 + (d - 1) * 0.06, 3); }
      catch (_) { return 1; }
    },
    density: function (depth) {
      // Extra spawns per room, advisory count for the director.
      try { var d = Math.max(1, Math.floor(Number(depth)) || 1); return Math.min(6, Math.floor((d - 1) / 2)); }
      catch (_) { return 0; }
    },
    isBossFloor: function (depth) {
      try { var d = Math.max(1, Math.floor(Number(depth)) || 1); return d % BOSS_EVERY === 0; }
      catch (_) { return false; }
    },
    isEliteFloor: function (depth) {
      try { var d = Math.max(1, Math.floor(Number(depth)) || 1); return d % ELITE_EVERY === 0; }
      catch (_) { return false; }
    },
    describe: function (depth) {
      try {
        var t = themeForDepth(depth);
        var parts = ['Floor ' + depth + ' — ' + t.name];
        if (modifiers.isBossFloor(depth)) parts.push('BOSS RUSH');
        else if (modifiers.isEliteFloor(depth)) parts.push('elite surge');
        parts.push('hp x' + modifiers.hpMul(depth).toFixed(2));
        parts.push('atk x' + modifiers.atkMul(depth).toFixed(2));
        return parts.join(' · ');
      } catch (_) { return 'endless depths'; }
    }
  };

  /* ---------------- endless-exclusive elites ---------------- */
  // Same data in every age band; only taunts + kill FX differ per band.
  var ELITES = [
    { id: 'marrow-sovereign', name: 'Marrow Sovereign', emoji: '👑', hpMul: 2.4, atkMul: 1.3,
      behavior: 'brute', threat: 4, exclusive: true, theme: 'stone_crypt',
      taunt: { kid: 'I am the tidiest bone-king!', teen: 'Kneel to the piled dead.', all: 'Kneel, bastard — my throne is your kin.' } },
    { id: 'array-herald', name: 'Array Herald', emoji: '🔮', hpMul: 1.8, atkMul: 1.5,
      behavior: 'caster', threat: 5, exclusive: true, theme: 'citadel_darkness',
      taunt: { kid: 'Beep boop, spooky math!', teen: 'The Array speaks through me.', all: 'The Array drinks through me — kneel, damn you.' } },
    { id: 'sparkite-fiend', name: 'Sparkite Fiend', emoji: '⚡', hpMul: 1.2, atkMul: 1.6,
      behavior: 'charger', threat: 3, exclusive: true, theme: 'metallic_ship',
      taunt: { kid: 'Zappy zippy zoom!', teen: 'It hums before it strikes.', all: 'Catch me, asshole — I dare you.' } },
    { id: 'ossuary-choir', name: 'Ossuary Choir', emoji: '🎶', hpMul: 1.6, atkMul: 1.2,
      behavior: 'summoner', threat: 4, exclusive: true, theme: 'stone_crypt',
      taunt: { kid: 'La-la, sing with us!', teen: 'Every skull sings one note.', all: 'Sing with us, fucker — forever.' } },
    { id: 'pale-choir', name: 'Pale Choir Wraith', emoji: '👻', hpMul: 1.4, atkMul: 1.3,
      behavior: 'lurker', threat: 3, exclusive: true, theme: 'citadel_darkness',
      taunt: { kid: 'Peekaboo, I am misty!', teen: 'Do not follow the humming.', all: 'Walk in, bastard. Nobody walks out.' } },
    { id: 'ember-cartographer-echo', name: 'Echo of the Cartographer', emoji: '🗺️', hpMul: 1.5, atkMul: 1.1,
      behavior: 'lurker', threat: 3, exclusive: true, theme: 'elven_grove',
      taunt: { kid: 'I drew you a cozy map!', teen: 'My ink marks your last steps.', all: 'I mapped your grave, damn me — walk it.' } }
  ];

  function bestiary() {
    try { return window.GraveGainBestiary || null; } catch (_) { return null; }
  }

  function eliteById(id) {
    try {
      for (var i = 0; i < ELITES.length; i++) {
        if (ELITES[i].id === id) return ELITES[i];
      }
      var b = bestiary();
      if (b && typeof b.byId === 'function') {
        var hit = b.byId(id);
        if (hit) return hit;
      }
    } catch (_) { /* ignore */ }
    return null;
  }

  function eliteForDepth(depth, randFn) {
    try {
      var theme = themeForDepth(depth);
      var biased = [];
      for (var i = 0; i < ELITES.length; i++) {
        if (ELITES[i].theme === theme.id) biased.push(ELITES[i]);
      }
      var pool = biased.length ? biased : ELITES;
      var r = (typeof randFn === 'function') ? randFn() : Math.random();
      if (!(r >= 0 && r < 1)) r = Math.random();
      var pick = pool[Math.floor(r * pool.length) % pool.length] || ELITES[0];
      // Compose with bestiary roster when present: pair the exclusive elite
      // with a same-tier bestiary buddy for mixed packs (advisory only).
      var buddy = null;
      try {
        var b = bestiary();
        if (b && typeof b.randomOf === 'function') buddy = b.randomOf('elite');
      } catch (_) { buddy = null; }
      return { elite: pick, buddy: buddy, theme: theme };
    } catch (_) { return { elite: ELITES[0], buddy: null, theme: THEME_ROTATION[0] }; }
  }

  /* ---------------- boss-rush hooks ---------------- */
  var BOSS_CYCLE = ['herald-spawn', 'grave-titan-spawn', 'bellwether', 'ashen-knight'];
  var BOSS_PHASES = [
    { at: 0.66, note: 'enrage: attack tempo quickens' },
    { at: 0.33, note: 'desperation: summons adds' }
  ];

  function bossForDepth(depth) {
    try {
      var d = Math.max(1, Math.floor(Number(depth)) || 1);
      var wave = Math.floor(d / BOSS_EVERY) - 1; // floor 5 -> wave 0
      if (wave < 0) wave = 0;
      var id = BOSS_CYCLE[wave % BOSS_CYCLE.length];
      var resolved = eliteById(id) || { id: id, name: id };
      return { bossId: id, boss: resolved, wave: wave + 1, phases: BOSS_PHASES.slice() };
    } catch (_) { return { bossId: BOSS_CYCLE[0], boss: null, wave: 1, phases: BOSS_PHASES.slice() }; }
  }

  function bossTaunt(bossId, mode) {
    try {
      var m = (mode === 'kid' || mode === 'teen' || mode === 'all') ? mode : resolveMode();
      var table = {
        'herald-spawn': { kid: 'Big crown, big nap time!', teen: 'The crown burns violet.', all: 'Crawl, damn you — the Array is hungry.' },
        'grave-titan-spawn': { kid: 'Stompy wants a hug!', teen: 'It shakes the whole floor.', all: 'Bleed louder, bastard — daddy is home.' },
        'bellwether': { kid: 'Ding-dong, snack time!', teen: 'Count the tolls. Then run.', all: 'Your toll is due, fucker. Pay in bone.' },
        'ashen-knight': { kid: 'Clanky wants to play!', teen: 'Ash and iron, no mercy.', all: 'Kneel in the ash, shithead.' }
      };
      var row = table[bossId];
      return row ? (row[m] || row.teen) : (m === 'kid' ? 'Spooky boss! You got this!' : m === 'all' ? 'End it, damn you.' : 'Hold the line.');
    } catch (_) { return 'Hold the line.'; }
  }

  // Advisory tag pass over a live game object. Never mutates stats; sets
  // `_endless` descriptors the director/overlays may read.
  function applyDepth(depth, game) {
    try {
      if (!game || typeof game !== 'object') return null;
      var d = Math.max(1, Math.floor(Number(depth)) || 1);
      var theme = themeForDepth(d);
      var desc = {
        depth: d, theme: theme.id, themeName: theme.name,
        hpMul: modifiers.hpMul(d), atkMul: modifiers.atkMul(d),
        xpMul: modifiers.xpMul(d), lootMul: modifiers.lootMul(d),
        bossFloor: modifiers.isBossFloor(d), eliteFloor: modifiers.isEliteFloor(d)
      };
      try { game._endless = desc; } catch (_) { /* tag optional */ }
      try {
        var list = game.enemies;
        if (!Array.isArray(list) && list && typeof list.length === 'number') list = null;
        if (Array.isArray(list)) {
          var boss = modifiers.isBossFloor(d) ? bossForDepth(d) : null;
          for (var i = 0; i < list.length; i++) {
            var e = list[i];
            if (!e || typeof e !== 'object') continue;
            try {
              if (e._endlessTagged) continue;
              if (boss && i === 0) {
                e._endlessRole = 'boss';
                e._endlessBossId = boss.bossId;
                e._endlessPhases = boss.phases;
                e._behaviorHint = 'boss-rush: enrage at 66%, summons at 33%';
              } else if (modifiers.isEliteFloor(d) && i % 3 === 0) {
                var pick = eliteForDepth(d).elite;
                e._endlessRole = 'elite';
                e._variant = e._variant || pick.id;
                e._tint = e._tint || null;
                e._behaviorHint = pick.behavior || 'elite';
              } else {
                e._endlessRole = 'horde';
              }
              e._endlessTagged = true;
            } catch (_) { /* per-enemy tags never fatal */ }
          }
        }
      } catch (_) { /* enemy pass optional */ }
      return desc;
    } catch (_) { return null; }
  }

  /* ---------------- loot / event / quest bridges ---------------- */
  var FALLBACK_LOOT = [
    { id: 'lantern-charm', name: 'Lantern Charm', emoji: '🏮', rarity: 'common' },
    { id: 'marrow-shard', name: 'Marrow Shard', emoji: '🦴', rarity: 'common' },
    { id: 'ember-ink', name: 'Ember Ink', emoji: '🖋️', rarity: 'uncommon' },
    { id: 'sparkite-core', name: 'Sparkite Core', emoji: '⚡', rarity: 'rare' },
    { id: 'array-shard', name: 'Array Shard', emoji: '🔮', rarity: 'epic' }
  ];

  var FALLBACK_EVENTS = [
    { id: 'whispering-crack', kid: 'A giggly crack whispers your name. You wave hello!', teen: 'A crack whispers. Mark it and move on.', all: 'The crack whispers the names of your dead. Keep walking, damn you.' },
    { id: 'lantern-cache', kid: 'A cozy lantern-cache! Snacks and stickers!', teen: 'A supply cache behind a loose stone.', all: 'A dead delver\u2019s cache. Take it all — they\u2019re past needing it.' },
    { id: 'choir-echo', kid: 'The tunnels hum a lullaby. You hum back!', teen: 'The walls hum one low note.', all: 'The walls hum with the voices of the walled-in. Hum back or go mad.' }
  ];

  var FALLBACK_QUESTS = [
    { id: 'map-the-dark', kid: 'Help Sable stamp three star-maps!', teen: 'Chart three unmapped rooms for Sable.', all: 'Chart three rooms in the blood of what guards them.' },
    { id: 'tuck-them-in', kid: 'Help Pell & Marrow tidy the bone-piles!', teen: 'Stack the bone-piles so the squad can pass.', all: 'Stack the fresh dead into the wall, damn the Array.' }
  ];

  function pickRow(rows, randFn) {
    try {
      if (!rows || !rows.length) return null;
      var r = (typeof randFn === 'function') ? randFn() : Math.random();
      if (!(r >= 0 && r < 1)) r = Math.random();
      return rows[Math.floor(r * rows.length) % rows.length];
    } catch (_) { return rows[0] || null; }
  }

  function rollLoot(depth, randFn) {
    try {
      var d = Math.max(1, Math.floor(Number(depth)) || 1);
      try {
        var L = window.GraveGainLoot;
        if (L && typeof L.roll === 'function') return L.roll(d, modifiers.lootMul(d));
        if (L && typeof L.randomOf === 'function') return L.randomOf();
        if (L && Array.isArray(L.WEAPONS) && L.WEAPONS.length) return pickRow(L.WEAPONS, randFn);
      } catch (_) { /* fall through to local table */ }
      try {
        var A = window.GraveGainArsenal;
        if (A && typeof A.randomOf === 'function') {
          var w = A.randomOf();
          if (w) return w;
        }
      } catch (_) { /* ignore */ }
      var base = pickRow(FALLBACK_LOOT, randFn) || FALLBACK_LOOT[0];
      return { id: base.id, name: base.name, emoji: base.emoji, rarity: base.rarity, depth: d, endless: true };
    } catch (_) { return FALLBACK_LOOT[0]; }
  }

  function rollEvent(depth, randFn) {
    try {
      var mode = resolveMode();
      try {
        var E = window.GraveGainEmergent;
        if (E && typeof E.nextEvent === 'function') return E.nextEvent(mode);
        if (E && typeof E.pickFor === 'function') return E.pickFor(mode, randFn);
        var EV = window.GraveGainEvents;
        if (EV && typeof EV.roll === 'function') return EV.roll(depth, mode);
      } catch (_) { /* fall through */ }
      var row = pickRow(FALLBACK_EVENTS, randFn) || FALLBACK_EVENTS[0];
      return { id: row.id, text: row[mode] || row.teen, depth: depth, endless: true };
    } catch (_) { return { id: 'whispering-crack', text: 'The tunnels hum.', endless: true }; }
  }

  function rollQuest(depth, randFn) {
    try {
      var mode = resolveMode();
      try {
        var E = window.GraveGainEmergent;
        if (E && Array.isArray(E.SIDE_QUESTS) && E.SIDE_QUESTS.length) return pickRow(E.SIDE_QUESTS, randFn);
        var Q = window.GraveGainSidequests;
        if (Q && typeof Q.pick === 'function') return Q.pick(depth, mode);
        if (Q && Array.isArray(Q.QUESTS) && Q.QUESTS.length) return pickRow(Q.QUESTS, randFn);
      } catch (_) { /* fall through */ }
      var row = pickRow(FALLBACK_QUESTS, randFn) || FALLBACK_QUESTS[0];
      return { id: row.id, text: row[mode] || row.teen, depth: depth, endless: true };
    } catch (_) { return { id: 'map-the-dark', text: 'Chart the dark.', endless: true }; }
  }

  /* ---------------- age-band-safe kill FX (G1/G7 owned) ---------------- */
  var PRAISE = ['POOF!', 'SPARKLES!', 'STAR-SAILOR!', 'NICE STOMPS!'];

  function onKill(x, y, opts) {
    try {
      var mode = resolveMode();
      var px = Number(x) || 0;
      var py = Number(y) || 0;
      if (mode === 'kid') {
        var word = PRAISE[Math.floor(Math.random() * PRAISE.length) % PRAISE.length];
        try {
          var G = window.FourweirdGore;
          if (G && typeof G.spawn === 'function') { G.spawn(px, py, 'sparkle'); return word; }
        } catch (_) { /* fall through */ }
        try {
          var G3 = window.GraveGain3DGore;
          if (G3 && typeof G3.spawnSparkles === 'function') { G3.spawnSparkles(px, py); return word; }
          if (G3 && typeof G3.spawn === 'function') { G3.spawn(px, py, 'sparkle'); return word; }
        } catch (_) { /* fall through */ }
        return word;
      }
      // teen: blood, minimal gore. all: over-the-top gore. Both via G1/G7.
      var kind = (mode === 'all') ? 'gib' : 'blood';
      try {
        var G2 = window.FourweirdGore;
        if (G2 && typeof G2.spawn === 'function') { G2.spawn(px, py, kind); return kind; }
      } catch (_) { /* fall through */ }
      try {
        var G4 = window.GraveGain3DGore;
        if (G4 && typeof G4.spawnKill === 'function') { G4.spawnKill(px, py); return kind; }
        if (G4 && typeof G4.spawn === 'function') { G4.spawn(px, py, kind); return kind; }
      } catch (_) { /* fall through */ }
      return kind;
    } catch (_) { return 'blood'; }
  }

  /* ---------------- live director poll (advisory tags only) ---------------- */
  var pollTimer = null;
  var lastDepth = 0;

  function currentDepth(game) {
    try {
      if (game) {
        var cands = [game.floor, game.floorNum, game.depth, game.runDepth,
          game._endless && game._endless.depth];
        for (var i = 0; i < cands.length; i++) {
          var n = Math.floor(Number(cands[i]));
          if (n >= 1) return n;
        }
      }
    } catch (_) { /* ignore */ }
    return lastDepth >= 1 ? lastDepth : 1;
  }

  function tick() {
    try {
      if (typeof document !== 'undefined' && document.hidden) return;
      var game = null;
      try { game = window.GraveGainGame || null; } catch (_) { game = null; }
      if (!game) return;
      var d = currentDepth(game);
      if (d !== lastDepth) {
        lastDepth = d;
        try { applyDepth(d, game); } catch (_) { /* never fatal */ }
      }
    } catch (_) { /* never throw */ }
  }

  function init() {
    try {
      if (pollTimer) return true;
      refreshMode();
      try {
        if (typeof setInterval === 'function') {
          pollTimer = setInterval(tick, 1000);
        }
      } catch (_) { pollTimer = null; }
      try { tick(); } catch (_) { /* ignore */ }
      return true;
    } catch (_) { return false; }
  }

  var api = null;
  try {
    api = {
      VERSION: VERSION,
      THEMES: THEME_ROTATION,
      ELITES: ELITES,
      BOSS_CYCLE: BOSS_CYCLE.slice(),
      BOSS_PHASES: BOSS_PHASES.slice(),
      modifiers: modifiers,
      themeForDepth: themeForDepth,
      eliteById: eliteById,
      eliteForDepth: eliteForDepth,
      bossForDepth: bossForDepth,
      bossTaunt: bossTaunt,
      applyDepth: applyDepth,
      rollLoot: rollLoot,
      rollEvent: rollEvent,
      rollQuest: rollQuest,
      resolveMode: resolveMode,
      onKill: onKill,
      init: init
    };
    window.GraveGain3DEndless = api;
    try {
      window.GraveGainMods = window.GraveGainMods || [];
      window.GraveGainMods.push({ name: MOD_NAME, version: VERSION, init: init });
    } catch (_) { /* registry optional */ }
    try { init(); } catch (_) { /* boot optional */ }
  } catch (_) { /* never throw */ }
})();
