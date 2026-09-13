/* GraveGain3D arsenal (lane G8).
 *
 * Distinct starting weapon for EVERY class x race combo (4 classes x 4 races
 * = 16 starters) + 12 mid/endgame weapons, registered into the game's weapon
 * factory / loot at runtime. No engine edits: everything is additive and
 * best-effort (try/catch, late-global polling, graceful degrade).
 *
 * Age bands: kid/teen NEVER see drug-themed weapons. Mode resolution:
 *   window.GraveGainAgeBands (getMode() | .mode | .current) when present,
 *   else window.FourweirdContentMode (.mode / .drugsAllowed),
 *   else neutral fallback ('teen'). Adult-only entries carry
 *   `adultOnly: true` + a neutral `kidName`; getStarter()/getWeapon() and the
 *   loot table resolve the safe name automatically.
 *
 * Vanilla JS, idempotent (`if (window.GraveGain3DArsenal) return;`),
 * no imports — loaded via script tag.
 */
(function () {
  'use strict';
  if (window.GraveGain3DArsenal) return;

  var VERSION = '1.0.0';

  // ---------- age-band resolution ----------
  function resolveMode() {
    try {
      var ab = window.GraveGainAgeBands;
      if (ab) {
        if (typeof ab.getMode === 'function') {
          var m = String(ab.getMode() || '').toLowerCase();
          if (m === 'kid' || m === 'teen' || m === 'all') return m;
        }
        if (typeof ab.mode === 'string') {
          var m2 = ab.mode.toLowerCase();
          if (m2 === 'kid' || m2 === 'teen' || m2 === 'all') return m2;
        }
        if (typeof ab.current === 'string') {
          var m3 = ab.current.toLowerCase();
          if (m3 === 'kid' || m3 === 'teen' || m3 === 'all') return m3;
        }
      }
    } catch (e) { /* fall through */ }
    try {
      var g = window.FourweirdContentMode;
      if (g && typeof g.mode === 'string') {
        var m4 = g.mode.toLowerCase();
        if (m4 === 'kid' || m4 === 'teen' || m4 === 'all') return m4;
      }
    } catch (e2) { /* fall through */ }
    return 'teen';
  }

  function drugsAllowed(mode) {
    try {
      var g = window.FourweirdContentMode;
      if (g && typeof g.drugsAllowed === 'boolean') return g.drugsAllowed;
    } catch (e) { /* fall through */ }
    return mode === 'all';
  }

  // Public display name: neutral alias for kid/teen on adult-only entries.
  function displayName(entry, mode) {
    try {
      if (entry && entry.adultOnly && (mode === 'kid' || mode === 'teen')) {
        return entry.kidName || entry.neutralName || 'Ember Practice Arm';
      }
      return entry ? entry.name : '';
    } catch (e) { return entry ? entry.name : ''; }
  }

  // ---------- 16 starters: class x race ----------
  // Tuned around engine base stats (warrior 20/0.28, mage 26/0.38,
  // tank 32/0.45, support 14/0.18). attackSpeed = seconds between hits.
  var STARTERS = {
    'warrior:human': { id: 'w-human-vanguard', name: 'Vanguard Longsword & Kite Shield', emoji: '⚔️', damage: 20, attackSpeed: 0.28, range: 68, critChance: 0.15, critMult: 2.0, effect: 'parry-riposte', flavor: 'Balanced shield line; clean ripostes after parry.' },
    'warrior:elf': { id: 'w-elf-moonpetal', name: 'Moonpetal Duelblade', emoji: '🌙', damage: 16, attackSpeed: 0.20, range: 64, critChance: 0.28, critMult: 2.1, effect: 'swift-flurry', flavor: 'Elven grace: blinding flurry, high crit, light cuts.' },
    'warrior:dwarf': { id: 'w-dwarf-forgehold', name: 'Forgehold Cleaver', emoji: '🔨', damage: 27, attackSpeed: 0.36, range: 62, critChance: 0.10, critMult: 2.0, effect: 'knockback', flavor: 'Dwarven forge-weight; each chop shoves foes back.' },
    'warrior:orc': { id: 'w-orc-bloodtusk', name: 'Bloodtusk Reaver', emoji: '🩸', damage: 23, attackSpeed: 0.30, range: 66, critChance: 0.18, critMult: 2.3, effect: 'rage-bite', flavor: 'Orcish hunger: hits harder as Rage builds.' },
    'tank:human': { id: 't-human-bulwark', name: 'Bulwark Warhammer', emoji: '🛡️', damage: 32, attackSpeed: 0.45, range: 75, critChance: 0.10, critMult: 1.8, effect: 'block-bash', flavor: 'Shield-wall doctrine; blocked hits charge a shield bash.' },
    'tank:elf': { id: 't-elf-thornward', name: 'Thornward Aegis Maul', emoji: '🌿', damage: 27, attackSpeed: 0.40, range: 72, critChance: 0.12, critMult: 1.8, effect: 'regen-bark', flavor: 'Living bark plate; slow self-mending between blocks.' },
    'tank:dwarf': { id: 't-dwarf-stoneheart', name: 'Stoneheart Siege Hammer', emoji: '🪨', damage: 38, attackSpeed: 0.55, range: 78, critChance: 0.08, critMult: 1.9, effect: 'seismic-slam', flavor: 'Siege-born; ground-shaking slams, huge knockback.' },
    'tank:orc': { id: 't-orc-skullcrusher', name: 'Skullcrusher Totem', emoji: '💀', damage: 34, attackSpeed: 0.48, range: 74, critChance: 0.14, critMult: 2.0, effect: 'rage-burst', flavor: 'War-totem; damage taken feeds explosive bursts.' },
    'support:human': { id: 's-human-fieldmedic', name: 'Field Medic Chem-Sprayer', emoji: '💉', damage: 14, attackSpeed: 0.18, range: 400, critChance: 0.12, critMult: 1.7, effect: 'heal-dart', flavor: 'Frontline chemist; darts that mend allies, melt foes.' },
    'support:elf': { id: 's-elf-sporewhisper', name: 'Sporewhisper Remedy Gun', emoji: '🍃', damage: 12, attackSpeed: 0.16, range: 380, critChance: 0.14, critMult: 1.7, effect: 'regen-mist', flavor: 'Sylvan spores; lingering mist that knits wounds.' },
    'support:dwarf': { id: 's-dwarf-brewmaster', name: 'Brewmaster Tonic Launcher', emoji: '🍺', damage: 16, attackSpeed: 0.22, range: 340, critChance: 0.10, critMult: 1.8, effect: 'tonic-lob', flavor: 'Stout alchemy; arcing tonic flasks, splash heal.' },
    'support:orc': { id: 's-orc-plaguefang', name: 'Plaguefang Injector', emoji: '☠️', damage: 15, attackSpeed: 0.19, range: 360, critChance: 0.13, critMult: 1.9, effect: 'toxic-mist', flavor: 'Venom doctrine; toxic clouds that wither packs.' },
    'mage:human': { id: 'm-human-apprentice', name: 'Astral Apprentice Staff', emoji: '✨', damage: 26, attackSpeed: 0.38, range: 450, critChance: 0.20, critMult: 2.2, effect: 'homing-bolt', flavor: 'Star-chart academy issue; reliable homing bolts.' },
    'mage:elf': { id: 'm-elf-starleaf', name: 'Starleaf Archstaff', emoji: '🌟', damage: 23, attackSpeed: 0.32, range: 470, critChance: 0.24, critMult: 2.2, effect: 'frost-nova', flavor: 'Spellweaver heirloom; chilling bolts, fast weave.' },
    'mage:dwarf': { id: 'm-dwarf-geomace', name: 'Runecarved Geomace', emoji: '⛰️', damage: 31, attackSpeed: 0.46, range: 380, critChance: 0.15, critMult: 2.4, effect: 'meteor-splash', flavor: 'Rune-hewn stone; slow slams with splash shock.' },
    'mage:orc': { id: 'm-orc-hellsnarl', name: 'Hellsnarl Hex Rod', emoji: '🔥', damage: 28, attackSpeed: 0.36, range: 420, critChance: 0.22, critMult: 2.3, effect: 'burn-hex', flavor: 'Berserker hexcraft; bolts that ignite and enrage.' }
  };

  // ---------- 12+ mid/endgame weapons ----------
  // tier: 'mid' | 'end'. adultOnly entries are gated (neutral alias for kid/teen).
  var WEAPONS = [
    { id: 'mid-frostbrand', name: 'Frostbrand Greatblade', emoji: '❄️', tier: 'mid', damage: 34, attackSpeed: 0.34, range: 70, critChance: 0.18, critMult: 2.1, effect: 'chill-cleave', flavor: 'Mid-game cleaver; chills packs, slows charges.' },
    { id: 'mid-emberrepeater', name: 'Ember Repeater Gun', emoji: '🔥', tier: 'mid', damage: 20, attackSpeed: 0.14, range: 420, critChance: 0.16, critMult: 1.8, effect: 'ignite-spray', flavor: 'Rapid spark-sprayer; stacks burn on bosses.' },
    { id: 'mid-thundermaul', name: 'Thundercrack Maul', emoji: '⚡', tier: 'mid', damage: 44, attackSpeed: 0.52, range: 76, critChance: 0.12, critMult: 2.0, effect: 'chain-zap', flavor: 'Storm-forged; arcs lightning to two nearby foes.' },
    { id: 'mid-viperstaff', name: 'Vipercoil Staff', emoji: '🐍', tier: 'mid', damage: 32, attackSpeed: 0.34, range: 440, critChance: 0.20, critMult: 2.2, effect: 'venom-bolt', flavor: 'Serpent-channel; bolts that poison over time.' },
    { id: 'mid-oathshield', name: 'Oathkeeper Blade & Lantern Shield', emoji: '🏮', tier: 'mid', damage: 28, attackSpeed: 0.30, range: 68, critChance: 0.16, critMult: 2.0, effect: 'ward-bulwark', flavor: 'Lantern-lit vanguard set; stronger blocks, dawn riposte.' },
    { id: 'mid-galeshot', name: 'Galefeather Scattergun', emoji: '🌪️', tier: 'mid', damage: 18, attackSpeed: 0.24, range: 360, critChance: 0.22, critMult: 1.9, effect: 'scatter-gust', flavor: 'Wind loaded; spread shot that shoves crowds back.' },
    { id: 'mid-embercenser', name: 'Hempfire Dream Censer', kidName: 'Emberlight Dream Censer', neutralName: 'Emberlight Dream Censer', emoji: '💨', tier: 'mid', adultOnly: true, damage: 30, attackSpeed: 0.36, range: 400, critChance: 0.18, critMult: 2.0, effect: 'drowse-cloud', flavor: 'Botany-craft censer (adult); drowsing clouds on all mode.' },
    { id: 'end-doombringer', name: 'Doombringer Worldsplitter', emoji: '🌑', tier: 'end', damage: 68, attackSpeed: 0.50, range: 82, critChance: 0.20, critMult: 2.5, effect: 'execute-eclipse', flavor: 'Endgame executioner; eclipse shockwaves finish the weak.' },
    { id: 'end-starforge', name: 'Starforge Comet Lance', emoji: '☄️', tier: 'end', damage: 55, attackSpeed: 0.30, range: 480, critChance: 0.26, critMult: 2.4, effect: 'meteor-pierce', flavor: 'Comet-tipped lance; piercing bolts call meteor shards.' },
    { id: 'end-tidecaller', name: 'Tidecaller Abyss Trident', emoji: '🌊', tier: 'end', damage: 48, attackSpeed: 0.34, range: 74, critChance: 0.22, critMult: 2.3, effect: 'tide-vortex', flavor: 'Abyssal trident; whirlpools drag packs together.' },
    { id: 'end-sunmantle', name: 'Sunmantle Dawn edge', emoji: '🌅', tier: 'end', damage: 52, attackSpeed: 0.28, range: 72, critChance: 0.30, critMult: 2.4, effect: 'radiant-flurry', flavor: 'Dawn-forged; blinding flurry with radiant burn.' },
    { id: 'end-gravechoir', name: 'Gravechoir Dirge Organ', emoji: '🎹', tier: 'end', damage: 44, attackSpeed: 0.40, range: 460, critChance: 0.18, critMult: 2.6, effect: 'dirge-nova', flavor: 'Necropolis organ; chord novas that fear the horde.' },
    { id: 'end-sporefather', name: 'Sporefather Pipe Organ', kidName: 'Sporefather Mist Organ', neutralName: 'Sporefather Mist Organ', emoji: '🍄', tier: 'end', adultOnly: true, damage: 46, attackSpeed: 0.38, range: 430, critChance: 0.20, critMult: 2.3, effect: 'spore-bloom', flavor: 'Mycology relic (adult); blooming spore novas on all mode.' }
  ];

  var WEAPON_BY_ID = {};
  try {
    WEAPONS.forEach(function (w) { WEAPON_BY_ID[w.id] = w; });
  } catch (e) { /* noop */ }

  function normKey(classType, race) {
    try {
      return String(classType || '').toLowerCase() + ':' + String(race || '').toLowerCase();
    } catch (e) { return ':'; }
  }

  function getStarter(classType, race, mode) {
    var m = mode || resolveMode();
    var key = normKey(classType, race);
    var entry = STARTERS[key] || STARTERS['warrior:human'];
    var out = {};
    try {
      for (var k in entry) { if (Object.prototype.hasOwnProperty.call(entry, k)) out[k] = entry[k]; }
      out.combo = key;
      out.displayName = displayName(entry, m);
      out.mode = m;
    } catch (e) { return entry; }
    return out;
  }

  function getWeapon(id, mode) {
    var m = mode || resolveMode();
    var entry = WEAPON_BY_ID[id];
    if (!entry) return null;
    var out = {};
    try {
      for (var k in entry) { if (Object.prototype.hasOwnProperty.call(entry, k)) out[k] = entry[k]; }
      out.displayName = displayName(entry, m);
      out.mode = m;
      if (entry.adultOnly && !drugsAllowed(m)) out.effect = 'ember-cloud';
    } catch (e) { return entry; }
    return out;
  }

  // Loot table (weights) for runtime consumers; adult-only rows are filtered
  // per current mode by lootTable().
  var LOOT_ROWS = [
    { id: 'mid-frostbrand', weight: 10 },
    { id: 'mid-emberrepeater', weight: 10 },
    { id: 'mid-thundermaul', weight: 9 },
    { id: 'mid-viperstaff', weight: 9 },
    { id: 'mid-oathshield', weight: 8 },
    { id: 'mid-galeshot', weight: 8 },
    { id: 'mid-embercenser', weight: 6, adultOnly: true },
    { id: 'end-doombringer', weight: 3 },
    { id: 'end-starforge', weight: 3 },
    { id: 'end-tidecaller', weight: 3 },
    { id: 'end-sunmantle', weight: 3 },
    { id: 'end-gravechoir', weight: 3 },
    { id: 'end-sporefather', weight: 2, adultOnly: true }
  ];

  function lootTable(mode) {
    var m = mode || resolveMode();
    var allow = drugsAllowed(m);
    var rows = [];
    try {
      LOOT_ROWS.forEach(function (r) {
        if (r.adultOnly && !allow) return;
        var w = getWeapon(r.id, m);
        if (w) rows.push({ id: r.id, weight: r.weight, weapon: w });
      });
    } catch (e) { /* return what we have */ }
    return rows;
  }

  function rollLoot(rng, mode) {
    try {
      var rows = lootTable(mode);
      if (!rows.length) return null;
      var total = 0, i;
      for (i = 0; i < rows.length; i++) total += rows[i].weight;
      var r = (typeof rng === 'function' ? rng() : Math.random()) * total;
      for (i = 0; i < rows.length; i++) {
        r -= rows[i].weight;
        if (r <= 0) return rows[i].weapon;
      }
      return rows[rows.length - 1].weapon;
    } catch (e) { return null; }
  }

  // ---------- runtime hooks (best-effort, additive only) ----------
  function hookGameData() {
    try {
      var gd = window.GraveGainGameData;
      if (gd && !gd.Arsenal) gd.Arsenal = api;
    } catch (e) { /* engine not loaded yet; poller retries */ }
  }

  function hookWeaponFactory() {
    try {
      var WF = window.GraveGainWeaponFactory;
      if (!WF || WF.__arsenalHooked) return;
      var orig = WF.buildWeapon;
      if (typeof orig !== 'function') return;
      // Accept (classType, raceOrOpts, maybeOpts): never breaks old callers.
      WF.buildWeapon = function (classType, raceOrOpts, maybeOpts) {
        var group;
        try {
          group = orig.call(this, classType);
        } catch (e) {
          try { group = orig(classType); } catch (e2) { return null; }
        }
        try {
          var race = null, weaponId = null;
          if (typeof raceOrOpts === 'string') race = raceOrOpts;
          else if (raceOrOpts && typeof raceOrOpts === 'object') {
            race = raceOrOpts.race || null;
            weaponId = raceOrOpts.weaponId || null;
          }
          if (maybeOpts && typeof maybeOpts === 'object' && maybeOpts.weaponId) weaponId = maybeOpts.weaponId;
          var starter = race ? getStarter(classType, race) : null;
          var w = weaponId ? getWeapon(weaponId) : null;
          var entry = w || starter;
          group = group || {};
          group.userData = group.userData || {};
          if (entry) {
            group.userData.arsenalId = entry.id;
            group.userData.arsenalName = entry.displayName || entry.name;
            group.userData.arsenalEmoji = entry.emoji;
            group.userData.arsenalEffect = entry.effect;
          } else {
            group.userData.arsenalId = 'stock:' + String(classType);
          }
          // Cosmetic gem tint for mage-line staves when the factory exposed one.
          if (group.gemTip && group.gemTip.material && entry && entry.emoji === '🌟') {
            try { group.gemTip.material.emissive.setHex(0x22d3ee); } catch (e3) { /* noop */ }
          }
        } catch (e4) { /* cosmetic only */ }
        return group;
      };
      WF.__arsenalHooked = true;
    } catch (e) { /* noop */ }
  }

  function hookLoot() {
    try {
      var LI = window.GraveGainLootItem;
      if (LI && !LI.__arsenalHooked) {
        // Tag weapon-kind drops with display metadata without changing
        // existing 'gold'/'potion' behavior.
        LI.__arsenalKinds = LI.__arsenalKinds || {};
        LI.__arsenalKinds.weapon = true;
        LI.__arsenalHooked = true;
      }
      // Expose a drop helper the runtime can call when it wants a weapon drop.
      if (!window.GraveGainArsenalDrop) {
        window.GraveGainArsenalDrop = function (x, y, opts) {
          try {
            var pick = rollLoot(opts && opts.rng, opts && opts.mode);
            if (!pick || !LI) return pick;
            var item = new LI(x, y, 'weapon', 1);
            item.weaponId = pick.id;
            item.label = (pick.displayName || pick.name) + ' ' + (pick.emoji || '');
            return item;
          } catch (e) { return null; }
        };
      }
    } catch (e) { /* noop */ }
  }

  function hookAll() {
    hookGameData();
    hookWeaponFactory();
    hookLoot();
  }

  var api = {
    VERSION: VERSION,
    starters: STARTERS,
    weapons: WEAPONS,
    getStarter: getStarter,
    getWeapon: getWeapon,
    lootTable: lootTable,
    rollLoot: rollLoot,
    resolveMode: resolveMode,
    init: hookAll
  };

  window.GraveGain3DArsenal = api;
  hookAll();

  // Late globals (engine scripts may load after this mod): bounded retries.
  try {
    var attempts = 0;
    var timer = window.setInterval(function () {
      try {
        attempts += 1;
        hookAll();
        var done = (!!window.GraveGainGameData) && (!!window.GraveGainWeaponFactory) && (!!window.GraveGainLootItem);
        if (done || attempts >= 40) window.clearInterval(timer);
      } catch (e) {
        if (attempts >= 40) { try { window.clearInterval(timer); } catch (e2) { /* noop */ } }
      }
    }, 500);
  } catch (e) { /* timers unavailable; direct hooks already ran */ }

  window.GraveGainMods = window.GraveGainMods || [];
  try {
    window.GraveGainMods.push({ name: 'gravegain3d-arsenal', version: VERSION, init: hookAll });
  } catch (e) { /* noop */ }
})();
