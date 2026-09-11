/**
 * Regression tests for lib/brain/foveated_vision.js — the foveated vision
 * option: 1 small overview + up to 3 tiny AI-steered detail crops per tick
 * (FPS crosshair fast path). Small crops cost a fraction of full-frame
 * tokens, so decisions and follow-up inputs stay fast.
 * Run: npm run test:fovea
 */
'use strict';

const assert = require('assert');
const fv = require('../lib/brain/foveated_vision');

let passed = 0;
function ok(name, fn) {
  try { fn(); passed++; console.log(`  ok - ${name}`); }
  catch (e) { console.error(`  FAIL - ${name}: ${e.message}`); process.exitCode = 1; }
}

console.log('test_foveated_vision:');

ok('centerRect centers on 500,500', () => {
  const r = fv.centerRect(400);
  assert.deepStrictEqual([r.x, r.y, r.w, r.h], [300, 300, 400, 400]);
});

ok('sizes clamp to 80..1000', () => {
  assert.strictEqual(fv.centerRect(2000).w, 1000);
  assert.strictEqual(fv.centerRect(10).w, 80);
  assert.strictEqual(fv.centerRect('nope').w, 400);
});

ok('finalizeRect keeps the box inside the frame', () => {
  const r = fv.finalizeRect({ x: 900, y: 900, w: 400, h: 400, label: 'edge' });
  assert.strictEqual(r.x + r.w <= 1000, true);
  assert.strictEqual(r.y + r.h <= 1000, true);
  assert.strictEqual(r.label, 'edge');
});

ok('menus get overview-only (fastest tick)', () => {
  assert.deepStrictEqual(fv.defaultFocusRegions({ status: 'menu' }), []);
  assert.deepStrictEqual(fv.defaultFocusRegions({ reasoning: 'loading screen' }), []);
});

ok('normal play gets one center crop', () => {
  const rs = fv.defaultFocusRegions({ status: 'playing' });
  assert.strictEqual(rs.length, 1);
  assert.strictEqual(rs[0].label, 'center');
});

ok('FPS/combat gets context + crosshair fovea', () => {
  const rs = fv.defaultFocusRegions({ status: 'combat', genre: 'fps shooter' });
  assert.strictEqual(rs.length, 2);
  assert.strictEqual(rs[1].label, 'crosshair-fovea');
  // Fovea is a tight box around screen center.
  assert.ok(rs[1].x > 300 && rs[1].x < 500 && rs[1].w <= 240);
  const urgent = fv.defaultFocusRegions({ urgency: 'high', status: 'playing' });
  assert.strictEqual(urgent.length, 2);
});

ok('sanitize caps at 3, dedupes, drops garbage', () => {
  const req = [
    { x: 300, y: 300, w: 400, h: 400, label: 'a' },
    { x: 301, y: 302, w: 400, h: 400, label: 'a-dup' },
    null, 'nope', { x: 0, y: 0, w: 10, h: 10, label: 'tiny' },
    { x: 100, y: 100, w: 200, h: 200 },
    { x: 600, y: 600, w: 200, h: 200 },
  ];
  const out = fv.sanitizeFocusRequests(req);
  assert.strictEqual(out.length, 3);
  assert.strictEqual(out[0].label, 'a');
});

ok('sanitize accepts every supported key', () => {
  const r = { x: 100, y: 100, w: 200, h: 200 };
  assert.strictEqual(fv.sanitizeFocusRequests({ focus: [r] }).length, 1);
  assert.strictEqual(fv.sanitizeFocusRequests({ detail_requests: [r] }).length, 1);
  assert.strictEqual(fv.sanitizeFocusRequests({ fovea: [r] }).length, 1);
  assert.strictEqual(fv.sanitizeFocusRequests({ zoom: [r] }).length, 1);
  assert.deepStrictEqual(fv.sanitizeFocusRequests(null), []);
});

ok('parseModelFocus reads the decision', () => {
  const d = { status: 'playing', focus: [{ x: 390, y: 390, w: 220, h: 220, label: 'crosshair' }] };
  const out = fv.parseModelFocus(d);
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].label, 'crosshair');
  assert.deepStrictEqual(fv.parseModelFocus({ status: 'menu' }), []);
  assert.deepStrictEqual(fv.parseModelFocus(null), []);
});

ok('merge prefers explicit, fills from defaults, honors max 0', () => {
  const explicit = [{ x: 100, y: 100, w: 200, h: 200, label: 'hud' }];
  const merged = fv.mergeFocusRequests({ requested: explicit, context: { urgency: 'high' }, max: 3 });
  assert.strictEqual(merged.length, 3);
  assert.strictEqual(merged[0].label, 'hud');
  assert.deepStrictEqual(fv.mergeFocusRequests({ requested: explicit, max: 0 }), []);
});

ok('prompt snippet advertises focus + small-crop savings', () => {
  const s = fv.buildFoveaPromptSnippet(2);
  assert.ok(/"focus"/.test(s) && /crop2/.test(s) && /fraction of full-frame tokens/.test(s));
});

ok('frame map describes crop rects', () => {
  const s = fv.describeFrameForPrompt([{ label: 'crosshair-fovea', rect: { x: 390, y: 390, w: 220, h: 220 } }]);
  assert.ok(/crop1 "crosshair-fovea"/.test(s) && /x=390/.test(s));
  assert.strictEqual(fv.describeFrameForPrompt([]), '');
});

ok('budget sums bytes', () => {
  const b = fv.estimateFrameBudget({ overview: 'x'.repeat(1000), details: [{ base64: 'y'.repeat(500) }] });
  assert.strictEqual(b.overviewBytes, 1000);
  assert.strictEqual(b.detailBytes, 500);
  assert.strictEqual(b.detailCount, 1);
});

console.log(`test_foveated_vision: ${passed} passed`);
