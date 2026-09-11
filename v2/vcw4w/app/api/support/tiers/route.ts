import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/support";

export const dynamic = "force-dynamic";

function rpcStatus(msg: string): number {
  if (/login required/i.test(msg)) return 401;
  if (/already subscribed|you cannot support|not a verified|owners fund|tier not found|title required|tier must be/i.test(msg)) return 400;
  if (/not a moderator|only verified/i.test(msg)) return 403;
  if (/insufficient balance/i.test(msg)) return 402;
  return 400;
}

// GET /api/support/tiers?owner_user=&clan_id=; public tier catalog.
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const url = new URL(req.url);
  const ownerUser = isUuid(url.searchParams.get("owner_user"));
  const clanId = isUuid(url.searchParams.get("clan_id"));
  const supabase = await createClient();
  let q = supabase
    .from("support_tiers")
    .select("id,owner_user_id,clan_id,title,blurb,coins_monthly,active,created_at")
    .eq("active", true)
    .order("coins_monthly", { ascending: true })
    .limit(100);
  if (ownerUser) q = q.eq("owner_user_id", ownerUser);
  if (clanId) q = q.eq("clan_id", clanId);
  const { data, error } = await q;
  if (error) return dbFail("api/support/tiers", error);
  return ok({ tiers: data ?? [] });
}

// POST /api/support/tiers { clan_id?, title, coins_monthly, blurb? }
// No clan_id = personal tier (verified creators only; enforced in SQL).
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Login required.", 401);
  const throttle = rateLimit(`support-tier:${data.user.id}`, 10, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const clanId = isUuid(input.clan_id);
  const { data: rpcData, error } = await supabase.rpc("create_support_tier", {
    p_clan_id: clanId || null,
    p_title: String(input.title ?? ""),
    p_coins_monthly: Number(input.coins_monthly),
    p_blurb: String(input.blurb ?? ""),
  });
  if (error) return rpcFail("api/support/tiers", error, rpcStatus, "Unable to create tier.");
  return ok({ tier: rpcData }, 201);
}
