/* GraveGain 2D + 1D arsenal (lane G9).
 *
 * Distinct starting weapon for EVERY GraveGain2D class x race combo
 * (4 classes x 4 races = 16 starters, titles mirror game.js ClassTitles)
 * and for EVERY GraveGain1D class (3 starters mirroring game.js CLASSES),
 * plus 12 new mid/endgame weapons PER game, registered at runtime.
 * No bundle edits: everything is additive and best-effort (try/catch,
 * late-global polling, graceful degrade).
 *
 * Age bands: ALL names in this file are age-band-neutral (no drugs, no gore,
 * no blood). This file emits no particles, decals, or FX of its own — only
 * data tables plus additive run/instance fields — so there is nothing for
 * kid/teen filters to suppress. Visual FX gating stays with lane G7
 * (gravegain-agebands.js) and the gore siblings.
 *
 * Vanilla JS, idempotent (`if (window.GraveGainArsenal2D1D) return;`),
 * no imports — loaded via script tag.
 */
(function () {
  'use strict';
  if (window.GraveGainArsenal2D1D) return;

  var VERSION = '1.0.0';

  // ---------- GraveGain2D: 16 starters (class x race) ----------
  // Stat shape mirrors gravegain3d-arsenal.js (wiring-facing metadata only:
  // 2D game.js exposes no weapon fields, so hookD2 attaches this registry
  // to the live instance instead of touching combat numbers).
  // damage / attackSpeed (sec between hits) / range (px) are suggestions
  // for G10 wiring; `title` matches 2D game.js ClassTitles.
  var D2_STARTERS = {
    'warrior:human': { id: 'd2-w-human-vanguard', title: 'Soldier', name: 'Vanguard Longsword', emoji: '⚔️', damage: 20, attackSpeed: 0.28, range: 68, effect: 'parry-riposte', flavor: 'Shield-line issue; clean ripostes after a parry.' },
    'warrior:elf': { id: 'd2-w-elf-moonpetal', title: 'Assassin', name: 'Moonpetal Duelblade', emoji: '🌙', damage: 16, attackSpeed: 0.20, range: 64, effect: 'swift-flurry', flavor: 'Elven grace: blinding flurry, light cuts.' },
    'warrior:dwarf': { id: 'd2-w-dwarf-forgehold', title: 'Slayer', name: 'Forgehold Cleaver', emoji: '🔨', damage: 27, attackSpeed: 0.36, range: 62, effect: 'knockback', flavor: 'Forge-weight chop; shoves foes back.' },
    'warrior:orc': { id: 'd2-w-orc-embertusk', title: 'Berserker', name: 'Embertusk Reaver', emoji: '🐗', damage: 23, attackSpeed: 0.30, range: 66, effect: 'rage-bite', flavor: 'Orcish hunger: hits harder as Rage builds.' },
    'tank:human': { id: 'd2-t-human-bulwark', title: 'Warden', name: 'Bulwark Warhammer', emoji: '🛡️', damage: 32, attackSpeed: 0.45, range: 75, effect: 'block-bash', flavor: 'Shield-wall doctrine; blocks charge a bash.' },
    'tank:elf': { id: 'd2-t-elf-thornward', title: 'Paladin', name: 'Thornward Aegis Maul', emoji: '🌿', damage: 27, attackSpeed: 0.40, range: 72, effect: 'regen-bark', flavor: 'Living bark plate; slow mending between blocks.' },
    'tank:dwarf': { id: 'd2-t-dwarf-stoneheart', title: 'Brute', name: 'Stoneheart Siege Hammer', emoji: '🪨', damage: 38, attackSpeed: 0.55, range: 78, effect: 'seismic-slam', flavor: 'Siege-born; shaking slams, huge knockback.' },
    'tank:orc': { id: 'd2-t-orc-totem', title: 'Guardian', name: 'Ember Totem Maul', emoji: '🗿', damage: 34, attackSpeed: 0.48, range: 74, effect: 'rage-burst', flavor: 'War-totem; damage taken feeds bursts.' },
    'support:human': { id: 'd2-s-human-fieldmedic', title: 'Medic', name: 'Field Medic Spraygun', emoji: '💉', damage: 14, attackSpeed: 0.18, range: 400, effect: 'heal-dart', flavor: 'Frontline chemist; darts mend allies, melt foes.' },
    'support:elf': { id: 'd2-s-elf-dew', title: 'Brewer', name: 'Dewwhisper Remedy Gun', emoji: '🍃', damage: 12, attackSpeed: 0.16, range: 380, effect: 'regen-mist', flavor: 'Sylvan dew; lingering mist knits wounds.' },
    'support:dwarf': { id: 'd2-s-dwarf-tonic', title: 'Shaman', name: 'Tonic Lobber', emoji: '⚗️', damage: 16, attackSpeed: 0.22, range: 340, effect: 'tonic-lob', flavor: 'Stout alchemy; arcing flasks, splash heal.' },
    'support:orc': { id: 'd2-s-orc-thorn', title: 'Druid', name: 'Thornwick Injector', emoji: '🌵', damage: 15, attackSpeed: 0.19, range: 360, effect: 'snare-mist', flavor: 'Wild doctrine; snaring clouds slow packs.' },
    'mage:human': { id: 'd2-m-human-apprentice', title: 'Engineer', name: 'Astral Apprentice Staff', emoji: '✨', damage: 26, attackSpeed: 0.38, range: 450, effect: 'homing-bolt', flavor: 'Star-chart academy issue; steady homing bolts.' },
    'mage:elf': { id: 'd2-m-elf-starleaf', title: 'Tinkerer', name: 'Starleaf Archstaff', emoji: '🌟', damage: 23, attackSpeed: 0.32, range: 470, effect: 'frost-nova', flavor: 'Spellweaver heirloom; chilling bolts, fast weave.' },
    'mage:dwarf': { id: 'd2-m-dwarf-geomace', title: 'Warlock', name: 'Runecarved Geomace', emoji: '⛰️', damage: 31, attackSpeed: 0.46, range: 380, effect: 'meteor-splash', flavor: 'Rune-hewn stone; slow slams with splash.' },
    'mage:orc': { id: 'd2-m-orc-snarl', title: 'Witch', name: 'Stormsnarl Hex Rod', emoji: '🔥', damage: 28, attackSpeed: 0.36, range: 420, effect: 'burn-hex', flavor: 'Hexcraft rod; bolts that ignite and daze.' }
  };

  // ---------- GraveGain2D: 12 new weapons (6 mid / 6 end) ----------
  var D2_WEAPONS = [
    { id: 'd2-mid-frostbrand', name: 'Frostbrand Greatblade', emoji: '❄️', tier: 'mid', damage: 34, attackSpeed: 0.34, range: 70, effect: 'chill-cleave', unlock: 'mid-game drop', flavor: 'Mid-game cleaver; chills packs, slows charges.' },
    { id: 'd2-mid-emberrepeater', name: 'Ember Repeater Gun', emoji: '🔥', tier: 'mid', damage: 20, attackSpeed: 0.14, range: 420, effect: 'ignite-spray', unlock: 'mid-game drop', flavor: 'Rapid spark-sprayer; stacks burn on bosses.' },
    { id: 'd2-mid-thundermaul', name: 'Thundercrack Maul', emoji: '⚡', tier: 'mid', damage: 44, attackSpeed: 0.52, range: 76, effect: 'chain-zap', unlock: 'mid-game drop', flavor: 'Storm-forged; arcs lightning to nearby foes.' },
    { id: 'd2-mid-viperstaff', name: 'Vipercoil Staff', emoji: '🐍', tier: 'mid', damage: 32, attackSpeed: 0.34, range: 440, effect: 'venom-bolt', unlock: 'mid-game drop', flavor: 'Serpent-channel; bolts that weaken over time.' },
    { id: 'd2-mid-oathshield', name: 'Oathkeeper Blade & Lantern Shield', emoji: '🏮', tier: 'mid', damage: 28, attackSpeed: 0.30, range: 68, effect: 'ward-bulwark', unlock: 'mid-game quest', flavor: 'Lantern-lit set; stronger blocks, dawn riposte.' },
    { id: 'd2-mid-galeshot', name: 'Galefeather Scattergun', emoji: '🌪️', tier: 'mid', damage: 18, attackSpeed: 0.24, range: 360, effect: 'scatter-gust', unlock: 'mid-game drop', flavor: 'Wind loaded; spread shot shoves crowds back.' },
    { id: 'd2-end-doombringer', name: 'Doombringer Worldsplitter', emoji: '🌑', tier: 'end', damage: 68, attackSpeed: 0.50, range: 82, effect: 'execute-eclipse', unlock: 'endgame boss', flavor: 'Endgame executioner; eclipse shockwaves finish the weak.' },
    { id: 'd2-end-starforge', name: 'Starforge Comet Lance', emoji: '☄️', tier: 'end', damage: 55, attackSpeed: 0.30, range: 480, effect: 'meteor-pierce', unlock: 'endgame boss', flavor: 'Comet-tipped lance; piercing bolts, meteor shards.' },
    { id: 'd2-end-tidecaller', name: 'Tidecaller Abyss Trident', emoji: '🌊', tier: 'end', damage: 48, attackSpeed: 0.34, range: 74, effect: 'tide-vortex', unlock: 'endgame boss', flavor: 'Abyssal trident; whirlpools drag packs together.' },
    { id: 'd2-end-sunmantle', name: 'Sunmantle Dawn edge', emoji: '🌅', tier: 'end', damage: 52, attackSpeed: 0.28, range: 72, effect: 'radiant-flurry', unlock: 'endgame quest', flavor: 'Dawn-forged; blinding flurry with radiant burn.' },
    { id: 'd2-end-gravechoir', name: 'Gravechoir Dirge Organ', emoji: '🎹', tier: 'end', damage: 44, attackSpeed: 0.40, range: 460, effect: 'dirge-nova', unlock: 'endgame boss', flavor: 'Chapel organ; chord novas that scatter the horde.' },
    { id: 'd2-end-mistral', name: 'Mistral Skyhorn Bow', emoji: '🦅', tier: 'end', damage: 46, attackSpeed: 0.38, range: 430, effect: 'sky-snipe', unlock: 'endgame quest', flavor: 'Highwind bow; far-seeking arrows never miss twice.' }
  ];

  var D2_BY_ID = {};
  try {
    D2_WEAPONS.forEach(function (w) { D2_BY_ID[w.id] = w; });
  } catch (e) { /* noop */ }

  function d2Key(classType, race) {
    try {
      return String(classType || '').toLowerCase() + ':' + String(race || '').toLowerCase();
    } catch (e) { return ':'; }
  }

  // Distinct starter per class x race; unknown combos fall back to Soldier kit.
  function getD2Starter(classType, race) {
    var key = d2Key(classType, race);
    var entry = D2_STARTERS[key] || D2_STARTERS['warrior:human'];
    var out = {};
    try {
      for (var k in entry) { if (Object.prototype.hasOwnProperty.call(entry, k)) out[k] = entry[k]; }
      out.combo = key;
    } catch (e) { return entry; }
    return out;
  }

  function getD2Weapon(id) {
    var entry = D2_BY_ID[id];
    if (!entry) return null;
    var out = {};
    try {
      for (var k in entry) { if (Object.prototype.hasOwnProperty.call(entry, k)) out[k] = entry[k]; }
    } catch (e) { return entry; }
    return out;
  }

  // Full kit for a combo: starter + suggested follow-ups by class line.
  function d2KitFor(classType, race) {
    var starter = getD2Starter(classType, race);
    var c = '';
    try { c = String(classType || '').toLowerCase(); } catch (e) { /* noop */ }
    var picks;
    if (c === 'mage' || c === 'support') {
      picks = ['d2-mid-emberrepeater', 'd2-mid-viperstaff', 'd2-mid-galeshot', 'd2-end-starforge', 'd2-end-gravechoir', 'd2-end-mistral'];
    } else {
      picks = ['d2-mid-frostbrand', 'd2-mid-thundermaul', 'd2-mid-oathshield', 'd2-end-doombringer', 'd2-end-tidecaller', 'd2-end-sunmantle'];
    }
    var follow = [];
    try {
      picks.forEach(function (id) { var w = getD2Weapon(id); if (w) follow.push(w); });
    } catch (e) { /* return what we have */ }
    return { starter: starter, followUps: follow };
  }

  // ---------- GraveGain1D: 3 starters (per class) ----------
  // Identity entries for the stock loadout: stock atk/range mirror game.js
  // CLASSES (rifleman 5/4, sapper 4/3, runner 7/3), mods are zero so stamping
  // a run is purely informational and never changes balance.
  var D1_STARTERS = {
    rifleman: { id: 'd1-rifleman-longline', name: 'Longline Ley Rifle', emoji: '🔫', atkDelta: 0, defDelta: 0, rangeSet: 4, stock: { atk: 5, range: 4 }, effect: 'steady-line', unlock: 'start', flavor: 'Lisa walked the line — steady aim, sealed helm, no one left behind.' },
    sapper: { id: 'd1-sapper-forgeheld', name: 'Forgeheld Scattergun', emoji: '🛠️', atkDelta: 0, defDelta: 0, rangeSet: 3, stock: { atk: 4, range: 3 }, effect: 'close-ward', unlock: 'start', flavor: 'Borin-issue: fix under fire, light the dark, break the golems.' },
    runner: { id: 'd1-runner-grovehex', name: 'Grove Hex Bow', emoji: '🌿', atkDelta: 0, defDelta: 0, rangeSet: 3, stock: { atk: 7, range: 3 }, effect: 'hex-mark', unlock: 'start', flavor: 'Aelindra\u2019s pick: fast feet, quiet steps, field-blessed.' }
  };

  // ---------- GraveGain1D: 12 new weapons ----------
  // Mods apply to the live run state (s.atk / s.def / s.range) through
  // equipWeapon(); unlock names the sector/boss gate G10 wiring can use.
  var D1_WEAPONS = [
    { id: 'd1-mid-crashcarbine', name: 'Crash Flats Carbine', emoji: '🎯', tier: 'mid', atkDelta: 1, defDelta: 0, rangeSet: 4, effect: 'steady-line', unlock: 'Sector 1 boss: James Wright', flavor: 'Salvaged dropship carbine; +1 ATK at rifle range.' },
    { id: 'd1-mid-swarmbell', name: 'Swarm Bell Scattergun', emoji: '🔔', tier: 'mid', atkDelta: 2, defDelta: 0, rangeSet: 2, effect: 'close-ward', unlock: 'Sector 1 boss: James Wright', flavor: 'Short, loud, final; +2 ATK up close.' },
    { id: 'd1-mid-whisperbow', name: 'Whisper Grove Bow', emoji: '🏹', tier: 'mid', atkDelta: 1, defDelta: 1, rangeSet: 3, effect: 'hex-mark', unlock: 'Sector 2 boss: Mirathiel', flavor: 'Mother-Tree yew; +1 ATK, +1 DEF.' },
    { id: 'd1-mid-anchorhook', name: 'Anchor Hook Launcher', emoji: '⚓', tier: 'mid', atkDelta: 2, defDelta: 0, rangeSet: 5, effect: 'anchor-drag', unlock: 'Sector 2 boss: Mirathiel', flavor: 'Breaks necro-anchors at +1 reach; +2 ATK.' },
    { id: 'd1-mid-sparkmaul', name: 'Sparkite Forge Maul', emoji: '⛏️', tier: 'mid', atkDelta: 3, defDelta: 0, rangeSet: 2, effect: 'seismic-slam', unlock: 'Sector 3 boss: Vault Warden', flavor: 'Lower-forge work; +3 ATK in two strides.' },
    { id: 'd1-mid-lanternrifle', name: 'Lantern-Lit Rifle', emoji: '🏮', tier: 'mid', atkDelta: 2, defDelta: 1, rangeSet: 4, effect: 'dawn-volley', unlock: 'Sector 3 boss: Vault Warden', flavor: 'Arty\u2019s lit lanes; +2 ATK, +1 DEF.' },
    { id: 'd1-end-bloodline', name: 'Compact Oathblade', emoji: '🤝', tier: 'end', atkDelta: 3, defDelta: 2, rangeSet: 3, effect: 'oath-guard', unlock: 'Sector 4 boss: Karguk', flavor: 'Shared-blood steel; +3 ATK, +2 DEF.' },
    { id: 'd1-end-berserkbane', name: 'Berserkbane Pike', emoji: '🛡️', tier: 'end', atkDelta: 4, defDelta: 0, rangeSet: 3, effect: 'joint-strike', unlock: 'Sector 4 boss: Karguk', flavor: 'Aims for the joints; +4 ATK.' },
    { id: 'd1-end-artillery', name: 'Valley Artillery Spotter', emoji: '📡', tier: 'end', atkDelta: 4, defDelta: 0, rangeSet: 6, effect: 'skyhammer', unlock: 'Sector 4 boss: Karguk', flavor: 'Paints targets for the sky-hammer; longest reach.' },
    { id: 'd1-end-spirelance', name: 'Spirefall Comet Lance', emoji: '☄️', tier: 'end', atkDelta: 5, defDelta: 1, rangeSet: 4, effect: 'meteor-pierce', unlock: 'Sector 5 boss: Gate Titan', flavor: 'Carry the charge by hand; +5 ATK, +1 DEF.' },
    { id: 'd1-end-dawnchoir', name: 'Dawnchoir Bell Organ', emoji: '🎹', tier: 'end', atkDelta: 4, defDelta: 2, rangeSet: 5, effect: 'dirge-nova', unlock: 'Sector 5 boss: Gate Titan', flavor: 'SafeSpace bells; +4 ATK, +2 DEF at long range.' },
    { id: 'd1-end-mercysight', name: 'Mercenary\u2019s Far Sight', emoji: '🔭', tier: 'end', atkDelta: 6, defDelta: 0, rangeSet: 4, effect: 'fated-shot', unlock: 'Hades finale', flavor: 'Dream-picked optics; +6 ATK for the last march.' }
  ];

  var D1_BY_ID = {};
  try {
    D1_WEAPONS.forEach(function (w) { D1_BY_ID[w.id] = w; });
    for (var sk in D1_STARTERS) {
      if (Object.prototype.hasOwnProperty.call(D1_STARTERS, sk)) D1_BY_ID[D1_STARTERS[sk].id] = D1_STARTERS[sk];
    }
  } catch (e) { /* noop */ }

  function normClass(classId) {
    try {
      var c = String(classId || '').toLowerCase();
      if (c === 'rifleman' || c === 'sapper' || c === 'runner') return c;
    } catch (e) { /* fall through */ }
    return 'rifleman';
  }

  // Distinct starter per 1D class; unknown ids fall back to rifleman.
  function getD1Starter(classId) {
    var c = normClass(classId);
    var entry = D1_STARTERS[c];
    var out = {};
    try {
      for (var k in entry) { if (Object.prototype.hasOwnProperty.call(entry, k)) out[k] = entry[k]; }
      out.cls = c;
    } catch (e) { return entry; }
    return out;
  }

  function getD1Weapon(id) {
    var entry = D1_BY_ID[id];
    if (!entry) return null;
    var out = {};
    try {
      for (var k in entry) { if (Object.prototype.hasOwnProperty.call(entry, k)) out[k] = entry[k]; }
    } catch (e) { return entry; }
    return out;
  }

  // Equip a 1D weapon onto a live run state (s.atk/s.def/s.range).
  // Reverts the previously equipped mods first; safe to call repeatedly.
  function equipD1Weapon(run, id) {
    if (!run || typeof run !== 'object') return null;
    var entry = D1_BY_ID[id];
    if (!entry) return null;
    try {
      var prev = run.__arsenalMods || { atk: 0, def: 0 };
      if (typeof run.atk === 'number') run.atk -= (prev.atk || 0);
      if (typeof run.def === 'number') run.def -= (prev.def || 0);
      var mods = { atk: entry.atkDelta || 0, def: entry.defDelta || 0 };
      if (typeof run.atk === 'number') run.atk += mods.atk;
      if (typeof run.def === 'number') run.def += mods.def;
      if (entry.rangeSet != null && typeof run.range === 'number') run.range = entry.rangeSet;
      run.__arsenalMods = mods;
      run.weaponId = entry.id;
      run.weaponName = entry.name;
    } catch (e) { /* never break the tick core */ }
    return run;
  }

  // ---------- runtime hooks (best-effort, additive only) ----------
  function hookD1() {
    var ok = false;
    try {
      var G = window.GraveGain1D;
      if (!G) return false;
      if (!G.Arsenal) G.Arsenal = d1api;
      if (typeof G.newRun === 'function' && !G.newRun.__arsenalWrapped) {
        var orig = G.newRun;
        var wrapped = function (seed, classId, mode) {
          var run;
          try {
            run = orig.call(this, seed, classId, mode);
          } catch (e) {
            try { run = orig(seed, classId, mode); } catch (e2) { return null; }
          }
          try {
            if (run && !run.weaponId) {
              var st = getD1Starter(run.cls || classId);
              run.weaponId = st.id;
              run.weaponName = st.name;
              run.__arsenalMods = { atk: 0, def: 0 };
            }
          } catch (e3) { /* informational only */ }
          return run;
        };
        wrapped.__arsenalWrapped = true;
        G.newRun = wrapped;
      }
      ok = !!G.Arsenal;
    } catch (e) { /* engine not loaded yet; poller retries */ }
    return ok;
  }

  function hookD2() {
    var ok = false;
    try {
      var game = window.GraveGainGame;
      if (!game) return false;
      if (!game.arsenal) game.arsenal = d2api;
      ok = !!game.arsenal;
    } catch (e) { /* game not booted yet; poller retries */ }
    return ok;
  }

  function hookAll() {
    hookD1();
    hookD2();
  }

  var d2api = {
    starters: D2_STARTERS,
    weapons: D2_WEAPONS,
    getStarter: getD2Starter,
    getWeapon: getD2Weapon,
    kitFor: d2KitFor,
    init: hookAll
  };

  var d1api = {
    starters: D1_STARTERS,
    weapons: D1_WEAPONS,
    getStarter: getD1Starter,
    getWeapon: getD1Weapon,
    equipWeapon: equipD1Weapon,
    init: hookAll
  };

  var api = {
    VERSION: VERSION,
    d2: d2api,
    d1: d1api,
    init: hookAll
  };

  window.GraveGainArsenal2D1D = api;
  hookAll();

  // Late globals (game scripts may load after this mod): bounded retries.
  try {
    var attempts = 0;
    var timer = window.setInterval(function () {
      try {
        attempts += 1;
        hookAll();
        var d1done = !!(window.GraveGain1D && window.GraveGain1D.Arsenal);
        var d2done = !!(window.GraveGainGame && window.GraveGainGame.arsenal);
        if ((d1done && d2done) || attempts >= 40) window.clearInterval(timer);
      } catch (e) {
        if (attempts >= 40) { try { window.clearInterval(timer); } catch (e2) { /* noop */ } }
      }
    }, 500);
  } catch (e) { /* timers unavailable; direct hooks already ran */ }

  window.GraveGainMods = window.GraveGainMods || [];
  try {
    window.GraveGainMods.push({ name: 'gravegain-arsenal-2d1d', version: VERSION, init: hookAll });
  } catch (e) { /* noop */ }
})();
