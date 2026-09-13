"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { DEBUG_PLAY_DOWNSAMPLE } from "@/lib/vcw-debug-play";
import type { BugReport } from "@/lib/vcw-debug-play";

// Heavy viewport chunks stay out of the initial bundle — the form/buttons
// render first, and the timeline + report hydrate only once frames exist.
const LazyTimeline = dynamic(
  () => import("./debug-play-timeline").then((m) => m.DebugPlayTimeline),
  { ssr: false, loading: () => <TimelineFallback /> },
);
const LazyReport = dynamic(
  () => import("./debug-play-report").then((m) => m.DebugPlayReport),
  { ssr: false, loading: () => <ReportFallback /> },
);

function TimelineFallback() {
  return (
    <p role="status" className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-500">
      Loading frame timeline…
    </p>
  );
}

function ReportFallback() {
  return (
    <p role="status" className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-500">
      Loading frame report…
    </p>
  );
}

/**
 * DebugPlay viewport (Remastery Feature 03, §3.3) — headless game-tester
 * surface with visual AI bug analysis.
 *
 * Flow a reviewer can trace:
 *   1. Frame in: attach a gameplay screenshot (or re-send the current one
 *      on the §3.3 cadence — 1 frame per 2.0 s while Live is on).
 *   2. Downsample: the frame is fit inside 640x360 on a canvas before it
 *      ever leaves the browser (spec tip 1 — preserves bug signals,
 *      cuts token/latency cost). Targets come from
 *      `DEBUG_PLAY_DOWNSAMPLE` in `@/lib/vcw-debug-play`.
 *   3. Analyze: POSTs to `/api/vcw/debug-play`, which runs
 *      `analyzeGameFrameWithAI` (OpenRouter multi-modal LLM, fail-open
 *      heuristic fallback) plus the last-5-decision loop guard (spec
 *      tip 2 — same action + unchanged frame hash ⇒ soft-lock).
 *   4. Fix event: any bug carrying `suggestedFixDiff` gets a one-click
 *      "Send to editor" button that emits `code:fix-available` on the
 *      cross-tool interop bus (spec tip 3 — Monaco shows Accept AI Fix).
 *   5. Scrubber: every analyzed frame lands on a timeline with
 *      severity-flag dots; click any frame to inspect its bugs.
 *
 * Client-guarded (no SSR canvas access), fail-open (API errors surface
 * as a banner, never a bricked page), no secrets (same-origin route
 * call only — the OpenRouter key never touches this component).
 */

const FRAME_INTERVAL_MS = 2000;
const LOOP_WINDOW = 5;
const SLUG_RE = /^[a-z0-9-]{1,64}$/;

type AnalyzedFrame = {
  id: string;
  atSeconds: number;
  thumbUrl: string;
  frameHash: string;
  bugs: BugReport[];
  nextInput: string;
  source: "ai" | "heuristic";
  stuck: boolean;
};

function makeId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `dpv-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
  }
}

/** djb2 frame hash — lets the server loop-guard detect static frames. */
function hashFrame(dataUrl: string): string {
  let h = 5381;
  for (let i = 0; i < dataUrl.length; i += 1) {
    h = ((h << 5) + h + dataUrl.charCodeAt(i)) | 0;
  }
  return `djb2-${(h >>> 0).toString(16)}`;
}

/**
 * SPEED-06: defer non-critical work to idle so the first paint never waits
 * on hashing/analysis bookkeeping. requestIdleCallback with a setTimeout
 * fallback; server-safe (no window ⇒ run on next tick).
 */
function scheduleIdleTask(cb: () => void, timeoutMs = 1500): () => void {
  try {
    const w = globalThis as unknown as {
      requestIdleCallback?: (c: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(cb, { timeout: timeoutMs });
      return () => {
        try {
          w.cancelIdleCallback?.(id);
        } catch {
          /* fail-open */
        }
      };
    }
  } catch {
    /* fall through to setTimeout */
  }
  const t = setTimeout(cb, 0);
  return () => clearTimeout(t);
}

// Shared hash worker, created once and reused across every frame (SPEED-06
// worker reuse). Module-level so Live re-sends never re-spawn it. Falls
// back to the sync djb2 above when Workers are unavailable.
let sharedHashWorker: Worker | null = null;
let hashWorkerFailed = false;

function getSharedHashWorker(): Worker | null {
  if (hashWorkerFailed) return null;
  if (sharedHashWorker) return sharedHashWorker;
  try {
    const W = globalThis as unknown as { Worker?: typeof Worker };
    if (typeof W.Worker !== "function") return null;
    const src = `onmessage=(e)=>{const s=String(e.data??"");let h=5381;for(let i=0;i<s.length;i++){h=(((h<<5)+h+s.charCodeAt(i))|0)}postMessage("djb2-"+(h>>>0).toString(16))};`;
    sharedHashWorker = new W.Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
    return sharedHashWorker;
  } catch {
    hashWorkerFailed = true;
    return null;
  }
}

/** Off-main-thread djb2 via the shared worker; sync fallback on failure. */
function hashFrameAsync(dataUrl: string): Promise<string> {
  const worker = getSharedHashWorker();
  if (!worker) return Promise.resolve(hashFrame(dataUrl));
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        resolve(hashFrame(dataUrl));
      }
    }, 2000);
    const onMsg = (e: MessageEvent) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      worker.removeEventListener("message", onMsg as EventListener);
      resolve(typeof e.data === "string" ? e.data : hashFrame(dataUrl));
    };
    const onErr = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      hashWorkerFailed = true;
      resolve(hashFrame(dataUrl));
    };
    worker.addEventListener("message", onMsg as EventListener, { once: true });
    worker.addEventListener("error", onErr as EventListener, { once: true });
    try {
      worker.postMessage(dataUrl);
    } catch {
      onErr();
    }
  });
}

/**
 * Mirror of the lib-side `emitFixAvailable` for browser context:
 * publishes `code:fix-available` on the cross-tool interop bus.
 * Fail-open — returns false (no throw) when no bus is present.
 */
function emitFixToEditor(bugId: string, gameSlug: string, diff: string): boolean {
  try {
    const bus = (
      globalThis as unknown as {
        interopBus?: { emit?: (name: string, payload: unknown) => void };
      }
    ).interopBus;
    if (!bus || typeof bus.emit !== "function") return false;
    bus.emit("code:fix-available", { code: "fix-available", bugId, gameSlug, diff });
    return true;
  } catch {
    return false;
  }
}

export function DebugPlayViewport({ initialSlug = "" }: { initialSlug?: string }) {
  const [gameSlug, setGameSlug] = useState(initialSlug);
  const [codeSnippet, setCodeSnippet] = useState("");
  const [frames, setFrames] = useState<AnalyzedFrame[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const liveTimer = useRef<number | null>(null);
  const startedAt = useRef<number>(0);
  // Kept outside render so each POST carries the trailing decisions.
  const decisionsRef = useRef<string[]>([]);
  const pendingRef = useRef<string | null>(null);
  pendingRef.current = pendingUrl;

  const selected = frames.find((f) => f.id === selectedId) ?? frames[frames.length - 1] ?? null;

  const analyzeDataUrl = useCallback(
    async (dataUrl: string) => {
      const slug = gameSlug.trim().toLowerCase();
      if (!SLUG_RE.test(slug)) {
        setError("Enter a game slug (lowercase letters, digits, dashes).");
        return;
      }
      setBusy(true);
      setError(null);
      const atSeconds = startedAt.current === 0 ? 0 : (Date.now() - startedAt.current) / 1000;
      try {
        // Hash off the main thread on the shared worker; reused for both
        // the POST body and the stored record (no double scan).
        const frameHash = await hashFrameAsync(dataUrl);
        const res = await fetch("/api/vcw/debug-play", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            frame: dataUrl,
            gameSlug: slug,
            codeSnippet: codeSnippet.trim() ? codeSnippet.trim().slice(0, 8000) : undefined,
            frameHash,
            timestampSeconds: Math.round(atSeconds * 10) / 10,
            recentDecisions: decisionsRef.current.slice(-LOOP_WINDOW),
          }),
        });
        const body = (await res.json().catch(() => null)) as {
          success?: boolean;
          error?: string;
          bugs?: BugReport[];
          nextInput?: string;
          source?: "ai" | "heuristic";
          stuck?: boolean;
        } | null;
        if (!res.ok || !body || body.success === false) {
          throw new Error(body?.error || `Analyzer HTTP ${res.status}`);
        }
        const nextInput = typeof body.nextInput === "string" ? body.nextInput : "idle";
        decisionsRef.current = [...decisionsRef.current, nextInput].slice(-LOOP_WINDOW);
        const record: AnalyzedFrame = {
          id: makeId(),
          atSeconds: Math.round(atSeconds * 10) / 10,
          thumbUrl: dataUrl,
          frameHash,
          bugs: Array.isArray(body.bugs) ? body.bugs : [],
          nextInput,
          source: body.source === "ai" ? "ai" : "heuristic",
          stuck: body.stuck === true,
        };
        setFrames((prev) => [...prev.slice(-29), record]);
        setSelectedId(record.id);
        if (startedAt.current === 0) startedAt.current = Date.now();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Frame analysis failed.");
      } finally {
        setBusy(false);
      }
    },
    [codeSnippet, gameSlug],
  );

  /** Downsample an <img> into the 640x360 box, then analyze the data URL. */
  const ingestImage = useCallback(
    (img: HTMLImageElement) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const scale = Math.min(
        1,
        DEBUG_PLAY_DOWNSAMPLE.width / img.naturalWidth,
        DEBUG_PLAY_DOWNSAMPLE.height / img.naturalHeight,
      );
      const w = Math.max(1, Math.floor(img.naturalWidth * scale));
      const h = Math.max(1, Math.floor(img.naturalHeight * scale));
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/png");
      setPendingUrl(dataUrl);
      void analyzeDataUrl(dataUrl);
    },
    [analyzeDataUrl],
  );

  const onFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        ingestImage(img);
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        setError("Could not read that image file.");
      };
      img.src = url;
    },
    [ingestImage],
  );

  // Live cadence: re-send the current frame every 2.0 s so the server-side
  // last-5 loop guard can trip on a genuinely static game (§3.3 tip 2).
  useEffect(() => {
    if (!live) {
      if (liveTimer.current !== null) {
        window.clearInterval(liveTimer.current);
        liveTimer.current = null;
      }
      return;
    }
    if (liveTimer.current !== null) return;
    liveTimer.current = window.setInterval(() => {
      const current = pendingRef.current;
      if (current && !busy) void analyzeDataUrl(current);
    }, FRAME_INTERVAL_MS);
    return () => {
      if (liveTimer.current !== null) {
        window.clearInterval(liveTimer.current);
        liveTimer.current = null;
      }
    };
  }, [live, busy, analyzeDataUrl]);

  // Non-critical notice auto-clear rides idle so it never contends with
  // frame ingest on the main thread.
  useEffect(() => {
    if (!notice) return;
    const cancel = scheduleIdleTask(() => {
      setTimeout(() => setNotice(null), 8000);
    });
    return cancel;
  }, [notice]);

  const sendFix = useCallback(
    (bug: BugReport) => {
      if (!bug.suggestedFixDiff) return;
      const ok = emitFixToEditor(bug.id, gameSlug.trim().toLowerCase() || "unknown-game", bug.suggestedFixDiff);
      setNotice(
        ok
          ? `Fix for "${bug.title}" sent to the editor (code:fix-available).`
          : "No editor bus is listening — copy the diff below into your file instead.",
      );
    },
    [gameSlug],
  );

  // worstSeverity lives in the lazy timeline chunk now (single owner).

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Game slug
          <input
            value={gameSlug}
            onChange={(e) => setGameSlug(e.target.value)}
            placeholder="gravegain3d"
            spellCheck={false}
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white placeholder:text-slate-600"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Code snippet (optional — sent with the frame)
          <input
            value={codeSnippet}
            onChange={(e) => setCodeSnippet(e.target.value)}
            placeholder="movePlayer(dx) { … }"
            spellCheck={false}
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white placeholder:text-slate-600"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-black hover:bg-cyan-400 disabled:opacity-40"
        >
          {busy ? "Analyzing…" : "Attach gameplay frame"}
        </button>
        <button
          type="button"
          onClick={() => setLive((v) => !v)}
          disabled={!pendingUrl}
          title="Re-send the current frame every 2.0 s (headless cadence)"
          className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-cyan-200 disabled:opacity-40"
        >
          {live ? "⏸ Pause live capture (1 / 2 s)" : "▶ Live capture (1 frame / 2 s)"}
        </button>
        {frames.length > 0 && (
          <span className="text-xs text-slate-500">
            {frames.length} frame{frames.length === 1 ? "" : "s"} · decisions kept:{" "}
            {decisionsRef.current.join(", ") || "none yet"}
          </span>
        )}
      </div>

      {/* Hidden work canvas for the 640x360 downsample (never SSR-touched). */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {error && (
        <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg border border-cyan-300/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
          {notice}
        </p>
      )}

      {/* Frame timeline scrubber — lazy chunk, mounts only once frames exist. */}
      {frames.length > 0 && (
        <Suspense fallback={<TimelineFallback />}>
          <LazyTimeline frames={frames} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
        </Suspense>
      )}

      {/* Selected-frame report — lazy chunk (heaviest DOM: diff <pre> blocks). */}
      {selected ? (
        <Suspense fallback={<ReportFallback />}>
          <LazyReport selected={selected} gameSlug={gameSlug} onSendFix={sendFix} />
        </Suspense>
      ) : (
        <p role="status" className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-slate-500">
          Attach a gameplay screenshot to run the first visual analysis. Frames are downsampled to{" "}
          {DEBUG_PLAY_DOWNSAMPLE.width}×{DEBUG_PLAY_DOWNSAMPLE.height} in-browser before upload.
        </p>
      )}
    </div>
  );
}
