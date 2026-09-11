import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { clientIp, isUuid } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Public: fetch one listing (available to all; paused only to its owner).
 *  Hourly prices are gross MAXIMUMS ($/hr, 25% cut included); metering bills
 *  per second. RunPod auto listings expose no private URL here; the live
 *  RunPod default endpoint is handed to the renter on booking. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const rl = rateLimit(`agents:get:${clientIp(req)}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid listing id.", 400);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("agent_listings")
    .select(
      "id,owner_id,name,runtime,provider_code,endpoint_url,price_cents_per_hour,status,created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) return dbFail("api/agents/[id]", error, "Unable to load listing.");
  if (!data) return fail("Listing not found.", 404);
  const row = data as Record<string, unknown>;
  // Private fields only to owner; anon/others get the public card.
  const isOwner = Boolean(auth?.user && auth.user.id === row.owner_id);
  if (!isOwner) {
    const pub = { ...row };
    delete pub.owner_id;
    delete pub.endpoint_url;
    return ok({ listing: pub });
  }
  return ok({ listing: row });
}
