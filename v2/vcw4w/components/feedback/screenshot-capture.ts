/**
 * screenshot-capture.ts — Capture-this-page snapshots for the feedback camera button.
 *
 * V1 (DOM snapshot, no prompts): serialize this document's DOM and rasterize
 * it in-page. Prefer the optional `html-to-image` / `html2canvas` libraries
 * when installed (dynamic import, fail-soft); otherwise fall back to the
 * built-in SVG foreignObject -> Image -> canvas -> JPEG path. Current tab
 * only by construction: nothing outside this page can appear in the output.
 * The feedback dialog itself is excluded (`[role="dialog"]`,
 * `[aria-modal="true"]`, `[data-screenshot-exclude]`,
 * `[data-feedback-dialog]`), and cross-origin
 * iframes — unreadable from script — render as a labeled placeholder box so
 * the capture never silently drops a region without saying so.
 *
 * V2 (display picker fallback): `captureViaDisplayMedia` uses
 * `getDisplayMedia` and is called ONLY when the DOM snapshot fails
 * (see `capturePageForFeedback`) — the picker prompt never appears when the
 * quiet path works.
 *
 * Also home to the shared client-side screenshot helpers: accepted-type
 * validation and >2MB JPEG compression used by the dropzone.
 *
 * Fail-open contract: every capture failure rejects with a
 * `ScreenshotCaptureError` carrying a human-readable message the caller can
 * surface directly.
 */

export class ScreenshotCaptureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScreenshotCaptureError";
  }
}

/** Longest edge of exported/captured images in pixels. */
export const SCREENSHOT_MAX_DIMENSION = 1600;

/** JPEG quality passed to `canvas.toBlob`. */
export const SCREENSHOT_JPEG_QUALITY = 0.85;

/** Files larger than this are client-compressed before submit. */
export const SCREENSHOT_COMPRESS_ABOVE_BYTES = 2 * 1024 * 1024;

/** Authoritative server cap (mirrors POST /api/feedback). */
export const SCREENSHOT_MAX_BYTES = 8 * 1024 * 1024;

/** Accept value for file inputs + drag-drop filtering. */
export const SCREENSHOT_ACCEPT = "image/png,image/jpeg,image/webp";

const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const ACCEPTED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

/** True when the file looks like an accepted screenshot (MIME or extension). */
export function isAcceptedScreenshot(file: File): boolean {
  const type = file.type.toLowerCase();
  if (ACCEPTED_TYPES.has(type)) return true;
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/**
 * Compress an image file when it exceeds `maxBytes` (default 2MB): decode,
 * downscale so the longest edge is at most `maxDimension` (default 1600px),
 * re-encode as JPEG at `quality` (default 0.85). Files already under the cap
 * (or that fail to decode/encode) come back untouched — fail-open so the
 * server's authoritative checks still decide.
 */
export async function compressImageFile(
  file: File,
  maxBytes: number = SCREENSHOT_COMPRESS_ABOVE_BYTES,
  maxDimension: number = SCREENSHOT_MAX_DIMENSION,
  quality: number = SCREENSHOT_JPEG_QUALITY,
): Promise<File> {
  if (file.size <= maxBytes) return file;
  try {
    const source = await decodeToCanvasSource(file);
    const blob = await encodeSourceToJpeg(source.image, source.width, source.height, maxDimension, quality);
    if (!blob || blob.size === 0) return file;
    // Keep it small but never inflate: if re-encoding didn't help, keep original.
    if (blob.size >= file.size) return file;
    const base = file.name.replace(/\.[a-z0-9]+$/i, "") || "screenshot";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

interface DecodedImage {
  image: CanvasImageSource;
  width: number;
  height: number;
}

async function decodeToCanvasSource(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap !== "undefined") {
    try {
      const bitmap = await createImageBitmap(file);
      return { image: bitmap, width: bitmap.width, height: bitmap.height };
    } catch {
      // Fall through to the <img> path.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    return { image: img, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Capture-this-page entry point for the feedback flow.
 *
 * V1 first: quiet DOM snapshot (libraries when available, else the built-in
 * canvas fallback). V2 only when V1 fails: the `getDisplayMedia` picker so
 * the user can still share this tab manually.
 */
export async function capturePageForFeedback(
  maxDimension: number = SCREENSHOT_MAX_DIMENSION,
  quality: number = SCREENSHOT_JPEG_QUALITY,
): Promise<Blob> {
  try {
    return await captureCurrentTabJpg(maxDimension, quality);
  } catch (domError) {
    if (!displayMediaAvailable()) {
      throw domError instanceof ScreenshotCaptureError
        ? domError
        : new ScreenshotCaptureError("Could not capture this page. Try attaching a file instead.");
    }
    return await captureViaDisplayMedia(maxDimension, quality);
  }
}

/**
 * Capture the current tab as a JPEG Blob — DOM snapshot only, never a
 * picker flow (no prompts, current tab only by construction).
 *
 * Tries `html-to-image` / `html2canvas` when installed, else the built-in
 * SVG foreignObject rasterizer.
 *
 * @throws {ScreenshotCaptureError} with a clear message when capture fails.
 */
export async function captureCurrentTabJpg(
  maxDimension: number = SCREENSHOT_MAX_DIMENSION,
  quality: number = SCREENSHOT_JPEG_QUALITY,
): Promise<Blob> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new ScreenshotCaptureError(
      "Screenshot capture needs a browser tab. Render this page in the browser and try again.",
    );
  }

  const viaLibrary = await tryLibrarySnapshot(maxDimension, quality).catch(() => null);
  if (viaLibrary) return viaLibrary;

  const docEl = document.documentElement;
  const viewportW = window.innerWidth || docEl.clientWidth || 1280;
  const viewportH = window.innerHeight || docEl.clientHeight || 800;
  const fullW = Math.max(docEl.scrollWidth || 0, viewportW, 1);
  const fullH = Math.max(docEl.scrollHeight || 0, viewportH, 1);

  const svgUrl = buildDocumentSvgUrl(fullW, fullH);
  try {
    const rendered = await rasterizeSvg(svgUrl, fullW, fullH);
    return await encodeSourceToJpeg(rendered, fullW, fullH, maxDimension, quality);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

/**
 * V2 fallback: capture via the OS display picker. Called only after the DOM
 * snapshot fails. The user picks the surface (ideally this tab); we grab a
 * single video frame, stop the share immediately, and encode it as JPEG.
 */
export async function captureViaDisplayMedia(
  maxDimension: number = SCREENSHOT_MAX_DIMENSION,
  quality: number = SCREENSHOT_JPEG_QUALITY,
): Promise<Blob> {
  if (!displayMediaAvailable()) {
    throw new ScreenshotCaptureError(
      "This browser cannot share the screen. Attach a screenshot file instead.",
    );
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  } catch {
    throw new ScreenshotCaptureError(
      "Screen share was dismissed. Pick this tab to capture it, or attach a file instead.",
    );
  }
  const video = document.createElement("video");
  try {
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("timeout")), 10_000);
      const onCanPlay = () => {
        window.clearTimeout(timer);
        video.removeEventListener("canplay", onCanPlay);
        resolve();
      };
      if (video.readyState >= 3) {
        window.clearTimeout(timer);
        resolve();
      } else {
        video.addEventListener("canplay", onCanPlay);
      }
    });
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 800;
    return await encodeSourceToJpeg(video, w, h, maxDimension, quality);
  } catch {
    throw new ScreenshotCaptureError(
      "Could not read the shared screen frame. Try again or attach a file instead.",
    );
  } finally {
    for (const track of stream.getTracks()) {
      try {
        track.stop();
      } catch {
        // Best-effort track teardown.
      }
    }
    video.srcObject = null;
  }
}

function displayMediaAvailable(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getDisplayMedia === "function"
  );
}

/**
 * Try the optional snapshot libraries when the host app installed them.
 * Both are dynamic, variable-specifier imports so the bundle never requires
 * them: missing packages reject and the caller falls through to the canvas
 * path. Returns the encoded JPEG or null when no library worked.
 */
// Hidden from static analysis on purpose: Turbopack/webpack treat even a
// variable `await import(spec)` as a resolvable dependency and fail the
// build when neither optional package is installed. `new Function` keeps the
// specifier opaque while the surrounding try/catch preserves fail-soft.
type DynamicImporter = (spec: string) => Promise<unknown>;
const dynImport: DynamicImporter = new Function("s", "return import(s)") as DynamicImporter;

async function tryLibrarySnapshot(maxDimension: number, quality: number): Promise<Blob | null> {
  const specs = ["html-to-image", "html2canvas"];
  for (const spec of specs) {
    try {
      // Non-literal specifier on purpose: static bundlers must not try to
      // resolve these optional peer dependencies at build time.
      const mod: unknown = await dynImport(spec);
      const canvas = await renderWithLibrary(mod, spec);
      if (!canvas) continue;
      const blob = await encodeSourceToJpeg(canvas, canvas.width, canvas.height, maxDimension, quality);
      if (blob && blob.size > 0) return blob;
    } catch {
      continue;
    }
  }
  return null;
}

function isFunction(value: unknown): value is (...args: never[]) => unknown {
  return typeof value === "function";
}

async function renderWithLibrary(mod: unknown, spec: string): Promise<HTMLCanvasElement | null> {
  if (typeof document === "undefined") return null;
  try {
    if (spec === "html-to-image") {
      const record = (mod ?? {}) as Record<string, unknown>;
      const toPng = record["toPng"];
      const fallback = (mod as { default?: Record<string, unknown> } | null)?.default?.["toPng"];
      const fn = isFunction(toPng) ? toPng : isFunction(fallback) ? fallback : null;
      if (!fn) return null;
      const dataUrl = (await (fn as (node: HTMLElement, opts: Record<string, unknown>) => Promise<string>)(
        document.documentElement,
        { pixelRatio: 1, cacheBust: true },
      )) as string;
      if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) return null;
      const img = await loadImage(dataUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width || 1;
      canvas.height = img.naturalHeight || img.height || 1;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      return canvas;
    }
    const record = (mod ?? {}) as Record<string, unknown>;
    const candidate =
      isFunction(mod) ? mod : isFunction(record["default"]) ? record["default"] : isFunction(record["html2canvas"]) ? record["html2canvas"] : null;
    if (!candidate) return null;
    const canvas = (await (candidate as (el: HTMLElement, opts: Record<string, unknown>) => Promise<HTMLCanvasElement>)(
      document.documentElement,
      { backgroundColor: "#ffffff", logging: false },
    )) as HTMLCanvasElement;
    if (!canvas || typeof canvas.width !== "number" || typeof canvas.getContext !== "function") return null;
    return canvas;
  } catch {
    return null;
  }
}

function loadImage(src: string, timeoutMs = 20_000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = window.setTimeout(() => {
      reject(new ScreenshotCaptureError("Timed out drawing this tab. The page may be too heavy — try again."));
    }, timeoutMs);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      reject(new ScreenshotCaptureError("Could not draw this tab as an image."));
    };
    img.src = src;
  });
}

function clampDimension(n: number, fallback: number): number {
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), 8192);
}

/** Serialize this document into a same-tab SVG image served as a blob URL. */
function buildDocumentSvgUrl(width: number, height: number): string {
  const styleText = collectSameOriginCss();
  const markup = serializeDocumentElement();
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<foreignObject x="0" y="0" width="100%" height="100%">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" style="margin:0;width:${width}px;height:${height}px;overflow:hidden;background:#ffffff;">` +
    (styleText ? `<style>${escapeForStyleBlock(styleText)}</style>` : "") +
    markup +
    `</div></foreignObject></svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  return URL.createObjectURL(blob);
}

/** Best-effort copy of same-origin styles so the snapshot resembles the tab. */
function collectSameOriginCss(): string {
  const chunks: string[] = [];
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList | null = null;
      try {
        rules = sheet.cssRules;
      } catch {
        // Cross-origin sheet: unreadable, skip it rather than failing capture.
        continue;
      }
      if (!rules) continue;
      try {
        const text = Array.from(rules)
          .map((rule) => rule.cssText)
          .join("\n");
        if (text) chunks.push(text);
      } catch {
        continue;
      }
      if (chunks.join("\n").length > 500_000) break;
    }
  } catch {
    // Style collection is cosmetic; a failure here must not fail capture.
  }
  return chunks.join("\n").slice(0, 500_000);
}

function serializeDocumentElement(): string {
  try {
    const clone = document.documentElement.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("script, noscript, video, audio").forEach((el) => el.remove());
    // Never capture the feedback dialog itself (or any modal): the capture
    // button lives inside it, and the page behind it is the subject.
    clone
      .querySelectorAll(
        '[role="dialog"], [aria-modal="true"], [data-screenshot-exclude], [data-feedback-dialog]',
      )
      .forEach((el) => el.remove());
    // Cross-origin iframes are unreadable from script and rasterize blank:
    // swap each for a labeled placeholder so the gap is explicit, not silent.
    clone.querySelectorAll("iframe").forEach((frame) => {
      const box = document.createElement("div");
      const w = frame.getAttribute("width") || "100%";
      const h = frame.getAttribute("height") || "160";
      box.setAttribute(
        "style",
        `display:flex;align-items:center;justify-content:center;min-height:64px;width:${w};height:${h};` +
          "background:#f1f5f9;color:#475569;font:12px/1.5 sans-serif;border:1px dashed #94a3b8;border-radius:8px;",
      );
      box.textContent = "Embedded frame hidden in capture (cross-origin content renders blank).";
      frame.replaceWith(box);
    });
    clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
    return new XMLSerializer().serializeToString(clone);
  } catch {
    throw new ScreenshotCaptureError(
      "Could not read this tab's content for capture. Try scrolling to the area and capturing again.",
    );
  }
}

function escapeForStyleBlock(css: string): string {
  return css.replace(/<\//g, "<\\/");
}

function rasterizeSvg(svgUrl: string, width: number, height: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    const timer = window.setTimeout(() => {
      reject(
        new ScreenshotCaptureError(
          "Timed out drawing this tab. The page may be too heavy — try closing overlays and capturing again.",
        ),
      );
    }, 20_000);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      reject(
        new ScreenshotCaptureError(
          "Could not draw this tab as an image (inline content could not be rasterized).",
        ),
      );
    };
    img.width = width;
    img.height = height;
    img.src = svgUrl;
  });
}

async function encodeSourceToJpeg(
  source: CanvasImageSource,
  sourceW: number,
  sourceH: number,
  maxDimension: number,
  quality: number,
): Promise<Blob> {
  const cap = clampDimension(maxDimension, SCREENSHOT_MAX_DIMENSION);
  const q = Number.isFinite(quality) ? Math.min(1, Math.max(0.1, quality)) : SCREENSHOT_JPEG_QUALITY;
  const longest = Math.max(sourceW, sourceH);
  const scale = longest > cap ? cap / longest : 1;
  const outW = Math.max(1, Math.round(sourceW * scale));
  const outH = Math.max(1, Math.round(sourceH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new ScreenshotCaptureError("This browser could not prepare an image canvas. Try another browser.");
  }
  // JPEG has no alpha channel: paint white so transparent regions stay white.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outW, outH);
  try {
    ctx.drawImage(source, 0, 0, outW, outH);
  } catch {
    throw new ScreenshotCaptureError(
      "This tab uses cross-origin images that block export. Capture failed so no partial image is returned.",
    );
  }

  const blob = await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob((result) => resolve(result), "image/jpeg", q);
    } catch {
      resolve(null);
    }
  });
  if (!blob) {
    throw new ScreenshotCaptureError("Could not encode the capture as JPG. Please try again.");
  }
  return blob;
}
