"use client";

import { useState } from "react";
import { TimerEntry, formatDuration, formatGhostCash } from "@/types/time";
import { Clock, Trash2, Tag, CheckCircle2, XCircle, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimeEntryListProps {
  entries: TimerEntry[];
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => void;
}

export function TimeEntryList({ entries, onDelete }: TimeEntryListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this time entry?")) return;
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-8 text-center text-zinc-500">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No time entries logged yet. Start the timer to log your hours!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const isRunning = entry.isRunning;
        return (
          <div
            key={entry.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-white/10 bg-zinc-950/60 hover:border-white/20 transition-all gap-4"
          >
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                {entry.project ? (
                  <span
                    className="px-2 py-0.5 rounded text-xs font-semibold text-white"
                    style={{ backgroundColor: entry.project.color || "#3b82f6" }}
                  >
                    {entry.project.name}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-400">
                    No Project
                  </span>
                )}

                {entry.isBillable ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Billable
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <XCircle className="h-3 w-3" />
                    Non-billable
                  </span>
                )}

                {entry.activityScore !== undefined && (
                  <span className="flex items-center gap-1 text-xs text-cyan-400 bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-900/50">
                    <Monitor className="h-3 w-3" />
                    {entry.activityScore}% activity
                  </span>
                )}
              </div>

              <p className="text-sm font-medium text-white">
                {entry.description || "Untitled session"}
              </p>

              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span>
                  {new Date(entry.startTime).toLocaleDateString()} at{" "}
                  {new Date(entry.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                {entry.debtor && (
                  <span>
                    Debtor: <strong className="text-zinc-300">{entry.debtor.displayName || entry.debtor.username}</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
              <div className="text-right">
                <div className="text-lg font-mono font-bold text-white tabular-nums">
                  {formatDuration(entry.duration || 0)}
                </div>
                <div className="text-xs font-mono font-semibold text-emerald-400">
                  {formatGhostCash(entry.ghostCashOwed)}
                </div>
              </div>

              {!isRunning && (
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={deletingId === entry.id}
                  onClick={() => handleDelete(entry.id)}
                  className="h-8 w-8 text-zinc-500 hover:text-rose-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
