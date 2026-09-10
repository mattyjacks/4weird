import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";
import { cleanBuddyVoice, cleanBuddySpeed, isBuddyModel, quoteGameAi } from "@/lib/game-ai";

export const dynamic = "force-dynamic";

function cleanText(value: unknown): string {
  return String(value ?? "").slice(0, 2000);
}

/**
 * POST /api/buddy/tts — speak text in any of the 9 OpenAI voices.
 * Body: { text, voice?, model?, speed?, game_slug?, session_id? }.
 * With OPENAI_API_KEY set this proxies tts-1 / tts-1-hd and returns base64
 * mp3; without it returns { fallback: true } so the widget uses browser
 * speechSynthesis. Either way the chars are metered as buddy-tts (25% cut).
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`buddy:tts:${data.user.id}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const text = cleanText(input.text);
  if (text.length < 1) return fail("Text is required.", 400);
  const voice = cleanBuddyVoice(input.voice);
  const model = isBuddyModel(input.model) ? String(input.model) : "tts-1";
  const speed = cleanBuddySpeed(input.speed);
  const game = /^[a-z0-9-]{1,64}$/.test(String(input.game_slug ?? "lobby")) ? String(input.game_slug) : "lobby";
  const sessionRaw = input.session_id ?? input.sessionId ?? null;
  if (sessionRaw !== null && !isUuid(sessionRaw)) return fail("Invalid session_id.", 400);

  const qty = Math.max(0.1, text.length / 1000);
  const gross = quoteGameAi("buddy-tts", qty);
  const { data: metered } = await supabase.rpc("meter_game_ai_usage", {
    p_game: game,
    p_kind: "buddy-tts",
    p_qty: qty,
    p_session: sessionRaw,
    p_source: "tts",
  });

  const key = process.env.OPENAI_API_KEY ?? "";
  if (!key) {
    return ok({ fallback: true, voice, model, speed, gross, metered });
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    let res: Response;
    try {
      res = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, voice, input: text.slice(0, 2000), speed, response_format: "mp3" }),
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new Error(`tts HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 2_000_000) throw new Error("tts too large");
    return ok({ fallback: false, voice, model, speed, gross, metered, audio: buf.toString("base64"), mime: "audio/mpeg" });
  } catch (err) {
    console.error("[buddy] tts failed, client should use speechSynthesis:", err);
    return ok({ fallback: true, voice, model, speed, gross, metered });
  }
}
