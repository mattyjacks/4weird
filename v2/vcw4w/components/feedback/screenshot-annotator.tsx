"use client";

/**
 * screenshot-annotator.tsx — canvas micro-editor for screenshot feedback.
 *
 * Pointer-draw overlay with four tools (arrow / circle / highlight-box /
 * blur) plus a per-shape comment field. Shapes are stored in percent
 * coordinates (0..100) so they survive resizes and remarshall cleanly:
 *
 * - `arrow`:  (x, y) = tail point, (w, h) = head point (both absolute %).
 * - `circle` / `box` / `blur`: (x, y) = top-left corner, (w, h) = size in %.
 *
 * `flattenAnnotations` composites the shapes onto the base image and returns
 * a JPEG Blob ready to send to an AI reviewer alongside the annotation JSON
 * (per-shape comments travel as JSON — they are not burned into pixels,
 * except for the index badges that let the model map shapes to comments).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

export type AnnotationTool = "arrow" | "circle" | "box" | "blur";

export interface Annotation {
  id: string;
  tool: AnnotationTool;
  /** Percent 0..100. Arrow: tail-x. Other tools: top-left x. */
  x: number;
  /** Percent 0..100. Arrow: tail-y. Other tools: top-left y. */
  y: number;
  /** Percent 0..100. Arrow: head-x. Other tools: width. */
  w: number;
  /** Percent 0..100. Arrow: head-y. Other tools: height. */
  h: number;
  /** Free-text note for this shape (0..280 chars). */
  comment: string;
}

export interface ScreenshotAnnotatorProps {
  image: Blob | string;
  annotations: Annotation[];
  onChange: (next: Annotation[]) => void;
  disabled?: boolean;
}

/** Hard cap on shapes per screenshot. */
export const SCREENSHOT_ANNOTATION_MAX = 20;

/** Max chars per shape comment (mirrors the 280-char review slice). */
export const SCREENSHOT_ANNOTATION_COMMENT_MAX = 280;

const JPEG_QUALITY = 0.92;

const TOOLS: { id: AnnotationTool; label: string; hint: string }[] = [
  { id: "arrow", label: "Arrow", hint: "Drag from tail to head" },
  { id: "circle", label: "Circle", hint: "Drag to size the ellipse" },
  { id: "box", label: "Highlight", hint: "Drag to size the highlight box" },
  { id: "blur", label: "Blur", hint: "Drag over private text to redact" },
];

const TOOL_LABEL: Record<AnnotationTool, string> = {
  arrow: "Arrow",
  circle: "Circle",
  box: "Highlight",
  blur: "Blur",
};

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function newAnnotationId(): string {
  try {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }
  } catch {
    // Fall through to the Math.random fallback below.
  }
  return `ann-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Bounding box of any annotation in percent space (for rendering). */
function bboxOf(a: Annotation): Box {
  if (a.tool === "arrow") {
    return {
      x: Math.min(a.x, a.w),
      y: Math.min(a.y, a.h),
      w: Math.abs(a.w - a.x),
      h: Math.abs(a.h - a.y),
    };
  }
  return { x: a.x, y: a.y, w: a.w, h: a.h };
}

/** Screen-reader (and visible) one-line summary of a shape. */
function describeAnnotation(a: Annotation, index: number): string {
  const n = index + 1;
  const f = (v: number) => `${Math.round(v)}%`;
  if (a.tool === "arrow") {
    return `Annotation ${n}: arrow from ${f(a.x)}, ${f(a.y)} to ${f(
      a.w
    )}, ${f(a.h)}`;
  }
  const b = bboxOf(a);
  return `Annotation ${n}: ${TOOL_LABEL[a.tool].toLowerCase()} at ${f(
    b.x
  )}, ${f(b.y)}, ${f(b.w)} by ${f(b.h)}`;
}

function loadBaseImage(
  src: Blob | string
): Promise<{ el: HTMLImageElement; objectUrl: string | null }> {
  return new Promise((resolve, reject) => {
    const objectUrl = src instanceof Blob ? URL.createObjectURL(src) : null;
    const url: string = objectUrl ?? (src as string);
    const el = new Image();
    el.decoding = "async";
    // Anonymous CORS so canvas stays untainted when the host allows it.
    if (!objectUrl) el.crossOrigin = "anonymous";
    el.onload = () => resolve({ el, objectUrl });
    el.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load image for annotation."));
    };
    el.src = url;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Export failed — the browser refused the JPEG."));
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}

/**
 * Composite annotations onto the base image and return a JPEG Blob for AI.
 * Blur shapes are pixelated; other shapes are drawn in pixel space with
 * numbered badges matching the annotation order (1-based).
 */
export async function flattenAnnotations(
  image: Blob | string,
  annotations: Annotation[]
): Promise<Blob> {
  const { el, objectUrl } = await loadBaseImage(image);
  try {
    const W = el.naturalWidth || el.width;
    const H = el.naturalHeight || el.height;
    if (!W || !H) throw new Error("Image has no pixels to flatten.");
    const out = document.createElement("canvas");
    out.width = W;
    out.height = H;
    const ctx = out.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser.");
    // JPEG has no alpha: paint white first so transparent PNGs burn cleanly.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(el, 0, 0, W, H);

    const X = (p: number) => (clamp(p, 0, 100) / 100) * W;
    const Y = (p: number) => (clamp(p, 0, 100) / 100) * H;
    const lineWidth = Math.max(2, W / 300);
    const fontSize = Math.max(12, Math.round(W / 55));

    const drawBadge = (bx: number, by: number, n: number) => {
      const r = Math.max(11, fontSize * 0.85);
      const cx = clamp(bx, r + 3, W - r - 3);
      const cy = clamp(by, r + 3, H - r - 3);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = "#111111";
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, W / 800);
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(n), cx, cy + 1);
    };

    annotations.forEach((a, idx) => {
      const n = idx + 1;
      if (a.tool === "arrow") {
        const tx = X(a.x);
        const ty = Y(a.y);
        const hx = X(a.w);
        const hy = Y(a.h);
        ctx.strokeStyle = "#ff3b30";
        ctx.fillStyle = "#ff3b30";
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(hx, hy);
        ctx.stroke();
        const ang = Math.atan2(hy - ty, hx - tx);
        const L = Math.max(9, lineWidth * 4);
        const spread = 0.42;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(
          hx - L * Math.cos(ang - spread),
          hy - L * Math.sin(ang - spread)
        );
        ctx.lineTo(
          hx - L * Math.cos(ang + spread),
          hy - L * Math.sin(ang + spread)
        );
        ctx.closePath();
        ctx.fill();
        drawBadge(tx, ty, n);
        return;
      }
      const b = bboxOf(a);
      const px = X(b.x);
      const py = Y(b.y);
      const pw = Math.max(1, (clamp(b.w, 0, 100) / 100) * W);
      const ph = Math.max(1, (clamp(b.h, 0, 100) / 100) * H);
      if (a.tool === "circle") {
        ctx.strokeStyle = "#ff3b30";
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.ellipse(
          px + pw / 2,
          py + ph / 2,
          Math.max(1, pw / 2),
          Math.max(1, ph / 2),
          0,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      } else if (a.tool === "box") {
        ctx.fillStyle = "rgba(255, 214, 10, 0.38)";
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = "#8a6d00";
        ctx.lineWidth = Math.max(1.5, lineWidth / 2);
        ctx.strokeRect(px, py, pw, ph);
      } else {
        // blur: pixelate the region via a downscale/upscale round-trip.
        const sx = Math.round(px);
        const sy = Math.round(py);
        const sw = Math.max(1, Math.round(pw));
        const sh = Math.max(1, Math.round(ph));
        if (sw >= 2 && sh >= 2) {
          const tmp = document.createElement("canvas");
          tmp.width = Math.max(1, Math.round(sw / 10));
          tmp.height = Math.max(1, Math.round(sh / 10));
          const tctx = tmp.getContext("2d");
          if (tctx) {
            tctx.drawImage(out, sx, sy, sw, sh, 0, 0, tmp.width, tmp.height);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, sx, sy, sw, sh);
            ctx.imageSmoothingEnabled = true;
          }
        } else {
          ctx.fillStyle = "rgba(17, 17, 17, 0.6)";
          ctx.fillRect(px, py, pw, ph);
        }
      }
      drawBadge(px, py, n);
    });

    return await canvasToJpeg(out);
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

interface Draft {
  sx: number;
  sy: number;
  cx: number;
  cy: number;
}

function draftToAnnotation(
  tool: AnnotationTool,
  id: string,
  d: Draft
): Annotation {
  const sx = clamp(d.sx, 0, 100);
  const sy = clamp(d.sy, 0, 100);
  const cx = clamp(d.cx, 0, 100);
  const cy = clamp(d.cy, 0, 100);
  if (tool === "arrow") {
    const dist = Math.hypot(cx - sx, cy - sy);
    if (dist >= 2) {
      return { id, tool, x: round1(sx), y: round1(sy), w: round1(cx), h: round1(cy), comment: "" };
    }
    // Tap without a drag: default arrow pointing down-right (or up-left
    // when pinned against the bottom/right edge).
    const dx = sx + 8 <= 100 ? 8 : -8;
    const dy = sy + 6 <= 100 ? 6 : -6;
    return {
      id,
      tool,
      x: round1(sx),
      y: round1(sy),
      w: round1(sx + dx),
      h: round1(sy + dy),
      comment: "",
    };
  }
  const w = Math.abs(cx - sx);
  const h = Math.abs(cy - sy);
  if (w < 2 && h < 2) {
    // Tap without a drag: centered 12x12 region.
    const size = 12;
    const x = clamp(sx - size / 2, 0, 100 - size);
    const y = clamp(sy - size / 2, 0, 100 - size);
    return { id, tool, x: round1(x), y: round1(y), w: size, h: size, comment: "" };
  }
  const x = Math.min(sx, cx);
  const y = Math.min(sy, cy);
  const fw = Math.max(1.5, w);
  const fh = Math.max(1.5, h);
  return {
    id,
    tool,
    x: round1(Math.min(x, 100 - fw)),
    y: round1(Math.min(y, 100 - fh)),
    w: round1(Math.min(fw, 100 - x)),
    h: round1(Math.min(fh, 100 - y)),
    comment: "",
  };
}

export function ScreenshotAnnotator({
  image,
  annotations,
  onChange,
  disabled = false,
}: ScreenshotAnnotatorProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tool, setTool] = useState<AnnotationTool>("arrow");
  const [draft, setDraft] = useState<Draft | null>(null);

  const baseRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const draftRef = useRef<Draft | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const atCap = annotations.length >= SCREENSHOT_ANNOTATION_MAX;

  // Load the base image once per `image` prop (no flicker on re-resolves).
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
        setSrc(el.src);
        setLoadError(null);
      })
      .catch(() => {
        if (!cancelled)
          setLoadError("Could not load that image. Try a JPG or PNG and try again.");
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

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !src) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const dpr =
      Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const sx = rect.width / 100;
    const sy = rect.height / 100;
    const X = (p: number) => p * sx;
    const Y = (p: number) => p * sy;
    const lw = Math.max(2, rect.width / 300);

    const badge = (bx: number, by: number, index: number) => {
      const r = 10;
      const cx = clamp(bx, r + 2, rect.width - r - 2);
      const cy = clamp(by, r + 2, rect.height - r - 2);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = "#111111";
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(index + 1), cx, cy + 0.5);
    };

    const paint = (
      a: Annotation,
      index: number | null,
      dashed: boolean,
      alpha: number
    ) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      if (a.tool === "arrow") {
        const tx = X(a.x);
        const ty = Y(a.y);
        const hx = X(a.w);
        const hy = Y(a.h);
        ctx.strokeStyle = "#ff3b30";
        ctx.fillStyle = "#ff3b30";
        ctx.lineWidth = lw;
        ctx.lineCap = "round";
        if (dashed) ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(hx, hy);
        ctx.stroke();
        ctx.setLineDash([]);
        const ang = Math.atan2(hy - ty, hx - tx);
        const L = Math.max(9, lw * 4);
        const spread = 0.42;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx - L * Math.cos(ang - spread), hy - L * Math.sin(ang - spread));
        ctx.lineTo(hx - L * Math.cos(ang + spread), hy - L * Math.sin(ang + spread));
        ctx.closePath();
        ctx.fill();
        if (index !== null) badge(tx, ty, index);
      } else {
        const b = bboxOf(a);
        const px = X(b.x);
        const py = Y(b.y);
        const pw = Math.max(1, b.w * sx);
        const ph = Math.max(1, b.h * sy);
        if (a.tool === "circle") {
          ctx.strokeStyle = "#ff3b30";
          ctx.lineWidth = lw;
          if (dashed) ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.ellipse(px + pw / 2, py + ph / 2, pw / 2, ph / 2, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (a.tool === "box") {
          ctx.fillStyle = "rgba(255, 214, 10, 0.38)";
          ctx.fillRect(px, py, pw, ph);
          ctx.strokeStyle = "#8a6d00";
          ctx.lineWidth = Math.max(1.5, lw / 2);
          if (dashed) ctx.setLineDash([6, 4]);
          ctx.strokeRect(px, py, pw, ph);
          ctx.setLineDash([]);
        } else {
          // Preview-only approximation: the real pixelation happens in
          // flattenAnnotations. Here a dark wash + dashed edge marks intent.
          ctx.fillStyle = "rgba(17, 17, 17, 0.5)";
          ctx.fillRect(px, py, pw, ph);
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = Math.max(1.5, lw / 2);
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(px, py, pw, ph);
          ctx.setLineDash([]);
        }
        if (index !== null) badge(px, py, index);
      }
      ctx.restore();
    };

    annotations.forEach((a, i) => paint(a, i, false, 1));
    if (draft) {
      const preview = draftToAnnotation(tool, "draft", draft);
      paint(preview, null, true, 0.75);
    }
  }, [annotations, draft, tool, src]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Keep the overlay crisp across resizes/zooms.
  useEffect(() => {
    if (!src) return;
    const onResize = () => redraw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [src, redraw]);

  const toPercent = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((clientY - rect.top) / rect.height) * 100, 0, 100),
    };
  }, []);

  // Tool active when the current stroke started (mid-stroke switches apply
  // to the *next* stroke, never the one in flight).
  const draftToolRef = useRef<AnnotationTool>("arrow");

  // Synced in an effect (never during render) so the stable finishStroke
  // below always commits against the latest annotations/onChange.
  const latestRef = useRef({ annotations, onChange });
  useEffect(() => {
    latestRef.current = { annotations, onChange };
  }, [annotations, onChange]);

  const finishStroke = useCallback(() => {
    const d = draftRef.current;
    draftRef.current = null;
    setDraft(null);
    if (!d) return;
    const { annotations: latest, onChange: push } = latestRef.current;
    if (latest.length >= SCREENSHOT_ANNOTATION_MAX) return;
    push([...latest, draftToAnnotation(draftToolRef.current, newAnnotationId(), d)]);
  }, []);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (disabled || !src || loadError) return;
      if (annotations.length >= SCREENSHOT_ANNOTATION_MAX) return;
      const pt = toPercent(e.clientX, e.clientY);
      if (!pt) return;
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // setPointerCapture is best-effort on some mobile browsers.
      }
      draftToolRef.current = tool;
      const d: Draft = { sx: pt.x, sy: pt.y, cx: pt.x, cy: pt.y };
      draftRef.current = d;
      setDraft(d);
    },
    [disabled, src, loadError, annotations.length, toPercent, tool]
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const active = draftRef.current;
      if (!active) return;
      if ((e.buttons & 1) !== 1 && e.pointerType === "mouse") return;
      const pt = toPercent(e.clientX, e.clientY);
      if (!pt) return;
      e.preventDefault();
      const d: Draft = { ...active, cx: pt.x, cy: pt.y };
      draftRef.current = d;
      setDraft(d);
    },
    [toPercent]
  );

  // Esc cancels the in-flight stroke (capture phase + stopPropagation so a
  // hosting dialog does not close at the same time).
  useEffect(() => {
    if (disabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && draftRef.current) {
        event.preventDefault();
        event.stopPropagation();
        draftRef.current = null;
        setDraft(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [disabled]);

  const handleUndo = useCallback(() => {
    if (disabled || annotations.length === 0) return;
    onChange(annotations.slice(0, -1));
  }, [disabled, annotations, onChange]);

  const handleClear = useCallback(() => {
    if (disabled || annotations.length === 0) return;
    draftRef.current = null;
    setDraft(null);
    onChange([]);
  }, [disabled, annotations.length, onChange]);

  const handleRemove = useCallback(
    (id: string) => {
      if (disabled) return;
      onChange(annotations.filter((a) => a.id !== id));
    },
    [disabled, annotations, onChange]
  );

  const handleComment = useCallback(
    (id: string, raw: string) => {
      if (disabled) return;
      const next = raw.slice(0, SCREENSHOT_ANNOTATION_COMMENT_MAX);
      onChange(annotations.map((a) => (a.id === id ? { ...a, comment: next } : a)));
    },
    [disabled, annotations, onChange]
  );

  const activeHint = TOOLS.find((t) => t.id === tool)?.hint ?? "";
  const canEdit = src !== null && loadError === null && !disabled;

  return (
    <div className="flex w-full flex-col gap-3" data-testid="screenshot-annotator">
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex overflow-hidden rounded-lg border"
          role="group"
          aria-label="Annotation tool"
        >
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTool(t.id)}
              aria-pressed={tool === t.id}
              aria-label={`${t.label}: ${t.hint}`}
              disabled={disabled}
              className={`min-h-[44px] px-4 text-sm font-medium disabled:opacity-40 ${
                tool === t.id ? "bg-foreground text-background" : "bg-background"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="ms-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={disabled || annotations.length === 0}
            className="min-h-[44px] rounded-lg border px-4 text-sm font-medium disabled:opacity-40"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled || annotations.length === 0}
            className="min-h-[44px] rounded-lg border px-4 text-sm font-medium disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground" role="status">
        {atCap
          ? `Annotation limit reached (${SCREENSHOT_ANNOTATION_MAX}). Remove one to add another.`
          : `${activeHint}. ${annotations.length} of ${SCREENSHOT_ANNOTATION_MAX} annotations — Esc cancels a stroke.`}
      </p>

      <div className="relative w-full overflow-hidden rounded-xl border bg-muted">
        {loadError ? (
          <p role="alert" className="p-6 text-sm text-destructive">
            {loadError}
          </p>
        ) : !src ? (
          <p className="p-6 text-sm text-muted-foreground">Loading image…</p>
        ) : (
          <>
            {/* Base screenshot: plain img so EXIF-correct sizing is free; the canvas draws shapes. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- blob/dataURL annotation source; next/image would remap pixels */}
            <img
              src={src}
              alt="Screenshot being annotated"
              draggable={false}
              className="block h-auto w-full select-none"
            />
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishStroke}
              onPointerCancel={finishStroke}
              onPointerLeave={finishStroke}
              className={`absolute inset-0 h-full w-full ${
                canEdit ? "cursor-crosshair" : "cursor-not-allowed"
              }`}
              style={{ touchAction: "none" }}
              aria-label={
                canEdit
                  ? `Draw ${TOOL_LABEL[tool].toLowerCase()} annotations on the screenshot`
                  : "Screenshot annotations (editing disabled)"
              }
            />
          </>
        )}
      </div>

      {annotations.length > 0 ? (
        <ol className="flex flex-col gap-1.5" aria-label="Annotations">
          {annotations.map((a, i) => {
            const commentId = `screenshot-annotator-comment-${a.id}`;
            return (
              <li
                key={a.id}
                className="flex items-start gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background"
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 space-y-1.5">
                  <span className="block text-xs text-muted-foreground">
                    {describeAnnotation(a, i)}
                  </span>
                  <label htmlFor={commentId} className="sr-only">
                    {`Comment for annotation ${i + 1} (${TOOL_LABEL[a.tool].toLowerCase()})`}
                  </label>
                  <input
                    id={commentId}
                    type="text"
                    value={a.comment}
                    onChange={(event) => handleComment(a.id, event.target.value)}
                    placeholder="Add a note (optional, 280 chars)"
                    maxLength={SCREENSHOT_ANNOTATION_COMMENT_MAX}
                    disabled={disabled}
                    aria-describedby={`${commentId}-count`}
                    className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                  />
                  <span
                    id={`${commentId}-count`}
                    className="block text-xs text-muted-foreground"
                    aria-live="polite"
                  >
                    {a.comment.length}/{SCREENSHOT_ANNOTATION_COMMENT_MAX} characters
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(a.id)}
                  disabled={disabled}
                  aria-label={`Remove annotation ${i + 1} (${TOOL_LABEL[
                    a.tool
                  ].toLowerCase()})`}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md px-2 text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  <span aria-hidden="true">✕</span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-xs text-muted-foreground" role="status">
          No annotations yet — pick a tool and drag on the screenshot.
        </p>
      )}
    </div>
  );
}

export default ScreenshotAnnotator;
