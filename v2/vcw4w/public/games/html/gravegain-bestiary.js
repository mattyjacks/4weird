/* GraveGain bestiary — shared 18-enemy roster for 1D / 2D / 3D (E15).
 *
 * Vanilla JS IIFE, pure data + optional THREE builder. No DOM required,
 * no input listeners, no dynamic code, network, or storage APIs. Same models in every
 * age band; gore differences are handled by the gore lanes, never here.
 */
(function () {
'use strict';
if (window.GraveGainBestiary) return; // idempotent
try {

var ENEMIES = [
  { id: 'shambler', name: 'Risen Shambler', emoji: '🧟', hp: 12, atk: 2, def: 0, spd: 2, xp: 3, gold: 2, tier: 'minion', behavior: 'chaser', flavor2d: 'shambling token, moss-green tint, medium size', flavor1d: '🧟' },
  { id: 'swarm', name: 'Skull Swarm', emoji: '💀', hp: 5, atk: 3, def: 0, spd: 4, xp: 2, gold: 1, tier: 'minion', behavior: 'swarmer', flavor2d: 'skittering token cluster, bone-white tint, small size', flavor1d: '💀' },
  { id: 'brute', name: 'Zed Brute', emoji: '👹', hp: 22, atk: 5, def: 1, spd: 1, xp: 5, gold: 4, tier: 'brute', behavior: 'brute', flavor2d: 'heavy token, blood-red tint, large size', flavor1d: '👹' },
  { id: 'necro', name: 'Array Necromancer', emoji: '🧙', hp: 20, atk: 4, def: 0, spd: 2, xp: 7, gold: 5, tier: 'elite', behavior: 'caster', flavor2d: 'robed token, violet tint, medium size', flavor1d: '🧙' },
  { id: 'wraith', name: 'Pale Wraith', emoji: '👻', hp: 14, atk: 4, def: 0, spd: 4, xp: 5, gold: 3, tier: 'minion', behavior: 'lurker', flavor2d: 'drifting token, pale-cyan tint, medium size', flavor1d: '👻' },
  { id: 'golem', name: 'Crypt Golem', emoji: '🗿', hp: 34, atk: 6, def: 2, spd: 1, xp: 8, gold: 6, tier: 'brute', behavior: 'brute', flavor2d: 'stone token, slate-gray tint, extra-large size', flavor1d: '🗿' },
  { id: 'hexbat', name: 'Hexbat', emoji: '🦇', hp: 8, atk: 3, def: 0, spd: 5, xp: 3, gold: 2, tier: 'minion', behavior: 'swarmer', flavor2d: 'fluttering token, midnight-purple tint, tiny size', flavor1d: '🦇' },
  { id: 'mirelurker', name: 'Mirelurker', emoji: '🐊', hp: 18, atk: 4, def: 1, spd: 2, xp: 5, gold: 3, tier: 'brute', behavior: 'lurker', flavor2d: 'lurking token, murky-teal tint, large size', flavor1d: '🐊' },
  { id: 'ashen-knight', name: 'Ashen Knight', emoji: '🛡️', hp: 26, atk: 6, def: 2, spd: 2, xp: 9, gold: 7, tier: 'elite', behavior: 'chaser', flavor2d: 'armored token, ash-gray tint, large size', flavor1d: '🛡️' },
  { id: 'sporefiend', name: 'Sporefiend', emoji: '🍄', hp: 10, atk: 3, def: 0, spd: 2, xp: 4, gold: 2, tier: 'minion', behavior: 'caster', flavor2d: 'puffball token, sickly-green tint, small size', flavor1d: '🍄' },
  { id: 'crypt-weaver', name: 'Crypt Weaver', emoji: '🕷️', hp: 16, atk: 4, def: 1, spd: 3, xp: 6, gold: 4, tier: 'elite', behavior: 'lurker', flavor2d: 'skittering token, web-silver tint, medium size', flavor1d: '🕷️' },
  { id: 'ember-imp', name: 'Ember Imp', emoji: '🔥', hp: 7, atk: 4, def: 0, spd: 4, xp: 3, gold: 2, tier: 'minion', behavior: 'swarmer', flavor2d: 'flickering token, ember-orange tint, tiny size', flavor1d: '🔥' },
  { id: 'frostbound', name: 'Frostbound Husk', emoji: '❄️', hp: 20, atk: 4, def: 1, spd: 2, xp: 6, gold: 4, tier: 'brute', behavior: 'brute', flavor2d: 'rime token, ice-blue tint, medium size', flavor1d: '❄️' },
  { id: 'grave-titan-spawn', name: 'Grave Titan Spawn', emoji: '🦍', hp: 40, atk: 7, def: 2, spd: 1, xp: 12, gold: 9, tier: 'elite', behavior: 'boss', flavor2d: 'towering token, grave-purple tint, huge size', flavor1d: '🦍' },
  { id: 'marrow-thief', name: 'Marrow Thief', emoji: '🐀', hp: 9, atk: 3, def: 0, spd: 5, xp: 4, gold: 5, tier: 'minion', behavior: 'lurker', flavor2d: 'darting token, dusty-brown tint, tiny size', flavor1d: '🐀' },
  { id: 'bellwether', name: 'Bellwether', emoji: '🔔', hp: 24, atk: 5, def: 1, spd: 2, xp: 10, gold: 8, tier: 'elite', behavior: 'caster', flavor2d: 'tolling token, brassy-gold tint, large size', flavor1d: '🔔' },
  { id: 'dusk-prowler', name: 'Dusk Prowler', emoji: '🐆', hp: 15, atk: 5, def: 0, spd: 5, xp: 6, gold: 4, tier: 'brute', behavior: 'chaser', flavor2d: 'prowling token, dusk-indigo tint, medium size', flavor1d: '🐆' },
  { id: 'herald-spawn', name: 'Herald Spawn', emoji: '👑', hp: 55, atk: 7, def: 2, spd: 2, xp: 20, gold: 30, tier: 'boss', behavior: 'boss', flavor2d: 'crowned token, void-crimson tint, huge size', flavor1d: '👑' }
];

var BODY_PLANS = {
  'shambler': { base: 'box', scale: [1, 1.4, 0.8], tint: 0x4d7c0f, glow: null, parts: ['claws'] },
  'swarm': { base: 'sphere', scale: [0.5, 0.5, 0.5], tint: 0xe2e8f0, glow: null, parts: [] },
  'brute': { base: 'box', scale: [1.4, 1.8, 1], tint: 0x991b1b, glow: 0xff4500, parts: ['horns', 'spikes'] },
  'necro': { base: 'cone', scale: [0.9, 1.8, 0.9], tint: 0x7c3aed, glow: 0x8b5cf6, parts: [] },
  'wraith': { base: 'cone', scale: [0.8, 1.6, 0.8], tint: 0xa5f3fc, glow: 0x67e8f9, parts: [] },
  'golem': { base: 'box', scale: [1.8, 2.2, 1.2], tint: 0x64748b, glow: null, parts: ['spikes'] },
  'hexbat': { base: 'sphere', scale: [0.5, 0.4, 0.7], tint: 0x4c1d95, glow: 0xa78bfa, parts: ['wings'] },
  'mirelurker': { base: 'box', scale: [1.3, 0.7, 1.6], tint: 0x0f766e, glow: null, parts: ['claws'] },
  'ashen-knight': { base: 'box', scale: [1, 1.9, 0.8], tint: 0x78716c, glow: null, parts: ['horns'] },
  'sporefiend': { base: 'sphere', scale: [0.7, 0.8, 0.7], tint: 0x65a30d, glow: 0xa3e635, parts: [] },
  'crypt-weaver': { base: 'sphere', scale: [0.8, 0.6, 1], tint: 0x475569, glow: null, parts: ['claws'] },
  'ember-imp': { base: 'cone', scale: [0.5, 0.9, 0.5], tint: 0xea580c, glow: 0xfbbf24, parts: ['horns'] },
  'frostbound': { base: 'box', scale: [1, 1.5, 0.8], tint: 0x7dd3fc, glow: 0xbae6fd, parts: ['spikes'] },
  'grave-titan-spawn': { base: 'box', scale: [2, 2.6, 1.4], tint: 0x581c87, glow: 0xa855f7, parts: ['horns', 'spikes', 'claws'] },
  'marrow-thief': { base: 'sphere', scale: [0.5, 0.4, 0.8], tint: 0xa16207, glow: null, parts: [] },
  'bellwether': { base: 'cylinder', scale: [0.9, 1.7, 0.9], tint: 0xb45309, glow: 0xfbbf24, parts: ['crown'] },
  'dusk-prowler': { base: 'box', scale: [1.2, 0.7, 0.7], tint: 0x3730a3, glow: null, parts: ['claws'] },
  'herald-spawn': { base: 'cylinder', scale: [1.6, 2.4, 1.6], tint: 0x7f1d1d, glow: 0xef4444, parts: ['crown', 'wings', 'horns'] }
};

function byId(id) {
  try {
    for (var i = 0; i < ENEMIES.length; i++) {
      if (ENEMIES[i].id === id) return ENEMIES[i];
    }
  } catch (e) { /* never throw */ }
  return null;
}

function byTier(tier) {
  var out = [];
  try {
    for (var i = 0; i < ENEMIES.length; i++) {
      if (ENEMIES[i].tier === tier) out.push(ENEMIES[i]);
    }
  } catch (e) { /* never throw */ }
  return out;
}

function randomOf(tier, randFn) {
  try {
    var pool = tier ? byTier(tier) : ENEMIES.slice();
    if (!pool.length) return null;
    var r = (typeof randFn === 'function') ? randFn() : Math.random();
    if (!(r >= 0 && r < 1)) r = Math.random();
    var idx = Math.floor(r * pool.length) % pool.length;
    return pool[idx];
  } catch (e) { return null; }
}

// Build a THREE.Group from a BODY_PLANS plan using only r128-era geometries.
// Returns null when THREE is absent or anything fails. No DOM touched.
function buildBody(plan, THREE) {
  try {
    var T = THREE || (typeof window !== 'undefined' ? window.THREE : null);
    if (!T || !T.Group) return null;
    if (!plan || !plan.base) return null;
    var group = new T.Group();
    var sx = 1, sy = 1, sz = 1;
    if (plan.scale && plan.scale.length >= 3) { sx = +plan.scale[0] || 1; sy = +plan.scale[1] || 1; sz = +plan.scale[2] || 1; }
    var mat = null;
    try {
      mat = new T.MeshLambertMaterial({ color: (typeof plan.tint === 'number') ? plan.tint : 0x888888 });
    } catch (e2) {
      mat = new T.MeshBasicMaterial({ color: (typeof plan.tint === 'number') ? plan.tint : 0x888888 });
    }
    var geo = null;
    if (plan.base === 'box') geo = new T.BoxGeometry(sx, sy, sz);
    else if (plan.base === 'sphere') geo = new T.SphereGeometry(0.5, 12, 10);
    else if (plan.base === 'cone') geo = new T.ConeGeometry(0.5, 1, 10);
    else if (plan.base === 'cylinder') geo = new T.CylinderGeometry(0.5, 0.5, 1, 10);
    else return null;
    var body = new T.Mesh(geo, mat);
    body.scale.set(sx, sy, sz);
    if (plan.base === 'sphere') body.position.y = 0.5 * sy;
    else body.position.y = 0.5 * sy;
    group.add(body);
    // Decorative parts, all from the same four r128 geometry families.
    var parts = plan.parts || [];
    var pGeo = null, pMesh = null;
    function addPart(g, x, y, z) { try { pMesh = new T.Mesh(g, mat); pMesh.position.set(x, y, z); group.add(pMesh); } catch (e3) {} }
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] === 'horns') {
        pGeo = new T.ConeGeometry(0.12, 0.5, 6);
        addPart(pGeo, -0.3 * sx, sy + 0.2, 0);
        addPart(pGeo, 0.3 * sx, sy + 0.2, 0);
      } else if (parts[i] === 'wings') {
        pGeo = new T.BoxGeometry(0.7 * sx, 0.08, 0.4);
        addPart(pGeo, -0.55 * sx, 0.7 * sy, 0);
        addPart(pGeo, 0.55 * sx, 0.7 * sy, 0);
      } else if (parts[i] === 'spikes') {
        pGeo = new T.ConeGeometry(0.1, 0.4, 6);
        addPart(pGeo, 0, 0.6 * sy, -0.3 * sz);
        addPart(pGeo, 0, 0.85 * sy, 0);
        addPart(pGeo, 0, 0.6 * sy, 0.3 * sz);
      } else if (parts[i] === 'crown') {
        pGeo = new T.CylinderGeometry(0.3, 0.34, 0.22, 8);
        addPart(pGeo, 0, sy + 0.12, 0);
      } else if (parts[i] === 'claws') {
        pGeo = new T.ConeGeometry(0.08, 0.35, 6);
        addPart(pGeo, -0.5 * sx, 0.25 * sy, 0.2);
        addPart(pGeo, 0.5 * sx, 0.25 * sy, 0.2);
      }
    }
    if (typeof plan.glow === 'number' && T.PointLight) {
      try {
        var light = new T.PointLight(plan.glow, 0.6, 4);
        light.position.set(0, sy + 0.5, 0);
        group.add(light);
      } catch (e4) { /* glow optional */ }
    }
    return group;
  } catch (e) { return null; }
}

var api = null;
try {
  api = { VERSION: '2.0.0', ENEMIES: ENEMIES, BODY_PLANS: BODY_PLANS, byId: byId, byTier: byTier, randomOf: randomOf, buildBody: buildBody };
  window.GraveGainBestiary = api;
  try {
    window.GraveGainMods = window.GraveGainMods || [];
    window.GraveGainMods.push({ name: 'gravegain-bestiary', version: '2.0.0' });
  } catch (e2) { /* registry optional */ }
} catch (e) { /* never throw */ }

} catch (e) { /* never throw */ }
})();
