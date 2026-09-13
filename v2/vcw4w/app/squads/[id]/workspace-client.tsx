"use client";

/**
 * SquadWorkspaceClient — private squad project workspace viewport (Wave-1, R1 web lane).
 * Follows remastery README §4.1 blueprint. Demo data via props (fail-open until
 * Supabase squad_projects wiring lands); wallet math honors 100 🪙 = $1.
 */

import Link from "next/link";
import { coinsToUsd } from "@/components/kanban/kanban-types";

export interface WorkspaceProject {
  id: string;
  name: string;
  description: string;
  targetGameSlug?: string;
  contributorsCount: number;
}

interface SquadWorkspaceClientProps {
  squadId: string;
  squadName: string;
  tagline: string;
  walletCoins: number;
  projects: WorkspaceProject[];
  currentSprintName: string;
  sprintProgress: number;
  weekHours: number;
}

export function SquadWorkspaceClient({
  squadId,
  squadName,
  tagline,
  walletCoins,
  projects,
  currentSprintName,
  sprintProgress,
  weekHours,
}: SquadWorkspaceClientProps) {
  const clamped = Math.max(0, Math.min(100, sprintProgress));
  return (
    <div className="space-y-8">
      {/* Header banner */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 backdrop-blur">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-white">{squadName}</h1>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-0.5 text-xs font-bold text-emerald-400">
                🛡 Private Squad
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-slate-300">{tagline}</p>
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-right">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Shared squad wallet
            </p>
            <p className="mt-1 text-3xl font-black text-amber-300">
              🪙 {walletCoins.toLocaleString()}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              ${coinsToUsd(walletCoins).toFixed(2)} USD for cloud/compute · 100 🪙 = $1
            </p>
          </div>
        </div>
      </div>

      {/* Navigation hub */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Link
          href={`/squads/${squadId}/kanban`}
          className="group rounded-2xl border border-white/10 bg-slate-900/40 p-6 transition hover:border-amber-400/50 hover:bg-slate-900/70"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl" aria-hidden="true">📋</span>
            <span className="text-xs font-bold text-slate-400">{clamped}% done</span>
          </div>
          <h3 className="mt-4 text-lg font-bold text-white group-hover:text-amber-300">
            Sprint Kanban Board
          </h3>
          <p className="mt-1 text-sm text-slate-300">Active: {currentSprintName}</p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-amber-400"
              style={{ width: `${clamped}%` }}
            />
          </div>
        </Link>

        <Link
          href="/timer/pro"
          className="group rounded-2xl border border-white/10 bg-slate-900/40 p-6 transition hover:border-amber-400/50 hover:bg-slate-900/70"
        >
          <span className="text-2xl" aria-hidden="true">⏱️</span>
          <h3 className="mt-4 text-lg font-bold text-white group-hover:text-amber-300">
            Time Tracker
          </h3>
          <p className="mt-1 text-sm text-slate-300">
            {weekHours.toFixed(1)} hrs logged this week · drift-free clock, 1-click invoice
            memoranda
          </p>
          <p className="mt-4 text-xs font-bold text-amber-300">Open Work Clock →</p>
        </Link>

        <Link
          href="/business/invoices"
          className="group rounded-2xl border border-white/10 bg-slate-900/40 p-6 transition hover:border-amber-400/50 hover:bg-slate-900/70"
        >
          <span className="text-2xl" aria-hidden="true">🧾</span>
          <h3 className="mt-4 text-lg font-bold text-white group-hover:text-amber-300">
            Invoices &amp; Memoranda
          </h3>
          <p className="mt-1 text-sm text-slate-300">
            Convert tracked hours into client-ready invoices (30-day trash recovery)
          </p>
          <p className="mt-4 text-xs font-bold text-emerald-400">View Invoices →</p>
        </Link>
      </div>

      {/* Projects list */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <span aria-hidden="true">📂</span> Squad Code &amp; Game Projects
          </h2>
          <span className="rounded-xl bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-slate-950 opacity-60">
            + New Project (wires to squad_projects API)
          </span>
        </div>
        <div className="divide-y divide-white/5">
          {projects.map((proj) => (
            <div key={proj.id} className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <h4 className="font-bold text-white">{proj.name}</h4>
                <p className="mt-0.5 text-xs text-slate-400">{proj.description}</p>
                {proj.targetGameSlug ? (
                  <p className="mt-0.5 font-mono text-[11px] text-cyan-400">
                    target: {proj.targetGameSlug}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className="text-xs text-slate-400">
                  👥 {proj.contributorsCount} contributor{proj.contributorsCount === 1 ? "" : "s"}
                </span>
                <span className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white">
                  Open Project
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
