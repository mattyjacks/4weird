import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function isUuid(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s) ? s : "";
}

// POST /api/fundraisers/[id]/close { status: "closed" | "cancelled" }
// Creator-only. Closing stops new backing; raised coins stay credited.
// NOTE: UI-disabled via FUNDRAISERS_ENABLED while compliance is worked out,
// but intentionally left working so re-enabling is instant.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const { id: raw } = await params;
  const id = isUuid(raw);
  if (!id) return fail("Invalid campaign.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Login required.", 401);
  const throttle = rateLimit(`launch-close:${data.user.id}`, 10, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const status = String((body as Record<string, unknown> | null)?.status ?? "closed");
  const { data: rpcData, error } = await supabase.rpc("close_launch_campaign", {
    p_campaign_id: id,
    p_status: status,
  });
  if (error) {
    const msg = String(error.message ?? "");
    if (/only the creator/i.test(msg)) return fail("Only the creator can close this campaign.", 403);
    if (/not found/i.test(msg)) return fail("Campaign not found.", 404);
    return rpcFail("api/fundraisers/close", error, () => 400, "Unable to close campaign.");
  }
  return ok({ closed: rpcData });
}
