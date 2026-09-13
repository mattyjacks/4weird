"use client";

import { useEffect, useRef } from "react";
import { DICTATE_DOC_HEIGHT, DICTATE_DOC_WIDTH } from "@/types/dictate-pic";

interface DictateCanvasProps {
  /** Editor stores the live display canvas (composited in an effect). */
  onDisplayReady: (canvas: HTMLCanvasElement | null) => void;
  /** Document-space (0–511, integer) pointer events from the viewport. */
  onStrokeStart: (x: number, y: number) => void;
  onStrokeMove: (x: number, y: number) => void;
  onStrokeEnd: () => void;
  /** CSS zoom multiplier (document stays 512px internally). */
  zoom: number;
  eyedropperActive: boolean;
}

/**
 * Multi-layer viewport canvas (§3.2). This component owns ONLY the display
 * canvas element — layer offscreens + the composite renderer live in
 * `dictate-editor.tsx` and repaint this canvas via `onDisplayReady`.
 * Pointer coordinates are floored to integer pixels (blueprint Tips §3.2).
 */
export function DictateCanvas({
  onDisplayReady,
  onStrokeStart,
  onStrokeMove,
  onStrokeEnd,
  zoom,
  eyedropperActive,
}: DictateCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Register the display canvas + lock pixel-crisp rendering (effect-only
  // browser access per axiom §1.2 — nothing touches `document` at render).
  useEffect(() => {
    const canvas = canvasRef.current;
    onDisplayReady(canvas);
    if (canvas) {
      try {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.imageSmoothingEnabled = false;
      } catch {
        // Fail-open: smoothing flag is cosmetic, never bricks the editor.
      }
    }
    return () => onDisplayReady(null);
  }, [onDisplayReady]);

  const toDocCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = DICTATE_DOC_WIDTH / rect.width;
    const scaleY = DICTATE_DOC_HEIGHT / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    return {
      x: Math.max(0, Math.min(DICTATE_DOC_WIDTH - 1, x)),
      y: Math.max(0, Math.min(DICTATE_DOC_HEIGHT - 1, y)),
    };
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <canvas
        ref={canvasRef}
        width={DICTATE_DOC_WIDTH}
        height={DICTATE_DOC_HEIGHT}
        style={{
          width: DICTATE_DOC_WIDTH * zoom,
          height: DICTATE_DOC_HEIGHT * zoom,
          imageRendering: "pixelated",
        }}
        className={`rounded border border-slate-700 shadow-2xl touch-none ${
          eyedropperActive ? "cursor-copy" : "cursor-crosshair"
        }`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const { x, y } = toDocCoords(e);
          onStrokeStart(x, y);
        }}
        onPointerMove={(e) => {
          if (!e.buttons) return;
          const { x, y } = toDocCoords(e);
          onStrokeMove(x, y);
        }}
        onPointerUp={onStrokeEnd}
        onPointerCancel={onStrokeEnd}
        aria-label="DictatePic layered canvas viewport (512 by 512 pixels)"
      />
      <p className="text-[11px] text-slate-500">
        512 × 512 document · integer-pixel coords · smoothing off
      </p>
    </div>
  );
}
