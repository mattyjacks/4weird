import { createHash, timingSafeEqual } from "node:crypto";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET|POST /api/cron/clan-tribute - daily Clan Support commons sweep:
// expire stale vintages, move ~1% of each rich clan's eligible surplus
// (oldest-expiry first; >=12mo globalized to the reserve, 6-12mo tributed
// 70/20/10 to poor clans / reserve / poor individuals), then spend the
// reserve rescuing delinquent clans. Fired by Vercel Cron daily
// (see vercel.json). Same Bearer CRON_SECRET discipline as /clan-upkeep:
// Authorization header only, fail-closed without a configured secret.
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) return false;
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!bearer) return false;
  const ah = createHash("sha256").update(bearer).digest();
  const bh = createHash("sha256").update(secret).digest();
  try {
    return timingSafeEqual(ah, bh);
  } catch {
    return false;
  }
}

async function tick() {
  const db = serviceClient();
  const { data, error } = await db.rpc("run_clan_tribute_sweep", {});
  if (error) {
    console.error("[cron/clan-tribute]", error.code ?? error.message);
    return fail("Tribute sweep failed.", 500);
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
