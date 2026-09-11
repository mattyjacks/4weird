/**
 * Perf client — Web Worker fan-out + hardware GPU hints for the whole v2 stack.
 *
 * Client-safe, dependency-free, tiny. Every helper degrades honestly:
 * no Worker support (SSR, old browser, file://) => main-thread fallback.
 * Workers live under /workers/*.js (static, long-cached, no build step).
 *
 * Usage:
 *   import { filterGamesAsync, renderMarkdownAsync, analyzeTelemetryAsync } from "@/lib/perf-client";
 */

export type GpuTier = "high" | "basic" | "none";
export type PerfTier = {
  cores: number;
  gpu: GpuTier;
  lowPower: boolean;
  canWorker: boolean;
};

let cachedTier: PerfTier | null = null;

function detectGpu(): GpuTier {
  try {
    if (typeof document === "undefined") return "none";
    const canvas = document.createElement("canvas");
    const gl =
      (canvas.getContext("webgl2", { powerPreference: "high-performance" }) as WebGLRenderingContext | null) ??
      (canvas.getContext("webgl", { powerPreference: "high-performance" }) as WebGLRenderingContext | null);
    if (!gl) return "none";
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? "")
      : "";
    // SwiftShader / Basic Render / llvmpipe => software rasterizer.
    if (/swiftshader|llvmpipe|basic render|software/i.test(renderer)) return "basic";
    return "high";
  } catch {
    return "none";
  }
}

/** Cheap one-shot hardware profile. Cached per page load. */
export function getPerfTier(): PerfTier {
  if (cachedTier) return cachedTier;
  const nav = (typeof navigator !== "undefined" ? navigator : {}) as Navigator & {
    hardwareConcurrency?: number;
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const cores = Math.max(1, Math.min(32, nav.hardwareConcurrency ?? 2));
  const saveData = nav.connection?.saveData === true;
  const slowNet = /2g|slow/i.test(String(nav.connection?.effectiveType ?? ""));
  const reduced =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lowPower = saveData || slowNet || reduced;
  const canWorker = typeof window !== "undefined" && typeof window.Worker === "function";
  const gpu = typeof window === "undefined" ? "none" : detectGpu();
  cachedTier = { cores, gpu, lowPower, canWorker };
  return cachedTier;
}

/** requestIdleCallback with setTimeout fallback. Returns a cancel fn. */
export function onIdle(cb: () => void, timeoutMs = 1200): () => void {
  if (typeof window === "undefined") return () => undefined;
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (typeof w.requestIdleCallback === "function") {
    const id = w.requestIdleCallback(cb, { timeout: timeoutMs });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(cb, Math.min(200, timeoutMs));
  return () => window.clearTimeout(id);
}

/** Run IntersectionObserver once when el enters the viewport (for lazy work). */
export function onVisible(el: Element, cb: () => void): () => void {
  if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
    cb();
    return () => undefined;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          io.disconnect();
          cb();
          break;
        }
      }
    },
    { rootMargin: "200px" },
  );
  io.observe(el);
  return () => io.disconnect();
}

type WorkerRequest = { type: string; [key: string]: unknown };
type WorkerResult<T> = { ok: true; result: T } | { ok: false; error: string };

const workerCache = new Map<string, Worker | null>();

function getWorker(path: string): Worker | null {
  if (typeof window === "undefined" || typeof window.Worker !== "function") return null;
  if (workerCache.has(path)) return workerCache.get(path) ?? null;
  try {
    const w = new window.Worker(path);
    workerCache.set(path, w);
    return w;
  } catch {
    workerCache.set(path, null);
    return null;
  }
}

/**
 * One-shot worker call with timeout + main-thread fallback.
 * The shared worker stays alive across calls (warm); a hung call falls back
 * without killing the pool. Never throws — fallback always runs.
 */
export async function runWorker<T>(
  workerPath: string,
  message: WorkerRequest,
  fallback: () => T | Promise<T>,
  timeoutMs = 1500,
): Promise<T> {
  const worker = getWorker(workerPath);
  if (!worker) return fallback();
  try {
    const result = await new Promise<WorkerResult<T>>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("worker-timeout")), timeoutMs);
      const onMsg = (event: MessageEvent<WorkerResult<T>>) => {
        window.clearTimeout(timer);
        worker.removeEventListener("message", onMsg as EventListener);
        resolve(event.data);
      };
      const onErr = () => {
        window.clearTimeout(timer);
        worker.removeEventListener("message", onMsg as EventListener);
        reject(new Error("worker-error"));
      };
      worker.addEventListener("message", onMsg as EventListener);
      worker.addEventListener("error", onErr as EventListener, { once: true });
      try {
        worker.postMessage(message);
      } catch (err) {
        window.clearTimeout(timer);
        reject(err instanceof Error ? err : new Error("worker-post"));
      }
    });
    if (result && result.ok) return result.result;
    return fallback();
  } catch {
    return fallback();
  }
}

/** Warm workers during idle so first real use never pays construction cost. */
export function warmPerfWorkers(): void {
  onIdle(() => {
    for (const path of ["/workers/search-worker.js", "/workers/markdown-worker.js", "/workers/telemetry-worker.js"]) {
      try {
        getWorker(path);
      } catch {
        /* best-effort */
      }
    }
    getPerfTier();
  }, 2000);
}

// ---------------------------------------------------------------------------
// Typed task helpers (each pairs with a static worker + sync fallback)
// ---------------------------------------------------------------------------

export type GameFilterItem = { slug: string; haystack: string; genre: string };

function filterGamesSync(items: GameFilterItem[], query: string, genre: string): string[] {
  const q = query.trim().toLowerCase();
  return items
    .filter(
      (g) =>
        (genre === "All" || g.genre === genre) && (!q || g.haystack.toLowerCase().includes(q)),
    )
    .map((g) => g.slug);
}

/** Game catalog search off the main thread. Returns matching slugs. */
export async function filterGamesAsync(
  items: GameFilterItem[],
  query: string,
  genre: string,
): Promise<string[]> {
  if (items.length < 24 || !getPerfTier().canWorker) return filterGamesSync(items, query, genre);
  return runWorker<string[]>(
    "/workers/search-worker.js",
    { type: "filter-games", items, query, genre },
    () => filterGamesSync(items, query, genre),
    1200,
  );
}

export type SortRow = { id: string; ping: number };

function sortByPingSync(rows: SortRow[]): SortRow[] {
  return [...rows].sort((a, b) => a.ping - b.ping);
}

/** Lobby / leaderboard ping sort off the main thread. */
export async function sortByPingAsync(rows: SortRow[]): Promise<SortRow[]> {
  if (rows.length < 16 || !getPerfTier().canWorker) return sortByPingSync(rows);
  return runWorker<SortRow[]>(
    "/workers/search-worker.js",
    { type: "sort-ping", rows },
    () => sortByPingSync(rows),
    1000,
  );
}

/** Markdown render off the main thread for long bodies. Short bodies stay sync. */
export async function renderMarkdownAsync(text: string, syncRender: (t: string) => string): Promise<string> {
  if (text.length < 2000 || !getPerfTier().canWorker) return syncRender(text);
  return runWorker<string>(
    "/workers/markdown-worker.js",
    { type: "render", text: text.slice(0, 8000) },
    () => syncRender(text),
    1500,
  );
}

export type TelemetryTickLite = {
  t: number;
  speed?: number;
  playerX?: number;
  keys?: string[];
  reasoning?: string;
  lap?: number | null;
  traffic?: { x: number; d: number; kind?: string }[];
};

/** VCW per-second segment aggregation off the main thread. */
export async function analyzeTelemetryAsync(
  ticks: TelemetryTickLite[],
  seconds: number,
  syncAnalyze: (ticks: TelemetryTickLite[], seconds: number) => unknown,
): Promise<unknown> {
  if (ticks.length < 60 || !getPerfTier().canWorker) return syncAnalyze(ticks, seconds);
  return runWorker<unknown>(
    "/workers/telemetry-worker.js",
    { type: "segments", ticks: ticks.slice(0, 5000), seconds },
    () => syncAnalyze(ticks, seconds),
    2000,
  );
}

/** Debounce helper for search inputs (catalog, clans, docs). */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let id: ReturnType<typeof setTimeout> | null = null;
  return (...args: A) => {
    if (id) clearTimeout(id);
    id = setTimeout(() => fn(...args), ms);
  };
}
