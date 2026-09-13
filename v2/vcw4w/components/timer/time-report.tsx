"use client";

/**
 * TimeReport — weekly roll-up of time entries with CSV export (Wave-1, R1 web lane).
 *
 * Pure aggregation helpers are exported for review/testing. CSV download runs
 * in a click handler (browser-only) so SSR stays clean. No secrets anywhere.
 */

import React, { useMemo } from "react";
import { entryBillUsd, formatHMS, type TimeEntryData } from "@/components/timer/work-clock";

interface TimeReportProps {
  entries: TimeEntryData[];
}

export interface DayTotal {
  day: string; // YYYY-MM-DD
  seconds: number;
  billUsd: number;
}

export function groupByDay(entries: TimeEntryData[]): DayTotal[] {
  const map = new Map<string, DayTotal>();
  for (const e of entries) {
    const day = (e.startedAt ?? "").slice(0, 10) || "unknown";
    const cur = map.get(day) ?? { day, seconds: 0, billUsd: 0 };
    cur.seconds += Math.max(0, e.durationSeconds || 0);
    cur.billUsd += entryBillUsd(e);
    map.set(day, cur);
  }
  return [...map.values()].sort((a, b) => (a.day < b.day ? 1 : -1));
}

export function entriesToCsv(entries: TimeEntryData[]): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = entries.map((e) =>
    [
      esc(e.startedAt),
      esc(e.endedAt ?? ""),
      esc(e.projectName),
      esc(e.description),
      e.durationSeconds,
      e.isBillable ? "yes" : "no",
      entryBillUsd(e).toFixed(2),
    ].join(","),
  );
  return [
    "started_at,ended_at,project,description,duration_seconds,billable,bill_usd",
    ...rows,
  ].join("\n");
}

export function TimeReport({ entries }: TimeReportProps) {
  const days = useMemo(() => groupByDay(entries), [entries]);
  const totalSeconds = useMemo(
    () => entries.reduce((s, e) => s + Math.max(0, e.durationSeconds || 0), 0),
    [entries],
  );
  const totalBill = useMemo(
    () => entries.reduce((s, e) => s + entryBillUsd(e), 0),
    [entries],
  );

  const downloadCsv = () => {
    try {
      const blob = new Blob([entriesToCsv(entries)], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "4weird-time-report.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Fail-open: export failure never loses tracked time.
    }
  };

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 text-sm text-slate-400">
        No entries yet this week. Start the clock above — stopped sessions land here and
        roll up into invoice memoranda.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Total time
          </p>
          <p className="mt-1 font-mono text-2xl font-black text-white">
            {formatHMS(totalSeconds)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Billable value
          </p>
          <p className="mt-1 text-2xl font-black text-emerald-300">
            ${totalBill.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500">
            🪙 {Math.round(totalBill * 100).toLocaleString()} Vibe Coins @ 100 = $1
          </p>
        </div>
        <div className="flex items-center justify-end rounded-2xl border border-white/10 bg-slate-900/60 p-5">
          <button
            onClick={downloadCsv}
            className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500"
          >
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {days.map((d) => (
        <div
          key={d.day}
          className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40"
        >
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
            <h3 className="font-bold text-white">{d.day}</h3>
            <p className="font-mono text-sm text-slate-300">
              {formatHMS(d.seconds)} ·{" "}
              <span className="text-emerald-300">${d.billUsd.toFixed(2)}</span>
            </p>
          </div>
          <ul className="divide-y divide-white/5">
            {entries
              .filter((e) => (e.startedAt ?? "").slice(0, 10) === d.day)
              .map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {e.description}
                    </p>
                    <p className="text-xs text-slate-500">
                      {e.projectName} · {e.isBillable ? "billable" : "non-billable"}
                    </p>
                  </div>
                  <p className="shrink-0 font-mono text-sm text-slate-300">
                    {formatHMS(e.durationSeconds)}
                  </p>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
