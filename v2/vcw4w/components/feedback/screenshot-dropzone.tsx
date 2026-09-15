"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  SCREENSHOT_COMPRESS_ABOVE_BYTES,
  capturePageForFeedback,
  compressImageFile,
} from "./screenshot-capture";

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
  const dragDepth = useRef(0);
  const busy = disabled || working || capturing;

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
