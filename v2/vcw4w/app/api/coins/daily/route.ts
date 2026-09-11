import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";

export const dynamic = "force-dynamic";

/**
 * Daily login bonus: 5 coins + 1 per consecutive UTC day, capped at 12.
 * The claim_daily_bonus() RPC owns the date math and the ledger insert, so
 * concurrent claims settle to a single award. Second claim same day pays 0.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const throttle = rateLimit(`daily:${data.user.id}`, 5, 60_000);
  if (!throttle.allowed) {
    return fail("Too many attempts. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  const { data: rows, error } = await supabase.rpc("claim_daily_bonus");
  if (error) return dbFail("api/coins/daily", error);
  const row = (rows as { coins: number; streak: number; love_letters?: number }[] | null)?.[0] ?? { coins: 0, streak: 0 };
  return ok({ coins: row.coins, streak: row.streak, claimed: row.coins > 0, love_letters: row.love_letters ?? (row.coins > 0 ? 1 : 0) });
}
