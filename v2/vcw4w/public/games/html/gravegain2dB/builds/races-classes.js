(function () {
  'use strict';
  if (window.GraveGain2DB_Builds && window.GraveGain2DB_Builds.loaded) return;
  window.GraveGainMods = window.GraveGainMods || [];

  var RACES = {
    human: {
      id: 'human', name: 'Human', emoji: '👩‍🚀',
      passive: { id: 'jetpack-correction', name: 'Jetpack Correction', desc: 'Mid-air steering nudges drift back on course; sealed-helmet suit life.' },
      active: { id: 'shield-wall-jet-burst', name: 'Shield Wall / Jet Burst', desc: 'Bubble shield absorbs 20 dmg (recharges after 5s out of fire) or burst thrust upward. Never breaks protected cells.' }
    },
    elf: {
      id: 'elf', name: 'Elf', emoji: '🧝‍♀️',
      passive: { id: 'hover', name: 'Hover', desc: 'Hold jump to glide; mana pool 100 (+2/s regen) fuels spells.' },
      active: { id: 'nature-burst', name: 'Nature Burst', desc: 'AoE thorn nova around caster. Damage-only; never destroys protected cells.' }
    },
    dwarf: {
      id: 'dwarf', name: 'Dwarf', emoji: '🧔🏻',
      passive: { id: 'heavy-frame', name: 'Heavy Frame', desc: 'Double-jump with extra weight (no ledge-slip); blast-resist reduces explosive self-damage.' },
      active: { id: 'stone-form', name: 'Stone Form', desc: 'Brief damage immunity, rooted in place. Cannot phase through protected cells.' }
    },
    orc: {
      id: 'orc', name: 'Orc', emoji: '🟢👹',
      passive: { id: 'ground-control', name: 'Ground Control', desc: 'Faster move + knockback resist while grounded; rage builds on hits taken.' },
      active: { id: 'rage-burst-stomp', name: 'Rage Burst Stomp', desc: 'Shockwave stomp spending rage. Knocks enemies, never breaks protected cells.' }
    }
  };

  var CLASSES = {
    warrior: {
      id: 'warrior', name: 'Warrior',
      passive: { id: 'breach-instinct', name: 'Breach Instinct', desc: 'Bonus damage for 2s after breaching a destructible cell.' },
      active: { id: 'breach-dash', name: 'Breach Dash', desc: 'Short dash through ONE destructible-cell thickness; blocked by protected cells, never destroys them.' }
    },
    tank: {
      id: 'tank', name: 'Tank',
      passive: { id: 'bulwark-plating', name: 'Bulwark Plating', desc: 'Flat damage reduction + draws enemy aggro in co-op.' },
      active: { id: 'bulwark', name: 'Bulwark', desc: 'Raise shield wall: frontal block, slow move. No terrain effect.' }
    },
    support: {
      id: 'support', name: 'Support',
      passive: { id: 'fast-revive', name: 'Fast Revive', desc: 'Revive co-op partners twice as fast; spare medkits.' },
      active: { id: 'supply-drop', name: 'Supply Drop', desc: 'Call down ammo/medkit pod at pinged open cell. Never spawns inside protected cells.' }
    },
    mage: {
      id: 'mage', name: 'Mage',
      passive: { id: 'energy-flow', name: 'Energy Flow', desc: 'Ability cooldowns recharge faster; energy pickups grant more.' },
      active: { id: 'arc-pulse', name: 'Arc Pulse', desc: 'Chained zap to nearest enemies. Damage-only; never alters terrain.' }
    }
  };

  // Title table: flavor hook per race x class (cosmetic称号 only, no stats).
  var TITLES = {
    'human:warrior': 'Soldier', 'human:tank': 'Paladin', 'human:support': 'Medic', 'human:mage': 'Tinkerer',
    'elf:warrior': 'Warden', 'elf:tank': 'Paladin', 'elf:support': 'Druid', 'elf:mage': 'Warlock',
    'dwarf:warrior': 'Berserker', 'dwarf:tank': 'Brute', 'dwarf:support': 'Tinkerer', 'dwarf:mage': 'Warlock',
    'orc:warrior': 'Berserker', 'orc:tank': 'Brute', 'orc:support': 'Medic', 'orc:mage': 'Druid'
  };

  var LOADOUT_RULES = {
    sidearm: 'infinite',
    scavengedSlots: 2,
    throwableSlot: 1,
    starterSidearm: 'pulse-rifle',
    notes: [
      'All 16 race x class combos solo-clear the breach route and are co-op-viable.',
      'No ability breaks protected cells or is required for the mandatory route (all gates pass with base kit).',
      'Scavenged weapons outscale build damage scaling: builds add utility, loot adds firepower.'
    ]
  };

  function comboId(raceId, classId) { return raceId + ':' + classId; }

  function getCombo(raceId, classId) {
    var race = RACES[raceId];
    var cls = CLASSES[classId];
    if (!race || !cls) return null;
    return {
      id: comboId(raceId, classId),
      race: raceId, cls: classId,
      title: TITLES[comboId(raceId, classId)] || 'Drifter',
      racePassive: race.passive, raceActive: race.active,
      classPassive: cls.passive, classActive: cls.active,
      loadout: { sidearm: LOADOUT_RULES.starterSidearm, sidearmAmmo: 'infinite', scavengedSlots: [null, null], throwable: null },
      soloClear: true, coopViable: true
    };
  }

  function listCombos() {
    var out = [];
    Object.keys(RACES).forEach(function (r) {
      Object.keys(CLASSES).forEach(function (c) { out.push(getCombo(r, c)); });
    });
    return out;
  }

  // Guarded runtime hook: apply a combo to a player object (pure assignment, no engine import).
  function applyToPlayer(player, raceId, classId) {
    var combo = getCombo(raceId, classId);
    if (!combo || !player) return null;
    player.buildId = combo.id;
    player.buildTitle = combo.title;
    player.racePassive = combo.racePassive.id;
    player.raceActive = combo.raceActive.id;
    player.classPassive = combo.classPassive.id;
    player.classActive = combo.classActive.id;
    return combo;
  }

  var api = {
    loaded: true, slug: 'gravegain2dB',
    races: RACES, classes: CLASSES, titles: TITLES,
    rules: LOADOUT_RULES, getCombo: getCombo, listCombos: listCombos,
    applyToPlayer: applyToPlayer,
    comboCount: function () { return listCombos().length; }
  };

  window.GraveGain2DB_Builds = api;
  window.GraveGainMods.push({ id: 'gravegain2dB-races-classes', kind: 'builds', api: api });
})();
