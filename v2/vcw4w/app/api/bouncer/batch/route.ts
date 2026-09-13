import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { resolveBouncerKey, verifySingleEmail, type BouncerResult } from "@/lib/bouncer";
import { isCreditsExhausted, isNotConfigured, parseTimeout, unknownResult } from "../check/route";

// POST /api/bouncer/batch
// Body: { emails: string[] (max 50, deduped + lowercased), timeout? }
//   -> { success, results[], count }
// Upstream calls run SEQUENTIALLY (never Promise.all fan-out) so one batch
// cannot burst the vendor quota; each email is fail-open on its own.
// A 402 anywhere aborts the batch: credits are exhausted for all of it.

const MAX_BATCH = 50;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`bouncer-batch:${u.id}`, 10, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429, rateLimitHeaders(throttle));
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  if (!Array.isArray(input.emails) || input.emails.length === 0) {
    return fail("emails must be a non-empty array.", 400);
  }
  if (input.emails.length > MAX_BATCH) {
    return fail(`Maximum ${MAX_BATCH} emails per batch.`, 400);
  }
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const raw of input.emails) {
    const email = String(raw ?? "").trim().toLowerCase().slice(0, 160);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  if (emails.length === 0) return fail("No valid emails provided.", 400);
  const { data: membership, error: memberError } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", u.id)
    .limit(1);
  if (memberError) return fail("Unable to verify org membership.", 500);
  if (!membership || membership.length === 0) return fail("Not a member of any org.", 403);
  const apiKey = resolveBouncerKey();
  if (!apiKey) return fail("Bouncer is not configured.", 503);
  const timeout = parseTimeout(input.timeout);
  const results: BouncerResult[] = [];
  for (const email of emails) {
    if (!EMAIL_RE.test(email)) {
      results.push(unknownResult(email, "invalid-email"));
      continue;
    }
    try {
      results.push(await verifySingleEmail(email, apiKey, timeout));
    } catch (e) {
      if (isCreditsExhausted(e)) return fail("Bouncer credits exhausted.", 402);
      if (isNotConfigured(e)) return fail("Bouncer is not configured.", 503);
      results.push(unknownResult(email, "lookup-failed"));
    }
  }
  return ok({ results, count: results.length });
}
