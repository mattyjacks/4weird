"use client";

/**
 * Media Mogul studio shell (remastery README §3.1, Wave 3).
 *
 * Owns the TimelineState: media library (clip types from the §3.1 sketch),
 * preview viewport, multi-track timeline, and the RunPod render-export stub.
 *
 * Export is STUB-ONLY: it packages the timeline as JSON and POSTs it to
 * `/api/compute/render-video`. No such backend exists in Wave 3, so any
 * network failure is reported fail-open in the export status line — the
 * studio itself never breaks.
 *
 * Interop (§1.2 axiom 5): clip adds + export attempts are announced on the
 * shared `4weird_interop_bus` BroadcastChannel via a self-contained emitter
 * (guarded, fail-open; no cross-lane imports).
 */

import { useCallback, useState } from "react";
import {
  DEFAULT_TRACKS,
  clampTime,
  defaultTrackForKind,
  newClipId,
  timelineEndSeconds,
  type ClipKind,
  type RenderExportPayload,
  type TimelineState,
  type VideoClip,
} from "@/types/studio-video";
import { VideoPreview } from "@/components/studio/video-preview/video-preview";
import { VideoTimeline } from "@/components/studio/video-timeline/video-timeline";

const SEED_TOTAL_SECONDS = 16;

function seedTimeline(): TimelineState {
  const clips: VideoClip[] = [
    {
      id: "demo-gameplay-a",
      name: "GraveGain run — Clip A",
      kind: "gameplay",
      sourceUrl: "",
      trackIndex: 0,
      startOffsetSeconds: 0,
      durationSeconds: 8,
      trimInSeconds: 0,
      trimOutSeconds: 8,
      volume: 1,
      playbackRate: 1,
      opacity: 1,
      zIndex: 0,
      effects: [],
    },
    {
      id: "demo-fal-b",
      name: "fal.ai ident — Clip B",
      kind: "fal_generation",
      sourceUrl: "",
      trackIndex: 0,
      startOffsetSeconds: 8,
      durationSeconds: 4,
      trimInSeconds: 0,
      trimOutSeconds: 4,
      volume: 1,
      playbackRate: 1,
      opacity: 1,
      zIndex: 0,
      effects: [{ type: "fade", params: { seconds: 0.5 } }],
    },
    {
      id: "demo-blender-overlay",
      name: "Blender watermark",
      kind: "blender_render",
      sourceUrl: "",
      trackIndex: 1,
      startOffsetSeconds: 3,
      durationSeconds: 4,
      trimInSeconds: 0,
      trimOutSeconds: 4,
      volume: 1,
      playbackRate: 1,
      opacity: 0.9,
      zIndex: 10,
      effects: [],
    },
    {
      id: "demo-music",
      name: "Background music",
      kind: "music",
      sourceUrl: "",
      trackIndex: 2,
      startOffsetSeconds: 0,
      durationSeconds: SEED_TOTAL_SECONDS,
      trimInSeconds: 0,
      trimOutSeconds: SEED_TOTAL_SECONDS,
      volume: 0.6,
      playbackRate: 1,
      opacity: 1,
      zIndex: 0,
      effects: [],
    },
    {
      id: "demo-voiceover",
      name: "ElevenLabs voiceover",
      kind: "voiceover",
      sourceUrl: "",
      trackIndex: 3,
      startOffsetSeconds: 4,
      durationSeconds: 6,
      trimInSeconds: 0,
      trimOutSeconds: 6,
      volume: 0.9,
      playbackRate: 1,
      opacity: 1,
      zIndex: 0,
      effects: [],
    },
  ];
  return {
    currentTimeSeconds: 0,
    totalDurationSeconds: SEED_TOTAL_SECONDS,
    isPlaying: false,
    zoomLevel: 48,
    snapToGrid: true,
    selectedClipId: null,
    tracks: DEFAULT_TRACKS,
    clips,
  };
}

const LIBRARY: { kind: ClipKind; title: string; blurb: string }[] = [
  { kind: "gameplay", title: "Gameplay clip", blurb: "Captured game footage for Video Track 1." },
  { kind: "blender_render", title: "Blender render", blurb: "3D render / watermark for the overlay track." },
  { kind: "fal_generation", title: "fal.ai generation", blurb: "AI-generated ident or b-roll." },
  { kind: "music", title: "Background music", blurb: "Full-length bed for Audio Track 1." },
  { kind: "voiceover", title: "Voiceover", blurb: "ElevenLabs narration for Audio Track 2." },
];

function emitInterop(event: string, detail: string): void {
  try {
    const channel = new BroadcastChannel("4weird_interop_bus");
    channel.postMessage({
      source: "studio-video",
      event,
      detail,
      at: new Date().toISOString(),
    });
    channel.close();
  } catch {
    // Fail-open: interop never breaks the studio.
  }
}

type ExportStatus = { phase: "idle" | "sending" | "sent" | "error"; message: string };

export function VideoStudio() {
  const [timeline, setTimeline] = useState<TimelineState>(seedTimeline);
  const [exportStatus, setExportStatus] = useState<ExportStatus>({
    phase: "idle",
    message: "Not exported yet. Packages timeline JSON for a RunPod worker.",
  });

  const handleSeek = useCallback((timeSeconds: number) => {
    setTimeline((prev) => ({
      ...prev,
      currentTimeSeconds: clampTime(timeSeconds, prev.totalDurationSeconds),
    }));
  }, []);

  const handleTimelineChange = useCallback((next: TimelineState) => {
    setTimeline(next);
  }, []);

  const addClip = (kind: ClipKind, title: string) => {
    const isAudio = kind === "music" || kind === "voiceover";
    const duration = kind === "music" ? 8 : 4;
    setTimeline((prev) => {
      const clip: VideoClip = {
        id: newClipId(),
        name: `${title} ${prev.clips.filter((c) => c.kind === kind).length + 1}`,
        kind,
        sourceUrl: "",
        trackIndex: defaultTrackForKind(kind),
        startOffsetSeconds: clampTime(prev.currentTimeSeconds, prev.totalDurationSeconds),
        durationSeconds: duration,
        trimInSeconds: 0,
        trimOutSeconds: duration,
        volume: isAudio ? 0.8 : 1,
        playbackRate: 1,
        opacity: 1,
        zIndex: kind === "blender_render" ? 10 : 0,
        effects: [],
      };
      const clips = [...prev.clips, clip];
      return {
        ...prev,
        clips,
        selectedClipId: clip.id,
        totalDurationSeconds: Math.max(prev.totalDurationSeconds, timelineEndSeconds(clips)),
      };
    });
    emitInterop("studio-video:clip-added", kind);
  };

  const exportTimeline = async () => {
    const payload: RenderExportPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      target: { endpoint: "/api/compute/render-video", profile: "1080p60" },
      timeline,
    };
    setExportStatus({ phase: "sending", message: "Packaging timeline JSON…" });
    try {
      const res = await fetch("/api/compute/render-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      setExportStatus({
        phase: "sent",
        message: `Render job accepted (HTTP ${res.status}). A RunPod worker will return the 1080p60 MP4.`,
      });
      emitInterop("studio-video:export-sent", `${timeline.clips.length} clips`);
    } catch (err) {
      // STUB-ONLY: no backend in Wave 3 — report fail-open, keep the studio usable.
      const reason = err instanceof Error ? err.message : "network error";
      setExportStatus({
        phase: "error",
        message: `Render stub: no backend at /api/compute/render-video yet (${reason}). Timeline JSON is ready — ${timeline.clips.length} clips, ${timeline.totalDurationSeconds.toFixed(1)}s.`,
      });
      emitInterop("studio-video:export-stubbed", reason);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Media library */}
        <aside className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase">
            Media library
          </h2>
          <p className="text-xs text-slate-500">
            Clip types from the §3.1 sketch. Adds at the playhead — media binds later.
          </p>
          {LIBRARY.map((item) => (
            <button
              key={item.kind}
              type="button"
              onClick={() => addClip(item.kind, item.title)}
              className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-left hover:border-cyan-400/60 hover:bg-slate-700"
            >
              <div className="text-sm font-bold text-slate-100">+ {item.title}</div>
              <div className="mt-0.5 text-xs text-slate-400">{item.blurb}</div>
            </button>
          ))}
        </aside>

        <VideoPreview
          timeline={timeline}
          onTimelineChange={handleTimelineChange}
          onSeek={handleSeek}
        />
      </div>

      <VideoTimeline
        timeline={timeline}
        onTimelineChange={handleTimelineChange}
        onSeek={handleSeek}
      />

      {/* Render-export stub */}
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase">
              RunPod render export · stub only
            </h2>
            <p
              className={`mt-1 text-sm ${
                exportStatus.phase === "error"
                  ? "text-amber-300"
                  : exportStatus.phase === "sent"
                    ? "text-emerald-300"
                    : "text-slate-400"
              }`}
              role="status"
            >
              {exportStatus.message}
            </p>
          </div>
          <button
            type="button"
            onClick={exportTimeline}
            disabled={exportStatus.phase === "sending" || timeline.clips.length === 0}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-40"
          >
            {exportStatus.phase === "sending" ? "Packaging…" : "⛅ Export 1080p60 via RunPod"}
          </button>
        </div>
      </section>
    </div>
  );
}
