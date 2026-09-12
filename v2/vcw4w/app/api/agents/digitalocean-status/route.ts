import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { doApiBase, doConfigured, listRegions, listSizes } from "@/lib/digitalocean";

export const dynamic = "force-dynamic";

// GET /api/agents/digitalocean-status; is DIGITALOCEAN_TOKEN set, and does it work?
// The live check is a read-only regions + sizes query: success proves the token
// is valid without provisioning anything billable. Mirrors runpod-status.
// Never leaks the token: only booleans + counts leave the server.
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`digitalocean-status:${data.user.id}`, 10, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const configured = doConfigured();
  if (!configured) {
    return ok({
      configured: false,
      tokenPresent: false,
      started: false,
      live: false,
      base: doApiBase(),
      hint: "Set DIGITALOCEAN_TOKEN (DigitalOcean console → API → Tokens) as a server environment variable.",
    });
  }
  const [regionsRes, sizesRes] = await Promise.all([listRegions(), listSizes()]);
  if (!regionsRes.ok || !sizesRes.ok) {
    // Never reflect provider internals (HTTP status/body) to browsers.
    try {
      console.error("[digitalocean-status] catalog probe failed");
    } catch {
      // logging must never break the route
    }
    return ok({
      configured: true,
      tokenPresent: true,
      started: false,
      live: false,
      base: doApiBase(),
    });
  }
  return ok({
    configured: true,
    tokenPresent: true,
    started: true,
    live: true,
    base: doApiBase(),
    regions: regionsRes.data.length,
    sizes: sizesRes.data.length,
  });
}
