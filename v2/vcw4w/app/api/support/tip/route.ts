import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { requireHuman } from "@/lib/botid";
import { cleanSupportAmount, isUuid } from "@/lib/support";

export const dynamic = "force-dynamic";

function rpcStatus(msg: string): number {
  if (/login required/i.test(msg)) return 401;
  if (/one recipient|not a verified|clan not found|owners fund|amount/i.test(msg)) return 400;
  if (/you cannot support yourself/i.test(msg)) return 400;
  if (/insufficient balance/i.test(msg)) return 402;
  return 400;
}

// POST /api/support/tip { recipient_user_id?, clan_id?, coins }
// Exactly one recipient. Users must be verified; clan owners use the wallet
// fund path instead of tipping their own clan. Voluntary and final.
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Login required.", 401);
  const botBlock = await requireHuman(req, "POST /api/support/tip");
  if (botBlock) return botBlock;
  const throttle = rateLimit(`support-tip:${data.user.id}`, 10, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const coins = cleanSupportAmount(input.coins);
  if (!coins) return fail("Amount must be 1..100000 coins.", 400);
  const recipientUser = isUuid(input.recipient_user_id);
  const clanId = isUuid(input.clan_id);
  if ((recipientUser === "") === (clanId === "")) {
    return fail("Send to exactly one recipient: a verified creator or a clan.", 400);
  }
  const { data: rpcData, error } = await supabase.rpc("tip_creator", {
    p_recipient_user: recipientUser || null,
    p_clan: clanId || null,
    p_coins: coins,
  });
  if (error) return rpcFail("api/support/tip", error, rpcStatus, "Unable to send tip.");
  return ok({ tipped: rpcData }, 201);
}
