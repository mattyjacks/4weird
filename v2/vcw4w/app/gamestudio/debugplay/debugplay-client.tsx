"use client";

import { useRef, useState } from "react";

type BugReport = {
  id: string;
  severity: string;
  title: string;
  description: string;
  suggestedFixDiff?: string;
};

type DebugPlaySuccess = {
  success: true;
  bugs: BugReport[];
  nextInput: string;
  source: "ai" | "heuristic";
  stuck: boolean;
};

type Phase = "idle" | "working" | "done" | "error";

const SLUG_RE = /^[a-z0-9-]{1,64}$/;
const MAX_FRAME_CHARS = 400_000;

function isBugReport(value: unknown): value is BugReport {
  if (typeof value !== "object" || value === null) return false;
  const b = value as Record<string, unknown>;
  return (
    typeof b.id === "string" &&
    typeof b.severity === "string" &&
    typeof b.title === "string" &&
    typeof b.description === "string" &&
    (b.suggestedFixDiff === undefined || typeof b.suggestedFixDiff === "string")
  );
}

function djb2Hex(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image file."));
    img.src = url;
  });
}

/** Downscale an uploaded screenshot to a ≤640px JPEG data URL for the API. */
async function screenshotToFrame(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const scale = Math.min(1, 640 / Math.max(img.naturalWidth, img.naturalHeight, 1));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser.");
    ctx.drawImage(img, 0, 0, width, height);
    let quality = 0.72;
    let url = canvas.toDataURL("image/jpeg", quality);
    while (url.length > MAX_FRAME_CHARS && quality > 0.3) {
      quality -= 0.15;
      url = canvas.toDataURL("image/jpeg", quality);
    }
    if (url.length > MAX_FRAME_CHARS) {
      throw new Error("That screenshot is too large even downscaled — try a smaller crop.");
    }
    return url;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Render a report card from slug + notes so the analyzer gets a real frame. */
function notesToFrame(slug: string, notes: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, 640, 360);
  ctx.fillStyle = "#34d399";
  ctx.font = "bold 26px system-ui, sans-serif";
  ctx.fillText("DebugPlay report", 28, 52);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 20px system-ui, sans-serif";
  ctx.fillText(slug.slice(0, 40), 28, 88);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "16px system-ui, sans-serif";
  const words = notes.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > 52) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
    if (lines.length >= 8) break;
  }
  if (line && lines.length < 9) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l.slice(0, 56), 28, 124 + i * 26));
  return canvas.toDataURL("image/png");
}

function severityBadge(severity: string): string {
  const s = severity.toLowerCase();
  if (s.includes("crit") || s.includes("high") || s.includes("block")) {
    return "border-red-400/40 bg-red-400/10 text-red-300";
  }
  if (s.includes("med") || s.includes("warn")) {
    return "border-amber-400/40 bg-amber-400/10 text-amber-300";
  }
  return "border-sky-400/40 bg-sky-400/10 text-sky-300";
}

function hintForStatus(status: number, serverError: string): string {
  if (status === 401) {
    return "Sign in (or connect a bot key) to run the live analyzer, then try again.";
  }
  if (status === 402) {
    return "That analysis needs one action-step of Vibe Coin balance — top up and retry.";
  }
  if (status === 429) {
    return "Throttled — wait a minute before sending another frame.";
  }
  if (status === 503) {
    return "Backend is not configured on this deploy right now.";
  }
  return serverError || "The analyzer rejected the request.";
}

export function DebugPlayClient() {
  const [slug, setSlug] = useState("");
  const [notes, setNotes] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DebugPlaySuccess | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const slugValid = SLUG_RE.test(slug.trim());
  const notesValid = notes.trim().length >= 4;
  const canSubmit = slugValid && notesValid && phase !== "working";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setPhase("working");
    setError(null);
    setResult(null);
    try {
      const cleanSlug = slug.trim();
      const snippet = notes.trim().slice(0, 8000);
      const file = fileRef.current?.files?.[0];
      const frame =
        file && file.type.startsWith("image/")
          ? await screenshotToFrame(file)
          : notesToFrame(cleanSlug, snippet);
      const response = await fetch("/api/vcw/debug-play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frame,
          gameSlug: cleanSlug,
          codeSnippet: snippet,
          frameHash: djb2Hex(frame),
          timestampSeconds: 0,
          recentDecisions: [],
        }),
      });
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        throw new Error(`Analyzer returned an unreadable response (HTTP ${response.status}).`);
      }
      if (!response.ok || typeof body !== "object" || body === null) {
        throw new Error(hintForStatus(response.status, `HTTP ${response.status}`));
      }
      const record = body as Record<string, unknown>;
      if (record.success !== true) {
        const serverError = typeof record.error === "string" ? record.error : "";
        throw new Error(hintForStatus(response.status, serverError));
      }
      const bugs = Array.isArray(record.bugs) ? record.bugs.filter(isBugReport) : [];
      const nextInput = typeof record.nextInput === "string" ? record.nextInput : "";
      const source = record.source === "ai" ? "ai" : "heuristic";
      const stuck = record.stuck === true;
      setResult({ success: true, bugs, nextInput, source, stuck });
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong sending the frame.");
      setPhase("error");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-white/[.03] p-6"
      >
        <label htmlFor="dp-slug" className="text-sm font-bold text-slate-200">
          Game slug
        </label>
        <input
          id="dp-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          maxLength={64}
          placeholder="my-weird-game"
          autoComplete="off"
          className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-white placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none"
        />
        <p className="mt-2 text-xs text-slate-400">
          Lowercase letters, numbers, dashes only (matches the live route).
        </p>

        <label htmlFor="dp-notes" className="mt-6 block text-sm font-bold text-slate-200">
          What should the analyzer look at?
        </label>
        <textarea
          id="dp-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          maxLength={8000}
          placeholder="e.g. Player clips through the right wall on level 2 after double-jumping near the checkpoint…"
          className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none"
        />

        <label htmlFor="dp-shot" className="mt-6 block text-sm font-bold text-slate-200">
          Screenshot <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          ref={fileRef}
          id="dp-shot"
          type="file"
          accept="image/*"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          className="mt-2 w-full text-sm text-slate-300 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-white/20"
        />
        <p className="mt-2 text-xs text-slate-400">
          {fileName
            ? `Attached: ${fileName} — downscaled to ≤640px in your browser before sending.`
            : "No screenshot? We render your notes as a report-card frame so the analyzer still gets a real image. Nothing is uploaded anywhere except the single live analysis call."}
        </p>

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-6 w-full rounded-full bg-emerald-400 px-7 py-3.5 font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {phase === "working" ? "Analyzing frame…" : "Analyze frame"}
        </button>
        {phase === "working" && (
          <p role="status" className="mt-3 text-center text-sm text-slate-400">
            Contacting the live analyzer — first runs can take a few seconds…
          </p>
        )}
      </form>

      <div
        aria-live="polite"
        className="rounded-2xl border border-white/10 bg-white/[.03] p-6"
      >
        {phase === "idle" && (
          <p className="text-sm text-slate-400">
            Results land here: bug cards with severity, the suggested next
            input, and whether the fix came from AI or the offline heuristic.
          </p>
        )}
        {phase === "working" && (
          <p role="status" className="text-sm text-slate-400">
            Working — holding the frame, waiting on{" "}
            <code className="font-mono text-emerald-300">POST /api/vcw/debug-play</code>…
          </p>
        )}
        {phase === "error" && (
          <div className="rounded-xl border border-red-400/40 bg-red-400/10 p-4">
            <h2 className="font-bold text-red-200">Analysis did not run</h2>
            <p className="mt-1 text-sm text-red-200/90">{error}</p>
            <p className="mt-2 text-xs text-slate-400">
              Your slug, notes, and screenshot never left this page except for
              that one attempt — fix the note above and retry.
            </p>
          </div>
        )}
        {phase === "done" && result && (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 font-mono text-xs font-bold ${
                  result.source === "ai"
                    ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300"
                    : "border-slate-400/40 bg-slate-400/10 text-slate-300"
                }`}
              >
                source: {result.source}
              </span>
              {result.stuck && (
                <span className="rounded-full border border-amber-400/50 bg-amber-400/10 px-3 py-1 font-mono text-xs font-bold text-amber-300">
                  soft-lock guard tripped — recovery input shown
                </span>
              )}
            </div>
            <h2 className="mt-4 text-sm font-bold uppercase tracking-widest text-slate-300">
              Next input
            </h2>
            <code className="mt-2 block rounded-xl bg-slate-950 p-4 font-mono text-sm text-emerald-200">
              {result.nextInput || "(no input suggested)"}
            </code>
            <h2 className="mt-6 text-sm font-bold uppercase tracking-widest text-slate-300">
              Bugs ({result.bugs.length})
            </h2>
            {result.bugs.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">
                Clean frame — the analyzer reported zero bugs.
              </p>
            ) : (
              <ul className="mt-3 grid gap-3">
                {result.bugs.map((bug) => (
                  <li
                    key={bug.id}
                    className="rounded-xl border border-white/10 bg-slate-950 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 font-mono text-xs font-bold ${severityBadge(bug.severity)}`}
                      >
                        {bug.severity}
                      </span>
                      <span className="font-mono text-xs text-slate-500">{bug.id}</span>
                    </div>
                    <p className="mt-2 font-bold">{bug.title}</p>
                    <p className="mt-1 text-sm text-slate-300">{bug.description}</p>
                    {bug.suggestedFixDiff && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-semibold text-emerald-300">
                          Suggested fix diff
                        </summary>
                        <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-black/50 p-3 font-mono text-xs leading-relaxed text-slate-200">
                          {bug.suggestedFixDiff}
                        </pre>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
