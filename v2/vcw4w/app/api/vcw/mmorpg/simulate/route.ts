import { fail, ok } from "@/lib/api-respond";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";
import { MMO_SERVERS, simulateShard } from "@/lib/vcw-mmo-bots";

/**
 * POST /api/vcw/mmorpg/simulate — MMORPG bot/autoplay QA dry-run.
 *
 * Body: `{ serverId, bots, ticks }` — spawns `bots` synthetic players on
 * `serverId` (one of `us-east-1`, `eu-1`, `asia-1` per the games-lane
 * `window.GraveGainMMO` netcore) and walks `ticks` ticks, returning
 * `{ serverId, bots, ticks, heartbeats, quotes }`.
 *
 * Foundation route (debug-play precedent): intentionally unauthenticated +
 * unmetered, stateless pure simulation, NO DB writes, no cookies read —
 * nothing to CSRF. Every response carries an `x-vcw-foundation` warning
 * header so promoters cannot mistake it for a metered endpoint.
 *
 * TODO (when promoted beyond foundation):
 * - Wire gateway/BYOK auth (resolveVcwCaller + write scope) + same-origin
 *   for cookie sessions, per-IP + per-caller rate limits, and a
 *   `meter_vcw_usage` op for the simulation (see QUEUE line on close).
 * - Persist snapshots / compute real peers instead of synthetic ones.
 */

const FOUNDATION_HEADERS = {
  "x-vcw-foundation": "unauthenticated-dry-run; no-db-writes; promote-with-auth-metering",
};

type SimulateBody = {
  serverId?: unknown;
  bots?: unknown;
  ticks?: unknown;
};

export async function POST(req: Request): Promise<Response> {
  // Unauthenticated pure simulation: throttle per IP so the stub cannot be
  // used as a CPU-burn oracle. Throttling is abuse-shielding, not metering.
  const rl = rateLimit(`vcw:mmorpg-simulate:${clientIp(req)}`, 30, 60_000);
  if (!rl.allowed) {
    return fail("Rate limited.", 429, { ...rateLimitHeaders(rl), ...FOUNDATION_HEADERS });
  }
  let body: SimulateBody;
  try {
    body = (await req.json()) as SimulateBody;
  } catch {
    return fail("Invalid JSON body.", 400, FOUNDATION_HEADERS);
  }

  const sim = simulateShard(body?.serverId, body?.bots, body?.ticks);
  if (!sim) {
    return fail(
      `Invalid simulate body. Use { serverId: ${MMO_SERVERS.join(" | ")}, bots: 1-32, ticks: 1-120 }.`,
      400,
      FOUNDATION_HEADERS,
    );
  }

  // Dry-run only: synthetic heartbeats + display quotes, zero persistence.
  return ok(
    {
      serverId: sim.serverId,
      bots: sim.bots,
      ticks: sim.ticks,
      heartbeats: sim.heartbeats,
      quotes: sim.quotes,
    },
    200,
    FOUNDATION_HEADERS,
  );
}
