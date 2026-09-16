"use client";

/**
 * /swarm/control — phone-first control surface for ss3 file-native waves.
 *
 * Single client-component page (no metadata export: client components
 * cannot export metadata). SSR-safe: no window/document access during
 * render; all bus reads happen in effects. Live bus state polls
 * GET /api/swarm-runs every 30s; waves open via POST /api/swarm-runs
 * (login session only, 401 for anonymous).
 *
 * Mode numbers mirror the canonical table lib/swarm-ss2/modes.mjs
 * (boot: public/swarm/ss3.md):
 * CHEAP 10-30 agents, 1-file scopes, snapshot packs; FAST 3-8 scopes +
 * paired spot-checker, full packs, one retry. Both cheap models,
 * FAST ~= 2x CHEAP tokens.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AgentBotNav } from "@/components/agents/agent-bot-nav";

const CHEAP_RANGE = [10, 30] as const;
const FAST_RANGE = [3, 8] as const;
const POLL_MS = 30_000;

type Mode = "cheap" | "fast";
type Target = "desktop" | "cloud-vm";

type RunDoc = {
  id?: string;
  mode?: string;
  agents?: number;
  goal?: string;
  target?: string;
  status?: string;
  log?: string[];
  tokens_total?: number;
  tokens?: number;
  created?: string;
  updated?: string;
};

type TokensRollup = {
  tasks?: number;
  est_in?: number;
  est_out?: number;
  byMode?: Record<string, { tasks?: number; in?: number; out?: number }>;
} | null;

type BusState = {
  open: RunDoc[];
  active: RunDoc[];
  done_recent: RunDoc[];
  ready_count: number;
  locks_live: number;
  stop_present: boolean;
  tokens: TokensRollup;
};

function clampAgents(mode: Mode, n: number): number {
  const [lo, hi] = mode === "cheap" ? CHEAP_RANGE : FAST_RANGE;
  if (!Number.isFinite(n)) return hi;
  return Math.min(hi, Math.max(lo, Math.floor(n)));
}

function ageOf(iso?: string): string {
  if (!iso) return "—";
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmt(n: unknown): string {
  return typeof n === "number" && Number.isFinite(n) ? n.toLocaleString("en-US") : "—";
}

function runTokens(r: RunDoc): number | null {
  const v = r.tokens_total ?? r.tokens;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export default function SwarmControlPage() {
  const [bus, setBus] = useState<BusState | null>(null);
  const [busError, setBusError] = useState<string | null>(null);
  const [goal, setGoal] = useState("");
  const [mode, setMode] = useState<Mode>("cheap");
  const [agents, setAgents] = useState<number>(CHEAP_RANGE[0]);
  const [target, setTarget] = useState<Target>("desktop");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [openedId, setOpenedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/swarm-runs", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as Record<string, unknown>;
      setBus({
        open: Array.isArray(body.open) ? (body.open as RunDoc[]) : [],
        active: Array.isArray(body.active) ? (body.active as RunDoc[]) : [],
        done_recent: Array.isArray(body.done_recent) ? (body.done_recent as RunDoc[]) : [],
        ready_count: typeof body.ready_count === "number" ? body.ready_count : 0,
        locks_live: typeof body.locks_live === "number" ? body.locks_live : 0,
        stop_present: body.stop_present === true,
        tokens: (body.tokens as TokensRollup) ?? null,
      });
      setBusError(null);
    } catch {
      // Fail open: keep the last known state, say so honestly.
      setBusError("Couldn't reach the swarm bus — showing last known state.");
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  // Keep the stepper inside the newly selected mode's range.
  useEffect(() => {
    setAgents((a) => clampAgents(mode, a));
  }, [mode]);

  const rolled = useMemo(() => bus?.tokens ?? null, [bus]);
  const goalLen = goal.trim().length;

  async function submit() {
    if (submitting) return;
    setFormError(null);
    setOpenedId(null);
    if (goalLen < 1 || goalLen > 500) {
      setFormError("Give the wave a goal of 1–500 characters.");
      return;
    }
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/swarm-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, agents: clampAgents(mode, agents), goal: goal.trim(), target }),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (res.status === 401) {
        setFormError("Log in first, then open a wave. Anonymous waves aren't allowed.");
        return;
      }
      if (!res.ok) {
        setFormError(typeof body.error === "string" ? body.error : "Couldn't open a wave. Try again shortly.");
        return;
      }
      setOpenedId(typeof body.id === "string" ? body.id : null);
      setGoal("");
      setConfirming(false);
      void load();
    } catch {
      setFormError("Couldn't reach the swarm bus. Try again shortly.");
    } finally {
      setSubmitting(false);
    }
  }

  const btn =
    "inline-flex min-h-[48px] items-center justify-center rounded-xl px-4 font-bold transition disabled:opacity-50";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-2xl px-4 py-10 md:py-14">
        <Link className="text-cyan-300 hover:underline" href="/swarm">
          ← Swarm
        </Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-violet-300">📡 Swarm control</p>
        <h1 className="mt-2 text-4xl font-black">Open a wave</h1>
        <p className="mt-3 text-slate-300">
          One goal in, a file-native ss3 run out. Agents pick it up from the bus; a STOP file halts pickup while
          in-flight work finishes.
        </p>
        <AgentBotNav current="/swarm/control" />

        {/* 1. Live status cards */}
        <section aria-label="Live swarm status" className="mt-8">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4 text-center">
              <p className="text-3xl font-black text-cyan-300">{bus ? bus.ready_count : "…"}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">Ready tasks</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4 text-center">
              <p className="text-3xl font-black text-violet-300">{bus ? bus.active.length : "…"}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">Active runs</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4 text-center">
              <p className="text-3xl font-black text-emerald-300">{bus ? bus.locks_live : "…"}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">Live locks</p>
            </div>
          </div>
          {bus?.stop_present === true && (
            <p role="alert" className="mt-2 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-center text-sm font-bold text-red-300">
              🛑 STOP is present — pickup halted, in-flight agents finish only.
            </p>
          )}
          {busError && <p className="mt-2 text-center text-sm text-amber-300">{busError}</p>}
        </section>

        {/* 2. Open a wave */}
        <section aria-label="Open a wave" className="mt-8 rounded-2xl border border-white/10 bg-white/[.03] p-4 md:p-5">
          <h2 className="text-xl font-black">Open a wave</h2>
          <label className="mt-4 block text-sm font-bold text-slate-200" htmlFor="swarm-goal">
            Goal <span className="font-normal text-slate-400">({goalLen}/500)</span>
          </label>
          <textarea
            id="swarm-goal"
            value={goal}
            onChange={(e) => {
              setGoal(e.target.value.slice(0, 600));
              setConfirming(false);
            }}
            rows={4}
            maxLength={600}
            placeholder="e.g. Fix the lobby join timeout and add a gate test"
            className="mt-2 min-h-[96px] w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-base text-white placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
          />

          <p className="mt-4 text-sm font-bold text-slate-200" id="swarm-mode-label">
            Mode
          </p>
          <div role="group" aria-labelledby="swarm-mode-label" className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("cheap");
                setConfirming(false);
              }}
              aria-pressed={mode === "cheap"}
              className={`${btn} border ${mode === "cheap" ? "border-cyan-300 bg-cyan-300/15 text-cyan-200" : "border-white/15 text-slate-300"}`}
            >
              CHEAP · thrifty
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("fast");
                setConfirming(false);
              }}
              aria-pressed={mode === "fast"}
              className={`${btn} border ${mode === "fast" ? "border-violet-300 bg-violet-400/15 text-violet-200" : "border-white/15 text-slate-300"}`}
            >
              FAST · hastey-wastey
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            {mode === "cheap"
              ? "10–30 agents · 1 file per scope · snapshot packs · no retries."
              : "3–8 scopes + paired spot-checker each · full packs · one retry."}{" "}
            FAST ≈ 2x tokens, 3-5x faster wall-clock.
          </p>

          <div className="mt-4 flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-slate-200" id="swarm-agents-label">
              Agents
            </p>
            <div role="group" aria-labelledby="swarm-agents-label" className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Fewer agents"
                onClick={() => {
                  setAgents((a) => clampAgents(mode, a - 1));
                  setConfirming(false);
                }}
                className={`${btn} w-12 border border-white/15 text-xl text-slate-200`}
              >
                −
              </button>
              <span aria-live="polite" className="w-10 text-center text-2xl font-black">
                {agents}
              </span>
              <button
                type="button"
                aria-label="More agents"
                onClick={() => {
                  setAgents((a) => clampAgents(mode, a + 1));
                  setConfirming(false);
                }}
                className={`${btn} w-12 border border-white/15 text-xl text-slate-200`}
              >
                +
              </button>
            </div>
          </div>

          <p className="mt-4 text-sm font-bold text-slate-200" id="swarm-target-label">
            Run on
          </p>
          <div role="group" aria-labelledby="swarm-target-label" className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setTarget("desktop");
                setConfirming(false);
              }}
              aria-pressed={target === "desktop"}
              className={`${btn} border ${target === "desktop" ? "border-cyan-300 bg-cyan-300/15 text-cyan-200" : "border-white/15 text-slate-300"}`}
            >
              This desktop
            </button>
            <button
              type="button"
              onClick={() => {
                setTarget("cloud-vm");
                setConfirming(false);
              }}
              aria-pressed={target === "cloud-vm"}
              className={`${btn} border ${target === "cloud-vm" ? "border-cyan-300 bg-cyan-300/15 text-cyan-200" : "border-white/15 text-slate-300"}`}
            >
              Cloud VM
            </button>
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="mt-5 inline-flex min-h-[56px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-4 text-lg font-black text-slate-950 transition disabled:opacity-50"
          >
            {submitting ? "Opening…" : confirming ? "Tap again to confirm this wave" : "Open wave"}
          </button>
          {formError && (
            <p role="alert" className="mt-2 text-sm font-bold text-red-300">
              {formError}
            </p>
          )}
          {openedId && (
            <p role="status" className="mt-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-200">
              ✅ Wave open: {openedId} — agents will pick it up from the bus.
            </p>
          )}
        </section>

        {/* 3. Active runs */}
        <section aria-label="Active runs" className="mt-8">
          <h2 className="text-xl font-black">Active runs</h2>
          {!bus ? (
            <p className="mt-2 text-sm text-slate-500">Loading runs…</p>
          ) : bus.active.length === 0 ? (
            <p className="mt-2 rounded-2xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400">
              No active runs right now. Open a wave above and it will appear here once picked up.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {bus.active.map((r, i) => {
                const tail = Array.isArray(r.log) ? r.log.slice(-2) : [];
                const spend = runTokens(r);
                return (
                  <li key={r.id ?? i} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-black ${r.mode === "fast" ? "bg-violet-400/20 text-violet-200" : "bg-cyan-400/15 text-cyan-200"}`}
                      >
                        {(r.mode ?? "?").toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-400">
                        ×{typeof r.agents === "number" ? r.agents : "?"} agents · {ageOf(r.updated ?? r.created)}
                      </span>
                      {spend !== null && <span className="text-xs text-slate-400">· ~{fmt(spend)} tok</span>}
                    </div>
                    <p className="mt-1 font-bold">{r.goal ?? r.id ?? "Untitled run"}</p>
                    {tail.length > 0 && (
                      <ul className="mt-2 space-y-1 border-l-2 border-white/10 pl-2 text-xs text-slate-400">
                        {tail.map((line, j) => (
                          <li key={j} className="break-words">
                            {line}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 4. Tokens */}
        <section aria-label="Token spend" className="mt-8 rounded-2xl border border-white/10 bg-white/[.03] p-4 md:p-5">
          <h2 className="text-xl font-black">Token spend</h2>
          {!bus ? (
            <p className="mt-2 text-sm text-slate-500">Loading totals…</p>
          ) : !rolled ? (
            <p className="mt-2 text-sm text-slate-400">
              No token rollup yet — spend appears here after agents log their first tasks.
            </p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-900 p-3">
                  <p className="text-2xl font-black">{fmt(rolled.tasks)}</p>
                  <p className="text-xs uppercase tracking-wider text-slate-400">tasks</p>
                </div>
                <div className="rounded-xl bg-slate-900 p-3">
                  <p className="text-2xl font-black">{fmt(rolled.est_in)}</p>
                  <p className="text-xs uppercase tracking-wider text-slate-400">est in</p>
                </div>
                <div className="rounded-xl bg-slate-900 p-3">
                  <p className="text-2xl font-black">{fmt(rolled.est_out)}</p>
                  <p className="text-xs uppercase tracking-wider text-slate-400">est out</p>
                </div>
              </div>
              {rolled.byMode && Object.keys(rolled.byMode).length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-slate-300">
                  {Object.entries(rolled.byMode).map(([m, s]) => (
                    <li key={m} className="flex justify-between gap-2">
                      <span className="font-bold">{m}</span>
                      <span className="text-slate-400">
                        {fmt(s.tasks)} tasks · {fmt(s.in)} in · {fmt(s.out)} out
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          <p className="mt-3 text-xs text-slate-500">Token figures are agent-reported estimates (±15%), not metered billing.</p>
        </section>
      </div>
    </main>
  );
}
