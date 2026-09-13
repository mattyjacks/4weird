import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type UsageRow = {
  booking_id: string;
  seconds: number;
  gross_cents: number;
  cut_cents: number;
  provider_cents: number;
};

/** Your rentals (rent side) + bookings on your listings (host side) + summed
 *  metered usage. All usage money shown is gross and includes the 25%
 *  platform cut. Hourly quotes are MAXIMUMS; usage rows bill per second. */
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
    .select("id,listing_id,renter_id,status,escrow_coins,started_at,ended_at,pod_id,endpoint_url,gpu_type,agent_listings(id,name,runtime,provider_code,endpoint_url,price_cents_per_hour,status)")
    .eq("renter_id", user.id)
    .order("started_at", { ascending: false })
    .limit(200);
  if (rentalsError) return dbFail("api/agents/bookings/mine", rentalsError, "Unable to load rentals.");

  const { data: ownerBookings, error: ownerError } = await supabase
    .from("rental_bookings")
    .select("id,listing_id,renter_id,status,escrow_coins,started_at,ended_at,pod_id,endpoint_url,gpu_type,agent_listings!inner(id,name,runtime,provider_code,endpoint_url,price_cents_per_hour,status)")
    .eq("agent_listings.owner_id", user.id)
    .order("started_at", { ascending: false })
    .limit(200);
  if (ownerError) return dbFail("api/agents/bookings/mine", ownerError, "Unable to load listing bookings.");

  const bookingIds = [
    ...((rentals ?? []).map((r) => (r as { id: string }).id)),
    ...((ownerBookings ?? []).map((r) => (r as { id: string }).id)),
  ];
  // Bound the fan-out: one IN per 100 ids so power users can't blow the
  // URL/PostgREST limits with a single unbounded list.
  const idSet = [...new Set(bookingIds)].slice(0, 400);
  let usage: UsageRow[] = [];
  for (let i = 0; i < idSet.length; i += 100) {
    const chunk = idSet.slice(i, i + 100);
    const { data: usageRows, error: usageError } = await supabase
      .from("compute_usage")
      .select("booking_id,seconds,gross_cents,cut_cents,provider_cents")
      .in("booking_id", chunk);
    if (usageError) return dbFail("api/agents/bookings/mine", usageError, "Unable to load usage.");
    usage = usage.concat((usageRows ?? []) as UsageRow[]);
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
