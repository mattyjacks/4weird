/**
 * Bot-driven bugtest -> fix -> retest loop (DS-OCT-05).
 *
 * State machine: BUGTEST -> COLLECT -> FIX -> RETEST -> repeat until
 *   clean (verdict `healed`),
 *   budget exhausted (verdict `budget_exhausted`: maxTokens / maxSpendUSD),
 *   max iterations reached (verdict `iterations_exhausted`), or
 *   an unexpected failure (verdict `error`).
 *
 * Bot/automation controlled: designed to be launched by a bot or scheduler
 * with zero prompts. The opencode fix step always runs the autoApprove path
 * (`autoApprove: true`, i.e. `opencode run --auto`) so a fix run never stalls
 * on a permission prompt.
 *
 * Read-only consumers (NEVER edited here, owned by sibling envelopes):
 *   - ../lib/opencode_bridge.js (DS-OCT-01) — direct-code-editing fix runs.
 *   - ../lib/heal_budget.js    (DS-OCT-02) — token/usd budget tracking.
 *     That module may still be in flight; when absent (or when its shape
 *     is unexpected) this driver falls back to a small built-in ledger that
 *     estimates tokens as ceil(chars/4) and prices them from config.
 *     Known shapes consumed read-only: createHealBudget/recordIteration/
 *     shouldStop/summarizeBudget, createBudget{record,isExhausted}, or the
 *     HealBudget class.
 * Logging: every state transition is appended to smart_log
 *   (../lib/smart_log.js, source `bot-heal-loop`), best-effort/never throws.
 *
 * Config: JSON file + CLI flags (flags win). Keys:
 *   { gameId, testCommand, testCwd, maxIterations, maxTokens, maxSpendUSD,
 *     priceInPer1k, priceOutPer1k, opencode: { enabled, mode, autoApprove, ... },
 *     instructions }
 * CLI: --game, --test-command, --config, --max-iterations, --max-tokens,
 *      --max-spend-usd, --test-cwd, --json (verdict JSON only on stdout)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ─── Read-only bridge imports (never edited by this envelope) ────────────

let bridge = null;
try {
  bridge = require('../lib/opencode_bridge.js'); // DS-OCT-01 owned
} catch (e) {
  bridge = null;
}

let healBudget = null;
try {
  healBudget = require('../lib/heal_budget.js'); // DS-OCT-02 owned
} catch (e) {
  healBudget = null;
}

let smartLogMod = null;
try {
  smartLogMod = require('../lib/smart_log.js');
} catch (e) {
  smartLogMod = null;
}

// ─── Defaults ─────────────────────────────────────────────────────────────

const DEFAULTS = {
  gameId: 'unknown',
  testCommand: 'node tests/test_vibecodeworker.js',
  testCwd: null, // defaults to the desktop/code dir
  maxIterations: 3,
  maxTokens: 200000,
  maxSpendUSD: 1.0,
  priceInPer1k: 0.003, // fallback $3 / 1M input tokens
  priceOutPer1k: 0.015, // fallback $15 / 1M output tokens
  instructions: '',
  opencode: { autoApprove: true },
};

const VERDICTS = ['healed', 'budget_exhausted', 'iterations_exhausted', 'error'];

// ─── Logging (every transition -> smart_log, never throws) ────────────────

function makeLogger(source) {
  let shared = null;
  try {
    if (smartLogMod && typeof smartLogMod.getSharedLog === 'function') {
      shared = smartLogMod.getSharedLog(source || 'bot-heal-loop');
    }
  } catch (e) {
    shared = null;
  }
  return function logTransition(from, to, detail) {
    const line = `[bot_heal_loop] ${from} -> ${to}` +
      (detail ? ` :: ${typeof detail === 'string' ? detail : safeJson(detail)}` : '');
    try {
      if (shared) shared.info(line, { category: 'heal-loop' });
    } catch (e) { /* logging never breaks the loop */ }
    if (!process.env.BOT_HEAL_QUIET) {
      try { console.log(line); } catch (e) {}
    }
    return line;
  };
}

function safeJson(x) {
  try {
    return JSON.stringify(x).slice(0, 2000);
  } catch (e) {
    return String(x).slice(0, 500);
  }
}

// ─── Config: file + CLI flags (flags win) ─────────────────────────────────

function parseCliArgs(argv) {
  const args = Array.isArray(argv) ? argv : process.argv;
  const out = {};
  for (let i = 2; i < args.length; i++) {
    const a = args[i];
    if (a === '--game' || a === '--game-id') out.gameId = args[++i];
    else if (a === '--test-command') out.testCommand = args[++i];
    else if (a === '--test-cwd') out.testCwd = args[++i];
    else if (a === '--config') out.configPath = args[++i];
    else if (a === '--max-iterations') out.maxIterations = parseInt(args[++i], 10);
    else if (a === '--max-tokens') out.maxTokens = parseInt(args[++i], 10);
    else if (a === '--max-spend-usd') out.maxSpendUSD = parseFloat(args[++i]);
    else if (a === '--instructions') out.instructions = args[++i];
    else if (a === '--json') out.jsonOnly = true;
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function loadConfig(cli) {
  const cfg = { ...DEFAULTS, opencode: { ...DEFAULTS.opencode } };
  const fromFile = {};
  const configPath = (cli && cli.configPath) || process.env.BOT_HEAL_CONFIG || null;
  if (configPath) {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    Object.assign(fromFile, raw);
  } else {
    // Adjacent default: automation/bot_heal_loop.config.json (optional).
    const adjacent = path.join(__dirname, 'bot_heal_loop.config.json');
    if (fs.existsSync(adjacent)) {
      Object.assign(fromFile, JSON.parse(fs.readFileSync(adjacent, 'utf8')));
    }
  }
  // Env overrides (scheduler-friendly), then CLI flags (highest precedence).
  if (process.env.BOT_HEAL_GAME) fromFile.gameId = process.env.BOT_HEAL_GAME;
  if (process.env.BOT_HEAL_TEST_COMMAND) fromFile.testCommand = process.env.BOT_HEAL_TEST_COMMAND;
  const merged = { ...cfg, ...fromFile };
  merged.opencode = { ...(cfg.opencode || {}), ...((fromFile && fromFile.opencode) || {}) };
  // Bot path is always auto-approved: zero prompts by design.
  merged.opencode.autoApprove = true;
  if (cli) {
    for (const k of ['gameId', 'testCommand', 'testCwd', 'maxIterations', 'maxTokens', 'maxSpendUSD', 'instructions']) {
      if (cli[k] !== undefined && cli[k] !== null && !(typeof cli[k] === 'number' && isNaN(cli[k]))) {
        merged[k] = cli[k];
      }
    }
  }
  merged.maxIterations = Math.max(1, parseInt(merged.maxIterations, 10) || DEFAULTS.maxIterations);
  merged.maxTokens = Math.max(1, parseInt(merged.maxTokens, 10) || DEFAULTS.maxTokens);
  merged.maxSpendUSD = Math.max(0, parseFloat(merged.maxSpendUSD) || 0);
  return merged;
}

// ─── Budget ledger (uses DS-OCT-02 module when present, else fallback) ────

function estimateTokensFor(text) {
  return Math.ceil(String(text || '').length / 4);
}

function createLedger(cfg) {
  // Prefer the DS-OCT-02 budget module when it exposes a usable tracker
  // (read-only: we only call its factory/record/stop/summary functions).
  try {
    if (healBudget) {
      if (typeof healBudget.createBudget === 'function') {
        const b = healBudget.createBudget({
          maxTokens: cfg.maxTokens,
          maxSpendUSD: cfg.maxSpendUSD,
        });
        if (b && typeof b.record === 'function' && typeof b.isExhausted === 'function') {
          return { tracker: b, fallback: null };
        }
      } else if (typeof healBudget.HealBudget === 'function') {
        const b = new healBudget.HealBudget({ maxTokens: cfg.maxTokens, maxSpendUSD: cfg.maxSpendUSD });
        if (b && typeof b.record === 'function') return { tracker: b, fallback: null };
      }
      if (typeof healBudget.createHealBudget === 'function' &&
          typeof healBudget.recordIteration === 'function' &&
          typeof healBudget.shouldStop === 'function') {
        const b = healBudget.createHealBudget({ maxTokens: cfg.maxTokens, maxSpendUSD: cfg.maxSpendUSD });
        if (b && Array.isArray(b.iterations)) return { tracker: b, oct02: true, fallback: null };
      }
    }
  } catch (e) { /* fall through to built-in ledger */ }
  const fb = {
    inputTokens: 0,
    outputTokens: 0,
    spendUSD: 0,
    record(inputTokens, outputTokens) {
      this.inputTokens += inputTokens || 0;
      this.outputTokens += outputTokens || 0;
      this.spendUSD += ((inputTokens || 0) / 1000) * cfg.priceInPer1k +
        ((outputTokens || 0) / 1000) * cfg.priceOutPer1k;
    },
    isExhausted() {
      const tokens = this.inputTokens + this.outputTokens;
      return { tokens, spendUSD: this.spendUSD, exhausted: tokens >= cfg.maxTokens || this.spendUSD >= cfg.maxSpendUSD };
    },
    summary() {
      return { inputTokens: this.inputTokens, outputTokens: this.outputTokens, spendUSD: this.spendUSD };
    },
  };
  return { tracker: null, fallback: fb };
}

function ledgerRecord(ledger, cfg, inputTokens, outputTokens) {
  if (ledger.tracker) {
    if (ledger.oct02) {
      healBudget.recordIteration(ledger.tracker, { inputTokens, outputTokens });
    } else {
      ledger.tracker.record({ inputTokens, outputTokens });
    }
  } else {
    ledger.fallback.record(inputTokens, outputTokens);
  }
}

function ledgerStatus(ledger, cfg) {
  if (ledger.tracker) {
    if (ledger.oct02) {
      try {
        const s = healBudget.shouldStop(ledger.tracker);
        return {
          exhausted: !!(s && s.stop),
          reason: s && s.reason ? String(s.reason).slice(0, 300) : 'ok',
          tokens: Number(ledger.tracker.totalTokens) || 0,
          spendUSD: Number(ledger.tracker.totalSpendUSD) || 0,
        };
      } catch (e) {
        return { exhausted: false, tokens: 0, spendUSD: 0 };
      }
    }
    try {
      const s = ledger.tracker.isExhausted();
      if (s && typeof s === 'object') {
        return {
          exhausted: !!s.exhausted,
          tokens: s.tokens != null ? s.tokens : (s.totalTokens || 0),
          spendUSD: s.spendUSD != null ? s.spendUSD : (s.spend || 0),
        };
      }
      return { exhausted: !!s, tokens: 0, spendUSD: 0 };
    } catch (e) {
      return { exhausted: false, tokens: 0, spendUSD: 0 };
    }
  }
  const s = ledger.fallback.isExhausted();
  return { exhausted: s.exhausted, tokens: s.tokens, spendUSD: s.spendUSD };
}

function ledgerSummary(ledger) {
  try {
    if (ledger.tracker && ledger.oct02 && typeof healBudget.summarizeBudget === 'function') {
      return { ...(healBudget.summarizeBudget(ledger.tracker) || {}), via: 'heal_budget' };
    }
    if (ledger.tracker && typeof ledger.tracker.summary === 'function') return ledger.tracker.summary();
  } catch (e) {}
  if (ledger.tracker) return { via: 'heal_budget' };
  return ledger.fallback.summary();
}

// ─── Default step implementations (overridable via deps for tests) ────────

function defaultRunTest(testCommand, cwd) {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const child = spawn(isWin ? 'cmd.exe' : 'sh', [isWin ? '/c' : '-c', testCommand], {
      cwd: cwd || path.resolve(__dirname, '..'),
      timeout: 300000,
    });
    let out = '';
    child.stdout.on('data', (d) => { out += String(d); if (out.length > 256 * 1024) out = out.slice(-256 * 1024); });
    child.stderr.on('data', (d) => { out += String(d); if (out.length > 256 * 1024) out = out.slice(-256 * 1024); });
    child.on('error', (e) => resolve({ exitCode: -1, output: out + '\nSPAWN ERROR: ' + e.message }));
    child.on('close', (code) => resolve({ exitCode: code === null ? -1 : code, output: out.slice(-12000) }));
  });
}

function bugsFromTestOutput(output, gameId, iteration) {
  const text = String(output || '');
  const failures = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    if (/fail|error|not ok|assertionerror/i.test(t) && !/0 fail/i.test(t)) {
      failures.push(t.slice(0, 500));
      if (failures.length >= 20) break;
    }
  }
  return failures.map((f, i) => ({
    id: `BOTHEAL-${iteration}-${i + 1}`,
    gameId,
    title: f.slice(0, 160),
    description: `bot_heal_loop iteration ${iteration}: test command failed.\n\nFailure line:\n${f}\n\nFull tail:\n${text.slice(-3000)}`,
    severity: 'high',
    status: 'open',
  }));
}

async function defaultRunFix({ bugs, cfg, log }) {
  if (!bridge) {
    return { success: false, error: 'opencode_bridge unavailable (lib/opencode_bridge.js not loadable).', hint: 'openCode bridge missing' };
  }
  const prompt = typeof bridge.buildBugFixPrompt === 'function'
    ? bridge.buildBugFixPrompt({ bugs, gameId: cfg.gameId, instructions: cfg.instructions, testCommand: cfg.testCommand })
    : `Fix ${bugs.length} bug(s) for game ${cfg.gameId}. Verification: \`${cfg.testCommand}\`.`;
  // AutoApprove path: zero prompts by design (bot/scheduler launched).
  if (typeof bridge.runOpenCodeFix === 'function') {
    let exported = null;
    try {
      if (typeof bridge.exportBugReport === 'function') {
        exported = bridge.exportBugReport({ bugs, gameId: cfg.gameId, instructions: cfg.instructions, testCommand: cfg.testCommand });
      }
    } catch (e) {
      exported = { success: false, error: e.message };
    }
    const promptFile = exported && exported.success ? exported.mdPath : null;
    const res = await bridge.runOpenCodeFix({
      prompt: promptFile ? undefined : prompt,
      promptFile: promptFile || undefined,
      dir: cfg.testCwd || undefined,
      autoApprove: true,
    });
    const inTok = estimateTokensFor(prompt);
    const outTok = estimateTokensFor((res && (res.stdoutTail || res.transcript)) || '');
    return { ...res, inputTokens: inTok, outputTokens: outTok };
  }
  if (typeof bridge.fixBugs === 'function') {
    const res = await bridge.fixBugs({
      bugs, gameId: cfg.gameId, instructions: cfg.instructions,
      testCommand: cfg.testCommand, config: { ...(cfg.opencode || {}), autoApprove: true },
    });
    const inTok = estimateTokensFor(prompt);
    const outTok = estimateTokensFor((res && (res.stdoutTail || res.transcript)) || '');
    return { ...res, inputTokens: inTok, outputTokens: outTok };
  }
  return { success: false, error: 'No fix entry point on opencode_bridge (need runOpenCodeFix or fixBugs).' };
}

// ─── State machine ────────────────────────────────────────────────────────

/**
 * Run the loop. `deps` overrides steps (used by smoke tests):
 *   { runTest(testCommand, cwd), collectBugs(output, gameId, iteration),
 *     runFix({ bugs, cfg }), log(from, to, detail) }
 * Resolves { verdict, iterations, bugs, budget, history }.
 */
async function runBotHealLoop(cfg, deps) {
  const d = deps || {};
  const log = d.log || makeLogger('bot-heal-loop');
  const runTest = d.runTest || defaultRunTest;
  const collectBugs = d.collectBugs || bugsFromTestOutput;
  const runFix = d.runFix || defaultRunFix;
  const ledger = createLedger(cfg);
  const history = [];
  let state = 'BOOT';
  let iteration = 0;
  let lastBugs = [];

  const transition = (to, detail) => {
    log(state, to, detail);
    state = to;
  };

  try {
    transition('BUGTEST', `game=${cfg.gameId} cmd=${cfg.testCommand}`);
    // eslint-disable-next-line no-constant-condition
    while (true) {
      iteration++;
      const iter = { iteration, state: 'BUGTEST' };

      // — BUGTEST / RETEST: run the game test tools —
      const testRes = await runTest(cfg.testCommand, cfg.testCwd || path.resolve(__dirname, '..'));
      iter.testExitCode = testRes.exitCode;
      iter.testTail = String(testRes.output || '').slice(-2000);
      transition(iteration === 1 ? 'BUGTEST' : 'RETEST',
        `iter=${iteration} exit=${testRes.exitCode}`);

      if (testRes.exitCode === 0) {
        iter.state = 'DONE';
        history.push(iter);
        transition('DONE', `verdict=healed iterations=${iteration}`);
        return finish('healed', iteration, [], ledger, cfg, history);
      }

      // — COLLECT: gather bugs from the failing output —
      transition('COLLECT', `iter=${iteration} exit=${testRes.exitCode}`);
      let bugs = [];
      try {
        bugs = await collectBugs(testRes.output, cfg.gameId, iteration);
      } catch (e) {
        bugs = [{ id: `BOTHEAL-${iteration}-0`, gameId: cfg.gameId, title: 'collect-failed: ' + e.message, description: String(testRes.output || '').slice(-3000), severity: 'high', status: 'open' }];
      }
      lastBugs = Array.isArray(bugs) ? bugs : [];
      iter.bugCount = lastBugs.length;
      history.push(iter);

      if (lastBugs.length === 0) {
        // Failing tests but nothing collectible: cannot auto-fix; stop as error.
        transition('DONE', `verdict=error reason=no-collectible-bugs iter=${iteration}`);
        return finish('error', iteration, lastBugs, ledger, cfg, history, 'Failing tests produced no collectible bugs.');
      }

      // Budget gate BEFORE paying for a fix.
      const pre = ledgerStatus(ledger, cfg);
      if (pre.exhausted) {
        transition('DONE', `verdict=budget_exhausted tokens=${pre.tokens} spend=$${pre.spendUSD}`);
        return finish('budget_exhausted', iteration, lastBugs, ledger, cfg, history);
      }
      if (iteration > cfg.maxIterations) {
        transition('DONE', `verdict=iterations_exhausted iterations=${iteration - 1}/${cfg.maxIterations}`);
        return finish('iterations_exhausted', iteration - 1, lastBugs, ledger, cfg, history);
      }

      // — FIX via opencode (autoApprove, zero prompts) —
      transition('FIX', `iter=${iteration} bugs=${lastBugs.length} autoApprove=true`);
      let fixRes;
      try {
        fixRes = await runFix({ bugs: lastBugs, cfg });
      } catch (e) {
        transition('DONE', `verdict=error reason=fix-threw iter=${iteration} err=${e.message}`);
        return finish('error', iteration, lastBugs, ledger, cfg, history, `Fix step threw: ${e.message}`);
      }
      iter.fixSuccess = !!(fixRes && fixRes.success);
      iter.fixError = fixRes && fixRes.error ? String(fixRes.error).slice(0, 500) : null;

      // Charge the ledger for the fix attempt.
      const inTok = (fixRes && fixRes.inputTokens) != null ? fixRes.inputTokens : estimateTokensFor(JSON.stringify(lastBugs).slice(0, 8000));
      const outTok = (fixRes && fixRes.outputTokens) != null ? fixRes.outputTokens : estimateTokensFor((fixRes && (fixRes.stdoutTail || fixRes.transcript)) || '');
      ledgerRecord(ledger, cfg, inTok, outTok);
      const post = ledgerStatus(ledger, cfg);
      transition(post.exhausted ? 'DONE' : 'RETEST',
        `iter=${iteration} fixSuccess=${iter.fixSuccess} tokens=${post.tokens}/${cfg.maxTokens} spend=$${Number(post.spendUSD).toFixed(4)}/$${cfg.maxSpendUSD}`);

      if (!iter.fixSuccess) {
        // Fix failed: retest anyway unless budget/iterations say stop, so a
        // flaky fixer gets one more observation; but a hard opencode error
        // (binary missing) is terminal to avoid burning budget.
        const hardFail = /binary not found|unavailable|no fix entry point/i.test(iter.fixError || '');
        if (hardFail) {
          return finish('error', iteration, lastBugs, ledger, cfg, history, iter.fixError);
        }
      }
      if (post.exhausted) {
        return finish('budget_exhausted', iteration, lastBugs, ledger, cfg, history);
      }
      if (iteration >= cfg.maxIterations) {
        transition('DONE', `verdict=iterations_exhausted iterations=${iteration}/${cfg.maxIterations}`);
        return finish('iterations_exhausted', iteration, lastBugs, ledger, cfg, history);
      }
      // Loop continues: next pass logs BUGTEST->RETEST via the test block.
    }
  } catch (e) {
    try { transition('DONE', `verdict=error err=${e.message}`); } catch (e2) {}
    return finish('error', iteration, lastBugs, ledger, cfg, history, e.message);
  }
}

function finish(verdict, iterations, bugs, ledger, cfg, history, error) {
  const budget = { ...(ledgerSummary(ledger) || {}), maxTokens: cfg.maxTokens, maxSpendUSD: cfg.maxSpendUSD, maxIterations: cfg.maxIterations };
  const result = {
    verdict,
    gameId: cfg.gameId,
    iterations,
    bugs: Array.isArray(bugs) ? bugs.length : 0,
    budget,
    history,
  };
  if (error) result.error = String(error).slice(0, 1000);
  return result;
}

// ─── CLI entrypoint ───────────────────────────────────────────────────────

async function main(argv) {
  const cli = parseCliArgs(argv);
  if (cli.help) {
    console.log([
      'bot_heal_loop.js — bot-driven bugtest/fix/retest loop (DS-OCT-05)',
      '',
      'Usage: node automation/bot_heal_loop.js [options]',
      '  --game <id>             game under test (default: unknown)',
      '  --test-command <cmd>    test tools command (default: node tests/test_vibecodeworker.js)',
      '  --test-cwd <dir>        cwd for the test command (default: v2/desktop/code)',
      '  --config <path>         JSON config file (flags override file)',
      '  --max-iterations <n>    stop after n fix attempts (default: 3)',
      '  --max-tokens <n>        token budget (default: 200000)',
      '  --max-spend-usd <x>     USD budget (default: 1.0)',
      '  --instructions <text>   extra instructions forwarded to the fix prompt',
      '  --json                  print only the final verdict JSON',
      '',
      'Exit codes: 0 healed | 2 budget_exhausted | 3 iterations_exhausted | 1 error',
    ].join('\n'));
    return 0;
  }
  if (cli.jsonOnly) process.env.BOT_HEAL_QUIET = '1';
  let cfg;
  try {
    cfg = loadConfig(cli);
  } catch (e) {
    console.error(JSON.stringify({ verdict: 'error', error: 'bad config: ' + e.message }));
    return 1;
  }
  const result = await runBotHealLoop(cfg);
  console.log(JSON.stringify(result, null, cli.jsonOnly ? 0 : 2));
  return result.verdict === 'healed' ? 0
    : result.verdict === 'budget_exhausted' ? 2
    : result.verdict === 'iterations_exhausted' ? 3 : 1;
}

if (require.main === module) {
  main(process.argv).then((code) => process.exit(code)).catch((e) => {
    console.error(JSON.stringify({ verdict: 'error', error: e && e.message }));
    process.exit(1);
  });
}

module.exports = {
  DEFAULTS,
  VERDICTS,
  parseCliArgs,
  loadConfig,
  createLedger,
  ledgerRecord,
  ledgerStatus,
  bugsFromTestOutput,
  runBotHealLoop,
  main,
};
