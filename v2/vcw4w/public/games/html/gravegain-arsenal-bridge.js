/* GraveGain arsenal art bridge (B5) — maps canonical arsenal weapon ids
 * (window.GraveGainArsenal.WEAPONS, 24 ids) to the closest arsenal3d model id
 * + arsenal2d icon id. Pure data + lookup: vanilla IIFE, no DOM/events/fetch/
 * eval. Idempotent: if (window.GraveGainArsenalBridge) return. Never throws:
 * every helper guards input and falls back to longsword/longsword.
 *
 * Kind/rarity routing: melee common->longsword, melee mid->bonecleaver_axe,
 * melee top->blood_talon; magic common->arcane_staff, magic mid->frostbrand,
 * magic top->void_repeater; ranged->hexbow (legendary->star_cannon);
 * chem->chem_gun (epic->plague_flask).
 *
 * Exposes window.GraveGainArsenalBridge = {
 *   VERSION, MAP, modelFor, iconFor, starterModel }.
 */
(function () {
'use strict';
if (window.GraveGainArsenalBridge) return;

var VERSION = '1.0.0';
var FALLBACK_MODEL = 'longsword';
var FALLBACK_ICON = 'longsword';

/* weaponId -> [modelId, iconId]. Model ids are in GraveGainArsenal3D IDS,
 * icon ids are in GraveGainArsenal2D ICONS (shared id set). */
var MAP = {
  'rusty-shortsword': ['longsword', 'longsword'],
  'pointy-stick': ['longsword', 'longsword'],
  'butcher-cleaver': ['bonecleaver_axe', 'bonecleaver_axe'],
  'gnawed-club': ['bonecleaver_axe', 'bonecleaver_axe'],
  'knights-longsword': ['longsword', 'longsword'],
  'rune-hammer': ['bonecleaver_axe', 'bonecleaver_axe'],
  'bone-dagger': ['bonecleaver_axe', 'bonecleaver_axe'],
  'reapers-scythe': ['bonecleaver_axe', 'bonecleaver_axe'],
  'bulwark-shield': ['bonecleaver_axe', 'bonecleaver_axe'],
  'dawnblade': ['blood_talon', 'blood_talon'],
  'kingsfall-maul': ['blood_talon', 'blood_talon'],
  'apprentice-staff': ['arcane_staff', 'arcane_staff'],
  'ember-wand': ['arcane_staff', 'arcane_staff'],
  'stormcaller-staff': ['frostbrand', 'frostbrand'],
  'dirge-bell': ['void_repeater', 'void_repeater'],
  'wisp-lantern': ['frostbrand', 'frostbrand'],
  'yew-shortbow': ['hexbow', 'hexbow'],
  'pebble-sling': ['hexbow', 'hexbow'],
  'elven-longbow': ['hexbow', 'hexbow'],
  'repeating-crossbow': ['hexbow', 'hexbow'],
  'worldroot-bow': ['star_cannon', 'star_cannon'],
  'acid-squirt-gun': ['chem_gun', 'chem_gun'],
  'venom-lobber': ['chem_gun', 'chem_gun'],
  'plague-sprayer': ['plague_flask', 'plague_flask']
};

function fallback() {
  return { model: FALLBACK_MODEL, icon: FALLBACK_ICON };
}

function keyOf(id) {
  try {
    if (id === null || id === undefined) return '';
    var s = String(id).trim();
    return s || '';
  } catch (e) { return ''; }
}

function modelFor(weaponId) {
  try {
    var p = MAP[keyOf(weaponId)];
    if (p && p[0] && p[1]) return { model: p[0], icon: p[1] };
    return fallback();
  } catch (e) { return fallback(); }
}

function iconFor(weaponId) {
  try {
    return modelFor(weaponId).icon || FALLBACK_ICON;
  } catch (e) { return FALLBACK_ICON; }
}

function starterModel(race, cls) {
  try {
    var g = window.GraveGainArsenal;
    var kit = (g && typeof g.getStartingWeapon === 'function')
      ? g.getStartingWeapon(race, cls)
      : null;
    var wid = (kit && kit.weaponId) ? String(kit.weaponId) : 'rusty-shortsword';
    var p = modelFor(wid);
    return { model: p.model, icon: p.icon, weaponId: wid };
  } catch (e) {
    return { model: FALLBACK_MODEL, icon: FALLBACK_ICON, weaponId: 'rusty-shortsword' };
  }
}

try {
  window.GraveGainArsenalBridge = {
    VERSION: VERSION,
    MAP: MAP,
    modelFor: modelFor,
    iconFor: iconFor,
    starterModel: starterModel
  };
} catch (e) { /* never throws */ }

try {
  window.GraveGainMods = window.GraveGainMods || [];
  window.GraveGainMods.push({
    name: 'gravegain-arsenal-bridge',
    version: VERSION,
    init: function () {}
  });
} catch (e) { /* never throws */ }
})();
