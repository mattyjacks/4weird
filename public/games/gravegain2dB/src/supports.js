/* GraveGain2dB sim — supports.js (A3 lane)
 * SupportGroup lifecycle with 2-step collapse warning + UNSTABLE tag.
 * States: stable -> damaged -> unstable -> collapsing -> collapsed.
 * Pure sim: no host APIs, deterministic given (dt, damage) sequence.
 */
(function () {
  'use strict';

  var NS = globalThis.GraveGain2dBSim = globalThis.GraveGain2dBSim || {};
  if (NS.damageSupport && NS.resolveCollapse) {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = {
        createSupports: NS.createSupports,
        addSupportGroup: NS.addSupportGroup,
        damageSupport: NS.damageSupport,
        resolveCollapse: NS.resolveCollapse
      };
    }
    return;
  }

  function tuning() {
    if (NS.TUNING) return NS.TUNING;
    if (typeof require === 'function') {
      try {
        var t = require('./tuning.js');
        if (t && t.TUNING) return t.TUNING;
      } catch (e) { /* sibling bundled ahead */ }
    }
    return { WARN_STAGE1_T: 1.2, WARN_STAGE2_T: 0.6 };
  }

  function terrainOf() {
    if (NS.damageCell && NS.getCell) return NS;
    if (typeof require === 'function') {
      try { return require('./terrain.js'); } catch (e) { /* bundled ahead */ }
    }
    return null;
  }

  function createSupports() {
    return { groups: {}, nextId: 1 };
  }

  // cells: [{x,y,hp?}] — per-cell braces/pins. groupHp = total brace health.
  function addSupportGroup(s, cells, opts) {
    var o = opts || {};
    var id = s.nextId++;
    var total = 0;
    var list = cells.map(function (c) {
      var hp = (typeof c.hp === 'number') ? c.hp : 40;
      total += hp;
      return { x: c.x | 0, y: c.y | 0, hp: hp, maxHp: hp };
    });
    var g = {
      id: id,
      cells: list,
      hp: total,
      maxHp: total > 0 ? total : 1,
      state: 'stable',   // stable|damaged|unstable|collapsing|collapsed
      warnT: 0,          // collapse countdown once unstable
      warnStage: 0,      // 0 none, 1 cracks+dust+wobble, 2 imminent
      tag: null,         // 'UNSTABLE' while unstable/collapsing (HUD tag)
      label: o.label || ('SG' + id)
    };
    s.groups[id] = g;
    return g;
  }

  function frac(g) { return g.hp / g.maxHp; }

  // Returns { state, warnStage, tag, collapsed:boolean, wentUnstable:boolean }
  function damageSupport(s, id, amount) {
    var g = s.groups[id];
    if (!g) return { state: 'missing', collapsed: false };
    var T = tuning();
    if (g.state === 'collapsed' || g.state === 'collapsing') {
      return { state: g.state, warnStage: g.warnStage, tag: g.tag, collapsed: g.state === 'collapsed' };
    }
    g.hp -= amount;
    var wentUnstable = false;
    if (g.hp <= 0) {
      g.hp = 0;
      g.state = 'collapsing';
      g.warnT = Math.min(g.warnT || T.WARN_STAGE2_T, T.WARN_STAGE2_T);
      g.warnStage = 2;
      g.tag = 'UNSTABLE';
    } else if (frac(g) < 0.34) {
      if (g.state !== 'unstable') {
        wentUnstable = true;
        g.warnT = T.WARN_STAGE1_T + T.WARN_STAGE2_T;
      }
      g.state = 'unstable';
      g.warnStage = 1;
      g.tag = 'UNSTABLE';
    } else if (frac(g) < 0.67) {
      g.state = 'damaged';
      g.warnStage = 0;
      g.tag = null;
    }
    return { state: g.state, warnStage: g.warnStage, tag: g.tag, collapsed: false, wentUnstable: wentUnstable };
  }

  // Advance warning clocks; groups whose clock hits 0 collapse.
  // hooks: { onCollapse(group, brokenCells) } — sim passes debris spawner.
  // Returns array of collapse events for the updateNav step.
  function resolveCollapse(s, terrain, dt, hooks) {
    var T = tuning();
    var out = [];
    var Terr = terrainOf();
    var ids = Object.keys(s.groups);
    for (var k = 0; k < ids.length; k++) {
      var g = s.groups[ids[k]];
      if (g.state !== 'unstable' && g.state !== 'collapsing') continue;
      g.warnT -= dt;
      // 2-step warning escalation: stage1 -> stage2 at the stage2 boundary.
      if (g.state === 'unstable' && g.warnT <= T.WARN_STAGE2_T) {
        g.warnStage = 2;
        out.push({ type: 'warn2', groupId: g.id, tag: g.tag });
      }
      if (g.warnT > 0) continue;
      // Collapse: break every attached cell that is not mission-protected.
      var broken = [];
      for (var i = 0; i < g.cells.length; i++) {
        var c = g.cells[i];
        if (Terr && terrain) {
          var cell = Terr.getCell(terrain, c.x, c.y);
          if (!cell.solid || cell.mat === 0) continue;
          if (cell.missionProtected || !cell.destructible) continue;
          var ev = Terr.damageCell(terrain, c.x, c.y, 99999, 'collapse');
          if (ev.broke) broken.push({ x: c.x, y: c.y, mat: ev.mat });
        } else {
          broken.push({ x: c.x, y: c.y, mat: 0 });
        }
      }
      g.state = 'collapsed';
      g.warnStage = 0;
      g.tag = null;
      var evt = { type: 'collapse', groupId: g.id, broken: broken };
      out.push(evt);
      if (hooks && typeof hooks.onCollapse === 'function') hooks.onCollapse(g, broken);
    }
    return out;
  }

  NS.createSupports = createSupports;
  NS.addSupportGroup = addSupportGroup;
  NS.damageSupport = damageSupport;
  NS.resolveCollapse = resolveCollapse;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      createSupports: createSupports, addSupportGroup: addSupportGroup,
      damageSupport: damageSupport, resolveCollapse: resolveCollapse
    };
  }
})();
