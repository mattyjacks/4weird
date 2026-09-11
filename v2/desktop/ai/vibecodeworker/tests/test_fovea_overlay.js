/**
 * Regression tests for lib/fovea_overlay.js (TestingH/V fovea overlay:
 * detail-crop boundaries + picture-in-picture renders) and multi-image
 * payloads in lib/brain/llm_caller.js (1 overview + N small crops per tick).
 * Run: npm run test:fovea-overlay
 */
'use strict';

const assert = require('assert');
const fo = require('../lib/fovea_overlay');

let passed = 0;
function ok(name, fn) {
  try { fn(); passed++; console.log(`  ok - ${name}`); }
  catch (e) { console.error(`  FAIL - ${name}: ${e.message}`); process.exitCode = 1; }
}
async function okAsync(name, fn) {
  try { await fn(); passed++; console.log(`  ok - ${name}`); }
  catch (e) { console.error(`  FAIL - ${name}: ${e.message}`); process.exitCode = 1; }
}

console.log('test_fovea_overlay:');

ok('selectFoveaCrops picks the latest event with rects', () => {
  const sel = fo.selectFoveaCrops([
    { type: 'action', atMs: 10 },
    { type: 'fovea', atMs: 1000, rects: [{ x: 300, y: 300, w: 400, h: 400, label: 'center-context' }] },
    { type: 'fovea', atMs: 2000, rects: [{ x: 390, y: 390, w: 220, h: 220, label: 'crosshair-fovea' }] },
  ]);
  assert.strictEqual(sel.isDefault, false);
  assert.strictEqual(sel.atMs, 2000);
  assert.strictEqual(sel.rects.length, 1);
  assert.strictEqual(sel.rects[0].label, 'crosshair-fovea');
});

ok('selectFoveaCrops falls back to the default plan', () => {
  const sel = fo.selectFoveaCrops([{ type: 'action' }]);
  assert.strictEqual(sel.isDefault, true);
  assert.strictEqual(sel.atMs, null);
  assert.strictEqual(sel.rects.length, 2);
  assert.deepStrictEqual(fo.selectFoveaCrops(null).rects, sel.rects);
});

ok('selectFoveaCrops caps at 3 and skips empties', () => {
  const sel = fo.selectFoveaCrops([
    { type: 'fovea', atMs: 5, rects: [] },
    {
      type: 'fovea', atMs: 6, rects: [0, 1, 2, 3, 4].map((i) => ({ x: i * 100, y: 100, w: 150, h: 150, label: `c${i}` })),
    },
  ]);
  assert.strictEqual(sel.rects.length, 3);
});

ok('rectToSourcePixels maps 0-1000 onto video pixels', () => {
  // Center 400-box on a 1920x1080 take.
  assert.deepStrictEqual(
    fo.rectToSourcePixels({ x: 300, y: 300, w: 400, h: 400 }, 1920, 1080),
    { x: 576, y: 324, w: 768, h: 432 }
  );
  // Overflow clamps inside the source.
  const edge = fo.rectToSourcePixels({ x: 900, y: 900, w: 400, h: 400 }, 1000, 1000);
  assert.strictEqual(edge.x + edge.w <= 1000, true);
  assert.strictEqual(edge.y + edge.h <= 1000, true);
});

ok('foveaArg formats + sanitizes labels', () => {
  const s = fo.foveaArg([{ x: 300, y: 300, w: 400, h: 400, label: 'a|b:c' }], false);
  assert.strictEqual(s, 'abc:300,300,400,400');
  assert.strictEqual(fo.foveaArg([], true), 'default');
  const prefixed = fo.foveaArg([{ x: 100, y: 100, w: 200, h: 200, label: 'hud' }], true);
  assert.ok(prefixed.startsWith('default-plan|'));
});

(async () => {
  await okAsync('openai payload carries overview + high-detail crops', async () => {
    const { callLLM } = require('../lib/brain/llm_caller');
    const seen = {};
    const realFetch = global.fetch;
    global.fetch = async (url, opts) => {
      seen.body = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ choices: [{ message: { content: '{"status":"playing"}' } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }) };
    };
    try {
      const brain = { config: { provider: 'openai', apiKey: 'test-key', modelName: 'gpt-5.6-luna' }, recordTokenUsage() {} };
      await callLLM(brain, 'hi', 'OVERVIEW'.padEnd(200, 'A'), null, ['CROP1'.padEnd(200, 'B'), 'CROP2'.padEnd(200, 'C')]);
      const content = seen.body.messages[0].content;
      assert.strictEqual(content[0].type, 'text');
      const imgs = content.filter((p) => p.type === 'image_url');
      assert.strictEqual(imgs.length, 3);
      assert.strictEqual(imgs[1].image_url.detail, 'high');
    } finally { global.fetch = realFetch; }
  });

  await okAsync('gemini payload carries overview + inline crops', async () => {
    const { callLLM } = require('../lib/brain/llm_caller');
    const seen = {};
    const realFetch = global.fetch;
    global.fetch = async (url, opts) => {
      seen.body = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{}' }] } }], usageMetadata: { promptTokenCount: 9, candidatesTokenCount: 2 } }) };
    };
    try {
      const brain = { config: { provider: 'gemini', apiKey: 'test-key', modelName: 'gemini-3.5-flash-lite' }, recordTokenUsage() {} };
      await callLLM(brain, 'hi', 'OVERVIEW'.padEnd(200, 'A'), null, ['CROP1'.padEnd(200, 'B')]);
      const parts = seen.body.contents[0].parts;
      assert.strictEqual(parts.length, 3);
      assert.strictEqual(parts[1].inlineData.mimeType, 'image/jpeg');
      assert.strictEqual(parts[2].inlineData.data[0], 'C');
    } finally { global.fetch = realFetch; }
  });

  console.log(`test_fovea_overlay: ${passed} passed`);
})();
