import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";
import { rpcStatus } from "@/lib/agent-market";
import {
  buddySystemPrompt,
  buddyUserPrompt,
  cleanScreenImage,
  estimateBuddyTurn,
  fallbackReply,
  observeScreen,
} from "@/lib/buddy-engine";
import { cleanBuddyVoice, formatBuddyCost, quoteBuddyChatLeg } from "@/lib/game-ai";

export const dynamic = "force-dynamic";

/**
 * POST /api/buddy/chat — one Gaming Buddy turn reusing the VibeCodeWorker
 * loop (OBSERVE -> REASON -> ACT -> METER).
 * Body: { game_slug?, game_title?, screen_text?, score?, voice?,
 *   session_id?, screen_image? }.
 * screen_image is an optional client-captured JPEG/PNG data URL (downscaled
 * snapshot from the user's explicit screen share). It is forwarded to the
 * model for this turn only — never stored, never logged — and billed as
 * image input tokens on the chat leg.
 * With OPENAI_API_KEY set the REASON step calls the Responses API; without it
 * the route returns a clearly-labelled local fallback at no cost.  Voice is
 * metered separately, only when /api/buddy/tts actually calls OpenAI.
 * Metering is true-cost: chat tokens + image tokens + one Supabase DB leg,
 * converted provider-USD -> gross Vibe Coins (25% cut INCLUDED), rounded to
 * the centicentcoin. The response carries the per-turn cost breakdown.
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
  const screenImage = cleanScreenImage(input.screen_image ?? input.screenImage);
  const obs = observeScreen({
    gameSlug: input.game_slug ?? input.game,
    gameTitle: input.game_title ?? input.title,
    screenText: input.screen_text ?? input.screen,
    score: input.score,
    voice: input.voice,
    hasScreenshot: screenImage !== null,
  });
  const sessionRaw = input.session_id ?? input.sessionId ?? null;
  if (sessionRaw !== null && !isUuid(sessionRaw)) return fail("Invalid session_id.", 400);
  const voice = cleanBuddyVoice(obs.voice);
  const promptText = buddyUserPrompt(obs);

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
        // With a snapshot, the Responses API takes structured content so the
        // model actually sees the screen; otherwise a plain text prompt.
        const apiInput = screenImage
          ? [
              {
                role: "user",
                content: [
                  { type: "input_text", text: promptText },
                  { type: "input_image", image_url: screenImage },
                ],
              },
            ]
          : promptText;
        res = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model,
            instructions: buddySystemPrompt(voice),
            input: apiInput,
            max_output_tokens: 120,
            store: false,
          }),
        });
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) throw new Error(`chat HTTP ${res.status}`);
      const out = (await res.json()) as {
        output_text?: string;
        output?: { type?: string; content?: { type?: string; text?: string }[] }[];
      };
      // The REST Responses payload carries text in output[].content[];
      // output_text is an SDK convenience property and may be absent here.
      const responseText = (out.output ?? [])
        .flatMap((item) => item.type === "message" ? item.content ?? [] : [])
        .filter((part) => part.type === "output_text")
        .map((part) => part.text ?? "")
        .join("");
      reply = String(responseText || out.output_text || "").trim().slice(0, 600);
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
      cost: null,
      metered: null,
      note: "AI is unavailable, so this local Buddy reply is free.",
    });
  }
  // Meter the chat leg at TRUE cost (chat tokens + image tokens + DB leg).
  // The RPC prices buddy-chat at 3 coins per qty unit, so derive qty from
  // the true-cost gross — the ledger lands on the accurate figure.
  const cost = quoteBuddyChatLeg({
    promptChars: promptText.length,
    replyChars: reply.length,
    hasScreenshot: screenImage !== null,
  });
  let metered: unknown = null;
  try {
    const { data: chatRow, error: chatErr } = await supabase.rpc("meter_game_ai_usage", {
      p_game: obs.gameSlug,
      p_kind: "buddy-chat",
      p_qty: cost.rpcQty,
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
    cost: {
      grossCoins: cost.grossCoins,
      grossCenticentcoins: cost.grossCenticentcoins,
      cut: cost.cut,
      provider: cost.provider,
      usdProvider: cost.usdProvider,
      usdGross: cost.usdGross,
      parts: cost.parts,
      display: formatBuddyCost(cost),
    },
    metered,
    note: "Buddy turns meter in Vibe Coins with the 25% cut included — see /my/usage.",
  });
}
