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

  const savings =
    origBytes > 0 && outBytes > 0
      ? Math.round((1 - outBytes / origBytes) * 100)
      : 0;

  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
        <h2 className="text-lg font-black">1 · Pick an image</h2>
        <p className="mt-2 text-sm text-slate-400">
          Convert + compress + strip EXIF metadata, entirely on-device. Nothing uploads.
        </p>
        <label className="mt-4 block cursor-pointer rounded-2xl border border-dashed border-cyan-300/40 bg-black/40 px-6 py-8 text-center transition hover:border-cyan-300/80">
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
          <p role="alert" className="mt-3 text-sm text-amber-300">
            {notice}
          </p>
        ) : null}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
        <h2 className="text-lg font-black">2 · Settings</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Format
            </span>
            <select
              value={outFormat}
              onChange={(e) => setOutFormat(e.target.value as OutFormat)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
            >
              <option value="image/webp">WebP (smallest)</option>
              <option value="image/jpeg">JPEG (photos)</option>
              <option value="image/png">PNG (lossless)</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Quality: {quality}%
            </span>
            <input
              type="range"
              min={10}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="mt-4 w-full"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Max dimension: {maxDim}px
            </span>
            <input
              type="range"
              min={320}
              max={3840}
              step={80}
              value={maxDim}
              onChange={(e) => setMaxDim(Number(e.target.value))}
              className="mt-4 w-full"
            />
          </label>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
        <h2 className="text-lg font-black">3 · Result</h2>
        {outUrl ? (
          <div className="mt-4">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-black/40 p-4">
                <dt className="text-xs uppercase tracking-widest text-slate-500">Original</dt>
                <dd className="mt-1 font-bold text-white">
                  {fileName} · {formatBytes(origBytes)} · {origDims}
                </dd>
              </div>
              <div className="rounded-xl bg-black/40 p-4">
                <dt className="text-xs uppercase tracking-widest text-slate-500">Optimized</dt>
                <dd className="mt-1 font-bold text-emerald-300">
                  {formatBytes(outBytes)} · {outDims}
                  {savings > 0 ? ` · −${savings}%` : null}
                </dd>
              </div>
            </dl>
            <a
              href={outUrl}
              download={`optimized.${outFormat === "image/png" ? "png" : outFormat === "image/jpeg" ? "jpg" : "webp"}`}
              className="mt-4 inline-block rounded-full bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
            >
              Download optimized image
            </a>
            <p className="mt-3 text-xs text-slate-500">
              Re-encoding drops EXIF metadata (GPS, camera, timestamps) automatically.
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-400">
            No conversion yet — pick a file above and the optimized download appears here.
          </p>
        )}
      </div>
    </div>
  );
}
