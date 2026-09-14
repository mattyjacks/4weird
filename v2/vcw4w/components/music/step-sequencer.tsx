"use client";

import { useRef } from "react";

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
 * 16-step grid x one octave+ of pitches for a single track. Cells toggle on
 * touch/pen `pointerdown` (no tap delay, works inside the scrolling grid)
 * and on mouse/keyboard `click` — a tap toggles exactly once because the
 * follow-up click after a touch pointerdown is suppressed. Pure render — no
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
      className="max-w-full overflow-x-auto overscroll-x-contain pb-1"
    >
      <div
        className="grid w-max min-w-full gap-1"
        style={{ gridTemplateColumns: `3.5rem repeat(${steps}, minmax(2.75rem, 1fr))` }}
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
  // Steps toggled by a touch/pen pointerdown are recorded here so the
  // compatibility click that follows the tap is skipped (exactly one
  // toggle per tap). Mouse and keyboard keep the plain click path.
  const touchToggledRef = useRef<Set<number>>(new Set());
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
            onPointerDown={(event) => {
              let isMouse = false;
              try {
                isMouse = event.pointerType === "mouse";
              } catch {
                // Fail open: unknown pointer type toggles like touch.
              }
              if (isMouse) return;
              touchToggledRef.current.add(step);
              onToggle(step, midi);
            }}
            onClick={() => {
              if (touchToggledRef.current.delete(step)) return;
              onToggle(step, midi);
            }}
            className={`aspect-square min-h-[40px] w-full min-w-[40px] touch-manipulation rounded-md border transition-colors ${
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
