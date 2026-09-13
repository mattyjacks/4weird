import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { listGpuTypes, runpodConfigured } from "@/lib/runpod";

export const dynamic = "force-dynamic";

// GET /api/agents/runpod-gpus; REAL GPU catalog for sizing picks
// (GET /v2/catalog/gpus). Login required. Unconfigured key → honest
// started:false with empty arrays, never placeholder GPUs.
//
// This route must exist as a static segment: without it, requests fall
// through to /api/agents/[id], which rejects non-UUID ids with
// 400 "Invalid listing id."
export async function GET() {
  try {
    if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return fail("Authentication required.", 401);
    const rl = rateLimit(`runpod-gpus:${data.user.id}`, 20, 60_000);
    if (!rl.allowed) return fail("Rate limited.", 429);
    if (!runpodConfigured()) {
      return ok({
        configured: false,
        started: false,
        gpus: [],
        gpuTypes: [],
        hint: "Set RUNPOD_API_KEY (RunPod console → Settings → API Keys) as a server environment variable.",
      });
    }
    const res = await listGpuTypes();
    if (!res.ok) {
      console.error("[runpod-gpus] lookup failed");
      return fail("RunPod GPU lookup failed. Try again shortly.", 502);
    }
    // Both keys: the dashboard reads `gpus ?? gpuTypes`.
    return ok({ configured: true, started: true, gpus: res.gpuTypes, gpuTypes: res.gpuTypes });
  } catch (err) {
    console.error(
      "[runpod-gpus] lookup failed",
      err instanceof Error ? err.message.slice(0, 120) : "fetch failed",
    );
    return fail("RunPod GPU lookup failed. Try again shortly.", 502);
  }
}
