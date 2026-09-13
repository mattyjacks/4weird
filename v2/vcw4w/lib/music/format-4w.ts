/**
 * lib/music/format-4w.ts - normative 4W-1 song+SFX format (DS-MUS-01).
 *
 * Pure TS, SSR-safe, zero imports, ASCII-only. No DOM, no Node, no Date,
 * no Math.random - deterministic canonical JSON only.
 *
 * 4W-1 CONTRACT (normative for all DS-MUS):
 *   Song4W = { v: 1, title: string, bpm: 40-240, tracks: Track4W[<=8] }
 *   Track4W = { wave: 'square'|'saw'|'tri'|'sine'|'noise', vol?: 0..1,
 *               notes: Note4W[<=512] }
 *   Note4W = { t: start beats, n: MIDI 0-127, d: len beats, v?: 0..1 }
 *   song JSON <= 8192 bytes.
 *   Sfx4W = { v: 1, name: string,
 *             kind: 'raygun'|'death'|'putt'|'coin'|'hit'|'jump'|'win'|
 *                   'lose'|'click'|'alarm',
 *             steps: [{ wave, freq, freqEnd, dur, vol, type: 'tone'|'noise' }] }
 *   sfx JSON <= 1024 bytes.
 *
 * Validation is fail-closed: validateSong/validateSfx return
 * { ok, errors[] } and reject unknown keys, wrong types, out-of-range
 * values, and oversize payloads. decodeSong/decodeSfx are fail-open:
 * they never throw and return { ok, song/sfx?, errors[] } instead.
 */

// ---------------------------------------------------------------------------
// Budget + limit constants
// ---------------------------------------------------------------------------

/** 4W-1 format version. Only 1 is accepted. */
export const FORMAT_VERSION = 1;

/** Max canonical JSON bytes for a song. */
export const MAX_SONG_BYTES = 8192;

/** Max canonical JSON bytes for an SFX. */
export const MAX_SFX_BYTES = 1024;

/** Max tracks per song. */
export const MAX_TRACKS = 8;

/** Max notes per track. */
export const MAX_NOTES_PER_TRACK = 512;

/** Max steps per SFX. Songs carry the notes; SFX steps are tiny. */
export const MAX_SFX_STEPS = 32;

/** Max title/name chars (keeps payloads well inside byte budgets). */
export const MAX_TITLE_CHARS = 120;
export const MAX_SFX_NAME_CHARS = 80;

/** Beats bounds for notes. */
export const MAX_BEATS = 4096;
export const MAX_NOTE_LEN_BEATS = 256;

/** Audible step bounds for SFX (Hz / seconds). */
export const MIN_STEP_HZ = 20;
export const MAX_STEP_HZ = 20000;
export const MAX_STEP_DUR = 4;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TrackWave4W = "square" | "saw" | "tri" | "sine" | "noise";

export type SfxKind4W =
  | "raygun"
  | "death"
  | "putt"
  | "coin"
  | "hit"
  | "jump"
  | "win"
  | "lose"
  | "click"
  | "alarm";

export type SfxStepType4W = "tone" | "noise";

export interface Note4W {
  /** Start time in beats. */
  t: number;
  /** MIDI pitch 0-127. */
  n: number;
  /** Length in beats. */
  d: number;
  /** Velocity 0..1 (optional). */
  v?: number;
}

export interface Track4W {
  wave: TrackWave4W;
  /** Master volume 0..1 (optional). */
  vol?: number;
  notes: Note4W[];
}

export interface Song4W {
  v: 1;
  title: string;
  /** Beats per minute, 40-240. */
  bpm: number;
  tracks: Track4W[];
}

export interface SfxStep4W {
  wave: TrackWave4W;
  /** Start frequency in Hz. */
  freq: number;
  /** End frequency in Hz. */
  freqEnd: number;
  /** Duration in seconds. */
  dur: number;
  /** Volume 0..1. */
  vol: number;
  type: SfxStepType4W;
}

export interface Sfx4W {
  v: 1;
  name: string;
  kind: SfxKind4W;
  steps: SfxStep4W[];
}

export interface SongValidation {
  ok: boolean;
  errors: string[];
}

export interface SfxValidation {
  ok: boolean;
  errors: string[];
}

export interface SongDecodeResult extends SongValidation {
  song?: Song4W;
}

export interface SfxDecodeResult extends SfxValidation {
  sfx?: Sfx4W;
}

// ---------------------------------------------------------------------------
// Allow-lists
// ---------------------------------------------------------------------------

export const TRACK_WAVES: readonly TrackWave4W[] = [
  "square",
  "saw",
  "tri",
  "sine",
  "noise",
];

export const SFX_KINDS: readonly SfxKind4W[] = [
  "raygun",
  "death",
  "putt",
  "coin",
  "hit",
  "jump",
  "win",
  "lose",
  "click",
  "alarm",
];

export const SFX_STEP_TYPES: readonly SfxStepType4W[] = ["tone", "noise"];

const SONG_KEYS = ["v", "title", "bpm", "tracks"];
const TRACK_KEYS = ["wave", "vol", "notes"];
const NOTE_KEYS = ["t", "n", "d", "v"];
const SFX_KEYS = ["v", "name", "kind", "steps"];
const SFX_STEP_KEYS = ["wave", "freq", "freqEnd", "dur", "vol", "type"];

// ---------------------------------------------------------------------------
// Small helpers (no imports, no globals beyond Math/JSON)
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function inRange(value: number, lo: number, hi: number): boolean {
  return value >= lo && value <= hi;
}

function checkNoExtraKeys(
  obj: Record<string, unknown>,
  allowed: string[],
  label: string,
  errors: string[],
): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) {
      errors.push(label + ": unknown key '" + key + "'");
    }
  }
}

function isAscii(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) > 127) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Validators (fail-closed)
// ---------------------------------------------------------------------------

function validateNote(note: unknown, path: string, errors: string[]): void {
  if (!isRecord(note)) {
    errors.push(path + ": note must be an object");
    return;
  }
  checkNoExtraKeys(note, NOTE_KEYS, path, errors);
  if (!isFiniteNumber(note.t) || !inRange(note.t, 0, MAX_BEATS)) {
    errors.push(path + ".t: must be a finite number 0.." + MAX_BEATS);
  }
  if (!isInt(note.n) || !inRange(note.n, 0, 127)) {
    errors.push(path + ".n: must be an integer 0..127");
  }
  if (
    !isFiniteNumber(note.d) ||
    !(note.d > 0) ||
    !inRange(note.d, 0, MAX_NOTE_LEN_BEATS)
  ) {
    errors.push(path + ".d: must be a finite number >0 .." + MAX_NOTE_LEN_BEATS);
  }
  if (note.v !== undefined && (!isFiniteNumber(note.v) || !inRange(note.v, 0, 1))) {
    errors.push(path + ".v: must be a number 0..1");
  }
}

function validateTrack(track: unknown, path: string, errors: string[]): void {
  if (!isRecord(track)) {
    errors.push(path + ": track must be an object");
    return;
  }
  checkNoExtraKeys(track, TRACK_KEYS, path, errors);
  if (typeof track.wave !== "string" || !TRACK_WAVES.includes(track.wave as TrackWave4W)) {
    errors.push(path + ".wave: must be one of " + TRACK_WAVES.join("|"));
  }
  if (
    track.vol !== undefined &&
    (!isFiniteNumber(track.vol) || !inRange(track.vol, 0, 1))
  ) {
    errors.push(path + ".vol: must be a number 0..1");
  }
  if (!Array.isArray(track.notes)) {
    errors.push(path + ".notes: must be an array");
    return;
  }
  if (track.notes.length > MAX_NOTES_PER_TRACK) {
    errors.push(
      path + ".notes: max " + MAX_NOTES_PER_TRACK + " notes, got " + track.notes.length,
    );
  }
  for (let i = 0; i < track.notes.length; i++) {
    validateNote(track.notes[i], path + ".notes[" + i + "]", errors);
  }
}

/**
 * Fail-closed song validator. Returns { ok, errors[] }; never throws.
 * Also enforces the 8192-byte canonical-JSON budget.
 */
export function validateSong(song: unknown): SongValidation {
  const errors: string[] = [];
  if (!isRecord(song)) {
    return { ok: false, errors: ["song: must be an object"] };
  }
  checkNoExtraKeys(song, SONG_KEYS, "song", errors);
  if (song.v !== FORMAT_VERSION) {
    errors.push("song.v: must be 1");
  }
  if (typeof song.title !== "string" || song.title.length === 0) {
    errors.push("song.title: must be a non-empty string");
  } else {
    if (song.title.length > MAX_TITLE_CHARS) {
      errors.push("song.title: max " + MAX_TITLE_CHARS + " chars");
    }
    if (!isAscii(song.title)) {
      errors.push("song.title: must be ASCII-only");
    }
  }
  if (!isFiniteNumber(song.bpm) || !inRange(song.bpm, 40, 240)) {
    errors.push("song.bpm: must be a number 40..240");
  }
  if (!Array.isArray(song.tracks)) {
    errors.push("song.tracks: must be an array");
  } else {
    if (song.tracks.length > MAX_TRACKS) {
      errors.push(
        "song.tracks: max " + MAX_TRACKS + " tracks, got " + song.tracks.length,
      );
    }
    for (let i = 0; i < song.tracks.length; i++) {
      validateTrack(song.tracks[i], "song.tracks[" + i + "]", errors);
    }
  }
  if (errors.length === 0) {
    const bytes = sizeOf(song);
    if (bytes > MAX_SONG_BYTES) {
      errors.push("song: JSON " + bytes + " bytes exceeds " + MAX_SONG_BYTES);
    }
  }
  return { ok: errors.length === 0, errors };
}

function validateSfxStep(step: unknown, path: string, errors: string[]): void {
  if (!isRecord(step)) {
    errors.push(path + ": step must be an object");
    return;
  }
  checkNoExtraKeys(step, SFX_STEP_KEYS, path, errors);
  if (typeof step.wave !== "string" || !TRACK_WAVES.includes(step.wave as TrackWave4W)) {
    errors.push(path + ".wave: must be one of " + TRACK_WAVES.join("|"));
  }
  if (!isFiniteNumber(step.freq) || !inRange(step.freq, MIN_STEP_HZ, MAX_STEP_HZ)) {
    errors.push(path + ".freq: must be " + MIN_STEP_HZ + ".." + MAX_STEP_HZ);
  }
  if (
    !isFiniteNumber(step.freqEnd) ||
    !inRange(step.freqEnd, MIN_STEP_HZ, MAX_STEP_HZ)
  ) {
    errors.push(path + ".freqEnd: must be " + MIN_STEP_HZ + ".." + MAX_STEP_HZ);
  }
  if (!isFiniteNumber(step.dur) || !(step.dur > 0) || step.dur > MAX_STEP_DUR) {
    errors.push(path + ".dur: must be >0.." + MAX_STEP_DUR + " seconds");
  }
  if (!isFiniteNumber(step.vol) || !inRange(step.vol, 0, 1)) {
    errors.push(path + ".vol: must be a number 0..1");
  }
  if (typeof step.type !== "string" || !SFX_STEP_TYPES.includes(step.type as SfxStepType4W)) {
    errors.push(path + ".type: must be one of " + SFX_STEP_TYPES.join("|"));
  }
}

/**
 * Fail-closed SFX validator. Returns { ok, errors[] }; never throws.
 * Also enforces the 1024-byte canonical-JSON budget.
 */
export function validateSfx(sfx: unknown): SfxValidation {
  const errors: string[] = [];
  if (!isRecord(sfx)) {
    return { ok: false, errors: ["sfx: must be an object"] };
  }
  checkNoExtraKeys(sfx, SFX_KEYS, "sfx", errors);
  if (sfx.v !== FORMAT_VERSION) {
    errors.push("sfx.v: must be 1");
  }
  if (typeof sfx.name !== "string" || sfx.name.length === 0) {
    errors.push("sfx.name: must be a non-empty string");
  } else {
    if (sfx.name.length > MAX_SFX_NAME_CHARS) {
      errors.push("sfx.name: max " + MAX_SFX_NAME_CHARS + " chars");
    }
    if (!isAscii(sfx.name)) {
      errors.push("sfx.name: must be ASCII-only");
    }
  }
  if (typeof sfx.kind !== "string" || !SFX_KINDS.includes(sfx.kind as SfxKind4W)) {
    errors.push("sfx.kind: must be one of " + SFX_KINDS.join("|"));
  }
  if (!Array.isArray(sfx.steps)) {
    errors.push("sfx.steps: must be an array");
  } else {
    if (sfx.steps.length > MAX_SFX_STEPS) {
      errors.push(
        "sfx.steps: max " + MAX_SFX_STEPS + " steps, got " + sfx.steps.length,
      );
    }
    for (let i = 0; i < sfx.steps.length; i++) {
      validateSfxStep(sfx.steps[i], "sfx.steps[" + i + "]", errors);
    }
  }
  if (errors.length === 0) {
    const bytes = sizeOf(sfx);
    if (bytes > MAX_SFX_BYTES) {
      errors.push("sfx: JSON " + bytes + " bytes exceeds " + MAX_SFX_BYTES);
    }
  }
  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Canonical encode / decode (compact JSON, fixed key order)
// ---------------------------------------------------------------------------

function canonNote(note: Note4W): Record<string, unknown> {
  const out: Record<string, unknown> = { d: note.d, n: note.n, t: note.t };
  if (note.v !== undefined) out.v = note.v;
  return out;
}

function canonTrack(track: Track4W): Record<string, unknown> {
  const out: Record<string, unknown> = {
    notes: track.notes.map(canonNote),
    wave: track.wave,
  };
  if (track.vol !== undefined) out.vol = track.vol;
  return out;
}

function canonSong(song: Song4W): Record<string, unknown> {
  const out: Record<string, unknown> = {
    bpm: song.bpm,
    title: song.title,
    tracks: song.tracks.map(canonTrack),
    v: song.v,
  };
  return out;
}

function canonSfxStep(step: SfxStep4W): Record<string, unknown> {
  return {
    dur: step.dur,
    freq: step.freq,
    freqEnd: step.freqEnd,
    type: step.type,
    vol: step.vol,
    wave: step.wave,
  };
}

function canonSfx(sfx: Sfx4W): Record<string, unknown> {
  return {
    kind: sfx.kind,
    name: sfx.name,
    steps: sfx.steps.map(canonSfxStep),
    v: sfx.v,
  };
}

/** Canonical compact JSON for a song (fixed key order, no whitespace). */
export function encodeSong(song: Song4W): string {
  return JSON.stringify(canonSong(song));
}

/** Canonical compact JSON for an SFX (fixed key order, no whitespace). */
export function encodeSfx(sfx: Sfx4W): string {
  return JSON.stringify(canonSfx(sfx));
}

/** Generic canonical encoder: canonicalizes known shapes, else JSON. */
export function encode(value: unknown): string {
  const songCheck = validateSong(value);
  if (songCheck.ok) return encodeSong(value as Song4W);
  const sfxCheck = validateSfx(value);
  if (sfxCheck.ok) return encodeSfx(value as Sfx4W);
  return JSON.stringify(value);
}

/**
 * Fail-open song parser: never throws. Returns { ok, song?, errors[] }.
 * Rejects malformed JSON, wrong shapes, and oversize payloads.
 */
export function decodeSong(json: unknown): SongDecodeResult {
  if (typeof json !== "string") {
    return { ok: false, errors: ["song: input must be a JSON string"] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, errors: ["song: invalid JSON"] };
  }
  const check = validateSong(parsed);
  if (!check.ok) return { ok: false, errors: check.errors };
  return { ok: true, errors: [], song: parsed as Song4W };
}

/**
 * Fail-open SFX parser: never throws. Returns { ok, sfx?, errors[] }.
 */
export function decodeSfx(json: unknown): SfxDecodeResult {
  if (typeof json !== "string") {
    return { ok: false, errors: ["sfx: input must be a JSON string"] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, errors: ["sfx: invalid JSON"] };
  }
  const check = validateSfx(parsed);
  if (!check.ok) return { ok: false, errors: check.errors };
  return { ok: true, errors: [], sfx: parsed as Sfx4W };
}

/** Generic fail-open decoder: tries song first, then SFX. Never throws. */
export function decode(
  json: unknown,
): { ok: boolean; errors: string[]; song?: Song4W; sfx?: Sfx4W } {
  const asSong = decodeSong(json);
  if (asSong.ok) return { ok: true, errors: [], song: asSong.song };
  const asSfx = decodeSfx(json);
  if (asSfx.ok) return { ok: true, errors: [], sfx: asSfx.sfx };
  return { ok: false, errors: [...asSong.errors, ...asSfx.errors] };
}

// ---------------------------------------------------------------------------
// Size, transpose, pitch helpers
// ---------------------------------------------------------------------------

/**
 * Canonical JSON byte size. Content is ASCII-only so length === bytes.
 * Falls back to compact JSON for non-song/SFX values; returns -1 when
 * the value cannot be serialized.
 */
export function sizeOf(value: unknown): number {
  try {
    let json: string;
    if (isRecord(value) && Array.isArray((value as Record<string, unknown>).tracks)) {
      json = encodeSong(value as unknown as Song4W);
    } else if (isRecord(value) && Array.isArray((value as Record<string, unknown>).steps)) {
      json = encodeSfx(value as unknown as Sfx4W);
    } else {
      const raw = JSON.stringify(value);
      if (typeof raw !== "string") return -1;
      json = raw;
    }
    return json.length;
  } catch {
    return -1;
  }
}

/** Byte size of a song's canonical JSON. -1 when unserializable. */
export function songByteSize(song: Song4W): number {
  try {
    return encodeSong(song).length;
  } catch {
    return -1;
  }
}

/** Byte size of an SFX's canonical JSON. -1 when unserializable. */
export function sfxByteSize(sfx: Sfx4W): number {
  try {
    return encodeSfx(sfx).length;
  } catch {
    return -1;
  }
}

/**
 * Transpose a song by semitones. Pure: returns a new Song4W, clamps
 * MIDI to 0..127. Throws only when the input fails validation.
 */
export function transpose(song: Song4W, semitones: number): Song4W {
  const check = validateSong(song);
  if (!check.ok) {
    throw new Error("transpose: invalid song (" + check.errors[0] + ")");
  }
  const shift = Math.trunc(semitones);
  return {
    v: 1,
    title: song.title,
    bpm: song.bpm,
    tracks: song.tracks.map((track) => ({
      wave: track.wave,
      ...(track.vol === undefined ? {} : { vol: track.vol }),
      notes: track.notes.map((note) => ({
        t: note.t,
        n: Math.min(127, Math.max(0, note.n + shift)),
        d: note.d,
        ...(note.v === undefined ? {} : { v: note.v }),
      })),
    })),
  };
}

/** MIDI note -> frequency in Hz (A4 = 440). Returns NaN for out-of-range. */
export function noteToFreq(midi: number): number {
  if (!isInt(midi) || midi < 0 || midi > 127) return NaN;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Frequency in Hz -> nearest MIDI note 0..127. Returns -1 when invalid. */
export function freqToNote(freq: number): number {
  if (!isFiniteNumber(freq) || freq <= 0) return -1;
  const midi = Math.round(69 + 12 * (Math.log(freq / 440) / Math.log(2)));
  if (midi < 0 || midi > 127) return -1;
  return midi;
}

// ---------------------------------------------------------------------------
// Aliases (fail-open parse entry points used across DS-MUS agents)
// ---------------------------------------------------------------------------

/** Alias of decodeSong (fail-open, never throws). */
export function parseSong(json: unknown): SongDecodeResult {
  return decodeSong(json);
}

/** Alias of decodeSfx (fail-open, never throws). */
export function parseSfx(json: unknown): SfxDecodeResult {
  return parseSfxInner(json);
}

function parseSfxInner(json: unknown): SfxDecodeResult {
  return decodeSfx(json);
}

// ---------------------------------------------------------------------------
// Canonical seed fixtures (2 tiny songs + 2 SFX, all inside budgets)
// ---------------------------------------------------------------------------

/** Tiny 8-note square lead + tri bass seed song. */
export const SEED_SONG_A: Song4W = {
  v: 1,
  title: "Seed A",
  bpm: 120,
  tracks: [
    {
      wave: "square",
      vol: 0.6,
      notes: [
        { t: 0, n: 60, d: 0.5 },
        { t: 0.5, n: 62, d: 0.5 },
        { t: 1, n: 64, d: 0.5 },
        { t: 1.5, n: 67, d: 0.5 },
        { t: 2, n: 69, d: 0.5 },
        { t: 2.5, n: 67, d: 0.5 },
        { t: 3, n: 64, d: 0.5 },
        { t: 3.5, n: 60, d: 0.5 },
      ],
    },
    {
      wave: "tri",
      vol: 0.5,
      notes: [
        { t: 0, n: 36, d: 1 },
        { t: 1, n: 43, d: 1 },
        { t: 2, n: 41, d: 1 },
        { t: 3, n: 36, d: 1 },
      ],
    },
  ],
};

/** Tiny sine arpeggio seed song. */
export const SEED_SONG_B: Song4W = {
  v: 1,
  title: "Seed B",
  bpm: 96,
  tracks: [
    {
      wave: "sine",
      vol: 0.7,
      notes: [
        { t: 0, n: 57, d: 0.25 },
        { t: 0.25, n: 60, d: 0.25 },
        { t: 0.5, n: 64, d: 0.25 },
        { t: 0.75, n: 69, d: 0.25 },
        { t: 1, n: 72, d: 0.5 },
        { t: 1.5, n: 69, d: 0.5 },
      ],
    },
  ],
};

/** Short coin blip seed SFX. */
export const SEED_SFX_COIN: Sfx4W = {
  v: 1,
  name: "Coin",
  kind: "coin",
  steps: [
    { wave: "sine", freq: 900, freqEnd: 1800, dur: 0.15, vol: 0.6, type: "tone" },
  ],
};

/** Short jump sweep seed SFX. */
export const SEED_SFX_JUMP: Sfx4W = {
  v: 1,
  name: "Jump",
  kind: "jump",
  steps: [
    { wave: "square", freq: 300, freqEnd: 900, dur: 0.25, vol: 0.5, type: "tone" },
  ],
};

/** Default song other agents can boot from (same as SEED_SONG_A). */
export const DEFAULT_SONG: Song4W = SEED_SONG_A;

/** Default SFX other agents can boot from (same as SEED_SFX_COIN). */
export const DEFAULT_SFX: Sfx4W = SEED_SFX_COIN;
