"use client";

import {
  DICTATE_BLEND_MODES,
  DICTATE_UNDO_LIMIT,
  type DictateBlendMode,
  type DictateLayerMeta,
} from "@/types/dictate-pic";
import { isBlendMode, layerOpacityToAlpha } from "@/lib/remastery/dictate-pic";

interface LayersPanelProps {
  layers: DictateLayerMeta[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onToggleLock: (id: string) => void;
  onOpacity: (id: string, v: number) => void;
  onBlend: (id: string, mode: DictateBlendMode) => void;
  onUndo: () => void;
  canUndo: boolean;
  undoDepth: number;
  onExport: () => void;
}

/**
 * LayersPanel — GIMP-style layer stack (§3.2 blueprint).
 * Metadata-only props; live canvases stay in the editor's ref Map.
 */
export function LayersPanel({
  layers,
  activeId,
  onSelect,
  onAdd,
  onRemove,
  onToggleVisible,
  onToggleLock,
  onOpacity,
  onBlend,
  onUndo,
  canUndo,
  undoDepth,
  onExport,
}: LayersPanelProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Layers ({layers.length})
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="rounded bg-slate-800 px-2 py-1 text-xs font-bold text-slate-200"
        >
          ＋ Add
        </button>
      </div>

      <ol className="flex flex-col-reverse gap-2">
        {layers.map((layer) => {
          const active = layer.id === activeId;
          return (
            <li
              key={layer.id}
              className={`rounded border p-2 ${
                active ? "border-cyan-500 bg-slate-800" : "border-slate-800 bg-slate-900"
              }`}
            >
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSelect(layer.id)}
                  aria-pressed={active}
                  className="flex-1 truncate rounded px-1 py-1 text-left text-xs font-bold text-slate-100"
                >
                  {layer.name}
                </button>
                <button
                  type="button"
                  onClick={() => onToggleVisible(layer.id)}
                  aria-label={`Toggle visibility of ${layer.name}`}
                  title={layer.visible ? "Hide layer" : "Show layer"}
                  className="rounded bg-slate-800 px-1.5 py-1 text-xs"
                >
                  {layer.visible ? "👁️" : "🚫"}
                </button>
                <button
                  type="button"
                  onClick={() => onToggleLock(layer.id)}
                  aria-label={`${layer.locked ? "Unlock" : "Lock"} ${layer.name}`}
                  title={layer.locked ? "Unlock layer" : "Lock layer"}
                  className="rounded bg-slate-800 px-1.5 py-1 text-xs"
                >
                  {layer.locked ? "🔒" : "🔓"}
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(layer.id)}
                  aria-label={`Delete ${layer.name}`}
                  title="Delete layer"
                  className="rounded bg-slate-800 px-1.5 py-1 text-xs text-red-300"
                >
                  🗑️
                </button>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <label
                  className="text-[10px] text-slate-400"
                  htmlFor={`opacity-${layer.id}`}
                >
                  {Math.round(layerOpacityToAlpha(layer.opacity) * 100)}%
                </label>
                <input
                  id={`opacity-${layer.id}`}
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(layerOpacityToAlpha(layer.opacity) * 100)}
                  onChange={(e) => onOpacity(layer.id, Number(e.target.value) / 100)}
                  className="w-full"
                />
              </div>
              <select
                value={layer.blendMode}
                onChange={(e) => {
                  if (isBlendMode(e.target.value)) onBlend(layer.id, e.target.value);
                }}
                aria-label={`Blend mode for ${layer.name}`}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-800 p-1 text-[11px] text-slate-200"
              >
                {DICTATE_BLEND_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ol>

      <div className="mt-1 flex gap-2">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title={`Undo (${undoDepth}/${DICTATE_UNDO_LIMIT} snapshots)`}
          className="flex-1 rounded bg-slate-800 p-2 text-xs font-bold text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ↩️ Undo ({undoDepth}/{DICTATE_UNDO_LIMIT})
        </button>
        <button
          type="button"
          onClick={onExport}
          className="flex-1 rounded bg-cyan-500 p-2 text-xs font-bold text-black"
        >
          ⬇️ PNG
        </button>
      </div>
    </div>
  );
}
