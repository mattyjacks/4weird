const buckets = new Map<string, { count: number; resetAt: number }>();

const MAX_BUCKETS = 5000;

function normalizeKey(key: string): string {
  // Bound key length and collapse case/whitespace so attacker-influenced keys
  // (e.g. login-email:<raw>) cannot grow memory unboundedly.
  return String(key ?? "").trim().toLowerCase().slice(0, 160);
}

function evictExpired(now: number) {
  // Opportunistic expiry + LRU-ish eviction: delete expired first, then
  // oldest-inserted entries if still over capacity (Map preserves insertion order).
  for (const [bucketKey, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(bucketKey);
    if (buckets.size <= MAX_BUCKETS) break;
  }
  while (buckets.size > MAX_BUCKETS) {
    const oldest = buckets.keys().next();
    if (oldest.done) break;
    buckets.delete(oldest.value);
  }
}

// NOTE: process-local buckets are best-effort on serverless (per-instance).
// They are layer 1 (fast reject, zero I/O). Layer 2 is the shared Postgres
// backstop in lib/abuse-limit.ts (abuse_buckets, advisory-locked): every
// anonymous endpoint (signup/login/kid-login/guest-pass) and every
// high-value authed endpoint (daily/claim/referrals/uploads) checks BOTH.
// Security-critical money moves additionally hold Postgres atomic guards
// (advisory locks / UNIQUE constraints) inside their RPCs.

export function rateLimit(key: string, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const nkey = normalizeKey(key);
  evictExpired(now);
  const current = buckets.get(nkey);
  if (!current || current.resetAt <= now) {
    buckets.set(nkey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  current.count += 1;
  return { allowed: current.count <= limit, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
}

/**
 * Standard Retry-After headers for a denied rateLimit() verdict.
 * Returns {} when allowed so callers can spread unconditionally:
 * `fail("Rate limited.", 429, rateLimitHeaders(rl))`.
 * Additive only: existing callers that already pass an explicit
 * Retry-After are untouched.
 */
export function rateLimitHeaders(result: { allowed: boolean; retryAfter: number }): Record<string, string> {
  if (result.allowed) return {};
  return { "Retry-After": String(Math.max(1, Math.ceil(result.retryAfter))) };
}
