"use client";

import { useState, useEffect } from "react";
import { TimerReport, formatGhostCash, formatDurationShort } from "@/types/time";
import { BarChart3, Clock, DollarSign, Activity, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TimeReports() {
  const [report, setReport] = useState<TimerReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/time/reports")
      .then((res) => res.json())
      .then((data) => {
        if (data.report) setReport(data.report);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="p-12 text-center text-zinc-500">
        <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />
        <p className="text-xs">Computing Ghost Cash totals...</p>
      </div>
    );
  }

  const summary = report?.summary;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Ghost Cash & Time Reports</h2>
        <p className="text-sm text-zinc-400">
          Summary of hours worked down to the second and Ghost Cash (👻) accrued.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-white/10 bg-zinc-950/60 space-y-1">
          <p className="text-xs text-zinc-400">Total Hours</p>
          <p className="text-2xl font-bold font-mono text-white">{summary?.totalHours || 0} hrs</p>
          <p className="text-xs text-zinc-500">{formatDurationShort(summary?.totalSeconds || 0)}</p>
        </div>

        <div className="p-4 rounded-xl border border-white/10 bg-zinc-950/60 space-y-1">
          <p className="text-xs text-zinc-400">Billable Hours</p>
          <p className="text-2xl font-bold font-mono text-cyan-400">{summary?.billableHours || 0} hrs</p>
          <p className="text-xs text-zinc-500">{formatDurationShort(summary?.billableSeconds || 0)}</p>
        </div>

        <div className="p-4 rounded-xl border border-white/10 bg-zinc-950/60 space-y-1">
          <p className="text-xs text-zinc-400">Total Ghost Cash</p>
          <p className="text-2xl font-bold font-mono text-emerald-400">
            {formatGhostCash(summary?.totalGhostCashOwed || 0)}
          </p>
          <p className="text-xs text-zinc-500">Accrued to the second</p>
        </div>

        <div className="p-4 rounded-xl border border-white/10 bg-zinc-950/60 space-y-1">
          <p className="text-xs text-zinc-400">Avg Activity Score</p>
          <p className="text-2xl font-bold font-mono text-amber-400">
            {summary?.averageActivityScore || 100}%
          </p>
          <p className="text-xs text-zinc-500">Work-diary proof avg</p>
        </div>
      </div>

      {/* Breakdown By Project */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-300">Breakdown by Project</h3>
        <div className="rounded-xl border border-white/10 bg-zinc-950/40 divide-y divide-white/5">
          {(report?.byProject || []).length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500">No project data available.</div>
          ) : (
            report?.byProject.map((p) => (
              <div key={p.projectId} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: p.projectColor || "#3b82f6" }}
                  />
                  <span className="text-sm font-medium text-white">{p.projectName}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-white text-sm mr-4">
                    {formatDurationShort(p.totalSeconds)}
                  </span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {formatGhostCash(p.totalGhostCash)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
