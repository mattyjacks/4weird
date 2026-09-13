"use client";

/**
 * components/studio/video/video-nle-preview.tsx — NLE preview viewport (DS-REMASTER-W3-WEB1).
 *
 * Canvas viewport driven by the shell playhead. All browser APIs (canvas 2D)
 * are touched inside effects only, so SSR renders a static fallback frame with
 * zero hydration mismatch. Fail-open: a missing canvas context shows a note,
 * never a crash. Clip art is placeholder swatches — no network fetches.
 */

import { useEffect, useRef, useState } from "react";
import type { NleClipKind, NleTimeline } from "./video-nle-types";

interface VideoNlePreviewProps {
  timeline: NleTimeline;
  playheadSec: number;
  playing: boolean;
  clockLabel: "audio" | "fallback";
}

const KIND_COLORS: Record<NleClipKind, [string, string]> = {
  gameplay: ["#0e7490", "#164e63"],
  blender: ["#7c3aed", "#4c1d95"],
  generated: ["#c026d3", "#701a75"],
  music: ["#047857", "#064e3b"],
  voiceover: ["#b45309", "#78350f"],
};

function formatTimecode(sec: number, fps: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const secPart = Math.floor(s - m * 60);
  const frames = Math.floor((s - Math.floor(s)) * fps);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(m)}:${pad(secPart)}:${pad(frames)}`;
}

export function VideoNlePreview(props: VideoNlePreviewProps) {
  const { timeline, playheadSec, playing, clockLabel } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasFailed, setCanvasFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext("2d");
    } catch {
      ctx = null;
    }
    if (!ctx) {
      setCanvasFailed(true);
      return;
    }
    const context = ctx;
    let raf = 0;
    const W = canvas.width;
    const H = canvas.height;

    const draw = () => {
      // Topmost video clip at the playhead wins (later tracks overlay earlier).
      let activeLabel = "No clip — black";
      let colors: [string, string] = ["#020617", "#0f172a"];
      for (const track of timeline.tracks) {
        if (track.kind !== "video") continue;
        for (const clip of track.clips) {
          if (playheadSec >= clip.startSec && playheadSec < clip.startSec + clip.durationSec) {
            activeLabel = clip.label;
            colors = KIND_COLORS[clip.kind];
          }
        }
      }
      const grad = context.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, colors[0]);
      grad.addColorStop(1, colors[1]);
      context.fillStyle = grad;
      context.fillRect(0, 0, W, H);

      // Letterbox guides.
      context.fillStyle = "rgba(0,0,0,0.55)";
      context.fillRect(0, 0, W, 24);
      context.fillRect(0, H - 24, W, 24);

      context.fillStyle = "#ffffff";
      context.font = "bold 20px system-ui, sans-serif";
      context.fillText(activeLabel.slice(0, 42), 16, H / 2);
      context.font = "14px ui-monospace, monospace";
      context.fillStyle = "#67e8f9";
      context.fillText(formatTimecode(playheadSec, timeline.fps), 16, 34);
      context.fillStyle = playing ? "#4ade80" : "#94a3b8";
      context.fillText(playing ? "PLAY" : "PAUSE", W - 70, 34);

      // Audio meters: deterministic pseudo-levels from active audio clips.
      let meterY = H - 60;
      for (const track of timeline.tracks) {
        if (track.kind !== "audio") continue;
        const active = track.clips.some(
          (c) => playheadSec >= c.startSec && playheadSec < c.startSec + c.durationSec,
        );
        const level = active && playing ? 0.4 + 0.3 * Math.abs(Math.sin(playheadSec * 3)) : 0.06;
        context.fillStyle = "rgba(255,255,255,0.25)";
        context.fillRect(16, meterY, 160, 8);
        context.fillStyle = "#34d399";
        context.fillRect(16, meterY, 160 * Math.min(1, level), 8);
        meterY -= 14;
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [timeline, playheadSec, playing]);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-300">
        <span className="font-bold uppercase tracking-widest text-slate-400">Preview</span>
        <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-cyan-300">
          clock: {clockLabel}
        </span>
        <span className="ml-auto font-mono">{formatTimecode(playheadSec, timeline.fps)}</span>
      </div>
      <div className="relative aspect-video w-full overflow-hidden rounded bg-black">
        <canvas ref={canvasRef} width={640} height={360} className="h-full w-full" />
        {canvasFailed ? (
          <p className="absolute inset-0 flex items-center justify-center bg-black/80 p-4 text-center text-xs text-slate-300">
            Canvas unavailable in this browser — timeline editing still works; preview is
            fail-open.
          </p>
        ) : null}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        16:9 viewport · {timeline.fps}fps timecode · swatches stand in for gameplay, Blender,
        and generated sources until media URLs are attached.
      </p>
    </div>
  );
}
