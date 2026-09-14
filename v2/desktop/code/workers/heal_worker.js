#!/usr/bin/env node
/**
 * heal_worker.js; a FRESH VibeCodeWorker test instance for the self-healing loop.
 *
 * Spawned by lib/opencode_bridge.js (`instance: 'fresh'`) as a separate
 * `node heal_worker.js --test-command "<cmd>" --dir <path>` process with its
 * own memory, so a wedged tester can never poison the healer.
 *
 * Protocol: runs the command, prints human logs to stdout, and ALWAYS prints
 * a single JSON envelope as the LAST line:
 *   {"healWorker":true,"exitCode":0|N,"output":"<tail>"}
 *
 * It can also be pointed at a remote VibeCodeWorker instead of a shell:
 *   node heal_worker.js --remote http://droplet:42069 --test-command "..." --token XYZ
 */

'use strict';

const { spawn } = require('child_process');

let healBudget = null;
try {
  healBudget = require('../lib/heal_budget');
} catch (e) { healBudget = null; }

let smartlog = null;
try {
  const sl = require('../lib/smart_log');
  smartlog = sl.getSharedLog('heal-worker');
  sl.teeConsole(smartlog);
} catch (e) { /* stdout protocol still works without file logging */ }

function wlog(level, msg) {
  try { if (smartlog) smartlog.log(level, 'heal', msg); } catch (e) {}
}

function parseArgs(argv) {
  const out = { testCommand: null, dir: process.cwd(), remote: null, token: null, timeoutMs: 300000, handoff: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if ((a === '--test-command' || a === '--command' || a === '-c') && argv[i + 1]) out.testCommand = argv[++i];
    else if ((a === '--dir' || a === '-d') && argv[i + 1]) out.dir = argv[++i];
    else if (a === '--remote' && argv[i + 1]) out.remote = argv[++i];
    else if ((a === '--token' || a === '-t') && argv[i + 1]) out.token = argv[++i];
    else if (a === '--timeout' && argv[i + 1]) out.timeoutMs = parseInt(argv[++i], 10) || out.timeoutMs;
    else if (a === '--handoff') out.handoff = true;
  }
  return out;
}

function runLocal(command, cwd, timeoutMs) {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const child = spawn(isWin ? 'cmd.exe' : 'sh', [isWin ? '/c' : '-c', command], { cwd, timeout: timeoutMs });
    let out = '';
    const push = (d) => { out += String(d); if (out.length > 256 * 1024) out = out.slice(-256 * 1024); };
    child.stdout.on('data', push);
    child.stderr.on('data', push);
    child.on('error', (e) => resolve({ exitCode: -1, output: out + '\nSPAWN ERROR: ' + e.message }));
    child.on('close', (code) => resolve({ exitCode: code === null ? -1 : code, output: out }));
  });
}

async function runRemote(remoteUrl, testCommand, token, timeoutMs) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Vibe-Auth'] = token;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(remoteUrl.replace(/\/$/, '') + '/api/opencode/heal-test', {
      method: 'POST', headers, signal: controller.signal,
      body: JSON.stringify({ testCommand }),
    });
    const data = await res.json();
    return { exitCode: data.exitCode ?? -1, output: data.output || JSON.stringify(data) };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.handoff && !opts.testCommand) {
    try {
      const sl = require('../lib/smart_log');
      const res = sl.getSharedLog('heal-worker').writeHandoff({ reason: 'heal_worker --handoff' });
      console.log(res.success ? res.path : ('HANDOFF FAILED: ' + res.error));
      console.log(JSON.stringify({ healWorker: true, exitCode: res.success ? 0 : 1, output: res.success ? res.path : res.error }));
    } catch (e) {
      console.log(JSON.stringify({ healWorker: true, exitCode: 1, output: 'HANDOFF FAILED: ' + e.message }));
    }
    process.exit(0);
  }
  if (!opts.testCommand) {
    console.log(JSON.stringify({ healWorker: true, exitCode: -1, output: 'Missing --test-command' }));
    process.exit(2);
  }
  console.log(`[heal_worker] instance=${opts.remote ? 'remote:' + opts.remote : 'local'} dir=${opts.dir}`);
  console.log(`[heal_worker] running: ${opts.testCommand}`);
  wlog('info', `run start: ${opts.testCommand} (${opts.remote ? 'remote' : 'local'}, dir=${opts.dir})`);
  let result;
  try {
    result = opts.remote
      ? await runRemote(opts.remote, opts.testCommand, opts.token, opts.timeoutMs)
      : await runLocal(opts.testCommand, opts.dir, opts.timeoutMs);
  } catch (e) {
    result = { exitCode: -1, output: 'HEAL WORKER ERROR: ' + e.message };
  }
  console.log(`[heal_worker] exitCode=${result.exitCode} (${String(result.output || '').split(/\r?\n/).length} lines)`);
  wlog(result.exitCode === 0 ? 'info' : 'warn', `run finish: exitCode=${result.exitCode}`);
  console.log(JSON.stringify({ healWorker: true, exitCode: result.exitCode, output: String(result.output || '').slice(-12000) }));
  process.exit(0); // envelope carries the real code; worker itself must not crash the loop
}

if (require.main === module) {
  main().catch((e) => {
    console.log(JSON.stringify({ healWorker: true, exitCode: -1, output: 'HEAL WORKER FATAL: ' + e.message }));
    process.exit(0);
  });
}

/**
 * runHealLoopWithBudget — budget-aware heal loop (lib/heal_budget.js).
 *
 * Repeats `testRunner` (+ optional `fixRunner`) until the tests pass, the
 * iteration budget is spent, or the TOKEN budget trips. A tripped token
 * budget stops the run with verdict 'budget_exhausted' — never another fix.
 *
 * Each step result may carry token usage for accounting:
 *   { exitCode, output, usage: { inputTokens, outputTokens } }
 * or plain `{ exitCode, output }` (output tokens estimated at 4 chars/token).
 *
 * @param {object} opts
 * @param {function} opts.testRunner - async ({ iteration, run }) => step result
 * @param {function} [opts.fixRunner] - async ({ iteration, run, testResult }) => step result
 * @param {number} [opts.maxIterations=3]
 * @param {number} [opts.maxTokens] - token cap (null = unlimited)
 * @param {number} [opts.maxSpendUSD] - spend cap in USD (null = unlimited)
 * @param {string} [opts.model='gpt-4o-mini'] - model id priced via lib/pricing.js
 * @param {object} [opts.brain] - optional brain ({ dataDir }) for persistent logging
 * @returns {Promise<object>} run { status, verdict, iteration, history, budget, stopReason }
 */
async function runHealLoopWithBudget({
  testRunner,
  fixRunner = null,
  maxIterations = 3,
  maxTokens = null,
  maxSpendUSD = null,
  model = 'gpt-4o-mini',
  brain = null,
} = {}) {
  if (typeof testRunner !== 'function') {
    throw new Error('heal_worker: runHealLoopWithBudget needs a testRunner function.');
  }
  const budget = healBudget
    ? healBudget.createHealBudget({ maxTokens, maxSpendUSD, model, brain })
    : null;
  const run = {
    status: 'running',
    verdict: null,
    iteration: 0,
    maxIterations,
    history: [],
    budget: budget ? healBudget.summarizeBudget(budget) : null,
    stopReason: null,
  };
  const fail = (verdict, reason) => {
    run.status = verdict;
    run.verdict = verdict;
    run.stopReason = reason;
  };

  while (run.iteration < maxIterations) {
    if (budget) {
      const pre = healBudget.shouldStop(budget);
      if (pre.stop) {
        fail('budget_exhausted', pre.reason);
        break;
      }
    }
    run.iteration++;
    const iter = { iteration: run.iteration, startedAt: new Date().toISOString() };

    iter.testPhase = await testRunner({ iteration: run.iteration, run });
    iter.testPhase = iter.testPhase || { exitCode: -1, output: 'empty test result' };
    if (budget) {
      const rec = healBudget.recordIteration(budget, {
        iteration: run.iteration,
        inputTokens: iter.testPhase.usage && iter.testPhase.usage.inputTokens,
        outputTokens: iter.testPhase.usage && iter.testPhase.usage.outputTokens,
        inputChars: iter.testPhase.usage && iter.testPhase.usage.inputChars,
        outputChars: iter.testPhase.usage && iter.testPhase.usage.outputChars,
        output: iter.testPhase.output,
      });
      iter.budgetLine = rec.ledgerLine;
      console.log(rec.ledgerLine);
      try { if (smartlog) smartlog.log('info', 'heal', rec.ledgerLine); } catch (e) {}
    }
    run.history.push(iter);
    if (iter.testPhase.exitCode === 0) {
      fail('healed', `tests passed on iteration ${run.iteration}`);
      break;
    }
    if (budget) {
      const post = healBudget.shouldStop(budget);
      if (post.stop) {
        fail('budget_exhausted', post.reason);
        break;
      }
    }

    if (typeof fixRunner === 'function') {
      iter.fixPhase = await fixRunner({ iteration: run.iteration, run, testResult: iter.testPhase });
      iter.fixPhase = iter.fixPhase || { success: false, error: 'empty fix result' };
      if (budget && iter.fixPhase.usage) {
        const rec = healBudget.recordIteration(budget, {
          iteration: run.iteration,
          inputTokens: iter.fixPhase.usage.inputTokens,
          outputTokens: iter.fixPhase.usage.outputTokens,
          inputChars: iter.fixPhase.usage.inputChars,
          outputChars: iter.fixPhase.usage.outputChars,
          output: iter.fixPhase.summary || iter.fixPhase.output,
        });
        iter.budgetLineFix = rec.ledgerLine;
        console.log(rec.ledgerLine);
      }
      if (budget) {
        const postFix = healBudget.shouldStop(budget);
        if (postFix.stop) {
          fail('budget_exhausted', postFix.reason);
          break;
        }
      }
      if (!iter.fixPhase.success) {
        fail('fix_failed', iter.fixPhase.error || `fixer failed on iteration ${run.iteration}`);
        break;
      }
    }
    iter.finishedAt = new Date().toISOString();
  }
  if (run.status === 'running') {
    fail('iterations_exhausted', `maxIterations=${maxIterations} reached with tests still failing`);
  }
  if (budget) run.budget = healBudget.summarizeBudget(budget);
  run.finishedAt = new Date().toISOString();
  return run;
}

module.exports = { parseArgs, runLocal, runHealLoopWithBudget };
