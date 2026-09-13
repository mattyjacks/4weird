"use client";

export type SequencerNote = { t: number; n: number };

export type StepSequencerProps = {
  /** Notes on this track (only `t` = step and `n` = midi pitch are read). */
  notes: ReadonlyArray<SequencerNote>;
  /** Called when a cell is clicked: toggle the note at (step, midi). */
  onToggle: (step: number, midi: number) => void;
  /** Lowest midi pitch shown (bottom row). Defaults to 60 (C4). */
  lowNote?: number;
  /** Number of steps (columns). Defaults to 16. */
  steps?: number;
};

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

function noteLabel(midi: number): string {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

/**
 * 16-step grid x one octave+ of pitches for a single track. Click a cell to
 * toggle that note; changes bubble up via `onToggle`. Pure render — no
 * browser APIs outside event handlers.
 */
export function StepSequencer({
  notes,
  onToggle,
  lowNote = 60,
  steps = 16,
}: StepSequencerProps) {
  const rows: number[] = [];
  for (let midi = lowNote + 12; midi >= lowNote; midi -= 1) rows.push(midi);
  const columns: number[] = [];
  for (let step = 0; step < steps; step += 1) columns.push(step);

  const isActive = (step: number, midi: number): boolean =>
    notes.some((note) => note.t === step && note.n === midi);

  return (
    <div
      role="group"
      aria-label={`Step sequencer, ${steps} steps, ${noteLabel(lowNote)} to ${noteLabel(lowNote + 12)}`}
      className="overflow-x-auto"
    >
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `3.5rem repeat(${steps}, minmax(1.5rem, 1fr))` }}
      >
        {/* Header row: step numbers */}
        <span aria-hidden="true" />
        {columns.map((step) => (
          <span
            key={`h-${step}`}
            aria-hidden="true"
            className={`text-center text-[10px] font-bold tabular-nums ${
              step % 4 === 0 ? "text-cyan-300" : "text-slate-500"
            }`}
          >
            {step + 1}
          </span>
        ))}
        {rows.map((midi) => (
          <StepRow
            key={midi}
            midi={midi}
            columns={columns}
            isActive={isActive}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  );
}

function StepRow({
  midi,
  columns,
  isActive,
  onToggle,
}: {
  midi: number;
  columns: number[];
  isActive: (step: number, midi: number) => boolean;
  onToggle: (step: number, midi: number) => void;
}) {
  const label = noteLabel(midi);
  const isBlackKey = label.includes("#");
  return (
    <>
      <span
        className={`self-center truncate pr-1 text-right text-[10px] font-bold tabular-nums ${
          isBlackKey ? "text-slate-500" : "text-slate-300"
        }`}
      >
        {label}
      </span>
      {columns.map((step) => {
        const active = isActive(step, midi);
        const downbeat = step % 4 === 0;
        return (
          <button
            key={`${midi}-${step}`}
            type="button"
            aria-pressed={active}
            aria-label={`${active ? "Remove" : "Add"} ${label} at step ${step + 1}`}
            onClick={() => onToggle(step, midi)}
            className={`aspect-square w-full rounded-md border transition-colors ${
              active
                ? "border-cyan-300 bg-cyan-400/80 hover:bg-cyan-300"
                : downbeat
                  ? "border-white/15 bg-white/[.07] hover:bg-white/[.15]"
                  : "border-white/10 bg-white/[.03] hover:bg-white/[.12]"
            }`}
          />
        );
      })}
    </>
  );
}
