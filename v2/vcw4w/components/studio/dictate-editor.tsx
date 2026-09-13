"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DictateCanvas } from "./dictate-canvas";
import { DictateLayers } from "./dictate-layers";
import { DictateToolbar } from "./dictate-toolbar";
import { DictateAiStubs } from "./dictate-ai-stubs";
import {
  DICTATE_CHECKER_SIZE,
  DICTATE_DOC_HEIGHT,
  DICTATE_DOC_WIDTH,
  DICTATE_INTEROP_CHANNEL,
  DICTATE_UNDO_LIMIT,
  type DictateAiStubId,
  type DictateBlendMode,
  type DictateInteropType,
  type DictateLayer,
  type DictateLayerMeta,
  type DictateTool,
  type DictateUndoSnapshot,
} from "@/types/dictate-pic";

function metaOf(layer: DictateLayer): DictateLayerMeta {
  return {
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    locked: layer.locked,
    opacity: layer.opacity,
    blendMode: layer.blendMode,
  };
}

function newLayerId(fallbackCounter: number): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // Fail-open: fall through to the counter fallback.
  }
  return `layer-${Date.now()}-${fallbackCounter}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const num = Number.parseInt(full, 16);
  if (Number.isNaN(num)) return [34, 211, 238];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const pad = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${pad(r)}${pad(g)}${pad(b)}`;
}

/**
 * DictatePic editor shell (§3.2 Wave 3, owner R12).
 *
 * Owns the layer stack (live offscreen canvases in a ref Map + serializable
 * metadata in state), the composite renderer (checkerboard + per-layer
 * alpha/blend), the stroke engine (brush/pencil/eraser/bucket/eyedropper),
 * bounded undo (30 snapshots), PNG export, and interop events.
 *
 * SSR safety (axiom §1.2): this is a `'use client'` component and every
 * browser API (`document`, `BroadcastChannel`, `Image`) runs exclusively
 * inside `useEffect` or event handlers — never during render, never on the
 * server. All failure paths are fail-open with a status notice.
 */
export function DictateEditor() {
  const [layersMeta, setLayersMeta] = useState<DictateLayerMeta[]>([]);
  const [activeLayerId, setActiveLayerId] = useState("");
  const [tool, setTool] = useState<DictateTool>("brush");
  const [color, setColor] = useState("#22d3ee");
  const [size, setSize] = useState(4);
  const [zoom, setZoom] = useState(1);
  const [historyTick, setHistoryTick] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  // Live (non-serializable) state — refs only, never rendered.
  const liveRef = useRef<{ layers: DictateLayer[] }>({ layers: [] });
  const displayRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const idCounterRef = useRef(0);
  const undoRef = useRef<DictateUndoSnapshot[]>([]);
  const redoRef = useRef<DictateUndoSnapshot[]>([]);

  // Render-time mirrors for stable callbacks.
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const colorRef = useRef(color);
  colorRef.current = color;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const activeIdRef = useRef(activeLayerId);
  activeIdRef.current = activeLayerId;

  const emitInterop = useCallback(
    (type: DictateInteropType, detail: Record<string, string | number | boolean>) => {
      try {
        const bc = new BroadcastChannel(DICTATE_INTEROP_CHANNEL);
        bc.postMessage({
          kind: "dictate-pic",
          type,
          at: new Date().toISOString(),
          detail,
        });
        bc.close();
      } catch {
        // Fail-open: interop never bricks the editor.
      }
    },
    [],
  );

  const syncMeta = useCallback(() => {
    setLayersMeta(liveRef.current.layers.map(metaOf));
  }, []);

  /**
   * Composite renderer (§3.2): checkerboard transparency first, then every
   * visible layer bottom-to-top with its opacity + blend mode.
   */
  const composite = useCallback(() => {
    const display = displayRef.current;
    if (!display) return;
    try {
      const ctx = display.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      for (let x = 0; x < DICTATE_DOC_WIDTH; x += DICTATE_CHECKER_SIZE) {
        for (let y = 0; y < DICTATE_DOC_HEIGHT; y += DICTATE_CHECKER_SIZE) {
          ctx.fillStyle =
            (x / DICTATE_CHECKER_SIZE + y / DICTATE_CHECKER_SIZE) % 2 === 0
              ? "#1e293b"
              : "#0f172a";
          ctx.fillRect(x, y, DICTATE_CHECKER_SIZE, DICTATE_CHECKER_SIZE);
        }
      }
      ctx.restore();
      for (const layer of liveRef.current.layers) {
        if (!layer.visible) continue;
        ctx.save();
        ctx.globalAlpha = layer.opacity;
        ctx.globalCompositeOperation = layer.blendMode;
        ctx.drawImage(layer.canvas, 0, 0);
        ctx.restore();
      }
    } catch {
      // Fail-open: a bad layer never blanks the editor shell.
    }
  }, []);

  const onDisplayReady = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      displayRef.current = canvas;
      composite();
    },
    [composite],
  );

  const makeLayerCanvas = useCallback((): {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
  } | null => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = DICTATE_DOC_WIDTH;
      canvas.height = DICTATE_DOC_HEIGHT;
      const ctx =
        canvas.getContext("2d", { willReadFrequently: true }) ??
        canvas.getContext("2d");
      if (!ctx) return null;
      ctx.imageSmoothingEnabled = false;
      return { canvas, ctx };
    } catch {
      return null;
    }
  }, []);

  // Initial document: one transparent Background layer (effect-only).
  useEffect(() => {
    if (liveRef.current.layers.length > 0) return;
    const pair = makeLayerCanvas();
    if (!pair) {
      setNotice("Canvas 2D is unavailable in this browser (fail-open).");
      return;
    }
    idCounterRef.current += 1;
    const base: DictateLayer = {
      id: newLayerId(idCounterRef.current),
      name: "Background",
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: "source-over",
      canvas: pair.canvas,
      ctx: pair.ctx,
    };
    liveRef.current.layers = [base];
    setActiveLayerId(base.id);
    syncMeta();
    composite();
  }, [composite, makeLayerCanvas, syncMeta]);

  // Re-composite once the display canvas registers (post-init ordering).
  useEffect(() => {
    composite();
  }, [layersMeta, composite]);

  const findActive = useCallback((): DictateLayer | undefined => {
    return liveRef.current.layers.find((l) => l.id === activeIdRef.current);
  }, []);

  const pushUndo = useCallback(
    (layer: DictateLayer, label: string) => {
      try {
        const dataUrl = layer.canvas.toDataURL("image/png");
        undoRef.current.push({ layerId: layer.id, dataUrl, label });
        while (undoRef.current.length > DICTATE_UNDO_LIMIT) {
          undoRef.current.shift();
        }
        redoRef.current = [];
        setHistoryTick((t) => t + 1);
      } catch {
        // Fail-open: without a snapshot the stroke still applies.
      }
    },
    [],
  );

  const restoreSnapshot = useCallback(
    (snapshot: DictateUndoSnapshot, onDone: () => void) => {
      const layer = liveRef.current.layers.find(
        (l) => l.id === snapshot.layerId,
      );
      if (!layer) {
        onDone();
        return;
      }
      try {
        const img = new Image();
        img.onload = () => {
          try {
            layer.ctx.save();
            layer.ctx.globalAlpha = 1;
            layer.ctx.globalCompositeOperation = "source-over";
            layer.ctx.clearRect(0, 0, DICTATE_DOC_WIDTH, DICTATE_DOC_HEIGHT);
            layer.ctx.drawImage(img, 0, 0);
            layer.ctx.restore();
          } catch {
            // Fail-open: keep the pre-undo pixels.
          }
          onDone();
        };
        img.onerror = onDone;
        img.src = snapshot.dataUrl;
      } catch {
        onDone();
      }
    },
    [],
  );

  const handleUndo = useCallback(() => {
    const snapshot = undoRef.current.pop();
    if (!snapshot) {
      setNotice("Nothing to undo.");
      return;
    }
    const layer = liveRef.current.layers.find(
      (l) => l.id === snapshot.layerId,
    );
    try {
      if (layer) {
        redoRef.current.push({
          layerId: layer.id,
          dataUrl: layer.canvas.toDataURL("image/png"),
          label: snapshot.label,
        });
      }
    } catch {
      // Fail-open: redo entry skipped, undo still applies.
    }
    setNotice(null);
    restoreSnapshot(snapshot, () => {
      composite();
      setHistoryTick((t) => t + 1);
    });
  }, [composite, restoreSnapshot]);

  const handleRedo = useCallback(() => {
    const snapshot = redoRef.current.pop();
    if (!snapshot) {
      setNotice("Nothing to redo.");
      return;
    }
    const layer = liveRef.current.layers.find(
      (l) => l.id === snapshot.layerId,
    );
    try {
      if (layer) {
        undoRef.current.push({
          layerId: layer.id,
          dataUrl: layer.canvas.toDataURL("image/png"),
          label: snapshot.label,
        });
      }
    } catch {
      // Fail-open: undo entry skipped, redo still applies.
    }
    setNotice(null);
    restoreSnapshot(snapshot, () => {
      composite();
      setHistoryTick((t) => t + 1);
    });
  }, [composite, restoreSnapshot]);

  /** Bounded scanline flood fill (bucket) with exact-match tolerance. */
  const floodFill = useCallback((layer: DictateLayer, sx: number, sy: number) => {
    try {
      const image = layer.ctx.getImageData(
        0,
        0,
        DICTATE_DOC_WIDTH,
        DICTATE_DOC_HEIGHT,
      );
      const data = image.data;
      const start = (sy * DICTATE_DOC_WIDTH + sx) * 4;
      const tr = data[start];
      const tg = data[start + 1];
      const tb = data[start + 2];
      const ta = data[start + 3];
      const [fr, fg, fb] = hexToRgb(colorRef.current);
      if (tr === fr && tg === fg && tb === fb && ta === 255) return;
      const stack: number[] = [sx, sy];
      let guard = DICTATE_DOC_WIDTH * DICTATE_DOC_HEIGHT * 2;
      const matches = (i: number) =>
        data[i] === tr && data[i + 1] === tg && data[i + 2] === tb && data[i + 3] === ta;
      while (stack.length >= 2 && guard-- > 0) {
        const y = stack.pop() as number;
        const x = stack.pop() as number;
        if (x < 0 || x >= DICTATE_DOC_WIDTH || y < 0 || y >= DICTATE_DOC_HEIGHT) continue;
        const i = (y * DICTATE_DOC_WIDTH + x) * 4;
        if (!matches(i)) continue;
        data[i] = fr;
        data[i + 1] = fg;
        data[i + 2] = fb;
        data[i + 3] = 255;
        stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
      }
      layer.ctx.putImageData(image, 0, 0);
    } catch {
      setNotice("Bucket fill failed on this layer (fail-open).");
    }
  }, []);

  const stampPencil = useCallback((layer: DictateLayer, x: number, y: number) => {
    const s = sizeRef.current;
    layer.ctx.save();
    layer.ctx.globalAlpha = 1;
    layer.ctx.globalCompositeOperation = "source-over";
    layer.ctx.fillStyle = colorRef.current;
    layer.ctx.fillRect(Math.floor(x), Math.floor(y), s, s);
    layer.ctx.restore();
  }, []);

  const strokeTo = useCallback(
    (layer: DictateLayer, x: number, y: number, start: boolean) => {
      const currentTool = toolRef.current;
      if (currentTool === "pencil") {
        const last = lastPosRef.current;
        if (start || !last) {
          stampPencil(layer, x, y);
        } else {
          // DDA interpolation so fast drags stay crisp and gap-free.
          const steps = Math.max(Math.abs(x - last.x), Math.abs(y - last.y), 1);
          for (let i = 1; i <= steps; i++) {
            stampPencil(
              layer,
              last.x + ((x - last.x) * i) / steps,
              last.y + ((y - last.y) * i) / steps,
            );
          }
        }
        lastPosRef.current = { x, y };
        return;
      }
      // Brush + eraser: round cap strokes.
      layer.ctx.lineCap = "round";
      layer.ctx.lineJoin = "round";
      layer.ctx.lineWidth = sizeRef.current;
      if (currentTool === "eraser") {
        layer.ctx.globalCompositeOperation = "destination-out";
        layer.ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        layer.ctx.globalCompositeOperation = "source-over";
        layer.ctx.strokeStyle = colorRef.current;
      }
      if (start) {
        layer.ctx.beginPath();
        layer.ctx.moveTo(x, y);
      }
      layer.ctx.lineTo(x, y);
      layer.ctx.stroke();
      lastPosRef.current = { x, y };
    },
    [stampPencil],
  );

  const handleStrokeStart = useCallback(
    (x: number, y: number) => {
      const layer = findActive();
      if (!layer) return;
      if (layer.locked) {
        setNotice(`“${layer.name}” is locked — unlock it to paint.`);
        return;
      }
      const currentTool = toolRef.current;
      if (currentTool === "eyedropper") {
        try {
          const pixel = layer.ctx.getImageData(x, y, 1, 1).data;
          if (pixel[3] === 0) {
            setNotice("Eyedropper hit transparency — color unchanged.");
          } else {
            setColor(rgbToHex(pixel[0], pixel[1], pixel[2]));
            setNotice(null);
          }
        } catch {
          setNotice("Eyedropper could not read that pixel (fail-open).");
        }
        return;
      }
      pushUndo(layer, currentTool);
      setNotice(null);
      drawingRef.current = true;
      lastPosRef.current = null;
      if (currentTool === "bucket") {
        floodFill(layer, x, y);
        drawingRef.current = false;
      } else {
        strokeTo(layer, x, y, true);
      }
      composite();
      emitInterop("dictate-pic:stroke", { tool: currentTool, layerId: layer.id });
    },
    [composite, emitInterop, findActive, floodFill, pushUndo, strokeTo],
  );

  const handleStrokeMove = useCallback(
    (x: number, y: number) => {
      if (!drawingRef.current) return;
      const layer = findActive();
      if (!layer || layer.locked) return;
      const currentTool = toolRef.current;
      if (currentTool === "bucket" || currentTool === "eyedropper") return;
      strokeTo(layer, x, y, false);
      composite();
    },
    [composite, findActive, strokeTo],
  );

  const handleStrokeEnd = useCallback(() => {
    drawingRef.current = false;
    lastPosRef.current = null;
  }, []);

  // --- Layer operations ---
  const mutateAndSync = useCallback(
    (fn: (layers: DictateLayer[]) => void, eventDetail?: Record<string, string | number | boolean>) => {
      fn(liveRef.current.layers);
      syncMeta();
      composite();
      if (eventDetail) emitInterop("dictate-pic:layer-change", eventDetail);
    },
    [composite, emitInterop, syncMeta],
  );

  const handleAddLayer = useCallback(() => {
    const pair = makeLayerCanvas();
    if (!pair) {
      setNotice("Could not allocate a new layer (fail-open).");
      return;
    }
    idCounterRef.current += 1;
    const id = newLayerId(idCounterRef.current);
    const n = liveRef.current.layers.length + 1;
    liveRef.current.layers.push({
      id,
      name: `Layer ${n}`,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: "source-over",
      canvas: pair.canvas,
      ctx: pair.ctx,
    });
    setActiveLayerId(id);
    syncMeta();
    composite();
    emitInterop("dictate-pic:layer-change", { action: "add", layerId: id });
  }, [composite, emitInterop, makeLayerCanvas, syncMeta]);

  const handleDeleteLayer = useCallback(
    (id: string) => {
      if (liveRef.current.layers.length <= 1) {
        setNotice("The document keeps at least one layer.");
        return;
      }
      mutateAndSync(
        (layers) => {
          const i = layers.findIndex((l) => l.id === id);
          if (i >= 0) layers.splice(i, 1);
        },
        { action: "delete", layerId: id },
      );
      undoRef.current = undoRef.current.filter((s) => s.layerId !== id);
      redoRef.current = redoRef.current.filter((s) => s.layerId !== id);
      if (activeIdRef.current === id) {
        const remaining = liveRef.current.layers;
        setActiveLayerId(remaining[remaining.length - 1].id);
      }
      setHistoryTick((t) => t + 1);
    },
    [mutateAndSync],
  );

  const handleMoveLayer = useCallback(
    (id: string, direction: -1 | 1) => {
      mutateAndSync((layers) => {
        const i = layers.findIndex((l) => l.id === id);
        const j = i + direction;
        if (i < 0 || j < 0 || j >= layers.length) return;
        const [moved] = layers.splice(i, 1);
        layers.splice(j, 0, moved);
      });
    },
    [mutateAndSync],
  );

  const patchLayer = useCallback(
    (id: string, patch: Partial<DictateLayerMeta>) => {
      mutateAndSync((layers) => {
        const layer = layers.find((l) => l.id === id);
        if (layer) Object.assign(layer, patch);
      });
    },
    [mutateAndSync],
  );

  const handleExport = useCallback(() => {
    try {
      const out = document.createElement("canvas");
      out.width = DICTATE_DOC_WIDTH;
      out.height = DICTATE_DOC_HEIGHT;
      const ctx = out.getContext("2d");
      if (!ctx) throw new Error("no-2d-context");
      ctx.imageSmoothingEnabled = false;
      for (const layer of liveRef.current.layers) {
        if (!layer.visible) continue;
        ctx.save();
        ctx.globalAlpha = layer.opacity;
        ctx.globalCompositeOperation = layer.blendMode;
        ctx.drawImage(layer.canvas, 0, 0);
        ctx.restore();
      }
      const url = out.toDataURL("image/png");
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "dictate-pic-512.png";
      anchor.click();
      setNotice("Exported dictate-pic-512.png (transparent PNG, no checkerboard).");
      emitInterop("dictate-pic:export", {
        width: DICTATE_DOC_WIDTH,
        height: DICTATE_DOC_HEIGHT,
        layers: liveRef.current.layers.length,
      });
    } catch {
      setNotice("Export failed in this browser (fail-open) — try again.");
    }
  }, [emitInterop]);

  const handleStubAction = useCallback(
    (id: DictateAiStubId): string => {
      const messages: Record<DictateAiStubId, string> = {
        ai_inpaint:
          "STUB: AI Inpaint would mask your next stroke and call fal.ai — no request was sent.",
        ai_remove_bg:
          "STUB: AI Background Remover would segment the active layer — no request was sent.",
        slice:
          "STUB: Slice/Upscale would queue a spritesheet job — export the PNG and slice externally for now.",
      };
      emitInterop("dictate-pic:ai-stub", { stub: id, sent: false });
      return messages[id];
    },
    [emitInterop],
  );

  // `historyTick` re-renders the toolbar after undo/redo mutations, which
  // live in refs (non-serializable snapshots are never React state).
  const canUndo = historyTick >= 0 && undoRef.current.length > 0;
  const canRedo = historyTick >= 0 && redoRef.current.length > 0;
  const undoDepth = historyTick >= 0 ? undoRef.current.length : 0;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-white">
      {notice && (
        <p
          role="status"
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300"
        >
          {notice}
        </p>
      )}
      <div className="flex flex-wrap items-start justify-center gap-3">
        <DictateToolbar
          tool={tool}
          onTool={setTool}
          color={color}
          onColor={setColor}
          size={size}
          onSize={setSize}
          zoom={zoom}
          onZoom={setZoom}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          undoDepth={undoDepth}
          onExport={handleExport}
        />
        <DictateCanvas
          onDisplayReady={onDisplayReady}
          onStrokeStart={handleStrokeStart}
          onStrokeMove={handleStrokeMove}
          onStrokeEnd={handleStrokeEnd}
          zoom={zoom}
          eyedropperActive={tool === "eyedropper"}
        />
        <div className="flex flex-col gap-3">
          <DictateLayers
            layers={layersMeta}
            activeLayerId={activeLayerId}
            onSelect={setActiveLayerId}
            onAdd={handleAddLayer}
            onDelete={handleDeleteLayer}
            onMove={handleMoveLayer}
            onToggleVisible={(id) => {
              const layer = liveRef.current.layers.find((l) => l.id === id);
              if (layer) patchLayer(id, { visible: !layer.visible });
            }}
            onToggleLocked={(id) => {
              const layer = liveRef.current.layers.find((l) => l.id === id);
              if (layer) patchLayer(id, { locked: !layer.locked });
            }}
            onRename={(id, name) => patchLayer(id, { name })}
            onOpacity={(id, opacity) =>
              patchLayer(id, { opacity: Math.max(0, Math.min(1, opacity)) })
            }
            onBlendMode={(id, blendMode: DictateBlendMode) =>
              patchLayer(id, { blendMode })
            }
          />
          <DictateAiStubs onStubAction={handleStubAction} />
        </div>
      </div>
    </div>
  );
}
