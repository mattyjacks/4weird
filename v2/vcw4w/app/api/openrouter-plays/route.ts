import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { requireHuman } from "@/lib/botid";
import { rateLimit } from "@/lib/rate-limit";
import { rpcStatus } from "@/lib/agent-market";
import { clientIp } from "@/lib/validate";
import {
  OPENROUTER_DEFAULT_MODEL,
  OPENROUTER_ENDPOINT,
  OPENROUTER_REFERER,
  OPENROUTER_TITLE,
  fallbackOpenRouterPlay,
  getPlay,
  isPlaceholderKey,
  parseOpenRouterText,
} from "@/lib/openrouter-plays";

export const dynamic = "force-dynamic";

/**
 * POST /api/openrouter-plays; run one of the 25 OpenRouter plays.
 * Body: { playId: string, input?: string }.
 *
 * Offline fallback (no key, placeholder key, or upstream failure) stays
 * free and anonymous so the route works the first time on a fresh clone.
 * The LIVE path burns the operator's paid OpenRouter key, so it requires a
 * signed-in human and meters 1 centicentcoin (the RPC floor; true cost is
 * ~half that) via game-AI inference. Anonymous callers can never spend the
 * operator's key.
 */
export async function POST(req: Request) {
  const rl = rateLimit(`openrouter-plays:${clientIp(req)}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const play = getPlay(input.playId ?? input.play ?? input.id);
  if (!play) return fail("Unknown playId. GET this route for the 25 play ids.", 400);
  const text = String(input.input ?? input.prompt ?? "").slice(0, 2000);

  const key = process.env.OPENROUTER_API_KEY ?? "";
  if (!key || isPlaceholderKey(key)) {
    return ok({
      playId: play.id,
      title: play.title,
      category: play.category,
      output: fallbackOpenRouterPlay(play, text),
      voiceBackend: play.voiceBackend,
      voiceId: play.voiceId,
      fallback: true,
      model: play.model,
      note: "Set OPENROUTER_API_KEY for live OpenRouter output; this offline reply is free.",
    });
  }

  // Live path: authenticated humans only, metered at the 1-centicentcoin
  // floor. Anonymous callers fall through to the free offline reply below
  // instead of spending the operator's key.
  if (!hasServerSupabase()) {
    return ok({
      playId: play.id,
      title: play.title,
      category: play.category,
      output: fallbackOpenRouterPlay(play, text),
      voiceBackend: play.voiceBackend,
      voiceId: play.voiceId,
      fallback: true,
      model: play.model,
      note: "Live OpenRouter needs a configured backend; this offline reply is free.",
    });
  }
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return ok({
      playId: play.id,
      title: play.title,
      category: play.category,
      output: fallbackOpenRouterPlay(play, text),
      voiceBackend: play.voiceBackend,
      voiceId: play.voiceId,
      fallback: true,
      model: play.model,
      note: "Sign in for live OpenRouter output; this offline reply is free.",
    });
  }
  const botBlock = await requireHuman(req, "POST /api/openrouter-plays");
  if (botBlock) return botBlock;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    let res: Response;
    try {
      res = await fetch(OPENROUTER_ENDPOINT, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          "HTTP-Referer": OPENROUTER_REFERER,
          "X-Title": OPENROUTER_TITLE,
        },
        body: JSON.stringify({
          model: play.model || OPENROUTER_DEFAULT_MODEL,
          messages: [
            { role: "system", content: play.system },
            { role: "user", content: play.userPrompt(text) },
          ],
          max_tokens: play.maxTokens,
          temperature: 0.8,
        }),
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new Error(`openrouter HTTP ${res.status}`);
    const payload = (await res.json()) as unknown;
    const output = parseOpenRouterText(payload).slice(0, 2000);
    if (!output) throw new Error("empty completion");
    // Debit the 1-centicentcoin floor for delivered output; a provider
    // failure below stays free. True cost is ~half a centicentcoin: the
    // 0.001 inference qty rounds the RPC to its 0.01 floor by construction
    // (6 x 0.00 after 2dp rounding, floored to 0.01).
    try {
      const { data: metered, error } = await supabase.rpc("meter_game_ai_usage", {
        p_game: "openrouter-plays",
        p_kind: "inference",
        p_qty: 0.001,
        p_session: null,
        p_source: "meter",
      });
      if (error) return rpcFail("api/openrouter-plays", error, rpcStatus, "Live reply ready but unable to meter; not charged.");
      return ok({
        playId: play.id,
        title: play.title,
        category: play.category,
        output,
        voiceBackend: play.voiceBackend,
        voiceId: play.voiceId,
        fallback: false,
        model: play.model,
        metered,
      });
    } catch (error) {
      return dbFail("api/openrouter-plays", error, "Live reply ready but unable to meter; not charged.");
    }
  } catch (err) {
    console.error("[openrouter-plays] live call failed, using fallback:", err);
    return ok({
      playId: play.id,
      title: play.title,
      category: play.category,
      output: fallbackOpenRouterPlay(play, text),
      voiceBackend: play.voiceBackend,
      voiceId: play.voiceId,
      fallback: true,
      model: play.model,
      note: "Live OpenRouter failed; this offline reply is free.",
    });
  }
}

/** GET /api/openrouter-plays; list the 25 play ids (no key needed). */
export async function GET() {
  const { OPENROUTER_PLAYS } = await import("@/lib/openrouter-plays");
  return ok({
    count: OPENROUTER_PLAYS.length,
    plays: OPENROUTER_PLAYS.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      blurb: p.blurb,
      voiceBackend: p.voiceBackend,
      voiceId: p.voiceId,
    })),
  });
}
