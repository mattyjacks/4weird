/**
 * Smoke tests for automation/bot_heal_loop.js (DS-OCT-05).
 *
 * Run: node tests/test_bot_heal_loop.js
 * Exit 0 = all scenarios PASS, non-zero = failure (bot/scheduler friendly).
 *
 * Scenarios (all steps stubbed — no real game tools, no real opencode):
 *   A. stubbed bugtest fails twice then passes      -> verdict `healed`
 *   B. stubbed bugtest always fails + tight budget  -> verdict `budget_exhausted`
 *   C. stubbed bugtest always fails + tight iters   -> verdict `iterations_exhausted`
 * Also asserts: every state transition is logged (transition spy sees
 * BUGTEST/COLLECT/FIX/RETEST/DONE) and CLI+config parsing works.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Keep smart_log writes out of the real log dir during tests.
process.env.VIBE_LOG_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-heal-test-'));
process.env.BOT_HEAL_QUIET = '1';

const loop = require('../automation/bot_heal_loop.js');

function baseCfg(overrides) {
  return {
    gameId: 'test-game',
    testCommand: 'stubbed',
    testCwd: __dirname,
    maxIterations: 5,
    maxTokens: 200000,
    maxSpendUSD: 1.0,
    priceInPer1k: 0.003,
    priceOutPer1k: 0.015,
    instructions: '',
    opencode: { autoApprove: true },
    ...(overrides || {}),
  };
}

// Scripted stub: sequence of exit codes; collects bugs like the real step.
function scriptedRunTest(exits) {
  let calls = 0;
  const fn = async () => {
    const code = calls < exits.length ? exits[calls] : exits[exits.length - 1];
    calls++;
    return code === 0
      ? { exitCode: 0, output: 'ok - all 3 tests passed' }
      : { exitCode: 1, output: `FAIL test #${calls}: widget froze\nError: timeout at step ${calls}` };
  };
  fn.calls = () => calls;
  return fn;
}

function stubFixSuccess(opts) {
  const o = opts || {};
  let calls = 0;
  const fn = async () => {
    calls++;
    return { success: true, inputTokens: o.in || 100, outputTokens: o.out || 100 };
  };
  fn.calls = () => calls;
  return fn;
}

function transitionSpy() {
  const seen = [];
  const fn = (from, to, detail) => { seen.push(`${from}->${to}`); };
  fn.seen = seen;
  return fn;
}

async function scenarioA() {
  const runTest = scriptedRunTest([1, 1, 0]);
  const runFix = stubFixSuccess();
  const log = transitionSpy();
  const res = await loop.runBotHealLoop(baseCfg({ maxIterations: 5 }), { runTest, runFix, log });
  assert.strictEqual(res.verdict, 'healed', 'A: expected healed, got ' + JSON.stringify(res));
  assert.strictEqual(res.iterations, 3, 'A: expected 3 iterations');
  assert.strictEqual(runFix.calls(), 2, 'A: expected 2 fix calls');
  for (const t of ['BOOT->BUGTEST', 'BUGTEST->COLLECT', 'COLLECT->FIX', 'FIX->RETEST', 'RETEST->DONE']) {
    assert.ok(log.seen.includes(t), `A: missing transition ${t} (saw: ${log.seen.join(', ')})`);
  }
  console.log('PASS A: fail,fail,pass -> healed (2 fixes, 3 iterations, all transitions logged)');
}

async function scenarioB() {
  const runTest = scriptedRunTest([1]); // always fails
  // Each fix burns 60k tokens of a 100k budget -> exhausted after 2nd fix.
  const runFix = stubFixSuccess({ in: 40000, out: 20000 });
  const log = transitionSpy();
  const res = await loop.runBotHealLoop(baseCfg({ maxIterations: 10, maxTokens: 100000, maxSpendUSD: 999 }), { runTest, runFix, log });
  assert.strictEqual(res.verdict, 'budget_exhausted', 'B: expected budget_exhausted, got ' + JSON.stringify(res));
  assert.ok(runFix.calls() <= 2, `B: expected <=2 fixes before budget stop, got ${runFix.calls()}`);
  console.log(`PASS B: always-fail -> budget_exhausted (${runFix.calls()} fixes, verdict=${res.verdict})`);
}

async function scenarioC() {
  const runTest = scriptedRunTest([1]); // always fails
  const runFix = stubFixSuccess({ in: 10, out: 10 }); // negligible spend
  const res = await loop.runBotHealLoop(
    baseCfg({ maxIterations: 2, maxTokens: 200000, maxSpendUSD: 999 }),
    { runTest, runFix, log: transitionSpy() }
  );
  assert.strictEqual(res.verdict, 'iterations_exhausted', 'C: expected iterations_exhausted, got ' + JSON.stringify(res));
  assert.strictEqual(res.iterations, 2, 'C: expected 2 iterations');
  assert.strictEqual(runFix.calls(), 2, 'C: expected 2 fix calls');
  console.log('PASS C: always-fail + maxIterations=2 -> iterations_exhausted');
}

function scenarioD() {
  // Config: file + CLI flags (flags win); budgets parsed as numbers.
  const tmp = path.join(process.env.VIBE_LOG_DIR, 'heal-config.json');
  fs.writeFileSync(tmp, JSON.stringify({ gameId: 'file-game', testCommand: 'file-cmd', maxIterations: 7, maxSpendUSD: 2.5 }), 'utf8');
  const cfg = loop.loadConfig({ configPath: tmp, gameId: 'cli-game', maxTokens: 12345 });
  assert.strictEqual(cfg.gameId, 'cli-game', 'D: CLI flag should override file');
  assert.strictEqual(cfg.testCommand, 'file-cmd', 'D: file value should apply when no flag');
  assert.strictEqual(cfg.maxIterations, 7, 'D: file maxIterations should apply');
  assert.strictEqual(cfg.maxTokens, 12345, 'D: CLI maxTokens should apply');
  assert.strictEqual(cfg.maxSpendUSD, 2.5, 'D: file maxSpendUSD should apply');
  assert.strictEqual(cfg.opencode.autoApprove, true, 'D: bot path must force autoApprove=true');
  const cli = loop.parseCliArgs(['node', 'x', '--game', 'g1', '--test-command', 'npm test', '--max-iterations', '4', '--max-tokens', '5000', '--max-spend-usd', '0.5']);
  assert.strictEqual(cli.gameId, 'g1');
  assert.strictEqual(cli.testCommand, 'npm test');
  assert.strictEqual(cli.maxIterations, 4);
  assert.strictEqual(cli.maxTokens, 5000);
  assert.strictEqual(cli.maxSpendUSD, 0.5);
  console.log('PASS D: config file + CLI flags merge correctly (flags win, autoApprove forced)');
}

async function main() {
  await scenarioA();
  await scenarioB();
  await scenarioC();
  scenarioD();
  console.log('SMOKE_OK: test_bot_heal_loop 4/4 scenarios PASS');
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('SMOKE_FAIL:', e && e.stack ? e.stack : e);
  process.exit(1);
});
