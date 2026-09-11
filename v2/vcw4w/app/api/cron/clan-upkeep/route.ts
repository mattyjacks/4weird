import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET|POST /api/cron/clan-upkeep — bill every clan for elapsed whole minutes.
// Fired by Vercel Cron every minute at :00 (see vercel.json). Authenticates
// with CRON_SECRET via Authorization: Bearer only (never ?secret= — query
// secrets leak into logs, proxies, and browser history). Without a configured
// secret the route refuses (fail-closed — no free billing runs, no unauth runs).
// Lazy accrual in the clan detail GET covers reads between ticks.
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) return false;
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  return bearer === secret;
}

async function tick() {
  const db = serviceClient();
  const { data, error } = await db.rpc("accrue_all_clan_minute_upkeep", {});
  if (error) {
    console.error("[cron/clan-upkeep]", error.code ?? error.message);
    return fail("Upkeep tick failed.", 500);
  }
  return ok({ tick: data, at: new Date().toISOString() });
}

export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!authorized(req)) return fail("Unauthorized.", 401);
  return tick();
}

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!authorized(req)) return fail("Unauthorized.", 401);
  return tick();
}
