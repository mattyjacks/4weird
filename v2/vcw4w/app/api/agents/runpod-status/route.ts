import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { fetchRunpodBilling, runpodApiBase, runpodConfigured } from "@/lib/runpod";

export const dynamic = "force-dynamic";

// GET /api/agents/runpod-status — is RUNPOD_API_KEY set, and does it work?
// The live check is a read-only 24h pod-billing query: success proves the key
// is valid without provisioning anything billable.
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`runpod-status:${data.user.id}`, 10, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const configured = runpodConfigured();
  if (!configured) {
    return ok({
      configured: false,
      base: runpodApiBase(),
      live: false,
      hint: "Set RUNPOD_API_KEY (RunPod console → Settings → API Keys) as a server environment variable.",
    });
  }
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 3_600_000);
  const probe = await fetchRunpodBilling("pods", {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    bucketSize: "day",
  });
  if (!probe.ok) {
    return ok({ configured: true, base: runpodApiBase(), live: false, error: probe.error });
  }
  return ok({ configured: true, base: runpodApiBase(), live: true, buckets: probe.rows.length });
}
