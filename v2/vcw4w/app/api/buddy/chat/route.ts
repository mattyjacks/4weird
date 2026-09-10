import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";
import {
  buddySystemPrompt,
  buddyUserPrompt,
  estimateBuddyTurn,
  fallbackReply,
  observeScreen,
} from "@/lib/buddy-engine";
import { cleanBuddyVoice } from "@/lib/game-ai";

export const dynamic = "force-dynamic";

/**
 * POST /api/buddy/chat — one Gaming Buddy turn reusing the VibeCodeWorker
 * loop (OBSERVE -> REASON -> ACT -> METER).
 * Body: { game_slug?, game_title?, screen_text?, score?, voice?, session_id? }.
 * With OPENAI_API_KEY set the REASON step calls chat-completions; without it
 * the route fail-opens with a local fallback line (like Luna moderation) and
 * still meters a minimal 1-coin heartbeat so /my/usage stays truthful.
 * Every turn meters buddy-chat (+ buddy-tts estimate) with the 25% cut.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`buddy:chat:${data.user.id}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const obs = observeScreen({
    gameSlug: input.game_slug ?? input.game,
    gameTitle: input.game_title ?? input.title,
    screenText: input.screen_text ?? input.screen,
    score: input.score,
    voice: input.voice,
  });
  const sessionRaw = input.session_id ?? input.sessionId ?? null;
  if (sessionRaw !== null && !isUuid(sessionRaw)) return fail("Invalid session_id.", 400);
  const voice = cleanBuddyVoice(obs.voice);

  const key = process.env.OPENAI_API_KEY ?? "";
  const model = process.env.BUDDY_MODEL ?? "gpt-4o-mini";
  let reply = "";
  let fallback = false;
  if (key) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15_000);
      let res: Response;
      try {
        res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model,
            temperature: 0.8,
            max_tokens: 120,
            messages: [
              { role: "system", content: buddySystemPrompt(voice) },
              { role: "user", content: buddyUserPrompt(obs) },
            ],
          }),
        });
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) throw new Error(`chat HTTP ${res.status}`);
      const out = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      reply = String(out?.choices?.[0]?.message?.content ?? "").trim().slice(0, 600);
      if (!reply) throw new Error("empty reply");
    } catch (err) {
      console.error("[buddy] chat failed, using fallback:", err);
      reply = fallbackReply(obs);
      fallback = true;
    }
  } else {
    reply = fallbackReply(obs);
    fallback = true;
  }

  const est = estimateBuddyTurn(reply);
  // Meter the turn: chat tokens + spoken chars, same 25% cut included.
  const chatQty = Math.max(0.2, (buddyUserPrompt(obs).length + reply.length) / 4000);
  const ttsQty = Math.max(0.1, reply.length / 1000);
  let metered: unknown = null;
  const { data: chatRow, error: chatErr } = await supabase.rpc("meter_game_ai_usage", {
    p_game: obs.gameSlug,
    p_kind: "buddy-chat",
    p_qty: chatQty,
    p_session: sessionRaw,
    p_source: "chat",
  });
  if (!chatErr) {
    metered = chatRow;
    const { data: ttsRow } = await supabase.rpc("meter_game_ai_usage", {
      p_game: obs.gameSlug,
      p_kind: "buddy-tts",
      p_qty: ttsQty,
      p_session: sessionRaw,
      p_source: "chat",
    });
    if (ttsRow) metered = { chat: chatRow, tts: ttsRow };
  }
  return ok({
    reply,
    voice,
    fallback,
    estimate: est,
    metered,
    note: "Buddy turns meter in Vibe Coins with the 25% cut included — see /my/usage.",
  });
}
