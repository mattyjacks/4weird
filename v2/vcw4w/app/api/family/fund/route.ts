import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { rpcStatus } from "@/lib/agent-market";

export const dynamic = "force-dynamic";

/**
 * POST /api/family/fund {kid_id, coins}; parent moves their own Vibe Coins
 * into a child's wallet. Atomic RPC: parent ledger debit (parental budgets
 * enforced) + child credit. Children can only spend what parents grant.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`family-fund:${u.id}`, 20);
  if (!throttle.allowed) {
    return fail("Too many requests. Try again shortly.", 429, { "Retry-After": String(throttle.retryAfter) });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const kidId = String(input.kid_id ?? "");
  const coins = Number(input.coins);
  if (!/^[0-9a-f-]{36}$/i.test(kidId)) return fail("Invalid child account.", 400);
  if (!Number.isFinite(coins) || coins <= 0 || coins > 100000) return fail("Amount must be 0-100,000 coins.", 400);
  const { data: balance, error } = await supabase.rpc("fund_kid_wallet", { p_kid: kidId, p_coins: Math.round(coins * 100) / 100 });
  if (error) return rpcFail("api/family/fund", error, rpcStatus, "Unable to fund child wallet.");
  return ok({ balance: Number(balance ?? 0) });
}
