import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { fetchRunpodBilling, type RunpodBillingKind } from "@/lib/runpod";

export const dynamic = "force-dynamic";

// POST /api/agents/runpod-sync { days?: 1..31 }; pull REAL RunPod billing
// history (pods + serverless endpoints + network volumes) with RUNPOD_API_KEY
// and mirror it into runpod_usage for /my/usage. Informational mirror only:
// RunPod bills the card directly, so mirrored rows carry no Vibe cut.
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Authentication required.", 401);
  const rl = rateLimit(`runpod-sync:${u.id}`, 5, 3_600_000);
  if (!rl.allowed) return fail("Sync is limited to 5 per hour.", 429);
  let days = 7;
  try {
    const body = (await req.json()) as { days?: unknown };
    const d = Math.floor(Number(body.days));
    if (Number.isFinite(d)) days = Math.max(1, Math.min(31, d));
  } catch {
    days = 7;
  }
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 3_600_000);
  const kinds: RunpodBillingKind[] = ["pods", "endpoints", "networkvolumes"];
  const all = await Promise.all(
    kinds.map((k) =>
      fetchRunpodBilling(k, {
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        bucketSize: "day",
      }),
    ),
  );
  const firstErr = all.find((r) => !r.ok);
  if (firstErr && !firstErr.ok) {
    const msg = firstErr.error;
    if (/not set/i.test(msg)) return fail("RUNPOD_API_KEY is not set on the server.", 503);
    console.error("[api/agents/runpod-sync] provider error", String(msg).slice(0, 300));
    return fail("RunPod billing lookup failed. Try again shortly.", 502);
  }
  const db = serviceClient();
  let synced = 0;
  let totalUsd = 0;
  const byKind: Record<string, number> = { pod: 0, serverless: 0, volume: 0 };
  try {
    for (const res of all) {
      if (!res.ok) continue;
      for (const row of res.rows) {
        const { error } = await db.from("runpod_usage").upsert(
          {
            user_id: u.id,
            kind: row.kind,
            remote_id: row.remoteId,
            time_bucket: row.timeBucket,
            amount_usd: row.amountUsd,
            time_billed_ms: row.timeBilledMs,
            synced_at: new Date().toISOString(),
          },
          { onConflict: "user_id,kind,remote_id,time_bucket", ignoreDuplicates: false },
        );
        if (error) return dbFail("api/agents/runpod-sync", error, "Unable to store RunPod usage.");
        synced += 1;
        totalUsd += row.amountUsd;
        byKind[row.kind] = Math.round((byKind[row.kind] + row.amountUsd) * 10000) / 10000;
      }
    }
  } catch (error) {
    return dbFail("api/agents/runpod-sync", error, "Unable to store RunPod usage.");
  }
  return ok({
    synced,
    days,
    totalUsd: Math.round(totalUsd * 10000) / 10000,
    byKind,
    note: "Mirrored RunPod spend (billed by RunPod; no Vibe cut).",
  });
}
