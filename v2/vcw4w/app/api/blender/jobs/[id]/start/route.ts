import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { provisionBlenderWorker, runpodProxyUrl } from "@/lib/compute";
import {
  BLENDER_BUCKET,
  BLENDER_DISK_GB,
  BLENDER_HTTP_PORT,
  BLENDER_IMAGE,
  BLENDER_SHA256_URL,
  BLENDER_TARBALL_URL,
  BLENDER_VERSION,
  blenderOutputPath,
  buildBlenderBootstrap,
  cleanBlenderSpan,
  quoteBlenderCap,
} from "@/lib/blender-render";

export const dynamic = "force-dynamic";

const siteBase = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://4weird.games").replace(/\/+$/, "");

/**
 * POST /api/blender/jobs/[id]/start {startFrame, endFrame} — provision the
 * pinned-4090 worker. Never fakes: unconfigured / no_stock / provision
 * failures come back as honest started:false (mirrors /api/vcw/autoplay).
 * RunPod bills the card per second; the coin quote is the gross display
 * figure for the provisioned card (25% cut included).
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`blender:start:${data.user.id}`, 10, 3_600_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const span = cleanBlenderSpan((body ?? {}) as Record<string, unknown>);
  if (!span.ok) return fail(span.error, 400);

  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("Render start unavailable.", 503);
  }
  const { data: row, error } = await svc
    .from("blender_renders")
    .select("id,user_id,scene_path,status,callback_token")
    .eq("id", String(id))
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (error) return dbFail("POST /api/blender/jobs/[id]/start", error, "Unable to load render job.");
  if (!row) return fail("Render job not found.", 404);
  const job = row as { id: string; scene_path: string; status: string; callback_token: string };
  if (job.status !== "ready") {
    return fail(job.status === "draft" ? "Confirm the upload first." : `Job is ${job.status} — start a new job for another render.`, 409);
  }

  const { data: sceneUrls, error: sceneErr } = await svc.storage
    .from(BLENDER_BUCKET)
    .createSignedUrls([job.scene_path], 3600);
  const sceneUrl = (sceneUrls as { signedUrl?: string }[] | null)?.[0]?.signedUrl;
  if (sceneErr || !sceneUrl) return dbFail("POST /api/blender/jobs/[id]/start", sceneErr, "Unable to sign scene URL.");
  const outputPath = blenderOutputPath(data.user.id, job.id);
  const { data: outSigned, error: outErr } = await svc.storage
    .from(BLENDER_BUCKET)
    .createSignedUploadUrl(outputPath, { upsert: true });
  if (outErr || !outSigned) return dbFail("POST /api/blender/jobs/[id]/start", outErr, "Unable to mint output URL.");

  const provisioned = await provisionBlenderWorker({
    name: `blender-render-${job.id.slice(0, 8)}`,
    image: BLENDER_IMAGE,
    ports: [`${BLENDER_HTTP_PORT}/http`],
    env: {
      SCENE_URL: sceneUrl,
      UPLOAD_URL: outSigned.signedUrl,
      CALLBACK_URL: `${siteBase}/api/blender/progress`,
      CALLBACK_TOKEN: job.callback_token,
      START_FRAME: String(span.startFrame),
      END_FRAME: String(span.endFrame),
      DEVICE: "OPTIX",
      BLENDER_TARBALL: BLENDER_TARBALL_URL,
      BLENDER_SHA256: BLENDER_SHA256_URL,
      BLENDER_VERSION,
    },
    bootstrap: buildBlenderBootstrap({ device: "OPTIX" }),
    diskGb: BLENDER_DISK_GB,
  });
  if ("error" in provisioned) {
    return ok({
      started: false,
      provision: { ok: false, code: provisioned.error, message: provisioned.message ?? "Provisioning failed." },
      note: "Render worker not started — no spend. Fix the provision state above and retry.",
    });
  }

  const quote = quoteBlenderCap(provisioned.hourlyUsd);
  const maxRunUsd = Math.round((provisioned.hourlyUsd / 60) * 50 * 100) / 100;
  const { error: upErr } = await svc
    .from("blender_renders")
    .update({
      status: "starting",
      start_frame: span.startFrame,
      end_frame: span.endFrame,
      frame_count: span.frameCount,
      pod_id: provisioned.podId,
      gpu_id: provisioned.gpuId,
      hourly_usd: provisioned.hourlyUsd,
      output_path: outputPath,
      error: null,
    })
    .eq("id", job.id);
  if (upErr) return dbFail("POST /api/blender/jobs/[id]/start", upErr, "Worker started but the job row did not save — stop the pod from RunPod console.", 500);

  return ok({
    started: true,
    jobId: job.id,
    connection: {
      endpointUrl: provisioned.endpointUrl,
      podId: provisioned.podId,
      gpu: provisioned.gpuId,
      hourlyUsd: provisioned.hourlyUsd,
      port: provisioned.port,
    },
    frames: { start: span.startFrame, end: span.endFrame, count: span.frameCount },
    quote: {
      minutes: 50,
      gross_coins: quote.gross,
      cut_coins: quote.cut,
      provider_coins: quote.provider,
      max_run_usd: maxRunUsd,
    },
    workerLog: runpodProxyUrl(provisioned.podId, BLENDER_HTTP_PORT),
    note: `Render worker live on ${provisioned.gpuId} (~$${provisioned.hourlyUsd.toFixed(2)}/hr, per second, cap ~$${maxRunUsd.toFixed(2)}). It exits itself when done, ending billing. Coin quote ${quote.gross} gross max, 25% cut included.`,
  });
}
