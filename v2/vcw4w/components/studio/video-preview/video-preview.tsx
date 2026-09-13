"use client";

/**
 * Media Mogul preview viewport (remastery README §3.1, Wave 3).
 *
 * 16:9 canvas that plays the timeline. Timing is driven by the primary
 * AudioContext clock (§1.2 axiom — audio clocks do not drift under GPU/DOM
 * load); if AudioContext is unavailable the engine fails open to a
 * performance.now() clock and the page keeps working.
 *
 * Memory axiom: the preview NEVER decodes whole videos. Clips with no
 * attached media render as labeled slates; real media binds later via one
 * HTMLVideoElement per on-screen clip drawn with drawImage /
 * requestVideoFrameCallback (Wave 4, no raw buffers).
 *
 * All browser APIs (AudioContext, canvas, rAF) live in useEffect/handlers.
 */

import { useEffect, useRef } from "react";
import type { ClipKind, TimelineState, VideoClip } from "@/types/studio-video";

interface VideoPreviewProps {
  timeline: TimelineState;
  onTimelineChange: (next: TimelineState) => void;
  onSeek: (timeSeconds: number) => void;
}

const PREVIEW_W = 960;
const PREVIEW_H = 540;

const KIND_COLORS: Record<ClipKind, string> = {
  gameplay: "#22d3ee",
  blender_render: "#a78bfa",
  fal_generation: "#f472b6",
  music: "#fbbf24",
  voiceover: "#34d399",
};

const KIND_LABELS: Record<ClipKind, string> = {
  gameplay: "GAMEPLAY",
  blender_render: "BLENDER RENDER",
  fal_generation: "FAL.AI GENERATION",
  music: "MUSIC",
  voiceover: "VOICEOVER",
};

function activeAt(clips: VideoClip[], t: number): VideoClip[] {
  return clips.filter(
    (c) => t >= c.startOffsetSeconds && t < c.startOffsetSeconds + c.durationSeconds,
  );
}

function formatTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = (t - m * 60).toFixed(2).padStart(5, "0");
  return `${m}:${s}`;
}

function drawPreview(
  ctx: CanvasRenderingContext2D,
  timeline: TimelineState,
  t: number,
): void {
  ctx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);

  const active = activeAt(timeline.clips, t);
  const video = active
    .filter((c) => timeline.tracks[c.trackIndex]?.kind === "video")
    .sort((a, b) => a.zIndex - b.zIndex);
  const audio = active.filter((c) => timeline.tracks[c.trackIndex]?.kind === "audio");

  const base = video.filter((c) => c.trackIndex === 0).pop() ?? video[0];
  if (base) {
    const color = KIND_COLORS[base.kind];
    ctx.save();
    ctx.globalAlpha = base.opacity;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, PREVIEW_W, 440);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, PREVIEW_W - 4, 436);
    ctx.fillStyle = color;
    ctx.font = "bold 20px monospace";
    ctx.fillText(KIND_LABELS[base.kind], 24, 48);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 34px sans-serif";
    ctx.fillText(base.name.slice(0, 42), 24, 100);
    ctx.fillStyle = "#64748b";
    ctx.font = "16px monospace";
    const local = (t - base.startOffsetSeconds) * base.playbackRate + base.trimInSeconds;
    ctx.fillText(
      `timeline ${formatTime(t)} · clip ${formatTime(Math.max(0, local))} · ${base.playbackRate.toFixed(2)}x`,
      24,
      132,
    );
    if (base.sourceUrl) {
      ctx.fillText("media: HTMLVideoElement bind (Wave 4)", 24, 160);
    } else {
      ctx.fillText("media: slate — no source attached (fail-open)", 24, 160);
    }
    if (base.effects.length > 0) {
      ctx.fillText(`fx: ${base.effects.map((e) => e.type).join(", ")}`, 24, 188);
    }
    ctx.restore();
  } else {
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("∅  GAP — no video clip at playhead", 200, 220);
  }

  // Overlay track as picture-in-picture.
  const overlay = video.find((c) => c.trackIndex > 0);
  if (overlay) {
    const color = KIND_COLORS[overlay.kind];
    ctx.save();
    ctx.globalAlpha = overlay.opacity;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(PREVIEW_W - 344, 200, 320, 180);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(PREVIEW_W - 344, 200, 320, 180);
    ctx.fillStyle = color;
    ctx.font = "bold 13px monospace";
    ctx.fillText(KIND_LABELS[overlay.kind], PREVIEW_W - 332, 226);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText(overlay.name.slice(0, 24), PREVIEW_W - 332, 250);
    ctx.restore();
  }

  // Audio strip (meters only — no decode, no autoplay).
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 440, PREVIEW_W, 100);
  ctx.fillStyle = "#334155";
  ctx.font = "12px monospace";
  audio.forEach((clip, i) => {
    const y = 462 + i * 26;
    if (y > PREVIEW_H - 16) return;
    const color = KIND_COLORS[clip.kind];
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(16, y, PREVIEW_W - 32, 18);
    ctx.fillStyle = color;
    const progress =
      clip.durationSeconds > 0
        ? (t - clip.startOffsetSeconds) / clip.durationSeconds
        : 0;
    ctx.fillRect(16, y, (PREVIEW_W - 32) * Math.min(1, Math.max(0, progress)), 18);
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(`♪ ${clip.name.slice(0, 40)} · vol ${clip.volume.toFixed(1)}`, 24, y + 14);
  });
  if (audio.length === 0) {
    ctx.fillStyle = "#475569";
    ctx.fillText("♪ no audio at playhead", 24, 476);
  }

  // Timecode + playhead marker.
  ctx.fillStyle = "#22d3ee";
  ctx.font = "bold 16px monospace";
  ctx.fillText(formatTime(t), 16, 28);
  const x = Math.min(1, t / Math.max(0.001, timeline.totalDurationSeconds)) * PREVIEW_W;
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(x - 1, 0, 2, PREVIEW_H);
}

export function VideoPreview({ timeline, onTimelineChange, onSeek }: VideoPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timelineRef = useRef(timeline);
  timelineRef.current = timeline;
  const callbacksRef = useRef({ onTimelineChange, onSeek });
  callbacksRef.current = { onTimelineChange, onSeek };

  // Playback engine: audio-clock driven rAF loop. Runs only while playing.
  useEffect(() => {
    if (!timeline.isPlaying) return;

    let audioCtx: AudioContext | null = null;
    let baseCtxTime = 0;
    let basePerf = 0;
    let useAudioClock = false;
    const startT = timelineRef.current.currentTimeSeconds;

    try {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) {
        audioCtx = new AC();
        void audioCtx.resume().catch(() => undefined);
        baseCtxTime = audioCtx.currentTime;
        useAudioClock = true;
      }
    } catch {
      audioCtx = null;
      useAudioClock = false;
    }
    if (!useAudioClock) basePerf = performance.now() / 1000;

    let raf = 0;
    let lastSync = 0;

    const tick = () => {
      const snap = timelineRef.current;
      const now = useAudioClock && audioCtx ? audioCtx.currentTime : performance.now() / 1000;
      const base = useAudioClock ? baseCtxTime : basePerf;
      const t = startT + (now - base);

      if (t >= snap.totalDurationSeconds) {
        callbacksRef.current.onSeek(snap.totalDurationSeconds);
        callbacksRef.current.onTimelineChange({ ...snap, isPlaying: false });
        return;
      }

      const canvas = canvasRef.current;
      const ctx2d = canvas?.getContext("2d");
      if (ctx2d) drawPreview(ctx2d, snap, t);

      // Sync the shared playhead at ~8 Hz; the canvas itself draws every frame.
      if (t - lastSync > 0.12) {
        lastSync = t;
        callbacksRef.current.onSeek(t);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (audioCtx) void audioCtx.close().catch(() => undefined);
    };
  }, [timeline.isPlaying]);

  // Still frame whenever paused / stepped.
  useEffect(() => {
    if (timeline.isPlaying) return;
    const canvas = canvasRef.current;
    const ctx2d = canvas?.getContext("2d");
    if (ctx2d) drawPreview(ctx2d, timeline, timeline.currentTimeSeconds);
  }, [
    timeline,
    timeline.isPlaying,
    timeline.currentTimeSeconds,
    timeline.clips,
    timeline.tracks,
  ]);

  const togglePlay = () => {
    if (timeline.totalDurationSeconds <= 0) return;
    if (!timeline.isPlaying && timeline.currentTimeSeconds >= timeline.totalDurationSeconds) {
      onSeek(0);
    }
    onTimelineChange({ ...timeline, isPlaying: !timeline.isPlaying });
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-2">
        <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">
          Preview viewport · audio-clock
        </span>
        <button
          type="button"
          onClick={togglePlay}
          className="rounded bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-500"
        >
          {timeline.isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={PREVIEW_W}
        height={PREVIEW_H}
        className="aspect-video w-full bg-slate-950"
        aria-label="Video preview viewport"
      />
    </div>
  );
}
