import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { isUuid } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";
import { isHeartbeatSeconds, rpcStatus } from "@/lib/agent-market";

export const dynamic = "force-dynamic";

/** Report metered seconds on a booking (renter or listing owner). The
 *  heartbeat_usage RPC stores the gross split (includes 25% platform cut). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`agents:heartbeat:${data.user.id}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid booking id.", 400);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const seconds = isHeartbeatSeconds(
    (body as Record<string, unknown> | null)?.seconds,
  );
  if (!seconds) return fail("Seconds must be 1..86400.", 400);
  const { data: usage, error } = await supabase.rpc("heartbeat_usage", {
    p_booking: id,
    p_seconds: seconds,
  });
  if (error)
    return fail(error.message || "Unable to record usage.", rpcStatus(error.message));
  return ok({ usage });
}
