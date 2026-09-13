"use client";

/**
 * Media Mogul multi-track timeline (remastery README §3.1, Wave 3).
 *
 * Playhead drag, split/razor at playhead, clip drag-to-move, snap toggle
 * (grid seconds + clip edges), zoom. Controlled component: all state lives
 * in the parent `TimelineState`, this view only translates pointer
 * geometry into `onSeek` / `onTimelineChange` calls.
 *
 * Hydration-safe: pointer math runs in handlers only; no browser globals
 * are read during render.
 */

import React, { useCallback, useRef, useState } from "react";
import {
  MAX_ZOOM_PX_PER_SEC,
  MIN_ZOOM_PX_PER_SEC,
  SNAP_THRESHOLD_SECONDS,
  clampTime,
  newClipId,
  timelineEndSeconds,
  type TimelineState,
  type VideoClip,
} from "@/types/studio-video";

interface VideoTimelineProps {
  timeline: TimelineState;
  onTimelineChange: (next: TimelineState) => void;
  onSeek: (timeSeconds: number) => void;
}

function snapTime(raw: number, timeline: TimelineState): number {
  if (!timeline.snapToGrid) return clampTime(raw, timeline.totalDurationSeconds);
  const candidates: number[] = [0, Math.round(raw)];
  for (const clip of timeline.clips) {
    candidates.push(clip.startOffsetSeconds);
    candidates.push(clip.startOffsetSeconds + clip.durationSeconds);
  }
  let best = raw;
  for (const candidate of candidates) {
    if (
      Math.abs(candidate - raw) <= SNAP_THRESHOLD_SECONDS &&
      Math.abs(candidate - raw) < Math.abs(best - raw)
    ) {
      best = candidate;
    }
  }
  return clampTime(best, timeline.totalDurationSeconds);
}

function splitClipAtPlayhead(timeline: TimelineState): TimelineState | null {
  const selectedId = timeline.selectedClipId;
  if (!selectedId) return null;
  const clip = timeline.clips.find((c) => c.id === selectedId);
  if (!clip) return null;
  const playhead = timeline.currentTimeSeconds;
  if (
    playhead <= clip.startOffsetSeconds ||
    playhead >= clip.startOffsetSeconds + clip.durationSeconds
  ) {
    return null; // Playhead not within the selected clip — fail-open no-op.
  }
  const firstDuration = playhead - clip.startOffsetSeconds;
  const secondDuration = clip.durationSeconds - firstDuration;
  const first: VideoClip = {
    ...clip,
    durationSeconds: firstDuration,
    trimOutSeconds: clip.trimInSeconds + firstDuration,
  };
  const second: VideoClip = {
    ...clip,
    id: newClipId(),
    startOffsetSeconds: playhead,
    durationSeconds: secondDuration,
    trimInSeconds: clip.trimInSeconds + firstDuration,
  };
  const nextClips = timeline.clips.filter((c) => c.id !== clip.id).concat([first, second]);
  return {
    ...timeline,
    clips: nextClips,
    selectedClipId: second.id,
    totalDurationSeconds: Math.max(
      timeline.totalDurationSeconds,
      timelineEndSeconds(nextClips),
    ),
  };
}

export function VideoTimeline({ timeline, onTimelineChange, onSeek }: VideoTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const clipDragRef = useRef<{ id: string; startX: number; originStart: number } | null>(null);

  const timeFromClientX = useCallback(
    (clientX: number): number => {
      const el = containerRef.current;
      if (!el) return timeline.currentTimeSeconds;
      const rect = el.getBoundingClientRect();
      return (clientX - rect.left + el.scrollLeft) / timeline.zoomLevel;
    },
    [timeline.currentTimeSeconds, timeline.zoomLevel],
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (isDraggingPlayhead) {
        onSeek(snapTime(timeFromClientX(e.clientX), timeline));
        return;
      }
      const drag = clipDragRef.current;
      if (drag) {
        // Delta-only math: scroll offsets cancel out, so no rect needed.
        const deltaSeconds = (e.clientX - drag.startX) / timeline.zoomLevel;
        const next = timeline.clips.map((clip) =>
          clip.id === drag.id
            ? {
                ...clip,
                startOffsetSeconds: snapTime(
                  Math.max(0, drag.originStart + deltaSeconds),
                  timeline,
                ),
              }
            : clip,
        );
        onTimelineChange({
          ...timeline,
          clips: next,
          totalDurationSeconds: Math.max(timeline.totalDurationSeconds, timelineEndSeconds(next)),
        });
      }
    },
    [isDraggingPlayhead, onSeek, onTimelineChange, timeFromClientX, timeline],
  );

  const endDrag = useCallback(() => {
    setIsDraggingPlayhead(false);
    clipDragRef.current = null;
  }, []);

  React.useEffect(() => {
    if (!isDraggingPlayhead && !clipDragRef.current) return;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [isDraggingPlayhead, handlePointerMove, endDrag]);

  const handlePlayheadPointerDown = (e: React.PointerEvent) => {
    setIsDraggingPlayhead(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    onSeek(snapTime(timeFromClientX(e.clientX), timeline));
  };

  const handleClipPointerDown = (e: React.PointerEvent, clip: VideoClip) => {
    e.stopPropagation();
    onTimelineChange({ ...timeline, selectedClipId: clip.id });
    clipDragRef.current = {
      id: clip.id,
      startX: e.clientX,
      originStart: clip.startOffsetSeconds,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleSplit = () => {
    const next = splitClipAtPlayhead(timeline);
    if (next) onTimelineChange(next);
  };

  const handleDelete = () => {
    if (!timeline.selectedClipId) return;
    const nextClips = timeline.clips.filter((c) => c.id !== timeline.selectedClipId);
    onTimelineChange({ ...timeline, clips: nextClips, selectedClipId: null });
  };

  const setZoom = (zoom: number) => {
    onTimelineChange({
      ...timeline,
      zoomLevel: Math.min(MAX_ZOOM_PX_PER_SEC, Math.max(MIN_ZOOM_PX_PER_SEC, zoom)),
    });
  };

  const rulerSeconds = Math.ceil(timeline.totalDurationSeconds) + 1;
  const trackWidth = Math.max(
    (timeline.totalDurationSeconds + 4) * timeline.zoomLevel,
    600,
  );

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 select-none">
      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950 px-4 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onSeek(0)}
            className="rounded bg-slate-800 px-2 py-1 text-xs font-bold text-slate-300 hover:bg-slate-700"
          >
            |&lt; Start
          </button>
          <button
            type="button"
            onClick={handleSplit}
            disabled={!timeline.selectedClipId}
            className="rounded bg-cyan-600 px-2 py-1 text-xs font-bold text-white hover:bg-cyan-500 disabled:opacity-40"
          >
            ✂️ Split Clip (Razor)
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!timeline.selectedClipId}
            className="rounded bg-slate-800 px-2 py-1 text-xs font-bold text-slate-300 hover:bg-red-900 disabled:opacity-40"
          >
            🗑 Delete
          </button>
          <button
            type="button"
            onClick={() =>
              onTimelineChange({ ...timeline, snapToGrid: !timeline.snapToGrid })
            }
            aria-pressed={timeline.snapToGrid}
            className={`rounded px-2 py-1 text-xs font-bold ${
              timeline.snapToGrid
                ? "bg-emerald-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            🧲 Snap {timeline.snapToGrid ? "On" : "Off"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom(timeline.zoomLevel / 1.5)}
            className="rounded bg-slate-800 px-2 py-1 text-xs font-bold text-slate-300 hover:bg-slate-700"
            aria-label="Zoom out"
          >
            −
          </button>
          <input
            type="range"
            min={MIN_ZOOM_PX_PER_SEC}
            max={MAX_ZOOM_PX_PER_SEC}
            value={timeline.zoomLevel}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-28"
            aria-label="Timeline zoom"
          />
          <button
            type="button"
            onClick={() => setZoom(timeline.zoomLevel * 1.5)}
            className="rounded bg-slate-800 px-2 py-1 text-xs font-bold text-slate-300 hover:bg-slate-700"
            aria-label="Zoom in"
          >
            +
          </button>
          <div className="font-mono text-xs text-cyan-300">
            {timeline.currentTimeSeconds.toFixed(2)}s / {timeline.totalDurationSeconds.toFixed(2)}s
          </div>
        </div>
      </div>

      {/* Tracks */}
      <div ref={containerRef} className="overflow-x-auto overflow-y-hidden bg-slate-950 p-2">
        <div className="relative" style={{ width: `${trackWidth}px` }}>
          {/* Ruler */}
          <div className="relative mb-1 h-5 border-b border-slate-800">
            {Array.from({ length: rulerSeconds }, (_, s) => (
              <span
                key={s}
                style={{ left: `${s * timeline.zoomLevel}px` }}
                className="absolute top-0 font-mono text-[10px] text-slate-500"
              >
                {s}s
              </span>
            ))}
          </div>

          {/* Playhead */}
          <div
            style={{ left: `${timeline.currentTimeSeconds * timeline.zoomLevel}px` }}
            onPointerDown={handlePlayheadPointerDown}
            className="absolute top-0 bottom-0 z-50 w-0.5 cursor-ew-resize bg-red-500"
            role="slider"
            aria-label="Playhead"
            aria-valuenow={Number(timeline.currentTimeSeconds.toFixed(2))}
            aria-valuemin={0}
            aria-valuemax={timeline.totalDurationSeconds}
          >
            <div className="h-3 w-3 -translate-x-1/2 rounded-full bg-red-500" />
          </div>

          {timeline.tracks.map((track) => (
            <div
              key={track.index}
              className={`relative mb-2 rounded border-b border-slate-800/80 bg-slate-900/50 ${
                track.kind === "video" ? "h-16" : "h-12"
              }`}
            >
              <span className="pointer-events-none absolute top-1 left-2 text-[10px] font-bold tracking-wide text-slate-600 uppercase">
                {track.label}
              </span>
              {timeline.clips
                .filter((c) => c.trackIndex === track.index)
                .map((clip) => (
                  <div
                    key={clip.id}
                    onPointerDown={(e) => handleClipPointerDown(e, clip)}
                    style={{
                      left: `${clip.startOffsetSeconds * timeline.zoomLevel}px`,
                      width: `${Math.max(8, clip.durationSeconds * timeline.zoomLevel)}px`,
                    }}
                    title={`${clip.name} · ${clip.kind} · drag to move, click to select`}
                    className={`absolute top-4 bottom-1 flex cursor-grab items-center justify-between gap-1 rounded border px-2 text-xs font-semibold active:cursor-grabbing ${
                      timeline.selectedClipId === clip.id
                        ? "border-cyan-400 bg-cyan-600/60 text-white"
                        : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    <span className="truncate">{clip.name}</span>
                    <span className="shrink-0 font-mono text-[10px] opacity-75">
                      {clip.durationSeconds.toFixed(1)}s
                    </span>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
