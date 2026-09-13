import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";


// GET /api/me/activity — the caller's own per-account audit log (age-band
// changes first), newest first, capped at 100. Login required; the RLS
// SELECT-own policy on profile_audit_log is the access boundary (one account
// can never read another's log). Parents checking a kid's account see every
// band change here with its timestamp.
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Authentication required.", 401);
  const throttle = rateLimit(`activity-get:${u.id}`, 60, 60_000);
  if (!throttle.allowed) {
    return fail("Too many activity reads. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  const { data: rows, error } = await supabase
    .from("profile_audit_log")
    .select("action,old_value,new_value,created_at")
    .eq("user_id", u.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    // The audit table ships in a later migration than the dashboard; a prod
    // DB that hasn't applied it yet (42P01 / PGRST205 / missing-table) should
    // read as "no recorded changes yet", not a 500 that blanks Vibe Coins
    // (the dashboard Promise.all fails as one). Real DB faults still 500.
    const code = String((error as { code?: unknown }).code ?? "");
    const msg = String((error as { message?: unknown }).message ?? "");
    if (code === "42P01" || code === "PGRST205" || /profile_audit_log.*(does not exist|could not find)/i.test(msg)) {
      console.error("[api] api/me/activity audit table missing, returning empty rows", { code: code.slice(0, 16) });
      return ok({ rows: [] });
    }
    return dbFail("api/me/activity", error, "Unable to load account activity.");
  }
  return ok({ rows: rows ?? [] });
}
