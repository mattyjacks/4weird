/**
 * Vocrehab schedule-day drawer (SJ 24h day UI).
 *
 * Usage:
 *   import VocrehabScheduleDay from "@/components/vocrehab/vocrehab-schedule-day";
 *   <VocrehabScheduleDay
 *     dayId="mon"
 *     events={[{ id: "travel-am", title: "Travel to placement", startMin: 480, endMin: 540, locked: true }]}
 *     selectedActivity={{ id: "shift", label: "Work shift", defaultDurMin: 120 }}
 *     onCreate={(startMin) => ...}
 *     onMove={(id, startMin) => ...}
 *     onResize={(id, endMin) => ...}
 *     onRemove={(id) => ...}
 *   />
 *
 * Renders 24 hourly rows as direct add targets (00:00–23:00), placed blocks with button-only Move ±5m / Resize ±5m /
 * Remove controls (no drag dependency), hatched locked travel blocks, and a
 * <details> list-select alternative for assistive tech. Strengths-first
 * vocrehab tone throughout; guidance copy never uses error-red styling.
 */

"use client";

export type VocrehabScheduleDayEvent = {
  id: string;
  title: string;
  startMin: number;
  endMin: number;
  locked?: boolean;
  activityId?: string;
};

export type VocrehabScheduleDayActivity = {
  id: string;
  label: string;
  defaultDurMin: number;
};

export type VocrehabScheduleDayProps = {
  dayId: string;
  events: VocrehabScheduleDayEvent[];
  selectedActivity: VocrehabScheduleDayActivity | null;
  onCreate: (startMin: number) => void;
  onMove: (id: string, startMin: number) => void;
  onResize: (id: string, endMin: number) => void;
  onRemove: (id: string) => void;
};

const VOCREHAB_DAY_MIN = 0;
const VOCREHAB_DAY_MAX = 24 * 60;
const VOCREHAB_STEP = 5;
const VOCREHAB_HOURS = Array.from({ length: 24 }, (_, h) => h);

function vocrehabClampMin(value: number): number {
  if (!Number.isFinite(value)) return VOCREHAB_DAY_MIN;
  return Math.min(VOCREHAB_DAY_MAX, Math.max(VOCREHAB_DAY_MIN, Math.round(value)));
}

function vocrehabFormatMin(min: number): string {
  const clamped = vocrehabClampMin(min);
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function vocrehabRangeLabel(startMin: number, endMin: number): string {
  return `${vocrehabFormatMin(startMin)}–${vocrehabFormatMin(endMin)}`;
}

function vocrehabEventAt(events: VocrehabScheduleDayEvent[], startMin: number): VocrehabScheduleDayEvent | null {
  return events.find((e) => startMin >= e.startMin && startMin < e.endMin) ?? null;
}

export default function VocrehabScheduleDay({
  dayId,
  events,
  selectedActivity,
  onCreate,
  onMove,
  onResize,
  onRemove,
}: VocrehabScheduleDayProps) {
  const sorted = [...events].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const slotOptions = Array.from({ length: 24 * 12 }, (_, i) => i * VOCREHAB_STEP);
  const endOptions = Array.from({ length: 24 * 12 }, (_, i) => (i + 1) * VOCREHAB_STEP);

  const createHint = selectedActivity
    ? `Adding “${selectedActivity.label}” (1 hour). Tap an open hour below — adjust in 5-minute steps.`
    : "Pick an activity first, then tap an open hour below to add it.";

  return (
    <section
      className="vocrehab-schedule-day space-y-4"
      aria-label={`Day schedule for ${dayId}`}
    >
      <p className="text-sm text-stone-600" role="status">
        {sorted.length === 0
          ? "A fresh day with room for wins. "
          : `${sorted.length} ${sorted.length === 1 ? "block" : "blocks"} shaping up nicely. `}
        {createHint}
      </p>

      <ol className="vocrehab-schedule-day-grid space-y-1">
        {VOCREHAB_HOURS.map((hour) => (
          <li
            key={`${dayId}-h${hour}`}
            className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-2 py-1"
          >
            <span
              className="w-12 shrink-0 text-xs font-semibold tabular-nums text-stone-700"
              aria-hidden="true"
            >
              {vocrehabFormatMin(hour * 60)}
            </span>
            <div className="grid flex-1 grid-cols-2 gap-1" role="group" aria-label={`${vocrehabFormatMin(hour * 60)} hour targets`}>
              {[0].map((offset) => {
                const startMin = hour * 60 + offset;
                const occupant = vocrehabEventAt(sorted, startMin);
                const overlapping = sorted.filter((event) => event.startMin < startMin + 60 && event.endMin > startMin);
                const open = overlapping.length === 0;
                return (
                  <button
                    key={`${dayId}-slot-${startMin}`}
                    type="button"
                    onClick={() => occupant ? onRemove(occupant.id) : (open ? onCreate(startMin) : undefined)}
                    aria-label={
                      occupant
                        ? `${vocrehabFormatMin(startMin)} — ${occupant.title}; tap to remove`
                        : !open
                          ? `${vocrehabFormatMin(startMin)} — part of an existing block`
                        : selectedActivity
                          ? `Add ${selectedActivity.label} at ${vocrehabFormatMin(startMin)}`
                          : `Choose ${vocrehabFormatMin(startMin)}`
                    }
                    disabled={!occupant && !open}
                    className={`min-h-11 rounded-md border px-2 py-1 text-left text-xs focus-visible:outline-2 focus-visible:outline-amber-500 ${occupant ? "vocrehab-schedule-occupied-slot border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-amber-50" : open ? "border-stone-200 bg-stone-50 text-stone-700 hover:border-amber-300 hover:bg-amber-50" : "border-stone-200 bg-stone-100 text-stone-500"}`}
                  >
                    <span className="font-semibold tabular-nums">{vocrehabFormatMin(startMin)}</span>
                    {occupant ? (
                      <span className="block truncate text-stone-500">{occupant.title}</span>
                    ) : !open ? (
                      <span className="block truncate text-stone-500">Part of scheduled block</span>
                    ) : (
                      <span className="block text-stone-400">
                        {selectedActivity ? `+ ${selectedActivity.label}` : "Open"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      <div className="rounded-xl border border-stone-200 bg-white p-3">
        <h3 className="text-sm font-semibold text-stone-900">Placed blocks ({sorted.length})</h3>
        {sorted.length === 0 ? (
          <p className="mt-1 text-sm text-stone-600">
            Nothing placed yet — tap an open hour above to add your first activity.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {sorted.map((event) => {
              const duration = Math.max(0, event.endMin - event.startMin);
              const locked = event.locked === true;
              const earlierStart = vocrehabClampMin(event.startMin - VOCREHAB_STEP);
              const laterStart = vocrehabClampMin(
                Math.min(event.startMin + VOCREHAB_STEP, VOCREHAB_DAY_MAX - duration),
              );
              const longerEnd = vocrehabClampMin(event.endMin + VOCREHAB_STEP);
              const shorterEnd = vocrehabClampMin(Math.max(event.startMin + 5, event.endMin - VOCREHAB_STEP));
              return (
                <li
                  key={event.id}
                  className={`rounded-lg border p-2 ${locked ? "border-amber-300 bg-amber-50" : "border-stone-200 bg-stone-50"}`}
                  {...(locked
                    ? {
                        style: {
                          backgroundImage:
                            "repeating-linear-gradient(45deg, rgba(180, 120, 40, 0.12) 0 8px, transparent 8px 16px)",
                        },
                      }
                    : {})}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-stone-900">{event.title}</p>
                    <p className="text-xs tabular-nums text-stone-600">
                      {vocrehabRangeLabel(event.startMin, event.endMin)} · {duration} min
                      {locked ? " · set travel time" : ""}
                    </p>
                  </div>
                  {locked ? (
                    <p className="mt-1 text-xs text-stone-600">
                      Travel time stays put so the rest of the day can flex around it. Nice planning.
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-1" role="group" aria-label={`Adjust ${event.title}`}>
                    <button
                      type="button"
                      onClick={() => onMove(event.id, earlierStart)}
                      disabled={locked}
                      aria-disabled={locked}
                      aria-label={`Move ${event.title} 5 minutes earlier`}
                      title={locked ? "Travel time is set and stays put" : `Move to ${vocrehabFormatMin(earlierStart)}`}
                      className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      −5m
                    </button>
                    <button
                      type="button"
                      onClick={() => onMove(event.id, laterStart)}
                      disabled={locked}
                      aria-disabled={locked}
                      aria-label={`Move ${event.title} 5 minutes later`}
                      title={locked ? "Travel time is set and stays put" : `Move to ${vocrehabFormatMin(laterStart)}`}
                      className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      +5m
                    </button>
                    <button
                      type="button"
                      onClick={() => onResize(event.id, longerEnd)}
                      disabled={locked}
                      aria-disabled={locked}
                      aria-label={`Extend ${event.title} by 5 minutes`}
                      title={locked ? "Travel time is set and stays put" : `Extend to ${vocrehabFormatMin(longerEnd)}`}
                      className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      +5m longer
                    </button>
                    <button type="button" onClick={() => onResize(event.id, shorterEnd)} disabled={locked || duration <= 5} aria-label={`Shorten ${event.title} by 5 minutes`} className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700 hover:bg-amber-50 disabled:opacity-50">−5m shorter</button>
                    <button
                      type="button"
                      onClick={() => onRemove(event.id)}
                      disabled={locked}
                      aria-disabled={locked}
                      aria-label={`Remove ${event.title} from the day`}
                      title={locked ? "Travel time is set and stays put" : "Remove this block"}
                      className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <details className="rounded-xl border border-stone-200 bg-white p-3">
        <summary className="cursor-pointer text-sm font-semibold text-stone-900">
          List view: pick times from menus instead
        </summary>
        <p className="mt-1 text-xs text-stone-600">
          Same day, calmer controls — choose a start and end for each block. Changes apply right away.
        </p>
        {sorted.length === 0 ? (
          <p className="mt-2 text-sm text-stone-600">No blocks yet. Add one from an open hour above.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {sorted.map((event) => {
              const locked = event.locked === true;
              return (
                <li key={`list-${event.id}`} className="rounded-lg border border-stone-200 p-2">
                  <p className="text-sm font-semibold text-stone-900">{event.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <label className="text-xs text-stone-700">
                      Start{" "}
                      <select
                        value={event.startMin}
                        disabled={locked}
                        aria-disabled={locked}
                        aria-label={`${event.title} start time`}
                        onChange={(e) => onMove(event.id, Number(e.target.value))}
                        className="rounded-md border border-stone-300 bg-white px-1 py-1 text-xs disabled:opacity-50"
                      >
                        {slotOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {vocrehabFormatMin(opt)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-stone-700">
                      End{" "}
                      <select
                        value={event.endMin}
                        disabled={locked}
                        aria-disabled={locked}
                        aria-label={`${event.title} end time`}
                        onChange={(e) => onResize(event.id, Number(e.target.value))}
                        className="rounded-md border border-stone-300 bg-white px-1 py-1 text-xs disabled:opacity-50"
                      >
                        {endOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {vocrehabFormatMin(opt)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => onRemove(event.id)}
                      disabled={locked}
                      aria-disabled={locked}
                      aria-label={`Remove ${event.title} from the day`}
                      className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                  {locked ? (
                    <p className="mt-1 text-xs text-stone-600">Set travel time — kept steady for you.</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </details>
    </section>
  );
}
