"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DICTATE_AI_STUBS,
  DICTATE_CHECKER_SIZE,
  DICTATE_DOC_HEIGHT,
  DICTATE_DOC_WIDTH,
  DICTATE_UNDO_LIMIT,
  type DictateAiStubId,
  type DictateLayer,
  type DictateLayerMeta,
  type DictateTool,
  type DictateUndoSnapshot,
} from "@/types/dictate-pic";
import {
  clampBrushSize,
  layerOpacityToAlpha,
} from "@/lib/remastery/dictate-pic";
import { interopBus } from "@/lib/interop";
import { DictateCanvas } from "../dictate-canvas";
import { ToolPalette } from "./tool-palette";
import { LayersPanel } from "./layers-panel";
import { SlicePanel } from "./slice-panel";

function newLayerId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `layer-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const num = Number.parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(num)) return { r: 34, g: 211, b: 238 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

/**
 * DictateImageEditor — Wave-3 DictatePic shell (§3.2).
 * Owns offscreen layer canvases in a ref Map (never in React state, never
 * serialized — see types/dictate-pic.ts). React state holds serializable
 * metadata only, so SSR/hydration stays clean; every canvas/DOM touch lives
 * in effects or pointer handlers (axiom §1.2). All AI entry points are
 * visibly disabled stubs with fail-open copy — they never call a backend.
 */
export function DictateImageEditor() {
  const [metas, setMetas] = useState<DictateLayerMeta[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [tool, setTool] = useState<DictateTool>("brush");
  const [color, setColor] = useState<string>("#22d3ee");
  const [size, setSize] = useState<number>(4);
  const [zoom, setZoom] = useState<number>(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [undoDepth, setUndoDepth] = useState<number>(0);

  const layersRef = useRef<Map<string, DictateLayer>>(new Map());
  const displayRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef<boolean>(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const undoRef = useRef<DictateUndoSnapshot[]>([]);
  const bootedRef = useRef<boolean>(false);

  const activeMeta = metas.find((m) => m.id === activeId) ?? null;

  // --- Composite: checkerboard + visible layers, pixel-crisp ---
  const composite = useCallback(() => {
    const display = displayRef.current;
    if (!display) return;
    try {
      const ctx = display.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, DICTATE_DOC_WIDTH, DICTATE_DOC_HEIGHT);
      const s = DICTATE_CHECKER_SIZE;
      for (let x = 0; x < DICTATE_DOC_WIDTH; x += s) {
        for (let y = 0; y < DICTATE_DOC_HEIGHT; y += s) {
          ctx.fillStyle =
            (x / s + y / s) % 2 === 0 ? "#1e293b" : "#0f172a";
          ctx.fillRect(x, y, s, s);
        }
      }
      for (const meta of layersRef.current.values()) {
        const live = layersRef.current.get(meta.id);
        if (!live || !meta.visible) continue;
        ctx.save();
        ctx.globalAlpha = layerOpacityToAlpha(meta.opacity);
        try {
          ctx.globalCompositeOperation =
            meta.blendMode as GlobalCompositeOperation;
        } catch {
          ctx.globalCompositeOperation = "source-over";
        }
        ctx.drawImage(live.canvas, 0, 0);
        ctx.restore();
      }
    } catch {
      // Fail-open: a composite miss never bricks the editor.
    }
  }, []);

  // --- Boot: two document-sized layers (reviewer paints on two layers) ---
  useEffect(() => {
    if (bootedRef.current) {
      composite();
      return;
    }
    bootedRef.current = true;
    try {
      const make = (
        name: string,
      ): DictateLayer | null => {
        const canvas = document.createElement("canvas");
        canvas.width = DICTATE_DOC_WIDTH;
        canvas.height = DICTATE_DOC_HEIGHT;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return null;
        ctx.imageSmoothingEnabled = false;
        return {
          id: newLayerId(),
          name,
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: "source-over",
          canvas,
          ctx,
        };
      };
      const bg = make("Background");
      const ink = make("Ink");
      if (!bg || !ink) {
        setNotice("Canvas 2D is unavailable in this browser — editor is read-only.");
        return;
      }
      layersRef.current.set(bg.id, bg);
      layersRef.current.set(ink.id, ink);
      setMetas([
        {
          id: bg.id,
          name: bg.name,
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: "source-over",
        },
        {
          id: ink.id,
          name: ink.name,
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: "source-over",
        },
      ]);
      setActiveId(ink.id);
    } catch {
      setNotice("Could not initialise layers — your work is safe, try reloading.");
    }
  }, [composite]);

  // Re-composite whenever metadata changes.
  useEffect(() => {
    composite();
  }, [metas, composite]);

  const onDisplayReady = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      displayRef.current = canvas;
      if (canvas) composite();
    },
    [composite],
  );

  // --- Undo (bounded: 30 snapshots, data-URL per layer) ---
  const snapshot = useCallback((layerId: string, label: string) => {
    const layer = layersRef.current.get(layerId);
    if (!layer) return;
    try {
      const dataUrl = layer.canvas.toDataURL("image/png");
      undoRef.current.push({ layerId, dataUrl, label });
      while (undoRef.current.length > DICTATE_UNDO_LIMIT) {
        undoRef.current.shift();
      }
      setUndoDepth(undoRef.current.length);
    } catch {
      // Fail-open: snapshotting is best-effort (e.g. tainted canvas).
    }
  }, []);

  const handleUndo = useCallback(() => {
    const snap = undoRef.current.pop();
    setUndoDepth(undoRef.current.length);
    if (!snap) {
      setNotice("Nothing to undo yet — paint a stroke first.");
      return;
    }
    const layer = layersRef.current.get(snap.layerId);
    if (!layer) {
      setNotice("That layer is gone — undo skipped (fail-open).");
      return;
    }
    try {
      const img = new Image();
      img.onload = () => {
        try {
          layer.ctx.save();
          layer.ctx.globalCompositeOperation = "source-over";
          layer.ctx.clearRect(0, 0, DICTATE_DOC_WIDTH, DICTATE_DOC_HEIGHT);
          layer.ctx.drawImage(img, 0, 0);
          layer.ctx.restore();
          composite();
        } catch {
          // Fail-open on restore.
        }
      };
      img.src = snap.dataUrl;
      interopBus.emit("tools:used", { tool: "dictate-pic", action: "undo" });
    } catch {
      setNotice("Undo failed — canvas left untouched (fail-open).");
    }
  }, [composite]);

  // --- Flood fill (bucket): scanline fill on integer pixels ---
  const floodFill = useCallback(
    (layer: DictateLayer, startX: number, startY: number) => {
      try {
        const { r, g, b } = hexToRgb(color);
        const image = layer.ctx.getImageData(
          0,
          0,
          DICTATE_DOC_WIDTH,
          DICTATE_DOC_HEIGHT,
        );
        const data = image.data;
        const at = (x: number, y: number) => (y * DICTATE_DOC_WIDTH + x) * 4;
        const si = at(startX, startY);
        const tr = data[si];
        const tg = data[si + 1];
        const tb = data[si + 2];
        const ta = data[si + 3];
        if (tr === r && tg === g && tb === b && ta === 255) return;
        const stack: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
        const seen = new Uint8Array(DICTATE_DOC_WIDTH * DICTATE_DOC_HEIGHT);
        while (stack.length > 0) {
          const { x, y } = stack.pop() as { x: number; y: number };
          if (x < 0 || y < 0 || x >= DICTATE_DOC_WIDTH || y >= DICTATE_DOC_HEIGHT) continue;
          const idx = y * DICTATE_DOC_WIDTH + x;
          if (seen[idx]) continue;
          seen[idx] = 1;
          const i = at(x, y);
          if (data[i] !== tr || data[i + 1] !== tg || data[i + 2] !== tb || data[i + 3] !== ta) {
            continue;
          }
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = 255;
          stack.push({ x: x + 1, y });
          stack.push({ x: x - 1, y });
          stack.push({ x, y: y + 1 });
          stack.push({ x, y: y - 1 });
        }
        layer.ctx.putImageData(image, 0, 0);
      } catch {
        setNotice("Fill failed — layer left untouched (fail-open).");
      }
    },
    [color],
  );

  const styleStroke = useCallback(
    (ctx: CanvasRenderingContext2D, forEraser: boolean) => {
      const px = clampBrushSize(size);
      if (tool === "pencil" && !forEraser) {
        ctx.lineWidth = 1;
        ctx.lineCap = "butt";
        ctx.lineJoin = "miter";
      } else {
        ctx.lineWidth = px;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
      if (forEraser) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = color;
      }
    },
    [color, size, tool],
  );

  // --- Pointer handlers (integer-pixel coords arrive from DictateCanvas) ---
  const handleStrokeStart = useCallback(
    (x: number, y: number) => {
      const layer = activeId ? layersRef.current.get(activeId) : undefined;
      if (!layer || !activeMeta) return;
      if (activeMeta.locked) {
        setNotice(`“${activeMeta.name}” is locked — unlock it to paint.`);
        return;
      }
      if (!activeMeta.visible) {
        setNotice(`“${activeMeta.name}” is hidden — show it to paint.`);
        return;
      }
      try {
        if (tool === "eyedropper") {
          const display = displayRef.current;
          const dctx = display?.getContext("2d");
          const pixel = dctx?.getImageData(x, y, 1, 1).data;
          if (pixel && pixel[3] > 0) {
            const hex = `#${((pixel[0] << 16) | (pixel[1] << 8) | pixel[2])
              .toString(16)
              .padStart(6, "0")}`;
            setColor(hex);
            setNotice(`Picked ${hex} — brush reloaded.`);
          } else {
            setNotice("No paint under the cursor (transparent) — colour kept.");
          }
          return;
        }
        if (tool === "bucket") {
          snapshot(layer.id, "bucket fill");
          floodFill(layer, x, y);
          composite();
          interopBus.emit("tools:used", { tool: "dictate-pic", action: "stroke:bucket" });
          return;
        }
        if (tool !== "brush" && tool !== "pencil" && tool !== "eraser") return;
        snapshot(layer.id, `stroke:${tool}`);
        drawingRef.current = true;
        lastPointRef.current = { x, y };
        const ctx = layer.ctx;
        ctx.save();
        styleStroke(ctx, tool === "eraser");
        ctx.beginPath();
        if (tool === "pencil") {
          ctx.fillStyle = color;
          ctx.fillRect(x, y, 1, 1);
        } else {
          ctx.moveTo(x + 0.5, y + 0.5);
          ctx.lineTo(x + 0.5, y + 0.5);
          ctx.stroke();
        }
        ctx.restore();
        composite();
      } catch {
        setNotice("Stroke failed — canvas left untouched (fail-open).");
      }
    },
    [activeId, activeMeta, tool, color, composite, floodFill, snapshot, styleStroke],
  );

  const handleStrokeMove = useCallback(
    (x: number, y: number) => {
      if (!drawingRef.current) return;
      const layer = activeId ? layersRef.current.get(activeId) : undefined;
      const last = lastPointRef.current;
      if (!layer || !last) return;
      try {
        const ctx = layer.ctx;
        ctx.save();
        styleStroke(ctx, tool === "eraser");
        if (tool === "pencil") {
          ctx.fillStyle = color;
          ctx.fillRect(x, y, 1, 1);
        } else {
          ctx.beginPath();
          ctx.moveTo(last.x + 0.5, last.y + 0.5);
          ctx.lineTo(x + 0.5, y + 0.5);
          ctx.stroke();
        }
        ctx.restore();
        lastPointRef.current = { x, y };
        composite();
      } catch {
        drawingRef.current = false;
      }
    },
    [activeId, tool, color, composite, styleStroke],
  );

  const handleStrokeEnd = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    try {
      interopBus.emit("tools:used", { tool: "dictate-pic", action: `stroke:${tool}` });
    } catch {
      // Fail-open: bus emit never breaks the editor.
    }
  }, [tool]);

  // --- Layers ops ---
  const syncMetas = useCallback(() => {
    setMetas((prev) => prev.map((m) => ({ ...m })));
    composite();
  }, [composite]);

  const handleAddLayer = useCallback(() => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = DICTATE_DOC_WIDTH;
      canvas.height = DICTATE_DOC_HEIGHT;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        setNotice("Could not create a layer in this browser (fail-open).");
        return;
      }
      ctx.imageSmoothingEnabled = false;
      const layer: DictateLayer = {
        id: newLayerId(),
        name: `Layer ${layersRef.current.size + 1}`,
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: "source-over",
        canvas,
        ctx,
      };
      layersRef.current.set(layer.id, layer);
      setMetas((prev) => [
        ...prev,
        {
          id: layer.id,
          name: layer.name,
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: "source-over",
        },
      ]);
      setActiveId(layer.id);
      interopBus.emit("tools:used", { tool: "dictate-pic", action: "layer:add" });
    } catch {
      setNotice("Add-layer failed — stack unchanged (fail-open).");
    }
  }, []);

  const handleRemoveLayer = useCallback(
    (id: string) => {
      if (layersRef.current.size <= 1) {
        setNotice("Keep at least one layer — delete blocked (fail-open).");
        return;
      }
      layersRef.current.delete(id);
      undoRef.current = undoRef.current.filter((s) => s.layerId !== id);
      setUndoDepth(undoRef.current.length);
      setMetas((prev) => {
        const next = prev.filter((m) => m.id !== id);
        if (activeId === id && next.length > 0) {
          setActiveId(next[next.length - 1].id);
        }
        return next;
      });
      interopBus.emit("tools:used", { tool: "dictate-pic", action: "layer:remove" });
      composite();
    },
    [activeId, composite],
  );

  // --- PNG export (transparent background — no checkerboard baked in) ---
  const handleExport = useCallback(() => {
    try {
      const out = document.createElement("canvas");
      out.width = DICTATE_DOC_WIDTH;
      out.height = DICTATE_DOC_HEIGHT;
      const octx = out.getContext("2d");
      if (!octx) {
        setNotice("Export unavailable in this browser (fail-open).");
        return;
      }
      octx.imageSmoothingEnabled = false;
      for (const meta of layersRef.current.values()) {
        const live = layersRef.current.get(meta.id);
        if (!live || !meta.visible) continue;
        octx.save();
        octx.globalAlpha = layerOpacityToAlpha(meta.opacity);
        try {
          octx.globalCompositeOperation = meta.blendMode as GlobalCompositeOperation;
        } catch {
          octx.globalCompositeOperation = "source-over";
        }
        octx.drawImage(live.canvas, 0, 0);
        octx.restore();
      }
      out.toBlob((blob) => {
        if (!blob) {
          setNotice("Export failed — layers untouched (fail-open).");
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "dictate-pic-512.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
        setNotice("Exported dictate-pic-512.png (512 × 512, transparency kept).");
        try {
          interopBus.emit("studio:asset-ready", {
            kind: "png-sprite",
            url,
            source: "dictatepic",
          });
          interopBus.emit("tools:used", { tool: "dictate-pic", action: "export:png" });
        } catch {
          // Fail-open: bus emit never breaks export.
        }
      }, "image/png");
    } catch {
      setNotice("Export failed — layers untouched (fail-open).");
    }
  }, []);

  // --- AI stubs: visibly disabled in the palette; clicks land here fail-open ---
  const handleAiStub = useCallback((id: DictateAiStubId) => {
    const stub = DICTATE_AI_STUBS.find((s) => s.id === id);
    setNotice(
      `${stub?.title ?? id} is offline — fal.ai unreachable, canvas untouched (fail-open). ` +
        `Planned route: ${stub?.futureRoute ?? "TBD"}.`,
    );
    try {
      interopBus.emit("tools:used", { tool: "dictate-pic", action: `ai-stub:${id}` });
    } catch {
      // Fail-open.
    }
  }, []);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-white">
      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
        <ToolPalette
          tool={tool}
          onTool={setTool}
          color={color}
          onColor={setColor}
          size={size}
          onSize={(v) => setSize(clampBrushSize(v))}
          zoom={zoom}
          onZoom={setZoom}
          onAiStub={handleAiStub}
        />
        <DictateCanvas
          onDisplayReady={onDisplayReady}
          onStrokeStart={handleStrokeStart}
          onStrokeMove={handleStrokeMove}
          onStrokeEnd={handleStrokeEnd}
          zoom={zoom}
          eyedropperActive={tool === "eyedropper"}
        />
        <div className="flex flex-col gap-4">
          <LayersPanel
            layers={metas}
            activeId={activeId}
            onSelect={setActiveId}
            onAdd={handleAddLayer}
            onRemove={handleRemoveLayer}
            onToggleVisible={(id) => {
              const live = layersRef.current.get(id);
              if (live) live.visible = !live.visible;
              setMetas((prev) =>
                prev.map((m) => (m.id === id ? { ...m, visible: !m.visible } : m)),
              );
              composite();
            }}
            onToggleLock={(id) => {
              const live = layersRef.current.get(id);
              if (live) live.locked = !live.locked;
              setMetas((prev) =>
                prev.map((m) => (m.id === id ? { ...m, locked: !m.locked } : m)),
              );
              composite();
            }}
            onOpacity={(id, v) => {
              const live = layersRef.current.get(id);
              if (live) live.opacity = layerOpacityToAlpha(v);
              setMetas((prev) =>
                prev.map((m) =>
                  m.id === id ? { ...m, opacity: layerOpacityToAlpha(v) } : m,
                ),
              );
              composite();
            }}
            onBlend={(id, mode) => {
              const live = layersRef.current.get(id);
              if (live) live.blendMode = mode;
              syncMetas();
            }}
            onUndo={handleUndo}
            canUndo={undoDepth > 0}
            undoDepth={undoDepth}
            onExport={handleExport}
          />
          <SlicePanel />
        </div>
      </div>
      <p aria-live="polite" className="mt-4 min-h-6 text-xs text-slate-400">
        {notice ?? "Tip: pick the Ink layer, choose Brush, paint — then Export PNG."}
      </p>
    </div>
  );
}
