import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { acctBucketKey, globalBucket, throttleHeaders } from "@/lib/abuse-limit";
import {
  PEXELS_ABUSE_SCOPE,
  PEXELS_CREDIT_NOTE,
  PEXELS_DAILY_LIMIT,
  PEXELS_DAILY_WINDOW_SECS,
  PEXELS_MINUTE_LIMIT,
  cleanPexelsPage,
  cleanPexelsPerPage,
  isPexelsKind,
  normalizePexelsPayload,
  pexelsApiBase,
  pexelsConfigured,
  pexelsCuratedPath,
  pexelsKey,
} from "@/lib/pexels";


/**
 * GET /api/pexels/curated?type=image|video&page=&per_page=
 * Curated photos (images) or popular videos, no query needed. Same rules
 * as search: sign-in + rate limit, 0 coins, honest configured:false
 * without PEXELS_API_KEY, never faked.
 */
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required. Sign in to browse free stock.", 401);
  // Layered buckets, same as search: memory first, shared Postgres second.
  const rl = rateLimit(`pexels:curated:${data.user.id}`, PEXELS_MINUTE_LIMIT, 60_000);
  if (!rl.allowed) return fail("Rate limited. Slow down a touch - stock isn't going anywhere.", 429, rateLimitHeaders(rl));
  const daily = await globalBucket(acctBucketKey(PEXELS_ABUSE_SCOPE, data.user.id), PEXELS_DAILY_LIMIT, PEXELS_DAILY_WINDOW_SECS);
  if (daily && !daily.allowed) {
    return fail(`Daily free-stock quota used (${PEXELS_DAILY_LIMIT}/day keeps our shared Pexels key alive for everyone). Back tomorrow - still 0 coins.`, 429, throttleHeaders(daily.retryAfter));
  }

  const q = new URL(req.url).searchParams;
  const typeRaw = String(q.get("type") ?? "image");
  if (!isPexelsKind(typeRaw)) return fail("Invalid type. Use type=image or type=video.", 400);
  const page = cleanPexelsPage(q.get("page"));
  const perPage = cleanPexelsPerPage(q.get("per_page") ?? q.get("perPage"));

  if (!pexelsConfigured()) {
    return ok({
      configured: false,
      kind: typeRaw,
      items: [],
      total: 0,
      page,
      perPage,
      costCoins: 0,
      note: PEXELS_CREDIT_NOTE,
      hint: "Set PEXELS_API_KEY on the server (free at pexels.com/api) to enable live stock browsing.",
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(
      `${pexelsApiBase()}${pexelsCuratedPath(typeRaw, page, perPage)}`,
      {
        signal: controller.signal,
        headers: { Authorization: pexelsKey(), Accept: "application/json" },
      },
    );
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        console.error(`[api/pexels/curated] Pexels rejected the server key (HTTP ${res.status}).`);
        return fail("Pexels rejected the server key (HTTP 401/403). Re-issue PEXELS_API_KEY at pexels.com/api and update the server env.", 502);
      }
      if (res.status === 429) return fail("Pexels rate limit hit. Wait a minute and try again.", 502);
      return fail(`Pexels browse HTTP ${res.status}.`, 502);
    }
    const payload = (await res.json()) as Record<string, unknown>;
    const { items, total } = normalizePexelsPayload(typeRaw, payload);
    return ok({
      configured: true,
      kind: typeRaw,
      items,
      total,
      page,
      perPage,
      costCoins: 0,
      note: PEXELS_CREDIT_NOTE,
    });
  } catch (error) {
    console.error("[api/pexels/curated] provider fetch failed", String(error instanceof Error ? error.message : error).slice(0, 200));
    return fail("Pexels browse failed. Try again shortly.", 502);
  } finally {
    clearTimeout(timer);
  }
}
