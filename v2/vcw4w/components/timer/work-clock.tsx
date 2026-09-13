"use client";

/**
 * WorkClock — drift-free professional time tracker (Wave-1, R1 web lane).
 *
 * Drift-free design: elapsed time is derived from `performance.now()` deltas
 * against a stored anchor, not from counting interval ticks — minimized tabs,
 * throttled timers, and event-loop stalls cannot lose or gain seconds.
 * All browser APIs live inside useEffect behind a mounted guard → no
 * SSR/hydration mismatch (axiom §1.2.4). Interop emit is try/catch (fail-open).
 */

import React, { useEffect, useRef, useState } from "react";

export interface TimeEntryData {
  id: string;
  projectId: string;
  projectName: string;
  description: string;
  startedAt: string; // ISO
  endedAt: string | null; // ISO
  durationSeconds: number;
  isBillable: boolean;
  hourlyRateUsd: number;
}

export interface TimeProjectOption {
  id: string;
  name: string;
  colorHex: string;
  hourlyRateUsd: number;
}

interface WorkClockProps {
  projects: TimeProjectOption[];
  /** Called with a finished entry when the user stops the clock. */
  onEntry?: (entry: TimeEntryData) => void;
}

export function formatHMS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export function entryBillUsd(entry: Pick<TimeEntryData, "durationSeconds" | "hourlyRateUsd" | "isBillable">): number {
  if (!entry.isBillable) return 0;
  return (entry.durationSeconds / 3600) * entry.hourlyRateUsd;
}

export function WorkClock({ projects, onEntry }: WorkClockProps) {
  const [mounted, setMounted] = useState(false);
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(true);

  // Anchor for drift-free math. Refs only — never rendered, never hydrated.
  const anchorRef = useRef<{ perfStart: number; wallStart: string; baseMs: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Tick: recompute from the anchor each frame (250ms is display-only).
  useEffect(() => {
    if (!mounted || !running) return;
    const id = window.setInterval(() => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      setElapsedMs(anchor.baseMs + (window.performance.now() - anchor.perfStart));
    }, 250);
    return () => window.clearInterval(id);
  }, [mounted, running]);

  const activeProject = projects.find((p) => p.id === projectId) ?? projects[0];

  const start = () => {
    anchorRef.current = {
      perfStart: window.performance.now(),
      wallStart: new Date().toISOString(),
      baseMs: elapsedMs,
    };
    setRunning(true);
  };

  const pause = () => {
    const anchor = anchorRef.current;
    if (anchor) {
      setElapsedMs(anchor.baseMs + (window.performance.now() - anchor.perfStart));
    }
    anchorRef.current = null;
    setRunning(false);
  };

  const reset = () => {
    anchorRef.current = null;
    setRunning(false);
    setElapsedMs(0);
  };

  const stop = () => {
    const anchor = anchorRef.current;
    const finalMs = anchor
      ? anchor.baseMs + (window.performance.now() - anchor.perfStart)
      : elapsedMs;
    const durationSeconds = Math.floor(finalMs / 1000);
    const entry: TimeEntryData = {
      id: `te-${Date.now()}`,
      projectId: activeProject?.id ?? "unassigned",
      projectName: activeProject?.name ?? "Unassigned",
      description: description.trim() || "Squad work",
      startedAt: anchor?.wallStart ?? new Date(Date.now() - finalMs).toISOString(),
      endedAt: new Date().toISOString(),
      durationSeconds,
      isBillable: billable,
      hourlyRateUsd: activeProject?.hourlyRateUsd ?? 0,
    };
    // Fail-open interop publish (axiom §1.2.5): never let the bus break the clock.
    try {
      window.dispatchEvent(
        new CustomEvent("4weird:time-entry", { detail: { entry } }),
      );
    } catch {
      // ignore — tracking continues without the bus
    }
    onEntry?.(entry);
    anchorRef.current = null;
    setRunning(false);
    setElapsedMs(0);
    setDescription("");
  };

  const seconds = elapsedMs / 1000;
  const earnedUsd =
    billable && activeProject ? (seconds / 3600) * activeProject.hourlyRateUsd : 0;

  // Pre-mount: static readout so SSR HTML matches first client paint.
  if (!mounted) {
    return (
      <div
        className="rounded-2xl border border-white/10 bg-slate-900/60 p-6"
        aria-busy="true"
      >
        <p className="font-mono text-5xl font-black tabular-nums text-white">00:00:00</p>
        <p className="mt-2 text-sm text-slate-500">Loading work clock…</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            {running ? "● Recording" : "○ Stopped"} · drift-free engine
          </p>
          <p
            className="mt-1 font-mono text-5xl font-black tabular-nums text-white"
            aria-live="polite"
            aria-label={`Elapsed ${formatHMS(seconds)}`}
          >
            {formatHMS(seconds)}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {billable ? (
              <>
                Billable @ ${activeProject?.hourlyRateUsd.toFixed(2) ?? "0.00"}/h →{" "}
                <span className="font-semibold text-amber-300">
                  ${earnedUsd.toFixed(2)} · 🪙 {Math.round(earnedUsd * 100).toLocaleString()}
                </span>
              </>
            ) : (
              "Non-billable"
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {!running ? (
            <button
              onClick={start}
              className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-black text-slate-950 hover:bg-emerald-400"
            >
              ▶ Start
            </button>
          ) : (
            <button
              onClick={pause}
              className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-300"
            >
              ⏸ Pause
            </button>
          )}
          <button
            onClick={stop}
            disabled={seconds < 1}
            className="rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-black text-white hover:bg-rose-400 disabled:opacity-40"
          >
            ■ Stop &amp; log
          </button>
          <button
            onClick={reset}
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-white/10"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Project
          </span>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — ${p.hourlyRateUsd.toFixed(2)}/h
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            What are you working on?
          </span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Kanban drag-and-drop polish"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
          />
        </label>
      </div>

      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={billable}
          onChange={(e) => setBillable(e.target.checked)}
          className="h-4 w-4 accent-emerald-500"
        />
        Billable (converts to invoice memorandum at 100 🪙 = $1)
      </label>
    </div>
  );
}
