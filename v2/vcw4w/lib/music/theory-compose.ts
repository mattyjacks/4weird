/**
 * lib/music/theory-compose.ts - Deterministic music-theory composer (DEFAULT mode).
 *
 * Pure functions only. SSR-safe: no DOM, no browser APIs, no Node APIs,
 * no imports from other music libs (all types declared locally).
 * Deterministic: every output derives from a mulberry32 PRNG seeded by string.
 * ASCII-only.
 */

export type TheoryMode = "major" | "natural-minor" | "dorian" | "mixolydian";

export interface TheoryNote {
  /** MIDI pitch number (0..127). */
  midi: number;
  /** Start time in beats from song start. */
  beat: number;
  /** Duration in beats (> 0). */
  lenBeats: number;
  /** Velocity 1..127. */
  vel: number;
}

export interface TheoryTrack {
  name: string;
  notes: TheoryNote[];
}

export interface TheorySection {
  name: "intro" | "build" | "drop" | "break";
  startBeat: number;
  bars: number;
}

export interface TheoryChord {
  /** Scale degree 1..7 of the chord root. */
  degree: number;
  /** MIDI pitch of the bass root. */
  rootMidi: number;
  /** MIDI pitches of the triad (root position, close voicing). */
  tones: number[];
  /** Roman-numeral label, e.g. "I", "vi". */
  label: string;
}

export interface TheorySong {
  seed: string;
  rootName: string;
  rootMidi: number;
  mode: TheoryMode;
  bpm: number;
  beatsPerBar: number;
  sections: TheorySection[];
  chords: TheoryChord[];
  tracks: TheoryTrack[];
}

export interface TheoryComposeOptions {
  seed: string;
  rootName?: string;
  mode?: TheoryMode;
  bpm?: number;
}

export interface TheorySongReport {
  noteCount: number;
  inKeyCount: number;
  inKeyPct: number;
}

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32, string seed)
// ---------------------------------------------------------------------------

/** FNV-1a 32-bit hash of a string. Pure. */
export function hashSeedString(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32 generator. Pure factory; the returned closure is the only state. */
export function mulberry32(seedInt: number): () => number {
  let a = seedInt >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build a seeded rng closure from a string seed. */
export function createSeededRng(seed: string): () => number {
  return mulberry32(hashSeedString(seed));
}

/** Pick one element deterministically. */
export function pickSeeded<T>(rng: () => number, items: ReadonlyArray<T>): T {
  const idx = Math.floor(rng() * items.length) % items.length;
  return items[idx];
}

/** Integer in [min, max] inclusive, deterministically. */
export function intSeeded(rng: () => number, min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(rng() * (hi - lo + 1));
}

// ---------------------------------------------------------------------------
// Scales
// ---------------------------------------------------------------------------

const MODE_INTERVALS: Record<TheoryMode, ReadonlyArray<number>> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  "natural-minor": [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

const ROOT_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

const ROOT_SEMITONE: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

const ALL_MODES: ReadonlyArray<TheoryMode> = ["major", "natural-minor", "dorian", "mixolydian"];

/** Semitone offsets of the mode scale (7 pitch classes). */
export function modeIntervals(mode: TheoryMode): number[] {
  return MODE_INTERVALS[mode].slice();
}

/** Pitch-class set (0..11) for a root + mode, relative to C = 0. */
export function keyPitchClasses(rootSemitone: number, mode: TheoryMode): number[] {
  const base = ((rootSemitone % 12) + 12) % 12;
  return MODE_INTERVALS[mode].map((iv) => (base + iv) % 12);
}

/** True when a MIDI note belongs to the key. */
export function isNoteInKey(midi: number, rootSemitone: number, mode: TheoryMode): boolean {
  const pc = ((Math.round(midi) % 12) + 12) % 12;
  return keyPitchClasses(rootSemitone, mode).indexOf(pc) !== -1;
}

/** MIDI number for a root name at an octave (C4 = 60). */
export function rootNameToMidi(rootName: string, octave: number): number {
  const key = rootName.trim();
  const semi = ROOT_SEMITONE[key] !== undefined ? ROOT_SEMITONE[key] : 0;
  return 12 * (octave + 1) + semi;
}

// ---------------------------------------------------------------------------
// Diatonic progressions (scale degrees, 1-based)
// ---------------------------------------------------------------------------

const PROGRESSIONS: Record<string, ReadonlyArray<number>> = {
  "I-V-vi-IV": [1, 5, 6, 4],
  "vi-IV-I-V": [6, 4, 1, 5],
  "I-vi-IV-V": [1, 6, 4, 5],
  "i-VI-III-VII": [1, 6, 3, 7],
  "i-VII-VI-VII": [1, 7, 6, 7],
  "I-bVII-IV-I": [1, 7, 4, 1],
};

const ROMAN_MAJOR = ["I", "ii", "iii", "IV", "V", "vi", "vii"];
const ROMAN_MINOR = ["i", "ii", "III", "iv", "v", "VI", "VII"];

function romanFor(degree: number, mode: TheoryMode): string {
  const idx = ((degree - 1) % 7 + 7) % 7;
  if (mode === "major" || mode === "mixolydian") {
    return ROMAN_MAJOR[idx] || "I";
  }
  return ROMAN_MINOR[idx] || "i";
}

/** Degree (1..7) -> scale midi offset for the chord root (two octaves safe). */
function degreeToOffset(degree: number, mode: TheoryMode): number {
  const intervals = MODE_INTERVALS[mode];
  const idx = ((degree - 1) % 7 + 7) % 7;
  const oct = Math.floor((degree - 1) / 7);
  return (intervals[idx] || 0) + oct * 12;
}

/** Triad tones (root, third, fifth) in scale steps for a degree. */
function triadOffsets(degree: number, mode: TheoryMode): number[] {
  const intervals = MODE_INTERVALS[mode];
  const at = (step: number): number => {
    const idx = ((step % 7) + 7) % 7;
    const oct = Math.floor(step / 7);
    return (intervals[idx] || 0) + oct * 12;
  };
  const d = degree - 1;
  return [at(d), at(d + 2), at(d + 4)];
}

// ---------------------------------------------------------------------------
// Composer
// ---------------------------------------------------------------------------

const DEFAULT_BPM = 140;
const BEATS_PER_BAR = 4;

/** Resolve full options from a partial (seed-derived defaults stay deterministic). */
export function resolveComposeOptions(options: TheoryComposeOptions): {
  seed: string;
  rootName: string;
  mode: TheoryMode;
  bpm: number;
} {
  const seed = options.seed;
  const rng = createSeededRng("options:" + seed);
  const rootName =
    options.rootName !== undefined ? options.rootName : pickSeeded(rng, ROOT_NAMES);
  const mode: TheoryMode =
    options.mode !== undefined ? options.mode : pickSeeded(rng, ALL_MODES);
  const bpm = options.bpm !== undefined ? options.bpm : 128 + intSeeded(rng, 0, 24);
  return { seed, rootName, mode, bpm };
}

/**
 * Compose a structural song. Deterministic for a given options object.
 * Form: intro (4 bars, sparse) -> build (4 bars, rising) ->
 * drop (8 bars, full) -> break (4 bars, release). 20 bars total.
 */
export function composeTheorySong(options: TheoryComposeOptions): TheorySong {
  const resolved = resolveComposeOptions(options);
  const rng = createSeededRng("song:" + resolved.seed);
  const rootSemiRaw = ROOT_SEMITONE[resolved.rootName];
  const rootSemi = rootSemiRaw !== undefined ? rootSemiRaw : 0;
  const rootMidi = rootNameToMidi(resolved.rootName, 3);
  const keyPcs = keyPitchClasses(rootSemi, resolved.mode);

  const progKeys = Object.keys(PROGRESSIONS);
  const progName = pickSeeded(rng, progKeys);
  const prog = PROGRESSIONS[progName] || [1, 5, 6, 4];

  const sections: TheorySection[] = [
    { name: "intro", startBeat: 0, bars: 4 },
    { name: "build", startBeat: 16, bars: 4 },
    { name: "drop", startBeat: 32, bars: 8 },
    { name: "break", startBeat: 64, bars: 4 },
  ];
  const totalBars = 20;

  // One chord per bar, cycling the 4-chord progression.
  const rawDegrees: number[] = [];
  for (let bar = 0; bar < totalBars; bar++) {
    const deg = prog[bar % prog.length];
    rawDegrees.push(deg === undefined ? 1 : deg);
  }

  // Voice-led bass roots: keep each root within an octave of the previous.
  const chords: TheoryChord[] = [];
  let prevBass = rootMidi - 12;
  for (let bar = 0; bar < totalBars; bar++) {
    const degree = rawDegrees[bar] || 1;
    const center = rootMidi - 12 + degreeToOffset(degree, resolved.mode);
    let bass = center;
    while (bass > prevBass + 7) {
      bass -= 12;
    }
    while (bass < prevBass - 7) {
      bass += 12;
    }
    if (bass < 24) {
      bass += 12;
    }
    if (bass > 60) {
      bass -= 12;
    }
    prevBass = bass;
    const offsets = triadOffsets(degree, resolved.mode);
    const tones = offsets.map((o) => rootMidi + o);
    chords.push({
      degree,
      rootMidi: bass,
      tones,
      label: romanFor(degree, resolved.mode),
    });
  }

  // Scale ladder for melody (two octaves above the root).
  const ladder: number[] = [];
  for (let oct = 0; oct < 2; oct++) {
    const arr = MODE_INTERVALS[resolved.mode];
    for (let s = 0; s < arr.length; s++) {
      ladder.push(rootMidi + 12 + (arr[s] || 0) + oct * 12);
    }
  }

  const bassNotes: TheoryNote[] = [];
  const padNotes: TheoryNote[] = [];
  const leadNotes: TheoryNote[] = [];
  const arpNotes: TheoryNote[] = [];

  const tonicLadderIdx = 7; // second-octave tonic in the ladder
  let prevLeadIdx = tonicLadderIdx;

  for (let bar = 0; bar < totalBars; bar++) {
    const beat0 = bar * BEATS_PER_BAR;
    const chord = chords[bar];
    if (chord === undefined) {
      continue;
    }
    const inDrop = bar >= 8 && bar < 16;
    const inBuild = bar >= 4 && bar < 8;
    const inIntro = bar < 4;

    // Bass: roots each bar; drop adds off-beat dubstep wobble eighths.
    bassNotes.push({ midi: chord.rootMidi, beat: beat0, lenBeats: inIntro ? 3 : 1, vel: 100 });
    if (inDrop) {
      bassNotes.push({ midi: chord.rootMidi, beat: beat0 + 1.5, lenBeats: 0.5, vel: 112 });
      bassNotes.push({ midi: chord.rootMidi, beat: beat0 + 2.5, lenBeats: 0.5, vel: 112 });
      if (rng() < 0.5) {
        bassNotes.push({ midi: chord.rootMidi + 12, beat: beat0 + 3.5, lenBeats: 0.5, vel: 104 });
      }
    } else if (inBuild) {
      bassNotes.push({ midi: chord.rootMidi, beat: beat0 + 2, lenBeats: 1, vel: 96 });
    }

    // Pad: triad whole-bar stabs (half-bar pulse in drop).
    for (let t = 0; t < chord.tones.length; t++) {
      const tone = chord.tones[t];
      if (tone === undefined) {
        continue;
      }
      if (inDrop) {
        padNotes.push({ midi: tone, beat: beat0, lenBeats: 1.5, vel: 72 });
        padNotes.push({ midi: tone, beat: beat0 + 2, lenBeats: 1.5, vel: 72 });
      } else {
        padNotes.push({ midi: tone, beat: beat0, lenBeats: inIntro ? 3.5 : 2, vel: 64 });
      }
    }

    // Lead: call/response over 2-bar phrases. Even bars ask (tension:
    // drift away, end on a non-tonic); odd bars answer (release: walk
    // back to the tonic). Stepwise motion keeps it singable.
    const phraseEven = bar % 2 === 0;
    const stepsThisBar = inDrop ? 4 : 2;
    for (let s = 0; s < stepsThisBar; s++) {
      const step = intSeeded(rng, -2, 2);
      let next = prevLeadIdx + step;
      if (next < 0) {
        next = 0;
      }
      if (next > ladder.length - 1) {
        next = ladder.length - 1;
      }
      const isLastOfPhrase = s === stepsThisBar - 1;
      if (isLastOfPhrase) {
        if (phraseEven) {
          // Tension: avoid tonic pitch class at the end of the call.
          let guard = 0;
          while (guard < 8) {
            const cand = ladder[next];
            const isTonic =
              cand !== undefined && ((cand - rootMidi) % 12 + 12) % 12 === keyPcs[0];
            if (!isTonic || cand === undefined) {
              break;
            }
            next = next + (next >= prevLeadIdx ? 1 : -1);
            if (next < 0) {
              next = 1;
            }
            if (next > ladder.length - 1) {
              next = ladder.length - 2;
            }
            guard++;
          }
        } else {
          // Release: resolve to the nearest tonic.
          let best = tonicLadderIdx;
          let bestDist = 999;
          for (let li = 0; li < ladder.length; li++) {
            const v = ladder[li];
            if (v === undefined) {
              continue;
            }
            if (((v - rootMidi) % 12 + 12) % 12 !== keyPcs[0]) {
              continue;
            }
            const dist = Math.abs(li - next);
            if (dist < bestDist) {
              bestDist = dist;
              best = li;
            }
          }
          next = best;
        }
      }
      const pitch = ladder[next];
      if (pitch !== undefined) {
        const dur = inDrop ? 0.5 : 1;
        const at = beat0 + s * (BEATS_PER_BAR / stepsThisBar);
        const vel = inBuild ? 88 + s * 4 : 84;
        leadNotes.push({ midi: pitch, beat: at, lenBeats: dur, vel });
      }
      prevLeadIdx = next;
    }

    // Arp: drop-only sixteenth-ish sparkle from chord tones.
    if (inDrop) {
      for (let s = 0; s < 4; s++) {
        const tone = chord.tones[s % chord.tones.length];
        if (tone === undefined) {
          continue;
        }
        arpNotes.push({ midi: tone + 12, beat: beat0 + s, lenBeats: 0.5, vel: 60 });
      }
    }
  }

  const tracks: TheoryTrack[] = [
    { name: "bass", notes: bassNotes },
    { name: "pad", notes: padNotes },
    { name: "lead", notes: leadNotes },
  ];
  if (arpNotes.length > 0) {
    tracks.push({ name: "arp", notes: arpNotes });
  }

  return {
    seed: resolved.seed,
    rootName: resolved.rootName,
    rootMidi,
    mode: resolved.mode,
    bpm: resolved.bpm,
    beatsPerBar: BEATS_PER_BAR,
    sections,
    chords,
    tracks,
  };
}

/** Count notes and in-key share across all tracks. */
export function reportTheorySong(song: TheorySong): TheorySongReport {
  const rootSemiRaw = ROOT_SEMITONE[song.rootName];
  const rootSemi = rootSemiRaw !== undefined ? rootSemiRaw : 0;
  let total = 0;
  let inKey = 0;
  for (const track of song.tracks) {
    for (const note of track.notes) {
      total++;
      if (isNoteInKey(note.midi, rootSemi, song.mode)) {
        inKey++;
      }
    }
  }
  const pct = total === 0 ? 0 : (inKey / total) * 100;
  return { noteCount: total, inKeyCount: inKey, inKeyPct: pct };
}

/** Minimal structural validity: 16+ notes and every note inside the key. */
export function validateTheorySong(song: TheorySong): boolean {
  const report = reportTheorySong(song);
  if (report.noteCount < 16) {
    return false;
  }
  if (song.tracks.length === 0 || song.chords.length === 0 || song.sections.length === 0) {
    return false;
  }
  return report.inKeyCount === report.noteCount;
}

/** Total beats of the song (end of the last section). */
export function theorySongLengthBeats(song: TheorySong): number {
  let end = 0;
  for (const section of song.sections) {
    const sectionEnd = section.startBeat + section.bars * song.beatsPerBar;
    if (sectionEnd > end) {
      end = sectionEnd;
    }
  }
  return end;
}

export const THEORY_DEFAULT_BPM = DEFAULT_BPM;
export const THEORY_BEATS_PER_BAR = BEATS_PER_BAR;
export const THEORY_MODES: TheoryMode[] = ["major", "natural-minor", "dorian", "mixolydian"];
export const THEORY_SECTION_ORDER = ["intro", "build", "drop", "break"] as const;
