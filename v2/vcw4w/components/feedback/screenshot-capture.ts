/**
 * screenshot-capture.ts — current-tab-only JPG snapshot for the feedback camera button.
 *
 * Captures whatever this tab renders by rasterizing an in-page snapshot of
 * `document.documentElement` (SVG foreignObject -> Image -> canvas -> JPEG).
 * It runs entirely in-page: no OS picker, no confirmation dialog, and no other
 * tab or screen surface is ever reachable by construction.
 *
 * Fail-open contract: every failure rejects with a `ScreenshotCaptureError`
 * carrying a human-readable message the caller can surface directly.
 */

export class ScreenshotCaptureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScreenshotCaptureError";
  }
}

/** Longest edge of the exported JPEG in pixels. */
export const SCREENSHOT_MAX_DIMENSION = 1600;

/** JPEG quality passed to `canvas.toBlob`. */
export const SCREENSHOT_JPEG_QUALITY = 0.85;

/**
 * Capture the current tab as a JPEG Blob.
 *
 * - Current tab only: serializes this document's DOM; nothing outside this
 *   page can appear in the output.
 * - No prompts: uses DOM + canvas rasterization, never a picker flow.
 * - Downscales so the longest edge is at most `maxDimension` (default 1600px).
 * - Encodes `image/jpeg` at `quality` (default 0.85).
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

  const docEl = document.documentElement;
  const viewportW = window.innerWidth || docEl.clientWidth || 1280;
  const viewportH = window.innerHeight || docEl.clientHeight || 800;
  const fullW = Math.max(docEl.scrollWidth || 0, viewportW, 1);
  const fullH = Math.max(docEl.scrollHeight || 0, viewportH, 1);

  const svgUrl = buildDocumentSvgUrl(fullW, fullH);
  try {
    const rendered = await rasterizeSvg(svgUrl, fullW, fullH);
    return await canvasToJpeg(rendered, fullW, fullH, maxDimension, quality);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
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
    clone.querySelectorAll("script, noscript, iframe, video, audio").forEach((el) => el.remove());
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

async function canvasToJpeg(
  img: HTMLImageElement,
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
    ctx.drawImage(img, 0, 0, outW, outH);
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
