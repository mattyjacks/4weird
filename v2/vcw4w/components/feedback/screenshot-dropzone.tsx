"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  SCREENSHOT_COMPRESS_ABOVE_BYTES,
  capturePageForFeedback,
  compressImageFile,
} from "./screenshot-capture";
import type {
  Annotation,
  AnnotationTool,
  ScreenshotAnnotatorProps,
} from "./screenshot-annotator";

/**
 * Inline screenshot editor (DS-FB2-04, owned here in the dropzone only —
 * `screenshot-annotator.tsx` is never edited from this lane).
 *
 * Lazy-mounted via next/dynamic (client-only) the first time Edit/Mark is
 * pressed, so the feedback form never pays for the canvas editor until the
 * user asks for it. `initialTool` is a forward-compatible passthrough: the
 * annotator does not declare it yet, so it is accepted here as an optional
 * type-only widening (extra prop is ignored at runtime) and will take effect
 * once the annotator lane adds support. Mark/Label requests the region
 * ("box"/Highlight) tool — the mark-a-region + per-shape comment (label)
 * tool — while Edit requests the default "arrow" tool.
 */
type AnnotatorWithInitialTool = React.ComponentType<
  ScreenshotAnnotatorProps & { initialTool?: AnnotationTool }
>;

const ScreenshotAnnotatorLazy = dynamic(
  () =>
    import("./screenshot-annotator").then((mod) => mod.ScreenshotAnnotator),
  {
    ssr: false,
    loading: () => (
      <p role="status" className="p-4 text-sm text-muted-foreground">
        Loading editor…
      </p>
    ),
  },
) as unknown as AnnotatorWithInitialTool;

export interface ScreenshotDropzoneProps {
  value: File | null;
  onChange: (next: File | null) => void;
  disabled?: boolean;
}

export const SCREENSHOT_MAX_BYTES = 8 * 1024 * 1024;

const ACCEPT = "image/png,image/jpeg,image/webp,.jpg,.jpeg,.png,.webp";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function ScreenshotDropzone({ value, onChange, disabled = false }: ScreenshotDropzoneProps) {
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [working, setWorking] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTool, setEditorTool] = useState<AnnotationTool>("arrow");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [applying, setApplying] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const dragDepth = useRef(0);
  const busy = disabled || working || capturing || applying;

  // Thumbnail via object URL, memoized per File; the effect only revokes
  // on change/unmount so we never leak URLs (no setState-in-effect).
  const previewUrl = useMemo(
    () => (value ? URL.createObjectURL(value) : null),
    [value],
  );
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Move focus into the inline editor when it opens (keyboard entry point).
  useEffect(() => {
    if (editorOpen) editorRef.current?.focus({ preventScroll: true });
  }, [editorOpen]);

  const acceptFile = async (file: File | null) => {
    if (busy) return;
    if (!file) return;
    if (!ALLOWED_TYPES.has(file.type)) {
      // Clipboard entries can omit the MIME type — fall back to extension.
      if (!/\.(png|jpe?g|webp)$/i.test(file.name)) {
        setError("Only PNG, JPEG, or WebP images are supported.");
        return;
      }
    }
    if (file.size === 0) {
      setError("Screenshot is empty.");
      return;
    }
    if (file.size > SCREENSHOT_MAX_BYTES) {
      setError(`Screenshot must be ≤ 8MB (got ${formatSize(file.size)}).`);
      return;
    }
    setError(null);
    setNote(null);
    // A fresh file starts with fresh markings: close the inline editor and
    // drop any annotations drawn on the previous shot (all in handlers,
    // never in effects).
    setAnnotations([]);
    setEditorOpen(false);
    // Client compress: files over 2MB are downscaled via canvas to JPG 0.85
    // (max 1600px longest edge) before attach; smaller files pass through.
    if (file.size > SCREENSHOT_COMPRESS_ABOVE_BYTES) {
      setWorking(true);
      try {
        const compressed = await compressImageFile(file);
        onChange(compressed);
        if (compressed.size !== file.size) {
          setNote(`Compressed to ${formatSize(compressed.size)} JPG for upload.`);
        }
      } finally {
        setWorking(false);
      }
      return;
    }
    onChange(file);
  };

  const clearFile = () => {
    if (disabled) return;
    setError(null);
    setNote(null);
    setPreviewOpen(false);
    setEditorOpen(false);
    setAnnotations([]);
    setDragging(false);
    dragDepth.current = 0;
    if (inputRef.current) inputRef.current.value = "";
    onChange(null);
  };

  const handleCapture = async (): Promise<boolean> => {
    if (busy) return false;
    // Capture-this-page: quiet DOM snapshot first (libraries when installed,
    // else canvas fallback); the display picker only fires if that fails.
    setCapturing(true);
    setError(null);
    setNote(null);
    try {
      const blob = await capturePageForFeedback();
      await acceptFile(new File([blob], `page-capture-${Date.now()}.jpg`, { type: "image/jpeg" }));
      return true;
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Could not capture this page.");
      return false;
    } finally {
      setCapturing(false);
    }
  };

  const handleRetake = async () => {
    setPreviewOpen(false);
    // Recapture the page by design; reopen the preview on the fresh shot.
    // A failed capture surfaces its error inline instead.
    if (await handleCapture()) setPreviewOpen(true);
  };

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const openEditor = (tool: AnnotationTool) => {
    if (disabled || !value) return;
    // Edit → default arrow tool; Mark/Label → region (box/Highlight) tool
    // with per-shape comments as labels. Passed as initialTool (see the
    // forward-compatible note on ScreenshotAnnotatorLazy above).
    setEditorTool(tool);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
  };

  const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // The annotator cancels its own in-flight stroke on Escape (capture
    // phase + stopPropagation), so reaching here means no stroke is active
    // and Escape can safely collapse the editor.
    if (event.key === "Escape") {
      event.preventDefault();
      closeEditor();
    }
  };

  const handleClearMarkings = () => {
    if (disabled) return;
    setAnnotations([]);
  };

  const handleApplyMarkings = async () => {
    if (disabled || !value || annotations.length === 0 || applying) return;
    // Burn the annotations into a fresh JPEG and hand it back to the form
    // as the new File (dynamic import keeps the editor chunk lazy).
    setApplying(true);
    setError(null);
    try {
      const { flattenAnnotations } = await import("./screenshot-annotator");
      const blob = await flattenAnnotations(value, annotations);
      const base = value.name.replace(/\.(png|jpe?g|webp)$/i, "") || "screenshot";
      const marked = new File([blob], `${base}-marked.jpg`, {
        type: "image/jpeg",
      });
      if (marked.size > SCREENSHOT_MAX_BYTES) {
        setError(`Marked screenshot must be ≤ 8MB (got ${formatSize(marked.size)}).`);
        return;
      }
      // Markings are now pixels: reset so a second Apply cannot double-burn.
      setAnnotations([]);
      onChange(marked);
    } catch {
      setError("Could not apply markings. Try again.");
    } finally {
      setApplying(false);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const items = event.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item.kind === "file" && (ALLOWED_TYPES.has(item.type) || item.type.startsWith("image/"))) {
        const file = item.getAsFile();
        if (file) {
          event.preventDefault();
          void acceptFile(file);
          return;
        }
      }
    }
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    dragDepth.current += 1;
    if (event.dataTransfer.types.includes("Files")) setDragging(true);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    if (event.dataTransfer.types.includes("Files")) setDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    void acceptFile(file);
  };

  return (
    <div
      onPaste={handlePaste}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`rounded-md border border-dashed px-3 py-4 text-center transition-colors ${
        dragging
          ? "border-foreground bg-muted"
          : "border-input bg-background"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      aria-label="Screenshot dropzone. Paste, drag and drop, or choose an image file."
      aria-disabled={disabled || undefined}
    >
      {value && previewUrl ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            disabled={disabled}
            aria-label={`Open full preview of ${value.name}`}
            title="Open preview"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={`Screenshot preview of ${value.name}`}
              className="mx-auto max-h-48 rounded-md border object-contain"
            />
          </button>
          <p className="text-sm">
            {value.name}{" "}
            <span className="text-muted-foreground">({formatSize(value.size)})</span>
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              disabled={disabled}
              className="min-h-[44px] min-w-[44px] rounded-md border border-input px-3 text-sm underline-offset-2 hover:underline disabled:opacity-50"
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => openEditor("arrow")}
              disabled={disabled}
              aria-expanded={editorOpen && editorTool === "arrow"}
              aria-controls="screenshot-inline-editor"
              className="min-h-[44px] min-w-[44px] rounded-md border border-input px-3 text-sm underline-offset-2 hover:underline disabled:opacity-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => openEditor("box")}
              disabled={disabled}
              aria-expanded={editorOpen && editorTool === "box"}
              aria-controls="screenshot-inline-editor"
              aria-label="Mark or label regions on the screenshot"
              className="min-h-[44px] min-w-[44px] rounded-md border border-input px-3 text-sm underline-offset-2 hover:underline disabled:opacity-50"
            >
              Mark
            </button>
            <button
              type="button"
              onClick={() => void handleRetake()}
              disabled={busy}
              className="min-h-[44px] min-w-[44px] rounded-md border border-input px-3 text-sm underline-offset-2 hover:underline disabled:opacity-50"
            >
              {capturing ? "Capturing…" : "Retake"}
            </button>
            <button
              type="button"
              onClick={clearFile}
              disabled={disabled}
              aria-label={`Remove screenshot ${value.name}`}
              className="min-h-[44px] min-w-[44px] rounded-md border border-input px-3 text-sm underline-offset-2 hover:underline disabled:opacity-50"
            >
              Remove
            </button>
          </div>
          {editorOpen ? (
            <div
              ref={editorRef}
              id="screenshot-inline-editor"
              role="region"
              aria-label={
                editorTool === "box"
                  ? "Mark or label regions on the screenshot"
                  : "Edit the screenshot"
              }
              tabIndex={-1}
              onKeyDown={handleEditorKeyDown}
              className="mt-2 rounded-md border bg-background p-2 text-left"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {editorTool === "box"
                    ? "Mark / label — drag a region, add a note"
                    : "Edit — draw on the screenshot"}
                </p>
                <button
                  type="button"
                  onClick={closeEditor}
                  className="min-h-[44px] min-w-[44px] rounded-md border border-input px-3 text-sm underline-offset-2 hover:underline"
                >
                  Close editor
                </button>
              </div>
              <ScreenshotAnnotatorLazy
                key={`${value.name}-${value.size}-${value.lastModified}`}
                image={previewUrl}
                annotations={annotations}
                onChange={setAnnotations}
                disabled={disabled}
                initialTool={editorTool}
              />
              <div className="mt-2 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClearMarkings}
                  disabled={disabled || annotations.length === 0}
                  className="min-h-[44px] rounded-md border border-input px-3 text-sm underline-offset-2 hover:underline disabled:opacity-50"
                >
                  Clear markings
                </button>
                <button
                  type="button"
                  onClick={() => void handleApplyMarkings()}
                  disabled={disabled || annotations.length === 0 || applying}
                  className="min-h-[44px] rounded-md bg-primary px-3 text-sm text-primary-foreground disabled:opacity-50"
                >
                  {applying ? "Applying…" : "Apply to screenshot"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-1">
          <span aria-hidden="true">📷</span>
          <p className="text-sm text-muted-foreground">
            Paste (Ctrl/⌘+V), drag &amp; drop, or{" "}
            <button
              type="button"
              onClick={openPicker}
              disabled={busy}
              className="min-h-[44px] underline underline-offset-2 disabled:opacity-50"
            >
              choose a file
            </button>
          </p>
          <button
            type="button"
            onClick={() => void handleCapture()}
            disabled={busy}
            className="mt-1 min-h-[44px] rounded-md border border-input px-3 text-sm underline-offset-2 hover:underline disabled:opacity-50"
          >
            {capturing ? "Capturing…" : "📷 Capture this page"}
          </button>
          <p className="text-xs text-muted-foreground">PNG, JPG, or WebP · ≤ 8MB · larger files compress on attach</p>
        </div>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT}
        disabled={busy}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          void acceptFile(file);
          // Reset so picking the same file twice still fires onChange.
          event.target.value = "";
        }}
        className="sr-only"
      />

      {working ? (
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          Preparing image…
        </p>
      ) : null}

      {note && !error ? (
        <p className="mt-2 text-xs text-muted-foreground">{note}</p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {previewOpen && value && previewUrl ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" role="presentation">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setPreviewOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Screenshot preview of ${value.name}`}
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border bg-background p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold">Screenshot preview</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={`Full preview of ${value.name}`}
              className="mt-3 max-h-[60vh] w-full rounded-md border object-contain"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {value.name} ({formatSize(value.size)})
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => void handleRetake()}
                disabled={busy}
                className="min-h-[44px] rounded-md border border-input px-3 text-sm underline-offset-2 hover:underline disabled:opacity-50"
              >
                {capturing ? "Capturing…" : "Retake"}
              </button>
              <button
                type="button"
                onClick={clearFile}
                disabled={disabled}
                className="min-h-[44px] rounded-md border border-input px-3 text-sm underline-offset-2 hover:underline disabled:opacity-50"
              >
                Remove
              </button>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="min-h-[44px] rounded-md bg-primary px-3 text-sm text-primary-foreground"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ScreenshotDropzone;
