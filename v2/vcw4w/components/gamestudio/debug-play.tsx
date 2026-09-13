"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Verdict = "pass" | "fail" | "na";

interface ChecklistItem {
  id: string;
  label: string;
  hint: string;
}

interface LoadResult {
  ok: boolean;
  ms: number | null;
  detail: string;
}

const SITE_GAMES = [
  { slug: "overtake", label: "Overtake" },
  { slug: "lastwordszombies", label: "Last Words Zombies" },
  { slug: "battlesharks2", label: "Battle Sharks 2" },
];

const CHECKLIST: ChecklistItem[] = [
  {
    id: "controls",
    label: "Controls",
    hint: "Keyboard / touch input responds on first try, no stuck keys.",
  },
  {
    id: "audio",
    label: "Audio",
    hint: "Sound starts after user gesture, mute toggle works.",
  },
  {
    id: "mobile",
    label: "Mobile layout",
    hint: "Playable at 390px width, no sideways scroll, buttons tappable.",
  },
  {
    id: "resolution",
    label: "Resolution scaling",
    hint: "Canvas fills its container at desktop and resized windows.",
  },
];

function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// DebugPlay: a guided local QA pass over a real site game (or custom URL).
// Runs real in-browser checks (fetch timing, canvas count) plus a manual
// checklist, then exports a markdown bug report. Deep headless runs happen
// in VibeCodeWorker (/vibecodeworker) — this page is the local pass.
export function DebugPlay() {
  const [gameSlug, setGameSlug] = useState(SITE_GAMES[0].slug);
  const [useCustom, setUseCustom] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [loadResult, setLoadResult] = useState<LoadResult | null>(null);
  const [loadRunning, setLoadRunning] = useState(false);
  const [canvasCount, setCanvasCount] = useState<number | null>(null);
  const [verdicts, setVerdicts] = useState<Record<string, Verdict | null>>({});
  const [notes, setNotes] = useState("");
  const [reportSaved, setReportSaved] = useState(false);

  const resolvedPath = useCustom ? customUrl.trim() : `/games/${gameSlug}`;

  const urlError = useMemo(() => {
    if (!useCustom) return null;
    if (customUrl.trim() === "") return "Enter a custom URL first.";
    try {
      const parsed = new URL(customUrl.trim());
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return "Custom URL must start with http:// or https://.";
      }
      return null;
    } catch {
      return "That URL does not parse — include http:// or https://.";
    }
  }, [useCustom, customUrl]);

  const targetReady = !useCustom || urlError === null;

  const runLoadCheck = async () => {
    if (!targetReady || loadRunning) return;
    setLoadRunning(true);
    setLoadResult(null);
    const started = performance.now();
    try {
      const response = await fetch(resolvedPath, { cache: "no-store" });
      const ms = Math.round(performance.now() - started);
      setLoadResult({
        ok: response.ok,
        ms,
        detail: response.ok
          ? `HTTP ${response.status} in ${ms} ms.`
          : `HTTP ${response.status} — the page responded with an error status.`,
      });
    } catch (error) {
      const ms = Math.round(performance.now() - started);
      setLoadResult({
        ok: false,
        ms,
        detail:
          error instanceof Error
            ? `Request failed after ${ms} ms (${error.message}). External URLs may be blocked by CORS — open the page directly instead.`
            : `Request failed after ${ms} ms.`,
      });
    } finally {
      setLoadRunning(false);
    }
  };

  const runCanvasCheck = () => {
    const count = document.querySelectorAll("canvas").length;
    setCanvasCount(count);
  };

  const setVerdict = (id: string, verdict: Verdict) => {
    setVerdicts((prev) => ({ ...prev, [id]: verdict }));
  };

  const answered = CHECKLIST.filter((item) => verdicts[item.id] != null).length;
  const stepsDone =
    answered + (loadResult !== null ? 1 : 0) + (canvasCount !== null ? 1 : 0);
  const progress = Math.round((stepsDone / (CHECKLIST.length + 2)) * 100);

  const reportReady =
    loadResult !== null && canvasCount !== null && answered === CHECKLIST.length;

  const downloadReport = () => {
    const stamp = new Date().toISOString();
    const agent =
      typeof navigator === "undefined" ? "unknown user agent" : navigator.userAgent;
    const lines = [
      `# DebugPlay QA report`,
      ``,
      `- Date: ${stamp}`,
      `- Target: ${resolvedPath}`,
      `- User agent: ${agent}`,
      ``,
      `## Automated checks`,
      ``,
      `- Page-load probe: ${
        loadResult
          ? `${loadResult.ok ? "PASS" : "FAIL"} — ${loadResult.detail}`
          : "not run"
      }`,
      `- Canvas elements on this page: ${
        canvasCount === null ? "not checked" : String(canvasCount)
      } (open the game page itself for its own count)`,
      ``,
      `## Guided checklist`,
      ``,
      ...CHECKLIST.map((item) => {
        const verdict = verdicts[item.id];
        const word =
          verdict === "pass" ? "PASS" : verdict === "fail" ? "FAIL" : verdict === "na" ? "N/A" : "UNTESTED";
        return `- ${item.label}: ${word} — ${item.hint}`;
      }),
      ``,
      `## Tester notes`,
      ``,
      notes.trim() === "" ? `_(none)_` : notes.trim(),
      ``,
      `_Generated locally by DebugPlay. Deep headless runs happen in VibeCodeWorker (/vibecodeworker)._`,
      ``,
    ];
    const slug = useCustom ? "custom" : gameSlug;
    downloadText(`debugplay-${slug}-report.md`, lines.join("\n"), "text/markdown");
    setReportSaved(true);
    window.setTimeout(() => setReportSaved(false), 4000);
  };

  return (
    <div className="grid gap-4">
      <div
        role="note"
        className="rounded-2xl border border-white/10 bg-white/[.03] p-5 text-sm leading-relaxed text-slate-300"
      >
        Deep headless runs happen in{" "}
        <Link href="/vibecodeworker" className="font-semibold text-cyan-300 hover:underline">
          VibeCodeWorker
        </Link>
        — this page does the guided local pass: real load timing, a canvas
        count, and a checklist you grade yourself.
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
        <h2 className="text-lg font-black">1 · Pick a target</h2>
        <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Game target">
          {SITE_GAMES.map((game) => (
            <button
              key={game.slug}
              type="button"
              role="radio"
              aria-checked={!useCustom && gameSlug === game.slug}
              onClick={() => {
                setUseCustom(false);
                setGameSlug(game.slug);
              }}
              className={`rounded-2xl border px-4 py-2.5 text-sm font-bold transition ${
                !useCustom && gameSlug === game.slug
                  ? "border-cyan-300/60 bg-cyan-300/10 text-cyan-200"
                  : "border-white/10 bg-black/40 text-slate-400 hover:bg-white/5"
              }`}
            >
              {game.label}
            </button>
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={useCustom}
            onClick={() => setUseCustom(true)}
            className={`rounded-2xl border px-4 py-2.5 text-sm font-bold transition ${
              useCustom
                ? "border-cyan-300/60 bg-cyan-300/10 text-cyan-200"
                : "border-white/10 bg-black/40 text-slate-400 hover:bg-white/5"
            }`}
          >
            Custom URL
          </button>
        </div>
        {useCustom ? (
          <div className="mt-4">
            <label htmlFor="debugplay-url" className="text-sm font-semibold text-slate-300">
              Custom URL (http or https)
            </label>
            <input
              id="debugplay-url"
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://example.com/game"
              aria-invalid={urlError !== null}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
            />
            {urlError ? (
              <p role="alert" className="mt-2 text-sm text-rose-300">
                {urlError}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-400">
            Game page:{" "}
            <Link
              href={`/games/${gameSlug}`}
              target="_blank"
              className="font-semibold text-cyan-300 hover:underline"
            >
              /games/{gameSlug} (opens in a new tab)
            </Link>
          </p>
        )}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
        <h2 className="text-lg font-black">2 · Run local checks</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void runLoadCheck()}
            disabled={!targetReady || loadRunning}
            className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-40"
          >
            {loadRunning ? "Probing…" : "Run page-load probe"}
          </button>
          <button
            type="button"
            onClick={runCanvasCheck}
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/10"
          >
            Count canvases on this page
          </button>
        </div>
        <div className="mt-4 space-y-2 text-sm" aria-live="polite">
          {loadResult ? (
            <p className={loadResult.ok ? "text-cyan-300" : "text-rose-300"}>
              Load probe: {loadResult.detail}
            </p>
          ) : (
            <p className="text-slate-500">
              Load probe not run yet — it times a real fetch of the target.
            </p>
          )}
          {canvasCount !== null ? (
            <p className="text-slate-300">
              Canvas count on this page: <strong>{canvasCount}</strong>. For the
              game&apos;s own count, open its page and look for the canvas the
              game renders into.
            </p>
          ) : (
            <p className="text-slate-500">
              Canvas check not run yet — open the game page in the other tab to
              eyeball its canvas while you grade the checklist.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black">3 · Guided checklist</h2>
          <p className="text-sm text-slate-400" aria-live="polite">
            {answered} of {CHECKLIST.length} graded · {progress}% complete
          </p>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="QA session progress"
        >
          <div
            className="h-full rounded-full bg-cyan-300 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <ul className="mt-4 space-y-3">
          {CHECKLIST.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-white/10 bg-black/30 p-4"
            >
              <p className="text-sm font-bold text-white">{item.label}</p>
              <p className="mt-1 text-xs text-slate-500">{item.hint}</p>
              <div
                className="mt-3 flex gap-2"
                role="radiogroup"
                aria-label={`${item.label} verdict`}
              >
                {(["pass", "fail", "na"] as Verdict[]).map((verdict) => (
                  <button
                    key={verdict}
                    type="button"
                    role="radio"
                    aria-checked={verdicts[item.id] === verdict}
                    onClick={() => setVerdict(item.id, verdict)}
                    className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                      verdicts[item.id] === verdict
                        ? verdict === "fail"
                          ? "border-rose-300/60 bg-rose-300/10 text-rose-200"
                          : "border-cyan-300/60 bg-cyan-300/10 text-cyan-200"
                        : "border-white/10 text-slate-400 hover:bg-white/5"
                    }`}
                  >
                    {verdict === "na" ? "N/A" : verdict}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <label htmlFor="debugplay-notes" className="text-sm font-semibold text-slate-300">
            Tester notes (optional — included in the report)
          </label>
          <textarea
            id="debugplay-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="What broke, on which device, steps to reproduce…"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm leading-relaxed text-white outline-none focus:border-cyan-300/60"
          />
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6" aria-live="polite">
        <h2 className="text-lg font-black">4 · Bug report</h2>
        {reportReady ? (
          <div className="mt-4">
            <p className="text-sm text-slate-300">
              Session complete — download the markdown report with results,
              timestamp, and user agent.
            </p>
            <button
              type="button"
              onClick={downloadReport}
              className="mt-4 rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
            >
              Download bug-report markdown
            </button>
            {reportSaved ? (
              <p className="mt-3 text-sm text-cyan-300">
                Report downloaded — check your downloads folder.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Finish both automated checks and grade every checklist item to
            unlock the report download.
          </p>
        )}
      </div>
    </div>
  );
}
