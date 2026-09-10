import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type UsageRow = {
  booking_id: string;
  seconds: number;
  gross_cents: number;
  cut_cents: number;
  provider_cents: number;
};

/** Own rentals + bookings on own listings + summed metered usage.
 *  All usage money shown is gross and includes the 25% platform cut. */
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return fail("Authentication required.", 401);
  const rl = rateLimit(`agents:mine:${user.id}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  const { data: rentals, error: rentalsError } = await supabase
    .from("rental_bookings")
    .select("*, agent_listings(id,name,runtime,provider_code,price_cents_per_hour,status)")
    .eq("renter_id", user.id)
    .order("started_at", { ascending: false });
  if (rentalsError) return fail("Unable to load rentals.", 500);

  const { data: ownerBookings, error: ownerError } = await supabase
    .from("rental_bookings")
    .select("*, agent_listings!inner(id,name,runtime,provider_code,price_cents_per_hour,status)")
    .eq("agent_listings.owner_id", user.id)
    .order("started_at", { ascending: false });
  if (ownerError) return fail("Unable to load listing bookings.", 500);

  const bookingIds = [
    ...((rentals ?? []).map((r) => (r as { id: string }).id)),
    ...((ownerBookings ?? []).map((r) => (r as { id: string }).id)),
  ];
  let usage: UsageRow[] = [];
  if (bookingIds.length > 0) {
    const { data: usageRows, error: usageError } = await supabase
      .from("compute_usage")
      .select("booking_id,seconds,gross_cents,cut_cents,provider_cents")
      .in("booking_id", [...new Set(bookingIds)]);
    if (usageError) return fail("Unable to load usage.", 500);
    usage = (usageRows ?? []) as UsageRow[];
  }

  const totals = usage.reduce(
    (acc, u) => ({
      seconds: acc.seconds + u.seconds,
      gross_cents: acc.gross_cents + u.gross_cents,
      cut_cents: acc.cut_cents + u.cut_cents,
      provider_cents: acc.provider_cents + u.provider_cents,
    }),
    { seconds: 0, gross_cents: 0, cut_cents: 0, provider_cents: 0 },
  );

  return ok({ rentals: rentals ?? [], ownerBookings: ownerBookings ?? [], usage, totals });
}
