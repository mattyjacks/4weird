import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/support";

export const dynamic = "force-dynamic";

function rpcStatus(msg: string): number {
  if (/login required/i.test(msg)) return 401;
  if (/already subscribed|you cannot support|not a verified|tier not found/i.test(msg)) return 400;
  if (/insufficient balance/i.test(msg)) return 402;
  if (/subscription not found/i.test(msg)) return 404;
  return 400;
}

// GET /api/support/subscribe; my subscriptions (supporter only).
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Login required.", 401);
  const { data: subs, error } = await supabase
    .from("support_subscriptions")
    .select("id,tier_id,status,current_period_start,current_period_end,created_at")
    .eq("supporter_id", data.user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return fail("Unable to load subscriptions.", 500);
  return ok({ subscriptions: subs ?? [] });
}

// POST /api/support/subscribe { action: "subscribe", tier_id }; first month
// charged immediately (30-day period, cancel anytime, no proration/refund).
// POST /api/support/subscribe { action: "cancel", subscription_id }
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Login required.", 401);
  const throttle = rateLimit(`support-sub:${data.user.id}`, 10, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const action = String(input.action ?? "subscribe");

  if (action === "cancel") {
    const subId = isUuid(input.subscription_id);
    if (!subId) return fail("Invalid subscription.", 400);
    const { data: rpcData, error } = await supabase.rpc("cancel_subscription", {
      p_subscription_id: subId,
    });
    if (error) return rpcFail("api/support/subscribe", error, rpcStatus, "Unable to cancel.");
    return ok({ cancelled: rpcData });
  }

  const tierId = isUuid(input.tier_id);
  if (!tierId) return fail("Invalid tier.", 400);
  const { data: rpcData, error } = await supabase.rpc("subscribe_to_tier", {
    p_tier_id: tierId,
  });
  if (error) return rpcFail("api/support/subscribe", error, rpcStatus, "Unable to subscribe.");
  return ok({ subscribed: rpcData }, 201);
}
