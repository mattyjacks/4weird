"use client";

/**
 * components/studio/video/video-nle-timeline.tsx — multi-track NLE timeline (DS-REMASTER-W3-WEB1).
 *
 * Playhead drag on the ruler (pointer capture), snap-to-edge, zoom via pxPerSec
 * prop, per-track clip blocks, select + razor-split at the playhead.
 * Pure presentational client component: all browser APIs live in handlers only.
 */

import { useRef, useState } from "react";
import type { NleClipKind, NleTimeline } from "./video-nle-types";

interface VideoNleTimelineProps {
  timeline: NleTimeline;
  playheadSec: number;
  pxPerSec: number;
  snap: boolean;
  selectedClipId: string | null;
  onPlayheadChange: (sec: number) => void;
  onSelectClip: (clipId: string | null) => void;
  onSplitClip: (trackId: string, clipId: string) => void;
}

const KIND_STYLES: Record<NleClipKind, string> = {
  gameplay: "bg-cyan-600/80 border-cyan-300",
  blender: "bg-violet-600/80 border-violet-300",
  generated: "bg-fuchsia-600/80 border-fuchsia-300",
  music: "bg-emerald-700/80 border-emerald-300",
  voiceover: "bg-amber-700/80 border-amber-300",
};

const SNAP_TOLERANCE_SEC = 0.25;

function formatTime(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const rest = (s - m * 60).toFixed(1).padStart(4, "0");
  return `${m}:${rest}`;
}

export function VideoNleTimeline(props: VideoNleTimelineProps) {
  const {
    timeline,
    playheadSec,
    pxPerSec,
    snap,
    selectedClipId,
    onPlayheadChange,
    onSelectClip,
    onSplitClip,
  } = props;
  const rulerRef = useRef<HTMLDivElement | null>(null);
  const [scrubbing, setScrubbing] = useState(false);

  const laneWidth = Math.max(320, timeline.durationSec * pxPerSec);

  function collectSnapEdges(): number[] {
    const edges: number[] = [0, timeline.durationSec];
    for (const track of timeline.tracks) {
      for (const clip of track.clips) {
        edges.push(clip.startSec, clip.startSec + clip.durationSec);
      }
    }
    return edges;
  }

  function secFromClientX(clientX: number): number {
    const el = rulerRef.current;
    if (!el) return playheadSec;
    const rect = el.getBoundingClientRect();
    let sec = (clientX - rect.left) / pxPerSec;
    sec = Math.min(Math.max(sec, 0), timeline.durationSec);
    if (snap) {
      for (const edge of collectSnapEdges()) {
        if (Math.abs(edge - sec) <= SNAP_TOLERANCE_SEC) {
          sec = edge;
          break;
        }
      }
    }
    return sec;
  }

  function handleRulerPointerDown(e: React.PointerEvent<HTMLDivElement>): void {
    e.currentTarget.setPointerCapture(e.pointerId);
    setScrubbing(true);
    onPlayheadChange(secFromClientX(e.clientX));
  }

  function handleRulerPointerMove(e: React.PointerEvent<HTMLDivElement>): void {
    if (!scrubbing) return;
    onPlayheadChange(secFromClientX(e.clientX));
  }

  function handleRulerPointerUp(): void {
    setScrubbing(false);
  }

  const ticks: number[] = [];
  const step = pxPerSec >= 40 ? 1 : pxPerSec >= 16 ? 5 : 10;
  for (let t = 0; t <= timeline.durationSec; t += step) ticks.push(t);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
        <span className="font-mono text-cyan-300">{formatTime(playheadSec)}</span>
        <span className="text-slate-500">/</span>
        <span className="font-mono">{formatTime(timeline.durationSec)}</span>
        <span className="ml-auto text-slate-400">
          Drag the ruler to scrub
          {snap ? " · snap on" : " · snap off"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <div style={{ width: laneWidth }}>
          <div
            ref={rulerRef}
            role="slider"
            aria-label="Playhead position"
            aria-valuemin={0}
            aria-valuemax={timeline.durationSec}
            aria-valuenow={Number(playheadSec.toFixed(2))}
            tabIndex={0}
            onPointerDown={handleRulerPointerDown}
            onPointerMove={handleRulerPointerMove}
            onPointerUp={handleRulerPointerUp}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") onPlayheadChange(Math.max(0, playheadSec - 0.5));
              if (e.key === "ArrowRight")
                onPlayheadChange(Math.min(timeline.durationSec, playheadSec + 0.5));
            }}
            className="relative h-8 cursor-ew-resize touch-none select-none rounded bg-slate-800"
          >
            {ticks.map((t) => (
              <span
                key={t}
                style={{ left: t * pxPerSec }}
                className="absolute top-0 h-full border-l border-slate-700 pl-1 font-mono text-[10px] leading-8 text-slate-500"
              >
                {t}s
              </span>
            ))}
            <span
              style={{ left: playheadSec * pxPerSec }}
              className="absolute top-0 h-full w-0.5 bg-red-400"
            />
          </div>

          <div className="mt-2 space-y-2">
            {timeline.tracks.map((track) => (
              <div key={track.id} className="flex items-stretch gap-2">
                <div className="w-24 shrink-0 rounded bg-slate-800 px-2 py-2 text-[11px] font-bold text-slate-300">
                  {track.label}
                </div>
                <div className="relative h-12 flex-1 rounded bg-slate-950/60">
                  {track.clips.map((clip) => {
                    const selected = clip.id === selectedClipId;
                    return (
                      <button
                        key={clip.id}
                        type="button"
                        title={`${clip.label} — click to select, double-click to razor-split at playhead`}
                        onClick={() => onSelectClip(clip.id)}
                        onDoubleClick={() => onSplitClip(track.id, clip.id)}
                        style={{
                          left: clip.startSec * pxPerSec,
                          width: Math.max(8, clip.durationSec * pxPerSec),
                        }}
                        className={`absolute top-1 h-10 overflow-hidden rounded border px-1 text-left text-[10px] font-semibold text-white ${
                          KIND_STYLES[clip.kind]
                        } ${selected ? "ring-2 ring-red-400" : ""}`}
                      >
                        <span className="block truncate">{clip.label}</span>
                        <span className="block font-mono text-[9px] opacity-80">
                          {formatTime(clip.durationSec)}
                        </span>
                      </button>
                    );
                  })}
                  <span
                    style={{ left: playheadSec * pxPerSec }}
                    className="pointer-events-none absolute top-0 h-full w-px bg-red-400/80"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
