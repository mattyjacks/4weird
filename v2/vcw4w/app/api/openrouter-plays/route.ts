import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
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
 * POST /api/openrouter-plays — run one of the 25 OpenRouter plays.
 * Body: { playId: string, input?: string }.
 *
 * With OPENROUTER_API_KEY set it calls OpenRouter chat-completions
 * (15s timeout); without it — or on any upstream failure — it returns a
 * clearly-labelled offline fallback at no cost. No auth, no DB, so it
 * works the first time on a fresh clone. Rate-limited per IP.
 */
export async function POST(req: Request) {
  const rl = rateLimit("openrouter-plays", 30, 60_000);
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
      note: "Set OPENROUTER_API_KEY for live OpenRouter output — this offline reply is free.",
    });
  }

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
    return ok({
      playId: play.id,
      title: play.title,
      category: play.category,
      output,
      voiceBackend: play.voiceBackend,
      voiceId: play.voiceId,
      fallback: false,
      model: play.model,
    });
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
      note: "Live OpenRouter failed — this offline reply is free.",
    });
  }
}

/** GET /api/openrouter-plays — list the 25 play ids (no key needed). */
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
