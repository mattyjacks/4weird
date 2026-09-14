/**
 * Tests for lib/coin_client.js (DS-OCT-07).
 * Run: node tests/test_coin_client.js
 *
 * Reviewer proof:
 *  - stubbed 402 pauses the guard with a clear log line;
 *  - the bot key NEVER appears in captured log output;
 *  - 5xx retries with backoff; 4xx never retried.
 *
 * Uses stub fetch implementations only — zero network.
 */
'use strict';

const assert = require('assert');
const {
  COINS_PER_USD,
  CoinGuard,
  QUOTA_PAUSE_LOG,
  coinsToUsd,
  parseQuote,
  isQuotaSignal,
  redactKeyFromText,
  safeLog,
  getBotKey,
  getBalance,
  requestSpend,
  CoinApiError,
} = require('../lib/coin_client');

const FAKE_KEY = 'bot4weird_testkey0123456789';

function stubLogger() {
  const lines = [];
  return { lines, log: (msg) => { lines.push(String(msg)); } };
}

/** Minimal stub fetch: route by "METHOD path" to queued responses. */
function makeStubFetch(routes) {
  const calls = [];
  const impl = async (url, init = {}) => {
    calls.push({ url, init });
    const method = (init.method || 'GET').toUpperCase();
    const path = String(url).replace(/^https?:\/\/[^/]+/, '');
    const key = `${method} ${path}`;
    const queue = routes[key];
    if (!queue || queue.length === 0) {
      throw new Error(`stub fetch: no route for ${key}`);
    }
    const next = queue.shift();
    if (next instanceof Error) throw next;
    return {
      status: next.status,
      json: async () => next.body,
    };
  };
  return { impl, calls };
}

function stubSleep() {
  const waits = [];
  return { waits, sleep: async (ms) => { waits.push(ms); } };
}

let passed = 0;
let failed = 0;
async function ok(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ok - ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  FAIL - ${name}: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`);
  }
}

(async () => {
  console.log('test_coin_client:');

  await ok('parity: 100 coins = $1.00', () => {
    assert.strictEqual(COINS_PER_USD, 100);
    assert.strictEqual(coinsToUsd(100), 1);
    assert.strictEqual(coinsToUsd(50), 0.5);
    assert.strictEqual(coinsToUsd(1), 0.01);
  });

  await ok('parseQuote accepts DS-OCT-06 {coins, usd} shape', () => {
    const q = parseQuote({ coins: 250, usd: 2.5 });
    assert.strictEqual(q.coins, 250);
    assert.strictEqual(q.usd, 2.5);
    assert.strictEqual(q.usdMismatch, false);
  });

  await ok('parseQuote fills usd from parity when absent', () => {
    const q = parseQuote({ coins: 75 });
    assert.strictEqual(q.coins, 75);
    assert.strictEqual(q.usd, 0.75);
  });

  await ok('parseQuote rejects bad shapes', () => {
    assert.throws(() => parseQuote(null), /object/);
    assert.throws(() => parseQuote({}), /coins/);
    assert.throws(() => parseQuote({ coins: -5 }), /non-negative/);
    assert.throws(() => parseQuote({ coins: 'lots' }), /non-negative/);
  });

  await ok('getBotKey prefers explicit, then FOURWEIRD_BOT_KEY, then VIBE_API_TOKEN', () => {
    const keepBot = process.env.FOURWEIRD_BOT_KEY;
    const keepTok = process.env.VIBE_API_TOKEN;
    try {
      delete process.env.FOURWEIRD_BOT_KEY;
      delete process.env.VIBE_API_TOKEN;
      assert.strictEqual(getBotKey('  abc  '), 'abc');
      assert.strictEqual(getBotKey(), '');
      process.env.VIBE_API_TOKEN = 'tok-fallback';
      assert.strictEqual(getBotKey(), 'tok-fallback');
      process.env.FOURWEIRD_BOT_KEY = 'bot-preferred';
      assert.strictEqual(getBotKey(), 'bot-preferred');
    } finally {
      if (keepBot === undefined) delete process.env.FOURWEIRD_BOT_KEY;
      else process.env.FOURWEIRD_BOT_KEY = keepBot;
      if (keepTok === undefined) delete process.env.VIBE_API_TOKEN;
      else process.env.VIBE_API_TOKEN = keepTok;
    }
  });

  await ok('balance lookup returns {coins, usd} at 100=$1', async () => {
    const logger = stubLogger();
    const { impl, calls } = makeStubFetch({
      'GET /api/coins/balance': [{ status: 200, body: { coins: 1000, usd: 10 } }],
    });
    const bal = await getBalance({ botKey: FAKE_KEY, fetchImpl: impl, logger });
    assert.strictEqual(bal.coins, 1000);
    assert.strictEqual(bal.usd, 10);
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].init.headers.Authorization, `Bearer ${FAKE_KEY}`);
    assert.strictEqual(calls[0].init.headers['x-bot-key'], FAKE_KEY);
  });

  await ok('spend-request posts coins+usd+reason with both auth headers', async () => {
    const logger = stubLogger();
    const { impl, calls } = makeStubFetch({
      'POST /api/coins/spend': [{ status: 200, body: { ok: true, receiptId: 'r-1' } }],
    });
    const out = await requestSpend({
      botKey: FAKE_KEY, coins: 50, reason: 'heal-iter-3', fetchImpl: impl, logger,
    });
    assert.strictEqual(out.coins, 50);
    assert.strictEqual(out.usd, 0.5);
    assert.strictEqual(out.receipt.receiptId, 'r-1');
    const sent = JSON.parse(calls[0].init.body);
    assert.strictEqual(sent.coins, 50);
    assert.strictEqual(sent.usd, 0.5);
    assert.strictEqual(sent.reason, 'heal-iter-3');
    assert.strictEqual(calls[0].init.headers.Authorization, `Bearer ${FAKE_KEY}`);
    assert.strictEqual(calls[0].init.headers['x-bot-key'], FAKE_KEY);
  });

  await ok('stubbed 402 pauses the guard with a clear log line', async () => {
    const logger = stubLogger();
    const guard = new CoinGuard({ logger });
    const { impl } = makeStubFetch({
      'GET /api/coins/balance': [{ status: 402, body: { code: 'insufficient_balance' } }],
    });
    let err = null;
    try {
      await getBalance({ botKey: FAKE_KEY, fetchImpl: impl, logger }, guard);
    } catch (e) { err = e; }
    assert.ok(err instanceof CoinApiError, 'expected CoinApiError');
    assert.strictEqual(err.quotaPaused, true);
    assert.strictEqual(guard.paused, true);
    assert.strictEqual(guard.shouldRun(), false);
    assert.ok(logger.lines.some((l) => l.includes('pausing heal loop')), `log lines: ${JSON.stringify(logger.lines)}`);
    assert.ok(logger.lines.includes(QUOTA_PAUSE_LOG) || logger.lines.some((l) => l.startsWith('coin_client: quota exhausted')), 'exact pause line present');
  });

  await ok('insufficient-code (non-402) also pauses the guard', async () => {
    const logger = stubLogger();
    const guard = new CoinGuard({ logger });
    const { impl } = makeStubFetch({
      'POST /api/coins/spend': [{ status: 400, body: { code: 'insufficient_coins' } }],
    });
    await assert.rejects(
      requestSpend({ botKey: FAKE_KEY, coins: 10, fetchImpl: impl, logger }, guard),
      /request failed/,
    );
    assert.strictEqual(guard.paused, true);
    assert.ok(isQuotaSignal({ status: 400, code: 'insufficient_coins' }));
  });

  await ok('bot key NEVER appears in logs (redacted)', async () => {
    const logger = stubLogger();
    const guard = new CoinGuard({ logger });
    const { impl } = makeStubFetch({
      'GET /api/coins/balance': [{ status: 200, body: { coins: 5, usd: 0.05 } }],
      'POST /api/coins/spend': [
        { status: 500, body: { code: 'boom' } },
        { status: 402, body: { code: 'quota_exhausted' } },
      ],
    });
    await getBalance({ botKey: FAKE_KEY, fetchImpl: impl, logger });
    try {
      await requestSpend({ botKey: FAKE_KEY, coins: 5, fetchImpl: impl, logger, baseBackoffMs: 1 }, guard);
    } catch (e) { /* expected 402 */ }
    // Direct redaction unit check, including a key embedded in free text.
    assert.strictEqual(redactKeyFromText(`token=${FAKE_KEY} end`, FAKE_KEY).includes(FAKE_KEY), false);
    const cleaned = safeLog(logger, `leaked? ${FAKE_KEY}`, FAKE_KEY);
    assert.strictEqual(cleaned.includes(FAKE_KEY), false);
    assert.ok(cleaned.includes('[REDACTED]'));
    // Sweep EVERY captured line: the raw key must be absent.
    for (const line of logger.lines) {
      assert.strictEqual(line.includes(FAKE_KEY), false, `key leaked in log: ${line}`);
    }
  });

  await ok('5xx retries with exponential backoff then succeeds', async () => {
    const logger = stubLogger();
    const sleeper = stubSleep();
    const { impl, calls } = makeStubFetch({
      'GET /api/coins/balance': [
        { status: 500, body: { code: 'x' } },
        { status: 503, body: { code: 'y' } },
        { status: 200, body: { coins: 200, usd: 2 } },
      ],
    });
    const bal = await getBalance({
      botKey: FAKE_KEY, fetchImpl: impl, logger,
      sleepImpl: sleeper.sleep, baseBackoffMs: 100,
    });
    assert.strictEqual(bal.coins, 200);
    assert.strictEqual(calls.length, 3);
    assert.deepStrictEqual(sleeper.waits, [100, 200]);
  });

  await ok('network errors retry; persistent 5xx throws CoinApiError', async () => {
    const logger = stubLogger();
    const sleeper = stubSleep();
    const { impl, calls } = makeStubFetch({
      'GET /api/coins/balance': [
        new Error('socket hang up'),
        { status: 500, body: null },
        { status: 500, body: null },
        { status: 500, body: null },
      ],
    });
    await assert.rejects(
      getBalance({
        botKey: FAKE_KEY, fetchImpl: impl, logger,
        sleepImpl: sleeper.sleep, baseBackoffMs: 1, maxRetries: 2,
      }),
      (e) => e instanceof CoinApiError && e.status === 500,
    );
    assert.strictEqual(calls.length, 3);
  });

  await ok('4xx (non-quota) is never retried', async () => {
    const logger = stubLogger();
    const guard = new CoinGuard({ logger });
    const { impl, calls } = makeStubFetch({
      'GET /api/coins/balance': [{ status: 401, body: { code: 'unauthorized' } }],
    });
    await assert.rejects(getBalance({ botKey: FAKE_KEY, fetchImpl: impl, logger }, guard), /401/);
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(guard.paused, false, '401 must not pause the guard');
  });

  await ok('missing key throws before any fetch', async () => {
    const keepBot = process.env.FOURWEIRD_BOT_KEY;
    const keepTok = process.env.VIBE_API_TOKEN;
    try {
      delete process.env.FOURWEIRD_BOT_KEY;
      delete process.env.VIBE_API_TOKEN;
      let calls = 0;
      await assert.rejects(
        getBalance({ botKey: '', fetchImpl: async () => { calls += 1; return { status: 200, json: async () => ({}) }; } }),
        /no bot key/,
      );
      assert.strictEqual(calls, 0);
    } finally {
      if (keepBot === undefined) delete process.env.FOURWEIRD_BOT_KEY;
      else process.env.FOURWEIRD_BOT_KEY = keepBot;
      if (keepTok === undefined) delete process.env.VIBE_API_TOKEN;
      else process.env.VIBE_API_TOKEN = keepTok;
    }
  });

  await ok('guard resume() clears pause with a clear log line', async () => {
    const logger = stubLogger();
    const guard = new CoinGuard({ logger });
    guard.pause('test');
    assert.strictEqual(guard.shouldRun(), false);
    guard.resume();
    assert.strictEqual(guard.shouldRun(), true);
    assert.ok(logger.lines.some((l) => l.includes('resuming heal loop')));
  });

  console.log(`\ntest_coin_client: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error(`test_coin_client fatal: ${e && e.stack ? e.stack : e}`);
  process.exit(1);
});
