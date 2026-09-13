"use client";

/**
 * components/studio/video/video-nle.tsx — Media Mogul NLE shell (DS-REMASTER-W3-WEB1).
 *
 * Library + preview + timeline + export per README 3.1. Master transport clock
 * prefers AudioContext.currentTime (audio clock) with a performance.now
 * fallback; the active source is shown in the preview badge. Client-guarded:
 * renders a static skeleton until mounted, so SSR HTML matches first paint and
 * no hydration error is possible. Fail-open everywhere: compute unreachable,
 * missing AudioContext, and empty media URLs degrade to stubs, never throws.
 */

import { useEffect, useRef, useState } from "react";
import { interopBus } from "@/lib/interop";
import { VideoNleExport } from "./video-nle-export";
import { VideoNlePreview } from "./video-nle-preview";
import { VideoNleTimeline } from "./video-nle-timeline";
import {
  NLE_LIBRARY,
  buildSeedTimeline,
  makeClipId,
  type NleClip,
  type NleLibraryAsset,
  type NleTimeline,
} from "./video-nle-types";

const MIN_PX_PER_SEC = 4;
const MAX_PX_PER_SEC = 96;
const TICK_MS = 100;

interface ClockState {
  kind: "audio" | "fallback";
  ctx: AudioContext | null;
  t0: number;
  offset: number;
}

function nowOf(clock: ClockState): number {
  if (clock.kind === "audio" && clock.ctx) {
    try {
      return clock.ctx.currentTime;
    } catch {
      return performance.now() / 1000;
    }
  }
  return performance.now() / 1000;
}

export function VideoNle() {
  const [mounted, setMounted] = useState(false);
  const [timeline, setTimeline] = useState<NleTimeline>(() => buildSeedTimeline());
  const [playing, setPlaying] = useState(false);
  const [playheadSec, setPlayheadSec] = useState(0);
  const [pxPerSec, setPxPerSec] = useState(24);
  const [snap, setSnap] = useState(true);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [clockLabel, setClockLabel] = useState<"audio" | "fallback">("fallback");

  const clockRef = useRef<ClockState>({ kind: "fallback", ctx: null, t0: 0, offset: 0 });
  const playheadRef = useRef(0);
  const durationRef = useRef(timeline.durationSec);
  durationRef.current = timeline.durationSec;

  useEffect(() => {
    setMounted(true);
  }, []);

  function setPlayheadBoth(sec: number): void {
    playheadRef.current = sec;
    setPlayheadSec(sec);
  }

  // Transport ticker: advances the playhead from the master clock while playing.
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const clock = clockRef.current;
      const next = clock.offset + (nowOf(clock) - clock.t0);
      if (next >= durationRef.current) {
        setPlayheadBoth(durationRef.current);
        setPlaying(false);
        return;
      }
      setPlayheadBoth(next);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [playing]);

  // Release the AudioContext when the shell unmounts.
  useEffect(() => {
    const clock = clockRef.current;
    return () => {
      try {
        void clock.ctx?.close();
      } catch {
        // Fail-open on teardown.
      }
    };
  }, []);

  function handlePlay(): void {
    let kind: "audio" | "fallback" = "fallback";
    let ctx: AudioContext | null = null;
    try {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) {
        ctx = new AC();
        void ctx.resume().catch(() => undefined);
        kind = "audio";
      }
    } catch {
      kind = "fallback";
      ctx = null;
    }
    const startAt = playheadRef.current >= durationRef.current ? 0 : playheadRef.current;
    const clock: ClockState = { kind, ctx, t0: 0, offset: startAt };
    clock.t0 = nowOf({ ...clock, t0: 0 });
    clockRef.current = clock;
    setClockLabel(kind);
    setPlayheadBoth(startAt);
    setPlaying(true);
  }

  function handlePause(): void {
    const clock = clockRef.current;
    const frozen = Math.min(clock.offset + (nowOf(clock) - clock.t0), durationRef.current);
    try {
      void clock.ctx?.close().catch(() => undefined);
    } catch {
      // Fail-open on teardown.
    }
    clock.ctx = null;
    setPlayheadBoth(frozen);
    setPlaying(false);
  }

  function handleStop(): void {
    try {
      void clockRef.current.ctx?.close().catch(() => undefined);
    } catch {
      // Fail-open on teardown.
    }
    clockRef.current.ctx = null;
    setPlaying(false);
    setPlayheadBoth(0);
  }

  function handleSplitClip(trackId: string, clipId: string): void {
    const at = playheadRef.current;
    setTimeline((prev) => ({
      ...prev,
      tracks: prev.tracks.map((track) => {
        if (track.id !== trackId) return track;
        const clips: NleClip[] = [];
        for (const clip of track.clips) {
          const end = clip.startSec + clip.durationSec;
          if (clip.id !== clipId || at <= clip.startSec || at >= end) {
            clips.push(clip);
            continue;
          }
          const firstDur = at - clip.startSec;
          const secondDur = end - at;
          clips.push(
            { ...clip, durationSec: firstDur, label: `${clip.label} A` },
            {
              ...clip,
              id: makeClipId("clip"),
              label: `${clip.label} B`,
              startSec: at,
              durationSec: secondDur,
            },
          );
        }
        return { ...track, clips };
      }),
    }));
  }

  function handleRemoveClip(clipId: string): void {
    setTimeline((prev) => ({
      ...prev,
      tracks: prev.tracks.map((track) => ({
        ...track,
        clips: track.clips.filter((c) => c.id !== clipId),
      })),
    }));
    setSelectedClipId((prev) => (prev === clipId ? null : prev));
  }

  function handleAddAsset(asset: NleLibraryAsset): void {
    const isVideo = asset.kind === "gameplay" || asset.kind === "blender" || asset.kind === "generated";
    const clip: NleClip = {
      id: makeClipId("clip"),
      kind: asset.kind,
      label: asset.label,
      startSec: 0,
      durationSec: asset.durationSec,
      src: asset.src,
    };
    setTimeline((prev) => {
      const targetKind = isVideo ? "video" : "audio";
      const idx = prev.tracks.findIndex((t) => t.kind === targetKind);
      const target = prev.tracks[idx === -1 ? 0 : idx];
      const end = target.clips.reduce((n, c) => Math.max(n, c.startSec + c.durationSec), 0);
      const placed: NleClip = { ...clip, startSec: end };
      const tracks = prev.tracks.map((t, i) =>
        i === (idx === -1 ? 0 : idx) ? { ...t, clips: [...t.clips, placed] } : t,
      );
      const lastEnd = Math.max(prev.durationSec, end + placed.durationSec);
      return { ...prev, tracks, durationSec: lastEnd };
    });
    setSelectedClipId(clip.id);
    try {
      interopBus.emit("studio:asset-ready", {
        kind: asset.kind,
        url: asset.src === "" ? `nle:${asset.id}` : asset.src,
        source: "video-nle-library",
      });
    } catch {
      // Fail-open: bus fan-out is best-effort.
    }
  }

  if (!mounted) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-sm text-slate-400">
        Loading the NLE shell…
      </div>
    );
  }

  const selectedClip = timeline.tracks
    .flatMap((t) => t.clips.map((c) => ({ trackId: t.id, clip: c })))
    .find((e) => e.clip.id === selectedClipId);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Library</h2>
          <ul className="mt-2 space-y-2">
            {NLE_LIBRARY.map((asset) => (
              <li
                key={asset.id}
                className="rounded-lg bg-slate-800 p-2 text-xs text-slate-300"
              >
                <p className="font-bold text-white">{asset.label}</p>
                <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                  {asset.kind} · {asset.durationSec}s
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">{asset.note}</p>
                <button
                  type="button"
                  onClick={() => handleAddAsset(asset)}
                  className="mt-2 rounded bg-cyan-500 px-2 py-1 font-bold text-slate-950"
                >
                  Add to timeline
                </button>
              </li>
            ))}
          </ul>
        </div>

        <VideoNlePreview
          timeline={timeline}
          playheadSec={playheadSec}
          playing={playing}
          clockLabel={clockLabel}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-xs text-slate-300">
        {playing ? (
          <button
            type="button"
            onClick={handlePause}
            className="rounded-lg bg-amber-400 px-3 py-1.5 font-bold text-slate-950"
          >
            Pause
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePlay}
            className="rounded-lg bg-emerald-400 px-3 py-1.5 font-bold text-slate-950"
          >
            Play
          </button>
        )}
        <button
          type="button"
          onClick={handleStop}
          className="rounded-lg border border-slate-600 px-3 py-1.5 font-bold"
        >
          Stop
        </button>
        <button
          type="button"
          onClick={() => setPxPerSec((z) => Math.max(MIN_PX_PER_SEC, Math.floor(z / 2)))}
          className="rounded-lg border border-slate-600 px-3 py-1.5"
          aria-label="Zoom timeline out"
        >
          Zoom −
        </button>
        <button
          type="button"
          onClick={() => setPxPerSec((z) => Math.min(MAX_PX_PER_SEC, z * 2))}
          className="rounded-lg border border-slate-600 px-3 py-1.5"
          aria-label="Zoom timeline in"
        >
          Zoom +
        </button>
        <button
          type="button"
          onClick={() => setSnap((s) => !s)}
          aria-pressed={snap}
          className="rounded-lg border border-slate-600 px-3 py-1.5"
        >
          Snap: {snap ? "on" : "off"}
        </button>
        {selectedClip ? (
          <>
            <span className="font-mono text-[11px] text-slate-400">
              {selectedClip.clip.label}
            </span>
            <button
              type="button"
              onClick={() => handleSplitClip(selectedClip.trackId, selectedClip.clip.id)}
              className="rounded-lg bg-red-500 px-3 py-1.5 font-bold text-white"
            >
              Razor-split at playhead
            </button>
            <button
              type="button"
              onClick={() => handleRemoveClip(selectedClip.clip.id)}
              className="rounded-lg border border-red-500/60 px-3 py-1.5 text-red-300"
            >
              Delete clip
            </button>
          </>
        ) : (
          <span className="text-slate-500">Select a clip to razor-split or delete.</span>
        )}
        <button
          type="button"
          onClick={() => setExportOpen(true)}
          className="ml-auto rounded-lg bg-cyan-500 px-4 py-1.5 font-bold text-slate-950"
        >
          Export…
        </button>
      </div>

      <VideoNleTimeline
        timeline={timeline}
        playheadSec={playheadSec}
        pxPerSec={pxPerSec}
        snap={snap}
        selectedClipId={selectedClipId}
        onPlayheadChange={setPlayheadBoth}
        onSelectClip={setSelectedClipId}
        onSplitClip={handleSplitClip}
      />

      <VideoNleExport
        timeline={timeline}
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />
    </div>
  );
}
