'use strict';
const assert = require('assert');
const checker = require('../lib/website_check');

async function run() {
  console.log('=== website check tests ===');
  // URL validation fails closed.
  assert.strictEqual(checker.normalizeTargetUrl('https://example.com/a?b=1'), 'https://example.com/a?b=1');
  assert.strictEqual(checker.normalizeTargetUrl('example.com'), 'https://example.com/');
  assert.strictEqual(checker.normalizeTargetUrl('http://127.0.0.1:8888/game'), 'http://127.0.0.1:8888/game', 'localhost allowed for local dev debugging');
  assert.throws(() => checker.normalizeTargetUrl('ftp://x/y'), /Only http/);
  assert.throws(() => checker.normalizeTargetUrl('javascript:alert(1)'), /Only http|not parseable/);
  assert.throws(() => checker.normalizeTargetUrl('https://user:pass@example.com/'), /credentials/);
  assert.throws(() => checker.normalizeTargetUrl(''), /Provide a url/);
  assert.throws(() => checker.normalizeTargetUrl(null), /Provide a url/);
  // Markup audit catches the classic set.
  const bad = `<html><head></head><body>
    <img src="a.png"><img src="" alt="">
    <button></button><input type="text">
    <a href="#">x</a><script>document.write('n')</script>
    <div onclick="go()">hi</div></body></html>`;
  const issues = checker.auditMarkup(bad, 'https://example.com/');
  const codes = issues.map((i) => i.code);
  for (const c of ['missing-title', 'missing-meta-description', 'missing-viewport', 'missing-lang',
    'images-missing-alt', 'images-empty-src', 'unlabeled-buttons', 'unlabeled-inputs',
    'placeholder-links', 'inline-handlers', 'document-write']) {
    assert.ok(codes.includes(c), `audit covers ${c}`);
  }
  // Clean page scores an A with no issues.
  const good = `<!doctype html><html lang="en"><head><title>T</title>
    <meta name="description" content="d"><meta name="viewport" content="width=device-width">
    </head><body><img src="a.png" alt="a"><button aria-label="go">Go</button>
    <label>Name<input type="text" name="n"></label><a href="/x">x</a></body></html>`;
  assert.deepStrictEqual(checker.auditMarkup(good, 'https://example.com/'), []);
  assert.deepStrictEqual(checker.gradeFor([]), { score: 100, letter: 'A' });
  // Mixed content fires on https only.
  const mixed = '<html><head><title>t</title></head><body><img src="http://cdn/x.png" alt="x"></body></html>';
  assert.ok(checker.auditMarkup(mixed, 'https://example.com/').some((i) => i.code === 'mixed-content'));
  assert.ok(!checker.auditMarkup(mixed, 'http://example.com/').some((i) => i.code === 'mixed-content'));
  // Grade floors at zero and bands correctly.
  assert.deepStrictEqual(checker.gradeFor([{ severity: 'high' }, { severity: 'high' }]), { score: 70, letter: 'C' });
  assert.deepStrictEqual(checker.gradeFor(new Array(10).fill({ severity: 'high' })).letter, 'F');
  // Live check against a local fixture server: unreachable throws cleanly.
  await assert.rejects(checker.checkWebsite('http://127.0.0.1:1/nope', { live: false }), /unreachable/i);
  // Debug route exists, validates input, never needs a key.
  const routes = require('../lib/api/debug_routes');
  assert.strictEqual(typeof routes.handleDebugRequest, 'function');
  const seen = [];
  const fakeSend = (code, data) => { seen.push([code, data]); };
  await routes.handleDebugRequest('/api/debug/website', { method: 'POST' }, async () => ({}), fakeSend, fakeSend);
  assert.strictEqual(seen[0][0], 400);
  await routes.handleDebugRequest('/api/debug/website', { method: 'GET' }, async () => ({}), fakeSend, fakeSend);
  assert.strictEqual(seen[1][0], 405);
  assert.strictEqual(seen[1][1], 'Method Not Allowed');
  console.log('ALL WEBSITE CHECK TESTS PASSED');
}

if (require.main === module) {
  run().catch((e) => { console.error('WEBSITE CHECK TESTS FAILED', e); process.exit(1); });
}
module.exports = { run };
