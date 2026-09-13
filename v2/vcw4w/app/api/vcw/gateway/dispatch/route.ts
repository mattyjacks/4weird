import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { acctBucketKey, globalBucket, throttleHeaders } from "@/lib/abuse-limit";
import { sameOrigin } from "@/lib/csrf";
import { gameSlugs } from "@/content/games";
import { cleanGameSlug } from "@/lib/vcw-runs";
import { isUuid } from "@/lib/validate";
import { resolveVcwCaller, vcwWriteScope } from "@/lib/vcw-gateway-auth";
import {
  hostedQuoteWithMarkup,
  quoteVcwGateway,
  vcwGatewaySplit,
  VCW_GATEWAY_MARKUP_HOSTED_PCT,
} from "@/lib/vcw-gateway";
import { decideRoute, redactSecrets } from "@/lib/vcw-byok";

export const dynamic = "force-dynamic";

const COMPUTES = ["cpu", "gpu", "gpu-boosted"] as const;
const MODES = ["hosted", "byok"] as const;

type QuoteSplit = { gross: number; cut: number; provider: number };

/**
 * POST /api/vcw/gateway/dispatch; quote + meter a Hybrid gateway run.
 *
 * Auth: vcw write scope (session, bot key, or `vcw_live_` gateway key).
 * sameOrigin applies to cookie-session callers only; key callers sign
 * with a secret instead.
 *
 * MVP honesty: no real worker is provisioned here, so the answer is
 * ALWAYS started:false with the quote, the meter result, and the manual
 * next step. Never a faked worker URL.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const caller = await resolveVcwCaller(req);
  if (!caller) return fail("Authentication required.", 401);
  if (!vcwWriteScope(caller)) return fail("Write scope required.", 403);
  if (caller.mode === "session" && !sameOrigin(req)) return fail("Invalid request origin.", 403);
  const rl = rateLimit(`vcw:gateway:dispatch:${caller.keyId ?? caller.userId}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const dispatchDist = await globalBucket(acctBucketKey("gw-dispatch-hour", caller.userId), 120, 3600);
  if (dispatchDist && !dispatchDist.allowed) {
    return fail("Rate limited.", 429, throttleHeaders(dispatchDist.retryAfter));
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const slug = cleanGameSlug(input.game_slug ?? input.gameSlug);
  if (!/^[a-z0-9-]{1,64}$/.test(slug) || !gameSlugs.includes(slug)) {
    return fail("Unknown game_slug. List targets via GET /api/vcw/games.", 400);
  }
  const compute = String(input.compute ?? "").toLowerCase();
  if (!(COMPUTES as readonly string[]).includes(compute)) {
    return fail("Invalid compute. Use cpu, gpu, or gpu-boosted.", 400);
  }
  const mode = String(input.mode ?? "").toLowerCase();
  if (!(MODES as readonly string[]).includes(mode)) {
    return fail("Invalid mode. Use hosted or byok.", 400);
  }
  const providerRaw = input.provider_id ?? input.providerId ?? null;
  let providerId: string | null = null;
  if (providerRaw !== null && providerRaw !== undefined && String(providerRaw) !== "") {
    if (!isUuid(providerRaw)) return fail("Invalid provider_id (uuid).", 400);
    providerId = String(providerRaw).toLowerCase();
  }
  const goal = String(input.goal ?? "").trim().slice(0, 500);
  if (!goal) return fail("A goal is required (1-500 chars).", 400);

  // BYOK iff the caller asked for it AND pinned a provider; else hosted.
  // The provider row must exist and belong to the caller (it is a FK target).
  if (providerId) {
    try {
      const db = serviceClient();
      const { data: provider, error: providerError } = await db
        .from("vcw_byok_providers")
        .select("id")
        .eq("id", providerId)
        .eq("user_id", caller.userId)
        .maybeSingle();
      if (providerError || !provider) return fail("Unknown provider_id.", 404);
    } catch (error) {
      return dbFail("vcw/gateway/dispatch provider", error, "Unable to check provider.");
    }
  }
  let routeName: "hosted" | "byok" = mode === "byok" && providerId ? "byok" : "hosted";
  try {
    const decided = decideRoute({ hasProvider: providerId !== null });
    if (decided === "hosted" || decided === "byok") routeName = decided;
  } catch {
    // keep the local fallback above
  }

  // Hosted carries the 15% markup over provider cost; BYOK bills the base
  // run-open gross (metered as byok-route at the provider, not here).
  let quote: QuoteSplit;
  try {
    const baseGross = quoteVcwGateway("run-open", 1);
    const gross =
      routeName === "byok" ? baseGross : hostedQuoteWithMarkup(baseGross, VCW_GATEWAY_MARKUP_HOSTED_PCT);
    quote = vcwGatewaySplit(gross);
  } catch {
    quote = { gross: 10, cut: 2.5, provider: 7.5 };
  }

  // Meter one run-open against the caller's coins. Hosted carries the 15%
  // markup, so it meters qty 1.15 (10 x 1.15 = the quoted 11.5 gross);
  // BYOK meters the base qty 1. Session callers meter via
  // meter_vcw_usage() (auth.uid); key callers (bot/gateway, no session)
  // meter via meter_vcw_usage_for(p_user, ...) through service_role.
  // Insufficient funds fails closed with 402; every other meter fault fails
  // closed too - an uncharged dispatch receipt must never exist.
  const meterQty = routeName === "byok" ? 1 : 1.15;
  try {
    if (caller.mode === "session") {
      const meterClient = await createClient();
      const { error: meterError } = await meterClient.rpc("meter_vcw_usage", {
        p_op: "run-open",
        p_qty: meterQty,
        p_run: null,
        p_source: "gateway",
      });
      if (meterError) {
        const message = String(
          (meterError as { message?: unknown } | null)?.message ?? meterError ?? "",
        );
        if (/insufficient|balance|funds/i.test(message)) {
          return fail("Insufficient Vibe Coin balance.", 402);
        }
        return dbFail("vcw/gateway/dispatch meter", meterError, "Unable to meter dispatch.");
      }
    } else {
      const db = serviceClient();
      const { error: meterError } = await db.rpc("meter_vcw_usage_for", {
        p_user: caller.userId,
        p_op: "run-open",
        p_qty: meterQty,
        p_run: null,
        p_source: "gateway",
      });
      if (meterError) {
        const message = String(
          (meterError as { message?: unknown } | null)?.message ?? meterError ?? "",
        );
        if (/insufficient|balance|funds/i.test(message)) {
          return fail("Insufficient Vibe Coin balance.", 402);
        }
        return dbFail("vcw/gateway/dispatch meter", meterError, "Unable to meter dispatch.");
      }
    }
  } catch (error) {
    return dbFail("vcw/gateway/dispatch meter", error, "Unable to meter dispatch.");
  }

  let dispatchId: string;
  try {
    const db = serviceClient();
    // vcw_dispatches.compute accepts cpu|gpu only: gpu-boosted is a quote
    // tier, stored as gpu (the requested tier stays in the redacted echo).
    // The table has no route column: mode stores the requested mode and the
    // decided route travels in the response. key_id references vcw_api_keys,
    // so only gateway key ids are stored (bot key ids live in bot_api_keys).
    const { data, error } = await db
      .from("vcw_dispatches")
      .insert({
        user_id: caller.userId,
        key_id: caller.mode === "gateway" ? caller.keyId : null,
        game_slug: slug,
        compute: compute === "gpu-boosted" ? "gpu" : compute,
        mode,
        provider_id: providerId,
        status: "quoted",
        quote_gross: quote.gross,
      })
      .select("id")
      .single();
    if (error) return dbFail("vcw/gateway/dispatch", error, "Unable to record dispatch.");
    const row = (data ?? {}) as { id?: unknown };
    if (typeof row.id !== "string") return fail("Unable to record dispatch.", 500);
    dispatchId = row.id;
  } catch (error) {
    return dbFail("vcw/gateway/dispatch", error, "Unable to record dispatch.");
  }

  let echo: Record<string, unknown> = {
    game_slug: slug,
    compute,
    mode,
    provider_id: providerId,
    goal,
  };
  try {
    echo = redactSecrets(echo) as Record<string, unknown>;
  } catch {
    // echo carries no secrets; keep it raw if redaction is unavailable.
  }

  return ok(
    {
      started: false,
      dispatch: { id: dispatchId, mode, route: routeName },
      quote: { gross: quote.gross, cut: quote.cut, provider: quote.provider },
      provision: {
        ok: false,
        code: "manual_provision",
        message:
          "Gateway MVP quotes + meters; worker provisioning is manual via /api/vcw/autoplay or RunPod console.",
      },
      input: echo,
      next: "POST /api/vcw/runs to open the playtest run",
    },
    201,
  );
}
