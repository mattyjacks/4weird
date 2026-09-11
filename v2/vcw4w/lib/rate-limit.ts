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
// Security-critical limits (rights export/delete, trial credit, guest quota)
// are additionally enforced in Postgres (advisory locks / UNIQUE guards).
// For strict multi-instance throttling, back this with Redis/Upstash.

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
