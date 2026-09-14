/**
 * lib/music/instruments/core.ts - Instrument core registry + helpers (DS-MUSIC-01).
 *
 * The contract all music lanes build against. Family files (melodic, wind,
 * electronic, drums) import ONLY from "./core" and call registerInstrument
 * at load; this file NEVER imports family files (no cycles).
 *
 * SSR-safe: no browser APIs at module top (registry Map + metadata only).
 * ASCII-only. No secrets, no DOM, no Node APIs.
 */

/** All 20 instrument ids. Do not rename: siblings code against these names. */
export type InstrumentId =
  | "piano"
  | "guitar"
  | "bass"
  | "harp"
  | "marimba"
  | "music-box"
  | "flute"
  | "trumpet"
  | "sax"
  | "violin"
  | "organ"
  | "theremin"
  | "synth-lead"
  | "synth-pad"
  | "chiptune"
  | "kick"
  | "snare"
  | "hihat"
  | "tom"
  | "crash";

/** Instrument family kind. */
export type InstrumentKind = "melodic" | "wind" | "electronic" | "drum";

/** One note to play. freq overrides midi when provided. */
export interface InstrumentNote {
  /** MIDI note 0..127 (ignored when freq is set). */
  midi: number;
  /** Explicit frequency in Hz (overrides midi). */
  freq?: number;
  /** When to play, in ctx.currentTime seconds. */
  time: number;
  /** Length in seconds (default 0.3). */
  dur?: number;
  /** Loudness 0..1 (default 0.8). */
  vel?: number;
}

/** A voice renders one note into dest. Must not throw outward. */
export type VoiceFn = (
  ctx: BaseAudioContext,
  dest: AudioNode,
  note: Required<Pick<InstrumentNote, "time">> & InstrumentNote,
) => void;

/** Display metadata for every instrument (one-line teen-clean descriptions). */
export const INSTRUMENT_META: Record<
  InstrumentId,
  { name: string; kind: InstrumentKind; description: string }
> = {
  piano: {
    name: "Piano",
    kind: "melodic",
    description: "Classic piano keys for melodies and chords.",
  },
  guitar: {
    name: "Guitar",
    kind: "melodic",
    description: "Bright strummed guitar for riffs and hooks.",
  },
  bass: {
    name: "Bass",
    kind: "melodic",
    description: "Deep bass notes that drive the groove.",
  },
  harp: {
    name: "Harp",
    kind: "melodic",
    description: "Shimmery plucked harp for dreamy parts.",
  },
  marimba: {
    name: "Marimba",
    kind: "melodic",
    description: "Bouncy wooden marimba for playful tunes.",
  },
  "music-box": {
    name: "Music Box",
    kind: "melodic",
    description: "Tiny tinkling music box for sweet moments.",
  },
  flute: {
    name: "Flute",
    kind: "wind",
    description: "Light airy flute for gentle melodies.",
  },
  trumpet: {
    name: "Trumpet",
    kind: "wind",
    description: "Bold brassy trumpet for fanfares.",
  },
  sax: {
    name: "Sax",
    kind: "wind",
    description: "Smooth sax for cool jazzy lines.",
  },
  violin: {
    name: "Violin",
    kind: "wind",
    description: "Singing violin strings for big feelings.",
  },
  organ: {
    name: "Organ",
    kind: "wind",
    description: "Full church organ for epic chords.",
  },
  theremin: {
    name: "Theremin",
    kind: "electronic",
    description: "Spooky slidey theremin warble.",
  },
  "synth-lead": {
    name: "Synth Lead",
    kind: "electronic",
    description: "Punchy synth lead for main hooks.",
  },
  "synth-pad": {
    name: "Synth Pad",
    kind: "electronic",
    description: "Soft glowing synth pad for background.",
  },
  chiptune: {
    name: "Chiptune",
    kind: "electronic",
    description: "Retro 8-bit blips for game vibes.",
  },
  kick: {
    name: "Kick",
    kind: "drum",
    description: "Thumpy kick drum that keeps the beat.",
  },
  snare: {
    name: "Snare",
    kind: "drum",
    description: "Snappy snare drum for backbeat hits.",
  },
  hihat: {
    name: "Hi-Hat",
    kind: "drum",
    description: "Clicky hi-hat for fast ticking rhythm.",
  },
  tom: {
    name: "Tom",
    kind: "drum",
    description: "Round tom drum for fills and rolls.",
  },
  crash: {
    name: "Crash",
    kind: "drum",
    description: "Splashy crash cymbal for big moments.",
  },
};

// ---------------------------------------------------------------------------
// Registry (no audio here - SSR-safe)
// ---------------------------------------------------------------------------

const registry = new Map<string, VoiceFn>();

/** Register a voice for an instrument id (called by family files at load). */
export function registerInstrument(id: InstrumentId, fn: VoiceFn): void {
  registry.set(id, fn);
}

/**
 * Play one note through the registered voice. Returns false when the id is
 * unknown or the voice throws (fail-open, never throws). The id param is a
 * plain string so unknown ids can be probed at runtime; valid ids are
 * InstrumentId.
 */
export function playInstrument(
  id: string,
  ctx: BaseAudioContext,
  dest: AudioNode,
  note: InstrumentNote,
): boolean {
  try {
    const fn = registry.get(id);
    if (!fn) return false;
    fn(ctx, dest, note as Required<Pick<InstrumentNote, "time">> & InstrumentNote);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Helpers (context-bound; no top-level audio)
// ---------------------------------------------------------------------------

const MIN_GAIN = 0.0001;

/**
 * MIDI note -> frequency in Hz (A4 = 440), same formula as format-4w and
 * synth-4w. Accepts fractional midi (pitch bends); returns NaN when m is
 * not a finite number.
 */
export function midiToFreq(m: number): number {
  if (!Number.isFinite(m)) return NaN;
  return 440 * Math.pow(2, (m - 69) / 12);
}

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();

/**
 * 1 second of white noise for drum voices. Cached per context (same idiom
 * as the synth-4w engine); a fresh buffer is built only on first call.
 */
export function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const cached = noiseCache.get(ctx);
  if (cached) return cached;
  const len = Math.max(1, Math.floor(ctx.sampleRate * 1));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noiseCache.set(ctx, buf);
  return buf;
}

function clampNum(value: number, lo: number, hi: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  if (value < lo) return lo;
  if (value > hi) return hi;
  return value;
}

/**
 * One-shot ADSR gain envelope: attack 0 -> peak over a seconds, decay
 * peak -> sustain level (s, 0..1 of peak) over d seconds, then release
 * sustain -> silence over r seconds (no extra hold). Voices that hold a
 * note for note.dur schedule their own release on top of this gain.
 * All time params are clamped to >= 0.001; peak to 0..1.
 */
export function adsrGain(
  ctx: BaseAudioContext,
  time: number,
  a: number,
  d: number,
  s: number,
  r: number,
  peak: number,
): GainNode {
  const start = Number.isFinite(time) ? time : 0;
  const attack = clampNum(a, 0.001, 10, 0.005);
  const decay = clampNum(d, 0.001, 10, 0.05);
  const release = clampNum(r, 0.001, 10, 0.1);
  const top = clampNum(peak, 0, 1, 0.5);
  const sustainLevel = Math.max(MIN_GAIN, clampNum(s, 0, 1, 0.7) * top);
  const g = ctx.createGain();
  g.gain.setValueAtTime(MIN_GAIN, start);
  g.gain.linearRampToValueAtTime(Math.max(MIN_GAIN, top), start + attack);
  g.gain.linearRampToValueAtTime(sustainLevel, start + attack + decay);
  g.gain.linearRampToValueAtTime(MIN_GAIN, start + attack + decay + release);
  return g;
}
