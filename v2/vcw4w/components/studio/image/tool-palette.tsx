"use client";

import {
  DICTATE_AI_STUBS,
  DICTATE_PAINT_TOOLS,
  type DictateAiStubId,
  type DictateTool,
} from "@/types/dictate-pic";
import { clampBrushSize } from "@/lib/remastery/dictate-pic";

interface ToolPaletteProps {
  tool: DictateTool;
  onTool: (t: DictateTool) => void;
  color: string;
  onColor: (c: string) => void;
  size: number;
  onSize: (n: number) => void;
  zoom: number;
  onZoom: (z: number) => void;
  onAiStub: (id: DictateAiStubId) => void;
}

const PAINT_LABELS: Record<string, string> = {
  brush: "🖌️ Brush",
  pencil: "✏️ Pencil",
  eraser: "🧹 Eraser",
  bucket: "🪣 Bucket",
  eyedropper: "💧 Picker",
};

/**
 * ToolPalette — paint tools + colour/size/zoom + disabled AI stubs.
 * AI buttons stay visibly disabled with fail-open copy (§3.2 + axiom 3):
 * clicking one surfaces the offline notice instead of calling a backend.
 */
export function ToolPalette({
  tool,
  onTool,
  color,
  onColor,
  size,
  onSize,
  zoom,
  onZoom,
  onAiStub,
}: ToolPaletteProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
        Tools
      </p>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Paint tools">
        {DICTATE_PAINT_TOOLS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTool(t)}
            aria-pressed={tool === t}
            className={`rounded p-2 text-center text-xs font-bold ${
              tool === t ? "bg-cyan-500 text-black" : "bg-slate-800 text-slate-200"
            }`}
          >
            {PAINT_LABELS[t] ?? t}
          </button>
        ))}
      </div>

      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
        AI · offline
      </p>
      {DICTATE_AI_STUBS.map((stub) => (
        <button
          key={stub.id}
          type="button"
          disabled
          title={`${stub.title} — OFFLINE (fail-open): fal.ai unreachable, canvas untouched. ${stub.futureRoute}. Click for details.`}
          onClick={() => onAiStub(stub.id)}
          aria-disabled="true"
          className="cursor-not-allowed rounded border border-dashed border-slate-700 bg-slate-900 p-2 text-left text-xs text-slate-500"
        >
          ✨ {stub.title} <span className="text-slate-600">(offline)</span>
        </button>
      ))}
      <p className="text-[10px] leading-relaxed text-slate-500">
        AI brushes degrade to disabled-with-copy when fal.ai is unreachable —
        paint tools keep working (fail-open).
      </p>

      <label className="mt-2 text-[10px] text-slate-400" htmlFor="dictate-color">
        Colour
      </label>
      <input
        id="dictate-color"
        type="color"
        value={color}
        onChange={(e) => onColor(e.target.value)}
        className="h-8 w-full cursor-pointer rounded border border-slate-700 bg-transparent"
      />
      <label className="text-[10px] text-slate-400" htmlFor="dictate-size">
        Size: {clampBrushSize(size)}px
      </label>
      <input
        id="dictate-size"
        type="range"
        min={1}
        max={64}
        value={clampBrushSize(size)}
        onChange={(e) => onSize(Number(e.target.value))}
        className="w-full"
      />
      <label className="text-[10px] text-slate-400" htmlFor="dictate-zoom">
        Zoom: {Math.round(zoom * 100)}%
      </label>
      <input
        id="dictate-zoom"
        type="range"
        min={0.25}
        max={2}
        step={0.25}
        value={zoom}
        onChange={(e) => onZoom(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
