import { checkAuthenticatedVendorEligibility } from "@/lib/vendor-eligibility";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { BOUNCER_TIMEOUT_DEFAULT, resolveBouncerKey } from "@/lib/bouncer";

// GET /api/bouncer/status
// -> { success, configured, timeoutDefault, rateLimitPerMin }
// Never leaks the key — only a boolean.

const CHECK_RATE_LIMIT_PER_MIN = 60;

export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const vendorAge = await checkAuthenticatedVendorEligibility(supabase, u.id, "bouncer");
  if (!vendorAge.allowed) return fail(vendorAge.reason, 403);
  const throttle = rateLimit(`bouncer-status:${u.id}`, 60, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429, rateLimitHeaders(throttle));
  const { data: membership, error: memberError } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", u.id)
    .limit(1);
  if (memberError) return fail("Unable to verify org membership.", 500);
  if (!membership || membership.length === 0) return fail("Not a member of any org.", 403);
  return ok({
    configured: resolveBouncerKey().length > 0,
    timeoutDefault: BOUNCER_TIMEOUT_DEFAULT,
    rateLimitPerMin: CHECK_RATE_LIMIT_PER_MIN,
  });
}
