import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
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
  if (!sameOrigin(_req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`agents:end:${data.user.id}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid booking id.", 400);
  // Same ownership gate as heartbeat/pod: never end by id alone.
  const { data: bookingRow } = await supabase
    .from("rental_bookings")
    .select("id,renter_id,agent_listings(id,owner_id)")
    .eq("id", id)
    .maybeSingle();
  if (!bookingRow) return fail("Booking not found.", 404);
  const brow = bookingRow as unknown as {
    renter_id: string;
    agent_listings: { owner_id: string } | { owner_id: string }[] | null;
  };
  const listing = Array.isArray(brow.agent_listings) ? brow.agent_listings[0] : brow.agent_listings;
  if (brow.renter_id !== data.user.id && listing?.owner_id !== data.user.id)
    return fail("Booking not found.", 404);
  const { data: booking, error } = await supabase.rpc("end_booking", {
    p_booking: id,
  });
  if (error)
    return rpcFail("api/agents/bookings/end", error, rpcStatus, "Unable to end booking.");
  return ok({ booking });
}
