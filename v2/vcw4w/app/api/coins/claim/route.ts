import { createClient } from "@/lib/supabase/server";
import {
  hasServerSupabase,
  serviceClient,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/supabase/service";
import { acctBucketKey, globalBucket, throttleHeaders } from "@/lib/abuse-limit";
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
  // Distributed shield: at most 10 grant-claims/hour per account across all
  // instances (double-mint itself is blocked by UNIQUE(grant_id), this stops
  // the retry storm from ever reaching the money path).
  const claimDist = await globalBucket(acctBucketKey("claim-hour", user.id), 10, 3600);
  if (claimDist && !claimDist.allowed) {
    return fail("Too many claim attempts. Try again shortly.", 429, throttleHeaders(claimDist.retryAfter));
  }

  if (supabaseServiceRoleKey()) {
    try {
      const db = serviceClient();
      // Exact-lower match (not ilike): grants are written lowercased by the
      // webhook, so `User@x.com ≡ user@x.com` can't claim a differently-cased
      // row and whitespace/case variants can't shadow ownership.
      // Bounded per call (mirrors the shopify-coins edge cap): a stale
      // mailbox with thousands of parked grants must not turn one POST
      // into an unbounded multi-thousand-write burst.
      const { data: pending, error: qErr } = await db
        .from("coin_grants")
        .select("id,coins,shopify_order_name")
        .eq("email", String(user.email).trim().toLowerCase())
        .eq("claimed", false)
        .limit(50);
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
        if (ledgerErr) {
          // UNIQUE(grant_id) violation (23505) means this grant is already
          // paired to a ledger row (concurrent claim won the race): converge
          // the grant to claimed instead of leaving it unclaimed forever.
          const code = (ledgerErr as { code?: unknown }).code;
          if (code === "23505") {
            const { data: existing } = await db
              .from("coin_ledger")
              .select("id")
              .eq("grant_id", g.id)
              .limit(1);
            if (existing && existing.length > 0) {
              await db
                .from("coin_grants")
                .update({ user_id: user.id, claimed: true })
                .eq("id", g.id)
                .eq("claimed", false);
              claimed += 1;
            }
          }
          continue;
        }
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
