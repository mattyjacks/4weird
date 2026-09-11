// Test: Buddy multi-agent orchestrator (offline, mocked runners, timeout).
// Run: node tests/test_buddy_orchestrator.js (no keys, no network).
const assert = require('node:assert');
const { SPECIALIST_PLAYS, planSpecialists, runOrchestrator } = require('../lib/buddy_orchestrator');

const liveRunner = (tag) => async (playId, input) => ({ text: `${tag}:${playId}:${String(input).slice(0, 20)}`, fallback: false });
const throwingRunner = async () => { throw new Error('boom'); };
const slowRunner = (ms) => async (playId) => { await new Promise((r) => setTimeout(r, ms)); return { text: `late:${playId}`, fallback: false }; };

(async () => {
  // 1. Planner: coach always, keywords add specialists, cap 4.
  assert.deepStrictEqual(planSpecialists('hello'), ['coach'], 'plain goal = coach only');
  const p2 = planSpecialists('boss victory needs voice lines and hype sfx lore quest clan everything');
  assert.ok(p2[0] === 'coach' && p2.length === 4, `planner caps at 4, got ${p2}`);
  assert.ok(planSpecialists('we need sfx boom').includes('sfx'), 'sfx keyword');
  assert.ok(planSpecialists('clan tournament tonight').includes('herald'), 'clan keyword');

  // 2. All-live: no fallbacks, reply prefers coach, merge fields land.
  const all = await runOrchestrator('boss victory voice hype', { gameTitle: 'Gravegain', score: 99 }, liveRunner('LIVE'));
  assert.strictEqual(all.fallbackCount, 0, 'all-live has no fallbacks');
  assert.ok(all.reply.startsWith('LIVE:'), 'reply is live text');
  assert.ok(all.voiceLines.startsWith('LIVE:'), 'voiceLines merged');

  // 3. All-throwing: everything falls back, never rejects.
  const off = await runOrchestrator('anything', {}, throwingRunner);
  assert.strictEqual(off.fallbackCount, off.specialists.length, 'all-throwing all fallback');
  assert.ok(off.reply.length > 0, 'offline reply non-empty');

  // 4. Slow runner past timeout becomes fallback (fast test: 50ms timeout floor is 1000ms; use explicit override).
  const slow = await runOrchestrator('coach me', {}, slowRunner(3000), { specialists: ['coach'], timeoutMs: 1000, concurrency: 1 });
  assert.strictEqual(slow.fallbackCount, 1, 'slow agent times out into fallback');

  // 5. Unknown specialist ids are skipped; empty goal is handled.
  const skip = await runOrchestrator('', {}, liveRunner('LIVE'), { specialists: ['voice', 'nope'] });
  assert.strictEqual(skip.specialists.length, 1, 'unknown specialist skipped');
  assert.ok(skip.goal.length > 0, 'empty goal defaulted');

  // 6. Specialists map only to real plays.
  const { getPlay } = require('../lib/openrouter_plays');
  for (const [spec, playId] of Object.entries(SPECIALIST_PLAYS)) {
    assert.ok(getPlay(playId), `${spec} maps to unknown play ${playId}`);
  }

  console.log(`TEST_OK: buddy orchestrator (planner, fan-out, fallback, timeout) pass. Specialists: ${Object.keys(SPECIALIST_PLAYS).join(',')}.`);
})().catch((e) => { console.error('TEST_FAIL:', e); process.exit(1); });
