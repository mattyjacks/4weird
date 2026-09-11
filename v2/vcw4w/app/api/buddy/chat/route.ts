import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";
import { rpcStatus } from "@/lib/agent-market";
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
 * With OPENAI_API_KEY set the REASON step calls the Responses API; without it
 * the route returns a clearly-labelled local fallback at no cost.  Voice is
 * metered separately, only when /api/buddy/tts actually calls OpenAI.
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
        res = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model,
            instructions: buddySystemPrompt(voice),
            input: buddyUserPrompt(obs),
            max_output_tokens: 120,
            store: false,
          }),
        });
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) throw new Error(`chat HTTP ${res.status}`);
      const out = (await res.json()) as { output_text?: string };
      reply = String(out.output_text ?? "").trim().slice(0, 600);
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
  if (fallback) {
    return ok({
      reply,
      voice,
      fallback: true,
      estimate: { chatCoins: 0, ttsCoins: 0, gross: 0 },
      metered: null,
      note: "AI is unavailable, so this local Buddy reply is free.",
    });
  }
  // Meter only the chat leg. /api/buddy/tts meters voice after this response
  // and is the single source of truth for spoken-output charges.
  const chatQty = Math.max(0.2, (buddyUserPrompt(obs).length + reply.length) / 4000);
  let metered: unknown = null;
  try {
    const { data: chatRow, error: chatErr } = await supabase.rpc("meter_game_ai_usage", {
      p_game: obs.gameSlug,
      p_kind: "buddy-chat",
      p_qty: chatQty,
      p_session: sessionRaw,
      p_source: "chat",
    });
    if (chatErr) return rpcFail("api/buddy/chat:meter", chatErr, rpcStatus, "Unable to meter this turn.");
    metered = chatRow;
  } catch (error) {
    return dbFail("api/buddy/chat:meter", error, "Unable to meter this turn.");
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
