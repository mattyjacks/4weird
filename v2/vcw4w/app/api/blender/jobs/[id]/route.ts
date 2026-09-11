import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { getPodLive } from "@/lib/compute";
import { BLENDER_BUCKET } from "@/lib/blender-render";

export const dynamic = "force-dynamic";

/**
 * GET /api/blender/jobs/[id] — one job: status, exact quote inputs, pod
 * liveness, and (when uploaded) a fresh 1-hour mp4 download URL. Never
 * exposes the pod callback token.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const { id } = await ctx.params;
  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("Render lookup unavailable.", 503);
  }
  const { data: row, error } = await svc
    .from("blender_renders")
    .select("id,status,scene_path,scene_bytes,start_frame,end_frame,frame_count,pod_id,gpu_id,hourly_usd,output_path,error,last_ping_at,created_at,updated_at")
    .eq("id", String(id))
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (error) return dbFail("GET /api/blender/jobs/[id]", error, "Unable to load render job.");
  if (!row) return fail("Render job not found.", 404);
  const job = row as {
    id: string; status: string; scene_path: string; scene_bytes: number;
    start_frame: number; end_frame: number; frame_count: number; pod_id: string;
    gpu_id: string; hourly_usd: number; output_path: string | null; error: string | null;
    last_ping_at: string | null; created_at: string; updated_at: string;
  };

  let downloadUrl: string | null = null;
  if (job.output_path && (job.status === "done" || job.status === "done_unstored")) {
    const { data: signed } = await svc.storage.from(BLENDER_BUCKET).createSignedUrls([job.output_path], 3600);
    const first = (signed as { signedUrl?: string }[] | null)?.[0];
    if (first?.signedUrl) downloadUrl = first.signedUrl;
  }

  let podStatus: string | null = null;
  let quiet = false;
  if (job.pod_id && (job.status === "starting" || job.status === "rendering")) {
    const live = await getPodLive(job.pod_id);
    if (live.ok) {
      podStatus = live.status;
      if (!job.last_ping_at) {
        const ageMs = Date.now() - new Date(job.created_at).getTime();
        quiet = ageMs > 12 * 60_000;
      }
    }
  }

  return ok({
    job: {
      id: job.id,
      status: job.status,
      sceneBytes: job.scene_bytes,
      startFrame: job.start_frame,
      endFrame: job.end_frame,
      frameCount: job.frame_count,
      podId: job.pod_id || null,
      gpu: job.gpu_id || null,
      hourlyUsd: Number(job.hourly_usd) || 0,
      error: job.error,
      lastPingAt: job.last_ping_at,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
    },
    downloadUrl,
    podStatus,
    workerQuiet: quiet,
  });
}
