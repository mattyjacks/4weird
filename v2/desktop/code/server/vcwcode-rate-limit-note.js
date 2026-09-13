// vcwcode-rate-limit-note.js — 120 req/min per IP + Retry-After handling.
// Policy: max 120 requests per rolling 60s window per client IP.
// Over-limit responses carry HTTP 429 with a `Retry-After` header (seconds).
// Client rule: on 429, wait Retry-After (default 60s) then retry with backoff.
'use strict';

const RATE_LIMIT = {
  maxRequests: 120,
  windowSeconds: 60,
  scope: 'per client IP',
  statusCode: 429,
};

function retryAfterMs(res, fallbackMs) {
  const fb = Number(fallbackMs) > 0 ? Number(fallbackMs) : 60000;
  try {
    const h = res && res.headers && typeof res.headers.get === 'function'
      ? res.headers.get('retry-after')
      : (res && res.headers ? res.headers['retry-after'] : null);
    const secs = Number(h);
    if (Number.isFinite(secs) && secs >= 0) return secs * 1000;
  } catch (_) { /* fall through to fallback */ }
  return fb;
}

async function fetchWithRateLimitRetry(url, options, fetchImpl) {
  const impl = fetchImpl || fetch;
  const maxAttempts = 3;
  let attempt = 0;
  for (;;) {
    attempt += 1;
    const res = await impl(url, options);
    if (res && res.status === 429 && attempt < maxAttempts) {
      const wait = retryAfterMs(res, 60000);
      await new Promise((r) => setTimeout(r, Math.min(wait, 60000)));
      continue;
    }
    return res;
  }
}

module.exports = { RATE_LIMIT, retryAfterMs, fetchWithRateLimitRetry };
