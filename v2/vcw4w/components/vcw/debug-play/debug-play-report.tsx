"use client";

import type { BugReport } from "@/lib/vcw-debug-play";

export type DebugPlayReportFrame = {
  id: string;
  atSeconds: number;
  bugs: BugReport[];
  nextInput: string;
  source: "ai" | "heuristic";
  stuck: boolean;
};

/**
 * Lazy report chunk for DebugPlayViewport — the per-frame bug list (with
 * diff <pre> blocks) is the heaviest DOM in the viewport, so it loads via
 * next/dynamic (ssr: false) only once a frame is selected. Fail-open:
 * renders the same empty-state the viewport used to inline.
 */
export function DebugPlayReport({
  selected,
  gameSlug,
  onSendFix,
}: {
  selected: DebugPlayReportFrame | null;
  gameSlug: string;
  onSendFix: (bug: BugReport) => void;
}) {
  void gameSlug;
  if (!selected) {
    return (
      <p
        role="status"
        className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-slate-500"
      >
        Attach a gameplay screenshot to run the first visual analysis.
      </p>
    );
  }
  return (
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
                    onClick={() => onSendFix(bug)}
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
  );
}
