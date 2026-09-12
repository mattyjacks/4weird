import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { doConfigured, listDroplets, listSizes, listVolumes } from "@/lib/digitalocean";

export const dynamic = "force-dynamic";

// POST /api/agents/digitalocean-sync; pull REAL DigitalOcean state
// (droplets + volumes, with sizes for monthly cost estimates) with
// DIGITALOCEAN_TOKEN and mirror the summary for /my/usage. Mirrors
// runpod-sync: honest started:false when unconfigured, never synthetic.
// Informational mirror only: DigitalOcean bills the card directly.
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Authentication required.", 401);
  const rl = rateLimit(`digitalocean-sync:${u.id}`, 5, 3_600_000);
  if (!rl.allowed) return fail("Sync is limited to 5 per hour.", 429);
  if (!doConfigured()) {
    return ok({
      started: false,
      reason: "DIGITALOCEAN_TOKEN is not set on the server.",
    });
  }
  // Real DO API only: droplets + volumes (+ sizes for cost estimates).
  const [dropletsRes, volumesRes, sizesRes] = await Promise.all([
    listDroplets(),
    listVolumes(),
    listSizes(),
  ]);
  const firstErr = [dropletsRes, volumesRes, sizesRes].find((r) => !r.ok);
  if (firstErr && !firstErr.ok) {
    const msg = firstErr.error;
    if (/not set/i.test(msg)) return fail("DIGITALOCEAN_TOKEN is not set on the server.", 503);
    console.error("[api/agents/digitalocean-sync] provider error", String(msg).slice(0, 300));
    return fail("DigitalOcean lookup failed. Try again shortly.", 502);
  }
  if (!dropletsRes.ok || !volumesRes.ok || !sizesRes.ok) {
    return fail("DigitalOcean lookup failed. Try again shortly.", 502);
  }
  try {
    // Touch the service client so Supabase outages surface via dbFail
    // (same pattern as runpod-sync storage errors). No DO table exists yet,
    // so this sync returns a live mirror summary without inventing rows.
    serviceClient();
    const priceBySlug = new Map<string, number>();
    for (const s of sizesRes.data) {
      const monthly = Number(s.price_monthly ?? 0);
      if (s.slug && Number.isFinite(monthly) && monthly >= 0) {
        priceBySlug.set(s.slug, monthly);
      }
    }
    let dropletsMonthlyUsd = 0;
    for (const d of dropletsRes.data) {
      const slug = String(d.size_slug ?? "");
      dropletsMonthlyUsd += priceBySlug.get(slug) ?? 0;
    }
    dropletsMonthlyUsd = Math.round(dropletsMonthlyUsd * 100) / 100;
    const volumesGb = volumesRes.data.reduce(
      (sum, v) => sum + (Number.isFinite(Number(v.size_gigabytes)) ? Number(v.size_gigabytes) : 0),
      0,
    );
    const synced = dropletsRes.data.length + volumesRes.data.length;
    return ok({
      started: true,
      synced,
      droplets: dropletsRes.data.length,
      volumes: volumesRes.data.length,
      totalMonthlyUsd: dropletsMonthlyUsd,
      byKind: { droplet: dropletsRes.data.length, volume: volumesRes.data.length },
      volumesGb,
      note: "Mirrored DigitalOcean usage (billed by DigitalOcean; no Vibe cut).",
    });
  } catch (error) {
    return dbFail("api/agents/digitalocean-sync", error, "Unable to mirror DigitalOcean usage.");
  }
}
