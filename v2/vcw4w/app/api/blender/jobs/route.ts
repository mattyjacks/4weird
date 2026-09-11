import { randomUUID, randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import {
  BLENDER_BUCKET,
  BLENDER_MAX_SCENE_BYTES,
  blenderScenePath,
  isBlenderFilename,
} from "@/lib/blender-render";

export const dynamic = "force-dynamic";

type BlenderRow = {
  id: string;
  status: string;
  scene_path: string;
  scene_bytes: number;
  start_frame: number;
  end_frame: number;
  frame_count: number;
  pod_id: string;
  gpu_id: string;
  hourly_usd: number;
  output_path: string | null;
  error: string | null;
  last_ping_at: string | null;
  created_at: string;
  updated_at: string;
};

function publicRow(row: BlenderRow) {
  return {
    id: row.id,
    status: row.status,
    sceneBytes: row.scene_bytes,
    startFrame: row.start_frame,
    endFrame: row.end_frame,
    frameCount: row.frame_count,
    podId: row.pod_id || null,
    gpu: row.gpu_id || null,
    hourlyUsd: Number(row.hourly_usd) || 0,
    hasOutput: Boolean(row.output_path),
    error: row.error,
    lastPingAt: row.last_ping_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * POST /api/blender/jobs {filename, bytes} — reserve a job row (draft) and
 * mint a direct-to-storage upload URL. The browser PUTs the .blend straight
 * to Supabase so multi-hundred-MB scenes never cross Vercel's body limit.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`blender:new:${data.user.id}`, 20, 3_600_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const filename = String(input.filename ?? "");
  const bytes = Number(input.bytes);
  if (!isBlenderFilename(filename)) return fail("Upload a .blend scene file.", 400);
  if (!Number.isInteger(bytes) || bytes < 1 || bytes > BLENDER_MAX_SCENE_BYTES) {
    return fail(`Scene must be 1 byte–${BLENDER_MAX_SCENE_BYTES / 1_048_576} MB.`, 400);
  }

  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("Upload unavailable.", 503);
  }
  const jobId = randomUUID();
  const scenePath = blenderScenePath(data.user.id, jobId);
  const token = randomBytes(32).toString("hex");
  const { error: rowErr } = await svc.from("blender_renders").insert({
    id: jobId,
    user_id: data.user.id,
    scene_path: scenePath,
    scene_bytes: 0,
    status: "draft",
    callback_token: token,
  });
  if (rowErr) return dbFail("POST /api/blender/jobs", rowErr, "Unable to create render job.");
  const { data: signed, error: signErr } = await svc.storage
    .from(BLENDER_BUCKET)
    .createSignedUploadUrl(scenePath, { upsert: true });
  if (signErr || !signed) {
    await svc.from("blender_renders").delete().eq("id", jobId);
    return dbFail("POST /api/blender/jobs", signErr, "Unable to mint upload URL.");
  }
  return ok({ jobId, uploadUrl: signed.signedUrl, maxBytes: BLENDER_MAX_SCENE_BYTES }, 201);
}

/** GET /api/blender/jobs — your latest 20 render jobs (login, no secrets). */
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("Upload unavailable.", 503);
  }
  const { data: rows, error } = await svc
    .from("blender_renders")
    .select("id,status,scene_path,scene_bytes,start_frame,end_frame,frame_count,pod_id,gpu_id,hourly_usd,output_path,error,last_ping_at,created_at,updated_at")
    .eq("user_id", data.user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return dbFail("GET /api/blender/jobs", error, "Unable to list render jobs.");
  return ok({ jobs: ((rows ?? []) as BlenderRow[]).map(publicRow) });
}
