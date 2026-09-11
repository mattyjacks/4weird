import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
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
 * POST /api/buddy/tts — speak text in any of the 9 OpenAI voices.
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

  // Optional Fal voice path: no charge here — /api/fal/generate meters on use.
  const backend = String(input.backend ?? "openai").trim().toLowerCase();
  if (backend === "fal" || backend === "fal-npc-voice") {
    if (!falConfigured()) return ok({ fallback: true, voice, model, speed, gross: 0, cost: null, metered: null, note: "Fal is not configured — client should use browser speech." });
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
      note: "Send fal.prompt to /api/fal/generate (op npc-voice) — metered there.",
    });
  }

  const key = process.env.OPENAI_API_KEY ?? "";
  if (!key) return ok({ fallback: true, voice, model, speed, gross: 0, cost: null, metered: null });

  // True-cost voice leg: chars at the model's USD rate + one DB leg. The RPC
  // prices buddy-tts at 2 coins per qty unit, so derive qty from the
  // true-cost gross — the ledger lands on the accurate figure.
  const cost = quoteBuddyTtsLeg({ chars: text.length, model });
  const gross = cost.grossCoins;
  // Meter BEFORE touching OpenAI: a failed meter (e.g. insufficient
  // balance) fails the request instead of serving paid-out audio for free.
  let metered: unknown = null;
  try {
    const { data: row, error } = await supabase.rpc("meter_game_ai_usage", {
      p_game: game,
      p_kind: "buddy-tts",
      p_qty: cost.rpcQty,
      p_session: sessionRaw,
      p_source: "tts",
    });
    if (error) return rpcFail("api/buddy/tts:meter", error, rpcStatus, "Unable to meter voice output.");
    metered = row;
  } catch (error) {
    return dbFail("api/buddy/tts:meter", error, "Unable to meter voice output.");
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
  } catch (err) {
    console.error("[buddy] tts failed, client should use speechSynthesis:", err);
    return ok({ fallback: true, voice, model, speed, gross, cost: null, metered });
  }
}
