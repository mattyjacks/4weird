import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import {
  BOUNCER_TIMEOUT_DEFAULT,
  resolveBouncerKey,
  verifySingleEmail,
  type BouncerResult,
} from "@/lib/bouncer";

// POST /api/bouncer/check
// Body: { email, timeout? } -> { success, result }
// Upstream shape comes from @/lib/bouncer (verifySingleEmail); this route
// only owns auth + membership + rateLimit + normalization of outcomes:
//   - missing key        -> 503 not-configured
//   - upstream HTTP 402  -> 402 "Bouncer credits exhausted."
//   - any other failure  -> fail-open { status: "unknown" }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIMEOUT_MIN = 1;
const TIMEOUT_MAX = 120;

export function parseTimeout(v: unknown): number {
  const n = Number(v ?? BOUNCER_TIMEOUT_DEFAULT);
  if (!Number.isFinite(n)) return BOUNCER_TIMEOUT_DEFAULT;
  return Math.min(TIMEOUT_MAX, Math.max(TIMEOUT_MIN, Math.floor(n)));
}

/** Fail-open placeholder when a lookup cannot complete. */
export function unknownResult(email: string, reason: string): BouncerResult {
  return {
    email,
    status: "unknown",
    reason: String(reason).slice(0, 160),
    score: 0,
    toxicity: 0,
    toxic: false,
    domainName: "",
    isAcceptAll: false,
    isDisposable: false,
    isFree: false,
    isRole: false,
    provider: "",
    isSpamTrapRisk: false,
    riskLevel: "medium",
  };
}

export function isCreditsExhausted(e: unknown): boolean {
  return e instanceof Error && /HTTP 402/.test(e.message);
}

export function isNotConfigured(e: unknown): boolean {
  return e instanceof Error && /not configured/i.test(e.message);
}

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`bouncer-check:${u.id}`, 60, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429, rateLimitHeaders(throttle));
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const email = String(input.email ?? "").trim().toLowerCase().slice(0, 160);
  if (!email || !EMAIL_RE.test(email)) return fail("Invalid email.", 400);
  const timeout = parseTimeout(input.timeout);
  const { data: membership, error: memberError } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", u.id)
    .limit(1);
  if (memberError) return fail("Unable to verify org membership.", 500);
  if (!membership || membership.length === 0) return fail("Not a member of any org.", 403);
  const apiKey = resolveBouncerKey();
  if (!apiKey) return fail("Bouncer is not configured.", 503);
  try {
    const result = await verifySingleEmail(email, apiKey, timeout);
    return ok({ result });
  } catch (e) {
    if (isCreditsExhausted(e)) return fail("Bouncer credits exhausted.", 402);
    if (isNotConfigured(e)) return fail("Bouncer is not configured.", 503);
    return ok({ result: unknownResult(email, "lookup-failed") });
  }
}
