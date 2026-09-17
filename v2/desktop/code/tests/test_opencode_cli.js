/**
 * CLI-mode tests for lib/opencode_bridge.js — stubbed spawn, no real
 * `opencode` binary needed.
 *
 * Covers (DS-OCT-01):
 *   1. missing binary  -> { success: false, hint } (never throws)
 *   2. bad workspace   -> repo root / home dir / fs root refused, spawn never called
 *   3. timeout path    -> { success: false, timedOut: true } via stubbed spawn
 *   4. arg plumbing    -> model / agent / autoApprove reach `opencode run` args
 *
 * Run: node tests/test_opencode_cli.js
 */
'use strict';

process.env.NODE_ENV = 'test';

const assert = require('assert');
const path = require('path');
const os = require('os');
const { EventEmitter } = require('events');
const bridge = require('../lib/opencode_bridge');

const DESKTOP_DIR = path.resolve(__dirname, '..'); // v2/desktop/code
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

let passed = 0;
async function ok(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ok - ${name}`);
  } catch (e) {
    console.error(`  FAIL - ${name}: ${(e && e.message) || e}`);
    process.exitCode = 1;
  }
}

/** Fake child_process child: EventEmitter with stdout/stderr streams + kill(). */
function fakeChild({ hang = false } = {}) {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.killSignal = null;
  child.kill = (sig) => {
    child.killSignal = sig || 'SIGTERM';
    if (!hang) child.emit('close', null); // simulate SIGTERM kill -> close(null)
    return true;
  };
  return child;
}

const MISSING = { available: false, binary: 'opencode', path: null, version: null, hint: bridge.INSTALL_HINT };
const PRESENT = { available: true, binary: 'opencode', path: '/usr/local/bin/opencode', version: 'opencode 1.0.0', hint: null };

async function main() {
  console.log('test_opencode_cli:');

  await ok('buildRunArgs plumbs model/agent/autoApprove', () => {
    const args = bridge.buildRunArgs({ prompt: 'fix it', model: 'm1', agent: 'build', autoApprove: true });
    assert.deepStrictEqual(args.slice(0, 2), ['run', 'fix it']);
    assert.ok(args.includes('--model') && args.includes('m1'), 'model missing: ' + args.join(' '));
    assert.ok(args.includes('--agent') && args.includes('build'), 'agent missing');
    assert.ok(args.includes('--auto'), 'autoApprove did not append --auto');
    assert.ok(args.includes('--format') && args.includes('json'), 'format json missing');
    const off = bridge.buildRunArgs({ prompt: 'x', autoApprove: false });
    assert.ok(!off.includes('--auto'), 'autoApprove=false must not append --auto');
  });

  await ok('validateWorkspaceRoot refuses repo root / home / fs root', () => {
    for (const bad of [REPO_ROOT, os.homedir(), path.parse(DESKTOP_DIR).root]) {
      const r = bridge.validateWorkspaceRoot(bad);
      assert.strictEqual(r.ok, false, `expected refusal for ${bad}`);
      assert.ok(/refus/i.test(r.error), `expected refusal error, got: ${r.error}`);
      assert.ok(r.hint && /OPENCODE_WORKSPACE/.test(r.hint), 'expected OPENCODE_WORKSPACE hint');
    }
    const empty = bridge.validateWorkspaceRoot('');
    assert.strictEqual(empty.ok, false, 'empty workspace must not validate');
    const good = bridge.validateWorkspaceRoot(DESKTOP_DIR);
    assert.strictEqual(good.ok, true, `desktop dir must validate: ${good.error}`);
    assert.strictEqual(good.resolved, path.resolve(DESKTOP_DIR));
  });

  await ok('default workspace is the desktop app dir, not repo root', () => {
    const cfg = bridge.getOpenCodeConfig({ workspaceRoot: '', exportDir: '' });
    assert.strictEqual(path.resolve(cfg.workspaceRoot), DESKTOP_DIR, `workspaceRoot=${cfg.workspaceRoot}`);
  });

  await ok('OPENCODE_WORKSPACE env override respected', () => {
    const prev = process.env.OPENCODE_WORKSPACE;
    process.env.OPENCODE_WORKSPACE = DESKTOP_DIR;
    try {
      const cfg = bridge.getOpenCodeConfig({ workspaceRoot: '', exportDir: '' });
      assert.strictEqual(path.resolve(cfg.workspaceRoot), DESKTOP_DIR);
    } finally {
      if (prev === undefined) delete process.env.OPENCODE_WORKSPACE;
      else process.env.OPENCODE_WORKSPACE = prev;
    }
  });

  await ok('missing binary -> helpful hint, never throws', async () => {
    const res = await bridge.runOpenCodeFix({
      prompt: 'fix it',
      dir: DESKTOP_DIR,
      deps: { detect: () => MISSING },
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, 'OpenCode binary not found.');
    assert.ok(res.hint && /opencode/i.test(res.hint), 'expected install hint');
  });

  await ok('detectOpenCode stubbed spawnSync -> unavailable + hint', () => {
    const r = bridge.detectOpenCode('__definitely_not_a_real_binary__', {
      spawnSync: () => ({ status: 1, stdout: '', stderr: 'not found' }),
    });
    assert.strictEqual(r.available, false);
    assert.ok(r.hint && /opencode/i.test(r.hint), 'expected install hint');
  });

  await ok('bad workspace refused before spawn', async () => {
    let spawned = false;
    const res = await bridge.runOpenCodeFix({
      prompt: 'fix it',
      dir: REPO_ROOT,
      deps: {
        detect: () => PRESENT,
        spawn: () => { spawned = true; throw new Error('must not spawn'); },
      },
    });
    assert.strictEqual(res.success, false);
    assert.ok(/repo root/i.test(res.error), `expected repo-root refusal, got: ${res.error}`);
    assert.strictEqual(spawned, false, 'spawn must not be called for a refused workspace');
  });

  await ok('timeout path resolves timedOut via stubbed spawn', async () => {
    let child;
    let seenArgs;
    let seenOpts;
    const res = await bridge.runOpenCodeFix({
      prompt: 'take forever',
      dir: DESKTOP_DIR,
      timeoutMs: 50,
      model: 'm1',
      agent: 'build',
      autoApprove: true,
      deps: {
        detect: () => PRESENT,
        spawn: (bin, args, opts) => {
          seenArgs = args;
          seenOpts = opts;
          child = fakeChild();
          return child;
        },
      },
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.timedOut, true, `expected timedOut:true, got ${JSON.stringify(res)}`);
    assert.ok(/timed out after 50ms/.test(res.error), `expected timeout error, got: ${res.error}`);
    assert.strictEqual(child.killSignal, 'SIGTERM', 'watchdog must SIGTERM the child');
    assert.strictEqual(seenOpts.cwd, path.resolve(DESKTOP_DIR), 'cwd must be the guarded workspace');
    assert.ok(seenArgs.includes('--model') && seenArgs.includes('m1'), 'model must reach CLI args');
    assert.ok(seenArgs.includes('--auto'), 'autoApprove must reach CLI args');
  });

  await ok('success path resolves transcript via stubbed spawn', async () => {
    const res = await bridge.runOpenCodeFix({
      prompt: 'fix it',
      dir: DESKTOP_DIR,
      deps: {
        detect: () => PRESENT,
        spawn: () => {
          const child = fakeChild();
          process.nextTick(() => {
            child.stdout.emit('data', '{"text":"fixed foo.js"}\n');
            child.emit('close', 0);
          });
          return child;
        },
      },
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.exitCode, 0);
    assert.strictEqual(res.timedOut, false);
    assert.ok(res.transcript.summary.includes('fixed foo.js'), 'expected transcript summary');
  });

  await ok('runCli alias matches runOpenCodeFix', () => {
    assert.strictEqual(bridge.runCli, bridge.runOpenCodeFix);
  });

  console.log(`test_opencode_cli: ${passed} passed${process.exitCode ? ' (WITH FAILURES)' : ''}`);
}

main().catch((e) => {
  console.error(`  FAIL - harness: ${(e && e.stack) || e}`);
  process.exitCode = 1;
});
