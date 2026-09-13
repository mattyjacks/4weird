"use client";

import type { DictateBlendMode, DictateLayerMeta } from "@/types/dictate-pic";
import { DICTATE_BLEND_MODES } from "@/types/dictate-pic";

interface DictateLayersProps {
  layers: DictateLayerMeta[];
  activeLayerId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onToggleVisible: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onOpacity: (id: string, opacity: number) => void;
  onBlendMode: (id: string, blendMode: DictateBlendMode) => void;
}

/**
 * Layers stack panel (§3.2: Layer 3 Hair [Normal] / Layer 2 Skin [Multiply]
 * / Layer 1 Base). Render order is bottom-to-top = array order; the panel
 * lists top-most first. Pure metadata in, callbacks out — no canvas access.
 */
export function DictateLayers({
  layers,
  activeLayerId,
  onSelect,
  onAdd,
  onDelete,
  onMove,
  onToggleVisible,
  onToggleLocked,
  onRename,
  onOpacity,
  onBlendMode,
}: DictateLayersProps) {
  const ordered = [...layers].reverse();

  return (
    <section
      aria-label="Layers stack"
      className="flex w-64 flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Layers ({layers.length})
        </h2>
        <button
          type="button"
          onClick={onAdd}
          className="rounded bg-cyan-500 px-2 py-1 text-xs font-bold text-black hover:bg-cyan-400"
        >
          + Add
        </button>
      </div>

      <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
        {ordered.map((layer) => {
          const isActive = layer.id === activeLayerId;
          return (
            <li
              key={layer.id}
              className={`rounded-lg border p-2 ${
                isActive
                  ? "border-cyan-500 bg-slate-800"
                  : "border-slate-700 bg-slate-900"
              }`}
            >
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title={layer.visible ? "Hide layer" : "Show layer"}
                  onClick={() => onToggleVisible(layer.id)}
                  className="rounded px-1 text-sm"
                >
                  {layer.visible ? "👁️" : "🚫"}
                </button>
                <button
                  type="button"
                  title={layer.locked ? "Unlock layer" : "Lock layer"}
                  onClick={() => onToggleLocked(layer.id)}
                  className="rounded px-1 text-sm"
                >
                  {layer.locked ? "🔒" : "🔓"}
                </button>
                <input
                  type="text"
                  value={layer.name}
                  maxLength={32}
                  onChange={(e) => onRename(layer.id, e.target.value)}
                  onFocus={() => onSelect(layer.id)}
                  aria-label="Layer name"
                  className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-xs text-white"
                />
              </div>

              <div className="mt-1.5 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSelect(layer.id)}
                  className={`flex-1 rounded px-1 py-0.5 text-[11px] font-bold ${
                    isActive
                      ? "bg-cyan-500 text-black"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {isActive ? "Active" : "Select"}
                </button>
                <button
                  type="button"
                  title="Move up (paints later)"
                  onClick={() => onMove(layer.id, 1)}
                  className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-300"
                >
                  ▲
                </button>
                <button
                  type="button"
                  title="Move down (paints earlier)"
                  onClick={() => onMove(layer.id, -1)}
                  className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-300"
                >
                  ▼
                </button>
                <button
                  type="button"
                  title="Delete layer"
                  onClick={() => onDelete(layer.id)}
                  disabled={layers.length <= 1}
                  className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-300 disabled:opacity-30"
                >
                  🗑
                </button>
              </div>

              <label className="mt-1.5 block text-[10px] text-slate-400">
                Opacity: {Math.round(layer.opacity * 100)}%
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(layer.opacity * 100)}
                  onChange={(e) =>
                    onOpacity(layer.id, Number(e.target.value) / 100)
                  }
                  className="w-full"
                />
              </label>

              <label className="block text-[10px] text-slate-400">
                Blend
                <select
                  value={layer.blendMode}
                  onChange={(e) =>
                    onBlendMode(layer.id, e.target.value as DictateBlendMode)
                  }
                  className="mt-0.5 w-full rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-[11px] text-white"
                >
                  {DICTATE_BLEND_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
