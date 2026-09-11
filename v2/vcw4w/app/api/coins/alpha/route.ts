import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/csrf";

export const dynamic = "force-dynamic";

/** One-time 500-coin launch gift. The database RPC is the authority. */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const throttle = rateLimit(`alpha:${data.user.id}`, 5, 60_000);
  if (!throttle.allowed) return fail("Too many attempts. Try again shortly.", 429, { "Retry-After": String(throttle.retryAfter) });

  const { data: rows, error } = await supabase.rpc("claim_alpha_tester_bonus");
  if (error) return dbFail("api/coins/alpha", error);
  const row = (rows as { coins: number; claimed: boolean }[] | null)?.[0] ?? { coins: 0, claimed: false };
  return ok({ coins: row.coins, claimed: row.claimed });
}
