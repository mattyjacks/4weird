"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CSS_W = 640;
const CSS_H = 400;
const MAX_UNDO = 25;

type Tool = "brush" | "eraser" | "stamp-circle" | "stamp-star";

interface UndoEntry {
  layers: (ImageData | null)[];
}

function setupLayer(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// DictatePic paint studio: real canvas painter — 2 layers, brush/eraser/
// stamps, 20+ step undo, HiDPI backing store, PNG export. All on-device.
export function PaintStudio() {
  const displayRef = useRef<HTMLCanvasElement | null>(null);
  const layersRef = useRef<(HTMLCanvasElement | null)[]>([null, null]);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const dprRef = useRef(1);

  const [tool, setTool] = useState<Tool>("brush");
  const [color, setColor] = useState("#22d3ee");
  const [brushSize, setBrushSize] = useState(12);
  const [activeLayer, setActiveLayer] = useState(0);
  const [visible, setVisible] = useState<[boolean, boolean]>([true, true]);
  const [undoDepth, setUndoDepth] = useState(0);
  const [status, setStatus] = useState("Paint on the canvas — every control works locally, nothing uploads.");
  const undoRef = useRef<UndoEntry[]>([]);
  const visibleRef = useRef<[boolean, boolean]>([true, true]);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  const composite = useCallback(() => {
    const display = displayRef.current;
    if (!display) return;
    const ctx = display.getContext("2d");
    if (!ctx) return;
    const dpr = dprRef.current;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, display.width, display.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Checkerboard backdrop for transparency feel.
    const tile = 16;
    for (let y = 0; y < CSS_H; y += tile) {
      for (let x = 0; x < CSS_W; x += tile) {
        ctx.fillStyle = (x / tile + y / tile) % 2 === 0 ? "#0f172a" : "#1e293b";
        ctx.fillRect(x, y, tile, tile);
      }
    }
    layersRef.current.forEach((layer, i) => {
      if (layer && visibleRef.current[i]) ctx.drawImage(layer, 0, 0, CSS_W, CSS_H);
    });
    ctx.restore();
  }, []);

  useEffect(() => {
    const dpr = typeof window !== "undefined" ? Math.min(3, window.devicePixelRatio || 1) : 1;
    dprRef.current = dpr;
    const bw = Math.round(CSS_W * dpr);
    const bh = Math.round(CSS_H * dpr);
    layersRef.current = [setupLayer(bw, bh), setupLayer(bw, bh)];
    layersRef.current.forEach((layer) => {
      const ctx = layer?.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    });
    const display = displayRef.current;
    if (display) {
      display.width = bw;
      display.height = bh;
    }
    composite();
  }, [composite]);

  const pushUndo = useCallback(() => {
    const snap: (ImageData | null)[] = layersRef.current.map((layer) => {
      if (!layer) return null;
      const ctx = layer.getContext("2d");
      if (!ctx) return null;
      try {
        return ctx.getImageData(0, 0, layer.width, layer.height);
      } catch {
        return null;
      }
    });
    undoRef.current.push({ layers: snap });
    if (undoRef.current.length > MAX_UNDO) undoRef.current.shift();
    setUndoDepth(undoRef.current.length);
  }, []);

  const undo = useCallback(() => {
    const entry = undoRef.current.pop();
    if (!entry) {
      setStatus("Nothing to undo.");
      return;
    }
    entry.layers.forEach((img, i) => {
      const layer = layersRef.current[i];
      if (!layer || !img) return;
      const ctx = layer.getContext("2d");
      if (!ctx) return;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, layer.width, layer.height);
      ctx.putImageData(img, 0, 0);
      ctx.restore();
    });
    setUndoDepth(undoRef.current.length);
    composite();
    setStatus(`Undone — ${undoRef.current.length} step(s) left in history.`);
  }, [composite]);

  const toCanvasPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const el = displayRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CSS_W;
    const y = ((e.clientY - rect.top) / rect.height) * CSS_H;
    return { x, y };
  }, []);

  const activeCtx = useCallback(() => {
    const layer = layersRef.current[activeLayer];
    return layer?.getContext("2d") ?? null;
  }, [activeLayer]);

  const stamp = useCallback(
    (x: number, y: number) => {
      const ctx = activeCtx();
      if (!ctx) return;
      const r = Math.max(4, brushSize * 1.5);
      if (tool === "stamp-circle") {
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        drawStar(ctx, x, y, r, color);
      }
      composite();
    },
    [activeCtx, brushSize, color, composite, tool],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const pt = toCanvasPoint(e);
      pushUndo();
      drawingRef.current = true;
      lastRef.current = pt;
      (e.target as HTMLCanvasElement).setPointerCapture?.(e.pointerId);
      if (tool === "stamp-circle" || tool === "stamp-star") {
        stamp(pt.x, pt.y);
        drawingRef.current = false;
        lastRef.current = null;
        setStatus(`Stamped on layer ${activeLayer + 1}.`);
        return;
      }
      const ctx = activeCtx();
      if (!ctx) return;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = tool === "eraser" ? "rgba(0,0,0,1)" : color;
      ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
      ctx.lineWidth = brushSize;
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(pt.x + 0.01, pt.y + 0.01);
      ctx.stroke();
      ctx.restore();
      composite();
    },
    [activeCtx, activeLayer, brushSize, color, composite, pushUndo, stamp, toCanvasPoint, tool],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      if (tool === "stamp-circle" || tool === "stamp-star") return;
      const pt = toCanvasPoint(e);
      const last = lastRef.current ?? pt;
      const ctx = activeCtx();
      if (!ctx) return;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = tool === "eraser" ? "rgba(0,0,0,1)" : color;
      ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
      ctx.lineWidth = brushSize;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      ctx.restore();
      lastRef.current = pt;
      composite();
    },
    [activeCtx, brushSize, color, composite, toCanvasPoint, tool],
  );

  const endStroke = useCallback(() => {
    if (drawingRef.current) setStatus(`Stroke on layer ${activeLayer + 1} — ${undoRef.current.length} undo step(s).`);
    drawingRef.current = false;
    lastRef.current = null;
  }, [activeLayer]);

  const clearLayer = useCallback(() => {
    if (!window.confirm(`Clear layer ${activeLayer + 1}? This erases every stroke on that layer.`)) return;
    pushUndo();
    const layer = layersRef.current[activeLayer];
    const ctx = layer?.getContext("2d");
    if (ctx && layer) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, layer.width, layer.height);
      ctx.restore();
    }
    composite();
    setStatus(`Layer ${activeLayer + 1} cleared.`);
  }, [activeLayer, composite, pushUndo]);

  const exportPng = useCallback(() => {
    const out = document.createElement("canvas");
    out.width = CSS_W;
    out.height = CSS_H;
    const ctx = out.getContext("2d");
    if (!ctx) {
      setStatus("PNG export is unavailable in this browser.");
      return;
    }
    // Flatten on dark background so transparent pixels stay readable.
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, CSS_W, CSS_H);
    layersRef.current.forEach((layer, i) => {
      if (layer && visibleRef.current[i]) ctx.drawImage(layer, 0, 0, CSS_W, CSS_H);
    });
    out.toBlob((blob) => {
      if (!blob) {
        setStatus("PNG export failed — try again.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dictatepic-painting.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatus("PNG exported — check your downloads.");
    }, "image/png");
  }, []);

  const toggleVisible = (i: number) => {
    setVisible((prev) => {
      const next: [boolean, boolean] = [prev[0], prev[1]];
      next[i] = !next[i];
      return next;
    });
    window.setTimeout(composite, 0);
  };

  const tools: { id: Tool; label: string }[] = [
    { id: "brush", label: "Brush" },
    { id: "eraser", label: "Eraser" },
    { id: "stamp-circle", label: "Stamp: circle" },
    { id: "stamp-star", label: "Stamp: star" },
  ];

  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
        <div className="flex flex-wrap items-end gap-5">
          <fieldset>
            <legend className="text-xs font-bold uppercase tracking-widest text-slate-500">Tool</legend>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Paint tool">
              {tools.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={tool === t.id}
                  onClick={() => {
                    setTool(t.id);
                    setStatus(`Tool: ${t.label}.`);
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    tool === t.id
                      ? "bg-cyan-300 text-slate-950"
                      : "border border-white/20 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="paint-color" className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Color
            </label>
            <input
              id="paint-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="mt-2 block h-10 w-20 cursor-pointer rounded-lg border border-white/20 bg-black/40"
            />
          </div>
          <div className="min-w-44 flex-1">
            <label htmlFor="paint-size" className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Brush size: {brushSize}px
            </label>
            <input
              id="paint-size"
              type="range"
              min={1}
              max={64}
              step={1}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="mt-2 w-full accent-cyan-300"
            />
          </div>
        </div>

        <canvas
          ref={displayRef}
          style={{ width: "100%", height: "auto", aspectRatio: `${CSS_W} / ${CSS_H}` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerLeave={endStroke}
          role="img"
          aria-label={`Paint canvas, ${CSS_W} by ${CSS_H} pixels, drawing on layer ${activeLayer + 1}`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              undo();
            }
          }}
          className="mt-5 block w-full cursor-crosshair touch-none rounded-2xl border border-white/10"
        />
        <p aria-live="polite" role="status" className="mt-3 text-sm text-slate-300">
          {status}
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={undo}
            disabled={undoDepth === 0}
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-40"
          >
            Undo ({undoDepth})
          </button>
          <button
            type="button"
            onClick={clearLayer}
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/10"
          >
            Clear layer {activeLayer + 1}
          </button>
          <button
            type="button"
            onClick={exportPng}
            className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
          >
            Export PNG
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
        <h2 className="text-lg font-black">Layers</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className={`rounded-2xl border p-4 ${activeLayer === i ? "border-cyan-300/60 bg-cyan-300/5" : "border-white/10 bg-black/40"}`}>
              <p className="font-bold text-white">Layer {i + 1}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveLayer(i);
                    setStatus(`Active layer: ${i + 1}.`);
                  }}
                  aria-pressed={activeLayer === i}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeLayer === i ? "bg-cyan-300 text-slate-950" : "border border-white/20 hover:bg-white/10"
                  }`}
                >
                  {activeLayer === i ? "Active" : "Set active"}
                </button>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={visible[i]}
                    onChange={() => toggleVisible(i)}
                    className="h-4 w-4 accent-cyan-300"
                  />
                  Visible
                </label>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Two-layer stack — strokes land on the active layer, hidden layers stay in the file but skip the composite and PNG.
          Undo keeps the last {MAX_UNDO} strokes (Ctrl/⌘+Z works when the canvas is focused).
        </p>
      </div>
    </div>
  );
}
