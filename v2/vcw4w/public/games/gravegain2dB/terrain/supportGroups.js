"use strict";
// GraveGain2dB Terrain — support groups: anchors, attached cells, lifecycle:
// stable -> damaged -> unstable -> collapsing -> collapsed -> cleanup
// with warning/collapse/damage/debris/nav profiles + cracks/dust/wobble/UNSTABLE hooks.
(function (global) {
  var STAGES = ["stable", "damaged", "unstable", "collapsing", "collapsed", "cleanup"];

  function defaultProfiles() {
    return {
      warning: { cracksAt: "damaged", dustAt: "unstable", wobbleAt: "unstable", labelAt: "unstable", labelText: "UNSTABLE" },
      collapse: { delayMs: 1200, radius: 1, chainToNeighbors: true },
      damage: { anchorLossThreshold: 1, attachedLossRatio: 0.5 },
      debris: { kind: "rubble", count: 6, pooled: true },
      nav: { unstableCostMult: 3, collapsingBlocked: true, collapsedPassable: true }
    };
  }

  function createGroup(id, anchorKeys, attachedKeys, profiles) {
    return {
      id: id,
      anchors: (anchorKeys || []).slice(),
      attached: (attachedKeys || []).slice(),
      stage: "stable",
      lostAnchors: 0,
      lostAttached: 0,
      profiles: profiles || defaultProfiles()
    };
  }

  function key(x, y) { return x + "," + y; }

  // hooks: { onCracks(group), onDust(group), onWobble(group), onUnstableLabel(group),
  //          onCollapse(group), onDebris(group, debrisList), onNavUpdate(group) }
  function evaluate(group, destroyedKeys, hooks) {
    hooks = hooks || {};
    var dset = {};
    (destroyedKeys || []).forEach(function (k) { dset[k] = true; });
    var lostA = 0;
    group.anchors.forEach(function (k) { if (dset[k]) lostA += 1; });
    var lostC = 0;
    group.attached.forEach(function (k) { if (dset[k]) lostC += 1; });
    group.lostAnchors = lostA;
    group.lostAttached = lostC;

    var prev = group.stage;
    var next = "stable";
    var totalAttached = Math.max(1, group.attached.length);
    var ratio = lostC / totalAttached;
    if (lostA >= group.profiles.damage.anchorLossThreshold || ratio >= 1.0) {
      next = "collapsing";
    } else if (ratio >= group.profiles.damage.attachedLossRatio || lostA > 0) {
      next = "damaged";
      if (lostA > 0 && ratio >= group.profiles.damage.attachedLossRatio * 0.5) next = "unstable";
    }
    group.stage = advance(prev, next);
    fireHooks(group, prev, hooks);
    return group.stage;
  }

  // Lifecycle only moves forward one step per evaluate except collapsing fast-path.
  function advance(prev, target) {
    var pi = STAGES.indexOf(prev);
    var ti = STAGES.indexOf(target);
    if (ti <= pi) return prev;
    if (prev === "unstable" && target === "collapsing") return "collapsing";
    return STAGES[pi + 1];
  }

  function fireHooks(group, prev, hooks) {
    var p = group.profiles.warning;
    if (group.stage === "damaged" && hooks.onCracks) hooks.onCracks(group);
    if (group.stage === "unstable") {
      if (hooks.onDust) hooks.onDust(group);
      if (hooks.onWobble) hooks.onWobble(group);
      if (hooks.onUnstableLabel) hooks.onUnstableLabel(group, p.labelText || "UNSTABLE");
    }
    if (group.stage === "collapsing" && hooks.onCollapse) hooks.onCollapse(group);
    if (hooks.onNavUpdate) hooks.onNavUpdate(group);
  }

  // Collapse: mark attached cells destroyed, emit pooled debris descriptors.
  function collapse(group, chunk, cellsApi, hooks) {
    hooks = hooks || {};
    var debris = [];
    group.attached.forEach(function (k) {
      var parts = k.split(",");
      var c = cellsApi.getCell(chunk, parseInt(parts[0], 10), parseInt(parts[1], 10));
      if (c && !c.destroyed && !c.missionProtected) {
        c.destroyed = true;
        c.collision = "none";
        debris.push({ kind: group.profiles.debris.kind, x: c.x, y: c.y, pooled: group.profiles.debris.pooled });
      }
    });
    group.stage = "collapsed";
    if (hooks.onDebris) hooks.onDebris(group, debris);
    if (hooks.onNavUpdate) hooks.onNavUpdate(group);
    return debris;
  }

  function cleanup(group, hooks) {
    group.stage = "cleanup";
    if (hooks && hooks.onNavUpdate) hooks.onNavUpdate(group);
    return group.stage;
  }

  function navCost(group, baseCost) {
    if (group.stage === "collapsing" && group.profiles.nav.collapsingBlocked) return Infinity;
    if (group.stage === "unstable") return baseCost * group.profiles.nav.unstableCostMult;
    return baseCost;
  }

  var api = {
    STAGES: STAGES,
    defaultProfiles: defaultProfiles,
    createGroup: createGroup,
    evaluate: evaluate,
    collapse: collapse,
    cleanup: cleanup,
    navCost: navCost,
    key: key
  };

  global.GraveGain2dBTerrainSupport = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
