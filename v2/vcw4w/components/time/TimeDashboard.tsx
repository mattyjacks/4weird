"use client";

import { useMemo } from "react";
import { TimerEntry, TimerProject, formatGhostCash, formatDurationShort } from "@/types/time";
import { TimerWidget } from "./TimerWidget";

interface TimerStartData {
  projectId?: string;
  debtorId?: string;
  description?: string;
  isBillable?: boolean;
  upworkSyncMode?: boolean;
  upworkContractId?: string;
  upworkMemo?: string;
}

interface TimerStopData {
  projectId?: string;
  description?: string;
  isBillable?: boolean;
}

interface TimeDashboardProps {
  entries: TimerEntry[];
  projects: TimerProject[];
  runningTimer: TimerEntry | null;
  onNavigate: (view: string) => void;
  onTimerStart: (data: TimerStartData) => Promise<void>;
  onTimerStop: (data?: TimerStopData) => Promise<void>;
  onTimerDiscard: () => Promise<void>;
  onRefresh: () => void;
}

export function TimeDashboard({
  entries,
  projects,
  runningTimer,
  onNavigate,
  onTimerStart,
  onTimerStop,
  onTimerDiscard,
  onRefresh,
}: TimeDashboardProps) {
  const stats = useMemo(() => {
    const totalSecs = entries.reduce((acc, e) => acc + (e.duration || 0), 0);
    const totalGhost = entries.reduce((acc, e) => acc + (e.ghostCashOwed || 0), 0);
    const billableSecs = entries.filter((e) => e.isBillable).reduce((acc, e) => acc + (e.duration || 0), 0);
    const avgScore = entries.length > 0
      ? Math.round(entries.reduce((acc, e) => acc + (e.activityScore || 100), 0) / entries.length)
      : 100;

    return {
      totalSecs,
      totalGhost,
      billableSecs,
      avgScore,
      recent: entries.slice(0, 5),
    };
  }, [entries]);

  return (
    <div className="space-y-6">
      {/* Active Timer Widget */}
      <TimerWidget
        projects={projects}
        runningTimer={runningTimer}
        onTimerStart={onTimerStart}
        onTimerStop={onTimerStop}
        onTimerDiscard={onTimerDiscard}
        onRefresh={onRefresh}
      />

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-white/10 bg-zinc-950/60 space-y-1">
          <p className="text-xs text-zinc-400">Total Time Logged</p>
          <p className="text-2xl font-bold font-mono text-white">{formatDurationShort(stats.totalSecs)}</p>
        </div>

        <div className="p-4 rounded-xl border border-white/10 bg-zinc-950/60 space-y-1">
          <p className="text-xs text-zinc-400">Ghost Cash Accrued</p>
          <p className="text-2xl font-bold font-mono text-emerald-400">{formatGhostCash(stats.totalGhost)}</p>
        </div>

        <div className="p-4 rounded-xl border border-white/10 bg-zinc-950/60 space-y-1">
          <p className="text-xs text-zinc-400">Billable Work</p>
          <p className="text-2xl font-bold font-mono text-cyan-400">{formatDurationShort(stats.billableSecs)}</p>
        </div>

        <div className="p-4 rounded-xl border border-white/10 bg-zinc-950/60 space-y-1">
          <p className="text-xs text-zinc-400">Avg Activity Proof</p>
          <p className="text-2xl font-bold font-mono text-amber-400">{stats.avgScore}%</p>
        </div>
      </div>

      {/* Recent Work Diary Sessions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-300">Recent Work Diary Sessions</h3>
          <button
            onClick={() => onNavigate("entries")}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            View all entries →
          </button>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-950/40 divide-y divide-white/5">
          {stats.recent.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500">No recent sessions logged yet.</div>
          ) : (
            stats.recent.map((e) => (
              <div key={e.id} className="p-3.5 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <p className="text-white font-medium">{e.description || "Work session"}</p>
                  <p className="text-zinc-500">
                    {new Date(e.startTime).toLocaleDateString()} • {e.project?.name || "No project"}
                  </p>
                </div>
                <div className="text-right font-mono">
                  <div className="text-white font-bold">{formatDurationShort(e.duration || 0)}</div>
                  <div className="text-emerald-400 font-semibold">{formatGhostCash(e.ghostCashOwed)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
