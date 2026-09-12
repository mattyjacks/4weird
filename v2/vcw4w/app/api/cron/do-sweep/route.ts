import { createHash, timingSafeEqual } from "node:crypto";
import { fail, ok } from "@/lib/api-respond";
import { DO_IDLE_POLICY, longTermIdleAdvice } from "@/lib/pod-idle";
import { doConfigured, listDroplets } from "@/lib/digitalocean";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET|POST /api/cron/do-sweep - warning-ONLY backstop for long-term
// DigitalOcean droplets. Modeled on /api/cron/pod-sweep (Bearer CRON_SECRET,
// same authorized() shape) but the RunPod lifecycle NEVER applies here:
// droplets idle past DO_IDLE_POLICY.warnDays (7d) get a warning entry with
// a snapshot hint — this route never stops, shuts down, or deletes anything
// (no dropletAction / deleteDroplet calls, by design).
//
// DigitalOcean exposes no per-droplet activity heartbeat, so `created_at`
// is the idle proxy: a droplet older than 7d counts as stale. Fire weekly
// (see vercel.json); warning delivery itself is the response payload.
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) return false;
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!bearer) return false;
  const ah = createHash("sha256").update(bearer).digest();
  const bh = createHash("sha256").update(secret).digest();
  try {
    return timingSafeEqual(ah, bh);
  } catch {
    return false;
  }
}

async function tick() {
  if (!doConfigured()) return fail("DigitalOcean is not configured.", 503);
  const nowMs = Date.now();
  const warnAfterMs = DO_IDLE_POLICY.warnDays * 86_400_000;
  const listed = await listDroplets();
  if (!listed.ok) {
    console.error("[cron/do-sweep]", listed.error.slice(0, 500));
    return fail(`DigitalOcean sweep failed: ${listed.error}`.slice(0, 200), 502);
  }
  const droplets = listed.data ?? [];
  const warnings = droplets
    .map((d) => {
      const createdMs = new Date(String(d.created_at ?? "")).getTime();
      const ageMs = nowMs - (Number.isFinite(createdMs) ? createdMs : nowMs);
      return { d, ageMs };
    })
    .filter(({ ageMs }) => Number.isFinite(ageMs) && ageMs >= warnAfterMs)
    .map(({ d, ageMs }) => ({
      droplet_id: d.id,
      name: d.name,
      status: d.status,
      region: d.region?.slug ?? null,
      age_days: Math.floor(ageMs / 86_400_000),
      // Warning only: advise a snapshot keep, never stop/delete.
      advice: longTermIdleAdvice(String(d.created_at ?? "")),
    }));
  if (warnings.length > 0) {
    console.warn(
      `[cron/do-sweep] ${warnings.length} stale droplet(s): ` +
        warnings.map((w) => `${w.droplet_id}:${w.name}:${w.age_days}d`).join(", ").slice(0, 500),
    );
  }
  return ok({
    at: new Date(nowMs).toISOString(),
    policy: {
      warn_days: DO_IDLE_POLICY.warnDays,
      stop_never: DO_IDLE_POLICY.stopNever,
      snapshot_hint: DO_IDLE_POLICY.snapshotHint,
    },
    checked: droplets.length,
    warned: warnings.length,
    stopped: 0,
    terminated: 0,
    warnings,
  });
}

export async function GET(req: Request) {
  if (!authorized(req)) return fail("Unauthorized.", 401);
  return tick();
}

export async function POST(req: Request) {
  if (!authorized(req)) return fail("Unauthorized.", 401);
  return tick();
}
