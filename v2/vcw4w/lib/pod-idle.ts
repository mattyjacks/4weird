/**
 * Pod idle lifecycle policy: warn with a chime, then stop, then terminate.
 *
 * Client-safe (no secrets, no server imports). Both the browser watchdog
 * (`components/runpod/pod-idle-watch.tsx`) and the server sweep
 * (`/api/cron/pod-sweep`) share these defaults and helpers so the two
 * enforcers never disagree about what "idle" means.
 *
 * Defaults (operator-overridable via env, user-overridable per pod):
 * - 60 minutes of no input → warning chime + banner (stays running).
 * - 15 more minutes of no input after the warning → pod STOPPED
 *   (releases GPU/CPU, keeps disk; storage still bills until terminate).
 * - 24 hours since creation without being tended → pod TERMINATED
 *   (disk lost, billing ends permanently).
 *
 * "Activity" = any input the browser sees (mouse, keyboard, touch, wheel)
 * reported via the heartbeat route, or any pod control action (stop/start/
 * restart counts as tending). The server sweep is the backstop for closed
 * browsers; the client watchdog is the fast path with the audible chime
 * (servers cannot ring a browser tab).
 */

export const POD_IDLE_WARN_MINUTES_DEFAULT = 60;
export const POD_IDLE_STOP_GRACE_MINUTES_DEFAULT = 15;
export const POD_TERMINATE_AFTER_HOURS_DEFAULT = 24;

export const POD_IDLE_WARN_MINUTES_MIN = 5;
export const POD_IDLE_WARN_MINUTES_MAX = 240;
export const POD_IDLE_STOP_GRACE_MINUTES_MIN = 1;
export const POD_IDLE_STOP_GRACE_MINUTES_MAX = 120;
export const POD_TERMINATE_AFTER_HOURS_MIN = 1;
export const POD_TERMINATE_AFTER_HOURS_MAX = 168;

export type PodIdlePolicy = {
  /** Minutes of no input before the warning chime + banner. */
  warnMinutes: number;
  /** More minutes of no input after the warning before STOP. */
  stopGraceMinutes: number;
  /** Hours after creation without tending before TERMINATE. */
  terminateHours: number;
};

function clampInt(v: unknown, fallback: number, min: number, max: number): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function envInt(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === null || String(raw).trim() === "") return fallback;
  return clampInt(String(raw).trim(), fallback, min, max);
}

/** Server-side policy: env overrides, clamped to sane bounds. */
export function getPodIdlePolicy(): PodIdlePolicy {
  return {
    warnMinutes: envInt(
      "POD_IDLE_WARN_MINUTES",
      POD_IDLE_WARN_MINUTES_DEFAULT,
      POD_IDLE_WARN_MINUTES_MIN,
      POD_IDLE_WARN_MINUTES_MAX,
    ),
    stopGraceMinutes: envInt(
      "POD_IDLE_STOP_MINUTES",
      POD_IDLE_STOP_GRACE_MINUTES_DEFAULT,
      POD_IDLE_STOP_GRACE_MINUTES_MIN,
      POD_IDLE_STOP_GRACE_MINUTES_MAX,
    ),
    terminateHours: envInt(
      "POD_TERMINATE_AFTER_HOURS",
      POD_TERMINATE_AFTER_HOURS_DEFAULT,
      POD_TERMINATE_AFTER_HOURS_MIN,
      POD_TERMINATE_AFTER_HOURS_MAX,
    ),
  };
}

/** Per-pod overrides (nullable columns / localStorage) win over the default. */
export function resolvePodPolicy(overrides?: {
  warnMinutes?: number | null;
  stopGraceMinutes?: number | null;
  terminateHours?: number | null;
}): PodIdlePolicy {
  const base = getPodIdlePolicy();
  return {
    warnMinutes:
      overrides?.warnMinutes === null || overrides?.warnMinutes === undefined
        ? base.warnMinutes
        : clampInt(overrides.warnMinutes, base.warnMinutes, POD_IDLE_WARN_MINUTES_MIN, POD_IDLE_WARN_MINUTES_MAX),
    stopGraceMinutes:
      overrides?.stopGraceMinutes === null || overrides?.stopGraceMinutes === undefined
        ? base.stopGraceMinutes
        : clampInt(
            overrides.stopGraceMinutes,
            base.stopGraceMinutes,
            POD_IDLE_STOP_GRACE_MINUTES_MIN,
            POD_IDLE_STOP_GRACE_MINUTES_MAX,
          ),
    terminateHours:
      overrides?.terminateHours === null || overrides?.terminateHours === undefined
        ? base.terminateHours
        : clampInt(
            overrides.terminateHours,
            base.terminateHours,
            POD_TERMINATE_AFTER_HOURS_MIN,
            POD_TERMINATE_AFTER_HOURS_MAX,
          ),
  };
}

/** Validate user-supplied overrides from the policy form (returns errors). */
export function validatePodPolicyInput(input: {
  warnMinutes?: unknown;
  stopGraceMinutes?: unknown;
  terminateHours?: unknown;
}): { ok: true; value: PodIdlePolicy } | { ok: false; error: string } {
  const w = input.warnMinutes === undefined || input.warnMinutes === null || input.warnMinutes === "" ? null : Number(input.warnMinutes);
  const s =
    input.stopGraceMinutes === undefined || input.stopGraceMinutes === null || input.stopGraceMinutes === ""
      ? null
      : Number(input.stopGraceMinutes);
  const t =
    input.terminateHours === undefined || input.terminateHours === null || input.terminateHours === ""
      ? null
      : Number(input.terminateHours);
  const base = getPodIdlePolicy();
  const merged = resolvePodPolicy({
    warnMinutes: w === null ? null : Math.floor(w),
    stopGraceMinutes: s === null ? null : Math.floor(s),
    terminateHours: t === null ? null : Math.floor(t),
  });
  if (w !== null && (!Number.isFinite(w) || Math.floor(w) < POD_IDLE_WARN_MINUTES_MIN || Math.floor(w) > POD_IDLE_WARN_MINUTES_MAX)) {
    return { ok: false, error: `warnMinutes must be ${POD_IDLE_WARN_MINUTES_MIN}-${POD_IDLE_WARN_MINUTES_MAX} minutes.` };
  }
  if (
    s !== null &&
    (!Number.isFinite(s) || Math.floor(s) < POD_IDLE_STOP_GRACE_MINUTES_MIN || Math.floor(s) > POD_IDLE_STOP_GRACE_MINUTES_MAX)
  ) {
    return {
      ok: false,
      error: `stopGraceMinutes must be ${POD_IDLE_STOP_GRACE_MINUTES_MIN}-${POD_IDLE_STOP_GRACE_MINUTES_MAX} minutes.`,
    };
  }
  if (
    t !== null &&
    (!Number.isFinite(t) || Math.floor(t) < POD_TERMINATE_AFTER_HOURS_MIN || Math.floor(t) > POD_TERMINATE_AFTER_HOURS_MAX)
  ) {
    return {
      ok: false,
      error: `terminateHours must be ${POD_TERMINATE_AFTER_HOURS_MIN}-${POD_TERMINATE_AFTER_HOURS_MAX} hours.`,
    };
  }
  void base;
  return { ok: true, value: merged };
}

export type PodIdlePhase = "active" | "warned" | "stop_due" | "terminate_due";

/**
 * Pure phase computation (unit-testable): given ms since last activity and
 * ms since creation, which lifecycle step is due?
 */
export function podIdlePhase(
  idleMs: number,
  ageMs: number,
  policy: PodIdlePolicy = {
    warnMinutes: POD_IDLE_WARN_MINUTES_DEFAULT,
    stopGraceMinutes: POD_IDLE_STOP_GRACE_MINUTES_DEFAULT,
    terminateHours: POD_TERMINATE_AFTER_HOURS_DEFAULT,
  },
): PodIdlePhase {
  const idle = Number(idleMs);
  const age = Number(ageMs);
  if (Number.isFinite(age) && age >= policy.terminateHours * 3_600_000) return "terminate_due";
  if (!Number.isFinite(idle) || idle < 0) return "active";
  if (idle >= (policy.warnMinutes + policy.stopGraceMinutes) * 60_000) return "stop_due";
  if (idle >= policy.warnMinutes * 60_000) return "warned";
  return "active";
}

/** One-line human summary used in the control pane + sweep notes. */
export function describePodIdlePolicy(policy: PodIdlePolicy): string {
  return (
    `After ${policy.warnMinutes} min with no input: warning chime + banner. ` +
    `After ${policy.stopGraceMinutes} more min idle: pod stops (disk kept). ` +
    `After ${policy.terminateHours}h untended: pod terminates (disk lost).`
  );
}

/** Local-storage keys for the per-browser watchdog preferences. */
export const POD_POLICY_STORAGE_KEY = "fourweird:pod-policy";

// ---------------------------------------------------------------------------
// Long-term idle policy (DigitalOcean droplets, volumes, snapshots).
//
// ADDITIVE ONLY: nothing above (RunPod warn → stop → terminate) is changed.
// DO boxes are persistent servers rented for days/weeks, so the short-burst
// RunPod lifecycle must never apply to them: warn once, never auto-stop,
// never auto-terminate — nudge the owner to snapshot instead.
// ---------------------------------------------------------------------------

/** Long-term (DigitalOcean) idle policy: nudge, never destroy. */
export const DO_IDLE_POLICY = {
  /** Days idle before the warning nudge fires. */
  warnDays: 7,
  /** Droplets are never auto-stopped by any sweep. */
  stopNever: true,
  /** Nudges point at snapshots (point-in-time keeps) instead of shutdown. */
  snapshotHint: true,
} as const;

/**
 * True when a provider code identifies a long-term resource (DigitalOcean),
 * which the warn-only DO policy covers instead of the RunPod lifecycle.
 * Accepts provider codes ("digitalocean"), short aliases ("do"), and
 * resource nouns ("droplet"); anything else (incl. "runpod") is short-term.
 */
export function isLongTermResource(provider: unknown): boolean {
  const p = String(provider ?? "").trim().toLowerCase();
  return p === "digitalocean" || p === "digital-ocean" || p === "do" || p === "droplet";
}

/**
 * Human advice for a long-term resource idle since `lastActivityAt`
 * (DigitalOcean droplets expose no heartbeat, so callers pass `created_at`
 * as the idle proxy). Always warn-only: nudge after 7d, never
 * auto-terminate — snapshot instead.
 */
export function longTermIdleAdvice(
  lastActivityAt: string | number | Date | null | undefined,
): string {
  if (lastActivityAt === null || lastActivityAt === undefined || String(lastActivityAt).trim() === "") {
    return "DO droplet idle age unknown — nudge after 7d, never auto-terminate — snapshot instead.";
  }
  const t =
    lastActivityAt instanceof Date
      ? lastActivityAt.getTime()
      : new Date(lastActivityAt as string).getTime();
  if (!Number.isFinite(t)) {
    return "DO droplet idle age unknown — nudge after 7d, never auto-terminate — snapshot instead.";
  }
  const days = Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
  return `DO droplet idle ${days}d — nudge after 7d, never auto-terminate — snapshot instead.`;
}
