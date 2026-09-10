import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { clientIp, isUuid } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Public: fetch one listing (available to all; paused only to its owner). */
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
  const { data, error } = await supabase
    .from("agent_listings")
    .select(
      "id,owner_id,name,runtime,provider_code,price_cents_per_hour,status,created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) return fail("Unable to load listing.", 500);
  if (!data) return fail("Listing not found.", 404);
  return ok({ listing: data });
}
