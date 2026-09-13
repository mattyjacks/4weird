import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";
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
 * Stateless visual-QA foundation: accepts one game frame, returns
 * `{ bugs, nextInput }`. Fail-open — a well-formed response is returned
 * even with no OpenRouter key (heuristic fallback). No auth/DB writes in
 * this slice; metering/auth wiring is a steward QUEUE item.
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
  // Stateless foundation (no session by steward QUEUE design, DS-REM-05):
  // throttle per IP — each call can spend OpenRouter budget. Still
  // force-dynamic + no-store.
  const rl = rateLimit(`vcw:debug-play:${clientIp(req)}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
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
