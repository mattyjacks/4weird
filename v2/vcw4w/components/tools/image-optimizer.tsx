"use client";

import { useEffect, useRef, useState } from "react";
import { emitToolEvent } from "@/components/tools/interop";

type OutFormat = "image/webp" | "image/png" | "image/jpeg";

const MAX_BYTES = 25 * 1024 * 1024;
const FORMAT_LABEL: Record<OutFormat, string> = {
  "image/webp": "WebP",
  "image/png": "PNG",
  "image/jpeg": "JPEG",
};
const FORMATS: OutFormat[] = ["image/webp", "image/jpeg", "image/png"];

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode that image file."));
    img.src = src;
  });
}

// Image optimizer: client-side resize + re-encode (WebP/PNG/JPEG).
// Re-encoding through canvas also strips EXIF metadata. Hydration-safe:
// renders an empty drop-zone on the server; every browser API (File,
// object URLs, canvas) runs inside the file-picker handler with guards,
// and object URLs are revoked on change/unmount. Fail-open: any failure
// surfaces a notice while the rest of the page keeps working.
// LAYOUT (UXPASS p55): unified 2-panel 50/50 workbench —
// left dropzone+preview, right format pills + sliders + W/H + download.
export function ImageOptimizer() {
  const [fileName, setFileName] = useState("");
  const [origBytes, setOrigBytes] = useState(0);
  const [origDims, setOrigDims] = useState("");
  const [outBytes, setOutBytes] = useState(0);
  const [outDims, setOutDims] = useState("");
  const [outUrl, setOutUrl] = useState<string | null>(null);
  const [outFormat, setOutFormat] = useState<OutFormat>("image/webp");
  const [quality, setQuality] = useState(80);
  const [maxDim, setMaxDim] = useState(1600);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const sourceUrlRef = useRef<string | null>(null);

  // Revoke object URLs on change/unmount so repeat conversions leak nothing.
  useEffect(() => {
    return () => {
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
      if (outUrl) URL.revokeObjectURL(outUrl);
    };
  }, [outUrl]);

  const convertFile = async (file: File, format: OutFormat, q: number, cap: number) => {
    setWorking(true);
    setNotice(null);
    try {
      if (!file.type.startsWith("image/")) {
        throw new Error("That file is not an image — pick a PNG, JPEG, WebP, or GIF.");
      }
      if (file.size > MAX_BYTES) {
        throw new Error("That image is over 25 MB — pick a smaller file.");
      }
      if (typeof document === "undefined") {
        throw new Error("Image processing needs a browser canvas.");
      }
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
      if (outUrl) URL.revokeObjectURL(outUrl);
      const sourceUrl = URL.createObjectURL(file);
      sourceUrlRef.current = sourceUrl;
      const img = await loadImage(sourceUrl);
      const scale = Math.min(1, cap / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D is unavailable in this browser.");
      ctx.drawImage(img, 0, 0, w, h);
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob(resolve, format, format === "image/png" ? undefined : q / 100),
      );
      if (!blob) throw new Error("The browser refused to encode that format — try PNG.");
      const url = URL.createObjectURL(blob);
      setFileName(file.name);
      setOrigBytes(file.size);
      setOrigDims(`${img.naturalWidth}×${img.naturalHeight}px`);
      setOutBytes(blob.size);
      setOutDims(`${w}×${h}px ${FORMAT_LABEL[format]}`);
      setOutUrl(url);
      emitToolEvent({
        tool: "image",
        action: "convert",
        detail: `${FORMAT_LABEL[format]} q${q} cap${cap}`,
      });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Conversion failed — try another file.");
    } finally {
      setWorking(false);
    }
  };

  const reconvert = (format: OutFormat, q: number, cap: number) => {
    // Re-run with the last source file when settings change post-convert.
    // Fail-open: no source yet → no-op (dropzone handler covers first run).
    const src = sourceUrlRef.current;
    if (!src || working) return;
    void (async () => {
      try {
        const res = await fetch(src);
        const blob = await res.blob();
        const file = new File([blob], fileName || "image", { type: blob.type || "image/*" });
        await convertFile(file, format, q, cap);
      } catch {
        // Keep current result; sliders remain adjustable for next upload.
      }
    })();
  };

  const savings =
    origBytes > 0 && outBytes > 0
      ? Math.round((1 - outBytes / origBytes) * 100)
      : 0;

  return (
    <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
      {/* Left 50%: dropzone + instant preview. */}
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-black">Dropzone + preview</h2>
          {origDims ? (
            <span className="rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] font-bold text-slate-300">
              {origDims} · {formatBytes(origBytes)}
            </span>
          ) : null}
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          Convert + compress + strip EXIF on-device. Nothing uploads.
        </p>
        <label className="mt-3 block cursor-pointer rounded-xl border border-dashed border-cyan-300/40 bg-black/40 px-4 py-6 text-center transition hover:border-cyan-300/80">
          <span className="text-sm font-bold text-cyan-200">
            {working ? "Optimizing…" : "Choose an image file (max 25 MB)"}
          </span>
          <input
            type="file"
            accept="image/*"
            disabled={working}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void convertFile(file, outFormat, quality, maxDim);
            }}
          />
        </label>
        {notice ? (
          <p role="alert" className="mt-2 text-xs text-amber-300">
            {notice}
          </p>
        ) : null}
        <div className="mt-3 min-h-[220px] overflow-hidden rounded-xl border border-white/10 bg-black/40">
          {outUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={outUrl}
              alt={fileName ? `Optimized preview of ${fileName}` : "Optimized preview"}
              className="max-h-[320px] w-full object-contain"
            />
          ) : (
            <p className="flex h-[220px] items-center justify-center px-4 text-center text-xs text-slate-500">
              Preview appears here — pick a file to see before/after size inline.
            </p>
          )}
        </div>
        {outUrl ? (
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-black/40 p-2.5">
              <dt className="text-[10px] uppercase tracking-widest text-slate-500">Original</dt>
              <dd className="mt-0.5 font-bold text-white">
                {formatBytes(origBytes)} · {origDims}
              </dd>
              <dd className="truncate text-slate-500">{fileName}</dd>
            </div>
            <div className="rounded-lg bg-black/40 p-2.5">
              <dt className="text-[10px] uppercase tracking-widest text-slate-500">Optimized</dt>
              <dd className="mt-0.5 font-bold text-emerald-300">
                {formatBytes(outBytes)} · {outDims}
                {savings > 0 ? ` · −${savings}%` : null}
              </dd>
              <dd className="text-slate-500">EXIF stripped automatically</dd>
            </div>
          </dl>
        ) : null}
      </div>

      {/* Right 50%: format pills + sliders + W/H + download. */}
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4 sm:p-5 lg:sticky lg:top-4">
        <h2 className="text-base font-black">Settings + export</h2>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Format
        </p>
        <div role="radiogroup" aria-label="Output format" className="mt-2 flex flex-wrap gap-2">
          {FORMATS.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={outFormat === f}
              onClick={() => {
                setOutFormat(f);
                reconvert(f, quality, maxDim);
              }}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                outFormat === f
                  ? "bg-cyan-300 text-slate-950"
                  : "border border-white/20 text-slate-200 hover:bg-white/10"
              }`}
            >
              {FORMAT_LABEL[f]}
            </button>
          ))}
        </div>
        <label className="mt-4 block">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Quality: {quality}%
          </span>
          <input
            type="range"
            min={10}
            max={100}
            value={quality}
            onChange={(e) => {
              const q = Number(e.target.value);
              setQuality(q);
              reconvert(outFormat, q, maxDim);
            }}
            className="mt-2 w-full"
          />
        </label>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <label className="block rounded-xl bg-black/30 p-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Max W/H (px)
            </span>
            <input
              type="number"
              min={320}
              max={3840}
              step={80}
              value={maxDim}
              onChange={(e) => {
                const cap = Number(e.target.value) || 1600;
                setMaxDim(cap);
              }}
              onBlur={() => reconvert(outFormat, quality, maxDim)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/60"
            />
          </label>
          <label className="block rounded-xl bg-black/30 p-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Max dimension slider
            </span>
            <input
              type="range"
              min={320}
              max={3840}
              step={80}
              value={maxDim}
              onChange={(e) => {
                const cap = Number(e.target.value);
                setMaxDim(cap);
                reconvert(outFormat, quality, cap);
              }}
              className="mt-3 w-full"
            />
            <span className="text-xs text-slate-400">{maxDim}px cap</span>
          </label>
        </div>
        {outUrl ? (
          <a
            href={outUrl}
            download={`optimized.${outFormat === "image/png" ? "png" : outFormat === "image/jpeg" ? "jpg" : "webp"}`}
            className="mt-4 block rounded-full bg-cyan-300 px-6 py-3 text-center text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
          >
            Download optimized image
          </a>
        ) : (
          <p className="mt-4 rounded-xl bg-black/30 p-3 text-xs text-slate-400">
            No conversion yet — pick a file left and the download appears here, no scroll needed.
          </p>
        )}
        <p className="mt-2 text-[11px] text-slate-500">
          Re-encoding drops EXIF metadata (GPS, camera, timestamps) automatically.
        </p>
      </div>
    </div>
  );
}
