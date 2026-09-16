/**
 * VocRehab schedule persist bar (SJ save/load UI).
 *
 * Usage:
 *   import VocrehabSchedulePersist from "@/components/vocrehab/vocrehab-schedule-persist";
 *   <VocrehabSchedulePersist
 *     onSave={({ includeAddresses }) => saveNow(includeAddresses)}
 *     onLoad={() => resume()}
 *     onClearMonth={() => dispatch({ type: "clearMonth" })}
 *     onClearAll={() => dispatch({ type: "clearAll" })}
 *     onExport={({ includeAddresses }) => exportNow(includeAddresses)}
 *     savedAt={savedAt}
 *     hasSave={hasSave}
 *   />
 *
 * Strengths-first, never red errors: clears use a two-step inline arm
 * (amber confirm step, never red), and every action keeps the learner's
 * progress safe until they choose otherwise.
 * Styling: Tailwind utilities + `vocrehab-*` hooks only.
 * NOTE: SJ-dependency-free (react only) — no schedule-juggle lane imports.
 */

"use client";

import { useState } from "react";

export interface VocrehabSchedulePersistSaveOptions {
  includeAddresses: boolean;
}

export interface VocrehabSchedulePersistProps {
  onSave: (opts: VocrehabSchedulePersistSaveOptions) => void;
  onLoad: () => void;
  onClearMonth: () => void;
  onClearAll: () => void;
  onExport: (opts: VocrehabSchedulePersistSaveOptions) => void;
  savedAt: string | null;
  hasSave: boolean;
}

type ArmedTarget = "month" | "all" | null;

function formatSavedAt(savedAt: string | null): string {
  if (!savedAt) return "No save yet — your progress stays here until you choose Save.";
  const parsed = new Date(savedAt);
  if (Number.isNaN(parsed.getTime())) return "Saved — nice steady progress.";
  return `Saved ${parsed.toLocaleString()} — nice steady progress.`;
}

export default function VocrehabSchedulePersist({
  onSave,
  onLoad,
  onClearMonth,
  onClearAll,
  onExport,
  savedAt,
  hasSave,
}: VocrehabSchedulePersistProps) {
  const [includeAddresses, setIncludeAddresses] = useState(false);
  const [armed, setArmed] = useState<ArmedTarget>(null);

  function handleClearClick(target: Exclude<ArmedTarget, null>) {
    if (armed === target) {
      if (target === "month") onClearMonth();
      else onClearAll();
      setArmed(null);
      return;
    }
    setArmed(target);
  }

  return (
    <div className="vocrehab-schedule-persist space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSave({ includeAddresses })}
          className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Save my month
        </button>
        <button
          type="button"
          onClick={onLoad}
          disabled={!hasSave}
          className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Load saved month
        </button>
        <button
          type="button"
          onClick={() => onExport({ includeAddresses })}
          className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800"
        >
          Export
        </button>
        <button
          type="button"
          onClick={() => handleClearClick("month")}
          aria-expanded={armed === "month"}
          className={
            armed === "month"
              ? "rounded-xl border border-amber-500 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900"
              : "rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm text-stone-800"
          }
        >
          {armed === "month" ? "Confirm clear this month?" : "Clear this month"}
        </button>
        <button
          type="button"
          onClick={() => handleClearClick("all")}
          aria-expanded={armed === "all"}
          className={
            armed === "all"
              ? "rounded-xl border border-amber-500 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900"
              : "rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm text-stone-800"
          }
        >
          {armed === "all" ? "Confirm clear everything?" : "Clear everything"}
        </button>
      </div>

      {armed !== null ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
          <span>
            {armed === "month"
              ? "Clearing this month frees every day cell and keeps your setup — choose Confirm to go ahead."
              : "Clearing everything starts a brand-new month — choose Confirm to go ahead."}
          </span>
          <button
            type="button"
            onClick={() => setArmed(null)}
            className="rounded-lg border border-amber-300 bg-white px-3 py-1 text-sm font-semibold text-amber-900"
          >
            Keep my work
          </button>
        </div>
      ) : null}

      <label className="flex items-start gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={includeAddresses}
          onChange={(e) => setIncludeAddresses(e.target.checked)}
          className="mt-1"
        />
        Include my addresses in saves and exports (opt-in — off keeps them on this device only).
      </label>

      <p className="text-sm text-stone-600" role="note">
        Privacy note: saves and exports carry an anonymized payload — counts and day cells only, never names
        or contact details. Addresses travel only when the opt-in above is checked.
      </p>

      <p className="text-sm text-stone-700" role="status">
        {formatSavedAt(savedAt)}
      </p>
    </div>
  );
}
