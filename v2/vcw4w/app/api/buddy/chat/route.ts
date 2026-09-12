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
  expandBuddySlashCommand,
  fallbackReply,
  observeScreen,
  pickBuddyBrain,
  smartBuddySystemPrompt,
  smartBuddyUserPrompt,
  summarizeBuddyMemory,
  cleanBuddyHistory,
} from "@/lib/buddy-engine";
import { cleanBuddyVoice, formatBuddyCost, quoteBuddyChatLeg, quoteBuddyTtsLeg } from "@/lib/game-ai";
import { memoryPromptSection, mergeBuddyMemory } from "@/lib/buddy-memory";
import { BUDDY_SSE_HEADERS, isBuddyStreamRequested, isResponsesCompleted, isResponsesFailed, responsesDeltaFromEvent, sseEncode } from "@/lib/buddy-stream";
import { falConfigured } from "@/lib/fal";
import { OPENROUTER_ENDPOINT, OPENROUTER_REFERER, OPENROUTER_TITLE, parseOpenRouterText } from "@/lib/openrouter-plays";

export const dynamic = "force-dynamic";

/**
 * POST /api/buddy/chat; one Gaming Buddy turn reusing the VibeCodeWorker
 * loop (OBSERVE -> REASON -> ACT -> METER).
 * Body: { game_slug?, game_title?, screen_text?, score?, voice?,
 *   session_id?, screen_image?, message?, history?, brain? }.
 * screen_image is an optional client-captured JPEG/PNG data URL (downscaled
 * snapshot from the user's explicit screen share). Every distinct frame on
 * the turn (screen snapshot AND camera frame) is forwarded to the model for
 * this turn only; never stored, never logged; and each is billed as image
 * input tokens on the chat leg.
 * memory:true (opt-in, default off) pulls the per-game rolling buffer via
 * buddy_get_memory into the system prompt and rolls this turn into it via
 * buddy_save_memory — extractive text only, zero model cost, best-effort.
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
 *
 * SSE STREAMING (opt-in, JSON default unchanged): send `"stream": true` in
 * the body with an OpenAI brain + OPENAI_API_KEY to get `text/event-stream`
 * (`Cache-Control: no-cache`, `Connection: keep-alive`) instead of JSON.
 * Frames (`data: <json>\n\n`): `{"delta":"..."}` per
 * `response.output_text.delta` while the model writes; terminal
 * `{"done":true,"reply":...,"brain":...,"intent":...,"model":...,
 * "estimate":...,"cost":{...same shape as JSON...},"falHint":...}` after the
 * existing metering block succeeds (meter before emitting done); terminal
 * `{"error":"..."}` on upstream failure or `Unable to meter this turn.` when
 * metering fails. Fallback (no brain) with `"stream": true` emits a single
 * `done` frame with the local reply and `cost: null`, same semantics as the
 * JSON fallback. Clients: new EventSource-style POST reader; concatenate
 * `delta` frames for live text, then replace with `done.reply` on arrival.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const botBlock = await requireHuman(req, "POST /api/buddy/chat", { allowAuthenticated: true });
  if (botBlock) return botBlock;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`buddy:chat:${data.user.id}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429, { "Retry-After": String(rl.retryAfter) });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const cameraImage = cleanScreenImage(input.camera_image ?? input.cameraImage);
  const screenOnly = cleanScreenImage(input.screen_image ?? input.screenImage);
  // Forward every distinct frame: the screen snapshot AND the camera frame
  // each reach the model. (Previously the camera frame was silently dropped
  // whenever a screen snapshot rode the same turn, while the client implied
  // both count. Same dedupe when both fields carry one frame.)
  const turnImages = [screenOnly, cameraImage].filter((img, i, arr): img is string => typeof img === "string" && img.length > 0 && arr.indexOf(img) === i);
  const screenImage = turnImages[0] ?? null;
  const imageCount = turnImages.length;
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
  // Normalize widget slash shortcuts server-side too, so raw "/react ..."
  // pastes, queued retries, and third-party clients all reason identically.
  const expanded = expandBuddySlashCommand(String(input.message ?? ""), obs.screenText);
  const message = expanded.message.replace(/\s+/g, " ").trim().slice(0, 500);
  const memory = summarizeBuddyMemory(history);
  const intent = detectBuddyIntent(`${message} ${obs.screenText}`);
  const systemPrompt = smartBuddySystemPrompt(voice, {
    gameTitle: obs.gameTitle,
    intent,
    memory,
    falAvailable: falConfigured(),
    hasCamera: obs.hasCamera,
  });
  // Opt-in cross-session memory (zero model cost): the widget sends
  // memory:true only after the player toggles "Remember me". Stored via
  // buddy_get_memory / buddy_save_memory; missing migration degrades to "".
  const wantMemory = input.memory === true;
  let storedMemory = "";
  if (wantMemory) {
    try {
      const { data: memRow } = await supabase.rpc("buddy_get_memory", { p_game: obs.gameSlug });
      storedMemory = String((memRow as unknown) ?? "").slice(0, 2000);
    } catch {
      storedMemory = "";
    }
  }
  const memorySection = wantMemory ? memoryPromptSection(storedMemory) : "";
  const systemPromptFinal = memorySection ? `${systemPrompt} ${memorySection}` : systemPrompt;
  const promptText = smartBuddyUserPrompt(obs, { history, message });

  const openaiKey = process.env.OPENAI_API_KEY ?? "";
  const openrouterKey = process.env.OPENROUTER_API_KEY ?? "";
  const openrouterModel = process.env.OPENROUTER_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct";
  const brain = pickBuddyBrain({ openaiKey, openrouterKey, requested: input.brain });
  const model = brain === "openrouter" ? openrouterModel : (process.env.BUDDY_MODEL ?? "gpt-4o-mini");
  const wantStream = isBuddyStreamRequested(input);
  // Fail fast when the wallet cannot cover even the smallest chat leg —
  // BEFORE spending real inference (streamed or buffered) on a turn that
  // metering must then reject. Fallback replies are free and skip this.
  if (brain !== "none") {
    try {
      const { data: bal, error: balError } = await supabase.rpc("get_my_coin_balance");
      if (balError) return dbFail("api/buddy/chat:balance", balError, "Unable to check balance.");
      const floor = quoteBuddyChatLeg({ promptChars: 1, replyChars: 1, hasScreenshot: false }).grossCoins;
      if ((Number(bal) || 0) < floor) return fail("Insufficient Vibe Coin balance. Top up to keep talking.", 402);
    } catch (error) {
      return dbFail("api/buddy/chat:balance", error, "Unable to check balance.");
    }
  }
  // SSE fallback (no brain): single done frame, cost null — same semantics as the JSON fallback below.
  if (wantStream && brain === "none") {
    const fbReply = fallbackReply(obs);
    return new Response(
      sseEncode({
        done: true,
        reply: fbReply,
        voice,
        brain,
        intent,
        model,
        fallback: true,
        estimate: { chatCoins: 0, ttsCoins: 0, gross: 0 },
        cost: null,
        metered: null,
        falHint: null,
        note: "AI is unavailable, so this local Buddy reply is free.",
      }),
      { headers: BUDDY_SSE_HEADERS },
    );
  }
  // SSE live path: OpenAI Responses stream with deltas, then the existing
  // output_text-parts parsing + metering before the done frame.
  if (wantStream && brain === "openai" && openaiKey) {
    const streamApiInput = turnImages.length
      ? [
          {
            role: "user",
            content: [
              { type: "input_text", text: promptText },
              ...turnImages.map((url) => ({ type: "input_image", image_url: url })),
            ],
          },
        ]
      : promptText;
    const streamSystem = systemPromptFinal;
    const streamPromptLen = promptText.length;
    const streamHasShot = screenImage !== null;
    const streamObs = obs;
    const streamVoice = voice;
    const streamIntent = intent;
    const streamModel = model;
    const streamBrain = brain;
    const streamSession = sessionRaw;
    const sseStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const enc = new TextEncoder();
        const send = (frame: string) => {
          try {
            controller.enqueue(enc.encode(frame));
          } catch {
            /* client went away; close below */
          }
        };
        const finish = (timer: ReturnType<typeof setTimeout>) => {
          clearTimeout(timer);
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        };
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 25_000);
        let upstream: Response;
        try {
          upstream = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            signal: ctrl.signal,
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
            body: JSON.stringify({
              model: streamModel,
              instructions: streamSystem,
              input: streamApiInput,
              max_output_tokens: 150,
              store: false,
              stream: true,
            }),
          });
        } catch (err) {
          send(sseEncode({ error: err instanceof Error && err.name === "AbortError" ? "Buddy stream timed out." : "Buddy stream failed." }));
          finish(timer);
          return;
        }
        if (!upstream.ok) {
          send(sseEncode({ error: `chat HTTP ${upstream.status}` }));
          finish(timer);
          return;
        }
        const reader = upstream.body?.getReader();
        if (!reader) {
          send(sseEncode({ error: "Buddy stream failed." }));
          finish(timer);
          return;
        }
        const decoder = new TextDecoder();
        let buffer = "";
        let streamedText = "";
        let completedPayload: unknown = null;
        const handleBlock = (raw: string) => {
          const lines = raw.split("\n");
          let event = "";
          for (const line of lines) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) {
              const dataStr = line.slice(5).trim();
              if (!dataStr || dataStr === "[DONE]") continue;
              let data: unknown = null;
              try {
                data = JSON.parse(dataStr);
              } catch {
                continue;
              }
              const evtName = event || String((data as { type?: unknown }).type ?? "");
              const delta = responsesDeltaFromEvent(evtName, data);
              if (delta) {
                streamedText += delta;
                send(sseEncode({ delta }));
              } else if (isResponsesCompleted(evtName, data)) {
                const holder = (data ?? {}) as { response?: unknown };
                completedPayload = holder.response ?? data;
              } else if (isResponsesFailed(evtName, data)) {
                const msg = String((data as { error?: { message?: unknown }; message?: unknown }).error instanceof Object
                  ? ((data as { error?: { message?: unknown } }).error?.message ?? "")
                  : ((data as { message?: unknown }).message ?? "")) || "Buddy stream failed.";
                send(sseEncode({ error: msg.slice(0, 200) }));
                throw new Error("__buddy_sse_failed__");
              }
            }
          }
        };
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let idx = buffer.indexOf("\n\n");
            while (idx >= 0) {
              const raw = buffer.slice(0, idx);
              buffer = buffer.slice(idx + 2);
              handleBlock(raw);
              idx = buffer.indexOf("\n\n");
            }
          }
          if (buffer.trim()) handleBlock(buffer);
        } catch (err) {
          if (err instanceof Error && err.message === "__buddy_sse_failed__") {
            try {
              await reader.cancel();
            } catch {
              /* ignore */
            }
            finish(timer);
            return;
          }
          const msg = err instanceof Error && err.name === "AbortError" ? "Buddy stream timed out." : "Buddy stream failed.";
          send(sseEncode({ error: msg }));
          finish(timer);
          return;
        } finally {
          try {
            reader.releaseLock();
          } catch {
            /* ignore */
          }
        }
        // Assemble the full reply with the EXISTING output_text-parts parsing.
        const out = (completedPayload ?? {}) as {
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
        let streamReply = String(responseText || out.output_text || "").trim().slice(0, 600);
        if (!streamReply) streamReply = streamedText.trim().slice(0, 600);
        if (!streamReply) {
          send(sseEncode({ error: "Buddy stream failed." }));
          finish(timer);
          return;
        }
        const streamCost = quoteBuddyChatLeg({
          promptChars: streamPromptLen,
          replyChars: streamReply.length,
          hasScreenshot: streamHasShot,
          imageCount,
        });
        const streamEstVoice = quoteBuddyTtsLeg({ chars: streamReply.length, model: "tts-1" });
        const streamEst = {
          chatCoins: streamCost.grossCoins,
          ttsCoins: streamEstVoice.grossCoins,
          gross: Math.round((streamCost.grossCoins + streamEstVoice.grossCoins) * 100) / 100,
        };
        let streamMetered: unknown = null;
        try {
          const { data: chatRow, error: chatErr } = await supabase.rpc("meter_game_ai_usage", {
            p_game: streamObs.gameSlug,
            p_kind: "buddy-chat",
            p_qty: streamCost.rpcQty,
            p_session: streamSession,
            p_source: "chat",
          });
          if (chatErr) {
            // Mirror the JSON turn: a failed meter fails the turn, never a
            // free reply. The SSE contract carries the same public message
            // as an error frame (rpcFail's P0001 mapping is JSON-only).
            send(sseEncode({ error: "Unable to meter this turn." }));
            finish(timer);
            return;
          }
          streamMetered = chatRow;
        } catch {
          send(sseEncode({ error: "Unable to meter this turn." }));
          finish(timer);
          return;
        }
        // Opt-in memory save: roll this turn into the per-game buffer.
        // Best-effort — the turn is already metered and answered.
        if (wantMemory) {
          try {
            const merged = mergeBuddyMemory(storedMemory, [
              { role: "user", text: message },
              { role: "buddy", text: streamReply },
            ]);
            await supabase.rpc("buddy_save_memory", { p_game: streamObs.gameSlug, p_text: merged });
          } catch {
            /* memory is best-effort */
          }
        }
        const streamFalHint = buildBuddyFalHint(streamIntent, streamReply, { gameTitle: streamObs.gameTitle, falAvailable: falConfigured() });
        send(
          sseEncode({
            done: true,
            reply: streamReply,
            voice: streamVoice,
            brain: streamBrain,
            intent: streamIntent,
            model: streamModel,
            fallback: false,
            estimate: streamEst,
            cost: {
              grossCoins: streamCost.grossCoins,
              grossCenticentcoins: streamCost.grossCenticentcoins,
              cut: streamCost.cut,
              provider: streamCost.provider,
              usdProvider: streamCost.usdProvider,
              usdGross: streamCost.usdGross,
              parts: streamCost.parts,
              display: formatBuddyCost(streamCost),
            },
            metered: streamMetered,
            falHint: streamFalHint,
          }),
        );
        finish(timer);
      },
    });
    return new Response(sseStream, { headers: BUDDY_SSE_HEADERS });
  }
  let reply = "";
  let fallback = false;
  if (brain === "openai") {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15_000);
      let res: Response;
      try {
        // With snapshots, the Responses API takes structured content so the
        // model actually sees the screen (and the camera when both ride one
        // turn); otherwise a plain text prompt.
        const apiInput = turnImages.length
          ? [
              {
                role: "user",
                content: [
                  { type: "input_text", text: promptText },
                  ...turnImages.map((url) => ({ type: "input_image", image_url: url })),
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
            instructions: systemPromptFinal,
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
              { role: "system", content: systemPromptFinal },
              // Llama Scout is vision-capable via the OpenAI content-part
              // shape; snapshots ride along when the player shared them.
              turnImages.length
                ? {
                    role: "user",
                    content: [
                      { type: "text", text: promptText },
                      ...turnImages.map((url) => ({ type: "image_url", image_url: { url } })),
                    ],
                  }
                : { role: "user", content: promptText },
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
  // (Same meter whichever brain reasoned; the USD delta is sub-centicentcoin.
  // Both brains receive the screenshot when shared, so both spend the
  // image leg.)
  const cost = quoteBuddyChatLeg({
    promptChars: promptText.length,
    replyChars: reply.length,
    hasScreenshot: screenImage !== null,
    imageCount,
  });
  // Turn estimate from the SAME true-cost legs as the debit (chat leg known,
  // voice leg quoted for speaking this reply), so API consumers never see
  // two contradictory figures. The widget renders cost.display.
  const estVoice = quoteBuddyTtsLeg({ chars: reply.length, model: "tts-1" });
  const est = {
    chatCoins: cost.grossCoins,
    ttsCoins: estVoice.grossCoins,
    gross: Math.round((cost.grossCoins + estVoice.grossCoins) * 100) / 100,
  };
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
  // Opt-in memory save: roll this turn into the per-game buffer.
  // Best-effort — the turn is already metered and answered.
  if (wantMemory) {
    try {
      const merged = mergeBuddyMemory(storedMemory, [
        { role: "user", text: message },
        { role: "buddy", text: reply },
      ]);
      await supabase.rpc("buddy_save_memory", { p_game: obs.gameSlug, p_text: merged });
    } catch {
      /* memory is best-effort */
    }
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
