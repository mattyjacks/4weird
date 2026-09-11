// Test: 25 OpenRouter plays work first time (offline fallback + mocked live path).
// Run: node tests/test_openrouter_plays.js (no keys, no network).
const assert = require('node:assert');
const { OPENROUTER_PLAYS, getPlay, fallbackPlay, runPlay } = require('../lib/openrouter_plays');

(async () => {
  // 1. Count + uniqueness.
  assert.strictEqual(OPENROUTER_PLAYS.length, 25, `expected 25 plays, got ${OPENROUTER_PLAYS.length}`);
  assert.strictEqual(new Set(OPENROUTER_PLAYS.map((p) => p.id)).size, 25, 'ids unique');

  // 2. Multiple voice backends present.
  const backends = new Set(OPENROUTER_PLAYS.map((p) => p.voiceBackend));
  for (const b of ['openai-tts', 'elevenlabs', 'fal-minimax', 'browser-speech']) {
    assert.ok(backends.has(b), `missing voice backend ${b}`);
  }

  // 3. Every play: prompt builder + offline fallback never throws.
  for (const p of OPENROUTER_PLAYS) {
    assert.ok(p.id && p.title && p.system && p.maxTokens > 0, `malformed play ${p.id}`);
    const u = p.userPrompt('test input');
    assert.ok(typeof u === 'string' && u.length > 0, `empty prompt ${p.id}`);
    const f = fallbackPlay(p, 'test input');
    assert.ok(typeof f === 'string' && f.length > 0, `empty fallback ${p.id}`);
  }

  // 4. Offline path (no key) returns fallback:true for 3 representative plays.
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.META_API_KEY;
  for (const id of ['npc-barks', 'bug-bard', 'meme-oracle']) {
    const r = await runPlay(id, 'lobby test', { apiKey: '' });
    assert.strictEqual(r.fallback, true, `${id} should fall back without key`);
    assert.ok(r.output.length > 0, `${id} fallback empty`);
  }

  // 5. JSON plays fall back to parseable JSON.
  const cmd = await runPlay('voice-command-parser', 'jump now', { apiKey: '' });
  assert.doesNotThrow(() => JSON.parse(cmd.output), 'voice-command fallback must be JSON');
  const coach = await runPlay('autoplay-coach', 'fps 60, stuck', { apiKey: '' });
  assert.doesNotThrow(() => JSON.parse(coach.output), 'coach fallback must be JSON');

  // 6. Mocked live path: fake fetch returns canned text, fallback:false.
  const fakeFetch = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: 'LIVE LINE' } }] }) });
  const live = await runPlay('hype-caster', 'goal!', { apiKey: 'sk-or-v1-test', fetch: fakeFetch });
  assert.strictEqual(live.fallback, false, 'mocked live should not fall back');
  assert.strictEqual(live.output, 'LIVE LINE', 'mocked live text passthrough');

  // 7. Unknown play throws.
  await assert.rejects(() => runPlay('nope', 'x', { apiKey: '' }), /unknown playId/);

  console.log(`TEST_OK: 25 openrouter plays, 4 voice backends, offline+mocked-live pass. (${getPlay('lorekeeper').title} etc.)`);
})().catch((e) => { console.error('TEST_FAIL:', e); process.exit(1); });
