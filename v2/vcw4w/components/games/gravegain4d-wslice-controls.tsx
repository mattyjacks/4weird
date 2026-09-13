"use client";

import type { CSSProperties } from "react";

export type Gravegain4DWsliceControlsProps = {
  /** Current W-slice position. */
  w: number;
  /** Minimum W-slice position. */
  wMin: number;
  /** Maximum W-slice position. */
  wMax: number;
  /** Called with the next W value when the slider moves. */
  onW: (nextW: number) => void;
  /** XW rotation angle in degrees. */
  xwDeg: number;
  /** YW rotation angle in degrees. */
  ywDeg: number;
  /** ZW rotation angle in degrees. */
  zwDeg: number;
  /** Setters for the XW/YW/ZW angles (degrees). */
  onXwDeg: (nextDeg: number) => void;
  onYwDeg: (nextDeg: number) => void;
  onZwDeg: (nextDeg: number) => void;
  /** Step in degrees applied by each stepper press. Defaults to 15. */
  angleStepDeg?: number;
  /** Rewind the timeline to its start. */
  onRewind: () => void;
  /** Timeline identifier shown in the label. */
  timelineId: string;
  /** World identifier shown in the label. */
  worldId: string;
  /** Nudge toward ana (−W). */
  onAna: () => void;
  /** Nudge toward kata (+W). */
  onKata: () => void;
};

/** 44px minimum touch target (matches universal-save-panel touchButton). */
const touchTarget: CSSProperties = { minHeight: 44, minWidth: 44 };

const stepperButtonClass =
  "inline-flex items-center justify-center rounded-lg border border-cyan-400/60 bg-black px-4 py-2 text-lg text-cyan-200 hover:bg-cyan-950 focus-visible:outline-2 focus-visible:outline-cyan-300";

const actionButtonClass =
  "inline-flex items-center justify-center rounded-lg border border-cyan-400/60 bg-black px-4 py-2 text-base text-white hover:bg-cyan-950 focus-visible:outline-2 focus-visible:outline-cyan-300";

type AngleStepperProps = {
  plane: "XW" | "YW" | "ZW";
  deg: number;
  stepDeg: number;
  onChange: (nextDeg: number) => void;
};

function AngleStepper({ plane, deg, stepDeg, onChange }: AngleStepperProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-sm text-cyan-200" aria-hidden="true">
        {plane}
      </span>
      <button
        type="button"
        style={touchTarget}
        className={`${stepperButtonClass} min-h-[44px] min-w-[44px]`}
        aria-label={`Decrease ${plane} rotation by ${stepDeg} degrees`}
        onClick={() => onChange(deg - stepDeg)}
      >
        −
      </button>
      <span
        className="w-20 text-center text-sm tabular-nums text-white"
        role="status"
        aria-label={`${plane} rotation ${deg} degrees`}
      >
        {deg}°
      </span>
      <button
        type="button"
        style={touchTarget}
        className={`${stepperButtonClass} min-h-[44px] min-w-[44px]`}
        aria-label={`Increase ${plane} rotation by ${stepDeg} degrees`}
        onClick={() => onChange(deg + stepDeg)}
      >
        +
      </button>
    </div>
  );
}

export function Gravegain4DWsliceControls({
  w,
  wMin,
  wMax,
  onW,
  xwDeg,
  ywDeg,
  zwDeg,
  onXwDeg,
  onYwDeg,
  onZwDeg,
  angleStepDeg = 15,
  onRewind,
  timelineId,
  worldId,
  onAna,
  onKata,
}: Gravegain4DWsliceControlsProps) {
  const stepDeg = Number.isFinite(angleStepDeg) && angleStepDeg > 0 ? angleStepDeg : 15;
  const sliderStep = wMax > wMin ? (wMax - wMin) / 100 : 1;
  return (
    <section
      aria-label="4D W-slice controls"
      className="rounded-xl border border-cyan-400/30 bg-black p-4 text-white"
    >
      <p className="mb-3 text-sm text-cyan-200" role="status" aria-live="polite">
        Timeline {timelineId} · World {worldId}
      </p>

      <div className="mb-4">
        <label htmlFor="gg4d-w-slice" className="mb-1 block text-sm text-cyan-200">
          W slice: <span className="tabular-nums text-white">{w}</span>
        </label>
        <input
          id="gg4d-w-slice"
          type="range"
          min={wMin}
          max={wMax}
          step={sliderStep}
          value={w}
          onChange={(e) => onW(Number(e.target.value))}
          aria-label={`W slice position, from ${wMin} to ${wMax}`}
          aria-valuetext={`W ${w}`}
          className="w-full accent-cyan-400"
          style={{ minHeight: 44 }}
        />
        <div
          className="flex items-center justify-between text-xs text-cyan-200/70"
          aria-hidden="true"
        >
          <span className="tabular-nums">{wMin}</span>
          <span className="tabular-nums">{wMax}</span>
        </div>
      </div>

      <div className="mb-4 grid gap-2" role="group" aria-label="4D rotation planes">
        <AngleStepper plane="XW" deg={xwDeg} stepDeg={stepDeg} onChange={onXwDeg} />
        <AngleStepper plane="YW" deg={ywDeg} stepDeg={stepDeg} onChange={onYwDeg} />
        <AngleStepper plane="ZW" deg={zwDeg} stepDeg={stepDeg} onChange={onZwDeg} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          style={touchTarget}
          className={`${actionButtonClass} min-h-[44px] min-w-[44px]`}
          aria-label="Nudge toward ana (negative W)"
          onClick={onAna}
        >
          Ana ◀
        </button>
        <button
          type="button"
          style={touchTarget}
          className={`${actionButtonClass} min-h-[44px] min-w-[44px]`}
          aria-label="Nudge toward kata (positive W)"
          onClick={onKata}
        >
          Kata ▶
        </button>
        <button
          type="button"
          style={touchTarget}
          className={`${actionButtonClass} min-h-[44px] min-w-[44px]`}
          aria-label="Rewind timeline to start"
          onClick={onRewind}
        >
          ⏪ Rewind
        </button>
      </div>
    </section>
  );
}
