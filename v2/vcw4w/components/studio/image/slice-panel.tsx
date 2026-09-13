"use client";

import { useMemo, useState } from "react";
import { scaleRect, sliceSpritesheet } from "@/lib/remastery/dictate-pic";
import { interopBus } from "@/lib/interop";

interface SlicePanelProps {
  docW?: number;
  docH?: number;
}

/**
 * SlicePanel — spritesheet slicer (§3.2 "Slice Spritesheet").
 * Pure math via lib/remastery/dictate-pic (sliceSpritesheet + scaleRect);
 * copy-to-clipboard is fail-open and the plan is announced on interopBus.
 */
export function SlicePanel({ docW = 512, docH = 512 }: SlicePanelProps) {
  const [frameW, setFrameW] = useState<number>(64);
  const [frameH, setFrameH] = useState<number>(64);
  const [scale, setScale] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);

  const rects = useMemo(() => {
    try {
      return sliceSpritesheet(docW, docH, frameW, frameH);
    } catch {
      return [];
    }
  }, [docW, docH, frameW, frameH]);

  const scaled = useMemo(() => {
    try {
      return rects.slice(0, 4).map((r) => scaleRect(r, scale));
    } catch {
      return [];
    }
  }, [rects, scale]);

  const handleCopy = async () => {
    try {
      const payload = JSON.stringify(
        { sheet: { w: docW, h: docH }, frame: { w: frameW, h: frameH }, frames: rects },
        null,
        2,
      );
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      interopBus.emit("tools:used", { tool: "dictate-pic", action: "slice:copy" });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
        Spritesheet slice
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[10px] text-slate-400">
          Frame W
          <input
            type="number"
            min={1}
            max={docW}
            value={frameW}
            onChange={(e) => setFrameW(Math.floor(Number(e.target.value)) || 1)}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-800 p-1 text-xs text-slate-100"
          />
        </label>
        <label className="text-[10px] text-slate-400">
          Frame H
          <input
            type="number"
            min={1}
            max={docH}
            value={frameH}
            onChange={(e) => setFrameH(Math.floor(Number(e.target.value)) || 1)}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-800 p-1 text-xs text-slate-100"
          />
        </label>
      </div>
      <label className="text-[10px] text-slate-400">
        Preview scale ×{scale}
        <input
          type="range"
          min={1}
          max={4}
          step={1}
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
          className="w-full"
        />
      </label>
      <p className="text-[11px] text-slate-300">
        {rects.length === 0
          ? "Frame is bigger than the sheet — no frames (fail-open)."
          : `${rects.length} frames (${Math.floor(docW / frameW)} × ${Math.floor(docH / frameH)}).`}
      </p>
      {scaled.length > 0 && (
        <ul className="text-[10px] text-slate-500">
          {scaled.map((r, i) => (
            <li key={i}>
              #{i}: x{r.x} y{r.y} {r.w}×{r.h}
            </li>
          ))}
          {rects.length > 4 && <li>…and {rects.length - 4} more</li>}
        </ul>
      )}
      <button
        type="button"
        onClick={handleCopy}
        className="rounded bg-slate-800 p-2 text-xs font-bold text-slate-200"
      >
        {copied ? "✅ Copied!" : "📋 Copy frame JSON"}
      </button>
    </div>
  );
}
