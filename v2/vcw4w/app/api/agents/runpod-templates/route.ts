import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { listGpuTypes, listTemplates, runpodConfigured } from "@/lib/runpod";

export const dynamic = "force-dynamic";

// GET /api/agents/runpod-templates; REAL RunPod templates owned by the key
// (GET /v2/templates) plus the GPU catalog (GET /v2/catalog/gpus) for sizing
// picks. Login required. Unconfigured key → honest started:false with empty
// arrays, never placeholder templates or GPUs.
//
// Upstream list payloads may be a bare array or an envelope object
// ({ templates: [...] }, { gpus: [...] }, { data: [...] }); parsing goes
// through lib/runpod so an envelope shape is never misread as a failure.
export async function GET() {
  try {
    if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return fail("Authentication required.", 401);
    const rl = rateLimit(`runpod-templates:${data.user.id}`, 20, 60_000);
    if (!rl.allowed) return fail("Rate limited.", 429);
    if (!runpodConfigured()) {
      return ok({
        configured: false,
        started: false,
        templates: [],
        gpuTypes: [],
        hint: "Set RUNPOD_API_KEY (RunPod console → Settings → API Keys) as a server environment variable.",
      });
    }
    const [tRes, gRes] = await Promise.all([listTemplates(), listGpuTypes()]);
    if (!tRes.ok || !gRes.ok) {
      console.error("[runpod-templates] lookup failed");
      return fail("RunPod template lookup failed. Try again shortly.", 502);
    }
    return ok({ configured: true, started: true, templates: tRes.templates, gpuTypes: gRes.gpuTypes });
  } catch (err) {
    console.error(
      "[runpod-templates] lookup failed",
      err instanceof Error ? err.message.slice(0, 120) : "fetch failed",
    );
    return fail("RunPod template lookup failed. Try again shortly.", 502);
  }
}
