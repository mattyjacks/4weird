"use client";

import { useState } from "react";

export interface DubstepDropEvent {
  kind: "dubstep-drop";
  recipeId: string;
  wobbleRateHz: number;
  wobbleDepth: number;
  growl: string;
  riserBars: number;
  halftime: boolean;
}

export interface DubstepPanelProps {
  onInsertFx?: (recipe: string | DubstepDropEvent) => void;
  onPreview?: (recipeId: string) => void;
}

const GROWL_OPTIONS = ["Subtle", "Mean", "Filthy", "Riddim Scream"] as const;

const RISER_OPTIONS = [1, 2, 4, 8] as const;

interface DropPreset {
  id: string;
  name: string;
  blurb: string;
  wobbleRateHz: number;
  wobbleDepth: number;
  growl: (typeof GROWL_OPTIONS)[number];
  riserBars: number;
  halftime: boolean;
}

const DROP_PRESETS: DropPreset[] = [
  {
    id: "dubstep-drop-riddim",
    name: "Riddim",
    blurb: "Choppy 1/3 wobble, mean growl, 2-bar riser.",
    wobbleRateHz: 4.5,
    wobbleDepth: 80,
    growl: "Mean",
    riserBars: 2,
    halftime: true,
  },
  {
    id: "dubstep-drop-tearout",
    name: "Tearout",
    blurb: "Fast filthy wobble, max growl, 4-bar riser.",
    wobbleRateHz: 9.0,
    wobbleDepth: 100,
    growl: "Filthy",
    riserBars: 4,
    halftime: true,
  },
  {
    id: "dubstep-drop-chillstep",
    name: "Chillstep-ish",
    blurb: "Slow silky wobble, subtle growl, 8-bar riser.",
    wobbleRateHz: 1.2,
    wobbleDepth: 45,
    growl: "Subtle",
    riserBars: 8,
    halftime: false,
  },
];

function slugPart(value: number): string {
  return String(value).replace(".", "p");
}

function buildRecipeId(
  wobbleRateHz: number,
  wobbleDepth: number,
  growl: string,
  riserBars: number,
  halftime: boolean,
): string {
  const growlSlug = growl.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `dubstep:wobble-${slugPart(wobbleRateHz)}hz-depth-${wobbleDepth}-growl-${growlSlug}-riser-${riserBars}b-halftime-${halftime ? "on" : "off"}`;
}

export function DubstepPanel({
  onInsertFx,
  onPreview,
}: DubstepPanelProps): React.JSX.Element {
  const [wobbleRateHz, setWobbleRateHz] = useState(4.5);
  const [wobbleDepth, setWobbleDepth] = useState(80);
  const [growl, setGrowl] =
    useState<(typeof GROWL_OPTIONS)[number]>("Mean");
  const [riserBars, setRiserBars] = useState<number>(2);
  const [halftime, setHalftime] = useState(true);
  const [status, setStatus] = useState("");

  const currentRecipeId = buildRecipeId(
    wobbleRateHz,
    wobbleDepth,
    growl,
    riserBars,
    halftime,
  );

  function currentEvent(): DubstepDropEvent {
    return {
      kind: "dubstep-drop",
      recipeId: currentRecipeId,
      wobbleRateHz,
      wobbleDepth,
      growl,
      riserBars,
      halftime,
    };
  }

  function handlePreviewCurrent(): void {
    try {
      onPreview?.(currentRecipeId);
      setStatus(`Previewing "${currentRecipeId}".`);
    } catch {
      setStatus("Preview failed in this browser (fail-open).");
    }
  }

  function handleInsertCurrent(): void {
    try {
      onInsertFx?.(currentEvent());
      setStatus(`Inserted drop "${currentRecipeId}".`);
    } catch {
      setStatus("Insert failed in this browser (fail-open).");
    }
  }

  function handleDrop(): void {
    // DROP button inserts the halftime drop event (maker wiring is DS-MUSDUB-10).
    handleInsertCurrent();
  }

  function loadPreset(preset: DropPreset): void {
    try {
      setWobbleRateHz(preset.wobbleRateHz);
      setWobbleDepth(preset.wobbleDepth);
      setGrowl(preset.growl);
      setRiserBars(preset.riserBars);
      setHalftime(preset.halftime);
      setStatus(`Loaded preset "${preset.name}" (${preset.id}).`);
    } catch {
      /* fail-open */
    }
  }

  function handleAuditionPreset(preset: DropPreset): void {
    try {
      onPreview?.(preset.id);
      setStatus(`Auditioning "${preset.name}".`);
    } catch {
      setStatus("Audition failed in this browser (fail-open).");
    }
  }

  function handleInsertPreset(preset: DropPreset): void {
    try {
      onInsertFx?.(preset.id);
      setStatus(`Inserted preset "${preset.name}".`);
    } catch {
      setStatus("Insert failed in this browser (fail-open).");
    }
  }

  return (
    <section
      aria-label="Dubstep FX panel"
      className="min-w-0 max-w-full overflow-x-clip rounded-2xl border border-fuchsia-500/30 bg-gradient-to-b from-slate-950 via-purple-950/40 to-slate-950 p-4"
    >
      <style>{`.dubstep-touch-slider{-webkit-appearance:none;appearance:none;height:44px;background:transparent;cursor:pointer}.dubstep-touch-slider::-webkit-slider-runnable-track{height:8px;border-radius:9999px;background:linear-gradient(90deg,#22d3ee,#e879f9)}.dubstep-touch-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;margin-top:-10px;height:28px;width:28px;border-radius:9999px;background:#f0abfc;border:2px solid #701a75}.dubstep-touch-slider::-moz-range-track{height:8px;border-radius:9999px;background:linear-gradient(90deg,#22d3ee,#e879f9)}.dubstep-touch-slider::-moz-range-thumb{height:28px;width:28px;border-radius:9999px;background:#f0abfc;border:2px solid #701a75}`}</style>
      <h2 className="text-lg font-black tracking-wide text-white">
        Dubstep FX <span className="text-fuchsia-300">panel</span>
      </h2>
      <p className="mt-1 text-sm text-slate-300">
        Dial the wobble, pick the growl, then DROP it. Recipe:{" "}
        <code className="break-all text-cyan-200">{currentRecipeId}</code>
      </p>

      <label className="mt-4 block min-w-0 max-w-full text-sm font-bold text-slate-200">
        Wobble rate (LFO): {wobbleRateHz.toFixed(1)} Hz
        <input
          type="range"
          min={0.2}
          max={14}
          step={0.1}
          value={wobbleRateHz}
          onChange={(e) => setWobbleRateHz(Number(e.target.value))}
          className="dubstep-touch-slider mt-1 h-[44px] w-full max-w-full touch-manipulation accent-fuchsia-300"
        />
      </label>

      <label className="mt-2 block min-w-0 max-w-full text-sm font-bold text-slate-200">
        Wobble depth: {wobbleDepth}%
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={wobbleDepth}
          onChange={(e) => setWobbleDepth(Number(e.target.value))}
          className="dubstep-touch-slider mt-1 h-[44px] w-full max-w-full touch-manipulation accent-fuchsia-300"
        />
      </label>

      <div className="mt-4 min-w-0 max-w-full">
        <span
          id="dubstep-growl-label"
          className="text-sm font-bold text-slate-200"
        >
          Growl amount
        </span>
        <div
          role="group"
          aria-labelledby="dubstep-growl-label"
          className="mt-2 flex max-w-full flex-wrap gap-2 overflow-x-auto overscroll-x-contain pb-1"
        >
          {GROWL_OPTIONS.map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={growl === g}
              onClick={() => setGrowl(g)}
              className={`min-h-[44px] min-w-[44px] touch-manipulation rounded-xl border px-4 py-3 text-sm font-bold ${
                growl === g
                  ? "border-fuchsia-300 bg-fuchsia-300 text-slate-950"
                  : "border-white/15 bg-white/[.05] text-white hover:bg-white/[.12]"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 min-w-0 max-w-full">
        <span
          id="dubstep-riser-label"
          className="text-sm font-bold text-slate-200"
        >
          Riser length
        </span>
        <div
          role="group"
          aria-labelledby="dubstep-riser-label"
          className="mt-2 flex max-w-full flex-wrap gap-2 overflow-x-auto overscroll-x-contain pb-1"
        >
          {RISER_OPTIONS.map((bars) => (
            <button
              key={bars}
              type="button"
              aria-pressed={riserBars === bars}
              onClick={() => setRiserBars(bars)}
              className={`min-h-[44px] min-w-[44px] touch-manipulation rounded-xl border px-4 py-3 text-sm font-bold ${
                riserBars === bars
                  ? "border-cyan-300 bg-cyan-300 text-slate-950"
                  : "border-white/15 bg-white/[.05] text-white hover:bg-white/[.12]"
              }`}
            >
              {bars} bar{bars === 1 ? "" : "s"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex max-w-full flex-wrap items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={halftime}
          onClick={() => setHalftime((v) => !v)}
          className={`min-h-[44px] touch-manipulation rounded-xl border px-4 py-3 text-sm font-bold ${
            halftime
              ? "border-fuchsia-300 bg-fuchsia-300 text-slate-950"
              : "border-white/15 bg-white/[.05] text-white hover:bg-white/[.12]"
          }`}
        >
          Halftime: {halftime ? "ON" : "OFF"}
        </button>
        <button
          type="button"
          onClick={handlePreviewCurrent}
          className="min-h-[44px] touch-manipulation rounded-xl border border-white/15 bg-white/[.05] px-4 py-3 text-sm font-bold text-white hover:bg-white/[.12]"
        >
          Preview current
        </button>
        <button
          type="button"
          onClick={handleDrop}
          className="min-h-[52px] touch-manipulation rounded-2xl border border-fuchsia-200 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-8 py-3 text-base font-black tracking-widest text-slate-950 shadow-[0_0_24px_rgba(232,121,249,.45)] hover:brightness-110 active:brightness-95"
        >
          DROP
        </button>
      </div>

      <div className="mt-5 min-w-0 max-w-full">
        <h3 className="text-sm font-black tracking-wide text-slate-100">
          Preset drops (3 templates)
        </h3>
        <ul className="mt-2 grid min-w-0 max-w-full gap-2">
          {DROP_PRESETS.map((preset) => (
            <li
              key={preset.id}
              className="min-w-0 rounded-xl border border-white/10 bg-slate-950/60 p-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-black text-white">
                  {preset.name}
                </span>
                <code className="break-all text-xs text-cyan-200">
                  {preset.id}
                </code>
              </div>
              <p className="mt-1 text-xs text-slate-300">{preset.blurb}</p>
              <p className="mt-1 text-xs text-slate-400">
                {preset.wobbleRateHz.toFixed(1)} Hz · depth {preset.wobbleDepth
                }% · {preset.growl} · {preset.riserBars} bar
                {preset.riserBars === 1 ? "" : "s"} · halftime{" "}
                {preset.halftime ? "on" : "off"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => loadPreset(preset)}
                  className="min-h-[44px] touch-manipulation rounded-xl border border-white/15 bg-white/[.05] px-4 py-2 text-sm font-bold text-white hover:bg-white/[.12]"
                >
                  Load
                </button>
                <button
                  type="button"
                  onClick={() => handleAuditionPreset(preset)}
                  className="min-h-[44px] touch-manipulation rounded-xl border border-cyan-300/60 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100 hover:bg-cyan-300/20"
                >
                  Audition
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertPreset(preset)}
                  className="min-h-[44px] touch-manipulation rounded-xl border border-fuchsia-300/60 bg-fuchsia-300/10 px-4 py-2 text-sm font-bold text-fuchsia-100 hover:bg-fuchsia-300/20"
                >
                  Insert
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleInsertCurrent}
          className="min-h-[44px] touch-manipulation rounded-xl border border-white/15 bg-white/[.05] px-4 py-3 text-sm font-bold text-white hover:bg-white/[.12]"
        >
          Insert current as FX
        </button>
      </div>

      <p aria-live="polite" className="mt-3 min-h-[1.25rem] text-sm text-slate-300">
        {status}
      </p>
    </section>
  );
}

export default DubstepPanel;
