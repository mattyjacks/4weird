import { createHash } from "node:crypto";
import { checkEgressUrl } from "@/lib/ssrf-guard";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { keyHasScope, resolveBotKey } from "@/lib/bot-auth";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";
import { meshyApiBase, meshyConfigured, meshyGameAdvice, meshyKey } from "@/lib/meshy";
import { VAULT_BUCKET } from "@/lib/blob-vault";

export const dynamic = "force-dynamic";

/**
 * GET /api/meshy/status?job=<uuid>; poll a Meshy task; on SUCCEEDED the
 * result is fetched server-side, stored in the caller's Weird Vault
 * (personal scope, models/ prefix), and linked to the job with
 * game-readiness advice. Auth: owner session OR bot key `meshy:read`.
 */
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  let userId = data?.user?.id ?? null;
  if (!userId) {
    const bot = await resolveBotKey(req).catch(() => null);
    if (!bot) return fail("Authentication required.", 401);
    if (!keyHasScope(bot, "meshy:read")) return fail("Key lacks scope: meshy:read.", 403);
    userId = bot.userId;
  }
  const rl = rateLimit(`meshy:status:${userId}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const job = new URL(req.url).searchParams.get("job") ?? "";
  if (!isUuid(job)) return fail("Invalid job.", 400);

  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("Meshy unavailable.", 503);
  }
  const { data: row, error } = await svc
    .from("meshy_jobs")
    .select("id,owner_id,op,prompt,status,meshy_task_id,result_url,vault_file_id,advice,created_at,updated_at")
    .eq("id", job)
    .maybeSingle();
  if (error || !row) return dbFail("api/meshy/status", error, "Job not found.", 404);
  const j = row as {
    owner_id: string; op: string; status: string; meshy_task_id: string;
    result_url: string; vault_file_id: string | null; advice: unknown;
  };
  if (j.owner_id !== userId) return fail("Job not found.", 404);
  if (!meshyConfigured()) {
    return ok({ job, status: j.status, configured: false });
  }
  if (j.status === "done" || !j.meshy_task_id) {
    return ok({ job, status: j.status, result_url: j.result_url, advice: j.advice, configured: true });
  }

  // Live poll of the Meshy task.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${meshyApiBase()}/v2/tasks/${encodeURIComponent(j.meshy_task_id)}`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${meshyKey()}` },
    });
    if (!res.ok) return ok({ job, status: j.status, configured: true, note: `Meshy poll HTTP ${res.status}.` });
    const task = (await res.json()) as {
      status?: string;
      model_urls?: { glb?: string; fbx?: string; obj?: string };
      thumbnail_url?: string;
      texture_urls?: { base_color?: string }[];
      video_url?: string;
    };
    const remote = String(task.status ?? "").toUpperCase();
    if (remote !== "SUCCEEDED") {
      const mapped = remote === "FAILED" || remote === "CANCELED" ? "failed" : "processing";
      await svc.from("meshy_jobs").update({ status: mapped }).eq("id", job);
      return ok({ job, status: mapped, remote, configured: true });
    }
    const resultUrl =
      task.model_urls?.glb ?? task.model_urls?.fbx ?? task.video_url ?? task.thumbnail_url ?? "";
    if (!resultUrl) return ok({ job, status: "processing", configured: true });

    // Autosave to the owner's Weird Vault (personal scope).
    // resultUrl comes from the Meshy API, not the caller, but validate +
    // pin it anyway (https-only, no private IPs, no redirects) with a
    // timeout and a 50 MB streaming cap.
    const egress = await checkEgressUrl(resultUrl);
    if ("error" in egress) {
      await svc.from("meshy_jobs").update({ status: "processing", result_url: resultUrl }).eq("id", job);
      return ok({ job, status: "processing", result_url: resultUrl, configured: true });
    }
    const dlController = new AbortController();
    const dlTimer = setTimeout(() => dlController.abort(), 15_000);
    let bytes: Buffer;
    try {
      const dl = await fetch(egress.url.toString(), { signal: dlController.signal, redirect: "error" });
      if (!dl.ok) {
        await svc.from("meshy_jobs").update({ status: "processing", result_url: resultUrl }).eq("id", job);
        return ok({ job, status: "processing", result_url: resultUrl, configured: true });
      }
      const announced = Number(dl.headers.get("content-length") ?? 0);
      if (Number.isFinite(announced) && announced > 50 * 1024 * 1024) {
        return ok({ job, status: "processing", result_url: resultUrl, configured: true });
      }
      const chunks: Buffer[] = [];
      let total = 0;
      const reader = dl.body?.getReader();
      if (!reader) return ok({ job, status: "processing", result_url: resultUrl, configured: true });
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > 50 * 1024 * 1024) {
          try { await reader.cancel(); } catch { /* ignore */ }
          return ok({ job, status: "processing", result_url: resultUrl, configured: true });
        }
        chunks.push(Buffer.from(value));
      }
      bytes = Buffer.concat(chunks);
    } catch {
      return ok({ job, status: j.status, configured: true });
    } finally {
      clearTimeout(dlTimer);
    }
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const ext = /\.fbx/i.test(resultUrl) ? "fbx" : /\.obj/i.test(resultUrl) ? "obj" : /\.mp4/i.test(resultUrl) ? "mp4" : "glb";
    const objectKey = `personal/${userId}/${sha256}.${ext}`;
    await svc.from("vault_blobs").upsert(
      { sha256, bytes: bytes.length, mime: "model/gltf-binary", storage_path: objectKey },
      { onConflict: "sha256" },
    );
    await svc.storage.from(VAULT_BUCKET).upload(objectKey, bytes, {
      contentType: "model/gltf-binary",
      upsert: true,
    });
    const fname = `models/meshy-${job.slice(0, 8)}.${ext}`;
    const { data: vf } = await svc
      .from("vault_files")
      .upsert(
        {
          owner_id: userId,
          team_id: null,
          org_id: null,
          scope: "personal",
          path: fname,
          sha256,
          bytes: bytes.length,
          kind: "model-3d",
          provenance: { source: "meshy", op: j.op, prompt: (row as { prompt?: string }).prompt ?? "" },
        },
        { onConflict: "scope,owner_id,team_id,org_id,path" },
      )
      .select("id")
      .single();
    const advice = meshyGameAdvice({ bytes: bytes.length, format: ext });
    await svc
      .from("meshy_jobs")
      .update({
        status: "done",
        result_url: resultUrl,
        vault_file_id: (vf as { id?: string } | null)?.id ?? null,
        advice,
      })
      .eq("id", job);
    await svc.from("ai_artifacts").insert({
      owner_id: userId,
      kind: "model-3d",
      tier: "half",
      source: "meshy",
      vault_file_id: (vf as { id?: string } | null)?.id ?? null,
      bytes: bytes.length,
      coins: 0,
    });
    return ok({ job, status: "done", result_url: resultUrl, advice, configured: true });
  } catch {
    return ok({ job, status: j.status, configured: true });
  } finally {
    clearTimeout(timer);
  }
}
