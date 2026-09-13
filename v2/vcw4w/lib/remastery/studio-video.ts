// 4weird remastery — Media Mogul timeline pure math (README §3.1, Wave 3).
// Serializable data ops only: no DOM, no canvas, no window at top level.
// All functions are pure (no input mutation); arrays/clips are copied on write.

import type { VideoClip, TimelineState } from "./remastery-types";

/** Max over (startOffsetSeconds + durationSeconds), each end clamped at >= 0. 0 for empty. */
export function totalDuration(clips: VideoClip[]): number {
  let max = 0;
  for (const c of clips) {
    const start = Number.isFinite(c.startOffsetSeconds) ? c.startOffsetSeconds : 0;
    const dur = Number.isFinite(c.durationSeconds) ? c.durationSeconds : 0;
    const end = Math.max(0, start + dur);
    if (end > max) max = end;
  }
  return max;
}

/**
 * Split the clip containing `playheadSeconds` into two clips.
 * Returns a NEW array; never mutates input. If the playhead is not
 * strictly inside the target clip, returns `clips` unchanged.
 */
export function splitClipAt(
  clips: VideoClip[],
  clipId: string,
  playheadSeconds: number,
  newId: () => string,
): VideoClip[] {
  const idx = clips.findIndex((c) => c.id === clipId);
  if (idx === -1) return clips;
  const target = clips[idx];
  if (!Number.isFinite(playheadSeconds)) return clips;
  if (playheadSeconds <= target.startOffsetSeconds) return clips;
  if (playheadSeconds >= target.startOffsetSeconds + target.durationSeconds) return clips;

  const firstDuration = playheadSeconds - target.startOffsetSeconds;
  const secondDuration = target.durationSeconds - firstDuration;

  const first: VideoClip = {
    ...target,
    durationSeconds: firstDuration,
    trimOutSeconds: target.trimInSeconds + firstDuration,
    effects: [...target.effects],
  };
  const second: VideoClip = {
    ...target,
    id: newId(),
    startOffsetSeconds: playheadSeconds,
    durationSeconds: secondDuration,
    trimInSeconds: target.trimInSeconds + firstDuration,
    effects: [...target.effects],
  };

  return [...clips.slice(0, idx), first, second, ...clips.slice(idx + 1)];
}

/**
 * Shift a clip's start offset by `deltaSeconds`, clamped at >= 0.
 * Optional snap-to-grid rounding when `snapGrid > 0`.
 * Returns a NEW array; never mutates input.
 */
export function moveClip(
  clips: VideoClip[],
  clipId: string,
  deltaSeconds: number,
  snapGrid?: number,
): VideoClip[] {
  return clips.map((c) => {
    if (c.id !== clipId) return c;
    let start = c.startOffsetSeconds + deltaSeconds;
    if (!Number.isFinite(start)) start = c.startOffsetSeconds;
    if (start < 0) start = 0;
    if (typeof snapGrid === "number" && snapGrid > 0 && Number.isFinite(snapGrid)) {
      start = Math.round(start / snapGrid) * snapGrid;
      if (start < 0) start = 0;
    }
    return { ...c, startOffsetSeconds: start };
  });
}

/** Collect human-readable error strings for an invalid timeline state. Empty = valid. */
export function validateTimeline(t: TimelineState): string[] {
  const errors: string[] = [];

  if (!Number.isFinite(t.currentTimeSeconds) || t.currentTimeSeconds < 0) {
    errors.push("currentTimeSeconds must be >= 0");
  }
  if (!Number.isFinite(t.totalDurationSeconds) || t.totalDurationSeconds < 0) {
    errors.push("totalDurationSeconds must be >= 0");
  }

  for (const c of t.clips) {
    if (!Number.isFinite(c.startOffsetSeconds) || c.startOffsetSeconds < 0) {
      errors.push(`clip ${c.id}: startOffsetSeconds must be >= 0`);
    }
    if (!Number.isFinite(c.durationSeconds) || c.durationSeconds < 0) {
      errors.push(`clip ${c.id}: durationSeconds must be >= 0`);
    }
    if (
      Number.isFinite(c.startOffsetSeconds) &&
      Number.isFinite(c.durationSeconds) &&
      Number.isFinite(t.currentTimeSeconds) &&
      c.startOffsetSeconds + c.durationSeconds < t.currentTimeSeconds
    ) {
      errors.push(`clip ${c.id}: ends before currentTimeSeconds`);
    }
  }

  if (t.totalDurationSeconds < t.currentTimeSeconds) {
    errors.push("totalDurationSeconds must be >= currentTimeSeconds");
  }

  if (t.selectedClipId !== null && !t.clips.some((c) => c.id === t.selectedClipId)) {
    errors.push(`selectedClipId ${t.selectedClipId} does not match any clip`);
  }

  // Overlap detection per track: [start, end) intervals.
  const byTrack = new Map<number, VideoClip[]>();
  for (const c of t.clips) {
    const list = byTrack.get(c.trackIndex);
    if (list) list.push(c);
    else byTrack.set(c.trackIndex, [c]);
  }
  for (const [track, list] of byTrack) {
    const sorted = [...list].sort((a, b) => a.startOffsetSeconds - b.startOffsetSeconds);
    for (let i = 1; i < sorted.length; i++) {
      const prevEnd = sorted[i - 1].startOffsetSeconds + sorted[i - 1].durationSeconds;
      if (sorted[i].startOffsetSeconds < prevEnd) {
        errors.push(
          `clips ${sorted[i - 1].id} and ${sorted[i].id} overlap on track ${track}`,
        );
      }
    }
  }

  return errors;
}

/** SSR-safe id: crypto.randomUUID() with Date.now()+random fallback. No window access. */
export function generateId(): string {
  try {
    const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
  } catch {
    // fall through to fallback below
  }
  return `clip-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffffff).toString(36)}`;
}
