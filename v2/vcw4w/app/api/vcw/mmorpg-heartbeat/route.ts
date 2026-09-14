/**
 * POST /api/vcw/mmorpg-heartbeat — unauthenticated foundation stub.
 *
 * Accepts { serverId, snapshot } and answers 200 { ok: true, peers: [] }.
 * NEVER reads cookies for auth decisions; no secrets; no gateway imports.
 *
 * TODO (when promoted beyond foundation):
 * - Wire gateway/BYOK auth (resolveVcwCaller or gateway key check).
 * - Add per-server rate limiting (see lib/rate-limit.ts pattern).
 * - Persist snapshots / compute real peers instead of [].
 *
 * In-scope home for the vcw lane (app/api/vcw/**). The requested
 * app/api/mmorpg/heartbeat path is steward-owned; this route is the
 * lane-compliant equivalent — steward may alias/promote it.
 */

import { fail, ok } from "@/lib/api-respond";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";

const FOUNDATION_HEADERS = {
  "x-vcw-foundation": "unauthenticated-dry-run; no-db-writes; promote-with-auth-metering",
};

type HeartbeatBody = {
  serverId?: unknown;
  snapshot?: unknown;
};

export async function POST(req: Request): Promise<Response> {
  // Unauthenticated stub, so throttle per IP (generous: heartbeats are chatty).
  const rl = rateLimit(`vcw:mmorpg-heartbeat:${clientIp(req)}`, 120, 60_000);
  if (!rl.allowed) {
    return fail("Rate limited.", 429, { ...rateLimitHeaders(rl), ...FOUNDATION_HEADERS });
  }
  let body: HeartbeatBody;
  try {
    body = (await req.json()) as HeartbeatBody;
  } catch {
    return fail("Invalid JSON body.", 400, FOUNDATION_HEADERS);
  }

  const serverId = typeof body?.serverId === "string" ? body.serverId.trim() : "";
  if (!serverId || serverId.length > 128) {
    return fail("Invalid serverId.", 400, FOUNDATION_HEADERS);
  }

  // snapshot is accepted and ignored in the foundation stub (no DB writes).
  void body?.snapshot;

  // peers: [] is the stub's honest empty (no presence store yet), flagged by
  // the foundation header so QA harnesses never mistake it for live data.
  return ok({ peers: [] }, 200, FOUNDATION_HEADERS);
}
