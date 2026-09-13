/**
 * content/music-seeds.ts — 4W-1 seed songs + SFX transcribed from the shipped
 * game synth soundtracks (DS-MUS-09).
 *
 * SOURCES (studied READ-ONLY; nothing copied, no long melodic quotes):
 * - public/games/html/gravegain3d/audio/sound-engine.js — swing noise swoosh
 *   (bandpass noise glide), saw hit crunch, sine spell rise, saw explode
 *   rumble, dual-osc ambient bed.
 * - public/games/html/gravegain4d/audio/sound4d.js — putt thock (low sine
 *   thump + click), w-shift shimmer (detuned rising glides), rewind reverse
 *   sweep (falling saw), gore splat.
 * - public/games/html/lastwordszombies/audio.js — 100-150 BPM intensity
 *   sequencer, triangle type blips with combo pitch ladder.
 * - public/games/html/semester-survival/sound.js — C-major academic scale,
 *   sine collect arpeggio, saw power-up rise, triangle jump lift, 110 BPM
 *   background stepper.
 * - public/games/html/serversavershield/js/audio.js — square shoot zap,
 *   saw hit, triangle die fall, sine powerup lift, square nuke hold.
 *
 * All note sequences below are ORIGINAL, written in the spirit of those
 * voices. Synth recipes (wave choices, freq sweeps, noise bursts) mirror the
 * sources' techniques; melodies do not quote them.
 *
 * 4W-1 CONTRACT MIRROR (normative source: lib/music/format-4w.ts, DS-MUS-01):
 *   Song4W = { v: 1, title: ASCII<=120, bpm: 40-240, tracks: Track4W[<=8] }
 *   Track4W = { wave: square|saw|tri|sine|noise, vol?: 0..1,
 *               notes: Note4W[<=512] }
 *   Note4W = { t: start beats 0..4096, n: MIDI 0..127 int,
 *              d: len beats >0..256, v?: 0..1 }
 *   song canonical JSON <= 8192 bytes.
 *   Sfx4W = { v: 1, name: ASCII<=80,
 *             kind: raygun|death|putt|coin|hit|jump|win|lose|click|alarm,
 *             steps: [{ wave, freq: 20..20000, freqEnd, dur: >0..4,
 *                        vol: 0..1, type: tone|noise }][<=32] }
 *   sfx canonical JSON <= 1024 bytes.
 *
 * SELF-TEST (measured 2026-09-13, via local sizeOfValue on JSON):
 *   songs (budget 8192B): Putt-Thock Groove 683, W-Shimmer Pad 458,
 *   Rewind Sweep 658, Swing-Swoosh Rocker 611, Dungeon Ambient Bed 335,
 *   Arcade Stinger Medley 692 — max 692, all PASS.
 *   sfx (budget 1024B): Raygun Zap 208, Grave Death Fall 204, Putt Thock 206,
 *   Coin Chime 205, Melee Hit Crunch 130, Hop Up 122, Victory Fanfare 289,
 *   Defeat Descent 281, Type Click 128, Server Alarm 288 — max 289, all PASS.
 *   Import also executes the DEV-only block below (validateSong/validateSfx
 *   from lib/music/format-4w + budget asserts): it threw nothing.
 *   Every entry must stay under its budget or the DEV block throws.
 */

import {
  MAX_SFX_BYTES,
  MAX_SONG_BYTES,
  validateSfx,
  validateSong,
} from "@/lib/music/format-4w";
import type {
  Note4W,
  Sfx4W,
  SfxStep4W,
  SfxStepType4W,
  Song4W,
  TrackWave4W,
} from "@/lib/music/format-4w";

/** Compact JSON byte size (content is ASCII-only, so length === bytes). */
function sizeOfValue(value: unknown): number {
  const raw = JSON.stringify(value);
  return typeof raw === "string" ? raw.length : -1;
}

/** Shorthand note builder: N(startBeats, midi, lenBeats, velocity?). */
function N(t: number, n: number, d: number, v?: number): Note4W {
  return v === undefined ? { t, n, d } : { t, n, d, v };
}

/** Shorthand SFX step builder. */
function ST(
  wave: TrackWave4W,
  freq: number,
  freqEnd: number,
  dur: number,
  vol: number,
  type: SfxStepType4W,
): SfxStep4W {
  return { wave, freq, freqEnd, dur, vol, type };
}

// ---------------------------------------------------------------------------
// SONGS (6): signature game voices, authored as 4W-1 tracks.
// ---------------------------------------------------------------------------

/** Putt-thock groove: woody low-sine bounce under a square fairway riff. */
const PUTT_THOCK_GROOVE: Song4W = {
  v: 1,
  title: "Putt-Thock Groove",
  bpm: 104,
  tracks: [
    {
      wave: "square",
      vol: 0.5,
      notes: [
        N(0, 57, 0.45), N(0.5, 60, 0.45), N(1, 64, 0.45), N(1.5, 62, 0.45),
        N(2, 60, 0.45), N(2.5, 57, 0.45), N(3, 55, 0.45), N(3.5, 57, 0.45),
        N(4, 60, 0.45), N(4.5, 62, 0.45), N(5, 64, 0.45), N(5.5, 67, 0.9),
      ],
    },
    {
      wave: "sine",
      vol: 0.6,
      notes: [
        N(0, 33, 0.9), N(1, 33, 0.9), N(2, 36, 0.9),
        N(3, 31, 0.9), N(4, 33, 0.9), N(5, 29, 0.9),
      ],
    },
    {
      wave: "noise",
      vol: 0.25,
      notes: [N(0.5, 69, 0.05), N(2.5, 69, 0.05), N(4.5, 69, 0.05)],
    },
  ],
};

/** W-shimmer pad: slow detuned rising glides over a deep root drone. */
const W_SHIMMER_PAD: Song4W = {
  v: 1,
  title: "W-Shimmer Pad",
  bpm: 72,
  tracks: [
    {
      wave: "tri",
      vol: 0.5,
      notes: [N(0, 57, 4), N(4, 60, 4), N(8, 64, 4), N(12, 67, 4)],
    },
    {
      wave: "sine",
      vol: 0.35,
      notes: [
        N(0, 64, 2), N(2, 67, 2), N(4, 69, 2), N(6, 72, 2),
        N(8, 71, 2), N(10, 69, 2), N(12, 67, 2), N(14, 64, 2),
      ],
    },
    {
      wave: "sine",
      vol: 0.25,
      notes: [N(0, 76, 8), N(8, 79, 8)],
    },
  ],
};

/** Rewind sweep: falling saw figures racing a noise reverse-swell bed. */
const REWIND_SWEEP: Song4W = {
  v: 1,
  title: "Rewind Sweep",
  bpm: 128,
  tracks: [
    {
      wave: "saw",
      vol: 0.5,
      notes: [
        N(0, 76, 0.22), N(0.25, 74, 0.22), N(0.5, 72, 0.22), N(0.75, 71, 0.22),
        N(1, 69, 0.22), N(1.25, 67, 0.22), N(1.5, 65, 0.22), N(1.75, 64, 0.22),
        N(2, 62, 0.22), N(2.25, 60, 0.22), N(2.5, 59, 0.22), N(2.75, 57, 0.22),
        N(3, 55, 0.22), N(3.25, 53, 0.22), N(3.5, 52, 0.22), N(3.75, 50, 0.4),
      ],
    },
    {
      wave: "noise",
      vol: 0.3,
      notes: [N(0, 60, 2), N(2, 60, 2)],
    },
    {
      wave: "sine",
      vol: 0.4,
      notes: [N(0, 50, 2), N(2, 48, 2)],
    },
  ],
};

/** Swing-swoosh rocker: driving saw bass, square riff, noise backbeat. */
const SWING_SWOOSH_ROCKER: Song4W = {
  v: 1,
  title: "Swing-Swoosh Rocker",
  bpm: 140,
  tracks: [
    {
      wave: "saw",
      vol: 0.55,
      notes: [
        N(0, 40, 0.45), N(0.5, 40, 0.45), N(1, 43, 0.45), N(1.5, 40, 0.45),
        N(2, 38, 0.45), N(2.5, 38, 0.45), N(3, 41, 0.45), N(3.5, 43, 0.45),
      ],
    },
    {
      wave: "square",
      vol: 0.5,
      notes: [
        N(0, 64, 0.45), N(0.5, 67, 0.45), N(1, 69, 0.45), N(1.5, 67, 0.45),
        N(2, 72, 0.9), N(3, 69, 0.45), N(3.5, 67, 0.45),
      ],
    },
    {
      wave: "noise",
      vol: 0.3,
      notes: [N(0, 60, 0.2), N(1, 69, 0.1), N(3, 69, 0.1)],
    },
  ],
};

/** Dungeon ambient bed: minor drone with a sparse ghost melody. */
const DUNGEON_AMBIENT_BED: Song4W = {
  v: 1,
  title: "Dungeon Ambient Bed",
  bpm: 60,
  tracks: [
    {
      wave: "sine",
      vol: 0.5,
      notes: [N(0, 38, 8), N(8, 36, 8)],
    },
    {
      wave: "tri",
      vol: 0.4,
      notes: [N(0, 62, 2), N(4, 60, 2), N(8, 57, 3), N(12, 55, 3)],
    },
    {
      wave: "sine",
      vol: 0.25,
      notes: [N(2, 74, 1), N(10, 72, 1)],
    },
  ],
};

/** Arcade stinger medley: rapid square fanfare over saw bass stabs. */
const ARCADE_STINGER_MEDLEY: Song4W = {
  v: 1,
  title: "Arcade Stinger Medley",
  bpm: 150,
  tracks: [
    {
      wave: "square",
      vol: 0.55,
      notes: [
        N(0, 72, 0.22), N(0.25, 76, 0.22), N(0.5, 79, 0.22), N(0.75, 76, 0.22),
        N(1, 81, 0.22), N(1.25, 79, 0.22), N(1.5, 76, 0.22), N(1.75, 74, 0.22),
        N(2, 72, 0.22), N(2.25, 74, 0.22), N(2.5, 76, 0.22), N(2.75, 79, 0.22),
        N(3, 84, 0.9),
      ],
    },
    {
      wave: "saw",
      vol: 0.45,
      notes: [N(0, 48, 0.9), N(1, 45, 0.9), N(2, 43, 0.9), N(3, 41, 0.9)],
    },
    {
      wave: "tri",
      vol: 0.4,
      notes: [N(0, 60, 0.25), N(1, 63, 0.25), N(2, 67, 0.25), N(3, 72, 0.5)],
    },
  ],
};

export const SONGS: Song4W[] = [
  PUTT_THOCK_GROOVE,
  W_SHIMMER_PAD,
  REWIND_SWEEP,
  SWING_SWOOSH_ROCKER,
  DUNGEON_AMBIENT_BED,
  ARCADE_STINGER_MEDLEY,
];

// ---------------------------------------------------------------------------
// SFX (10): signature game voices as 4W-1 synth recipes.
// ---------------------------------------------------------------------------

export const SFX: Sfx4W[] = [
  {
    v: 1,
    name: "Raygun Zap",
    kind: "raygun",
    steps: [
      ST("square", 900, 200, 0.18, 0.5, "tone"),
      ST("sine", 1400, 300, 0.12, 0.3, "tone"),
    ],
  },
  {
    v: 1,
    name: "Grave Death Fall",
    kind: "death",
    steps: [
      ST("tri", 200, 50, 0.3, 0.5, "tone"),
      ST("saw", 120, 40, 0.3, 0.3, "tone"),
    ],
  },
  {
    v: 1,
    name: "Putt Thock",
    kind: "putt",
    steps: [
      ST("sine", 220, 70, 0.12, 0.6, "tone"),
      ST("noise", 2500, 1200, 0.03, 0.3, "noise"),
    ],
  },
  {
    v: 1,
    name: "Coin Chime",
    kind: "coin",
    steps: [
      ST("sine", 950, 950, 0.07, 0.5, "tone"),
      ST("sine", 1400, 1400, 0.12, 0.5, "tone"),
    ],
  },
  {
    v: 1,
    name: "Melee Hit Crunch",
    kind: "hit",
    steps: [ST("saw", 160, 45, 0.12, 0.6, "tone")],
  },
  {
    v: 1,
    name: "Hop Up",
    kind: "jump",
    steps: [ST("tri", 150, 450, 0.15, 0.5, "tone")],
  },
  {
    v: 1,
    name: "Victory Fanfare",
    kind: "win",
    steps: [
      ST("square", 523, 523, 0.12, 0.5, "tone"),
      ST("square", 659, 659, 0.12, 0.5, "tone"),
      ST("square", 784, 784, 0.25, 0.5, "tone"),
    ],
  },
  {
    v: 1,
    name: "Defeat Descent",
    kind: "lose",
    steps: [
      ST("tri", 400, 400, 0.15, 0.5, "tone"),
      ST("tri", 300, 300, 0.15, 0.5, "tone"),
      ST("sine", 200, 100, 0.35, 0.5, "tone"),
    ],
  },
  {
    v: 1,
    name: "Type Click",
    kind: "click",
    steps: [ST("tri", 350, 120, 0.045, 0.4, "tone")],
  },
  {
    v: 1,
    name: "Server Alarm",
    kind: "alarm",
    steps: [
      ST("square", 700, 700, 0.12, 0.5, "tone"),
      ST("square", 520, 520, 0.12, 0.5, "tone"),
      ST("square", 700, 700, 0.12, 0.5, "tone"),
    ],
  },
];

// ---------------------------------------------------------------------------
// PLAYLISTS metadata: songIds reference SONGS entries by title.
// ---------------------------------------------------------------------------

export interface Playlist4W {
  id: string;
  title: string;
  songIds: string[];
}

export const PLAYLISTS: Playlist4W[] = [
  {
    id: "fairway-nights",
    title: "Fairway Nights",
    songIds: ["Putt-Thock Groove", "W-Shimmer Pad", "Dungeon Ambient Bed"],
  },
  {
    id: "arcade-attack",
    title: "Arcade Attack",
    songIds: ["Swing-Swoosh Rocker", "Arcade Stinger Medley", "Rewind Sweep"],
  },
];

// ---------------------------------------------------------------------------
// DEV-only contract check: validates every entry against lib/music/format-4w
// and asserts the byte budgets via the local sizeOfValue above. Never runs in
// production; throws loudly in dev/test so bad seeds fail fast.
// ---------------------------------------------------------------------------

if (process.env.NODE_ENV !== "production") {
  for (const song of SONGS) {
    const check = validateSong(song);
    if (!check.ok) {
      throw new Error(
        "music-seeds: invalid song " + song.title + ": " + check.errors.join("; "),
      );
    }
    const bytes = sizeOfValue(song);
    if (bytes < 0 || bytes > MAX_SONG_BYTES) {
      throw new Error(
        "music-seeds: song " + song.title + " JSON " + bytes + " bytes exceeds " + MAX_SONG_BYTES,
      );
    }
  }
  for (const sfx of SFX) {
    const check = validateSfx(sfx);
    if (!check.ok) {
      throw new Error(
        "music-seeds: invalid sfx " + sfx.name + ": " + check.errors.join("; "),
      );
    }
    const bytes = sizeOfValue(sfx);
    if (bytes < 0 || bytes > MAX_SFX_BYTES) {
      throw new Error(
        "music-seeds: sfx " + sfx.name + " JSON " + bytes + " bytes exceeds " + MAX_SFX_BYTES,
      );
    }
  }
  const titles = new Set(SONGS.map((s) => s.title));
  for (const playlist of PLAYLISTS) {
    for (const songId of playlist.songIds) {
      if (!titles.has(songId)) {
        throw new Error(
          "music-seeds: playlist " + playlist.id + " references unknown song " + songId,
        );
      }
    }
  }
}
