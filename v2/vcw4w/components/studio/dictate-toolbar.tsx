"use client";

import type { DictateTool } from "@/types/dictate-pic";

interface DictateToolbarProps {
  tool: DictateTool;
  onTool: (tool: DictateTool) => void;
  color: string;
  onColor: (color: string) => void;
  size: number;
  onSize: (size: number) => void;
  zoom: number;
  onZoom: (zoom: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  undoDepth: number;
  onExport: () => void;
}

const PAINT_BUTTONS: { id: DictateTool; label: string; icon: string }[] = [
  { id: "brush", label: "Brush", icon: "🖌️" },
  { id: "pencil", label: "Pencil", icon: "✏️" },
  { id: "eraser", label: "Eraser", icon: "🧹" },
  { id: "bucket", label: "Bucket", icon: "🪣" },
  { id: "eyedropper", label: "Eyedropper", icon: "💧" },
];

const ZOOM_STEPS = [1, 2, 4, 8];

/**
 * Tool palette (§3.2 Tool Palette column). Paint tools switch the active
 * tool; AI/selection tools live in `dictate-ai-stubs.tsx` or are marked
 * planned so this palette never implies a working backend.
 */
export function DictateToolbar({
  tool,
  onTool,
  color,
  onColor,
  size,
  onSize,
  zoom,
  onZoom,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  undoDepth,
  onExport,
}: DictateToolbarProps) {
  return (
    <section
      aria-label="Tool palette"
      className="flex w-44 flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3"
    >
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
        Tools
      </h2>

      {PAINT_BUTTONS.map((button) => (
        <button
          key={button.id}
          type="button"
          onClick={() => onTool(button.id)}
          className={`rounded p-2 text-left text-xs font-bold ${
            tool === button.id
              ? "bg-cyan-500 text-black"
              : "bg-slate-800 text-slate-200"
          }`}
        >
          {button.icon} {button.label}
        </button>
      ))}

      <label className="mt-1 text-[10px] text-slate-400">
        Color
        <input
          type="color"
          value={color}
          onChange={(e) => onColor(e.target.value)}
          className="mt-1 h-8 w-full cursor-pointer rounded border border-slate-700 bg-transparent"
        />
      </label>

      <label className="text-[10px] text-slate-400">
        Size: {size}px
        <input
          type="range"
          min={1}
          max={64}
          value={size}
          onChange={(e) => onSize(Number(e.target.value))}
          className="w-full"
        />
      </label>

      <div className="text-[10px] text-slate-400">
        Zoom
        <div className="mt-1 grid grid-cols-4 gap-1">
          {ZOOM_STEPS.map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => onZoom(step)}
              className={`rounded px-1 py-0.5 text-[11px] font-bold ${
                zoom === step
                  ? "bg-cyan-500 text-black"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {step}x
            </button>
          ))}
        </div>
      </div>

      <div className="mt-1 border-t border-slate-800 pt-2">
        <p className="text-[10px] text-slate-400">
          Undo history: {undoDepth}/30 steps
        </p>
        <div className="mt-1 grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="rounded bg-slate-800 px-1 py-1 text-[11px] font-bold text-slate-200 disabled:opacity-30"
          >
            ↩ Undo
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="rounded bg-slate-800 px-1 py-1 text-[11px] font-bold text-slate-200 disabled:opacity-30"
          >
            ↪ Redo
          </button>
        </div>
        <button
          type="button"
          onClick={onExport}
          className="mt-1.5 w-full rounded bg-emerald-500 px-1 py-1.5 text-xs font-bold text-black hover:bg-emerald-400"
        >
          ⬇ Export PNG
        </button>
      </div>
    </section>
  );
}
