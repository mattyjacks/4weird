"use client";

import type { BugReport } from "@/lib/vcw-debug-play";

export type DebugPlayTimelineFrame = {
  id: string;
  atSeconds: number;
  thumbUrl: string;
  bugs: BugReport[];
  nextInput: string;
  stuck: boolean;
};

function worstSeverity(bugs: BugReport[]): string | null {
  if (bugs.some((b) => b.severity === "critical")) return "critical";
  if (bugs.some((b) => b.severity === "warning")) return "warning";
  if (bugs.length > 0) return "cosmetic";
  return null;
}

/**
 * Lazy timeline chunk for DebugPlayViewport — split out so the initial
 * viewport render (form + buttons) never pays for the thumbnail scrubber
 * until at least one frame exists. Loaded via next/dynamic (ssr: false).
 */
export function DebugPlayTimeline({
  frames,
  selectedId,
  onSelect,
}: {
  frames: DebugPlayTimelineFrame[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (frames.length === 0) return null;
  return (
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
              onClick={() => onSelect(f.id)}
              title={`${f.atSeconds}s · ${f.bugs.length} bug(s) · next: ${f.nextInput}`}
              className={`relative shrink-0 overflow-hidden rounded-lg border ${
                selectedId === f.id ? "border-cyan-300" : "border-white/10"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.thumbUrl}
                alt={`Frame at ${f.atSeconds}s`}
                className="h-16 w-28 object-cover"
                loading="lazy"
                decoding="async"
              />
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
  );
}
