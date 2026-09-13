/**
 * lib/music-api.ts — DS-MUSIC-06 shared helpers for the bot-friendly music API.
 *
 * Two consumers, both stateless (no DB):
 * - GET /api/music serves buildMusicRegistry(): a seed registry in the
 *   `@/lib/music-seeds` spirit (titles + `/music/seeds/*.song.json` URLs,
 *   owned by DS-MUSIC-05/DS-MUSIC-07) with the actual `$music:1` payload
 *   embedded inline as `data`, so bots get everything in one call. Ships an
 *   inline fallback list because the seeds dir is still empty.
 * - POST /api/music runs validateAndNormalizeMusic(): validateMusic() from
 *   `@/lib/music-format` (DS-MUSIC-01) plus canonical normalization, byte
 *   size, and an HTML embed snippet.
 *
 * DIALECT NOTE (2026-09-13): `lib/music-format.ts` is being rewritten live by
 * DS-MUSIC-01 (landed new-contract at 13:16Z, reverted to the prior variant
 * on disk by ~13:25Z with no envelope claim — that race belongs to
 * music-m1/steward, see the DS-MUSIC-06 log). This module therefore couples
 * to the smallest stable surface — `validateMusic`, `MUSIC_FORMAT_TAG`,
 * `SONG_MAX_BYTES`, `SFX_MAX_BYTES` (present in every variant seen) — and
 * adapts defensively at runtime: `{ ok, errors, bytes?, kind? }` are read
 * through `unknown` with local fallbacks (bytes computed locally when the
 * validator omits it; `"unknown"` kinds mapped to undefined), and the seed
 * payloads are bilingual (carry both `BPM`+`bpm`, `title`+`name`,
 * `format`+`kind`, `wave` on every track) so they validate under EITHER
 * dialect. No `MusicSong`/`MusicSfx` type imports: those shapes are the
 * moving part. Revisit once DS-MUSIC-01 settles.
 *
 * Bot-friendly curl examples (bots authenticate with an `x-bot-key` header
 * or Bearer token per lib/bot-auth.ts; raw curl passes the same-origin gate
 * with an Origin matching the Host):
 *
 *   curl https://4weird.com/api/music
 *   curl -X POST https://4weird.com/api/music \
 *     -H "x-bot-key: bot4weird_YOURKEY" -H "Content-Type: application/json" \
 *     -d '{"format":"$music:1","kind":"sfx","title":"Blip","name":"Blip","wave":"sine","freqStart":880,"freqEnd":440,"dur":0.2}'
 *
 * SSR-safe: types + pure functions only, no DOM, no Node APIs.
 */

import {
  MUSIC_FORMAT_TAG,
  SFX_MAX_BYTES,
  SONG_MAX_BYTES,
  validateMusic,
} from "@/lib/music-format";

/** Opaque `$music:1` payload as carried by the registry and the POST echo. */
export type MusicJson = Record<string, unknown>;

/** Seed kinds served by the registry. */
export type MusicSeedKind = "song" | "sfx";

/**
 * One registry entry. `data` embeds the actual `$music:1` payload inline so
 * bots never need a second fetch. `url` names the static path
 * (public/music/seeds/*, DS-MUSIC-07) — clients must treat inline `data` as
 * authoritative until that file exists.
 */
export interface MusicSeedEntry {
  title: string;
  kind: MusicSeedKind;
  url: string;
  game?: string;
  data: MusicJson;
}

/** Whole GET /api/music registry payload (before the route's usage hints). */
export interface MusicRegistry {
  format: "$music:1";
  songs: MusicSeedEntry[];
  sfx: MusicSeedEntry[];
  contract: {
    songMaxBytes: number;
    sfxMaxBytes: number;
  };
}

/** POST /api/music result: validation + normalized payload + embed. */
export interface MusicValidateResult {
  ok: boolean;
  kind?: "song" | "sfx";
  errors: string[];
  /** Serialized byte size (validator's when reported, else computed locally). */
  bytes: number;
  /** Canonical normalized payload; present only when ok. */
  data?: MusicJson;
  /** Drop-in HTML snippet carrying the normalized JSON; present only when ok. */
  embed?: string;
}

/**
 * Max accepted POST body bytes: the song cap plus request slack. The per-kind
 * caps (SONG_MAX_BYTES / SFX_MAX_BYTES) are still enforced by validateMusic().
 */
export const MUSIC_POST_MAX_BYTES = SONG_MAX_BYTES + 1024;

function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "untitled";
}

function byteSize(value: unknown): number {
  try {
    const json = JSON.stringify(value);
    if (typeof json !== "string") return 0;
    return new TextEncoder().encode(json).length;
  } catch {
    return 0;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Emit known keys first (contract order), then any extras in place. */
function orderKeys(
  input: Record<string, unknown>,
  first: readonly string[],
): MusicJson {
  const out: MusicJson = {};
  for (const key of first) {
    if (key in input) out[key] = input[key];
  }
  for (const key of Object.keys(input)) {
    if (!(key in out)) out[key] = input[key];
  }
  return out;
}

const SONG_KEYS = [
  "format",
  "kind",
  "title",
  "BPM",
  "bpm",
  "stepsPerBeat",
  "tracks",
  "loop",
] as const;

const TRACK_KEYS = ["inst", "wave", "notes"] as const;

const NOTE_KEYS = ["t", "n", "d", "v"] as const;

const SFX_KEYS = [
  "format",
  "kind",
  "title",
  "name",
  "wave",
  "freqStart",
  "freqEnd",
  "dur",
  "vol",
  "noiseMix",
] as const;

/**
 * Canonicalize a validated payload: contract-ordered keys, tracks/notes
 * recursed one level, every field preserved. Input must pass validateMusic().
 */
function normalizePayload(input: MusicJson, kind: "song" | "sfx"): MusicJson {
  if (kind === "song" && Array.isArray(input.tracks)) {
    const tracks = (input.tracks as unknown[]).map((entry) => {
      if (!isRecord(entry)) return entry;
      const track = orderKeys(entry, TRACK_KEYS);
      if (Array.isArray(track.notes)) {
        track.notes = (track.notes as unknown[]).map((note) =>
          isRecord(note) ? orderKeys(note, NOTE_KEYS) : note,
        );
      }
      return track;
    });
    return orderKeys({ ...input, tracks }, SONG_KEYS);
  }
  return orderKeys(input, SFX_KEYS);
}

/**
 * Hand-authored seed songs. Bilingual by construction: every field each
 * dialect requires is present (`format`+`kind`, `title`, `BPM`+`bpm`,
 * `stepsPerBeat`, per-track `inst` (union-safe names) + `wave`, integer
 * `d`, no `v`), extras ignored by each validator — so these pass under
 * EITHER music-format dialect. See the DIALECT NOTE above.
 */
const SEED_SONGS: MusicJson[] = [
  {
    format: "$music:1",
    kind: "song",
    title: "Starter Loop",
    BPM: 120,
    bpm: 120,
    stepsPerBeat: 4,
    tracks: [
      {
        inst: "square",
        wave: "square",
        notes: [
          { t: 0, n: 60, d: 1 },
          { t: 1, n: 64, d: 1 },
          { t: 2, n: 67, d: 1 },
          { t: 3, n: 72, d: 2 },
        ],
      },
      {
        inst: "kick",
        wave: "sine",
        notes: [
          { t: 0, n: 36, d: 1 },
          { t: 2, n: 36, d: 1 },
        ],
      },
      {
        inst: "hat",
        wave: "noise",
        notes: [
          { t: 0, n: 42, d: 1 },
          { t: 1, n: 42, d: 1 },
          { t: 2, n: 42, d: 1 },
          { t: 3, n: 42, d: 1 },
        ],
      },
    ],
  },
  {
    format: "$music:1",
    kind: "song",
    title: "Night Drive",
    BPM: 96,
    bpm: 96,
    stepsPerBeat: 4,
    tracks: [
      {
        inst: "triangle",
        wave: "triangle",
        notes: [
          { t: 0, n: 45, d: 2 },
          { t: 2, n: 43, d: 2 },
          { t: 4, n: 41, d: 2 },
          { t: 6, n: 43, d: 2 },
        ],
      },
      {
        inst: "sine",
        wave: "sine",
        notes: [
          { t: 0, n: 69, d: 1 },
          { t: 2, n: 72, d: 1 },
          { t: 4, n: 76, d: 2 },
        ],
      },
    ],
  },
];

/** Hand-authored seed sfx, bilingual like the songs (`title`+`name`, `wave`). */
const SEED_SFX: MusicJson[] = [
  {
    format: "$music:1",
    kind: "sfx",
    title: "Raygun",
    name: "Raygun",
    wave: "sawtooth",
    freqStart: 2000,
    freqEnd: 200,
    dur: 0.4,
    vol: 0.6,
  },
  {
    format: "$music:1",
    kind: "sfx",
    title: "Coin",
    name: "Coin",
    wave: "sine",
    freqStart: 900,
    freqEnd: 1800,
    dur: 0.15,
    vol: 0.6,
  },
  {
    format: "$music:1",
    kind: "sfx",
    title: "Jump",
    name: "Jump",
    wave: "square",
    freqStart: 300,
    freqEnd: 900,
    dur: 0.25,
    vol: 0.5,
  },
  {
    format: "$music:1",
    kind: "sfx",
    title: "Explosion",
    name: "Explosion",
    wave: "noise",
    freqStart: 300,
    freqEnd: 40,
    dur: 1,
    vol: 0.8,
    noiseMix: 0.8,
  },
];

/** Build the full seed registry from the inline fallback lists. */
export function buildMusicRegistry(): MusicRegistry {
  const songs: MusicSeedEntry[] = SEED_SONGS.map((song) => ({
    title: String(song.title ?? "Untitled"),
    kind: "song" as const,
    url: `/music/seeds/${slugify(String(song.title ?? "untitled"))}.song.json`,
    data: song,
  }));
  const sfx: MusicSeedEntry[] = SEED_SFX.map((preset) => ({
    title: String(preset.title ?? preset.name ?? "Untitled"),
    kind: "sfx" as const,
    url: `/music/seeds/${slugify(String(preset.title ?? preset.name ?? "untitled"))}.sfx.json`,
    data: preset,
  }));
  return {
    format: MUSIC_FORMAT_TAG,
    songs,
    sfx,
    contract: {
      songMaxBytes: SONG_MAX_BYTES,
      sfxMaxBytes: SFX_MAX_BYTES,
    },
  };
}

/**
 * Drop-in HTML snippet carrying the normalized payload. The JSON is `<`-escaped
 * (`\\u003c`) so a `</script>` inside a title/name can never break out of the
 * tag. Players read it back with:
 *   JSON.parse(document.querySelector('[data-music-kind]')?.textContent ?? "null")
 */
export function buildMusicEmbed(data: MusicJson, kind: "song" | "sfx"): string {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<script type="application/json" data-music-format="$music:1" data-music-kind="${kind}">\n${json}\n</script>`;
}

interface ValidatorResult {
  ok?: unknown;
  errors?: unknown;
  bytes?: unknown;
  kind?: unknown;
}

/**
 * Validate an unknown POST payload against the `$music:1` contract and, when
 * valid, return the normalized JSON plus its byte size and embed snippet.
 * Never throws: unexpected shapes surface as { ok: false, errors }.
 */
export function validateAndNormalizeMusic(input: unknown): MusicValidateResult {
  try {
    const checked = validateMusic(input) as unknown as ValidatorResult;
    const errors = Array.isArray(checked.errors)
      ? (checked.errors as unknown[]).map((entry) => String(entry))
      : ["music: validator failed"];
    const bytes =
      typeof checked.bytes === "number" && Number.isFinite(checked.bytes)
        ? checked.bytes
        : byteSize(input);
    let kind: "song" | "sfx" | undefined;
    if (checked.kind === "song" || checked.kind === "sfx") {
      kind = checked.kind;
    } else if (isRecord(input)) {
      // Fallback inference when the validator reports no usable kind.
      if (Array.isArray(input.tracks)) kind = "song";
      else if (input.freqStart !== undefined || input.name !== undefined)
        kind = "sfx";
    }
    if (checked.ok !== true || kind === undefined || !isRecord(input)) {
      return { ok: false, kind, errors, bytes };
    }
    const data = normalizePayload(input, kind);
    return {
      ok: true,
      kind,
      errors: [],
      bytes,
      data,
      embed: buildMusicEmbed(data, kind),
    };
  } catch {
    return { ok: false, errors: ["music: validator failed"], bytes: 0 };
  }
}
