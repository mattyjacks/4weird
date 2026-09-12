import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";
import { rpcStatus } from "@/lib/agent-market";
import { cleanBuddyVoice, cleanBuddySpeed, formatBuddyCost, isBuddyModel, quoteBuddyTtsLeg } from "@/lib/game-ai";
import { falConfigured, modelForOp, quoteFal } from "@/lib/fal";

export const dynamic = "force-dynamic";

function cleanText(value: unknown): string {
  return String(value ?? "").slice(0, 2000);
}

/**
 * POST /api/buddy/tts; speak text in any of the 9 OpenAI voices.
 * Body: { text, voice?, model?, speed?, game_slug?, session_id? }.
 * With OPENAI_API_KEY set this proxies tts-1 / tts-1-hd and returns base64
 * mp3; without it returns { fallback: true } so the widget uses browser
 * speechSynthesis. Local browser speech is free; only OpenAI voice output is
 * metered as buddy-tts (25% cut).
 * Optional Fal voice: pass { backend: "fal" } and, when FAL_KEY is set, the
 * route returns a ready-to-fire npc-voice payload for /api/fal/generate
 * (metered there on use, never here) instead of OpenAI audio.
 * Metering is true-cost: characters at the selected model's USD rate plus
 * one Supabase DB leg, converted to gross Vibe Coins (25% cut INCLUDED) at
 * centicentcoin resolution. The response carries the per-turn cost breakdown.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`buddy:tts:${data.user.id}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429, { "Retry-After": String(rl.retryAfter) });
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

  // Optional Fal voice path: no charge here - /api/fal/generate meters on use.
  const backend = String(input.backend ?? "openai").trim().toLowerCase();
  if (backend === "fal" || backend === "fal-npc-voice") {
    if (!falConfigured()) return ok({ fallback: true, voice, model, speed, gross: 0, cost: null, metered: null, note: "Fal is not configured; client should use browser speech." });
    const chars = text.length;
    return ok({
      fallback: "fal",
      voice,
      model,
      speed,
      gross: 0,
      cost: null,
      metered: null,
      fal: {
        op: "npc-voice",
        model: modelForOp("npc-voice"),
        prompt: text.slice(0, 1000),
        coins: quoteFal("npc-voice", Math.max(0.1, chars / 1000)),
      },
      note: "Send fal.prompt to /api/fal/generate (op npc-voice); metered there.",
    });
  }

  const key = process.env.OPENAI_API_KEY ?? "";
  if (!key) return ok({ fallback: true, voice, model, speed, gross: 0, cost: null, metered: null });

  // True-cost voice leg: chars at the model's USD rate + one DB leg. The RPC
  // prices buddy-tts at 2 coins per qty unit, so derive qty from the
  // true-cost gross; the ledger lands on the accurate figure.
  // Balance is pre-checked (402 when short) BEFORE the provider call so broke
  // wallets never burn OpenAI spend; the debit lands AFTER the provider
  // succeeds but BEFORE audio bytes are delivered, so users never pay for
  // failed OpenAI calls and never receive unmetered audio. The meter RPC
  // re-checks balance under its spend lock, so a race that empties the wallet
  // between check and debit still fails closed (and the fetched audio is
  // discarded, never delivered).
  const cost = quoteBuddyTtsLeg({ chars: text.length, model });
  const gross = cost.grossCoins;
  try {
    const { data: bal, error: balError } = await supabase.rpc("get_my_coin_balance");
    if (balError) return dbFail("api/buddy/tts:balance", balError, "Unable to check balance.");
    if ((Number(bal) || 0) < gross) return fail("Insufficient Vibe Coin balance. Top up to keep talking.", 402);
  } catch (error) {
    return dbFail("api/buddy/tts:balance", error, "Unable to check balance.");
  }

  let buf: Buffer;
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
    buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 2_000_000) throw new Error("tts too large");
  } catch (err) {
    console.error("[buddy] tts provider failed before metering (no charge):", err);
    return fail("Voice generation failed before metering; no coins moved. Retry or use browser speech.", 502);
  }
  let metered: unknown = null;
  try {
    const { data: row, error } = await supabase.rpc("meter_game_ai_usage", {
      p_game: game,
      p_kind: "buddy-tts",
      p_qty: cost.rpcQty,
      p_session: sessionRaw,
      p_source: "tts",
    });
    if (error) return rpcFail("api/buddy/tts:meter", error, rpcStatus, "Unable to meter this turn.");
    metered = row;
  } catch (error) {
    return dbFail("api/buddy/tts:meter", error, "Unable to meter this turn.");
  }

  return ok({
    fallback: false,
    voice,
    model,
    speed,
    gross,
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
    audio: buf.toString("base64"),
    mime: "audio/mpeg",
  });
}
