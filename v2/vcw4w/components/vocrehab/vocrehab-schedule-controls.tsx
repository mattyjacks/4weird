"use client";

export type VocrehabSchedulePresetId = "wa" | "nh" | "ak" | "custom";

export type VocrehabScheduleDifficulty = "easy" | "medium" | "hard";

export interface VocrehabScheduleControlsProps {
  presetId: string;
  onPreset: (id: string) => void;
  difficulty: string;
  onDifficulty: (d: string) => void;
  monthLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onJumpToDay1: () => void;
  savedAt: string | null;
}

const PRESETS: Array<{ id: VocrehabSchedulePresetId; label: string; hint: string }> = [
  { id: "wa", label: "WA", hint: "Washington starter week" },
  { id: "nh", label: "NH", hint: "New Hampshire starter week" },
  { id: "ak", label: "AK", hint: "Alaska starter week" },
  { id: "custom", label: "Custom", hint: "Your own mix" },
];

const DIFFICULTIES: Array<{ id: VocrehabScheduleDifficulty; label: string }> = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Med" },
  { id: "hard", label: "Hard" },
];

function presetLabel(presetId: string): string {
  const found = PRESETS.find((p) => p.id === presetId);
  return found ? `${found.label} — ${found.hint}` : presetId;
}

function difficultyLabel(difficulty: string): string {
  const found = DIFFICULTIES.find((d) => d.id === difficulty);
  return found ? found.label : difficulty;
}

/**
 * Schedule-juggle controls bar: preset picker, difficulty, month nav.
 * Strengths-first tone — progress is celebrated, nothing renders as a red
 * error. Pure function of props (no schedule-juggle imports, SSR-safe).
 */
export default function VocrehabScheduleControls({
  presetId,
  onPreset,
  difficulty,
  onDifficulty,
  monthLabel,
  onPrev,
  onNext,
  onToday,
  onJumpToDay1,
  savedAt,
}: VocrehabScheduleControlsProps) {
  const statusText =
    `${presetLabel(presetId)}, ${difficultyLabel(difficulty)} pace, showing ${monthLabel}.` +
    (savedAt ? ` Last saved ${savedAt}.` : " Not saved yet — your plan is safe to keep building.");

  return (
    <section aria-label="Schedule controls" className="rounded-xl border p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div role="group" aria-label="Starting preset">
          <span id="vocrehab-preset-label" className="mb-1 block text-sm font-medium">
            Starting preset
          </span>
          <div aria-labelledby="vocrehab-preset-label" className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => {
              const active = presetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onPreset(preset.id)}
                  aria-pressed={active}
                  aria-label={`Use ${preset.label} preset: ${preset.hint}`}
                  title={preset.hint}
                  className={
                    "rounded-xl border px-3 py-1 text-sm " +
                    (active ? "bg-primary/10 font-semibold ring-2 ring-primary ring-offset-1 " : "")
                  }
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <div role="group" aria-label="Difficulty">
          <span id="vocrehab-difficulty-label" className="mb-1 block text-sm font-medium">
            Pace
          </span>
          <div
            aria-labelledby="vocrehab-difficulty-label"
            className="flex overflow-hidden rounded-xl border"
          >
            {DIFFICULTIES.map((level) => {
              const active = difficulty === level.id;
              return (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => onDifficulty(level.id)}
                  aria-pressed={active}
                  aria-label={`Set pace to ${level.label}`}
                  className={
                    "border-r px-3 py-1 text-sm last:border-r-0 " +
                    (active ? "bg-primary/10 font-semibold " : "")
                  }
                >
                  {level.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span id="vocrehab-month-label" className="mb-1 block text-sm font-medium">
            Month
          </span>
          <div aria-labelledby="vocrehab-month-label" className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onPrev}
              aria-label="Previous month"
              className="rounded-xl border px-3 py-1 text-sm"
            >
              ‹ Prev
            </button>
            <span aria-hidden="true" className="min-w-28 text-center text-sm font-medium">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={onNext}
              aria-label="Next month"
              className="rounded-xl border px-3 py-1 text-sm"
            >
              Next ›
            </button>
            <button
              type="button"
              onClick={onToday}
              aria-label="Jump to current month"
              className="rounded-xl border px-3 py-1 text-sm"
            >
              Today
            </button>
            <button
              type="button"
              onClick={onJumpToDay1}
              aria-label="Jump to day 1 of this month"
              className="rounded-xl border px-3 py-1 text-sm"
            >
              Day 1
            </button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {savedAt ? (
            <span>
              Saved <time dateTime={savedAt}>{savedAt}</time> — nice progress.
            </span>
          ) : (
            <span>Not saved yet — your plan is safe to keep building.</span>
          )}
        </p>
      </div>

      <p aria-live="polite" role="status" className="mt-2 text-sm text-muted-foreground">
        {statusText}
      </p>
    </section>
  );
}
