import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { requireHuman } from "@/lib/botid";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";
import { rpcStatus } from "@/lib/agent-market";
import {
  buildBuddyFalHint,
  cleanScreenImage,
  detectBuddyIntent,
  estimateBuddyTurn,
  fallbackReply,
  observeScreen,
  pickBuddyBrain,
  smartBuddySystemPrompt,
  smartBuddyUserPrompt,
  summarizeBuddyMemory,
  cleanBuddyHistory,
} from "@/lib/buddy-engine";
import { cleanBuddyVoice, formatBuddyCost, quoteBuddyChatLeg } from "@/lib/game-ai";
import { falConfigured } from "@/lib/fal";
import { OPENROUTER_ENDPOINT, OPENROUTER_REFERER, OPENROUTER_TITLE, parseOpenRouterText } from "@/lib/openrouter-plays";

export const dynamic = "force-dynamic";

/**
 * POST /api/buddy/chat; one Gaming Buddy turn reusing the VibeCodeWorker
 * loop (OBSERVE -> REASON -> ACT -> METER).
 * Body: { game_slug?, game_title?, screen_text?, score?, voice?,
 *   session_id?, screen_image?, message?, history?, brain? }.
 * screen_image is an optional client-captured JPEG/PNG data URL (downscaled
 * snapshot from the user's explicit screen share). It is forwarded to the
 * model for this turn only; never stored, never logged; and billed as
 * image input tokens on the chat leg.
 * message is an optional typed player question; history is an optional
 * array of { role: "user"|"buddy", text } (capped at 8 turns) that the
 * buddy remembers for this turn only; never stored server-side.
 * brain is optional: "auto" (default) | "openai" | "openrouter".
 *
 * REASON picks its brain by key: OPENAI_API_KEY -> Responses API
 * (existing behavior, preferred), else OPENROUTER_API_KEY ->
 * OpenRouter chat-completions. With neither key the route returns a
 * clearly-labelled local fallback at no cost. Voice is metered
 * separately, only when /api/buddy/tts actually calls OpenAI.
 * When Fal is configured (FAL_KEY) and the moment suits it, the reply
 * carries a falHint; a ready-to-fire /api/fal/generate payload that
 * costs nothing until the client uses it.
 * Metering is true-cost: chat tokens + image tokens + one Supabase DB leg,
 * converted provider-USD -> gross Vibe Coins (25% cut INCLUDED), rounded to
 * the centicentcoin. The response carries the per-turn cost breakdown.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const botBlock = await requireHuman(req, "POST /api/buddy/chat");
  if (botBlock) return botBlock;
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
  const cameraImage = cleanScreenImage(input.camera_image ?? input.cameraImage);
  const screenImage = cleanScreenImage(input.screen_image ?? input.screenImage) ?? cameraImage;
  const obs = observeScreen({
    gameSlug: input.game_slug ?? input.game,
    gameTitle: input.game_title ?? input.title,
    screenText: input.screen_text ?? input.screen,
    score: input.score,
    voice: input.voice,
    hasScreenshot: screenImage !== null,
    hasCamera: cameraImage !== null,
  });
  const sessionRaw = input.session_id ?? input.sessionId ?? null;
  if (sessionRaw !== null && !isUuid(sessionRaw)) return fail("Invalid session_id.", 400);
  const voice = cleanBuddyVoice(obs.voice);
  const history = cleanBuddyHistory(input.history);
  const message = String(input.message ?? "").replace(/\s+/g, " ").trim().slice(0, 500);
  const memory = summarizeBuddyMemory(history);
  const intent = detectBuddyIntent(`${message} ${obs.screenText}`);
  const systemPrompt = smartBuddySystemPrompt(voice, {
    gameTitle: obs.gameTitle,
    intent,
    memory,
    falAvailable: falConfigured(),
    hasCamera: obs.hasCamera,
  });
  const promptText = smartBuddyUserPrompt(obs, { history, message });

  const openaiKey = process.env.OPENAI_API_KEY ?? "";
  const openrouterKey = process.env.OPENROUTER_API_KEY ?? "";
  const openrouterModel = process.env.OPENROUTER_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct";
  const brain = pickBuddyBrain({ openaiKey, openrouterKey, requested: input.brain });
  const model = brain === "openrouter" ? openrouterModel : (process.env.BUDDY_MODEL ?? "gpt-4o-mini");
  let reply = "";
  let fallback = false;
  if (brain === "openai") {
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
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model,
            instructions: systemPrompt,
            input: apiInput,
            max_output_tokens: 150,
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
  } else if (brain === "openrouter") {
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
            Authorization: `Bearer ${openrouterKey}`,
            "HTTP-Referer": OPENROUTER_REFERER,
            "X-Title": OPENROUTER_TITLE,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: screenImage ? `${promptText}\n(Screenshot attached separately is not supported on this brain; described context above.)` : promptText },
            ],
            max_tokens: 150,
            temperature: 0.8,
          }),
        });
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) throw new Error(`openrouter HTTP ${res.status}`);
      reply = parseOpenRouterText(await res.json()).slice(0, 600);
      if (!reply) throw new Error("empty reply");
    } catch (err) {
      console.error("[buddy] openrouter chat failed, using fallback:", err);
      reply = fallbackReply(obs);
      fallback = true;
    }
  } else {
    reply = fallbackReply(obs);
    fallback = true;
  }

  const est = estimateBuddyTurn(reply);
  const falHint = fallback ? null : buildBuddyFalHint(intent, reply, { gameTitle: obs.gameTitle, falAvailable: falConfigured() });
  if (fallback) {
    return ok({
      reply,
      voice,
      brain,
      intent,
      fallback: true,
      estimate: { chatCoins: 0, ttsCoins: 0, gross: 0 },
      cost: null,
      metered: null,
      falHint,
      note: "AI is unavailable, so this local Buddy reply is free.",
    });
  }
  // Meter the chat leg at TRUE cost (chat tokens + image tokens + DB leg).
  // The RPC prices buddy-chat at 3 coins per qty unit, so derive qty from
  // the true-cost gross; the ledger lands on the accurate figure.
  // (Same meter whichever brain reasoned; the USD delta is sub-centicentcoin.)
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
    brain,
    intent,
    model,
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
    falHint,
    note: "Buddy turns meter in Vibe Coins with the 25% cut included; see /my/usage.",
  });
}
