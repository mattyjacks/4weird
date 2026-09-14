/**
 * Tests for lib/heal_budget.js + the budget-aware heal loop in workers/heal_worker.js.
 * Run: node tests/test_heal_budget.js
 *
 * Reviewer proof: a stubbed run with maxSpendUSD=0.01 stops on spend with
 * verdict 'budget_exhausted' BEFORE iteration 3.
 */
'use strict';

const assert = require('assert');
const {
  createHealBudget,
  recordIteration,
  shouldStop,
  summarizeBudget,
  getLedger,
  estimateTokensForChars,
} = require('../lib/heal_budget');
const { runHealLoopWithBudget } = require('../workers/heal_worker');

let passed = 0;
let failed = 0;
async function ok(name, fn) {
  try { await fn(); passed++; console.log(`  ok - ${name}`); }
  catch (e) { failed++; console.error(`  FAIL - ${name}: ${e.message}`); }
}

(async () => {
  console.log('test_heal_budget:');

  await ok('estimateTokensForChars uses 4 chars/token', () => {
    assert.strictEqual(estimateTokensForChars(0), 0);
    assert.strictEqual(estimateTokensForChars(4), 1);
    assert.strictEqual(estimateTokensForChars(5), 2);
    assert.strictEqual(estimateTokensForChars(400), 100);
  });

  await ok('createHealBudget stores caps + model', () => {
    const b = createHealBudget({ maxTokens: 50000, maxSpendUSD: 0.5, model: 'gpt-4o-mini' });
    assert.strictEqual(b.maxTokens, 50000);
    assert.strictEqual(b.maxSpendUSD, 0.5);
    assert.strictEqual(b.model, 'gpt-4o-mini');
    assert.strictEqual(b.totalTokens, 0);
    const free = createHealBudget({});
    assert.strictEqual(free.maxTokens, Infinity);
    assert.strictEqual(free.maxSpendUSD, Infinity);
  });

  await ok('recordIteration accounts tokens + spend + ledger line', () => {
    const b = createHealBudget({ maxTokens: 100000, maxSpendUSD: 10, model: 'gpt-4o-mini' });
    const r = recordIteration(b, { iteration: 1, inputTokens: 400, outputTokens: 200 });
    assert.strictEqual(b.totalTokens, 600);
    assert.strictEqual(b.totalSpendUSD > 0, true);
    assert.strictEqual(r.stop, false);
    assert.strictEqual(r.reason, 'ok');
    assert.match(r.ledgerLine, /iter=1/);
    assert.match(r.ledgerLine, /in=400 out=200/);
    assert.strictEqual(getLedger(b).length, 1);
  });

  await ok('recordIteration estimates output tokens from text', () => {
    const b = createHealBudget({ model: 'gpt-4o-mini' });
    const r = recordIteration(b, { iteration: 1, output: 'x'.repeat(400) });
    assert.strictEqual(r.entry.outputTokens, 100);
    assert.strictEqual(r.entry.inputTokens, 0);
  });

  await ok('shouldStop trips on maxTokens', () => {
    const b = createHealBudget({ maxTokens: 500, maxSpendUSD: 100, model: 'gpt-4o-mini' });
    recordIteration(b, { iteration: 1, inputTokens: 400, outputTokens: 200 });
    const s = shouldStop(b);
    assert.strictEqual(s.stop, true);
    assert.match(s.reason, /maxTokens/);
  });

  await ok('shouldStop trips on maxSpendUSD', () => {
    const b = createHealBudget({ maxTokens: 100000000, maxSpendUSD: 0.01, model: 'gpt-4o-mini' });
    // gpt-4o-mini: $0.15/1M in + $0.60/1M out -> ~$0.021, over the $0.01 cap.
    recordIteration(b, { iteration: 1, inputTokens: 100000, outputTokens: 10000 });
    const s = shouldStop(b);
    assert.strictEqual(s.stop, true);
    assert.match(s.reason, /maxSpendUSD/);
  });

  await ok('shouldStop stays ok under budget', () => {
    const b = createHealBudget({ maxTokens: 100000, maxSpendUSD: 10, model: 'gpt-4o-mini' });
    recordIteration(b, { iteration: 1, inputTokens: 10, outputTokens: 10 });
    assert.deepStrictEqual(shouldStop(b), { stop: false, reason: 'ok' });
  });

  await ok('summarizeBudget reports totals', () => {
    const b = createHealBudget({ maxTokens: 10, model: 'gpt-4o-mini' });
    recordIteration(b, { iteration: 1, inputTokens: 4, outputTokens: 4 });
    const s = summarizeBudget(b);
    assert.strictEqual(s.totalTokens, 8);
    assert.strictEqual(s.iterations, 1);
    assert.strictEqual(s.model, 'gpt-4o-mini');
  });

  await ok('SMOKE: stubbed run stops on spend before iteration 3 with budget_exhausted', async () => {
    let calls = 0;
    const run = await runHealLoopWithBudget({
      maxIterations: 3,
      maxSpendUSD: 0.01,
      model: 'gpt-4o-mini',
      testRunner: async () => {
        calls++;
        return {
          exitCode: 1,
          output: 'FAIL: stubbed test failure',
          usage: { inputTokens: 100000, outputTokens: 10000 }, // ~$0.021 > $0.01 cap
        };
      },
    });
    assert.strictEqual(run.verdict, 'budget_exhausted');
    assert.strictEqual(run.status, 'budget_exhausted');
    assert.ok(run.iteration < 3, `expected stop before iteration 3, got ${run.iteration}`);
    assert.strictEqual(calls, 1);
    assert.match(run.stopReason, /maxSpendUSD/);
  });

  await ok('stubbed passing run heals', async () => {
    const run = await runHealLoopWithBudget({
      maxIterations: 3,
      maxSpendUSD: 10,
      model: 'gpt-4o-mini',
      testRunner: async () => ({ exitCode: 0, output: 'ok' }),
    });
    assert.strictEqual(run.verdict, 'healed');
    assert.strictEqual(run.iteration, 1);
  });

  await ok('stubbed failing run without budget exhausts iterations', async () => {
    const run = await runHealLoopWithBudget({
      maxIterations: 3,
      testRunner: async () => ({ exitCode: 1, output: 'FAIL forever' }),
    });
    assert.strictEqual(run.verdict, 'iterations_exhausted');
    assert.strictEqual(run.iteration, 3);
  });

  console.log(`test_heal_budget: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
})().catch((e) => { console.error('test_heal_budget FATAL:', e); process.exitCode = 1; });
