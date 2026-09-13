"use client";

/**
 * TimerProClient — holds session entries in state so stopped clock sessions
 * land in the weekly report without a backend (fail-open; Supabase
 * time_entries sync wires in via QUEUE). Seeded with demo entries.
 */

import { useState } from "react";
import { WorkClock, type TimeEntryData, type TimeProjectOption } from "@/components/timer/work-clock";
import { TimeReport } from "@/components/timer/time-report";

const PROJECTS: TimeProjectOption[] = [
  { id: "tp-gg3d", name: "GraveGain 3D Arena", colorHex: "#22d3ee", hourlyRateUsd: 60 },
  { id: "tp-kanban", name: "Squad Kanban Tooling", colorHex: "#fbbf24", hourlyRateUsd: 45 },
  { id: "tp-internal", name: "Internal / Non-billable", colorHex: "#64748b", hourlyRateUsd: 0 },
];

function seedEntries(): TimeEntryData[] {
  const today = new Date();
  const iso = (d: Date) => d.toISOString();
  const at = (dayOffset: number, h: number, m: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - dayOffset);
    d.setHours(h, m, 0, 0);
    return d;
  };
  const mk = (
    id: string,
    dayOffset: number,
    sh: number,
    sm: number,
    seconds: number,
    project: TimeProjectOption,
    description: string,
    billable: boolean,
  ): TimeEntryData => {
    const start = at(dayOffset, sh, sm);
    return {
      id,
      projectId: project.id,
      projectName: project.name,
      description,
      startedAt: iso(start),
      endedAt: iso(new Date(start.getTime() + seconds * 1000)),
      durationSeconds: seconds,
      isBillable: billable,
      hourlyRateUsd: project.hourlyRateUsd,
    };
  };
  return [
    mk("seed-1", 0, 9, 0, 5400, PROJECTS[0], "Instanced mesh batching", true),
    mk("seed-2", 0, 14, 30, 2700, PROJECTS[1], "Kanban drag-and-drop polish", true),
    mk("seed-3", 1, 10, 15, 7200, PROJECTS[0], "Arena spawn tuning", true),
    mk("seed-4", 1, 16, 0, 1800, PROJECTS[2], "Squad retro notes", false),
  ];
}

export function TimerProClient() {
  const [entries, setEntries] = useState<TimeEntryData[]>(seedEntries);

  return (
    <div className="space-y-6">
      <WorkClock
        projects={PROJECTS}
        onEntry={(entry) => setEntries((prev) => [entry, ...prev])}
      />
      <div>
        <h2 className="mb-3 text-xl font-black text-white">This week</h2>
        <TimeReport entries={entries} />
      </div>
    </div>
  );
}
