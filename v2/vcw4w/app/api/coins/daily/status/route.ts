import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import { dbFail, fail, ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";

function utcDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function nextUtcMidnightMs(): number {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 5));
  return next.getTime() - now.getTime();
}

/**
 * Daily-bonus availability probe (read-only, cheapest possible DB op).
 *
 * Cost note: this is ONE indexed PK lookup on public.daily_claims
 * (RLS daily_own permits own-row SELECT). Clients must call it at most
 * once per page load and then wait for the next UTC midnight client-side
 * (see DailyBonusBanner) — never poll it hourly. A short private
 * max-age=60 lets rapid navigations reuse the browser cache without ever
 * serving a stale "available" across midnight (the client re-checks on
 * focus when the UTC date has rolled).
 */
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const throttle = rateLimit(`daily-status:${data.user.id}`, 30, 60_000);
  if (!throttle.allowed) {
    return fail("Too many attempts. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  const { data: row, error } = await supabase
    .from("daily_claims")
    .select("last_claim_date,streak")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (error) return dbFail("api/coins/daily/status", error);
  const today = utcDateString(new Date());
  const lastClaimDate = (row as { last_claim_date?: string; streak?: number } | null)?.last_claim_date ?? null;
  const streak = Number((row as { streak?: number } | null)?.streak ?? 0) || 0;
  const available = !lastClaimDate || lastClaimDate !== today;
  let nextAward = 5;
  if (!available) {
    nextAward = 0;
  } else if (lastClaimDate) {
    const yester = utcDateString(new Date(Date.now() - 86_400_000));
    nextAward = lastClaimDate === yester ? Math.min(5 + streak, 12) : 5;
  }
  return ok(
    { available, lastClaimDate, streak, today, nextAward, retryAfterMs: nextUtcMidnightMs() },
    200,
    { "Cache-Control": "private, max-age=60" },
  );
}
