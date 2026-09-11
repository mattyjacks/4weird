import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { resolveVcwCaller } from "@/lib/vcw-gateway-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/vcw/gateway/usage; latest gateway usage rows for the caller.
 * Auth: Supabase session, bot key with a vcw scope, or `vcw_live_`
 * gateway key (all via resolveVcwCaller). Coin figures are gross and
 * include the 25% platform cut.
 */
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const caller = await resolveVcwCaller(req);
  if (!caller) return fail("Authentication required.", 401);
  const rl = rateLimit(`vcw:gateway:usage:${caller.userId}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  try {
    const db = serviceClient();
    // Explicit columns: vcw_usage carries no secrets, but SELECT * would
    // silently widen this payload if a sensitive column is ever added.
    const { data, error } = await db
      .from("vcw_usage")
      .select("id,op,qty,gross,cut,provider,source,run_id,key_id,created_at")
      .eq("user_id", caller.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return dbFail("vcw/gateway/usage", error, "Unable to load usage.");
    return ok({ usage: data ?? [], note: "gross includes 25% cut" });
  } catch (error) {
    return dbFail("vcw/gateway/usage", error, "Unable to load usage.");
  }
}
