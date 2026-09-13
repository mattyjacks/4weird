/* GraveGain loot drops (lane E14).
 *
 * BIG shared loot system for all three GraveGain games: 30+ DROP weapons
 * across rarity tiers (common -> mythic) with affixes (flaming, vampiric,
 * echoing, ...), floor-scaled drop tables per game, a pity timer, and
 * best-effort drop-routing hooks per game.
 *
 * Scope note: class/race STARTER weapons are owned by sibling lanes
 * (gravegain3d-arsenal.js lane G8, gravegain-arsenal-2d1d.js lane G9) and are
 * NOT duplicated here. Everything in this file is LOOT — mid-run / floor
 * drops rolled via `roll()`. Side-quest lane (E11) may consume
 * `window.GraveGainLoot.roll/table` when present.
 *
 * Age bands: entries with `adultOnly: true` are drug-themed and are WITHHELD
 * (excluded from tables and rolls) unless
 * `window.GraveGainAgeBands.isDrugsAllowed()` returns true. Fallback chain:
 * GraveGainAgeBands.isDrugsAllowed() > window.FourweirdContentMode.drugsAllowed
 * > fail-closed (withhold). Never filter-leak adult items to kid/teen.
 *
 * Vanilla JS, idempotent (`if (window.GraveGainLoot) return;`),
 * no imports — loaded via script tag.
 */
(function () {
  'use strict';
  if (window.GraveGainLoot) return;

  var VERSION = '1.0.0';

  // ---------- rarity tiers (common -> mythic) ----------
  var RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
  var RARITY_RANK = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };
  var RARITY_COLOR = {
    common: '#9ca3af', uncommon: '#22c55e', rare: '#3b82f6',
    epic: '#a855f7', legendary: '#f59e0b', mythic: '#ef4444'
  };
  // Base drop weights (out of ~100) at floor 0.
  var BASE_WEIGHTS = { common: 52, uncommon: 26, rare: 13, epic: 6, legendary: 2, mythic: 1 };
  // Max affix slots per rarity.
  var AFFIX_SLOTS = { common: 0, uncommon: 1, rare: 1, epic: 2, legendary: 2, mythic: 3 };

  // ---------- age-band gate ----------
  function drugsAllowed() {
    try {
      var ab = window.GraveGainAgeBands;
      if (ab && typeof ab.isDrugsAllowed === 'function') return !!ab.isDrugsAllowed();
    } catch (e) { /* fall through */ }
    try {
      var g = window.FourweirdContentMode;
      if (g && typeof g.drugsAllowed !== 'undefined') return !!g.drugsAllowed;
    } catch (e2) { /* fall through */ }
    return false; // fail-closed: withhold adult-only loot
  }

  // ---------- drop weapons (LOOT ONLY — no starters) ----------
  // Stat shape mirrors the arsenal siblings (damage / attackSpeed / range are
  // suggestions for G10 wiring; effect is a wiring-facing hook tag).
  // NOTE: count check — 6 common + 6 uncommon + 6 rare + 6 epic + 5 legendary + 3 mythic = 32.
  var WEAPONS = [
    // ----- common (6) -----
    { id: 'loot-rusty-shiv', name: 'Rusty Shiv', emoji: '🔪', rarity: 'common', damage: 8, attackSpeed: 0.22, range: 46, effect: 'bleed-chip', flavor: 'Grave-yard find. Still sharp enough.' },
    { id: 'loot-mossy-club', name: 'Mossy Club', emoji: '🪵', rarity: 'common', damage: 11, attackSpeed: 0.42, range: 58, effect: 'knock-chip', flavor: 'Fallen branch, grave-moss grip.' },
    { id: 'loot-cracked-sling', name: 'Cracked Sling', emoji: '🪨', rarity: 'common', damage: 7, attackSpeed: 0.18, range: 320, effect: 'stone-chip', flavor: 'Cracked leather, steady stones.' },
    { id: 'loot-tomb-nail', name: 'Tomb Nail', emoji: '📌', rarity: 'common', damage: 9, attackSpeed: 0.25, range: 52, effect: 'pierce-chip', flavor: 'Coffin nail, hammered straight.' },
    { id: 'loot-pale-torch', name: 'Pale Torch', emoji: '🕯️', rarity: 'common', damage: 6, attackSpeed: 0.20, range: 60, effect: 'flicker-chip', flavor: 'Guttering flame; husks flinch from it.' },
    { id: 'loot-wormpick', name: 'Wormpick', emoji: '⛏️', rarity: 'common', damage: 10, attackSpeed: 0.36, range: 55, effect: 'dig-chip', flavor: 'Gardener-issue; good for roots and ribs.' },
    // ----- uncommon (6) -----
    { id: 'loot-marrow-knife', name: 'Marrow Knife', emoji: '🦴', rarity: 'uncommon', damage: 14, attackSpeed: 0.22, range: 50, effect: 'bleed-cut', flavor: 'Carved from a warden\'s fallen foe.' },
    { id: 'loot-ember-hatchet', name: 'Ember Hatchet', emoji: '🪓', rarity: 'uncommon', damage: 18, attackSpeed: 0.38, range: 60, effect: 'burn-chip', flavor: 'Still warm from the forge below.' },
    { id: 'loot-choir-bell', name: 'Choir Bell', emoji: '🔔', rarity: 'uncommon', damage: 13, attackSpeed: 0.30, range: 260, effect: 'daze-ring', flavor: 'Cracked chapel bell; its ring dazes swarms.' },
    { id: 'loot-grave-lantern', name: 'Grave Lantern', emoji: '🏮', rarity: 'uncommon', damage: 12, attackSpeed: 0.26, range: 300, effect: 'wisp-burn', flavor: 'Ghost-light in a jar; burns what it touches.' },
    { id: 'loot-thorn-whip', name: 'Thorn Whip', emoji: '🌵', rarity: 'uncommon', damage: 15, attackSpeed: 0.24, range: 120, effect: 'snare-cut', flavor: 'Briar cut at midnight; it remembers.' },
    { id: 'loot-ashen-bow', name: 'Ashen Bow', emoji: '🏹', rarity: 'uncommon', damage: 16, attackSpeed: 0.34, range: 420, effect: 'ash-volley', flavor: 'Yew blackened by dragon weather.' },
    // ----- rare (6) -----
    { id: 'loot-widows-fang', name: "Widow's Fang", emoji: '🕷️', rarity: 'rare', damage: 24, attackSpeed: 0.22, range: 56, effect: 'venom-bite', flavor: 'A duelist\'s stiletto, venom-kept.' },
    { id: 'loot-rimebrand', name: 'Rimebrand', emoji: '❄️', rarity: 'rare', damage: 26, attackSpeed: 0.36, range: 66, effect: 'frost-cleave', flavor: 'Quenched in glacier melt; slows what it cuts.' },
    { id: 'loot-carrion-censer', name: 'Carrion Censer', emoji: '⚱️', rarity: 'rare', damage: 22, attackSpeed: 0.30, range: 200, effect: 'plague-swing', flavor: 'Swing low; the smoke does the rest.' },
    { id: 'loot-oathkeeper', name: 'Oathkeeper', emoji: '⚔️', rarity: 'rare', damage: 28, attackSpeed: 0.40, range: 70, effect: 'oath-slam', flavor: 'Sworn on a grave; hits harder for the fallen.' },
    { id: 'loot-hollow-flute', name: 'Hollow Flute', emoji: '🪈', rarity: 'rare', damage: 20, attackSpeed: 0.24, range: 340, effect: 'dirge-wave', flavor: 'Play the rest-note; the dead dance.' },
    { id: 'loot-gallows-rope', name: 'Gallows Rope', emoji: '🪢', rarity: 'rare', damage: 23, attackSpeed: 0.28, range: 140, effect: 'hang-snare', flavor: 'It remembers every neck. Pulls packs together.' },
    // ----- epic (6) -----
    { id: 'loot-bloodhymn', name: 'Bloodhymn', emoji: '🎻', rarity: 'epic', damage: 36, attackSpeed: 0.30, range: 380, effect: 'lifesteal-dirge', flavor: 'Each note drinks a little back for you.' },
    { id: 'loot-eclipse-maul', name: 'Eclipse Maul', emoji: '🌑', rarity: 'epic', damage: 44, attackSpeed: 0.52, range: 80, effect: 'eclipse-slam', flavor: 'Forged during a burial eclipse; slam blots the light.' },
    { id: 'loot-seraph-pin', name: 'Seraph Pin', emoji: '🪡', rarity: 'epic', damage: 32, attackSpeed: 0.16, range: 480, effect: 'needle-saint', flavor: 'A saint\'s needle; a hundred strikes a second.' },
    { id: 'loot-mire-crown', name: 'Mire Crown', emoji: '👑', rarity: 'epic', damage: 34, attackSpeed: 0.34, range: 300, effect: 'bog-command', flavor: 'The mire kneels; slowed foes take double.' },
    { id: 'loot-griefbellows', name: 'Griefbellows', emoji: '🌬️', rarity: 'epic', damage: 38, attackSpeed: 0.44, range: 240, effect: 'wail-cone', flavor: 'Squeeze; the crypt exhales with you.' },
    { id: 'loot-vowbreaker', name: 'Vowbreaker', emoji: '💔', rarity: 'epic', damage: 40, attackSpeed: 0.38, range: 72, effect: 'oath-shatter', flavor: 'Breaks wards, shields, and promises.' },
    // ----- legendary (5, incl. 1 adult-only) -----
    { id: 'loot-kingsfall-shard', name: 'Kingsfall Shard', emoji: '💎', rarity: 'legendary', damage: 55, attackSpeed: 0.42, range: 76, effect: 'regal-execute', flavor: 'A splinter of the fallen throne; finishes the weak.' },
    { id: 'loot-necrotor', name: 'Necrotor', emoji: '💀', rarity: 'legendary', damage: 52, attackSpeed: 0.36, range: 400, effect: 'raise-echo', flavor: 'Every kill echoes once more as a wisp.' },
    { id: 'loot-titanlace', name: 'Titanlace', emoji: '🕸️', rarity: 'legendary', damage: 48, attackSpeed: 0.26, range: 180, effect: 'titan-snare', flavor: 'Woven from a titan\'s shroud; roots bosses briefly.' },
    { id: 'loot-first-dawn', name: 'First Dawn', emoji: '🌅', rarity: 'legendary', damage: 50, attackSpeed: 0.32, range: 360, effect: 'dawn-purge', flavor: 'Sunlight, bottled at the world\'s first morning.' },
    { id: 'loot-poppy-dirge', name: 'Poppy Dirge Pipe', emoji: '🌺', rarity: 'legendary', damage: 54, attackSpeed: 0.30, range: 320, effect: 'opiate-haze', flavor: 'Sweet smoke; foes doze while you reap.', adultOnly: true },
    // ----- mythic (3, incl. 1 adult-only) -----
    { id: 'loot-gravegain-heart', name: 'GraveGain Heart', emoji: '❤️‍🔥', rarity: 'mythic', damage: 80, attackSpeed: 0.40, range: 120, effect: 'heart-nova', flavor: 'The dungeon\'s own pulse, beating in your hand.' },
    { id: 'loot-unwritten-end', name: 'Unwritten End', emoji: '📖', rarity: 'mythic', damage: 75, attackSpeed: 0.28, range: 440, effect: 'erase-line', flavor: 'A page torn from the last chapter. Deletes foes.' },
    { id: 'loot-brewmasters-cask', name: "Brewmaster's Cask", emoji: '🍺', rarity: 'mythic', damage: 78, attackSpeed: 0.46, range: 200, effect: 'cask-tide', flavor: 'Aged in a haunted cellar; a tidal wave of cheer.', adultOnly: true }
  ];

  // ---------- affixes ----------
  // dmgMul scales rolled damage; effect tags compose onto the weapon effect.
  var AFFIXES = [
    { id: 'flaming', name: 'Flaming', dmgMul: 1.15, tag: 'burn', text: 'wreathes strikes in flame' },
    { id: 'vampiric', name: 'Vampiric', dmgMul: 1.05, tag: 'lifesteal', text: 'drinks back a sliver of each kill' },
    { id: 'echoing', name: 'Echoing', dmgMul: 1.10, tag: 'echo-hit', text: 'each strike lands twice, the second fainter' },
    { id: 'frostbitten', name: 'Frostbitten', dmgMul: 1.10, tag: 'slow', text: 'chills foes, slowing their advance' },
    { id: 'venomous', name: 'Venomous', dmgMul: 1.12, tag: 'poison', text: 'leaves a lingering venom' },
    { id: 'thundering', name: 'Thundering', dmgMul: 1.18, tag: 'shock-splash', text: 'cracks like a storm on impact' },
    { id: 'greedy', name: 'Greedy', dmgMul: 0.95, tag: 'bonus-gold', text: 'foes drop richer spoils' },
    { id: 'swift', name: 'Swift', dmgMul: 1.0, tag: 'attack-speed', text: 'sings faster in the hand' },
    { id: 'bulwark', name: 'Bulwark', dmgMul: 1.0, tag: 'guard', text: 'turns a fraction of blows aside' },
    { id: 'soulbound', name: 'Soulbound', dmgMul: 1.20, tag: 'execute', text: 'hungers for finishing blows' },
    { id: 'lanternlit', name: 'Lanternlit', dmgMul: 1.05, tag: 'reveal', text: 'ghost-light exposes hidden foes' },
    { id: 'gravechill', name: 'Gravechill', dmgMul: 1.08, tag: 'fear', text: 'the crypt\'s dread walks with it' }
  ];
  var AFFIX_BY_ID = {};
  for (var ai = 0; ai < AFFIXES.length; ai++) AFFIX_BY_ID[AFFIXES[ai].id] = AFFIXES[ai];

  // ---------- helpers ----------
  function clampFloor(f) {
    f = Number(f);
    if (!isFinite(f) || f < 0) return 0;
    return Math.min(Math.floor(f), 99);
  }
  function weaponById(id) {
    for (var i = 0; i < WEAPONS.length; i++) if (WEAPONS[i].id === id) return WEAPONS[i];
    return null;
  }
  // Visible pool: adult-only entries withheld unless drugs are allowed.
  function visiblePool() {
    if (drugsAllowed()) return WEAPONS.slice();
    var out = [];
    for (var i = 0; i < WEAPONS.length; i++) {
      if (!WEAPONS[i].adultOnly) out.push(WEAPONS[i]);
    }
    return out;
  }

  // Floor-scaled rarity weights, per game. Deeper floors shift mass upward;
  // each game biases slightly toward its own pace (3d: endgame-heavy,
  // 2d: mid-weighted, 1d: flatter curve for short runs).
  var GAME_BIAS = {
    gravegain3d: { epic: 1.25, legendary: 1.35, mythic: 1.5 },
    gravegain2d: { rare: 1.2, epic: 1.15, legendary: 1.1 },
    gravegain1d: { common: 1.15, uncommon: 1.1, mythic: 0.8 }
  };
  function weightsFor(slug, floor) {
    floor = clampFloor(floor);
    var bias = GAME_BIAS[slug] || {};
    var depth = Math.min(floor, 30) / 30; // 0..1
    var w = {};
    for (var r = 0; r < RARITIES.length; r++) {
      var key = RARITIES[r];
      var base = BASE_WEIGHTS[key];
      // Shift: bleed common/uncommon mass into rare+ as depth grows.
      var shift = 1;
      var rank = RARITY_RANK[key];
      if (rank <= 1) shift = 1 - depth * 0.55;
      else if (rank === 2) shift = 1 + depth * 0.35;
      else shift = 1 + depth * (0.9 + rank * 0.35);
      var b = (typeof bias[key] === 'number') ? bias[key] : 1;
      w[key] = Math.max(base * shift * b, 0.001);
    }
    return w;
  }

  // Drop table: rarity weights + eligible pool for a game + floor.
  // Consumed by the side-quest lane when present.
  function table(slug, floor) {
    slug = String(slug || 'gravegain3d');
    floor = clampFloor(floor);
    return { slug: slug, floor: floor, weights: weightsFor(slug, floor), pool: visiblePool() };
  }

  function pickRarity(weights, rng) {
    var total = 0, k;
    for (k in weights) total += weights[k];
    var x = rng() * total;
    for (var i = 0; i < RARITIES.length; i++) {
      x -= weights[RARITIES[i]] || 0;
      if (x <= 0) return RARITIES[i];
    }
    return 'common';
  }
  function pickAffixes(rarity, rng) {
    var slots = AFFIX_SLOTS[rarity] || 0;
    if (!slots) return [];
    var bag = AFFIXES.slice();
    // Fisher-Yates with injected rng.
    for (var i = bag.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = bag[i]; bag[i] = bag[j]; bag[j] = t;
    }
    // Commons carry no affixes; higher tiers roll 1..slots affixes.
    var n = 1 + Math.floor(rng() * slots);
    return bag.slice(0, Math.min(n, slots));
  }

  // ---------- pity timer ----------
  // Counts consecutive rolls below epic per slug; at PITY_MAX the next roll
  // is forced to epic-or-better. Kept in memory; best-effort localStorage
  // persistence (guarded — never throws, never required).
  var PITY_MAX = 25;
  var pity = { gravegain3d: 0, gravegain2d: 0, gravegain1d: 0 };
  try {
    var saved = window.localStorage ? window.localStorage.getItem('gravegain_loot_pity_v1') : null;
    if (saved) {
      var parsed = JSON.parse(saved);
      for (var pk in pity) if (typeof parsed[pk] === 'number' && parsed[pk] >= 0) pity[pk] = Math.min(Math.floor(parsed[pk]), PITY_MAX);
    }
  } catch (e) { /* storage unavailable — memory only */ }
  function savePity() {
    try {
      if (window.localStorage) window.localStorage.setItem('gravegain_loot_pity_v1', JSON.stringify(pity));
    } catch (e) { /* ignore */ }
  }
  function pityFor(slug) { return pity[slug] || 0; }

  // ---------- roll ----------
  // roll(slug, opts?) -> drop weapon instance (base stats + rolled affixes).
  // opts: { floor, rng (fn -> [0,1)), luck (extra epic+ weight mult), noPity }
  function roll(slug, opts) {
    slug = String(slug || 'gravegain3d');
    opts = opts || {};
    var floor = clampFloor(opts.floor);
    var rng = (typeof opts.rng === 'function') ? opts.rng : Math.random;
    var pool = visiblePool();
    if (!pool.length) return null;

    var weights = weightsFor(slug, floor);
    if (typeof opts.luck === 'number' && opts.luck > 0) {
      weights.epic *= (1 + opts.luck);
      weights.legendary *= (1 + opts.luck);
      weights.mythic *= (1 + opts.luck);
    }
    var pityDue = !opts.noPity && pityFor(slug) >= PITY_MAX;
    var rarity = pickRarity(weights, rng);
    if (pityDue && RARITY_RANK[rarity] < RARITY_RANK.epic) {
      // Force epic-or-better: re-pick among epic/legendary/mythic weights.
      var hi = { epic: weights.epic, legendary: weights.legendary, mythic: weights.mythic };
      rarity = pickRarity(hi, rng);
      if (RARITY_RANK[rarity] < RARITY_RANK.epic) rarity = 'epic';
    }

    // Update pity.
    if (!opts.noPity) {
      if (!(slug in pity)) pity[slug] = 0;
      pity[slug] = (RARITY_RANK[rarity] >= RARITY_RANK.epic) ? 0 : (pity[slug] + 1);
      savePity();
    }

    // Pick a base weapon of the rolled rarity (fall back to nearest tier
    // if age gating emptied it).
    var tier = [];
    for (var i = 0; i < pool.length; i++) if (pool[i].rarity === rarity) tier.push(pool[i]);
    if (!tier.length) tier = pool;
    var base = tier[Math.floor(rng() * tier.length)] || pool[0];

    var affixes = pickAffixes(base.rarity, rng);
    var dmgMul = 1;
    var tags = [];
    for (var a = 0; a < affixes.length; a++) { dmgMul *= affixes[a].dmgMul; tags.push(affixes[a].tag); }
    var scale = 1 + floor * 0.06;
    var prefix = affixes.length ? affixes[0].name + ' ' : '';

    var drop = {
      id: base.id,
      baseId: base.id,
      name: prefix + base.name,
      baseName: base.name,
      emoji: base.emoji,
      rarity: base.rarity,
      rarityColor: RARITY_COLOR[base.rarity] || '#fff',
      damage: Math.round(base.damage * scale * dmgMul),
      baseDamage: base.damage,
      floor: floor,
      attackSpeed: base.attackSpeed,
      range: base.range,
      effect: affixes.length ? (base.effect + '+' + tags.join('+')) : base.effect,
      baseEffect: base.effect,
      affixes: affixes.map(function (x) { return x.id; }),
      affixNames: affixes.map(function (x) { return x.name; }),
      flavor: base.flavor,
      game: slug,
      pityDue: pityDue
    };
    return drop;
  }

  // ---------- per-game drop routing hooks (best-effort) ----------
  // Each hook tries to deliver a rolled drop into the live game instance
  // when one is present; otherwise it returns the drop untouched so callers
  // (quests, events, debug) can carry it. Never throws, never creates globals.
  function deliverTo(obj, drop) {
    try {
      if (!obj || typeof obj !== 'object') return false;
      if (Array.isArray(obj.loot)) { obj.loot.push(drop); return true; }
      if (Array.isArray(obj.inventory)) { obj.inventory.push(drop); return true; }
      if (obj.player && typeof obj.player === 'object') {
        if (Array.isArray(obj.player.loot)) { obj.player.loot.push(drop); return true; }
        if (Array.isArray(obj.player.inventory)) { obj.player.inventory.push(drop); return true; }
      }
      if (typeof obj.onLootDrop === 'function') { obj.onLootDrop(drop); return true; }
    } catch (e) { /* best-effort */ }
    return false;
  }
  function liveGame3D() {
    try {
      return window.GraveGainGame || window.GraveGain3D || window.GG3D || null;
    } catch (e) { return null; }
  }
  function liveGame2D() {
    try {
      return window.GraveGain2D || window.GG2D || window.GraveGainGame2D || null;
    } catch (e) { return null; }
  }
  function liveGame1D() {
    try {
      return window.GraveGain1D || window.GG1D || window.GraveGainGame1D || null;
    } catch (e) { return null; }
  }
  var hooks = {
    gravegain3d: function (drop, ctx) {
      var d = drop || roll('gravegain3d', ctx);
      if (d) deliverTo(liveGame3D(), d);
      return d;
    },
    gravegain2d: function (drop, ctx) {
      var d = drop || roll('gravegain2d', ctx);
      if (d) deliverTo(liveGame2D(), d);
      return d;
    },
    gravegain1d: function (drop, ctx) {
      var d = drop || roll('gravegain1d', ctx);
      if (d) deliverTo(liveGame1D(), d);
      return d;
    }
  };
  // routeDrop(slug, ctx?): roll + deliver in one call. Safe no-op shape when
  // no live game is present (returns the rolled drop for the caller to keep).
  function routeDrop(slug, ctx) {
    try {
      var fn = hooks[String(slug || 'gravegain3d')] || hooks.gravegain3d;
      return fn(null, ctx);
    } catch (e) { return null; }
  }

  // ---------- public API ----------
  var api = {
    VERSION: VERSION,
    RARITIES: RARITIES.slice(),
    WEAPONS: WEAPONS,
    AFFIXES: AFFIXES,
    PITY_MAX: PITY_MAX,
    roll: roll,
    table: table,
    weightsFor: weightsFor,
    weaponById: weaponById,
    affixById: function (id) { return AFFIX_BY_ID[id] || null; },
    isDrugsAllowed: drugsAllowed,
    pityFor: pityFor,
    resetPity: function (slug) {
      if (slug) pity[String(slug)] = 0; else for (var k in pity) pity[k] = 0;
      savePity();
    },
    hooks: hooks,
    routeDrop: routeDrop
  };
  window.GraveGainLoot = api;

  window.GraveGainMods = window.GraveGainMods || [];
  window.GraveGainMods.push({ name: 'gravegain-loot', version: VERSION, init: function () { return api; } });
})();
