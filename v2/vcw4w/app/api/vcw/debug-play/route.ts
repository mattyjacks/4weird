import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/csrf";
import { clientIp } from "@/lib/validate";
import { resolveVcwCaller, vcwWriteScope } from "@/lib/vcw-gateway-auth";
import { checkAuthenticatedVendorEligibility } from "@/lib/vendor-eligibility";
import {
  DEBUG_PLAY_LOOP_WINDOW,
  DEBUG_PLAY_MAX_FRAME_CHARS,
  analyzeGameFrameWithAI,
  checkLoopGuard,
  createLoopGuard,
  emitFixAvailable,
  heuristicAnalysis,
  type LoopGuardState,
} from "@/lib/vcw-debug-play";


/**
 * POST /api/vcw/debug-play — DebugPlay frame analyzer (Remastery §3.3).
 *
 * Accepts one game frame, returns `{ bugs, nextInput }`. Fail-open on the
 * AI path — a well-formed response is returned even with no OpenRouter key
 * (heuristic fallback inside analyzeGameFrameWithAI).
 *
 * Auth: vcw write scope (session, bot key, or `vcw_live_` gateway key;
 * same-origin gated for cookie sessions). Every call meters one
 * `action-step` (vcw source) BEFORE the OpenRouter call, so AI spend is
 * never free; insufficient balance fails closed with 402. Per-IP throttle
 * is kept alongside the per-caller throttle.
 *
 * Body: {
 *   frame: string (data-URL or raw base64, required),
 *   gameSlug?: string,
 *   codeSnippet?: string,
 *   frameHash?: string,
 *   timestampSeconds?: number,
 *   recentDecisions?: string[]  // prior nextInput values for the loop guard
 * }
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const caller = await resolveVcwCaller(req);
  if (!caller) return fail("Authentication required.", 401);
  if (!vcwWriteScope(caller)) return fail("Write scope required.", 403);
  if (caller.mode === "session" && !sameOrigin(req)) return fail("Invalid request origin.", 403);
  const vendorAge = await checkAuthenticatedVendorEligibility(serviceClient(), caller.userId, "openrouter");
  if (!vendorAge.allowed) return fail(vendorAge.reason, 403);
  // Per-IP throttle (kept: each call can spend OpenRouter budget) plus a
  // per-caller throttle so one credential cannot exhaust the shared window.
  const rl = rateLimit(`vcw:debug-play:${clientIp(req)}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const callerRl = rateLimit(`vcw:debug-play:caller:${caller.keyId ?? caller.userId}`, 20, 60_000);
  if (!callerRl.allowed) return fail("Rate limited.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;

  const frame = typeof input.frame === "string" ? input.frame : "";
  if (!frame) return fail("A frame is required (data-URL or base64).", 400);
  if (frame.length > DEBUG_PLAY_MAX_FRAME_CHARS) {
    return fail("Frame too large. Downsample to 640x360 before sending.", 413);
  }

  const gameSlug =
    typeof input.gameSlug === "string" && /^[a-z0-9-]{1,64}$/.test(input.gameSlug.trim())
      ? input.gameSlug.trim()
      : "unknown-game";
  const codeSnippet =
    typeof input.codeSnippet === "string" ? input.codeSnippet.slice(0, 8000) : undefined;
  const frameHash =
    typeof input.frameHash === "string" && input.frameHash ? input.frameHash.slice(0, 128) : null;
  const timestampSeconds =
    typeof input.timestampSeconds === "number" && Number.isFinite(input.timestampSeconds)
      ? Math.max(0, input.timestampSeconds)
      : 0;

  // Rebuild loop-guard state from the caller's recent decisions (stateless).
  let guard: LoopGuardState = createLoopGuard();
  const recent = Array.isArray(input.recentDecisions)
    ? (input.recentDecisions as unknown[]).filter((d): d is string => typeof d === "string")
    : [];
  for (const d of recent.slice(-DEBUG_PLAY_LOOP_WINDOW)) {
    guard = checkLoopGuard(guard, d, null).state;
  }
  // Seed the previous frame hash so a repeated frame trips the guard.
  if (recent.length > 0 && frameHash) {
    guard = { ...guard, frameHash };
  }

  // Meter one action-step BEFORE the OpenRouter call — an uncharged AI
  // analysis must never exist. Session callers meter via meter_vcw_usage()
  // (auth.uid); key callers (bot/gateway, no session) meter via
  // meter_vcw_usage_for(p_user, ...) through service_role. Insufficient
  // funds fails closed with 402; every other meter fault fails closed too.
  // The heuristic fallback inside analyzeGameFrameWithAI is preserved.
  try {
    if (caller.mode === "session") {
      const meterClient = await createClient();
      const { error: meterError } = await meterClient.rpc("meter_vcw_usage", {
        p_op: "action-step",
        p_qty: 1,
        p_run: null,
        p_source: "vcw",
      });
      if (meterError) {
        const message = String(
          (meterError as { message?: unknown } | null)?.message ?? meterError ?? "",
        );
        if (/insufficient|balance|funds/i.test(message)) {
          return fail("Insufficient Vibe Coin balance.", 402);
        }
        return dbFail("vcw/debug-play meter", meterError, "Unable to meter the analysis.");
      }
    } else {
      const db = serviceClient();
      const { error: meterError } = await db.rpc("meter_vcw_usage_for", {
        p_user: caller.userId,
        p_op: "action-step",
        p_qty: 1,
        p_run: null,
        p_source: "vcw",
      });
      if (meterError) {
        const message = String(
          (meterError as { message?: unknown } | null)?.message ?? meterError ?? "",
        );
        if (/insufficient|balance|funds/i.test(message)) {
          return fail("Insufficient Vibe Coin balance.", 402);
        }
        return dbFail("vcw/debug-play meter", meterError, "Unable to meter the analysis.");
      }
    }
  } catch (error) {
    return dbFail("vcw/debug-play meter", error, "Unable to meter the analysis.");
  }

  const analysis = await analyzeGameFrameWithAI(frame, gameSlug, codeSnippet, {
    timestampSeconds,
  });

  // Apply the loop guard to the fresh decision; on stuck, flip to the
  // heuristic recovery input and surface the soft-lock warning.
  const guardResult = checkLoopGuard(guard, analysis.nextInput, frameHash);
  if (guardResult.stuck) {
    const fallback = heuristicAnalysis(
      frame,
      gameSlug,
      timestampSeconds,
      true,
      analysis.nextInput,
    );
    return ok({
      bugs: [...analysis.bugs, ...fallback.bugs],
      nextInput: fallback.nextInput,
      source: analysis.source,
      stuck: true,
    });
  }

  // Publish fix events for AI-suggested diffs; fail-open when no bus exists.
  for (const bug of analysis.bugs) {
    if (bug.suggestedFixDiff) {
      emitFixAvailable({
        code: "fix-available",
        bugId: bug.id,
        gameSlug,
        diff: bug.suggestedFixDiff,
      });
    }
  }

  return ok({
    bugs: analysis.bugs,
    nextInput: analysis.nextInput,
    source: analysis.source,
    stuck: false,
  });
}
