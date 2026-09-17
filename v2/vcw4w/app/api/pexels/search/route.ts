import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { acctBucketKey, globalBucket, throttleHeaders } from "@/lib/abuse-limit";
import { checkAuthenticatedVendorEligibility } from "@/lib/vendor-eligibility";
import {
  PEXELS_ABUSE_SCOPE,
  PEXELS_CREDIT_NOTE,
  PEXELS_DAILY_LIMIT,
  PEXELS_DAILY_WINDOW_SECS,
  PEXELS_MINUTE_LIMIT,
  cleanPexelsColor,
  cleanPexelsLocale,
  cleanPexelsPage,
  cleanPexelsPerPage,
  cleanPexelsQuery,
  isPexelsKind,
  isPexelsOrientation,
  isPexelsSize,
  isValidPexelsQuery,
  normalizePexelsPayload,
  pexelsApiBase,
  pexelsConfigured,
  pexelsKey,
  pexelsSearchPath,
  type PexelsOrientation,
  type PexelsSize,
} from "@/lib/pexels";


/**
 * GET /api/pexels/search?type=image|video&query=...&page=&per_page=
 *     &orientation=&size=&color=&locale=
 * Proxy a royalty-free stock search through the server key. Free: 0 coins,
 * no metering, no wallet touch. Requires sign-in (protects the server key
 * from anonymous draining) + per-user rate limit. Without PEXELS_API_KEY
 * returns honest configured:false with no results, never faked.
 */
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required. Sign in to search free stock; the /stock browser UI is free to open without login.", 401);
  const vendorAge = await checkAuthenticatedVendorEligibility(supabase, data.user.id, "pexels");
  if (!vendorAge.allowed) return fail(vendorAge.reason, 403);
  // Layer 1: fast per-instance memory bucket. Layer 2: shared Postgres bucket
  // (survives serverless scale-out). Deny if EITHER denies; a null shared
  // verdict means the store is unreachable, so fall back to layer 1.
  const rl = rateLimit(`pexels:search:${data.user.id}`, PEXELS_MINUTE_LIMIT, 60_000);
  if (!rl.allowed) return fail("Rate limited. Slow down a touch - stock isn't going anywhere.", 429, rateLimitHeaders(rl));
  const daily = await globalBucket(acctBucketKey(PEXELS_ABUSE_SCOPE, data.user.id), PEXELS_DAILY_LIMIT, PEXELS_DAILY_WINDOW_SECS);
  if (daily && !daily.allowed) {
    return fail(`Daily free-stock quota used (${PEXELS_DAILY_LIMIT}/day keeps our shared Pexels key alive for everyone). Back tomorrow - still 0 coins.`, 429, throttleHeaders(daily.retryAfter));
  }

  const q = new URL(req.url).searchParams;
  const typeRaw = String(q.get("type") ?? "image");
  if (!isPexelsKind(typeRaw)) return fail("Invalid type. Use type=image or type=video.", 400);

  const query = cleanPexelsQuery(q.get("query") ?? "");
  if (!isValidPexelsQuery(query)) return fail("Give me at least 2 letters or digits to search with - punctuation soup finds nothing.", 400);

  const page = cleanPexelsPage(q.get("page"));
  const perPage = cleanPexelsPerPage(q.get("per_page") ?? q.get("perPage"));

  const orientationRaw = String(q.get("orientation") ?? "");
  const orientation: PexelsOrientation | undefined = isPexelsOrientation(orientationRaw)
    ? orientationRaw
    : undefined;
  if (orientationRaw && !orientation) return fail("Invalid orientation. Use landscape, portrait, or square.", 400);

  const sizeRaw = String(q.get("size") ?? "");
  const size: PexelsSize | undefined = isPexelsSize(sizeRaw) ? sizeRaw : undefined;
  if (sizeRaw && !size) return fail("Invalid size. Use small, medium, or large.", 400);

  const color = cleanPexelsColor(q.get("color") ?? "");
  if (q.get("color") && !color) return fail("Invalid color. Use a color name or #rrggbb hex.", 400);
  const locale = cleanPexelsLocale(q.get("locale") ?? "");

  if (!pexelsConfigured()) {
    return ok({
      configured: false,
      kind: typeRaw,
      query,
      items: [],
      total: 0,
      page,
      perPage,
      costCoins: 0,
      note: PEXELS_CREDIT_NOTE,
      hint: "Set PEXELS_API_KEY on the server (free at pexels.com/api) to enable live stock search.",
    });
  }

  const path = pexelsSearchPath({
    kind: typeRaw,
    query,
    page,
    perPage,
    orientation,
    size,
    color: color || undefined,
    locale: locale || undefined,
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${pexelsApiBase()}${path}`, {
      signal: controller.signal,
      headers: { Authorization: pexelsKey(), Accept: "application/json" },
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        console.error(`[api/pexels/search] Pexels rejected the server key (HTTP ${res.status}).`);
        return fail("Pexels rejected the server key (HTTP 401/403). Re-issue PEXELS_API_KEY at pexels.com/api and update the server env.", 502);
      }
      if (res.status === 429) return fail("Pexels rate limit hit. Wait a minute and try again.", 502);
      return fail(`Pexels search HTTP ${res.status}.`, 502);
    }
    const payload = (await res.json()) as Record<string, unknown>;
    const { items, total } = normalizePexelsPayload(typeRaw, payload);
    return ok({
      configured: true,
      kind: typeRaw,
      query,
      items,
      total,
      page,
      perPage,
      costCoins: 0,
      note: PEXELS_CREDIT_NOTE,
    });
  } catch (error) {
    console.error("[api/pexels/search] provider fetch failed", String(error instanceof Error ? error.message : error).slice(0, 200));
    return fail("Pexels search failed. Try again shortly.", 502);
  } finally {
    clearTimeout(timer);
  }
}
