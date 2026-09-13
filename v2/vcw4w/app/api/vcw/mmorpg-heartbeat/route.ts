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

type HeartbeatBody = {
  serverId?: unknown;
  snapshot?: unknown;
};

export async function POST(req: Request): Promise<Response> {
  let body: HeartbeatBody;
  try {
    body = (await req.json()) as HeartbeatBody;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const serverId = typeof body?.serverId === "string" ? body.serverId.trim() : "";
  if (!serverId || serverId.length > 128) {
    return Response.json({ ok: false, error: "Invalid serverId." }, { status: 400 });
  }

  // snapshot is accepted and ignored in the foundation stub (no DB writes).
  void body?.snapshot;

  return Response.json({ ok: true, peers: [] });
}
