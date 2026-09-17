"use client";

import { useCallback, useRef } from "react";

export type VocrehabScheduleMonthDayCounts = {
  events: number;
  conflicts: number;
  travelMin: number;
};

export type VocrehabScheduleMonthProps = {
  year: number;
  /** 0-based month index (0 = January). */
  monthIndex: number;
  selectedDayId: string | null;
  eventCounts: Record<string, VocrehabScheduleMonthDayCounts>;
  onSelect: (dayId: string) => void;
  quickAddActivity?: { id: string; label: string } | null;
  dayEvents?: Record<string, Array<{ id: string; title: string; startMin: number; endMin: number; activityId?: string }>>;
  onQuickAdd?: (dayId: string, activityId: string) => void;
  onQuickRemove?: (dayId: string, eventId: string) => void;
  /**
   * Day id (`YYYY-MM-DD`) to highlight as today. Passed in as a prop so the
   * grid stays a pure function of props (skeleton-friendly first paint —
   * no `Date.now()` / `new Date()` without args at render).
   */
  todayDayId?: string | null;
};

const VOCREHAB_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const VOCREHAB_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function vocrehabPad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function vocrehabMonthDayId(year: number, monthIndex: number, day: number): string {
  return `${year}-${vocrehabPad2(monthIndex + 1)}-${vocrehabPad2(day)}`;
}

/**
 * Mon-first month grid. Day cells show the date number, a scheduled-count
 * chip, a ▲ conflict marker, and the travel total. Strengths-first tone:
 * open days read as "Open", conflicts are flagged with ▲ plus a count —
 * never red errors.
 */
export default function VocrehabScheduleMonth({
  year,
  monthIndex,
  selectedDayId,
  eventCounts,
  onSelect,
  quickAddActivity = null,
  dayEvents = {},
  onQuickAdd,
  onQuickRemove,
  todayDayId = null,
}: VocrehabScheduleMonthProps) {
  const monthName = VOCREHAB_MONTHS[monthIndex] ?? `Month ${monthIndex + 1}`;
  // Derived from props only (deterministic, SSR-safe — no Date.now()).
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leadBlanks = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const totalCells = Math.ceil((leadBlanks + daysInMonth) / 7) * 7;

  const dayButtons = useRef(new Map<string, HTMLButtonElement>());

  const setDayRef = useCallback(
    (dayId: string) => (el: HTMLButtonElement | null) => {
      if (el) {
        dayButtons.current.set(dayId, el);
      } else {
        dayButtons.current.delete(dayId);
      }
    },
    [],
  );

  const focusDay = useCallback(
    (day: number) => {
      const clamped = Math.min(Math.max(day, 1), daysInMonth);
      const el = dayButtons.current.get(vocrehabMonthDayId(year, monthIndex, clamped));
      el?.focus();
    },
    [daysInMonth, monthIndex, year],
  );

  const onDayKeyDown = useCallback(
    (day: number) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
      // Enter/Space activate natively via <button> click → onSelect.
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          focusDay(day - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          focusDay(day + 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          focusDay(day - 7);
          break;
        case "ArrowDown":
          e.preventDefault();
          focusDay(day + 7);
          break;
        case "Home":
          e.preventDefault();
          focusDay(1);
          break;
        case "End":
          e.preventDefault();
          focusDay(daysInMonth);
          break;
        default:
          break;
      }
    },
    [daysInMonth, focusDay],
  );

  const cells: Array<{ day: number; dayId: string } | null> = [];
  for (let i = 0; i < totalCells; i += 1) {
    const day = i - leadBlanks + 1;
    if (day < 1 || day > daysInMonth) {
      cells.push(null);
    } else {
      cells.push({ day, dayId: vocrehabMonthDayId(year, monthIndex, day) });
    }
  }

  const weeks: Array<Array<{ day: number; dayId: string } | null>> = [];
  for (let w = 0; w < cells.length; w += 7) {
    weeks.push(cells.slice(w, w + 7));
  }

  return (
    <div className="vocrehab-schedule-month space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="pb-2 text-left text-muted-foreground">
            {monthName} {year}. Tap a date to open its day plan. Use Add to place a one-hour block, or tap a scheduled item to remove it.
          </caption>
          <thead>
            <tr>
              {VOCREHAB_WEEKDAYS.map((d) => (
                <th key={d} scope="col" className="border p-2">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wi) => (
              <tr key={`week-${wi}`}>
                {week.map((cell, ci) =>
                  cell === null ? (
                    <td key={`blank-${wi}-${ci}`} className="border bg-muted/30 p-1" aria-hidden="true" />
                  ) : (
                    <td key={cell.dayId} className="border p-1">
                      {(() => {
                        const counts = eventCounts[cell.dayId] ?? { events: 0, conflicts: 0, travelMin: 0 };
                        const isSelected = selectedDayId === cell.dayId;
                        const isToday = todayDayId === cell.dayId;
                        const ariaLabel =
                          `${monthName} ${cell.day}, ${year}: ` +
                          `${counts.events} scheduled, ${counts.conflicts} conflicts, ` +
                          `${counts.travelMin} min travel` +
                          `${isToday ? ", today" : ""}${isSelected ? ", selected" : ""}`;
                        return (
                          <>
                          <button
                            ref={setDayRef(cell.dayId)}
                            type="button"
                            onClick={() => onSelect(cell.dayId)}
                            onKeyDown={onDayKeyDown(cell.day)}
                            aria-label={ariaLabel}
                            aria-pressed={isSelected}
                            aria-current={isToday ? "date" : undefined}
                            className={
                              "block min-h-14 w-full rounded px-1.5 py-1 text-left align-top " +
                              (isSelected ? "ring-2 ring-primary ring-offset-1 " : "") +
                              (isToday ? "bg-primary/10 font-semibold " : "")
                            }
                          >
                            <span className="flex items-center gap-1">
                              <span className="text-sm font-medium">{cell.day}</span>
                              {isToday && (
                                <span className="rounded border px-1 text-[10px] font-semibold">Today</span>
                              )}
                            </span>
                            <span className="mt-0.5 block text-xs">
                              {counts.events > 0 ? (
                                <span className="inline-block rounded border px-1">
                                  ■ {counts.events} scheduled
                                </span>
                              ) : (
                                <span className="text-muted-foreground">○ Open</span>
                              )}{" "}
                              {counts.conflicts > 0 && (
                                <span className="inline-block rounded border border-amber-500/60 px-1 font-medium">
                                  ▲ {counts.conflicts}
                                </span>
                              )}
                            </span>
                            {counts.travelMin > 0 && (
                              <span className="block text-[11px] text-muted-foreground">
                                {counts.travelMin} min travel
                              </span>
                            )}
                          </button>
                          {dayEvents[cell.dayId]?.length ? (
                            <ul className="mt-1 space-y-1" aria-label={`Scheduled items on ${monthName} ${cell.day}`}>
                              {dayEvents[cell.dayId].map((event) => (
                                <li key={event.id}>
                                  <button
                                    type="button"
                                    onClick={() => onQuickRemove?.(cell.dayId, event.id)}
                                    aria-label={`Remove ${event.title}, ${Math.floor(event.startMin / 60)}:${String(event.startMin % 60).padStart(2, "0")} to ${Math.floor(event.endMin / 60)}:${String(event.endMin % 60).padStart(2, "0")}`}
                                    className="vocrehab-schedule-event-chip block w-full truncate rounded border border-emerald-300 bg-emerald-50 px-1 py-0.5 text-left text-[10px] font-medium text-emerald-950 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-primary"
                                    title="Tap to remove this scheduled item"
                                  >
                                    {event.title} · {Math.floor(event.startMin / 60)}:{String(event.startMin % 60).padStart(2, "0")} ×
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {quickAddActivity && onQuickAdd ? (
                            <button
                              type="button"
                              onClick={() => onQuickAdd(cell.dayId, quickAddActivity.id)}
                              aria-label={`Add one hour of ${quickAddActivity.label} on ${monthName} ${cell.day}`}
                              className="mt-1 min-h-8 w-full rounded border border-dashed border-stone-400 bg-white px-1 py-0.5 text-left text-[10px] font-semibold text-stone-700 hover:border-emerald-600 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-primary"
                            >
                              + Add 1 hr
                            </button>
                          ) : null}
                          </>
                        );
                      })()}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
