import { createHash, timingSafeEqual } from "node:crypto";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { getPodIdlePolicy, resolvePodPolicy } from "@/lib/pod-idle";
import { getPodLive, runPodLifecycle } from "@/lib/compute";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET|POST /api/cron/pod-sweep — idle-lifecycle backstop for rented RunPods
// (desktops + autoplay remotes). The browser watchdog is the fast path with
// the audible chime; this sweep covers closed browsers so idle pods can
// never burn money forever. Fired by Vercel Cron every 15 minutes (see
// vercel.json). Bearer CRON_SECRET only.
//
// Per running row (policy = per-pod overrides or the env default):
// - idle >= warn + stopGrace → pod STOP (compute released, disk kept).
// - age (since created) >= terminateHours → pod TERMINATE (disk lost).
// Stopped pods past their terminate age are terminated too. Rows already
// stopped/terminated/deleted are skipped. Terminal rows are updated so the
// control pane agrees with RunPod; a failed RunPod call is reported, never
// hidden (the row stays running so the next tick retries).
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

type SweepRow = {
  id: string;
  pod_id: string;
  status: string;
  created_at: string;
  last_activity_at: string | null;
  warn_chimed_at: string | null;
  warn_minutes: number | null;
  stop_grace_minutes: number | null;
  terminate_hours: number | null;
};

async function sweepTable(
  table: "desktop_pods" | "vcw_autoplay_remotes",
  nowMs: number,
): Promise<{ warned: number; stopped: number; terminated: number; errors: string[] }> {
  const out = { warned: 0, stopped: 0, terminated: 0, errors: [] as string[] };
  const db = serviceClient();
  const { data, error } = await db
    .from(table)
    .select("id,pod_id,status,created_at,last_activity_at,warn_chimed_at,warn_minutes,stop_grace_minutes,terminate_hours")
    .in("status", ["running", "stopped"])
    .order("last_activity_at", { ascending: true })
    .limit(200);
  if (error) {
    out.errors.push(`${table}: ${error.code ?? error.message}`);
    return out;
  }
  for (const r of ((data ?? []) as SweepRow[])) {
    const podId = String(r.pod_id ?? "");
    if (!podId) continue;
    const policy = resolvePodPolicy({
      warnMinutes: r.warn_minutes,
      stopGraceMinutes: r.stop_grace_minutes,
      terminateHours: r.terminate_hours,
    });
    const createdMs = new Date(r.created_at).getTime();
    const activeMs = new Date(r.last_activity_at ?? r.created_at).getTime();
    const ageMs = nowMs - (Number.isFinite(createdMs) ? createdMs : nowMs);
    const idleMs = nowMs - (Number.isFinite(activeMs) ? activeMs : nowMs);
    const stopAfterMs = (policy.warnMinutes + policy.stopGraceMinutes) * 60_000;
    const terminateAfterMs = policy.terminateHours * 3_600_000;

    try {
      // Terminate wins: untended past its age, running or stopped.
      if (Number.isFinite(ageMs) && ageMs >= terminateAfterMs) {
        // Confirm the pod still exists before calling terminate: an already
        // EXITED pod bills nothing — just mark the row.
        const live = await getPodLive(podId);
        const gone = !live.ok || /EXITED|TERMINATED|UNKNOWN/i.test(live.status);
        if (gone) {
          await db.from(table).update({ status: "terminated" }).eq("id", r.id);
          out.terminated += 1;
          continue;
        }
        const done = await runPodLifecycle(podId, "terminate");
        if (!done.ok) {
          out.errors.push(`${table}:${r.id}: terminate failed (${done.error})`);
          continue;
        }
        await db.from(table).update({ status: "terminated" }).eq("id", r.id);
        out.terminated += 1;
        continue;
      }
      // Stop: only running pods idle past warn + grace.
      if (r.status === "running" && Number.isFinite(idleMs) && idleMs >= stopAfterMs) {
        const live = await getPodLive(podId);
        const gone = !live.ok || /EXITED|TERMINATED/i.test(live.status);
        if (gone) {
          await db.from(table).update({ status: "stopped" }).eq("id", r.id);
          out.stopped += 1;
          continue;
        }
        const done = await runPodLifecycle(podId, "stop");
        if (!done.ok) {
          out.errors.push(`${table}:${r.id}: stop failed (${done.error})`);
          continue;
        }
        await db.from(table).update({ status: "stopped" }).eq("id", r.id);
        out.stopped += 1;
        continue;
      }
      // Warn stamp: idle past warn but not yet stop-due (records that the
      // warning point passed for closed-browser pods; the audible chime
      // itself only plays in an open tab via the watchdog).
      if (
        r.status === "running" &&
        !r.warn_chimed_at &&
        Number.isFinite(idleMs) &&
        idleMs >= policy.warnMinutes * 60_000
      ) {
        await db.from(table).update({ warn_chimed_at: new Date(nowMs).toISOString() }).eq("id", r.id);
        out.warned += 1;
      }
    } catch (e) {
      out.errors.push(`${table}:${r.id}: ${e instanceof Error ? e.message.slice(0, 120) : "sweep failed"}`);
    }
  }
  return out;
}

async function tick() {
  // Reference the default policy so env misconfig surfaces in logs.
  const policy = getPodIdlePolicy();
  const nowMs = Date.now();
  const [desktops, remotes] = await Promise.all([sweepTable("desktop_pods", nowMs), sweepTable("vcw_autoplay_remotes", nowMs)]);
  const errors = [...desktops.errors, ...remotes.errors];
  if (errors.length > 0) console.error("[cron/pod-sweep]", errors.join("; ").slice(0, 500));
  return ok({
    at: new Date(nowMs).toISOString(),
    policy: { warn_minutes: policy.warnMinutes, stop_grace_minutes: policy.stopGraceMinutes, terminate_hours: policy.terminateHours },
    desktops,
    remotes,
  });
}

export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!authorized(req)) return fail("Unauthorized.", 401);
  return tick();
}

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!authorized(req)) return fail("Unauthorized.", 401);
  return tick();
}
