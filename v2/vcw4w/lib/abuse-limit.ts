import { createHash } from "node:crypto";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { clientIp } from "@/lib/validate";

/**
 * Distributed abuse limits: the cross-instance backstop behind the
 * per-instance rateLimit() memory buckets.
 *
 * Threat model: serverless scale-out means N live instances, each with its
 * own memory map. A caller spraying requests across instances (or a botnet
 * rotating many real IPs) gets ~N x every local limit. These Postgres
 * buckets (see 20261017000000_abuse_limits.sql) are shared by all instances
 * and serialized per key with an advisory lock, so distributed bursts count
 * against ONE window.
 *
 * Usage: keep the existing memory check (fast reject, zero I/O), then call
 * globalBucket(). Deny if EITHER denies. If the shared store is unreachable
 * the helper returns null and the caller falls back to the memory verdict
 * (fail-open on infra failure, fail-closed on abuse) - except money-minting
 * paths, which must fail closed and already do via atomic RPC guards.
 */

export type GlobalBucketVerdict = {
  allowed: boolean;
  retryAfter: number;
  /** Hits consumed in the current window (drives quota readouts, e.g. guest loads). */
  hits: number;
};

/** Anonymous key: salted IP hash when configured (never store raw IPs). */
export function ipBucketKey(req: Request, scope: string): string {
  const salt = process.env.SIGNUP_IP_HASH_SALT ?? "";
  const ip = clientIp(req);
  const id = salt
    ? createHash("sha256").update(`${salt}|abuse-limit|${ip}`).digest("hex").slice(0, 32)
    : `raw-${ip.slice(0, 64)}`;
  return `abuse:${scope}:ip:${id}`.slice(0, 200);
}

/** Account-scoped key (email, handle, user id). Lowercase + bounded. */
export function acctBucketKey(scope: string, id: string): string {
  return `abuse:${scope}:acct:${String(id ?? "").trim().toLowerCase().slice(0, 64)}`.slice(0, 200);
}

/**
 * Increment the shared window and return the verdict.
 * Returns null when the shared store is unreachable (degraded).
 */
export async function globalBucket(
  key: string,
  limit: number,
  windowSecs: number,
): Promise<GlobalBucketVerdict | null> {
  try {
    if (!hasServerSupabase()) return null;
    const svc = serviceClient();
    const { data, error } = await svc.rpc("check_abuse_bucket", {
      p_key: String(key).slice(0, 200),
      p_limit: Math.max(1, Math.floor(limit)),
      p_window_seconds: Math.max(1, Math.floor(windowSecs)),
    });
    if (error || !data) return null;
    const d = data as { allowed?: boolean; retry_after?: number; hits?: number };
    return {
      allowed: d.allowed !== false,
      retryAfter: Math.max(0, Number(d.retry_after ?? 0) || 0),
      hits: Math.max(0, Number(d.hits ?? 0) || 0),
    };
  } catch {
    return null;
  }
}

/** Standard Retry-After header for 429s. */
export function throttleHeaders(retryAfter: number): Record<string, string> {
  return { "Retry-After": String(Math.max(1, Math.ceil(retryAfter))) };
}
