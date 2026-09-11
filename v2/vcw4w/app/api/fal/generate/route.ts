import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { requireHuman } from "@/lib/botid";
import { rpcStatus } from "@/lib/agent-market";
import {
  FAL_CUT_NOTE,
  cleanFalPrompt,
  cleanGameSlug,
  falApiBase,
  falConfigured,
  falInputFor,
  falKey,
  isFalOp,
  isHttpsUrl,
  isValidFalGameSlug,
  modelForOp,
  opByKey,
  qtyForInput,
  quoteFalSplit,
} from "@/lib/fal";

export const dynamic = "force-dynamic";

/**
 * POST /api/fal/generate; run one of the 30 fal.ai media tools.
 * Body: { op, prompt?, game_slug?, image_url?, audio_url?, audio_minutes?,
 *         source? }.
 *
 * Economy: gross Vibe Coins INCLUDE the 25% cut (meter_fal_usage RPC debits
 * first so fal spend can never leak free; a failed meter fails the run).
 * Without FAL_KEY the route returns honest started:false with a quote and
 * charges nothing. Nothing is ever faked: no URLs are synthesized.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required. Sign in to run fal tools; the catalog + quotes on /fal are free without login.", 401);
  const botBlock = await requireHuman(req, "POST /api/fal/generate");
  if (botBlock) return botBlock;
  const rl = rateLimit(`fal:generate:${data.user.id}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const opRaw = String(input.op ?? "");
  if (!isFalOp(opRaw)) return fail("Invalid op. Pick one of the 30 fal tools from GET /api/fal/ops.", 400);
  const def = opByKey(opRaw);

  const prompt = cleanFalPrompt(input.prompt ?? "");
  if (def.needsPrompt && prompt.length < 3) return fail(`${def.name} needs a prompt (3+ chars).`, 400);
  if (prompt.length > 2000) return fail("Prompt is too long (max 2000 chars).", 400);

  const game = cleanGameSlug(input.game_slug ?? input.game ?? "lobby");
  if (!isValidFalGameSlug(game)) return fail("Invalid game_slug.", 400);

  const imageUrl = typeof input.image_url === "string" ? input.image_url : typeof input.imageUrl === "string" ? input.imageUrl : "";
  if (def.needsImage && !isHttpsUrl(imageUrl)) {
    return fail(`${def.name} needs a source image_url (https).`, 400);
  }
  if (imageUrl && !isHttpsUrl(imageUrl)) return fail("Invalid image_url.", 400);
  const audioUrl = typeof input.audio_url === "string" ? input.audio_url : "";
  if (audioUrl && !isHttpsUrl(audioUrl)) return fail("Invalid audio_url.", 400);

  const sourceRaw = String(input.source ?? "fal-studio");
  const source = sourceRaw === "vcw" ? "vcw" : sourceRaw === "api" ? "api" : sourceRaw === "manual" ? "manual" : "fal-studio";

  const audioMinutes = Number(input.audio_minutes ?? input.audioMinutes ?? 0);
  const qty = qtyForInput(opRaw, { prompt, audioMinutes });
  const quote = quoteFalSplit(opRaw, qty);

  if (!falConfigured()) {
    return ok({
      started: false,
      configured: false,
      op: opRaw,
      model: modelForOp(opRaw),
      quote,
      note: FAL_CUT_NOTE,
      hint: "Set FAL_KEY on the server to queue real fal.ai runs.",
    });
  }

  // Meter first (fail closed): no free fal spend on real provider cost.
  let usage: unknown = null;
  try {
    const { data: result, error } = await supabase.rpc("meter_fal_usage", {
      p_game: game,
      p_op: opRaw,
      p_qty: qty,
      p_source: source,
    });
    if (error) return rpcFail("api/fal/generate", error, rpcStatus, "Unable to meter this fal run.");
    usage = result;
  } catch (error) {
    return dbFail("api/fal/generate", error, "Unable to meter this fal run.");
  }

  const key = falKey();
  const base = falApiBase();
  const model = modelForOp(opRaw);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${base}/${model}`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Key ${key}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(falInputFor(opRaw, { prompt, imageUrl, audioUrl })),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 401 || res.status === 403) {
        console.error(`[api/fal/generate] fal.ai rejected the server key (HTTP ${res.status}, op ${opRaw}, model ${model}). Nothing was charged.`);
        return fail(
          `fal.ai rejected the server key (HTTP ${res.status}). Re-issue FAL_KEY in the fal.ai dashboard and update the server env; nothing was charged, metered coins stay on your balance.`,
          502,
        );
      }
      return fail(`fal.ai queue HTTP ${res.status}: ${text.slice(0, 160)}`, 502);
    }
    const queued = (await res.json()) as { request_id?: string; requestId?: string; status_url?: string; response_url?: string };
    const requestId = String(queued.request_id ?? queued.requestId ?? "");
    if (!requestId) return fail("fal.ai returned no request id.", 502);
    return ok({
      started: true,
      configured: true,
      op: opRaw,
      model,
      request_id: requestId,
      status_url: String(queued.status_url ?? queued.response_url ?? ""),
      quote,
      usage,
      note: FAL_CUT_NOTE,
    }, 201);
  } catch (error) {
    console.error("[api/fal/generate] provider fetch failed", String(error instanceof Error ? error.message : error).slice(0, 200));
    return fail("fal.ai request failed. Try again shortly.", 502);
  } finally {
    clearTimeout(timer);
  }
}
