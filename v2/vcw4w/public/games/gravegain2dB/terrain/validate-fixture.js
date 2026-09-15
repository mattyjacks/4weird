"use strict";
// GraveGain2dB Terrain — fixture validation (node). Run: node validate-fixture.js
// Checks: primary + destructive-shortcut + emergency-fallback routes reach objective,
// protected cells indestructible, support lifecycle, debris pool, Valley-Net penalty.
var C = require("./TerrainCell.js");
var M = require("./materials.js");
var S = require("./supportGroups.js");
var P = require("./protectedCells.js");
var E = require("./emergencyBreach.js");
var D = require("./debrisPool.js");
var F = require("./fixtureMission.js");

var failures = 0;
function check(name, cond, extra) {
  if (cond) { console.log("PASS " + name + (extra ? " (" + extra + ")" : "")); }
  else { failures += 1; console.log("FAIL " + name + (extra ? " (" + extra + ")" : "")); }
}

// 1. Primary route exists on fresh fixture.
var fx = F.buildFixture();
var primary = F.findPath(fx.chunk, fx.start, fx.objective);
check("primary-route-reaches-objective", primary.reachable, "len=" + primary.length);

// 2. Destructive shortcut: seal gap, destroy scrap shortcut, path returns and is shorter.
var fx2 = F.buildFixture();
fx2.gap.forEach(function (xy) {
  var c = C.getCell(fx2.chunk, xy[0], xy[1]);
  c.material = "stone"; c.hp = 40; c.maxHp = 40; c.collision = "solid"; c.destroyed = false; c.destructible = true;
});
var sealed = F.findPath(fx2.chunk, fx2.start, fx2.objective);
check("gap-sealed-blocks-primary", !sealed.reachable);
fx2.shortcut.forEach(function (xy) {
  var c = C.getCell(fx2.chunk, xy[0], xy[1]);
  var r = M.applyDamage(c, 100, "blade", false);
  check("shortcut-cell-destroyed@" + xy.join(","), r.destroyed);
});
var viaShortcut = F.findPath(fx2.chunk, fx2.start, fx2.objective);
check("destructive-shortcut-reaches-objective", viaShortcut.reachable, "len=" + viaShortcut.length);

// 3. Emergency fallback: sealed gap + intact shortcut => trapped => breach => reachable + penalty.
var fx3 = F.buildFixture();
fx3.gap.forEach(function (xy) {
  var c = C.getCell(fx3.chunk, xy[0], xy[1]);
  c.material = "stone"; c.hp = 40; c.maxHp = 40; c.collision = "solid"; c.destroyed = false; c.destructible = true;
});
// Seal shortcut too (fresh fixture has it solid, so just verify trapped).
var trapped = F.findPath(fx3.chunk, fx3.start, fx3.objective);
check("fallback-precondition-trapped", !trapped.reachable);
var mon = E.createMonitor();
var r1 = E.update(mon, function () { return F.findPath(fx3.chunk, fx3.start, fx3.objective).reachable; }, 0);
check("monitor-arms-on-trapped", r1.state === "trapped");
var r2 = E.update(mon, function () { return false; }, E.TRAP_TIMEOUT_MS + 1, {
  onDialogue: function () { console.log("  dialogue-hook: valley-net emergency breach warning"); }
});
check("monitor-fires-after-5s", r2.fired === true);
var score = { score: 1000 };
var report = E.runFallback(mon, fx3.chunk, C, { shaftX: fx3.shaft.x, fromY: fx3.shaft.fromY, toY: fx3.shaft.toY, scoreState: score }, {
  onBreach: function (m, carved) { console.log("  breach-hook: carved " + carved.length + " cells"); },
  onPenalty: function (m, amt) { console.log("  penalty-hook: -" + amt); }
});
check("fallback-carved-shaft", report.carved.length > 0, "carved=" + report.carved.length);
check("fallback-penalty-applied", score.score === 1000 - E.PENALTY, "score=" + score.score);
var afterFallback = F.findPath(fx3.chunk, fx3.start, fx3.objective);
check("fallback-route-reaches-objective", afterFallback.reachable, "len=" + afterFallback.length);

// 4. Protected cells: damage always blocked, never destroyed.
var fx4 = F.buildFixture();
var pc = C.getCell(fx4.chunk, 14, 14);
var pr = M.applyDamage(pc, 9999, "pick", true);
check("protected-indestructible", !pr.destroyed && pr.blocked, "hp=" + pc.hp);
check("protected-flag", P.isProtected(pc));

// 5. Support lifecycle: stable -> damaged -> unstable -> collapsing -> collapsed -> cleanup.
var g = S.createGroup("g-test", [S.key(8, 0)], [S.key(8, 1), S.key(8, 2), S.key(8, 3)]);
var hooks = {
  onCracks: function () { console.log("  hook: cracks"); },
  onDust: function () { console.log("  hook: dust"); },
  onWobble: function () { console.log("  hook: wobble"); },
  onUnstableLabel: function (gr, t) { console.log("  hook: label " + t); }
};
check("support-starts-stable", g.stage === "stable");
S.evaluate(g, ["8,1", "8,2"], hooks);
check("support-damaged", g.stage === "damaged", g.stage);
S.evaluate(g, ["8,1", "8,2", "8,0"], hooks);
check("support-unstable", g.stage === "unstable", g.stage);
S.evaluate(g, ["8,1", "8,2", "8,0"], hooks);
check("support-collapsing", g.stage === "collapsing", g.stage);
var fx5 = F.buildFixture();
var debris = S.collapse(g, fx5.chunk, C, { onDebris: function (gr, list) { console.log("  hook: debris x" + list.length); } });
check("support-collapsed-debris", g.stage === "collapsed" && debris.length > 0, "debris=" + debris.length);
S.cleanup(g);
check("support-cleanup", g.stage === "cleanup");

// 6. Debris pool acquire/release recycles.
var pool = D.createPool(4);
var d1 = D.acquire(pool, "rubble", 1, 2);
D.release(pool, d1);
var d2 = D.acquire(pool, "rubble", 3, 4);
check("debris-pool-recycles", d1 === d2);

// 7. Materials table: 7 entries, barrier indestructible.
check("seven-materials", M.listMaterials().length === 7, M.listMaterials().join(","));
check("barrier-blocked", M.applyDamage({ material: "barrier", hp: 999, destructible: false, missionProtected: false, destroyed: false }, 9999).blocked);

if (failures > 0) { console.log("RESULT FAIL (" + failures + ")"); process.exit(1); }
console.log("RESULT ALL PASS");
