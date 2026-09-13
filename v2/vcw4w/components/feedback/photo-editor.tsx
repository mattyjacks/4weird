"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PhotoEditorImage = Blob | string;

export type PhotoEditorProps = {
  image: PhotoEditorImage;
  onDone: (jpgBlob: Blob) => void;
  onCancel: () => void;
};

type Point = { x: number; y: number };

type Stroke = {
  kind: "stroke";
  points: Point[];
  color: string;
  width: number;
};

type LabelPin = {
  kind: "label";
  id: number;
  x: number;
  y: number;
  text: string;
};

type Action = { kind: "stroke" } | { kind: "label"; id: number };

const DEFAULT_COLOR = "#ff3b30";
const LABEL_COLOR = "#ffd60a";

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function loadBaseImage(src: PhotoEditorImage): Promise<{ el: HTMLImageElement; objectUrl: string | null }> {
  return new Promise((resolve, reject) => {
    const objectUrl = src instanceof Blob ? URL.createObjectURL(src) : null;
    const url: string = objectUrl ?? (src as string);
    const el = new Image();
    el.decoding = "async";
    el.onload = () => resolve({ el, objectUrl });
    el.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load image for editing."));
    };
    el.src = url;
  });
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default function PhotoEditor({ image, onDone, onCancel }: PhotoEditorProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [mode, setMode] = useState<"draw" | "label">("draw");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [brush, setBrush] = useState(6);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [labels, setLabels] = useState<LabelPin[]>([]);
  const [history, setHistory] = useState<Action[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const baseRef = useRef<HTMLImageElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const drawingRef = useRef<Stroke | null>(null);
  const idRef = useRef(1);
  const objectUrlRef = useRef<string | null>(null);

  // Load base image once per `image` prop. Keeps the previous photo visible
  // until the next one resolves (no flicker), so no synchronous reset here.
  useEffect(() => {
    let cancelled = false;
    loadBaseImage(image)
      .then(({ el, objectUrl }) => {
        if (cancelled) {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          return;
        }
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = objectUrl;
        baseRef.current = el;
        setNatural({ w: el.naturalWidth || el.width, h: el.naturalHeight || el.height });
        setSrc(el.src);
        setLoadError(null);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load that image. Try a JPG or PNG and try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [image]);

  // Revoke blob URL on unmount.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const redrawOverlay = useCallback(() => {
    const canvas = overlayRef.current;
    const base = baseRef.current;
    if (!canvas || !base || !natural.w || !natural.h) return;
    const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    canvas.width = Math.round(natural.w * dpr);
    canvas.height = Math.round(natural.h * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, natural.w, natural.h);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of strokes) {
      if (s.points.length === 0) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.beginPath();
      if (s.points.length === 1) {
        const p = s.points[0];
        ctx.fillStyle = s.color;
        ctx.arc(p.x * natural.w, p.y * natural.h, Math.max(1, s.width / 2), 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      s.points.forEach((p, i) => {
        const px = p.x * natural.w;
        const py = p.y * natural.h;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }
    // Label pins: dot + numbered badge.
    ctx.font = `700 ${Math.max(14, Math.round(natural.w / 40))}px system-ui, sans-serif`;
    ctx.textBaseline = "middle";
    labels.forEach((l, idx) => {
      const px = l.x * natural.w;
      const py = l.y * natural.h;
      ctx.fillStyle = LABEL_COLOR;
      ctx.strokeStyle = "#111";
      ctx.lineWidth = Math.max(2, natural.w / 400);
      ctx.beginPath();
      ctx.arc(px, py, Math.max(8, natural.w / 60), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#111";
      ctx.textAlign = "center";
      ctx.fillText(String(idx + 1), px, py + 1);
    });
  }, [strokes, labels, natural]);

  useEffect(() => {
    redrawOverlay();
  }, [redrawOverlay, src]);

  const toNormalized = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const canvas = overlayRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      return {
        x: clamp01((clientX - rect.left) / rect.width),
        y: clamp01((clientY - rect.top) / rect.height),
      };
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!src || exporting) return;
      const pt = toNormalized(e.clientX, e.clientY);
      if (!pt) return;
      if (mode === "label") return; // labels are placed on click (tap) so keyboard/prompt flow stays intact
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // setPointerCapture is best-effort on some mobile browsers
      }
      drawingRef.current = { kind: "stroke", points: [pt], color, width: brush };
    },
    [src, exporting, mode, color, brush, toNormalized]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const active = drawingRef.current;
      if (!active) return;
      if ((e.buttons & 1) !== 1 && e.pointerType === "mouse") return;
      const pt = toNormalized(e.clientX, e.clientY);
      if (!pt) return;
      e.preventDefault();
      active.points.push(pt);
      // Live-draw just the newest segment for responsiveness.
      const canvas = overlayRef.current;
      const base = baseRef.current;
      if (!canvas || !base) return;
      redrawOverlay();
    },
    [toNormalized, redrawOverlay]
  );

  const finishStroke = useCallback(() => {
    const active = drawingRef.current;
    drawingRef.current = null;
    if (!active || active.points.length === 0) return;
    setStrokes((prev) => [...prev, active]);
    setHistory((prev) => [...prev, { kind: "stroke" }]);
  }, []);

  const handleTap = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (mode !== "label" || !src || exporting) return;
      const pt = toNormalized(e.clientX, e.clientY);
      if (!pt) return;
      const text = typeof window !== "undefined" ? window.prompt("Label text", "") : null;
      if (text === null) return; // user cancelled the prompt
      const clean = text.trim().slice(0, 140);
      if (!clean) return;
      const id = idRef.current++;
      setLabels((prev) => [...prev, { kind: "label", id, x: pt.x, y: pt.y, text: clean }]);
      setHistory((prev) => [...prev, { kind: "label", id }]);
    },
    [mode, src, exporting, toNormalized]
  );

  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.kind === "stroke") {
        setStrokes((s) => s.slice(0, -1));
      } else {
        const id = last.id;
        setLabels((ls) => ls.filter((l) => l.id !== id));
      }
      return prev.slice(0, -1);
    });
  }, []);

  const handleClear = useCallback(() => {
    drawingRef.current = null;
    setStrokes([]);
    setLabels([]);
    setHistory([]);
    setExportError(null);
  }, []);

  const handleRemoveLabel = useCallback((id: number) => {
    setLabels((prev) => prev.filter((l) => l.id !== id));
    setHistory((prev) => prev.filter((a) => !(a.kind === "label" && a.id === id)));
  }, []);

  const handleExport = useCallback(() => {
    const base = baseRef.current;
    if (!base || !natural.w || !natural.h) {
      setExportError("Image is still loading — try again in a moment.");
      return;
    }
    setExporting(true);
    setExportError(null);
    try {
      const out = document.createElement("canvas");
      out.width = natural.w;
      out.height = natural.h;
      const ctx = out.getContext("2d");
      if (!ctx) {
        setExportError("Canvas is not available in this browser.");
        setExporting(false);
        return;
      }
      // JPEG has no alpha: paint white first so transparent PNGs burn cleanly.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, natural.w, natural.h);
      ctx.drawImage(base, 0, 0, natural.w, natural.h);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const s of strokes) {
        if (s.points.length === 0) continue;
        ctx.strokeStyle = s.color;
        ctx.fillStyle = s.color;
        ctx.lineWidth = s.width;
        if (s.points.length === 1) {
          const p = s.points[0];
          ctx.beginPath();
          ctx.arc(p.x * natural.w, p.y * natural.h, Math.max(1, s.width / 2), 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        ctx.beginPath();
        s.points.forEach((p, i) => {
          const px = p.x * natural.w;
          const py = p.y * natural.h;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      }
      // Burn labels: numbered pin + pill with text.
      const fontSize = Math.max(14, Math.round(natural.w / 40));
      ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
      labels.forEach((l, idx) => {
        const px = l.x * natural.w;
        const py = l.y * natural.h;
        const r = Math.max(10, natural.w / 55);
        ctx.fillStyle = LABEL_COLOR;
        ctx.strokeStyle = "#111111";
        ctx.lineWidth = Math.max(2, natural.w / 400);
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#111111";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(idx + 1), px, py + 1);
        // Pill to the right (clamped inside the image).
        const pad = Math.round(fontSize * 0.45);
        const textW = ctx.measureText(`${idx + 1}. ${l.text}`).width;
        const pillW = Math.min(natural.w - 16, textW + pad * 2);
        const pillH = fontSize + pad * 1.4;
        let pillX = px + r + 6;
        if (pillX + pillW > natural.w - 8) pillX = Math.max(8, px - r - 6 - pillW);
        const pillY = Math.min(Math.max(8, py - pillH / 2), natural.h - pillH - 8);
        ctx.fillStyle = "rgba(17, 17, 17, 0.85)";
        drawRoundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.fillText(`${idx + 1}. ${l.text}`, pillX + pad, pillY + pillH / 2 + 1, pillW - pad * 2);
      });
      out.toBlob(
        (blob) => {
          setExporting(false);
          if (!blob) {
            setExportError("Export failed — your browser refused the JPEG. Try again.");
            return;
          }
          onDone(blob);
        },
        "image/jpeg",
        0.92
      );
    } catch {
      setExporting(false);
      setExportError("Export failed — try again.");
    }
  }, [natural, strokes, labels, onDone]);

  const canEdit = src !== null && loadError === null;
  const hasWork = strokes.length > 0 || labels.length > 0;

  return (
    <div className="flex w-full flex-col gap-3" data-testid="photo-editor">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border" role="group" aria-label="Edit mode">
          <button
            type="button"
            onClick={() => setMode("draw")}
            aria-pressed={mode === "draw"}
            className={`min-h-[44px] px-4 text-sm font-medium ${mode === "draw" ? "bg-foreground text-background" : "bg-background"}`}
          >
            Draw
          </button>
          <button
            type="button"
            onClick={() => setMode("label")}
            aria-pressed={mode === "label"}
            className={`min-h-[44px] px-4 text-sm font-medium ${mode === "label" ? "bg-foreground text-background" : "bg-background"}`}
          >
            Label
          </button>
        </div>
        <label className="flex min-h-[44px] items-center gap-2 rounded-lg border px-3 text-sm">
          <span className="opacity-70">Color</span>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            aria-label="Stroke color"
            className="h-8 w-10 cursor-pointer bg-transparent"
          />
        </label>
        <label className="flex min-h-[44px] items-center gap-2 rounded-lg border px-3 text-sm">
          <span className="opacity-70">Size {brush}px</span>
          <input
            type="range"
            min={2}
            max={32}
            step={1}
            value={brush}
            onChange={(e) => setBrush(Number(e.target.value))}
            aria-label="Brush size"
            className="w-24"
          />
        </label>
        <div className="ms-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0}
            className="min-h-[44px] rounded-lg border px-4 text-sm font-medium disabled:opacity-40"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={!hasWork}
            className="min-h-[44px] rounded-lg border px-4 text-sm font-medium disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      </div>

      <p className="text-xs opacity-70" role="status">
        {mode === "draw"
          ? "Drag with mouse or finger to draw. Switch to Label, then tap the photo to pin smart text."
          : "Tap the photo to drop a label pin, then type its text."}
      </p>

      <div ref={wrapRef} className="relative w-full overflow-hidden rounded-xl border bg-muted">
        {loadError ? (
          <p className="p-6 text-sm text-red-500">{loadError}</p>
        ) : !src ? (
          <p className="p-6 text-sm opacity-70">Loading image…</p>
        ) : (
          <>
            {/* Base photo: plain img so EXIF-correct sizing is free; overlay canvas draws strokes + pins. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- blob/dataURL annotation source; next/image would remap pixels */}
            <img
              src={src}
              alt="Photo being annotated"
              draggable={false}
              className="block h-auto w-full select-none"
              style={{ aspectRatio: natural.w && natural.h ? `${natural.w} / ${natural.h}` : undefined }}
            />
            <canvas
              ref={overlayRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishStroke}
              onPointerCancel={finishStroke}
              onPointerLeave={finishStroke}
              onClick={handleTap}
              className="absolute inset-0 h-full w-full cursor-crosshair"
              style={{ touchAction: "none" }}
              aria-label={mode === "draw" ? "Draw on photo" : "Tap photo to add a label"}
            />
          </>
        )}
      </div>

      {labels.length > 0 && (
        <ol className="flex flex-col gap-1.5" aria-label="Labels">
          {labels.map((l, idx) => (
            <li key={l.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <span
                aria-hidden="true"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-black"
                style={{ backgroundColor: LABEL_COLOR }}
              >
                {idx + 1}
              </span>
              <span className="min-w-0 flex-1 truncate">{l.text}</span>
              <button
                type="button"
                onClick={() => handleRemoveLabel(l.id)}
                aria-label={`Remove label ${idx + 1}`}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md px-2 opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </li>
          ))}
        </ol>
      )}

      {exportError && (
        <p className="text-sm text-red-500" role="alert">
          {exportError}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleExport}
          disabled={!canEdit || exporting}
          className="min-h-[44px] flex-1 rounded-lg bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-40 sm:flex-none sm:px-8"
        >
          {exporting ? "Exporting…" : "Done — export JPG"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={exporting}
          className="min-h-[44px] rounded-lg border px-4 text-sm font-medium disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
