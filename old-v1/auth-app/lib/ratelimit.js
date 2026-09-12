/**
 * Tiny in-memory rate limiter for auth routes (login/signup brute force).
 * Per process; Vercel may run several isolates, so this is defense-in-depth
 * on top of Supabase's own auth rate limits - not the only layer.
 */
const hits = new Map();

function sweep(now) {
  if (hits.size < 5000) return;
  for (const [k, arr] of hits) {
    const fresh = arr.filter((t) => now - t < 60000);
    if (fresh.length) hits.set(k, fresh);
    else hits.delete(k);
  }
}

/** Returns true when the key exceeded `max` events in the last minute. */
export function overLimit(key, max = 10) {
  const now = Date.now();
  sweep(now);
  const arr = hits.get(key) || [];
  const fresh = arr.filter((t) => now - t < 60000);
  fresh.push(now);
  hits.set(key, fresh);
  return fresh.length > max;
}
