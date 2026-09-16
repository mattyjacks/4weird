/**
 * Vocrehab schedule travel panel (SJ travel UI).
 *
 * Strengths-first trip-result card for the schedule-juggle travel step:
 * shows a mode-agnostic duration range + distance with an honest source
 * badge (live-estimate vs planning-estimate), an Apply-to-day button that
 * drops the leg in as a locked travel block, a Recalculate button, and a
 * calm no-service note slot for transit gaps. Types are local on purpose
 * (no SJ imports). Guidance copy never uses error-red styling.
 *
 * Usage:
 *   import VocrehabScheduleTravel from "@/components/vocrehab/vocrehab-schedule-travel";
 *   <VocrehabScheduleTravel
 *     result={{ minMin: 18, maxMin: 26, miles: 6.4, source: "live", label: "Drive · Home → Work" }}
 *     loading={false}
 *     onApply={applyLegToDay}
 *     onRecalc={recalcLeg}
 *   />
 */

"use client";

export type VocrehabTravelResult = {
  minMin: number;
  maxMin: number;
  miles: number;
  source: string;
  label: string;
};

export type VocrehabScheduleTravelProps = {
  result: VocrehabTravelResult | null;
  loading: boolean;
  onApply: () => void;
  onRecalc: () => void;
  /** Optional no-service / burden note (e.g. transit gap). Shown in a calm amber slot, never red. */
  notice?: string | null;
};

function vocrehabIsLive(source: string): boolean {
  return source.trim().toLowerCase() === "live";
}

function vocrehabFormatRange(minMin: number, maxMin: number): string {
  const lo = Number.isFinite(minMin) ? Math.max(0, Math.round(minMin)) : 0;
  const hi = Number.isFinite(maxMin) ? Math.max(lo, Math.round(maxMin)) : lo;
  return lo === hi ? `${lo} min` : `${lo}–${hi} min`;
}

function vocrehabFormatMiles(miles: number): string {
  if (!Number.isFinite(miles)) return "—";
  const rounded = Math.round(Math.max(0, miles) * 10) / 10;
  return `${rounded} mi`;
}

export default function VocrehabScheduleTravel({
  result,
  loading,
  onApply,
  onRecalc,
  notice = null,
}: VocrehabScheduleTravelProps) {
  const live = result !== null && vocrehabIsLive(result.source);
  const canApply = !loading && result !== null;
  const trimmedNotice = typeof notice === "string" ? notice.trim() : "";

  return (
    <section
      className="vocrehab-schedule-travel space-y-3 rounded-xl border border-stone-200 bg-white p-3"
      aria-label="Trip estimate"
    >
      <h3 className="text-sm font-semibold text-stone-900">Trip estimate</h3>

      {loading ? (
        <p className="text-sm text-stone-600" role="status" aria-live="polite">
          Checking the trip — gathering a fresh estimate for you…
        </p>
      ) : result === null ? (
        <p className="text-sm text-stone-600" role="status">
          No trip checked yet — that&apos;s a fine starting point. Pick a From,
          To, and travel mode, then run an estimate to see the trip here.
        </p>
      ) : (
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-stone-900">{result.label}</p>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                live
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {live ? "Live estimate" : "Planning estimate"}
            </span>
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums text-stone-900">
            {vocrehabFormatRange(result.minMin, result.maxMin)}
          </p>
          <p className="mt-0.5 text-sm tabular-nums text-stone-600">
            {vocrehabFormatMiles(result.miles)} · one-way planning figure
          </p>
          <p className="mt-1 text-xs text-stone-600">
            {live
              ? "Freshly looked up, so you can plan with confidence — traffic can still shift it a little."
              : "A steady planning figure to build around — treat it as a guide, not a promise."}
          </p>
        </div>
      )}

      {trimmedNotice !== "" ? (
        <p
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-stone-700"
          role="note"
        >
          {trimmedNotice}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Trip actions">
        <button
          type="button"
          onClick={onApply}
          disabled={!canApply}
          aria-disabled={!canApply}
          title={
            canApply
              ? "Add this trip to the day as set travel time"
              : "Run an estimate first — then the trip can join the day"
          }
          className="rounded-md border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:border-stone-300 disabled:bg-stone-200 disabled:text-stone-500"
        >
          Apply to day
        </button>
        <button
          type="button"
          onClick={onRecalc}
          disabled={loading}
          aria-disabled={loading}
          title="Check the trip again for a fresh estimate"
          className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Checking…" : "Recalculate"}
        </button>
      </div>
      <p className="text-xs text-stone-600">
        Applying sets the trip as steady travel time so the rest of the day can
        flex around it. Every planned trip is progress.
      </p>
    </section>
  );
}
