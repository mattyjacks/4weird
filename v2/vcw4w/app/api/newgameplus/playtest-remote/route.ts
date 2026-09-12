import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { requireHuman } from "@/lib/botid";
import { rateLimit } from "@/lib/rate-limit";
import { rpcStatus } from "@/lib/agent-market";
import { NGP_PLAYTEST_SOURCE_MAX, ngpPlaytestConfigured, submitNgpPlaytest } from "@/lib/ngp-playtest";

export const dynamic = "force-dynamic";

/**
 * POST /api/newgameplus/playtest-remote { submission_id }
 *
 * Plays the SAVED draft on serverless Chromium (real browser: real canvas,
 * real rAF timing, real input) via the CPU playtest endpoint. Source is
 * loaded server-side from the caller's own code_submissions row — client
 * bytes are never trusted.
 *
 * Cost-smart: CPU workers scale to zero; one job runs ~10-30s and meters
 * worker-min (6 coins/min gross, 25% cut included) outside plan.spend.
 * Anything missing/slow degrades to 503 with the reason — local evidence
 * stays authoritative, never synthesized.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const botBlock = await requireHuman(req, "POST /api/newgameplus/playtest-remote", { allowAuthenticated: true });
  if (botBlock) return botBlock;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`newgameplus:playtest-remote:${auth.user.id}`, 10, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  const submissionId = String(input.submission_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(submissionId)) return fail("submission_id (your saved draft) is required.", 400);
  const { data: submission } = await supabase
    .from("code_submissions")
    .select("id,title,source")
    .eq("id", submissionId)
    .eq("owner_id", auth.user.id)
    .maybeSingle();
  const source = String((submission as { source?: unknown } | null)?.source ?? "");
  if (!submission || !source) return fail("Draft not found (or has no saved source) on your account.", 404);
  if (Buffer.byteLength(source, "utf8") > NGP_PLAYTEST_SOURCE_MAX) {
    return fail("Saved draft is over the 256KB playtest cap.", 413);
  }
  if (!ngpPlaytestConfigured()) {
    return fail("Serverless playtest is not configured (endpoint + key). Local evidence stands — retry later.", 503);
  }

  const quality = 5;
  const dispatched = await submitNgpPlaytest(source, quality);
  if (!dispatched.ok) {
    return fail(`Remote playtest unavailable (${dispatched.error}). Local evidence stands — retry or verify local.`, 503);
  }
  const { result } = dispatched;

  // Meter actual elapsed worker time (worker-min, 6 coins/min gross, 25%
  // cut included), outside plan.spend. Fail-closed like every coin move.
  const qty = Math.max(0.1, Math.round(((result.elapsedMs / 60000) + Number.EPSILON) * 10) / 10);
  const { error: meterError } = await supabase.rpc("meter_vcw_usage", {
    p_op: "worker-min",
    p_qty: qty,
    p_run: null,
    p_source: "api",
  });
  if (meterError) {
    const message = String((meterError as { message?: unknown } | null)?.message ?? meterError ?? "");
    if (/insufficient|balance|funds/i.test(message)) {
      return fail("Insufficient Vibe Coins for remote playtest. Top up and retry.", 402);
    }
    return rpcFail("newgameplus/playtest-remote meter", meterError, rpcStatus, "Unable to meter remote playtest.");
  }

  return ok(
    {
      verdict: result.verdict,
      checks: result.checks,
      hud: result.hud,
      frames: result.frames,
      errors: result.errors,
      provenance: "serverless-chromium",
      elapsedMs: result.elapsedMs,
      meteredMinutes: qty,
      screenshotPng: result.screenshotPng,
      note: "Played on serverless Chromium (real browser). Record it to the VCW ledger via ledger verify to keep it.",
    },
    200,
  );
}
