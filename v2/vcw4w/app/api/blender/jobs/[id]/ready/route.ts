import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { BLENDER_BUCKET, BLENDER_MAX_SCENE_BYTES } from "@/lib/blender-render";

export const dynamic = "force-dynamic";

/**
 * POST /api/blender/jobs/[id]/ready — confirm the browser's direct upload
 * landed: reads the stored object's size (service role, no download) and
 * flips draft → ready. Rejects oversize scenes instead of billing a render.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(_req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`blender:ready:${data.user.id}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const { id } = await ctx.params;
  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("Render lookup unavailable.", 503);
  }
  const { data: row, error } = await svc
    .from("blender_renders")
    .select("id,user_id,scene_path,status")
    .eq("id", String(id))
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (error) return dbFail("POST /api/blender/jobs/[id]/ready", error, "Unable to load render job.");
  if (!row) return fail("Render job not found.", 404);
  const job = row as { id: string; scene_path: string; status: string };
  if (job.status !== "draft" && job.status !== "ready") {
    return fail(`Job is ${job.status} — upload a new scene for another render.`, 409);
  }
  const prefix = job.scene_path.slice(0, job.scene_path.lastIndexOf("/"));
  const needle = job.scene_path.slice(job.scene_path.lastIndexOf("/") + 1);
  const { data: files, error: listErr } = await svc.storage.from(BLENDER_BUCKET).list(prefix, { search: needle });
  if (listErr) return dbFail("POST /api/blender/jobs/[id]/ready", listErr, "Unable to verify upload.");
  const hit = ((files ?? []) as { name?: string; metadata?: { size?: number } }[]).find((f) => f.name === needle);
  const size = Number(hit?.metadata?.size ?? 0);
  if (!hit || !Number.isFinite(size) || size < 1) {
    return fail("Upload not found — PUT the .blend file first, then retry.", 404);
  }
  if (size > BLENDER_MAX_SCENE_BYTES) {
    await svc.from("blender_renders").update({ status: "failed", error: `Scene is ${size} bytes — ${BLENDER_MAX_SCENE_BYTES / 1_048_576} MB max.` }).eq("id", job.id);
    return fail(`Scene is ${(size / 1_048_576).toFixed(1)} MB — ${BLENDER_MAX_SCENE_BYTES / 1_048_576} MB max.`, 413);
  }
  const { error: upErr } = await svc
    .from("blender_renders")
    .update({ scene_bytes: size, status: "ready", error: null })
    .eq("id", job.id);
  if (upErr) return dbFail("POST /api/blender/jobs/[id]/ready", upErr, "Unable to confirm upload.");
  return ok({ jobId: job.id, status: "ready", sceneBytes: size });
}
