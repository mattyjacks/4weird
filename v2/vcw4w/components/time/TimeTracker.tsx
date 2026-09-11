"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  Clock,
  Folder,
  BarChart3,
  Users,
  Coins,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimerEntry, TimerProject, GhostDebt } from "@/types/time";
import { TimerWidget } from "./TimerWidget";
import { TimeEntryList } from "./TimeEntryList";
import { ProjectManager } from "./ProjectManager";
import { TimeReports } from "./TimeReports";
import { GhostDebtManager } from "./GhostDebtManager";
import { TimeDashboard } from "./TimeDashboard";

type View = "dashboard" | "timer" | "entries" | "projects" | "reports" | "debts";

export function TimeTracker() {
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [isLoading, setIsLoading] = useState(true);

  const [entries, setEntries] = useState<TimerEntry[]>([]);
  const [projects, setProjects] = useState<TimerProject[]>([]);
  const [debts, setDebts] = useState<GhostDebt[]>([]);
  const [runningTimer, setRunningTimer] = useState<TimerEntry | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [entriesRes, projectsRes, timerRes, debtsRes] = await Promise.all([
        fetch("/api/time"),
        fetch("/api/time/projects"),
        fetch("/api/time/timer"),
        fetch("/api/time/debts"),
      ]);

      const [entriesData, projectsData, timerData, debtsData] = await Promise.all([
        entriesRes.ok ? entriesRes.json() : { entries: [] },
        projectsRes.ok ? projectsRes.json() : { projects: [] },
        timerRes.ok ? timerRes.json() : { timer: null },
        debtsRes.ok ? debtsRes.json() : { debts: [] },
      ]);

      setEntries(entriesData.entries || []);
      setProjects(projectsData.projects || []);
      setRunningTimer(timerData.timer || null);
      setDebts(debtsData.debts || []);
    } catch (e) {
      console.error("Failed to load timer data", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTimerStart = async (data: any) => {
    const res = await fetch("/api/time/timer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      await fetchData();
    }
  };

  const handleTimerStop = async (data?: any) => {
    const res = await fetch("/api/time/timer", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data || {}),
    });
    if (res.ok) {
      await fetchData();
    }
  };

  const handleTimerDiscard = async () => {
    const res = await fetch("/api/time/timer", {
      method: "DELETE",
    });
    if (res.ok) {
      await fetchData();
    }
  };

  const handleEntryDelete = async (id: string) => {
    const res = await fetch(`/api/time/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await fetchData();
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-400 space-y-2">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        <p className="text-sm">Loading 4weird Time Tracker & Ghost Cash Ledger...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/40 via-zinc-950/60 to-emerald-950/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-lg">👻💵</span>
            <h1 className="font-bold text-white text-base">Ghost Cash Time Tracker & Work Diary</h1>
          </div>
          <p className="text-xs text-zinc-400">
            Centrally controlled unit of account to track hours down to the second and settle intra-org debts. Zero cash value.
          </p>
        </div>

        {runningTimer?.isRunning && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold self-start sm:self-auto">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            Timer Active
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
        <Button
          size="sm"
          variant={activeView === "dashboard" ? "default" : "ghost"}
          onClick={() => setActiveView("dashboard")}
          className={activeView === "dashboard" ? "bg-cyan-500 text-black font-semibold text-xs" : "text-zinc-400 text-xs"}
        >
          <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
          Dashboard
        </Button>

        <Button
          size="sm"
          variant={activeView === "timer" ? "default" : "ghost"}
          onClick={() => setActiveView("timer")}
          className={activeView === "timer" ? "bg-cyan-500 text-black font-semibold text-xs" : "text-zinc-400 text-xs"}
        >
          <Clock className="h-3.5 w-3.5 mr-1.5" />
          Live Timer
        </Button>

        <Button
          size="sm"
          variant={activeView === "entries" ? "default" : "ghost"}
          onClick={() => setActiveView("entries")}
          className={activeView === "entries" ? "bg-cyan-500 text-black font-semibold text-xs" : "text-zinc-400 text-xs"}
        >
          <Clock className="h-3.5 w-3.5 mr-1.5" />
          Work Diary ({entries.length})
        </Button>

        <Button
          size="sm"
          variant={activeView === "projects" ? "default" : "ghost"}
          onClick={() => setActiveView("projects")}
          className={activeView === "projects" ? "bg-cyan-500 text-black font-semibold text-xs" : "text-zinc-400 text-xs"}
        >
          <Folder className="h-3.5 w-3.5 mr-1.5" />
          Projects ({projects.length})
        </Button>

        <Button
          size="sm"
          variant={activeView === "debts" ? "default" : "ghost"}
          onClick={() => setActiveView("debts")}
          className={activeView === "debts" ? "bg-cyan-500 text-black font-semibold text-xs" : "text-zinc-400 text-xs"}
        >
          <Coins className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
          Ghost Debts ({debts.length})
        </Button>

        <Button
          size="sm"
          variant={activeView === "reports" ? "default" : "ghost"}
          onClick={() => setActiveView("reports")}
          className={activeView === "reports" ? "bg-cyan-500 text-black font-semibold text-xs" : "text-zinc-400 text-xs"}
        >
          <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
          Reports
        </Button>
      </div>

      {/* Tab Panels */}
      {activeView === "dashboard" && (
        <TimeDashboard
          entries={entries}
          projects={projects}
          runningTimer={runningTimer}
          onNavigate={(view) => setActiveView(view as View)}
          onTimerStart={handleTimerStart}
          onTimerStop={handleTimerStop}
          onTimerDiscard={handleTimerDiscard}
          onRefresh={fetchData}
        />
      )}

      {activeView === "timer" && (
        <div className="max-w-2xl mx-auto py-4">
          <TimerWidget
            projects={projects}
            runningTimer={runningTimer}
            onTimerStart={handleTimerStart}
            onTimerStop={handleTimerStop}
            onTimerDiscard={handleTimerDiscard}
            onRefresh={fetchData}
          />
        </div>
      )}

      {activeView === "entries" && (
        <TimeEntryList
          entries={entries}
          onDelete={handleEntryDelete}
          onRefresh={fetchData}
        />
      )}

      {activeView === "projects" && (
        <ProjectManager
          projects={projects}
          onRefresh={fetchData}
        />
      )}

      {activeView === "debts" && (
        <GhostDebtManager
          debts={debts}
          onRefresh={fetchData}
        />
      )}

      {activeView === "reports" && (
        <TimeReports />
      )}
    </div>
  );
}
