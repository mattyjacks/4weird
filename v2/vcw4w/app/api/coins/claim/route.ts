import { createClient } from "@/lib/supabase/server";
import {
  hasServerSupabase,
  serviceClient,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { requireHuman } from "@/lib/botid";

export const dynamic = "force-dynamic";

/**
 * Attach paid-but-unclaimed coin grants (matched by order email) to the
 * logged-in account. Same money rules as the webhook: conditional claim +
 * UNIQUE(grant_id) ledger insert, so concurrent claims cannot double-mint.
 *
 * When SUPABASE_SERVICE_ROLE_KEY is configured the claim runs directly
 * against coin_grants/coin_ledger (legacy auth-app behavior). Otherwise it
 * proxies to the shopify-coins/claim edge function (v2 behavior).
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const botBlock = await requireHuman(req, "POST /api/coins/claim");
  if (botBlock) return botBlock;
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;
  if (userError || !user?.email) return fail("Authentication required.", 401);

  const throttle = rateLimit(`coin-claim:${user.id}`, 3, 60_000);
  if (!throttle.allowed) {
    return fail("Too many claim attempts. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }

  if (supabaseServiceRoleKey()) {
    try {
      const db = serviceClient();
      const { data: pending, error: qErr } = await db
        .from("coin_grants")
        .select("id,coins,shopify_order_name")
        .ilike("email", user.email)
        .eq("claimed", false);
      if (qErr) return dbFail("api/coins/claim", qErr);
      let claimed = 0;
      for (const g of ((pending as { id: string; coins: number; shopify_order_name: string | null }[] | null) ?? [])) {
        // Ledger-first with UNIQUE(grant_id): if the insert fails the grant
        // stays unclaimed and is retryable (never burned).
        const { error: ledgerErr } = await db.from("coin_ledger").insert({
          user_id: user.id,
          delta: g.coins,
          reason: (`Shopify order ${g.shopify_order_name ?? ""}`).slice(0, 120),
          grant_id: g.id,
        });
        if (ledgerErr) continue;
        await db
          .from("coin_grants")
          .update({ user_id: user.id, claimed: true })
          .eq("id", g.id)
          .eq("claimed", false);
        claimed += 1;
      }
      return ok({ claimed });
    } catch (error) {
      return dbFail("api/coins/claim", error);
    }
  }

  const url = supabaseUrl();
  const key = supabaseAnonKey();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return fail("Authentication required.", 401);
  let response: Response;
  try {
    response = await fetch(`${url.replace(/\/$/, "")}/functions/v1/shopify-coins/claim`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, apikey: key, "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
    });
  } catch (error) {
    return dbFail("api/coins/claim:edge", error, "Coin service unreachable. Try again shortly.", 502);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const raw = (body as { error?: unknown }).error;
    console.error("[api/coins/claim] edge error", {
      status: response.status,
      message: String(raw ?? "unknown").slice(0, 200),
    });
    return fail("Unable to claim coins.", response.status >= 400 && response.status < 500 ? response.status : 502);
  }
  return ok({ claimed: Number((body as { claimed?: unknown }).claimed) || 0 });
}
