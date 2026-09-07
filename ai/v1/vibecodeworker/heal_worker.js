#!/usr/bin/env node
/**
 * heal_worker.js — a FRESH VibeCodeWorker test instance for the self-healing loop.
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

let smartlog = null;
try {
  const sl = require('./lib/smart_log');
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
      const sl = require('./lib/smart_log');
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

module.exports = { parseArgs, runLocal };
