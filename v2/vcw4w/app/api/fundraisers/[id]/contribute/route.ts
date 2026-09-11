import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok, rpcFail } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { cleanSupportAmount } from "@/lib/support";

export const dynamic = "force-dynamic";

function isUuid(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s) ? s : "";
}

function rpcStatus(msg: string): number {
  if (/login required/i.test(msg)) return 401;
  if (/campaign not found/i.test(msg)) return 404;
  if (/not open|has ended|own campaign/i.test(msg)) return 400;
  if (/insufficient balance/i.test(msg)) return 402;
  if (/amount/i.test(msg)) return 400;
  return 400;
}

// POST /api/fundraisers/[id]/contribute { coins }; gift-based backing in
// Vibe Coins. Final once sent (fraud freeze/refund is platform-handled).
// NOTE: UI-disabled via FUNDRAISERS_ENABLED while compliance is worked out,
// but intentionally left working so re-enabling is instant.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const { id: raw } = await params;
  const id = isUuid(raw);
  if (!id) return fail("Invalid campaign.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Login required.", 401);
  const throttle = rateLimit(`launch-back:${data.user.id}`, 10, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const coins = cleanSupportAmount((body as Record<string, unknown> | null)?.coins);
  if (!coins) return fail("Amount must be 1..100000 coins.", 400);
  const { data: rpcData, error } = await supabase.rpc("contribute_launch_campaign", {
    p_campaign_id: id,
    p_coins: coins,
  });
  if (error) return rpcFail("api/fundraisers/contribute", error, rpcStatus, "Unable to back campaign.");
  return ok({ backed: rpcData }, 201);
}
