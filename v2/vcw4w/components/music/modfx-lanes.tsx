"use client";

import { useCallback, useMemo, useRef, useState } from "react";

export type ModLaneId = "cutoff" | "wobble" | "vibrato" | "detune" | "vol";

export type ModLaneValues = number[];

export type ModTrackLanes = Record<ModLaneId, ModLaneValues>;

export type ModTrack = {
  id: string;
  name: string;
  lanes: ModTrackLanes;
};

export type ModFxLanesProps = {
  tracks: ReadonlyArray<ModTrack>;
  onChange: (trackId: string, lane: ModLaneId, values: number[]) => void;
  steps?: number;
};

export const MOD_LANES: ReadonlyArray<{ id: ModLaneId; label: string; hint: string }> = [
  { id: "cutoff", label: "Cutoff", hint: "Filter cutoff per step" },
  { id: "wobble", label: "Wobble", hint: "LFO wobble depth per step" },
  { id: "vibrato", label: "Vibrato", hint: "Pitch vibrato depth per step" },
  { id: "detune", label: "Detune", hint: "Detune cents per step" },
  { id: "vol", label: "Vol", hint: "Volume trim per step" },
];

const MAX_VALUE = 127;
const DEFAULT_STEPS = 16;

function clampValue(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > MAX_VALUE) return MAX_VALUE;
  return Math.round(v);
}

function normalizeLane(values: ReadonlyArray<number> | undefined, steps: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < steps; i += 1) out.push(clampValue(values?.[i] ?? 0));
  return out;
}

/** Sparse byte cost: 1 flag byte + 2 bytes per nonzero step (index + value). */
export function modLaneByteCost(values: ReadonlyArray<number>): number {
  let nonzero = 0;
  for (const v of values) if (v > 0) nonzero += 1;
  return 1 + nonzero * 2;
}

function valueFromPointer(clientY: number, rect: DOMRect): number {
  const ratio = 1 - (clientY - rect.top) / Math.max(1, rect.height);
  const clamped = Math.min(1, Math.max(0, ratio));
  return clampValue(clamped * MAX_VALUE);
}

export function ModFxLanes({ tracks, onChange, steps = DEFAULT_STEPS }: ModFxLanesProps) {
  const [trackId, setTrackId] = useState<string>(tracks[0]?.id ?? "");
  const [lane, setLane] = useState<ModLaneId>("cutoff");
  const [focusStep, setFocusStep] = useState<number>(0);
  const draggingRef = useRef<boolean>(false);

  const track = useMemo(
    () => tracks.find((t) => t.id === trackId) ?? tracks[0] ?? null,
    [tracks, trackId],
  );
  const values = useMemo(
    () => normalizeLane(track?.lanes[lane], steps),
    [track, lane, steps],
  );

  const byteCost = modLaneByteCost(values);
  const nonzero = values.filter((v) => v > 0).length;

  const commit = useCallback(
    (next: number[]) => {
      if (!track) return;
      onChange(track.id, lane, next.map(clampValue));
    },
    [track, lane, onChange],
  );

  const setStep = useCallback(
    (step: number, value: number) => {
      const next = values.slice();
      next[step] = clampValue(value);
      commit(next);
    },
    [values, commit],
  );

  const handleClear = useCallback(() => {
    commit(new Array(steps).fill(0));
  }, [commit, steps]);

  const handleRandomize = useCallback(() => {
    const next = values.map(() => Math.floor(Math.random() * (MAX_VALUE + 1)));
    commit(next);
  }, [values, commit]);

  const activeTrackId = track?.id ?? "";

  return (
    <div
      role="group"
      aria-label="Modulation lane editor"
      className="w-full rounded-lg border border-white/10 bg-white/[.03] p-3"
      onPointerUp={() => {
        draggingRef.current = false;
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Track
          <select
            aria-label="Modulation track"
            value={activeTrackId}
            onChange={(e) => setTrackId(e.target.value)}
            className="ml-2 rounded-md border border-white/10 bg-slate-900 px-2 py-1 text-xs font-bold text-slate-200"
          >
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <div role="tablist" aria-label="Modulation lane" className="flex flex-wrap gap-1">
          {MOD_LANES.map((l) => {
            const selected = l.id === lane;
            return (
              <button
                key={l.id}
                type="button"
                role="tab"
                aria-selected={selected}
                title={l.hint}
                onClick={() => setLane(l.id)}
                className={`rounded-md border px-2 py-1 text-xs font-bold transition-colors ${
                  selected
                    ? "border-cyan-300 bg-cyan-400/80 text-slate-950 hover:bg-cyan-300"
                    : "border-white/10 bg-white/[.03] text-slate-300 hover:bg-white/[.12]"
                }`}
              >
                {l.label}
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md border border-white/10 bg-white/[.03] px-2 py-1 text-xs font-bold text-slate-300 hover:bg-white/[.12]"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleRandomize}
            className="rounded-md border border-white/10 bg-white/[.03] px-2 py-1 text-xs font-bold text-slate-300 hover:bg-white/[.12]"
          >
            Randomize
          </button>
        </div>
      </div>

      <p aria-live="polite" className="mt-2 text-[11px] tabular-nums text-slate-400">
        Byte cost: <span className="font-bold text-cyan-300">{byteCost} bytes</span> (sparse 1 + 2
        per set step; {nonzero}/{steps} steps set)
      </p>

      <div className="mt-2 max-w-full overflow-x-auto overscroll-x-contain pb-1">
        <div
          className="grid w-max min-w-full gap-1"
          style={{ gridTemplateColumns: `repeat(${steps}, minmax(2.75rem, 1fr))` }}
        >
          {values.map((v, step) => {
            const downbeat = step % 4 === 0;
            const fill = Math.round((v / MAX_VALUE) * 100);
            const focused = step === focusStep;
            return (
              <button
                key={step}
                type="button"
                role="slider"
                aria-label={`${lane} step ${step + 1} value ${v} of ${MAX_VALUE}`}
                aria-valuemin={0}
                aria-valuemax={MAX_VALUE}
                aria-valuenow={v}
                aria-valuetext={`${v}`}
                onFocus={() => setFocusStep(step)}
                onPointerDown={(e) => {
                  draggingRef.current = true;
                  setFocusStep(step);
                  const rect = e.currentTarget.getBoundingClientRect();
                  setStep(step, valueFromPointer(e.clientY, rect));
                  e.currentTarget.setPointerCapture?.(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (!draggingRef.current) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  setStep(step, valueFromPointer(e.clientY, rect));
                }}
                onPointerUp={() => {
                  draggingRef.current = false;
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setStep(step, v + 8);
                  } else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setStep(step, v - 8);
                  } else if (e.key === "Home") {
                    e.preventDefault();
                    setStep(step, 0);
                  } else if (e.key === "End") {
                    e.preventDefault();
                    setStep(step, MAX_VALUE);
                  } else if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    setFocusStep(Math.max(0, step - 1));
                  } else if (e.key === "ArrowRight") {
                    e.preventDefault();
                    setFocusStep(Math.min(steps - 1, step + 1));
                  }
                }}
                className={`relative min-h-[96px] w-full min-w-[40px] touch-none overflow-hidden rounded-md border transition-colors ${
                  downbeat ? "border-white/15" : "border-white/10"
                } ${focused ? "outline outline-1 outline-cyan-300" : ""} bg-white/[.03] hover:bg-white/[.12]`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 bottom-0 ${v > 0 ? "bg-cyan-400/80" : "bg-transparent"}`}
                  style={{ height: `${fill}%` }}
                />
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 top-1 text-center text-[10px] font-bold tabular-nums ${
                    step % 4 === 0 ? "text-cyan-300" : "text-slate-500"
                  }`}
                >
                  {step + 1}
                </span>
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-1 text-center text-[10px] font-bold tabular-nums text-slate-300"
                >
                  {v}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
