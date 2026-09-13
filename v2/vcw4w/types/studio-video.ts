/**
 * Media Mogul — browser video-timeline studio types.
 *
 * Remastery README §3.1 (Feature 01) blueprint. Pure types + tiny pure
 * helpers only: no browser APIs at import time, safe to import from server
 * or client components.
 *
 * Axioms honored here (§1.2): fail-open (validators ignore bad rows),
 * audio-clock timing (see video-preview), never decode whole videos in
 * memory (preview draws per-frame slates / HTMLVideoElement frames only).
 */

/** Clip provenance from the §3.1 sketch: gameplay, Blender, fal.ai, music, voiceover. */
export type ClipKind =
  | "gameplay"
  | "blender_render"
  | "fal_generation"
  | "music"
  | "voiceover";

export type TrackKind = "video" | "audio";

export interface VideoEffect {
  type: "color_grade" | "blur" | "chroma_key" | "speed" | "fade";
  params: Record<string, number | string | boolean>;
}

export interface VideoClip {
  id: string;
  name: string;
  kind: ClipKind;
  /** Empty until real media is attached — preview renders a slate (fail-open). */
  sourceUrl: string;
  trackIndex: number;
  /** Position on the timeline, seconds. */
  startOffsetSeconds: number;
  durationSeconds: number;
  /** Trim window inside the source media, seconds. */
  trimInSeconds: number;
  trimOutSeconds: number;
  /** 0.0 to 1.0 */
  volume: number;
  playbackRate: number;
  /** 0.0 to 1.0 */
  opacity: number;
  zIndex: number;
  effects: VideoEffect[];
}

export interface TimelineTrack {
  index: number;
  kind: TrackKind;
  label: string;
}

export interface TimelineState {
  currentTimeSeconds: number;
  totalDurationSeconds: number;
  isPlaying: boolean;
  /** Pixels per second. */
  zoomLevel: number;
  snapToGrid: boolean;
  selectedClipId: string | null;
  tracks: TimelineTrack[];
  clips: VideoClip[];
}

/**
 * Render-export envelope. The studio POSTs this as JSON to
 * `/api/compute/render-video` (STUB — no backend in Wave 3). A RunPod
 * worker later consumes it with headless FFmpeg on an RTX 4090 node.
 */
export interface RenderExportPayload {
  version: 1;
  exportedAt: string;
  target: {
    endpoint: "/api/compute/render-video";
    profile: "1080p60";
  };
  timeline: TimelineState;
}

/** Four tracks straight from the §3.1 sketch. */
export const DEFAULT_TRACKS: TimelineTrack[] = [
  { index: 0, kind: "video", label: "Video Track 1" },
  { index: 1, kind: "video", label: "Video Track 2 · Overlay" },
  { index: 2, kind: "audio", label: "Audio Track 1 · Music" },
  { index: 3, kind: "audio", label: "Audio Track 2 · Voiceover" },
];

/** Snap radius when playhead/clip edges approach grid lines or clip edges. */
export const SNAP_THRESHOLD_SECONDS = 0.25;

export const MIN_ZOOM_PX_PER_SEC = 8;
export const MAX_ZOOM_PX_PER_SEC = 240;
export const DEFAULT_ZOOM_PX_PER_SEC = 48;

let clipCounter = 0;

/**
 * Client-side id factory. Call ONLY inside event handlers / effects —
 * never during render — so server prerender and hydration agree on ids.
 */
export function newClipId(): string {
  clipCounter += 1;
  return `clip-${Date.now().toString(36)}-${clipCounter}`;
}

export function timelineEndSeconds(clips: VideoClip[]): number {
  let end = 0;
  for (const clip of clips) {
    end = Math.max(end, clip.startOffsetSeconds + clip.durationSeconds);
  }
  return end;
}

/** Default track per clip kind (matches the §3.1 sketch layout). */
export function defaultTrackForKind(kind: ClipKind): number {
  switch (kind) {
    case "gameplay":
    case "fal_generation":
      return 0;
    case "blender_render":
      return 1;
    case "music":
      return 2;
    case "voiceover":
      return 3;
  }
}

export function clampTime(value: number, total: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(Math.max(0, value), Math.max(0, total));
}
