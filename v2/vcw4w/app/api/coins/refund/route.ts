import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { requireHuman } from "@/lib/botid";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function refundStatus(message: string): number {
  const m = message.toLowerCase();
  if (m.includes("login")) return 401;
  if (m.includes("forbidden")) return 403;
  if (m.includes("not found")) return 404;
  if (
    m.includes("free coins") ||
    m.includes("window expired") ||
    m.includes("expired") ||
    m.includes("already spent") ||
    m.includes("exceeds unspent") ||
    m.includes("invalid refund") ||
    m.includes("below minimum") ||
    m.includes("lot")
  )
    return 400;
  return 500;
}

/**
 * POST /api/coins/refund { lot_id, coins? }; refund a purchased lot's
 * unspent remainder in full (coins omitted) or partially (coins set).
 * Partial refunds are the pro-rated path once FIFO spending ate part of
 * the lot. The lot row is marked refunded; the ledger + coin_refunds audit
 * row are written atomically in refund_coin_lot().
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const botBlock = await requireHuman(req, "POST /api/coins/refund");
  if (botBlock) return botBlock;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return fail("Authentication required.", 401);
  const throttle = rateLimit(`coin-refund:${userData.user.id}`, 10, 60_000);
  if (!throttle.allowed) {
    return fail("Too many refund attempts. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  let body: { lot_id?: unknown; coins?: unknown };
  try {
    body = (await req.json()) as { lot_id?: unknown; coins?: unknown };
  } catch {
    return fail("Invalid request body.", 400);
  }
  const lotId = String(body.lot_id ?? "").trim();
  if (!lotId) return fail("lot_id is required.", 400);
  const coinsRaw = body.coins;
  const coins =
    coinsRaw === undefined || coinsRaw === null || coinsRaw === ""
      ? null
      : Number(coinsRaw);
  if (coins !== null && (!Number.isFinite(coins) || coins <= 0)) {
    return fail("Invalid refund amount.", 400);
  }
  const { data, error } = await supabase.rpc("refund_coin_lot", {
    p_lot_id: lotId,
    p_coins: coins,
  });
  if (error) return rpcFail("api/coins/refund", error, refundStatus);
  return ok({ refund: data });
}
