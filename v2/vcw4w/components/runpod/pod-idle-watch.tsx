"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  POD_IDLE_STOP_GRACE_MINUTES_MAX,
  POD_IDLE_STOP_GRACE_MINUTES_MIN,
  POD_IDLE_WARN_MINUTES_MAX,
  POD_IDLE_WARN_MINUTES_MIN,
  POD_TERMINATE_AFTER_HOURS_MAX,
  POD_TERMINATE_AFTER_HOURS_MIN,
  describePodIdlePolicy,
  type PodIdlePolicy,
} from "@/lib/pod-idle";

function playWarnChime(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    // Two-tone warning chime (880 → 660 Hz), three pulses. No audio file.
    [0, 0.45, 0.9].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(i % 2 === 0 ? 880 : 660, now + offset);
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.42);
    });
    window.setTimeout(() => void ctx.close().catch(() => undefined), 2000);
  } catch {
    // Audio unavailable (autoplay policy, headless): the banner still shows.
  }
}

function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return m > 0 ? `${m}m ${String(rest).padStart(2, "0")}s` : `${rest}s`;
}

type Props = {
  /** POST heartbeat here on input (throttled): /api/desktop/[id]/heartbeat */
  heartbeatUrl: string | null;
  /** POST {action:"stop"} here when the grace expires. */
  stopUrl: string | null;
  /** Effective policy (server default merged with per-pod overrides). */
  policy: PodIdlePolicy;
  /** Pod label for messages, e.g. "GPU Desktop" or "Autoplay (grave-gain)". */
  label: string;
  /** Compact mode renders one line (dashboard cards); full mode explains. */
  compact?: boolean;
};

/**
 * Idle watchdog: tracks input in THIS tab, rings a warning chime + banner
 * after warnMinutes of no input, and stops the pod after stopGraceMinutes
 * more idle minutes. Heartbeats the server (throttled to 1/min + on warn)
 * so the server sweep agrees about last activity. Terminating after
 * terminateHours is server-side only (sweep) - this component shows the age.
 */
export function PodIdleWatch({ heartbeatUrl, stopUrl, policy, label, compact }: Props) {
  const [idleMs, setIdleMs] = useState(0);
  const [warned, setWarned] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [stopError, setStopError] = useState("");
  const lastInput = useRef<number>(Date.now());
  const chimed = useRef(false);
  const lastBeat = useRef(0);

  const beat = useCallback(
    async (forceWarned = false) => {
      if (!heartbeatUrl) return;
      const now = Date.now();
      if (!forceWarned && now - lastBeat.current < 60_000) return;
      lastBeat.current = now;
      try {
        await fetch(heartbeatUrl, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(forceWarned ? { warned: true } : {}),
        });
      } catch {
        // Best-effort: the sweep still enforces server-side.
      }
    },
    [heartbeatUrl],
  );

  useEffect(() => {
    lastInput.current = Date.now();
    const poke = () => {
      lastInput.current = Date.now();
      setWarned(false);
      void beat(false);
    };
    const events: (keyof WindowEventMap)[] = ["mousedown", "keydown", "touchstart", "wheel", "pointerdown"];
    events.forEach((e) => window.addEventListener(e, poke, { passive: true }));
    void beat(false);
    const timer = window.setInterval(() => {
      const idle = Date.now() - lastInput.current;
      setIdleMs(idle);
      const warnAt = policy.warnMinutes * 60_000;
      const stopAt = (policy.warnMinutes + policy.stopGraceMinutes) * 60_000;
      if (idle >= warnAt && !chimed.current) {
        chimed.current = true;
        setWarned(true);
        playWarnChime();
        void beat(true);
      }
      if (idle >= stopAt && !stopped) {
        // Stop once: fire the pod stop, then freeze the watchdog.
        void (async () => {
          if (!stopUrl) return;
          try {
            const res = await fetch(stopUrl, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "stop" }),
            });
            const body = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
            if (!body.success) throw new Error(String(body.error ?? `Stop failed (${res.status}).`));
            setStopped(true);
          } catch (e) {
            setStopError(e instanceof Error ? e.message : "Auto-stop failed; stop the pod manually - it may still bill.");
          }
        })();
      }
    }, 1000);
    return () => {
      window.clearInterval(timer);
      events.forEach((e) => window.removeEventListener(e, poke));
    };
    // stopped/chimed are write-only here; policy/urls drive the loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heartbeatUrl, stopUrl, policy.warnMinutes, policy.stopGraceMinutes]);

  const warnAt = policy.warnMinutes * 60_000;
  const stopAt = (policy.warnMinutes + policy.stopGraceMinutes) * 60_000;
  const toWarn = warnAt - idleMs;

  if (stopped) {
    return (
      <p role="status" className={compact ? "mt-1 text-xs text-amber-300" : "mt-3 rounded-xl border border-amber-300/40 bg-amber-300/[.08] p-4 text-sm text-amber-100"}>
        🛑 {label} auto-stopped after {policy.warnMinutes + policy.stopGraceMinutes} idle minutes. Billing for compute ended (disk kept). Restart it from the control pane anytime.
      </p>
    );
  }

  if (warned) {
    const toStop = stopAt - idleMs;
    return (
      <div role="alert" className={compact ? "mt-1 text-xs text-amber-200" : "mt-3 rounded-xl border border-amber-300/50 bg-amber-300/[.1] p-4 text-sm text-amber-100"}>
        <p className="font-bold">🔔 {label}: no input for {policy.warnMinutes} min - stopping in {fmtCountdown(toStop)}.</p>
        {!compact && (
          <p className="mt-1 text-xs">
            Move the mouse or press any key in this tab to keep it running. Unattended pods stop automatically (disk kept);
            after {policy.terminateHours}h untended they terminate (disk lost). {describePodIdlePolicy(policy)}
          </p>
        )}
        {stopError && <p className="mt-1 text-xs text-red-300">{stopError}</p>}
      </div>
    );
  }

  if (compact) {
    return (
      <p className="mt-1 text-[11px] text-slate-500" title={describePodIdlePolicy(policy)}>
        Idle guard: chime in {fmtCountdown(toWarn)} of no input · auto-stop +{policy.stopGraceMinutes}m · terminate {policy.terminateHours}h
      </p>
    );
  }
  return (
    <p className="mt-2 text-xs text-slate-500" title={describePodIdlePolicy(policy)}>
      🔔 Idle guard armed: {fmtCountdown(toWarn)} of no input until the warning chime, then auto-stop {policy.stopGraceMinutes} min later
      (disk kept), terminate after {policy.terminateHours}h untended. Any input in this tab resets the clock.
    </p>
  );
}

/** Shared numeric policy fields (used by the launch + per-pod policy forms). */
export function PolicyFields({
  warn,
  setWarn,
  grace,
  setGrace,
  term,
  setTerm,
  prefix,
}: {
  warn: string;
  setWarn: (v: string) => void;
  grace: string;
  setGrace: (v: string) => void;
  term: string;
  setTerm: (v: string) => void;
  prefix: string;
}) {
  return (
    <fieldset className="grid gap-3 sm:grid-cols-3">
      <label className="text-xs text-slate-300">
        Warn chime after (min, {POD_IDLE_WARN_MINUTES_MIN}-{POD_IDLE_WARN_MINUTES_MAX})
        <input
          id={`${prefix}-warn`}
          type="number"
          min={POD_IDLE_WARN_MINUTES_MIN}
          max={POD_IDLE_WARN_MINUTES_MAX}
          step={1}
          value={warn}
          onChange={(e) => setWarn(e.target.value)}
          placeholder="60"
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-white"
        />
      </label>
      <label className="text-xs text-slate-300">
        Stop after warn (+min, {POD_IDLE_STOP_GRACE_MINUTES_MIN}-{POD_IDLE_STOP_GRACE_MINUTES_MAX})
        <input
          id={`${prefix}-grace`}
          type="number"
          min={POD_IDLE_STOP_GRACE_MINUTES_MIN}
          max={POD_IDLE_STOP_GRACE_MINUTES_MAX}
          step={1}
          value={grace}
          onChange={(e) => setGrace(e.target.value)}
          placeholder="15"
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-white"
        />
      </label>
      <label className="text-xs text-slate-300">
        Terminate untended after (h, {POD_TERMINATE_AFTER_HOURS_MIN}-{POD_TERMINATE_AFTER_HOURS_MAX})
        <input
          id={`${prefix}-term`}
          type="number"
          min={POD_TERMINATE_AFTER_HOURS_MIN}
          max={POD_TERMINATE_AFTER_HOURS_MAX}
          step={1}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="24"
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-white"
        />
      </label>
    </fieldset>
  );
}
