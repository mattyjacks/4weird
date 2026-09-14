/**
 * coin_client.js — Desktop-side 4weird coin client (DS-OCT-07).
 *
 * Balance lookup + spend-request against the 4weird API, with:
 * - bot-key auth via FOURWEIRD_BOT_KEY (preferred) or VIBE_API_TOKEN (fallback),
 *   sent as BOTH `Authorization: Bearer <key>` and `x-bot-key: <key>` headers;
 * - quota guard that pauses the heal loop on 402 / insufficient-balance with a
 *   clear log line (see CoinGuard);
 * - retry with exponential backoff on 5xx / network errors (never on 4xx);
 * - redacted logging: the key NEVER appears in log output (see safeLog).
 *
 * Consumes the DS-OCT-06 quote shape `{ coins, usd }` where 100 coins = $1.00
 * (see docs/COIN-PAYMENTS.md). DS-OCT-06 had not landed when this was written,
 * so the shape below is coded to the envelope-specified contract.
 *
 * Key resolution order (first non-empty wins):
 *   1. explicit `botKey` argument
 *   2. process.env.FOURWEIRD_BOT_KEY
 *   3. process.env.VIBE_API_TOKEN
 *
 * Usage:
 *   const { getBalance, requestSpend, CoinGuard } = require('./coin_client');
 *   const guard = new CoinGuard();
 *   const bal = await getBalance({}, guard);       // { coins, usd, ... }
 *   if (guard.shouldRun()) { runHealIteration(); }
 *   const receipt = await requestSpend({ coins: 50, reason: 'heal-iter-3' }, guard);
 */

'use strict';

/** Coins per one USD cent-hundred: 100 coins = $1.00 (canonical parity). */
const COINS_PER_USD = 100;

/** Default 4weird backend base URL (mirrors lib/parity/backend_client.js). */
const DEFAULT_BASE_URL = 'https://4weird.com';

/** Balance endpoint (relative to base URL). */
const BALANCE_PATH = '/api/coins/balance';

/** Spend-request endpoint (relative to base URL). */
const SPEND_PATH = '/api/coins/spend';

/** Clear log line emitted when the quota guard pauses the heal loop. */
const QUOTA_PAUSE_LOG =
  'coin_client: quota exhausted (402/insufficient balance) — pausing heal loop until topped up.';

/** Clear log line emitted when the guard resumes. */
const QUOTA_RESUME_LOG = 'coin_client: quota restored — resuming heal loop.';

/**
 * Resolve the bot key. Explicit argument wins, then FOURWEIRD_BOT_KEY,
 * then VIBE_API_TOKEN. Returns '' when nothing is configured.
 */
function getBotKey(explicitKey) {
  if (typeof explicitKey === 'string' && explicitKey.trim()) return explicitKey.trim();
  const fromBot = process.env.FOURWEIRD_BOT_KEY;
  if (typeof fromBot === 'string' && fromBot.trim()) return fromBot.trim();
  const fromToken = process.env.VIBE_API_TOKEN;
  if (typeof fromToken === 'string' && fromToken.trim()) return fromToken.trim();
  return '';
}

/** Resolve the API base URL (explicit wins, then FOURWEIRD_BASE_URL, then default). */
function getBaseUrl(explicitBase) {
  if (typeof explicitBase === 'string' && explicitBase.trim()) {
    return explicitBase.trim().replace(/\/+$/, '');
  }
  const fromEnv = process.env.FOURWEIRD_BASE_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim()) return fromEnv.trim().replace(/\/+$/, '');
  return DEFAULT_BASE_URL;
}

/** coins -> usd at the canonical 100=$1 parity, rounded to cents. */
function coinsToUsd(coins) {
  const n = Number(coins);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round((n / COINS_PER_USD) * 100) / 100;
}

/**
 * Validate/normalize a DS-OCT-06 quote-shaped object `{ coins, usd }`.
 * Throws on missing/non-numeric/negative coins. Fills `usd` from parity when
 * absent; warns (via returned `usdMismatch`) when a provided usd disagrees.
 */
function parseQuote(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('coin_client: quote must be an object shaped { coins, usd }.');
  }
  const coins = Number(raw.coins);
  if (!Number.isFinite(coins) || coins < 0 || !Number.isInteger(Math.round(coins))) {
    throw new Error(`coin_client: quote.coins must be a non-negative number (got ${JSON.stringify(raw.coins)}).`);
  }
  const wholeCoins = Math.floor(coins);
  const expectedUsd = coinsToUsd(wholeCoins);
  let usd = raw.usd === undefined || raw.usd === null ? expectedUsd : Number(raw.usd);
  if (!Number.isFinite(usd) || usd < 0) {
    throw new Error(`coin_client: quote.usd must be a non-negative number (got ${JSON.stringify(raw.usd)}).`);
  }
  usd = Math.round(usd * 100) / 100;
  return { coins: wholeCoins, usd, usdMismatch: Math.abs(usd - expectedUsd) > 0.009 };
}

/** Error type for 4weird coin API failures. */
class CoinApiError extends Error {
  constructor(message, { status = 0, code = '', body = null } = {}) {
    super(message);
    this.name = 'CoinApiError';
    this.status = status;
    this.code = typeof code === 'string' ? code : '';
    this.body = body;
  }
}

/** True when an error/status/body signals exhausted quota (pause the loop). */
function isQuotaSignal({ status = 0, code = '', body = null } = {}) {
  if (Number(status) === 402) return true;
  const c = String(code || '').toLowerCase();
  if (c.includes('insufficient') || c.includes('quota') || c.includes('exhausted') || c.includes('balance')) {
    return true;
  }
  if (body && typeof body === 'object') {
    const bc = String(body.code || body.error || '').toLowerCase();
    if (bc.includes('insufficient') || bc.includes('quota') || bc.includes('exhausted') || bc.includes('balance')) {
      return true;
    }
  }
  return false;
}

/**
 * Redact every occurrence of the key (and any 20+-char token-looking twin)
 * from a log string. Never returns the raw key.
 */
function redactKeyFromText(text, key) {
  let out = String(text);
  if (key && typeof key === 'string' && key.length >= 4) {
    out = out.split(key).join('[REDACTED]');
    // Also scrub a bot4weird_<chars> shaped token in case a *different* key
    // leaked into the message (e.g. echoed back by a server body).
    out = out.replace(/bot4weird_[A-Za-z0-9_-]{8,}/g, '[REDACTED]');
  }
  return out;
}

/**
 * Log via `logger.log` (or console) after redacting the key. The key is read
 * from the explicit argument or resolved via getBotKey() when omitted, so a
 * caller can simply safeLog('...token=' + maybeKey) and stay safe.
 */
function safeLog(logger, message, explicitKey) {
  const key = explicitKey !== undefined ? explicitKey : getBotKey();
  const clean = redactKeyFromText(message, key);
  const target = logger && typeof logger.log === 'function' ? logger : console;
  target.log(clean);
  return clean;
}

/** Build auth headers. The key itself is never logged by this module. */
function buildAuthHeaders(key) {
  return {
    Authorization: `Bearer ${key}`,
    'x-bot-key': key,
  };
}

function defaultFetch() {
  if (typeof fetch === 'function') return fetch.bind(globalThis);
  throw new Error('coin_client: no fetch available — pass fetchImpl explicitly.');
}

function sleep(ms, sleepImpl) {
  if (typeof sleepImpl === 'function') return sleepImpl(ms);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Read an error code out of a parsed JSON body ({ code | error }).
 */
function codeFromBody(body) {
  if (!body || typeof body !== 'object') return '';
  const v = body.code !== undefined ? body.code : body.error;
  return typeof v === 'string' ? v : '';
}

/**
 * Low-level JSON request with retry-with-backoff on 5xx / network errors.
 * Never retries 4xx (including 402 — that pauses the guard instead).
 *
 * @returns {Promise<{ status:number, body:any }>}
 * @throws {CoinApiError} on terminal failure.
 */
async function requestJson({
  method = 'GET',
  path,
  baseUrl,
  botKey,
  body = undefined,
  fetchImpl = null,
  sleepImpl = null,
  maxRetries = 3,
  baseBackoffMs = 250,
  logger = null,
} = {}) {
  if (!path) throw new Error('coin_client: requestJson needs a path.');
  const key = getBotKey(botKey);
  if (!key) {
    throw new Error('coin_client: no bot key configured (set FOURWEIRD_BOT_KEY or VIBE_API_TOKEN).');
  }
  const base = getBaseUrl(baseUrl);
  const url = `${base}${path}`;
  const impl = fetchImpl || defaultFetch();
  const safeUrl = redactKeyFromText(url, key);

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt += 1;
    let res;
    try {
      const init = {
        method,
        headers: { ...buildAuthHeaders(key), 'content-type': 'application/json' },
      };
      if (body !== undefined) init.body = JSON.stringify(body);
      res = await impl(url, init);
    } catch (err) {
      // Network-level failure: retryable.
      if (attempt <= maxRetries) {
        const wait = baseBackoffMs * 2 ** (attempt - 1);
        safeLog(logger, `coin_client: network error (attempt ${attempt}/${maxRetries + 1}) — retrying in ${wait}ms: ${err && err.message ? err.message : err}`, key);
        await sleep(wait, sleepImpl);
        continue;
      }
      throw new CoinApiError(
        `coin_client: network error after ${attempt} attempts: ${err && err.message ? err.message : err}`,
        { status: 0, code: 'network_error', body: null },
      );
    }

    const status = Number(res && res.status) || 0;
    let parsed = null;
    try {
      parsed = res && typeof res.json === 'function' ? await res.json() : null;
    } catch (e) {
      parsed = null;
    }

    if (status >= 200 && status < 300) return { status, body: parsed };

    const code = codeFromBody(parsed);
    const retryable = status >= 500 && status <= 599;
    if (retryable && attempt <= maxRetries) {
      const wait = baseBackoffMs * 2 ** (attempt - 1);
      safeLog(logger, `coin_client: ${safeUrl} -> ${status} (attempt ${attempt}/${maxRetries + 1}) — retrying in ${wait}ms`, key);
      await sleep(wait, sleepImpl);
      continue;
    }
    throw new CoinApiError(`coin_client: request failed (${method} ${path} -> ${status}${code ? ` code=${code}` : ''})`, {
      status,
      code,
      body: parsed,
    });
  }
}

/**
 * Quota guard for the heal loop. `guardedCall` wraps any coin API call:
 * on 402/insufficient it flips paused=true and logs QUOTA_PAUSE_LOG.
 */
class CoinGuard {
  constructor({ logger = null } = {}) {
    this.logger = logger;
    this.paused = false;
    this.pauseReason = '';
    this.pausedAt = null;
  }

  pause(reason) {
    this.paused = true;
    this.pauseReason = typeof reason === 'string' && reason ? reason : 'quota exhausted';
    this.pausedAt = new Date().toISOString();
    safeLog(this.logger, `${QUOTA_PAUSE_LOG} reason=${this.pauseReason}`);
    return this.snapshot();
  }

  resume() {
    this.paused = false;
    this.pauseReason = '';
    this.pausedAt = null;
    safeLog(this.logger, QUOTA_RESUME_LOG);
    return this.snapshot();
  }

  shouldRun() {
    return !this.paused;
  }

  snapshot() {
    return { paused: this.paused, reason: this.pauseReason, at: this.pausedAt };
  }

  /**
   * Run `fn()`; on quota signals pause the guard and rethrow a CoinApiError
   * with `quotaPaused=true`. Non-quota errors pass through untouched.
   */
  async guardedCall(fn) {
    try {
      return await fn();
    } catch (err) {
      const signal = isQuotaSignal({
        status: err && err.status,
        code: err && err.code,
        body: err && err.body,
      });
      if (signal) {
        const reason = err && err.code
          ? `${err.status || 402}/${err.code}`
          : `http-${(err && err.status) || 402}`;
        this.pause(reason);
        if (err && typeof err === 'object') err.quotaPaused = true;
      }
      throw err;
    }
  }
}

/**
 * Balance lookup: GET {base}/api/coins/balance -> DS-OCT-06 quote shape.
 * Returns `{ coins, usd, raw }` where raw is the untouched server body.
 */
async function getBalance(options = {}, guard = null) {
  const {
    baseUrl, botKey, fetchImpl = null, sleepImpl = null,
    maxRetries = 3, baseBackoffMs = 250, logger = null,
  } = options || {};
  const run = () => requestJson({
    method: 'GET',
    path: BALANCE_PATH,
    baseUrl,
    botKey,
    fetchImpl,
    sleepImpl,
    maxRetries,
    baseBackoffMs,
    logger,
  });
  const { body } = guard ? await guard.guardedCall(run) : await run();
  const quote = parseQuote(body || {});
  safeLog(logger, `coin_client: balance ok coins=${quote.coins} usd=${quote.usd.toFixed(2)}`, getBotKey(botKey));
  return { ...quote, raw: body };
}

/**
 * Spend request: POST {base}/api/coins/spend { coins, usd, reason, ... }.
 * `usd` is derived at 100=$1 when omitted. Returns `{ coins, usd, receipt }`.
 */
async function requestSpend(options = {}, guard = null) {
  const {
    baseUrl, botKey, coins, usd = undefined, reason = '', idempotencyKey = '',
    fetchImpl = null, sleepImpl = null,
    maxRetries = 3, baseBackoffMs = 250, logger = null,
  } = options || {};
  const amount = Number(coins);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(Math.round(amount))) {
    throw new Error(`coin_client: requestSpend needs a positive integer coins (got ${JSON.stringify(coins)}).`);
  }
  const wholeCoins = Math.floor(amount);
  const spendUsd = usd === undefined || usd === null ? coinsToUsd(wholeCoins) : Math.round(Number(usd) * 100) / 100;
  if (!Number.isFinite(spendUsd) || spendUsd < 0) {
    throw new Error(`coin_client: requestSpend usd must be non-negative (got ${JSON.stringify(usd)}).`);
  }
  const payload = { coins: wholeCoins, usd: spendUsd };
  if (reason) payload.reason = String(reason);
  if (idempotencyKey) payload.idempotencyKey = String(idempotencyKey);

  const run = () => requestJson({
    method: 'POST',
    path: SPEND_PATH,
    baseUrl,
    botKey,
    body: payload,
    fetchImpl,
    sleepImpl,
    maxRetries,
    baseBackoffMs,
    logger,
  });
  const { body } = guard ? await guard.guardedCall(run) : await run();
  safeLog(logger, `coin_client: spend ok coins=${wholeCoins} usd=${spendUsd.toFixed(2)}${reason ? ` reason=${reason}` : ''}`, getBotKey(botKey));
  return { coins: wholeCoins, usd: spendUsd, receipt: body };
}

module.exports = {
  COINS_PER_USD,
  DEFAULT_BASE_URL,
  BALANCE_PATH,
  SPEND_PATH,
  QUOTA_PAUSE_LOG,
  QUOTA_RESUME_LOG,
  CoinApiError,
  CoinGuard,
  getBotKey,
  getBaseUrl,
  coinsToUsd,
  parseQuote,
  isQuotaSignal,
  redactKeyFromText,
  safeLog,
  buildAuthHeaders,
  requestJson,
  getBalance,
  requestSpend,
};
