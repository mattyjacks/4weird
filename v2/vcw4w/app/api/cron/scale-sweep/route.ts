import { createHash, timingSafeEqual } from "node:crypto";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET|POST /api/cron/scale-sweep — daily Automated Member Pruning sweep:
// orgs that opted in and sit at/above their 9,000 (or custom) threshold,
// plus clans with auto-prune on at/above 90,000 (or custom). Fired by
// Vercel Cron daily (see vercel.json). Bearer CRON_SECRET only.
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
  const [{ data: orgs, error: orgError }, { data: clans, error: clanError }] = await Promise.all([
    db.rpc("run_org_auto_prune", {}),
    db.rpc("run_clan_auto_prune", {}),
  ]);
  if (orgError) console.error("[cron/scale-sweep] orgs", orgError.code ?? orgError.message);
  if (clanError) console.error("[cron/scale-sweep] clans", clanError.code ?? clanError.message);
  if (orgError && clanError) return fail("Scale sweep failed.", 500);
  return ok({ tick: { orgs, clans }, at: new Date().toISOString() });
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
