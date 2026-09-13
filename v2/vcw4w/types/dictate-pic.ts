/**
 * DictatePic (D(pi)c) — GIMP-style layered canvas & sprite editor types.
 *
 * Remastery README §3.2 (Wave 3, web lane, owner R12).
 * Pure types + constants only — no DOM access at module scope, so this file
 * is safe to import from server components. Live canvases are created inside
 * `useEffect` in `components/studio/dictate-*.tsx` (axiom §1.2: useEffect-only
 * browser APIs, fail-open).
 *
 * Relationship to `lib/remastery/remastery-types.ts`: that module carries the
 * serializable `CanvasLayerMeta` for headless/foundation use (no DOM refs).
 * This module is the editor's contract — it re-declares the same literal
 * unions (kept in sync by hand, single source of literal values below) and
 * adds the live-canvas `CanvasLayer`, undo snapshots, and interop events.
 */

// --- Document geometry (§3.2 blueprint: fixed 512px document) ---
export const DICTATE_DOC_WIDTH = 512;
export const DICTATE_DOC_HEIGHT = 512;
/** Checkerboard transparency square size in px (painted under layers). */
export const DICTATE_CHECKER_SIZE = 16;
/** Bounded undo history (blueprint "Tips" §3.2: max 30 snapshots). */
export const DICTATE_UNDO_LIMIT = 30;
/** Storage cap guard: never snapshot a layer larger than the document. */
export const DICTATE_MAX_SNAPSHOT_BYTES = 2_000_000;

// --- Blend modes (canvas globalCompositeOperation subset, §3.2) ---
export type DictateBlendMode =
  | "source-over"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn";

export const DICTATE_BLEND_MODES: DictateBlendMode[] = [
  "source-over",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
];

// --- Tools (§3.2 blueprint ActiveTool union, verbatim) ---
export type DictateTool =
  | "brush"
  | "pencil"
  | "eraser"
  | "bucket"
  | "eyedropper"
  | "marquee"
  | "lasso"
  | "clone_stamp"
  | "ai_inpaint"
  | "ai_remove_bg"
  | "slice";

/** Tools with a working raster implementation in this Wave-3 slice. */
export const DICTATE_PAINT_TOOLS: DictateTool[] = [
  "brush",
  "pencil",
  "eraser",
  "bucket",
  "eyedropper",
];

/** Tools rendered as clearly-marked stubs (no backend wired, §3.2). */
export const DICTATE_STUB_TOOLS: DictateTool[] = [
  "ai_inpaint",
  "ai_remove_bg",
  "slice",
];

/** Selection/clone tools deferred past Wave 3 (listed so UI stays honest). */
export const DICTATE_PLANNED_TOOLS: DictateTool[] = [
  "marquee",
  "lasso",
  "clone_stamp",
];

// --- Layers ---
/** Serializable layer metadata — safe to persist / post to interop bus. */
export interface DictateLayerMeta {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  /** 0.0 – 1.0, applied as ctx.globalAlpha at composite time. */
  opacity: number;
  blendMode: DictateBlendMode;
}

/**
 * Live layer: metadata + offscreen document-sized canvas.
 * Instances are created in `useEffect` and held in a ref Map (never in
 * React state, never serialized) to avoid SSR/hydration mismatches.
 */
export interface DictateLayer extends DictateLayerMeta {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

// --- Undo (bounded: data-URL snapshots, newest-first, cap DICTATE_UNDO_LIMIT) ---
export interface DictateUndoSnapshot {
  layerId: string;
  dataUrl: string;
  label: string;
}

// --- Interop (§1.2 axiom 5: publish standard events on the shared bus) ---
export const DICTATE_INTEROP_CHANNEL = "4weird_interop_bus";

export type DictateInteropType =
  | "dictate-pic:stroke"
  | "dictate-pic:layer-change"
  | "dictate-pic:export"
  | "dictate-pic:ai-stub";

export interface DictateInteropEvent {
  kind: "dictate-pic";
  type: DictateInteropType;
  at: string;
  detail: Record<string, string | number | boolean>;
}

// --- AI stubs (explicitly backend-free) ---
export type DictateAiStubId = "ai_inpaint" | "ai_remove_bg" | "slice";

export interface DictateAiStub {
  id: DictateAiStubId;
  title: string;
  blurb: string;
  /** Future backend route — NOT called in Wave 3. */
  futureRoute: string;
}

export const DICTATE_AI_STUBS: DictateAiStub[] = [
  {
    id: "ai_inpaint",
    title: "AI Inpaint Brush",
    blurb:
      "STUB — paints into an offscreen mask today; no model call is made.",
    futureRoute: "POST /api/studio/image/inpaint (not implemented)",
  },
  {
    id: "ai_remove_bg",
    title: "AI Background Remover",
    blurb: "STUB — button renders the fail-open notice; no model call is made.",
    futureRoute: "POST /api/studio/image/remove-bg (not implemented)",
  },
  {
    id: "slice",
    title: "Slice Spritesheet / Upscale x4",
    blurb:
      "STUB — export the PNG and slice/upscale externally; no job is queued.",
    futureRoute: "POST /api/studio/image/upscale (not implemented)",
  },
];
