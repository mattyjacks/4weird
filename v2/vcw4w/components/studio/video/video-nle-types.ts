/**
 * components/studio/video/video-nle-types.ts — Media Mogul video NLE shapes (DS-REMASTER-W3-WEB1).
 *
 * SCOPE NOTE: this `video/` folder is strictly disjoint from sibling
 * DS-REMASTER-W3-MOGUL (R11, done), which owns the `video-studio`,
 * `video-timeline`, and `video-preview` component folders plus
 * `types/studio-video.ts`.
 * Zero filename overlap by construction: every export here is `Nle*` / `NLE_*`.
 *
 * CONTRACT: dependency-free, SSR-safe (no window access at module level).
 * Timeline JSON is versioned (`version: 1`) so a future RunPod FFmpeg worker can
 * accept it at POST /api/compute/render-video without breaking older payloads.
 */

export type NleClipKind =
  | "gameplay"
  | "blender"
  | "generated"
  | "music"
  | "voiceover";

export type NleTrackKind = "video" | "audio";

export interface NleClip {
  id: string;
  kind: NleClipKind;
  label: string;
  startSec: number;
  durationSec: number;
  /** Source URL; empty string means "placeholder swatch" (fail-open, no network). */
  src: string;
}

export interface NleTrack {
  id: string;
  label: string;
  kind: NleTrackKind;
  clips: NleClip[];
}

export interface NleTimeline {
  version: 1;
  title: string;
  fps: number;
  durationSec: number;
  tracks: NleTrack[];
}

export interface NleLibraryAsset {
  id: string;
  kind: NleClipKind;
  label: string;
  durationSec: number;
  src: string;
  note: string;
}

export interface RenderExportTarget {
  endpoint: "/api/compute/render-video";
  profile: "1080p60";
}

export interface RenderExportPayload {
  version: 1;
  exportedAt: string;
  target: RenderExportTarget;
  timeline: NleTimeline;
}

/** Cloud-render endpoint both Wave-3 video UIs target (route lands via compute lane). */
export const RENDER_ENDPOINT = "/api/compute/render-video" as const;
export const RENDER_PROFILE = "1080p60" as const;

export function makeClipId(prefix: string): string {
  const rand = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, "0");
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

/** Seed library per README 3.1: gameplay, Blender render, fal.ai generation, music, voiceover. */
export const NLE_LIBRARY: NleLibraryAsset[] = [
  {
    id: "lib-gameplay",
    kind: "gameplay",
    label: "Gameplay capture 01",
    durationSec: 12,
    src: "",
    note: "Placeholder swatch until a real capture URL is attached.",
  },
  {
    id: "lib-blender",
    kind: "blender",
    label: "Blender render 01",
    durationSec: 8,
    src: "",
    note: "Placeholder swatch until a Blender export URL is attached.",
  },
  {
    id: "lib-generated",
    kind: "generated",
    label: "fal.ai generation 01",
    durationSec: 6,
    src: "",
    note: "Fail-open: generates nothing until fal.ai is wired; draws a swatch.",
  },
  {
    id: "lib-music",
    kind: "music",
    label: "Music bed 01",
    durationSec: 30,
    src: "",
    note: "Drawn as a level meter; no audio is fetched.",
  },
  {
    id: "lib-voiceover",
    kind: "voiceover",
    label: "Voiceover take 01",
    durationSec: 14,
    src: "",
    note: "Drawn as a level meter; no audio is fetched.",
  },
];

export function buildSeedTimeline(): NleTimeline {
  return {
    version: 1,
    title: "Untitled Mogul Cut",
    fps: 60,
    durationSec: 60,
    tracks: [
      {
        id: "track-v1",
        label: "V1 · Gameplay",
        kind: "video",
        clips: [
          {
            id: "seed-v1-a",
            kind: "gameplay",
            label: "Gameplay capture 01",
            startSec: 0,
            durationSec: 12,
            src: "",
          },
          {
            id: "seed-v1-b",
            kind: "gameplay",
            label: "Gameplay capture 02",
            startSec: 14,
            durationSec: 12,
            src: "",
          },
        ],
      },
      {
        id: "track-v2",
        label: "V2 · Overlay",
        kind: "video",
        clips: [
          {
            id: "seed-v2-a",
            kind: "generated",
            label: "fal.ai generation 01",
            startSec: 4,
            durationSec: 6,
            src: "",
          },
        ],
      },
      {
        id: "track-a1",
        label: "A1 · Music",
        kind: "audio",
        clips: [
          {
            id: "seed-a1-a",
            kind: "music",
            label: "Music bed 01",
            startSec: 0,
            durationSec: 30,
            src: "",
          },
        ],
      },
      {
        id: "track-a2",
        label: "A2 · Voice",
        kind: "audio",
        clips: [
          {
            id: "seed-a2-a",
            kind: "voiceover",
            label: "Voiceover take 01",
            startSec: 6,
            durationSec: 14,
            src: "",
          },
        ],
      },
    ],
  };
}

export function buildRenderPayload(timeline: NleTimeline): RenderExportPayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    target: { endpoint: RENDER_ENDPOINT, profile: RENDER_PROFILE },
    timeline,
  };
}

/** Light fail-open validator: invalid rows are rejected by the caller, never thrown. */
export function isNleTimeline(value: unknown): value is NleTimeline {
  if (typeof value !== "object" || value === null) return false;
  const t = value as Partial<NleTimeline>;
  return (
    t.version === 1 &&
    typeof t.title === "string" &&
    typeof t.fps === "number" &&
    typeof t.durationSec === "number" &&
    Array.isArray(t.tracks)
  );
}
