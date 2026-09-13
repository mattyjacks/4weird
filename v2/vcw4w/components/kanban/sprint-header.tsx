import type { KanbanCycleData } from "@/components/kanban/kanban-types";

interface SprintHeaderProps {
  cycle: KanbanCycleData;
  progress: number;
  totalCards: number;
  doneCards: number;
}

/** Days left until cycle end. Pure — negative means overdue. */
export function daysRemaining(endDate: string, nowMs = Date.now()): number {
  const end = new Date(`${endDate}T23:59:59`).getTime();
  if (Number.isNaN(end)) return 0; // fail-open on malformed dates
  return Math.ceil((end - nowMs) / 86400000);
}

/**
 * Sprint/cycle header: title, date range, countdown, progress bar.
 * Server-safe (no browser APIs) — safe to render inside server pages.
 */
export function SprintHeader({ cycle, progress, totalCards, doneCards }: SprintHeaderProps) {
  const remaining = daysRemaining(cycle.endDate);
  const clamped = Math.max(0, Math.min(100, progress));
  return (
    <section
      aria-label={`Active sprint ${cycle.title}`}
      className="rounded-2xl border border-white/10 bg-slate-900/60 p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            Active sprint
          </p>
          <h2 className="mt-1 text-xl font-black text-white">{cycle.title}</h2>
          <p className="mt-1 text-sm text-slate-400">
            {cycle.startDate} → {cycle.endDate} ·{" "}
            {remaining >= 0 ? (
              <span className="font-semibold text-amber-300">
                {remaining} day{remaining === 1 ? "" : "s"} left
              </span>
            ) : (
              <span className="font-semibold text-rose-400">
                overdue by {Math.abs(remaining)} day{Math.abs(remaining) === 1 ? "" : "s"}
              </span>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-white">{clamped}%</p>
          <p className="text-xs text-slate-400">
            {doneCards}/{totalCards} cards done
          </p>
        </div>
      </div>
      <div
        className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-800"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${cycle.title} progress`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-amber-400 transition-[width]"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </section>
  );
}
