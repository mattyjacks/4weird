/* GraveGain2dB: Breach MoonRock — B2 Destruction Laboratory: collapse sim (Phase 2).
 * PURE SIM: no DOM/Canvas/Audio/fetch/WebSocket/localStorage. Deterministic via injected clock/RNG.
 * Load order: B1, then sim/terrain.js, then sim/collapse.js.
 * Lifecycle: stable -> damaged -> unstable(warning) -> collapsing -> collapsed -> cleaned.
 */
(function () {
if (window.GraveGain2DB_Collapse) return;
'use strict';

var STATES = ['stable', 'damaged', 'unstable', 'collapsing', 'collapsed', 'cleaned'];
var DEBRIS_CAP = 250;
var TRAPPED_TIMEOUT_MS = 5000;

function mulberry32(seed) {
  var s = (seed >>> 0) || 1;
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    var t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createSupportGroup(id, opts) {
  var o = opts || {};
  return {
    id: id,
    anchors: (o.anchors || []).slice(),
    attachedCells: (o.attachedCells || []).slice(),
    integrity: (typeof o.integrity === 'number') ? o.integrity : 100,
    maxIntegrity: (typeof o.integrity === 'number') ? o.integrity : 100,
    state: 'stable',
    warningProfile: o.warningProfile || { cracks: true, dust: true, wobble: 0.5, label: 'UNSTABLE' },
    collapseProfile: o.collapseProfile || { delayMs: 1500, radius: 2, chainIds: [] },
    damageProfile: o.damageProfile || { onCollapse: 25, radius: 2, falloff: 'linear' },
    debrisProfile: o.debrisProfile || { count: 12, materials: ['rock'], spread: 1.5 },
    fastCollapse: false,
    animationFlag: false,
    warnIssued: false,
    collapsedAt: 0,
    cleaned: false
  };
}

function createWorld(seed) {
  return { seed: seed >>> 0, rng: mulberry32(seed >>> 0), groups: {}, debris: [], now: 0,
    hooks: { onWarning: null, onCollapse: null, onValleyNet: null, onShaftSpawn: null },
    trapped: {} };
}

function addGroup(world, group) { world.groups[group.id] = group; return group; }
function getGroup(world, id) { return world.groups[id] || null; }

function stateOf(world, id) { var g = getGroup(world, id); return g ? g.state : null; }

// Damage a support group. Boss fast-collapse ONLY allowed with animationFlag=true.
function damageGroup(world, id, amount, opts) {
  var g = getGroup(world, id);
  if (!g || g.state === 'collapsed' || g.state === 'cleaned' || g.state === 'collapsing') return g;
  var o = opts || {};
  g.integrity -= Math.max(0, amount | 0 || 0);
  if (g.integrity <= 0) {
    if (o.boss === true) {
      if (o.animationFlag !== true) { g.integrity = 1; g.state = 'unstable'; issueWarning(world, g); return g; }
      g.fastCollapse = true; g.animationFlag = true;
    }
    startCollapse(world, g);
  } else if (g.integrity < g.maxIntegrity * 0.35 && g.state === 'damaged') {
    g.state = 'unstable'; issueWarning(world, g);
  } else if (g.state === 'stable' && g.integrity < g.maxIntegrity) {
    g.state = 'damaged';
  }
  return g;
}

// Warning API: cracks/dust/wobble data + UNSTABLE label hook for UI lane (sim only emits data).
function issueWarning(world, g) {
  if (g.warnIssued) return g.warning;
  g.warnIssued = true;
  var w = { groupId: g.id, cracks: g.warningProfile.cracks, dust: g.warningProfile.dust,
    wobble: g.warningProfile.wobble, label: g.warningProfile.label || 'UNSTABLE', at: world.now };
  g.warning = w;
  if (typeof world.hooks.onWarning === 'function') { try { world.hooks.onWarning(w); } catch (e) {} }
  return w;
}
function getWarning(world, id) { var g = getGroup(world, id); return g ? (g.warning || null) : null; }

function startCollapse(world, g) {
  g.state = 'collapsing';
  g.collapseStartedAt = world.now;
  return g;
}

// Advance clock; completes collapsing groups after delayMs (fast-collapse: 250ms).
function tick(world, dtMs) {
  var dt = Math.max(0, dtMs | 0 || 0);
  world.now += dt;
  var ids = Object.keys(world.groups);
  for (var i = 0; i < ids.length; i++) {
    var g = world.groups[ids[i]];
    if (g.state === 'collapsing') {
      var delay = g.fastCollapse ? 250 : (g.collapseProfile.delayMs | 0 || 1500);
      if (world.now - (g.collapseStartedAt || 0) >= delay) completeCollapse(world, g);
    }
  }
  checkTrapped(world);
  return world.now;
}

function completeCollapse(world, g) {
  g.state = 'collapsed';
  g.collapsedAt = world.now;
  spawnDebris(world, g);
  if (typeof world.hooks.onCollapse === 'function') { try { world.hooks.onCollapse(collapseReport(world, g)); } catch (e) {} }
  var chains = g.collapseProfile.chainIds || [];
  for (var i = 0; i < chains.length; i++) {
    var n = getGroup(world, chains[i]);
    if (n && n.state !== 'collapsed' && n.state !== 'cleaned') startCollapse(world, n);
  }
  return g;
}

// Debris pooling hooks: pooled array, hard cap 250 (oldest dropped first).
function spawnDebris(world, g) {
  var n = Math.max(0, g.debrisProfile.count | 0 || 0);
  for (var i = 0; i < n; i++) {
    world.debris.push({ groupId: g.id,
      material: g.debrisProfile.materials[i % g.debrisProfile.materials.length],
      vx: (world.rng() - 0.5) * 2 * (g.debrisProfile.spread || 1),
      vy: (world.rng() - 0.5) * 2 * (g.debrisProfile.spread || 1),
      at: world.now });
  }
  while (world.debris.length > DEBRIS_CAP) world.debris.shift();
  return world.debris.length;
}
function debrisCount(world) { return world.debris.length; }
function cleanGroup(world, id) {
  var g = getGroup(world, id);
  if (!g || g.state !== 'collapsed') return false;
  g.state = 'cleaned'; g.cleaned = true;
  return true;
}

// Emergency breach fallback: if player trapped (no route) for 5s -> Valley Net dialogue
// hook -> spawn one-way shaft + apply rescue-score penalty. NEVER auto-fail.
function markTrapped(world, playerId, isTrapped) {
  if (isTrapped) {
    if (!world.trapped[playerId]) world.trapped[playerId] = { since: world.now, rescued: false };
  } else delete world.trapped[playerId];
}
function checkTrapped(world) {
  var ids = Object.keys(world.trapped);
  for (var i = 0; i < ids.length; i++) {
    var t = world.trapped[ids[i]];
    if (!t.rescued && world.now - t.since >= TRAPPED_TIMEOUT_MS) {
      t.rescued = true;
      if (typeof world.hooks.onValleyNet === 'function') { try { world.hooks.onValleyNet({ playerId: ids[i], line: 'Valley Net: cutting you a way out, rockhopper. One-way shaft, mind the drop.' }); } catch (e) {} }
      if (typeof world.hooks.onShaftSpawn === 'function') { try { world.hooks.onShaftSpawn({ playerId: ids[i], kind: 'one-way-shaft' }); } catch (e) {} }
      t.penalty = { rescueScore: -50, autoFail: false };
    }
  }
}

// Post-collapse navigation profile output for pathing lane.
function collapseReport(world, g) {
  return { groupId: g.id, state: g.state, at: g.collapsedAt,
    blockedCells: g.attachedCells.slice(),
    nav: navProfile(g) };
}
function navProfile(g) {
  return { groupId: g.id, walkable: g.state === 'cleaned' || g.state === 'collapsed',
    climbable: g.state === 'collapsed' && !g.cleaned,
    hazard: g.damageProfile, debris: g.debrisProfile.count,
    note: g.cleaned ? 'cleared: path open' : 'rubble: climbable, hazard until cleaned' };
}

// Soft-lock rule: required objectives/checkpoints/extraction/recovery routes must be
// protectable. Reachability stub checks three routes; never claims full pathfinding.
function validateMission(mission) {
  var m = mission || {};
  function routeOk(r) { return !!r && r.exists === true && r.usesProtectedBreak !== true; }
  var primary = routeOk(m.primaryRoute);
  var shortcut = routeOk(m.destructiveShortcut);
  var fallback = m.emergencyFallback ? (m.emergencyFallback.shaft === true && m.emergencyFallback.autoFail !== true) : false;
  var required = m.required || {};
  var protectable = required.protectable !== false;
  return { primary: primary, destructiveShortcut: shortcut, emergencyFallback: fallback,
    protectable: protectable,
    ok: protectable && (primary || shortcut || fallback),
    reason: !protectable ? 'required route not protectable' :
      (primary || shortcut || fallback) ? 'reachable' : 'soft-lock risk: no route' };
}

var api = { STATES: STATES, DEBRIS_CAP: DEBRIS_CAP, TRAPPED_TIMEOUT_MS: TRAPPED_TIMEOUT_MS,
  createSupportGroup: createSupportGroup, createWorld: createWorld,
  addGroup: addGroup, getGroup: getGroup, stateOf: stateOf,
  damageGroup: damageGroup, issueWarning: issueWarning, getWarning: getWarning,
  startCollapse: startCollapse, tick: tick, completeCollapse: completeCollapse,
  spawnDebris: spawnDebris, debrisCount: debrisCount, cleanGroup: cleanGroup,
  markTrapped: markTrapped, checkTrapped: checkTrapped,
  collapseReport: collapseReport, navProfile: navProfile, validateMission: validateMission };
window.GraveGain2DB_Collapse = api;
if (!window.GraveGainMods) window.GraveGainMods = [];
window.GraveGainMods.push({ mod: 'gravegain2dB-collapse', version: 1, api: api });
})();
