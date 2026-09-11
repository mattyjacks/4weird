import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOriginOrBotKey } from "@/lib/csrf-bot";
import { keyHasScope, resolveBotKey } from "@/lib/bot-auth";
import { rateLimit } from "@/lib/rate-limit";
import { requireHuman } from "@/lib/botid";
import { rpcStatus } from "@/lib/agent-market";
import {
  MESHY_CUT_NOTE,
  cleanMeshyPrompt,
  isHttpsUrl,
  isMeshyOp,
  meshyApiBase,
  meshyConfigured,
  meshyKey,
  meshyOpByKey,
  quoteMeshySplit,
} from "@/lib/meshy";

export const dynamic = "force-dynamic";

/**
 * POST /api/meshy/generate { op, prompt?, image_url?, scope?, scope_id? }.
 * Auth: session OR bot key with `meshy:generate`.
 * Meters gross (25% cut INCLUDED) BEFORE queueing; without MESHY_API_KEY
 * returns honest started:false + quote, charging nothing, never faked.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!(await sameOriginOrBotKey(req))) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  let userId = data?.user?.id ?? null;
  let viaBot = false;
  if (!userId) {
    const bot = await resolveBotKey(req).catch(() => null);
    if (!bot) {
      return fail("Authentication required. Sign in to run Meshy tools; the catalog + quotes on /meshy are free without login.", 401);
    }
    if (!keyHasScope(bot, "meshy:generate")) return fail("Key lacks scope: meshy:generate.", 403);
    userId = bot.userId;
    viaBot = true;
  }
  // Valid bot4weird_ keys (meshy:generate) pass inside requireHuman; forged
  // keys fall through to the BotID check and fail closed like any bot.
  const botBlock = await requireHuman(req, "POST /api/meshy/generate");
  if (botBlock) return botBlock;
  const rl = rateLimit(`meshy:generate:${userId}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const opRaw = String(input.op ?? "");
  if (!isMeshyOp(opRaw)) return fail("Invalid op. Pick one from GET /api/meshy/ops.", 400);
  const def = meshyOpByKey(opRaw);
  const prompt = cleanMeshyPrompt(input.prompt ?? "");
  if (def.needsPrompt && prompt.length < 3) return fail(`${def.name} needs a prompt (3+ chars).`, 400);
  const imageUrl = typeof input.image_url === "string" ? input.image_url : "";
  if (def.needsImage && !isHttpsUrl(imageUrl)) {
    return fail(`${def.name} needs a source image_url (https).`, 400);
  }
  if (imageUrl && !isHttpsUrl(imageUrl)) return fail("Invalid image_url.", 400);

  const quote = quoteMeshySplit(opRaw, 1);
  if (!meshyConfigured()) {
    return ok({
      started: false,
      configured: false,
      op: opRaw,
      quote,
      note: MESHY_CUT_NOTE,
      hint: "Set MESHY_API_KEY on the server to queue real Meshy.ai tasks.",
    });
  }

  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("Meshy unavailable.", 503);
  }
  const { data: job, error: jobErr } = await svc
    .from("meshy_jobs")
    .insert({
      owner_id: userId,
      op: opRaw,
      prompt,
      source_image_url: imageUrl,
      status: "queued",
    })
    .select("id")
    .single();
  if (jobErr || !job) return dbFail("api/meshy/generate", jobErr, "Unable to open job.");
  const jobId = (job as { id: string }).id;

  // Meter first (fail closed).
  if (viaBot) {
    const { error } = await svc.rpc("meter_meshy_usage_for", {
      p_user: userId,
      p_op: opRaw,
      p_qty: 1,
      p_job: jobId,
    });
    if (error) {
      await svc.from("meshy_jobs").delete().eq("id", jobId);
      return rpcFail("api/meshy/generate", error, rpcStatus, "Unable to meter this Meshy run.");
    }
  } else {
    const { error } = await supabase.rpc("meter_meshy_usage", {
      p_op: opRaw,
      p_qty: 1,
      p_job: jobId,
    });
    if (error) {
      await svc.from("meshy_jobs").delete().eq("id", jobId);
      return rpcFail("api/meshy/generate", error, rpcStatus, "Unable to meter this Meshy run.");
    }
  }

  const key = meshyKey();
  const base = meshyApiBase();
  const endpoint =
    opRaw === "text-to-3d"
      ? `${base}/v2/text-to-3d`
      : opRaw === "image-to-3d"
        ? `${base}/v2/image-to-3d`
        : opRaw === "text-to-texture"
          ? `${base}/v2/text-to-texture`
          : `${base}/v1/animate`;
  const payload =
    opRaw === "text-to-3d"
      ? { mode: "preview", prompt, art_style: "stylized", ai_model: "meshy-5" }
      : opRaw === "image-to-3d"
        ? { image_url: imageUrl, ai_model: "meshy-5" }
        : opRaw === "text-to-texture"
          ? { prompt, art_style: "stylized" }
          : { prompt };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 401 || res.status === 403) {
        console.error(`[api/meshy/generate] Meshy rejected the server key (HTTP ${res.status}, op ${opRaw}). Nothing was charged.`);
        return fail("Meshy.ai rejected the server key. Re-issue MESHY_API_KEY; nothing was charged.", 502);
      }
      await svc.from("meshy_jobs").update({ status: "failed" }).eq("id", jobId);
      return fail(`Meshy.ai queue HTTP ${res.status}: ${text.slice(0, 160)}`, 502);
    }
    const queued = (await res.json()) as { result?: string; task_id?: string; id?: string };
    const taskId = String(queued.result ?? queued.task_id ?? queued.id ?? "");
    if (!taskId) {
      await svc.from("meshy_jobs").update({ status: "failed" }).eq("id", jobId);
      return fail("Meshy.ai returned no task id.", 502);
    }
    await svc
      .from("meshy_jobs")
      .update({ meshy_task_id: taskId, status: "processing", coins: quote.gross, cut: quote.cut })
      .eq("id", jobId);
    return ok(
      {
        started: true,
        configured: true,
        job: jobId,
        meshy_task_id: taskId,
        op: opRaw,
        quote,
        note: MESHY_CUT_NOTE,
      },
      201,
    );
  } catch (error) {
    console.error("[api/meshy/generate] provider fetch failed", String(error instanceof Error ? error.message : error).slice(0, 200));
    await svc.from("meshy_jobs").update({ status: "failed" }).eq("id", jobId);
    return fail("Meshy.ai request failed. Try again shortly.", 502);
  } finally {
    clearTimeout(timer);
  }
}
