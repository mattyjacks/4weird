/**
 * Tests for lib/api/terminal_routes.js (DS-OCT-03).
 * Run: node tests/test_terminal_routes.js
 *
 * Security gates covered:
 * - unauthed exec returns 401 (missing AND wrong token)
 * - deny-by-default allow-list (unknown binary -> 403)
 * - shell metacharacters rejected (400, no exec)
 * - cwd escapes rejected (403, jailed to workspace)
 * - every exec attempt is logged, tokens never appear in logs
 */
'use strict';

const assert = require('assert');
const path = require('path');

process.env.VIBE_API_TOKEN = 'test-token-oct03';
const t = require('../lib/api/terminal_routes');

let passed = 0;
let failed = 0;
function ok(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => { passed++; console.log(`  ok - ${name}`); })
    .catch((e) => { failed++; console.error(`  FAIL - ${name}: ${e.message}`); });
}

function stubReq(headers, method) {
  return { headers: headers || {}, method: method || 'POST' };
}
function stubBody(body) {
  return async () => body;
}
function capture() {
  const calls = [];
  return {
    calls,
    sendJSON: (status, data) => { calls.push({ status, data }); return { status, data }; },
    sendText: (status, text) => { calls.push({ status, text }); return { status, text }; }
  };
}
const GOOD = { 'x-vibe-auth': 'test-token-oct03' };
const WORKSPACE = path.join(__dirname, '..');

async function main() {
  console.log('test_terminal_routes:');
  t._clearTerminalLog();

  await ok('unauthed exec returns 401 (missing token)', async () => {
    const cap = capture();
    await t.handleTerminalRequest('/api/terminal/exec', stubReq({}, 'POST'),
      stubBody({ command: 'node', args: ['-v'] }), cap.sendJSON, cap.sendText, WORKSPACE);
    assert.strictEqual(cap.calls.length, 1);
    assert.strictEqual(cap.calls[0].status, 401);
    assert.strictEqual(cap.calls[0].data.success, false);
  });

  await ok('unauthed exec returns 401 (wrong token)', async () => {
    const cap = capture();
    await t.handleTerminalRequest('/api/terminal/exec', stubReq({ 'x-vibe-auth': 'nope' }, 'POST'),
      stubBody({ command: 'node', args: ['-v'] }), cap.sendJSON, cap.sendText, WORKSPACE);
    assert.strictEqual(cap.calls[0].status, 401);
  });

  await ok('unauthed allowlist returns 401', async () => {
    const cap = capture();
    await t.handleTerminalRequest('/api/terminal/allowlist', stubReq({}, 'GET'),
      stubBody({}), cap.sendJSON, cap.sendText, WORKSPACE);
    assert.strictEqual(cap.calls[0].status, 401);
  });

  await ok('authed allowlist lists commands', async () => {
    const cap = capture();
    await t.handleTerminalRequest('/api/terminal/allowlist', stubReq(GOOD, 'GET'),
      stubBody({}), cap.sendJSON, cap.sendText, WORKSPACE);
    assert.strictEqual(cap.calls[0].status, 200);
    assert.ok(cap.calls[0].data.allowList.node);
    assert.ok(cap.calls[0].data.allowList.npm);
  });

  await ok('disallowed binary denied (403, deny-by-default)', async () => {
    const cap = capture();
    await t.handleTerminalRequest('/api/terminal/exec', stubReq(GOOD, 'POST'),
      stubBody({ command: 'rm', args: ['-rf', '/'] }), cap.sendJSON, cap.sendText, WORKSPACE);
    assert.strictEqual(cap.calls[0].status, 403);
  });

  await ok('path-like command rejected', async () => {
    const cap = capture();
    await t.handleTerminalRequest('/api/terminal/exec', stubReq(GOOD, 'POST'),
      stubBody({ command: '/bin/node', args: ['-v'] }), cap.sendJSON, cap.sendText, WORKSPACE);
    assert.strictEqual(cap.calls[0].status, 400);
  });

  await ok('shell metachar arg rejected (no exec)', async () => {
    const cap = capture();
    await t.handleTerminalRequest('/api/terminal/exec', stubReq(GOOD, 'POST'),
      stubBody({ command: 'node', args: ['-e', '1; rm -rf /'] }), cap.sendJSON, cap.sendText, WORKSPACE);
    assert.strictEqual(cap.calls[0].status, 400);
    assert.ok(/metacharacter/.test(cap.calls[0].data.error));
  });

  await ok('chained command rejected', async () => {
    const cap = capture();
    await t.handleTerminalRequest('/api/terminal/exec', stubReq(GOOD, 'POST'),
      stubBody({ command: 'npm', args: ['test', '&&', 'evil'] }), cap.sendJSON, cap.sendText, WORKSPACE);
    assert.strictEqual(cap.calls[0].status, 400);
  });

  await ok('git push rejected (mutating subcommand)', async () => {
    const cap = capture();
    await t.handleTerminalRequest('/api/terminal/exec', stubReq(GOOD, 'POST'),
      stubBody({ command: 'git', args: ['push', 'origin', 'main'] }), cap.sendJSON, cap.sendText, WORKSPACE);
    assert.strictEqual(cap.calls[0].status, 403);
  });

  await ok('cwd escape rejected (jailed to workspace)', async () => {
    const cap = capture();
    await t.handleTerminalRequest('/api/terminal/exec', stubReq(GOOD, 'POST'),
      stubBody({ command: 'node', args: ['-v'], cwd: '../../../..' }), cap.sendJSON, cap.sendText, WORKSPACE);
    assert.strictEqual(cap.calls[0].status, 403);
  });

  await ok('authed exec runs (node -v, argv only, no shell)', async () => {
    const cap = capture();
    await t.handleTerminalRequest('/api/terminal/exec', stubReq(GOOD, 'POST'),
      stubBody({ command: 'node', args: ['-v'] }), cap.sendJSON, cap.sendText, WORKSPACE);
    assert.strictEqual(cap.calls[0].status, 200);
    assert.strictEqual(cap.calls[0].data.success, true);
    assert.strictEqual(cap.calls[0].data.exitCode, 0);
    assert.ok(/^v\d+\./.test(cap.calls[0].data.stdout.trim()), `unexpected stdout: ${cap.calls[0].data.stdout}`);
  });

  await ok('every exec attempt is logged, no key material in logs', async () => {
    const cap = capture();
    await t.handleTerminalRequest('/api/terminal/log', stubReq(GOOD, 'GET'),
      stubBody({}), cap.sendJSON, cap.sendText, WORKSPACE);
    assert.strictEqual(cap.calls[0].status, 200);
    assert.ok(cap.calls[0].data.count >= 9, `expected >=9 entries, got ${cap.calls[0].data.count}`);
    const blob = JSON.stringify(cap.calls[0].data.entries);
    assert.ok(!blob.includes('test-token-oct03'), 'token leaked into exec log');
  });

  await ok('endpoint disabled without token configured (503-style 401)', async () => {
    const saved = process.env.VIBE_API_TOKEN;
    delete process.env.VIBE_API_TOKEN;
    try {
      const cap = capture();
      await t.handleTerminalRequest('/api/terminal/exec', stubReq(GOOD, 'POST'),
        stubBody({ command: 'node', args: ['-v'] }), cap.sendJSON, cap.sendText, WORKSPACE);
      assert.strictEqual(cap.calls[0].status, 401);
    } finally {
      process.env.VIBE_API_TOKEN = saved;
    }
  });

  console.log(`test_terminal_routes: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => { console.error(`  FATAL - ${e.stack}`); process.exitCode = 1; });
