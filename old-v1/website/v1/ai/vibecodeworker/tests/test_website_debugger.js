/**
 * Plain-node unit tests for website debugging
 * (src/runtime/website_debugger.js + bug_scanner marker support).
 * No Electron needed — run:
 *   node tests/test_website_debugger.js   (from website/v1/ai/vibecodeworker)
 */
const assert = require('assert');
const path = require('path');
const vm = require('vm');
const fs = require('fs');

const projectRoot = path.join(__dirname, '..');
const wd = require(path.join(projectRoot, 'src', 'runtime', 'website_debugger'));
const { scanForBugs } = require(path.join(projectRoot, 'lib', 'brain', 'bug_scanner'));

let passed = 0;
function check(name, fn) {
  const out = fn();
  if (out && typeof out.then === 'function') {
    return out.then(() => { passed++; console.log(`PASS  ${name}`); });
  }
  passed++;
  console.log(`PASS  ${name}`);
}

function freshBrain() {
  return { bugs: [], replayActions: [], sessionStats: { bugsFound: 0 } };
}

async function main() {
  // 1. Hook script covers every failure channel and is idempotent.
  check('guest hook captures errors, rejections, resources, fetch, XHR', () => {
    const src = wd.buildGuestErrorHookScript();
    assert.ok(src.includes('__vibeDebugHook'), 'idempotency guard');
    assert.ok(src.includes("addEventListener('error'"), 'window.onerror/resource capture');
    assert.ok(src.includes('unhandledrejection'), 'promise rejections');
    assert.ok(src.includes('4weird-resource-error'), 'resource marker');
    assert.ok(src.includes('4weird-guest-error'), 'guest error marker');
    assert.ok(src.includes('4weird-net-error'), 'network marker');
    assert.ok(src.includes('window.fetch'), 'fetch wrapper');
    assert.ok(src.includes('XMLHttpRequest'), 'XHR wrapper');
    assert.ok(src.includes(String(wd.MAX_HOOK_ERRORS)), 'volume cap referenced');
    assert.doesNotThrow(() => new vm.Script(src), 'hook must be syntactically valid JS');
  });

  // 2. Audit script is valid JS and covers the promised checks.
  check('audit script is valid and checks real website signals', () => {
    const src = wd.buildWebsiteAuditScript();
    assert.doesNotThrow(() => new vm.Script(src), 'audit must be syntactically valid JS');
    for (const code of ['missing-title', 'missing-meta-description', 'broken-images',
      'dead-links', 'form-no-submit', 'unlabeled-inputs', 'mixed-content', 'horizontal-overflow']) {
      assert.ok(src.includes(code), `audit covers ${code}`);
    }
    assert.ok(!src.includes('click(') && !src.includes('.submit('), 'audit is read-only');
  });

  // 3. Target classification: websites in, game files out.
  check('shouldAuditTarget admits http(s) only', () => {
    assert.strictEqual(wd.shouldAuditTarget('https://mattyjacks.com'), true);
    assert.strictEqual(wd.shouldAuditTarget('http://127.0.0.1:8888/games/html/aiwhackamole/index.html'), true);
    assert.strictEqual(wd.shouldAuditTarget('file:///C:/GitHub5/4weird/website/v1/games/html/aiwhackamole/index.html'), false);
    assert.strictEqual(wd.shouldAuditTarget(''), false);
    assert.strictEqual(wd.shouldAuditTarget(null), false);
    assert.strictEqual(wd.shouldAuditTarget(undefined), false);
  });

  // 4. Throttle: first run goes, immediate rerun skips, cooldown re-arms.
  check('audit throttle is per-URL with cooldown', () => {
    wd.clearAuditThrottle();
    const url = 'https://example.com/?t=' + Date.now();
    const t0 = 10 * 60 * 1000;
    assert.strictEqual(wd.shouldRunAudit(url, t0), true, 'first run');
    assert.strictEqual(wd.shouldRunAudit(url, t0 + 1000), false, 'immediate rerun skips');
    assert.strictEqual(wd.shouldRunAudit(url, t0 + 61 * 1000), true, 'cooldown re-arms');
    assert.strictEqual(wd.shouldRunAudit('file:///x.html', t0 + 99999), false, 'non-sites never run');
  });

  // 5. Log-line format is stable and capped.
  check('issueToLogLine formats and caps marker lines', () => {
    const line = wd.issueToLogLine({ code: 'broken-images', detail: '2 broken: a.png | b.png' });
    assert.strictEqual(line, '[4weird-site-audit] broken-images: 2 broken: a.png | b.png');
    const long = wd.issueToLogLine({ code: 'x', detail: 'y'.repeat(500) });
    assert.ok(long.length <= 300, `capped at 300, got ${long.length}`);
    assert.ok(wd.issueToLogLine(null).startsWith('[4weird-site-audit]'), 'null-safe');
  });

  // 6. Scanner files every debugger marker through the normal pipeline.
  check('scanForBugs files guest/net/resource/audit markers', () => {
    const brain = freshBrain();
    const lines = [
      '[16:52:13] [ERROR] [Game Console] [4weird-guest-error] TypeError: Cannot read properties of null @app.js:42',
      '[4weird-net-error] fetch https://mattyjacks.com/api/data -> HTTP 500',
      '[4weird-resource-error] Failed to load IMG https://mattyjacks.com/hero.png',
      '[4weird-site-audit] broken-images: 2 image(s) failed to render: hero.png | logo.png',
    ];
    assert.strictEqual(scanForBugs(brain, null, [lines[0]]), true, 'guest error files');
    assert.strictEqual(scanForBugs(brain, null, [lines[1]]), true, 'net error files');
    assert.strictEqual(scanForBugs(brain, null, [lines[2]]), true, 'resource error files');
    assert.strictEqual(scanForBugs(brain, null, [lines[3]]), true, 'site audit files');
    assert.strictEqual(brain.bugs.length, 4, `four bugs filed, got ${brain.bugs.length}`);
    assert.strictEqual(brain.sessionStats.bugsFound, 4, 'stats tracked');
    // Recurring identical audit finding cools down instead of re-filing.
    assert.strictEqual(scanForBugs(brain, null, [lines[3]]), false, 'repeat audit cools down');
  });

  // 7. Benign noise still never files (regression guard).
  check('benign patterns still ignored', () => {
    const brain = freshBrain();
    assert.strictEqual(scanForBugs(brain, null, ['Failed to load favicon.ico: net::ERR_ABORTED']), false);
    assert.strictEqual(brain.bugs.length, 0);
  });

  // 8. maybeAuditWebsite folds findings into consoleLogs + log callback.
  await check('maybeAuditWebsite audits, logs, and feeds the scanner queue', async () => {
    wd.clearAuditThrottle();
    const canned = {
      url: 'https://example.com/', title: 'Example', counts: { images: 3, brokenImages: 1, links: 10, deadLinks: 2, forms: 1 },
      issues: [
        { code: 'broken-images', severity: 'high', detail: '1 image(s) failed: a.png' },
        { code: 'dead-links', severity: 'medium', detail: '2 dead: "x" | "y"' },
      ],
    };
    let ranScript = '';
    const fakeController = {
      executeJS: async (webview, code) => { ranScript = code; return canned; },
    };
    const logs = [];
    const said = [];
    const auditUrl = 'https://example.com/?audit=' + Date.now();
    const issues = await wd.maybeAuditWebsite({
      gameController: fakeController,
      webviewElement: {},
      url: auditUrl,
      consoleLogs: logs,
      logSystemMessage: (m) => said.push(String(m)),
    });
    assert.strictEqual(issues.length, 2, 'returns issues');
    assert.ok(ranScript.includes('broken-images'), 'ran the audit script in-guest');
    assert.ok(logs.some((l) => l.includes('[4weird-site-audit] broken-images')), 'audit line queued for scanner');
    assert.ok(said.some((m) => m.includes('Site audit:')), 'summary logged');
    // Second call inside cooldown: no guest call, no logs.
    const issues2 = await wd.maybeAuditWebsite({
      gameController: { executeJS: async () => { throw new Error('must not run'); } },
      webviewElement: {},
      url: auditUrl,
      consoleLogs: logs,
      logSystemMessage: (m) => said.push(String(m)),
    });
    assert.deepStrictEqual(issues2, [], 'throttled call is a no-op');
  });

  // 9. maybeAuditWebsite survives missing/broken executors.
  await check('maybeAuditWebsite never throws on broken guests', async () => {
    wd.clearAuditThrottle();
    const base = 'https://example.com/edge-' + Date.now();
    assert.deepStrictEqual(await wd.maybeAuditWebsite({
      gameController: null, webviewElement: {}, url: base + '-a', consoleLogs: [], logSystemMessage: () => {},
    }), []);
    assert.deepStrictEqual(await wd.maybeAuditWebsite({
      gameController: { executeJS: async () => { throw new Error('guest busy'); } },
      webviewElement: {}, url: base + '-b', consoleLogs: [], logSystemMessage: () => {},
    }), []);
    assert.deepStrictEqual(await wd.maybeAuditWebsite({
      gameController: { executeJS: async () => null },
      webviewElement: {}, url: base + '-c', consoleLogs: [], logSystemMessage: () => {},
    }), []);
    assert.deepStrictEqual(await wd.maybeAuditWebsite({
      gameController: { executeJS: async () => ({ issues: 'nope' }) },
      webviewElement: {}, url: base + '-d', consoleLogs: [], logSystemMessage: () => {},
    }), []);
  });

  // 10. Take Over label (static HTML + live JS toggle agree).
  check('takeover button reads "Take Over: You Play, AI Watches"', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'src', 'index.html'), 'utf8');
    assert.ok(html.includes('Take Over: You Play, AI Watches'), 'index.html label');
    assert.ok(!html.includes('Take over — I play, AI watches'), 'old label gone from HTML');
    const stage = fs.readFileSync(path.join(projectRoot, 'src', 'components', 'stage_view.js'), 'utf8');
    assert.ok(stage.includes('Take Over: You Play, AI Watches'), 'stage_view.js label');
    assert.ok(!stage.includes('Take over — I play, AI watches'), 'old label gone from toggle');
  });

  console.log(`\nAll ${passed} website-debugger checks passed.`);
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
