/**
 * lib/music-format.ts — authoritative `$music:1` ultra-small song + SFX format.
 *
 * USAGE (any tool team — music players, game BGM, tiny generative loops):
 *   import { validateMusic, SONG_MAX_BYTES, SFX_MAX_BYTES } from "@/lib/music-format";
 *   const r = validateMusic(payload);   // { ok, kind?, errors[] } — never throws
 *   if (!r.ok) console.error(r.errors);
 *
 * CONTRACT:
 * - Magic version tag `$music:1`. validateMusic() accepts ONLY format "$music:1".
 * - Fail-open validation: validateMusic() returns { ok, kind?, errors[] } with one
 *   entry per problem found; it never throws on malformed input.
 * - Song = { format, kind: "song", title (non-empty string), BPM (40-240),
 *   stepsPerBeat? (default 4, positive int), tracks: 1+ of
 *   { inst (MusicInst), notes: { t (int >= 0), n (0-127), d (positive int),
 *   v? (0-127) }[] } }.
 * - SFX = { format, kind: "sfx", title (string), wave (MusicWave),
 *   freqStart/freqEnd (positive numbers), dur (positive, <= 4s),
 *   vol? (0-1), noiseMix? (0-1) }.
 * - Tiny-file promise: songs stay pocket-size (<= 64 KiB serialized) and SFX stay
 *   whisper-size (<= 2 KiB serialized), so they embed directly in game bundles,
 *   save files, and QR-friendly payloads without a download step.
 *
 * MINIMAL SONG EXAMPLE:
 *   { "format": "$music:1", "kind": "song", "title": "Hi", "BPM": 120,
 *     "tracks": [{ "inst": "square", "notes": [{ "t": 0, "n": 60, "d": 1 }] }] }
 *
 * MINIMAL SFX EXAMPLE:
 *   { "format": "$music:1", "kind": "sfx", "title": "Blip", "wave": "sine",
 *     "freqStart": 880, "freqEnd": 440, "dur": 0.2 }
 *
 * SSR-safe: types + pure functions only, no DOM, no Node APIs.
 */

export const MUSIC_FORMAT_TAG = "$music:1";

/** Max serialized bytes for a song payload (JSON.stringify length). */
export const SONG_MAX_BYTES = 65536;

/** Max serialized bytes for an sfx payload (JSON.stringify length). */
export const SFX_MAX_BYTES = 2048;

export type MusicInst =
  | "square"
  | "triangle"
  | "sawtooth"
  | "sine"
  | "noise"
  | "kick"
  | "snare"
  | "hat";

export type MusicWave = "square" | "sawtooth" | "triangle" | "sine" | "noise";

export interface MusicNote {
  /** Step offset from track start. Integer >= 0. */
  t: number;
  /** MIDI note number, 0-127. */
  n: number;
  /** Duration in steps. Positive integer. */
  d: number;
  /** Velocity 0-127. */
  v?: number;
}

export interface MusicTrack {
  inst: MusicInst;
  notes: MusicNote[];
}

export interface MusicSong {
  format: "$music:1";
  kind: "song";
  title: string;
  BPM: number;
  /** Steps per beat. Defaults to 4 when omitted. */
  stepsPerBeat?: number;
  tracks: MusicTrack[];
}

export interface MusicSfx {
  format: "$music:1";
  kind: "sfx";
  title: string;
  wave: MusicWave;
  freqStart: number;
  freqEnd: number;
  /** Duration in seconds. Positive, max 4. */
  dur: number;
  /** Volume 0-1. */
  vol?: number;
  /** Noise blend 0-1. */
  noiseMix?: number;
}

export interface MusicValidation {
  ok: boolean;
  kind?: "song" | "sfx";
  errors: string[];
}

const MUSIC_INSTS: readonly MusicInst[] = [
  "square",
  "triangle",
  "sawtooth",
  "sine",
  "noise",
  "kick",
  "snare",
  "hat",
];

const MUSIC_WAVES: readonly MusicWave[] = [
  "square",
  "sawtooth",
  "triangle",
  "sine",
  "noise",
];

const SONG_BPM_MIN = 40;
const SONG_BPM_MAX = 240;
const SFX_MAX_DUR = 4;
const DEFAULT_STEPS_PER_BEAT = 4;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isIntInRange(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

function isUnitRange(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

function validateSong(input: Record<string, unknown>, errors: string[]): void {
  if (typeof input.title !== "string" || input.title.trim().length === 0) {
    errors.push("music.song: title must be a non-empty string");
  }
  const bpm = input.BPM;
  if (!isFiniteNumber(bpm) || bpm < SONG_BPM_MIN || bpm > SONG_BPM_MAX) {
    errors.push(
      `music.song: BPM must be a number between ${SONG_BPM_MIN} and ${SONG_BPM_MAX}`,
    );
  }
  if (input.stepsPerBeat !== undefined && !isPositiveInt(input.stepsPerBeat)) {
    errors.push(
      `music.song: stepsPerBeat must be a positive integer (default ${DEFAULT_STEPS_PER_BEAT})`,
    );
  }
  const tracks = input.tracks;
  if (!Array.isArray(tracks) || tracks.length < 1) {
    errors.push("music.song: tracks must be a non-empty array");
    return;
  }
  tracks.forEach((track: unknown, ti: number) => {
    const where = `music.song: tracks[${ti}]`;
    if (!isRecord(track)) {
      errors.push(`${where} must be an object`);
      return;
    }
    if (
      typeof track.inst !== "string" ||
      !(MUSIC_INSTS as readonly string[]).includes(track.inst)
    ) {
      errors.push(`${where}.inst must be one of ${MUSIC_INSTS.join("|")}`);
    }
    if (!Array.isArray(track.notes)) {
      errors.push(`${where}.notes must be an array`);
      return;
    }
    track.notes.forEach((note: unknown, ni: number) => {
      const nwhere = `${where}.notes[${ni}]`;
      if (!isRecord(note)) {
        errors.push(`${nwhere} must be an object`);
        return;
      }
      if (!isIntInRange(note.t, 0, Number.MAX_SAFE_INTEGER)) {
        errors.push(`${nwhere}.t must be an integer >= 0`);
      }
      if (!isIntInRange(note.n, 0, 127)) {
        errors.push(`${nwhere}.n must be an integer 0-127`);
      }
      if (!isPositiveInt(note.d)) {
        errors.push(`${nwhere}.d must be a positive integer`);
      }
      if (note.v !== undefined && !isIntInRange(note.v, 0, 127)) {
        errors.push(`${nwhere}.v must be an integer 0-127 when present`);
      }
    });
  });
}

function validateSfx(input: Record<string, unknown>, errors: string[]): void {
  if (typeof input.title !== "string") {
    errors.push("music.sfx: title must be a string");
  }
  if (
    typeof input.wave !== "string" ||
    !(MUSIC_WAVES as readonly string[]).includes(input.wave)
  ) {
    errors.push(`music.sfx: wave must be one of ${MUSIC_WAVES.join("|")}`);
  }
  if (!isFiniteNumber(input.freqStart) || input.freqStart <= 0) {
    errors.push("music.sfx: freqStart must be a positive number");
  }
  if (!isFiniteNumber(input.freqEnd) || input.freqEnd <= 0) {
    errors.push("music.sfx: freqEnd must be a positive number");
  }
  const dur = input.dur;
  if (!isFiniteNumber(dur) || dur <= 0 || dur > SFX_MAX_DUR) {
    errors.push(`music.sfx: dur must be a positive number <= ${SFX_MAX_DUR}`);
  }
  if (input.vol !== undefined && !isUnitRange(input.vol)) {
    errors.push("music.sfx: vol must be a number 0-1 when present");
  }
  if (input.noiseMix !== undefined && !isUnitRange(input.noiseMix)) {
    errors.push("music.sfx: noiseMix must be a number 0-1 when present");
  }
}

/**
 * Validate an unknown payload against the `$music:1` contract.
 * Returns one error per problem found; never throws.
 */
export function validateMusic(input: unknown): MusicValidation {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: ["music: must be an object"] };
  }
  if (input.format !== MUSIC_FORMAT_TAG) {
    errors.push('music: format must be "$music:1"');
  }
  const kind = input.kind;
  if (kind !== "song" && kind !== "sfx") {
    errors.push('music: kind must be "song" or "sfx"');
    return { ok: false, errors };
  }
  if (kind === "song") {
    validateSong(input, errors);
  } else {
    validateSfx(input, errors);
  }
  let bytes: number | null = null;
  try {
    const json = JSON.stringify(input);
    bytes = typeof json === "string" ? json.length : 0;
  } catch {
    errors.push("music: payload is not JSON-serializable");
  }
  if (bytes !== null) {
    const cap = kind === "song" ? SONG_MAX_BYTES : SFX_MAX_BYTES;
    if (bytes > cap) {
      errors.push(`music: ${kind} exceeds ${cap} bytes (got ${bytes})`);
    }
  }
  if (errors.length === 0) {
    return { ok: true, kind, errors };
  }
  return { ok: false, kind, errors };
}
