import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { isUuid } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";
import { rpcStatus } from "@/lib/agent-market";

export const dynamic = "force-dynamic";

/** End a booking (renter or listing owner). Unused escrow is refunded to the
 *  renter ledger by the end_booking RPC (escrow - metered); the API surfaces
 *  the refunded amount. Provision failures should end the booking promptly so
 *  escrow does not stay locked. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`agents:end:${data.user.id}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid booking id.", 400);
  const { data: booking, error } = await supabase.rpc("end_booking", {
    p_booking: id,
  });
  if (error)
    return fail(error.message || "Unable to end booking.", rpcStatus(error.message));
  return ok({ booking });
}
