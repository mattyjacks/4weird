"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEBUG_PLAY_DOWNSAMPLE } from "@/lib/vcw-debug-play";
import type { BugReport } from "@/lib/vcw-debug-play";

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
        const res = await fetch("/api/vcw/debug-play", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            frame: dataUrl,
            gameSlug: slug,
            codeSnippet: codeSnippet.trim() ? codeSnippet.trim().slice(0, 8000) : undefined,
            frameHash: hashFrame(dataUrl),
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
          frameHash: hashFrame(dataUrl),
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

  const worstSeverity = (bugs: BugReport[]): string | null => {
    if (bugs.some((b) => b.severity === "critical")) return "critical";
    if (bugs.some((b) => b.severity === "warning")) return "warning";
    if (bugs.length > 0) return "cosmetic";
    return null;
  };

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

      {/* Frame timeline scrubber — analyzed frames with bug flags. */}
      {frames.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Frame timeline</p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
            {frames.map((f) => {
              const worst = worstSeverity(f.bugs);
              const dot =
                worst === "critical"
                  ? "bg-red-500"
                  : worst === "warning"
                    ? "bg-amber-400"
                    : worst === "cosmetic"
                      ? "bg-slate-400"
                      : "bg-emerald-400";
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedId(f.id)}
                  title={`${f.atSeconds}s · ${f.bugs.length} bug(s) · next: ${f.nextInput}`}
                  className={`relative shrink-0 overflow-hidden rounded-lg border ${
                    selected?.id === f.id ? "border-cyan-300" : "border-white/10"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.thumbUrl} alt={`Frame at ${f.atSeconds}s`} className="h-16 w-28 object-cover" />
                  <span className={`absolute right-1 top-1 h-2.5 w-2.5 rounded-full ${dot}`} />
                  {f.stuck && (
                    <span className="absolute bottom-1 left-1 rounded bg-amber-500/90 px-1 text-[10px] font-bold text-black">
                      STUCK
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected-frame report. */}
      {selected ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-mono text-slate-400">t={selected.atSeconds}s</span>
            <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-cyan-200">
              next: {selected.nextInput}
            </span>
            <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-slate-300">
              source: {selected.source}
            </span>
            {selected.stuck && (
              <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300">
                Possible soft-lock — repeated input, static frame
              </span>
            )}
          </div>
          {selected.bugs.length === 0 ? (
            <p className="mt-3 text-sm text-emerald-300">No visual bugs detected in this frame.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {selected.bugs.map((bug) => (
                <li key={bug.id} className="rounded-lg border border-white/10 bg-black/30 p-3">
                  <p className="text-sm font-bold text-white">
                    <span
                      className={`mr-2 inline-block rounded px-1.5 py-0.5 text-[11px] uppercase ${
                        bug.severity === "critical"
                          ? "bg-red-500/20 text-red-200"
                          : bug.severity === "warning"
                            ? "bg-amber-500/20 text-amber-200"
                            : "bg-white/10 text-slate-300"
                      }`}
                    >
                      {bug.severity}
                    </span>
                    {bug.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">{bug.description}</p>
                  {bug.suggestedFixDiff && (
                    <div className="mt-2">
                      <pre className="max-h-40 overflow-auto rounded bg-black/60 p-2 font-mono text-xs text-emerald-200">
                        {bug.suggestedFixDiff}
                      </pre>
                      <button
                        type="button"
                        onClick={() => sendFix(bug)}
                        className="mt-2 rounded-lg border border-cyan-300/40 px-3 py-1.5 text-xs font-bold text-cyan-200 hover:bg-cyan-500/10"
                      >
                        Send fix to editor (code:fix-available)
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p role="status" className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-slate-500">
          Attach a gameplay screenshot to run the first visual analysis. Frames are downsampled to{" "}
          {DEBUG_PLAY_DOWNSAMPLE.width}×{DEBUG_PLAY_DOWNSAMPLE.height} in-browser before upload.
        </p>
      )}
    </div>
  );
}
