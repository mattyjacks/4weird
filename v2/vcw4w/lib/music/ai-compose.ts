/**
 * lib/music/ai-compose.ts - Pure-AI stochastic composer, wild mode (DS-MUSDUB-07).
 *
 * Pure functions, SSR-safe, ASCII-only, zero imports (no music-lib imports).
 * Seeded PRNG + weighted random walks + Markov-ish pitch transitions.
 * Chaos knob 0..1 blends consonance into dissonance.
 * Every exit path is clamped and locally validated, so any chaos level
 * yields a valid structural song JSON shape.
 */

// ---------------------------------------------------------------------------
// Local structural types (mirrors the 4W-1 song shape, defined locally)
// ---------------------------------------------------------------------------

export interface AiNote {
  t: number;
  n: number;
  d: number;
  v?: number;
}

export interface AiTrack {
  wave: "square" | "saw" | "tri" | "sine" | "noise";
  vol?: number;
  notes: AiNote[];
}

export interface AiSong {
  v: 1;
  title: string;
  bpm: number;
  tracks: AiTrack[];
}

export interface AiValidation {
  ok: boolean;
  errors: string[];
}

export interface AiComposeOptions {
  seed: number;
  chaos: number;
  title?: string;
  bars?: number;
  bpm?: number;
}

// ---------------------------------------------------------------------------
// Local limits (same budgets as the 4W-1 contract)
// ---------------------------------------------------------------------------

const MAX_TRACKS = 8;
const MAX_NOTES_PER_TRACK = 512;
const MAX_SONG_BYTES = 8192;
const MAX_TITLE_CHARS = 120;
const MAX_BEATS = 4096;
const MAX_NOTE_LEN = 256;
const MIN_BPM = 40;
const MAX_BPM = 240;

const WAVES: readonly AiTrack["wave"][] = ["square", "saw", "tri", "sine", "noise"];

// Consonant pitch-class set (C major, no accidentals); chaos blends toward uniform chromatic.
const CONSONANT_PC = [0, 2, 4, 5, 7, 9, 11];

// Markov-ish step table in semitones: small steps first, wild leaps last.
const STEP_TABLE = [0, 1, 2, -1, -2, 3, -3, 4, -4, 5, -5, 6, 7, -7, 9, -9, 11, -11, 12, -12];

// ---------------------------------------------------------------------------
// Small pure helpers
// ---------------------------------------------------------------------------

export function clampChaos(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0.5;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function clampInt(value: number, lo: number, hi: number): number {
  const t = Math.trunc(value);
  if (!Number.isFinite(t)) return lo;
  if (t < lo) return lo;
  if (t > hi) return hi;
  return t;
}

function clampNum(value: number, lo: number, hi: number): number {
  if (!Number.isFinite(value)) return lo;
  if (value < lo) return lo;
  if (value > hi) return hi;
  return value;
}

function toAscii(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 32 && c <= 126) out += s.charAt(i);
  }
  return out;
}

function cleanTitle(title: unknown, fallback: string): string {
  if (typeof title === "string" && title.length > 0) {
    const ascii = toAscii(title).trim();
    if (ascii.length > 0) return ascii.slice(0, MAX_TITLE_CHARS);
  }
  return fallback;
}

/** Seeded PRNG (mulberry32). Pure: same seed yields the same stream. */
export function createRng(seed: number): () => number {
  let a = clampInt(seed, -2147483648, 2147483647) >>> 0;
  if (a === 0) a = 0x9e3779b9;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted(rng: () => number, weights: readonly number[]): number {
  let total = 0;
  for (const w of weights) total += w > 0 ? w : 0;
  if (total <= 0) return 0;
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    const w = weights[i] > 0 ? weights[i] : 0;
    r -= w;
    if (r < 0) return i;
  }
  return weights.length - 1;
}

// ---------------------------------------------------------------------------
// Local validator (fail-closed, never throws)
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateAiSong(song: unknown): AiValidation {
  const errors: string[] = [];
  if (!isRecord(song)) return { ok: false, errors: ["song: must be an object"] };
  const keys = Object.keys(song);
  for (const k of keys) {
    if (k !== "v" && k !== "title" && k !== "bpm" && k !== "tracks") {
      errors.push("song: unknown key '" + k + "'");
    }
  }
  if (song.v !== 1) errors.push("song.v: must be 1");
  if (typeof song.title !== "string" || song.title.length === 0) {
    errors.push("song.title: must be a non-empty string");
  } else {
    if (song.title.length > MAX_TITLE_CHARS) errors.push("song.title: max 120 chars");
    if (toAscii(song.title) !== song.title) errors.push("song.title: must be ASCII-only");
  }
  if (typeof song.bpm !== "number" || !Number.isFinite(song.bpm) || song.bpm < MIN_BPM || song.bpm > MAX_BPM) {
    errors.push("song.bpm: must be a number 40..240");
  }
  if (!Array.isArray(song.tracks)) {
    errors.push("song.tracks: must be an array");
  } else {
    if (song.tracks.length === 0) errors.push("song.tracks: must have 1..8 tracks");
    if (song.tracks.length > MAX_TRACKS) errors.push("song.tracks: max 8 tracks");
    for (let i = 0; i < song.tracks.length && i < MAX_TRACKS; i++) {
      const tr = song.tracks[i] as unknown;
      const path = "song.tracks[" + i + "]";
      if (!isRecord(tr)) {
        errors.push(path + ": track must be an object");
        continue;
      }
      for (const k of Object.keys(tr)) {
        if (k !== "wave" && k !== "vol" && k !== "notes") errors.push(path + ": unknown key '" + k + "'");
      }
      if (typeof tr.wave !== "string" || !WAVES.includes(tr.wave as AiTrack["wave"])) {
        errors.push(path + ".wave: must be one of square|saw|tri|sine|noise");
      }
      if (tr.vol !== undefined && (typeof tr.vol !== "number" || !Number.isFinite(tr.vol) || tr.vol < 0 || tr.vol > 1)) {
        errors.push(path + ".vol: must be a number 0..1");
      }
      if (!Array.isArray(tr.notes)) {
        errors.push(path + ".notes: must be an array");
        continue;
      }
      if ((tr.notes as unknown[]).length > MAX_NOTES_PER_TRACK) {
        errors.push(path + ".notes: max 512 notes");
      }
      const notes = tr.notes as unknown[];
      for (let j = 0; j < notes.length && j < MAX_NOTES_PER_TRACK; j++) {
        const nt = notes[j] as unknown;
        const np = path + ".notes[" + j + "]";
        if (!isRecord(nt)) {
          errors.push(np + ": note must be an object");
          continue;
        }
        for (const k of Object.keys(nt)) {
          if (k !== "t" && k !== "n" && k !== "d" && k !== "v") errors.push(np + ": unknown key '" + k + "'");
        }
        if (typeof nt.t !== "number" || !Number.isFinite(nt.t) || nt.t < 0 || nt.t > MAX_BEATS) {
          errors.push(np + ".t: must be 0.." + MAX_BEATS);
        }
        if (typeof nt.n !== "number" || !Number.isInteger(nt.n) || nt.n < 0 || nt.n > 127) {
          errors.push(np + ".n: must be an integer 0..127");
        }
        if (typeof nt.d !== "number" || !Number.isFinite(nt.d) || !(nt.d > 0) || nt.d > MAX_NOTE_LEN) {
          errors.push(np + ".d: must be >0..256");
        }
        if (nt.v !== undefined && (typeof nt.v !== "number" || !Number.isFinite(nt.v) || nt.v < 0 || nt.v > 1)) {
          errors.push(np + ".v: must be 0..1");
        }
      }
    }
  }
  if (errors.length === 0) {
    try {
      const bytes = JSON.stringify(song).length;
      if (bytes > MAX_SONG_BYTES) errors.push("song: JSON " + bytes + " bytes exceeds 8192");
    } catch {
      errors.push("song: unserializable");
    }
  }
  return { ok: errors.length === 0, errors };
}

export function countNotes(song: AiSong): number {
  let total = 0;
  for (const tr of song.tracks) total += tr.notes.length;
  return total;
}

// ---------------------------------------------------------------------------
// Core stochastic machinery
// ---------------------------------------------------------------------------

/**
 * Blend consonant and chromatic pitch-class weights by chaos.
 * chaos 0 -> pure C-major triad lean; chaos 1 -> uniform chromatic.
 */
function pitchClassWeights(chaos: number): number[] {
  const weights: number[] = [];
  for (let pc = 0; pc < 12; pc++) {
    const consonant = CONSONANT_PC.includes(pc) ? 1 : 0;
    const triad = pc === 0 || pc === 4 || pc === 7 ? 1.5 : 0;
    const steady = consonant + triad + 0.05;
    const wild = 1;
    weights.push(steady * (1 - chaos) + wild * chaos);
  }
  return weights;
}

/**
 * Step weights for the random walk: low chaos favors repeats and
 * seconds; high chaos favors tritones, sevenths, and octave jumps.
 */
function stepWeights(chaos: number): number[] {
  const mag = (s: number): number => Math.abs(s);
  return STEP_TABLE.map((s) => {
    const m = mag(s);
    let steady: number;
    if (m === 0) steady = 3;
    else if (m <= 2) steady = 2.2;
    else if (m <= 4) steady = 1;
    else if (m <= 7) steady = 0.35;
    else steady = 0.08;
    let wild: number;
    if (m === 6 || m === 11) wild = 2.4;
    else if (m >= 7) wild = 1.8;
    else if (m >= 3) wild = 1.1;
    else wild = 0.5;
    return steady * (1 - chaos) + wild * chaos + 0.01;
  });
}

const DUR_VALUES = [0.25, 0.5, 0.5, 1, 1, 2];

function durationWeights(chaos: number): number[] {
  return DUR_VALUES.map((d) => {
    if (d === 0.25) return 0.6 + chaos * 1.6;
    if (d === 0.5) return 1.4;
    if (d === 1) return 1.2 - chaos * 0.4;
    return 0.5 - chaos * 0.3;
  });
}

function snapPitchClass(midi: number, rng: () => number, pcWeights: readonly number[]): number {
  const octave = Math.floor(midi / 12) * 12;
  const idx = pickWeighted(rng, pcWeights);
  return clampInt(octave + idx, 0, 127);
}

/** Walk one voice across totalBeats, returning clamped valid notes. */
function walkVoice(
  rng: () => number,
  chaos: number,
  startMidi: number,
  totalBeats: number,
  low: number,
  high: number,
): AiNote[] {
  const notes: AiNote[] = [];
  const steps = stepWeights(chaos);
  const pcs = pitchClassWeights(chaos);
  const durs = durationWeights(chaos);
  let t = 0;
  let cur = clampInt(startMidi, low, high);
  let guard = 0;
  while (t < totalBeats && guard < MAX_NOTES_PER_TRACK) {
    guard += 1;
    const step = STEP_TABLE[pickWeighted(rng, steps)];
    // Markov-ish: drift toward center when near an edge, else random walk.
    let next = cur + step;
    if (cur < low + 5 && rng() < 0.7) next = cur + Math.abs(step);
    if (cur > high - 5 && rng() < 0.7) next = cur - Math.abs(step);
    next = clampInt(next, low, high);
    // Chaos decides whether the raw walk survives or snaps to a weighted pc.
    const useRaw = rng() < chaos * 0.65 + 0.15;
    const pitch = useRaw ? next : snapPitchClass(next, rng, pcs);
    const durIdx = pickWeighted(rng, durs);
    const d = clampNum(DUR_VALUES[durIdx], 0.25, 2);
    const room = totalBeats - t;
    const len = clampNum(Math.min(d, room), 0.25, MAX_NOTE_LEN);
    const vel = clampNum(0.45 + rng() * 0.4 - chaos * 0.1, 0.05, 1);
    notes.push({
      t: clampNum(Math.round(t * 100) / 100, 0, MAX_BEATS),
      n: clampInt(pitch, 0, 127),
      d: clampNum(Math.round(len * 100) / 100, 0.25, MAX_NOTE_LEN),
      v: Math.round(vel * 100) / 100,
    });
    t = Math.round((t + len) * 100) / 100;
    cur = pitch;
  }
  return notes;
}

function sanitizeBars(bars: unknown): number {
  if (typeof bars !== "number" || !Number.isFinite(bars)) return 4;
  return clampInt(bars, 1, 16);
}

function sanitizeBpm(bpm: unknown, rng: () => number, chaos: number): number {
  if (typeof bpm === "number" && Number.isFinite(bpm)) {
    return clampInt(Math.round(bpm), MIN_BPM, MAX_BPM);
  }
  // Wild mode picks its own tempo: steady 4/4 feel at low chaos.
  const base = 96 + Math.floor(rng() * 41);
  const jitter = Math.round((rng() - 0.5) * 60 * chaos);
  return clampInt(base + jitter, MIN_BPM, MAX_BPM);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Compose a fresh wild-mode song from a seed + chaos level. Always valid. */
export function composeWildSong(options: AiComposeOptions): AiSong {
  const chaos = clampChaos(options.chaos);
  const rng = createRng(options.seed);
  const bars = sanitizeBars(options.bars);
  const totalBeats = bars * 4;
  const bpm = sanitizeBpm(options.bpm, rng, chaos);
  const title = cleanTitle(options.title, "Wild " + Math.floor(rng() * 900 + 100));

  const leadWave: AiTrack["wave"] = chaos < 0.33 ? "square" : chaos < 0.66 ? "saw" : "sine";
  const bassWave: AiTrack["wave"] = chaos > 0.8 ? "noise" : "tri";

  const lead: AiTrack = {
    wave: leadWave,
    vol: Math.round(clampNum(0.65 - chaos * 0.1, 0.1, 1) * 100) / 100,
    notes: walkVoice(rng, chaos, 60 + Math.floor(rng() * 12), totalBeats, 48, 84),
  };
  const bass: AiTrack = {
    wave: bassWave,
    vol: Math.round(clampNum(0.55 - chaos * 0.05, 0.1, 1) * 100) / 100,
    notes: walkVoice(rng, chaos, 36 + Math.floor(rng() * 7), totalBeats, 24, 60),
  };

  let song: AiSong = { v: 1, title, bpm, tracks: [lead, bass] };

  // Size guard: drop bass ornaments, then lead tail, until inside budget.
  let guard = 0;
  while (JSON.stringify(song).length > MAX_SONG_BYTES && guard < 64) {
    guard += 1;
    const b = song.tracks[1];
    const l = song.tracks[0];
    if (b.notes.length > 4) b.notes = b.notes.slice(0, Math.floor(b.notes.length * 0.8));
    else if (l.notes.length > 4) l.notes = l.notes.slice(0, Math.floor(l.notes.length * 0.8));
    else break;
  }

  const check = validateAiSong(song);
  if (!check.ok) {
    song = {
      v: 1,
      title: cleanTitle(title, "Wild fallback"),
      bpm: clampInt(bpm, MIN_BPM, MAX_BPM),
      tracks: [
        { wave: "square", vol: 0.6, notes: [{ t: 0, n: 60, d: 1, v: 0.7 }] },
      ],
    };
  }
  return song;
}

/**
 * Mutate an input song with wild-mode energy. Unknown or invalid input
 * falls back to a fresh composition; valid input keeps its title root,
 * bpm feel, and note count budget while pitches/rhythms drift by chaos.
 */
export function mutateSong(input: unknown, chaosInput: unknown, seed: number): AiSong {
  const chaos = clampChaos(chaosInput);
  const rng = createRng(seed);
  const base = validateAiSong(input);
  if (!base.ok) return composeWildSong({ seed, chaos });

  const src = input as AiSong;
  const steps = stepWeights(chaos);
  const pcs = pitchClassWeights(chaos);
  const title = cleanTitle(src.title + " wild", "Wild mutation");

  const tracks: AiTrack[] = src.tracks.slice(0, MAX_TRACKS).map((tr, ti) => {
    const wave = WAVES.includes(tr.wave) ? tr.wave : "square";
    const vol = tr.vol === undefined ? 0.6 : clampNum(tr.vol, 0, 1);
    const notes: AiNote[] = [];
    const budget = Math.min(tr.notes.length + 8, MAX_NOTES_PER_TRACK);
    for (let i = 0; i < tr.notes.length && notes.length < budget; i++) {
      const srcNote = tr.notes[i];
      const t = clampNum(typeof srcNote.t === "number" ? srcNote.t : i * 0.5, 0, MAX_BEATS);
      const n0 = clampInt(typeof srcNote.n === "number" ? srcNote.n : 60, 0, 127);
      const d0 = clampNum(typeof srcNote.d === "number" && srcNote.d > 0 ? srcNote.d : 0.5, 0.25, MAX_NOTE_LEN);
      // Higher chaos: bigger pitch jumps, timing jitter, dropped/kept notes.
      const step = STEP_TABLE[pickWeighted(rng, steps)];
      const drift = Math.round(step * (0.25 + chaos));
      let pitch = clampInt(n0 + drift, 0, 127);
      if (rng() < chaos * 0.35) pitch = snapPitchClass(pitch, rng, pcs);
      const jitter = (rng() - 0.5) * chaos * 0.5;
      const start = clampNum(Math.round((t + jitter) * 100) / 100, 0, MAX_BEATS);
      const scale = 1 + (rng() - 0.5) * chaos;
      const len = clampNum(Math.round(d0 * scale * 100) / 100, 0.25, MAX_NOTE_LEN);
      if (rng() < chaos * 0.12) continue; // wild mode drops notes
      notes.push({
        t: start,
        n: pitch,
        d: len,
        v: Math.round(clampNum(0.5 + rng() * 0.4, 0.05, 1) * 100) / 100,
      });
      // Wild mode inserts extra ornaments at high chaos.
      if (chaos > 0.6 && rng() < (chaos - 0.6) * 0.9 && notes.length < budget) {
        notes.push({
          t: clampNum(Math.round((start + len / 2) * 100) / 100, 0, MAX_BEATS),
          n: snapPitchClass(pitch + STEP_TABLE[pickWeighted(rng, steps)], rng, pcs),
          d: 0.25,
          v: 0.5,
        });
      }
    }
    if (notes.length === 0) {
      notes.push({ t: 0, n: 60 + (ti * 5) % 12, d: 0.5, v: 0.6 });
    }
    // Keep time order so players never see scrambled starts.
    notes.sort((a, b) => a.t - b.t);
    return { wave, vol: Math.round(vol * 100) / 100, notes: notes.slice(0, MAX_NOTES_PER_TRACK) };
  });

  while (tracks.length === 0) {
    tracks.push({ wave: "square", vol: 0.6, notes: [{ t: 0, n: 60, d: 1, v: 0.7 }] });
  }

  const song: AiSong = {
    v: 1,
    title,
    bpm: clampInt(Math.round(src.bpm + (rng() - 0.5) * 30 * chaos), MIN_BPM, MAX_BPM),
    tracks,
  };

  let guard = 0;
  while (JSON.stringify(song).length > MAX_SONG_BYTES && guard < 64) {
    guard += 1;
    const last = song.tracks[song.tracks.length - 1];
    if (last.notes.length > 4) last.notes = last.notes.slice(0, Math.floor(last.notes.length * 0.8));
    else if (song.tracks.length > 1) song.tracks = song.tracks.slice(0, song.tracks.length - 1);
    else break;
  }

  const check = validateAiSong(song);
  if (!check.ok) return composeWildSong({ seed, chaos, title });
  return song;
}
