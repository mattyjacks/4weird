import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { runpodApiBase, runpodConfigured } from "@/lib/runpod";

export const dynamic = "force-dynamic";

const UPSTREAM_TIMEOUT_MS = 15_000;

async function upstreamGet(url: string, key: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
  } finally {
    clearTimeout(timer);
  }
}

// GET /api/agents/runpod-templates; REAL RunPod templates owned by the key
// (GET /v2/templates) plus the GPU catalog (GET /v2/catalog/gpus) for sizing
// picks. Login required. Unconfigured key → honest started:false with empty
// arrays, never placeholder templates or GPUs.
export async function GET() {
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
  const key = (process.env.RUNPOD_API_KEY ?? "").trim();
  const base = runpodApiBase();
  let tRes: Response;
  let gRes: Response;
  try {
    [tRes, gRes] = await Promise.all([
      upstreamGet(`${base}/templates`, key),
      upstreamGet(`${base}/catalog/gpus`, key),
    ]);
  } catch (err) {
    console.error("[runpod-templates] lookup failed", err instanceof Error ? err.message.slice(0, 120) : "fetch failed");
    return fail("RunPod template lookup failed. Try again shortly.", 502);
  }
  if (!tRes.ok || !gRes.ok) {
    console.error("[runpod-templates] lookup failed");
    return fail("RunPod template lookup failed. Try again shortly.", 502);
  }
  let tData: unknown;
  let gData: unknown;
  try {
    [tData, gData] = await Promise.all([tRes.json(), gRes.json()]);
  } catch {
    return fail("RunPod template lookup failed. Try again shortly.", 502);
  }
  const templates = Array.isArray(tData) ? tData : null;
  const gpuTypes = Array.isArray(gData) ? gData : null;
  if (!templates || !gpuTypes) {
    return fail("RunPod template lookup failed. Try again shortly.", 502);
  }
  return ok({ configured: true, started: true, templates, gpuTypes });
}
