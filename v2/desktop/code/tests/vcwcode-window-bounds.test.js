"use strict";
// DS-VCWCODE-03: window-bounds validate/clamp (pure fn copy, no Electron).
// Runnable: node v2/desktop/code/tests/vcwcode-window-bounds.test.js
let failures = 0;
function check(name, cond) {
  if (cond) console.log("PASS: " + name);
  else { console.log("FAIL: " + name); failures++; }
}
// Pure fn under test (mirrors Electron main clamp logic): finite x,y,w,h; min 800x600.
function clampBounds(b) {
  const out = { x: 0, y: 0, w: 800, h: 600 };
  if (!b || typeof b !== "object") return out;
  if (Number.isFinite(b.x)) out.x = Math.trunc(b.x);
  if (Number.isFinite(b.y)) out.y = Math.trunc(b.y);
  if (Number.isFinite(b.w)) out.w = Math.max(800, Math.trunc(b.w));
  if (Number.isFinite(b.h)) out.h = Math.max(600, Math.trunc(b.h));
  return out;
}
function eq(a, b) { return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h; }
// Case 1: valid bounds pass through.
check("case1 valid 1280x800", eq(clampBounds({ x: 100, y: 50, w: 1280, h: 800 }), { x: 100, y: 50, w: 1280, h: 800 }));
// Case 2: undersize clamped to 800x600.
check("case2 undersize clamped", eq(clampBounds({ x: 0, y: 0, w: 400, h: 300 }), { x: 0, y: 0, w: 800, h: 600 }));
// Case 3: non-finite / garbage falls back to defaults.
check("case3 garbage defaults", eq(clampBounds({ x: NaN, y: Infinity, w: "x", h: null }), { x: 0, y: 0, w: 800, h: 600 }));
// Case 4: null input -> defaults.
check("case4 null defaults", eq(clampBounds(null), { x: 0, y: 0, w: 800, h: 600 }));
if (failures) { console.log("RESULT FAIL (" + failures + ")"); process.exitCode = 1; }
else { console.log("RESULT PASS"); process.exitCode = 0; }
