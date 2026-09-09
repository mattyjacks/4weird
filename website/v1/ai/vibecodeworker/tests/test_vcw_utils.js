/**
 * Regression tests for lib/vcw_utils.js + hardened config/pricing/api surface.
 * Run: npm run test:utils
 */
'use strict';

const assert = require('assert');
const u = require('../lib/vcw_utils');
const { AutoCodeConfig } = require('../lib/config');
const { calculateCost, formatCost, sanitizeTokenCount, listModelsByTier, estimateCostForCharacters } = require('../lib/pricing');

let passed = 0;
function ok(name, fn) {
  try { fn(); passed++; console.log(`  ok - ${name}`); }
  catch (e) { console.error(`  FAIL - ${name}: ${e.message}`); process.exitCode = 1; }
}

console.log('test_vcw_utils:');

ok('clamp bounds + fallback', () => {
  assert.strictEqual(u.clamp(5, 1, 10), 5);
  assert.strictEqual(u.clamp(99, 1, 10), 10);
  assert.strictEqual(u.clamp('x', 1, 10, 7), 7);
});
ok('safeJsonParse fallback', () => {
  assert.deepStrictEqual(u.safeJsonParse('nope', { a: 1 }), { a: 1 });
  assert.deepStrictEqual(u.safeJsonParse('{"a":2}'), { a: 2 });
});
ok('safeJsonStringify never throws', () => {
  const c = {}; c.self = c;
  assert.strictEqual(typeof u.safeJsonStringify({ a: 1 }), 'string');
  assert.strictEqual(typeof u.safeJsonStringify(c), 'string');
});
ok('newRequestId unique', () => {
  assert.notStrictEqual(u.newRequestId(), u.newRequestId());
});
ok('isValidUrl', () => {
  assert.strictEqual(u.isValidUrl('https://4weird.games'), true);
  assert.strictEqual(u.isValidUrl('ftp://x'), false);
  assert.strictEqual(u.isValidUrl('x'.repeat(3000)), false);
});
ok('isValidPort', () => {
  assert.strictEqual(u.isValidPort(42069), true);
  assert.strictEqual(u.isValidPort(99999), false);
});
ok('truncate caps', () => {
  assert.strictEqual(u.truncate('abcdef', 3), 'abc');
});
ok('escapeHtml', () => {
  assert.strictEqual(u.escapeHtml('<b>"hi"</b>'), '&lt;b&gt;&quot;hi&quot;&lt;/b&gt;');
});
ok('withTimeout resolves fast', async () => {
  const v = await u.withTimeout(Promise.resolve(1), 1000, 't');
  assert.strictEqual(v, 1);
});
ok('retryAsync recovers', async () => {
  let n = 0;
  const v = await u.retryAsync(async () => { if (++n < 3) throw new Error('x'); return 'ok'; }, { retries: 3, delayMs: 1 });
  assert.strictEqual(v, 'ok');
});
ok('config update allowlists + normalizes', () => {
  const c = new AutoCodeConfig();
  c.update({ provider: 'OPENAI', budgetLimit: -5, maxChatHistory: 9999, evilKey: 1, audioChannelMode: 'bogus', cloud: { maxMinutes: 999 } });
  assert.strictEqual(c.provider, 'openai');
  assert.strictEqual(c.evilKey, undefined);
  assert.strictEqual(c.audioChannelMode, 'mono');
  assert.strictEqual(c.maxChatHistory, 200);
  assert.strictEqual(c.cloud.maxMinutes, 55);
});
ok('config toJSON redacts keys', () => {
  const c = new AutoCodeConfig();
  c.update({}); c.apiKey = 'sk-secret'; c.elevenlabsApiKey = 'sk-voice';
  const j = c.toJSON();
  assert.strictEqual(j.apiKey, '***redacted***');
  assert.strictEqual(j.elevenlabsApiKey, '***redacted***');
});
ok('config validate + loadFromEnv', () => {
  const c = new AutoCodeConfig();
  assert.deepStrictEqual(c.validate(), []);
  c.loadFromEnv({ VIBE_PROVIDER: 'gemini', VIBE_BUDGET_LIMIT: '0.5' });
  assert.strictEqual(c.provider, 'gemini');
});
ok('pricing sanitizes + formats', () => {
  assert.strictEqual(sanitizeTokenCount(-5), 0);
  assert.strictEqual(calculateCost('nope-model', -10, NaN), 0);
  assert.strictEqual(formatCost(NaN), '$0.0000');
  assert.ok(Array.isArray(listModelsByTier()) && listModelsByTier().length > 0);
  assert.strictEqual(typeof estimateCostForCharacters('gpt-4o-mini', 4000, 4000), 'number');
});

console.log(`\n${passed} checks passed.`);
