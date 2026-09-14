"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MAX_SFX_BYTES,
  MAX_SONG_BYTES,
  SFX_KINDS,
  TRACK_WAVES,
  decodeSong,
  encodeSfx,
  encodeSong,
  sfxByteSize,
  songByteSize,
  validateSfx,
  validateSong,
} from "@/lib/music/format-4w";
import type {
  Note4W,
  Sfx4W,
  SfxKind4W,
  SfxStep4W,
  Song4W,
  TrackWave4W,
} from "@/lib/music/format-4w";
import {
  ensureAudio,
  isPlaying as synthIsPlaying,
  playSfx as synthPlaySfx,
  playSong as synthPlaySong,
  stopSong as synthStopSong,
} from "@/lib/music/synth-4w";

/**
 * Music maker client: full on-device sound suite for tiny 4W-1 songs.
 *
 * Tabs: Sequencer (step grid + piano roll + per-track mixer), Wave Lab
 * (rendered-mix waveform with select/cut/copy/paste/trim + gain/fade/
 * normalize/echo + play selection + WAV export), SFX (10-kind effect bench),
 * Data (canonical JSON export/import, byte meter, share link, drafts).
 *
 * Contract + playback come from the shared libs by path:
 * `@/lib/music/format-4w` (types, fail-closed validators, canonical
 * encode/decode, byte budgets) and `@/lib/music/synth-4w` (lookahead
 * playback engine, SFX audition). Local extras: mixer pan/mute/solo
 * (stripped before validate/encode/play) and the offline wave-lab
 * renderer (the shared engine has no offline export).
 */

interface MixTrack {
  wave: TrackWave4W;
  vol?: number;
  pan?: number;
  mute?: boolean;
  solo?: boolean;
  notes: Note4W[];
}

interface MixSong {
  v: 1;
  title: string;
  bpm: number;
  tracks: MixTrack[];
}

const DRAFT_KEY = "4w-music-maker-draft-v1";
const STEPS_PER_BAR = 16;
const STEP_BEATS = 0.25;
const BAR_BEATS = 4;
const BAR_COUNT = 4;
const ROWS = 12;

function clampNum(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

/** Strip mixer extras so shared fail-closed guards accept the payload. */
function toCanonical(song: MixSong): Song4W {
  return {
    v: 1,
    title: song.title,
    bpm: song.bpm,
    tracks: song.tracks.map((t) => ({
      wave: t.wave,
      ...(t.vol !== undefined ? { vol: t.vol } : {}),
      notes: t.notes.map((n) => ({
        t: n.t,
        n: n.n,
        d: n.d,
        ...(n.v !== undefined ? { v: n.v } : {}),
      })),
    })),
  };
}

/** Deep-copy a canonical song into editable mixer state. */
function fromCanonical(song: Song4W): MixSong {
  return {
    v: 1,
    title: song.title,
    bpm: song.bpm,
    tracks: song.tracks.map((t) => ({
      wave: t.wave,
      vol: t.vol,
      notes: t.notes.map((n) => ({ ...n })),
    })),
  };
}

/** Playback view: canonical + mute/solo filtering. Empty when all muted. */
function playbackView(song: MixSong): Song4W {
  const base = toCanonical(song);
  const anySolo = song.tracks.some((t) => t.solo);
  const tracks = base.tracks.filter((_, i) => {
    const m = song.tracks[i];
    if (!m) return true;
    if (m.mute) return false;
    if (anySolo && !m.solo) return false;
    return true;
  });
  return { ...base, tracks };
}

function jsonToB64(json: string): string {
  try {
    const bytes = new TextEncoder().encode(json);
    let bin = "";
    bytes.forEach((b) => {
      bin += String.fromCharCode(b);
    });
    return btoa(bin);
  } catch {
    return "";
  }
}

function b64ToJson(b64: string): string | null {
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Seeds + SFX presets (local content, validated by the shared lib)
// ---------------------------------------------------------------------------

function demoSongA(): MixSong {
  return {
    v: 1,
    title: "Sunny Loop",
    bpm: 120,
    tracks: [
      {
        wave: "square",
        vol: 0.5,
        notes: [
          { t: 0, n: 60, d: 0.25, v: 0.9 },
          { t: 1, n: 64, d: 0.25, v: 0.9 },
          { t: 2, n: 67, d: 0.25, v: 0.9 },
          { t: 3, n: 72, d: 0.5, v: 0.9 },
          { t: 4, n: 67, d: 0.25, v: 0.8 },
          { t: 5, n: 64, d: 0.25, v: 0.8 },
          { t: 6, n: 60, d: 0.5, v: 0.8 },
        ],
      },
      {
        wave: "tri",
        vol: 0.6,
        notes: [
          { t: 0, n: 36, d: 1, v: 0.9 },
          { t: 2, n: 43, d: 1, v: 0.9 },
          { t: 4, n: 41, d: 1, v: 0.9 },
          { t: 6, n: 43, d: 1, v: 0.9 },
        ],
      },
      {
        wave: "noise",
        vol: 0.25,
        notes: [
          { t: 0, n: 60, d: 0.1, v: 0.5 },
          { t: 0.5, n: 60, d: 0.1, v: 0.4 },
          { t: 1, n: 60, d: 0.1, v: 0.5 },
          { t: 1.5, n: 60, d: 0.1, v: 0.4 },
          { t: 2, n: 60, d: 0.1, v: 0.5 },
          { t: 2.5, n: 60, d: 0.1, v: 0.4 },
          { t: 3, n: 60, d: 0.1, v: 0.5 },
          { t: 3.5, n: 60, d: 0.1, v: 0.4 },
        ],
      },
    ],
  };
}

function demoSongB(): MixSong {
  return {
    v: 1,
    title: "Night Drive",
    bpm: 96,
    tracks: [
      {
        wave: "saw",
        vol: 0.4,
        notes: [
          { t: 0, n: 57, d: 0.5, v: 0.8 },
          { t: 1, n: 60, d: 0.5, v: 0.8 },
          { t: 2, n: 64, d: 1, v: 0.85 },
          { t: 4, n: 62, d: 0.5, v: 0.8 },
          { t: 5, n: 60, d: 0.5, v: 0.8 },
          { t: 6, n: 57, d: 1, v: 0.85 },
        ],
      },
      {
        wave: "sine",
        vol: 0.6,
        notes: [
          { t: 0, n: 33, d: 2, v: 0.9 },
          { t: 2, n: 29, d: 2, v: 0.9 },
          { t: 4, n: 31, d: 2, v: 0.9 },
          { t: 6, n: 29, d: 2, v: 0.9 },
        ],
      },
    ],
  };
}

function toneStep(wave: TrackWave4W, freq: number, freqEnd: number, dur: number, vol: number): SfxStep4W {
  return { wave, freq, freqEnd, dur, vol, type: "tone" };
}

function noiseStep(dur: number, vol: number): SfxStep4W {
  return { wave: "noise", freq: 1000, freqEnd: 400, dur, vol, type: "noise" };
}

function presetSfx(kind: SfxKind4W): Sfx4W {
  switch (kind) {
    case "coin":
      return { v: 1, name: "coin", kind, steps: [toneStep("square", 988, 988, 0.08, 0.6), toneStep("square", 1319, 1319, 0.2, 0.6)] };
    case "jump":
      return { v: 1, name: "jump", kind, steps: [toneStep("sine", 300, 700, 0.2, 0.7)] };
    case "raygun":
      return { v: 1, name: "raygun", kind, steps: [toneStep("saw", 1200, 200, 0.3, 0.6)] };
    case "death":
      return { v: 1, name: "death", kind, steps: [toneStep("square", 400, 60, 0.6, 0.7)] };
    case "putt":
      return { v: 1, name: "putt", kind, steps: [toneStep("sine", 150, 120, 0.08, 0.8)] };
    case "hit":
      return { v: 1, name: "hit", kind, steps: [noiseStep(0.15, 0.7), toneStep("sine", 120, 60, 0.2, 0.8)] };
    case "win":
      return {
        v: 1,
        name: "win",
        kind,
        steps: [toneStep("square", 523, 523, 0.12, 0.6), toneStep("square", 659, 659, 0.12, 0.6), toneStep("square", 784, 784, 0.3, 0.6)],
      };
    case "lose":
      return {
        v: 1,
        name: "lose",
        kind,
        steps: [toneStep("saw", 392, 392, 0.15, 0.6), toneStep("saw", 330, 330, 0.15, 0.6), toneStep("saw", 262, 240, 0.4, 0.6)],
      };
    case "click":
      return { v: 1, name: "click", kind, steps: [toneStep("square", 800, 800, 0.05, 0.5)] };
    case "alarm":
      return {
        v: 1,
        name: "alarm",
        kind,
        steps: [
          toneStep("square", 660, 660, 0.15, 0.6),
          toneStep("square", 520, 520, 0.15, 0.6),
          toneStep("square", 660, 660, 0.15, 0.6),
          toneStep("square", 520, 520, 0.15, 0.6),
        ],
      };
    default:
      return { v: 1, name: "click", kind: "click", steps: [toneStep("square", 800, 800, 0.05, 0.5)] };
  }
}

/** One-time post-hydration restore: ?song= link wins, else draft. */
function loadExternalSong(): { song: MixSong; notice: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("song");
    if (shared) {
      const json = b64ToJson(shared);
      const res = json === null ? null : decodeSong(json);
      if (res && res.ok && res.song) return { song: fromCanonical(res.song), notice: "Shared song loaded. Press Play to hear it." };
      return { song: demoSongA(), notice: "That share link did not pass checks, loaded a demo instead." };
    }
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const res = decodeSong(raw);
      if (res.ok && res.song) return { song: fromCanonical(res.song), notice: "Draft restored from this browser." };
    }
  } catch {
    // Fail open to the demo song.
  }
  return null;
}

// ---------------------------------------------------------------------------
// Offline wave-lab renderer (local; honors mixer pan/mute/solo)
// ---------------------------------------------------------------------------

function midiToFreq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

/** Map 4W wave names to real WebAudio oscillator types. */
function toOscType(wave: string): OscillatorType {
  if (wave === "saw") return "sawtooth";
  if (wave === "tri" || wave === "triangle") return "triangle";
  if (wave === "sine") return "sine";
  return "square";
}

function makeNoiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  return buf;
}

function scheduleMixNotes(ctx: BaseAudioContext, song: MixSong, dest: AudioNode, when: number): void {
  const spb = 60 / clampNum(song.bpm, 40, 240);
  const anySolo = song.tracks.some((t) => t.solo);
  const noiseBuf = makeNoiseBuffer(ctx);
  song.tracks.forEach((track) => {
    if (track.mute) return;
    if (anySolo && !track.solo) return;
    const tVol = clampNum(track.vol ?? 0.7, 0, 1);
    if (tVol <= 0.001) return;
    const gain = ctx.createGain();
    gain.gain.value = 1;
    let out: AudioNode = gain;
    const pan = clampNum(track.pan ?? 0, -1, 1);
    if (pan !== 0 && typeof ctx.createStereoPanner === "function") {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      gain.connect(p);
      out = p;
    }
    out.connect(dest);
    track.notes.forEach((nt) => {
      const start = when + nt.t * spb;
      if (!Number.isFinite(start) || start < 0) return;
      const dur = Math.max(0.03, nt.d * spb);
      const vel = clampNum(nt.v ?? 0.9, 0, 1) * tVol;
      if (track.wave === "noise") {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        src.loop = true;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(Math.max(0.001, vel), start + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, start + dur);
        src.connect(g);
        g.connect(gain);
        try {
          src.start(start);
          src.stop(start + dur + 0.05);
        } catch {
          // ignore scheduling edge cases
        }
        return;
      }
      const osc = ctx.createOscillator();
      osc.type = toOscType(track.wave);
      osc.frequency.value = midiToFreq(clampNum(Math.round(nt.n), 0, 127));
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(Math.max(0.001, vel), start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(g);
      g.connect(gain);
      try {
        osc.start(start);
        osc.stop(start + dur + 0.05);
      } catch {
        // ignore scheduling edge cases
      }
    });
  });
}

function mixLengthBeats(song: MixSong): number {
  let end = BAR_BEATS;
  song.tracks.forEach((t) => {
    t.notes.forEach((n) => {
      end = Math.max(end, n.t + n.d);
    });
  });
  return end;
}

function mixSeconds(song: MixSong): number {
  return mixLengthBeats(song) * (60 / clampNum(song.bpm, 40, 240)) + 0.4;
}

/** Render the mix to mono float samples (for the wave lab). */
async function renderMixSamples(song: MixSong): Promise<{ samples: Float32Array; sampleRate: number } | null> {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { OfflineAudioContext?: typeof OfflineAudioContext };
  if (!w.OfflineAudioContext) return null;
  const sr = 22050;
  const seconds = mixSeconds(song) + 0.2;
  const len = Math.max(1, Math.floor(seconds * sr));
  if (len > sr * 60) return null;
  const ctx = new w.OfflineAudioContext(1, len, sr);
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  scheduleMixNotes(ctx, song, master, 0);
  const buf = await ctx.startRendering();
  const ch = buf.getChannelData(0);
  return { samples: new Float32Array(ch), sampleRate: buf.sampleRate };
}

function encodeWav16Mono(samples: Float32Array, sampleRate: number): Blob {
  const n = samples.length;
  const buffer = new ArrayBuffer(44 + n * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i += 1) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + n * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i += 1) {
    const v = clampNum(samples[i] ?? 0, -1, 1);
    view.setInt16(44 + i * 2, Math.round(v * 32767), true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

// ---------------------------------------------------------------------------
// Pro helpers: audition beep, C-major scale map, starter templates
// ---------------------------------------------------------------------------

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

/** Scratchpad pitch preview: one short blip, never throws. */
function auditionMidi(m: number): void {
  try {
    const ctx = ensureAudio();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = midiToFreq(m);
    g.gain.value = 0.05;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    window.setTimeout(() => {
      try {
        o.stop();
      } catch {
        /* ignore */
      }
    }, 90);
  } catch {
    /* audio is garnish */
  }
}

/** Starter songs: one tap from empty to arranged. */
function templateMarch(): MixSong {
  return {
    v: 1,
    title: "Parade March",
    bpm: 132,
    tracks: [
      {
        wave: "square",
        vol: 0.5,
        notes: [
          { t: 0, n: 72, d: 0.5, v: 0.9 },
          { t: 1, n: 76, d: 0.5, v: 0.9 },
          { t: 2, n: 79, d: 0.5, v: 0.9 },
          { t: 3, n: 84, d: 1, v: 0.95 },
          { t: 4, n: 79, d: 0.5, v: 0.9 },
          { t: 5, n: 81, d: 0.5, v: 0.9 },
          { t: 6, n: 79, d: 0.5, v: 0.85 },
          { t: 7, n: 76, d: 1, v: 0.9 },
          { t: 8, n: 77, d: 0.5, v: 0.9 },
          { t: 9, n: 81, d: 0.5, v: 0.9 },
          { t: 10, n: 86, d: 1, v: 0.95 },
          { t: 12, n: 84, d: 0.5, v: 0.9 },
          { t: 13, n: 79, d: 0.5, v: 0.85 },
          { t: 14, n: 76, d: 0.5, v: 0.85 },
          { t: 15, n: 72, d: 1, v: 0.9 },
        ],
      },
      {
        wave: "tri",
        vol: 0.6,
        notes: [
          { t: 0, n: 48, d: 1, v: 0.9 },
          { t: 2, n: 55, d: 1, v: 0.9 },
          { t: 4, n: 53, d: 1, v: 0.9 },
          { t: 6, n: 55, d: 1, v: 0.9 },
          { t: 8, n: 53, d: 1, v: 0.9 },
          { t: 10, n: 50, d: 1, v: 0.9 },
          { t: 12, n: 48, d: 1, v: 0.9 },
          { t: 14, n: 55, d: 1, v: 0.9 },
        ],
      },
      {
        wave: "noise",
        vol: 0.25,
        notes: [
          { t: 0, n: 60, d: 0.1, v: 0.7 },
          { t: 1, n: 60, d: 0.1, v: 0.4 },
          { t: 2, n: 60, d: 0.1, v: 0.7 },
          { t: 3, n: 60, d: 0.1, v: 0.4 },
          { t: 4, n: 60, d: 0.1, v: 0.7 },
          { t: 5, n: 60, d: 0.1, v: 0.4 },
          { t: 6, n: 60, d: 0.1, v: 0.7 },
          { t: 7, n: 60, d: 0.1, v: 0.4 },
          { t: 8, n: 60, d: 0.1, v: 0.7 },
          { t: 9, n: 60, d: 0.1, v: 0.4 },
          { t: 10, n: 60, d: 0.1, v: 0.7 },
          { t: 11, n: 60, d: 0.1, v: 0.4 },
          { t: 12, n: 60, d: 0.1, v: 0.7 },
          { t: 13, n: 60, d: 0.1, v: 0.4 },
          { t: 14, n: 60, d: 0.1, v: 0.7 },
          { t: 15, n: 60, d: 0.1, v: 0.6 },
        ],
      },
    ],
  };
}

function templateBoss(): MixSong {
  return {
    v: 1,
    title: "Boss Loop",
    bpm: 152,
    tracks: [
      {
        wave: "saw",
        vol: 0.45,
        notes: [
          { t: 0, n: 64, d: 0.25, v: 0.9 },
          { t: 0.5, n: 64, d: 0.25, v: 0.85 },
          { t: 1, n: 67, d: 0.25, v: 0.9 },
          { t: 2, n: 64, d: 0.5, v: 0.9 },
          { t: 4, n: 62, d: 0.25, v: 0.9 },
          { t: 4.5, n: 62, d: 0.25, v: 0.85 },
          { t: 5, n: 64, d: 0.5, v: 0.9 },
          { t: 8, n: 65, d: 0.25, v: 0.9 },
          { t: 8.5, n: 65, d: 0.25, v: 0.85 },
          { t: 9, n: 67, d: 0.5, v: 0.9 },
          { t: 12, n: 71, d: 0.5, v: 0.95 },
          { t: 13, n: 69, d: 0.5, v: 0.9 },
          { t: 14, n: 67, d: 0.5, v: 0.9 },
          { t: 15, n: 64, d: 1, v: 0.9 },
        ],
      },
      {
        wave: "square",
        vol: 0.5,
        notes: [
          { t: 0, n: 40, d: 0.5, v: 0.9 },
          { t: 1, n: 40, d: 0.5, v: 0.8 },
          { t: 2, n: 40, d: 0.5, v: 0.9 },
          { t: 3, n: 43, d: 0.5, v: 0.8 },
          { t: 4, n: 38, d: 0.5, v: 0.9 },
          { t: 5, n: 38, d: 0.5, v: 0.8 },
          { t: 6, n: 38, d: 0.5, v: 0.9 },
          { t: 7, n: 41, d: 0.5, v: 0.8 },
          { t: 8, n: 40, d: 0.5, v: 0.9 },
          { t: 10, n: 40, d: 0.5, v: 0.9 },
          { t: 12, n: 47, d: 0.5, v: 0.9 },
          { t: 14, n: 43, d: 0.5, v: 0.9 },
        ],
      },
      {
        wave: "noise",
        vol: 0.3,
        notes: [
          { t: 0, n: 36, d: 0.15, v: 1 },
          { t: 2, n: 42, d: 0.1, v: 0.5 },
          { t: 4, n: 36, d: 0.15, v: 1 },
          { t: 6, n: 42, d: 0.1, v: 0.5 },
          { t: 8, n: 36, d: 0.15, v: 1 },
          { t: 10, n: 42, d: 0.1, v: 0.5 },
          { t: 12, n: 36, d: 0.15, v: 1 },
          { t: 14, n: 42, d: 0.1, v: 0.6 },
        ],
      },
    ],
  };
}

function templateDream(): MixSong {
  return {
    v: 1,
    title: "Dream Arp",
    bpm: 90,
    tracks: [
      {
        wave: "sine",
        vol: 0.6,
        notes: [
          { t: 0, n: 60, d: 0.5, v: 0.8 },
          { t: 1, n: 64, d: 0.5, v: 0.8 },
          { t: 2, n: 67, d: 0.5, v: 0.8 },
          { t: 3, n: 71, d: 0.5, v: 0.85 },
          { t: 4, n: 72, d: 0.5, v: 0.85 },
          { t: 5, n: 71, d: 0.5, v: 0.8 },
          { t: 6, n: 67, d: 0.5, v: 0.8 },
          { t: 7, n: 64, d: 0.5, v: 0.8 },
          { t: 8, n: 65, d: 0.5, v: 0.8 },
          { t: 9, n: 69, d: 0.5, v: 0.8 },
          { t: 10, n: 72, d: 0.5, v: 0.85 },
          { t: 11, n: 76, d: 0.5, v: 0.85 },
          { t: 12, n: 77, d: 1, v: 0.9 },
          { t: 14, n: 74, d: 1, v: 0.85 },
        ],
      },
      {
        wave: "tri",
        vol: 0.5,
        notes: [
          { t: 0, n: 48, d: 2, v: 0.85 },
          { t: 4, n: 45, d: 2, v: 0.85 },
          { t: 8, n: 41, d: 2, v: 0.85 },
          { t: 12, n: 43, d: 2, v: 0.85 },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Tab = "seq" | "wave" | "sfx" | "data";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function noteLabel(midi: number): string {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12] ?? "C";
  const oct = Math.floor(midi / 12) - 1;
  return `${name}${oct}`;
}

export function MakerClient() {
  const [song, setSong] = useState<MixSong>(() => demoSongA());
  const [tab, setTab] = useState<Tab>("seq");
  const [trackIdx, setTrackIdx] = useState(0);
  const [bar, setBar] = useState(0);
  const [baseNote, setBaseNote] = useState(72);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState("Tip: tap squares to place notes, then press Play.");
  const [barClipboard, setBarClipboard] = useState<Note4W[] | null>(null);
  const [noteVel, setNoteVel] = useState(0.9);
  const [playStep, setPlayStep] = useState(-1);
  const histRef = useRef<{ past: MixSong[]; future: MixSong[] }>({ past: [], future: [] });
  const [histTick, setHistTick] = useState(0);
  void histTick;

  // Wave lab state (samples live in a ref; version bumps redraw).
  const samplesRef = useRef<Float32Array | null>(null);
  const waveSrRef = useRef(22050);
  const [waveVersion, setWaveVersion] = useState(0);
  const [waveReady, setWaveReady] = useState(false);
  const [selA, setSelA] = useState(0);
  const [selB, setSelB] = useState(100);
  const [sampleClipboard, setSampleClipboard] = useState<Float32Array | null>(null);
  const [echoMs, setEchoMs] = useState(220);
  const [echoRepeats, setEchoRepeats] = useState(3);
  const [echoMix, setEchoMix] = useState(0.35);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // SFX state.
  const [sfx, setSfx] = useState<Sfx4W>(() => presetSfx("coin"));
  const [sfxStepIdx, setSfxStepIdx] = useState(0);

  // Data tab state.
  const [importText, setImportText] = useState("");

  const bytes = useMemo(() => songByteSize(toCanonical(song)), [song]);
  const sfxSize = useMemo(() => sfxByteSize(sfx), [sfx]);
  const track = song.tracks[trackIdx] ?? song.tracks[0] ?? null;

  const say = useCallback((msg: string) => setNote(msg), []);

  const songRef = useRef(song);
  useEffect(() => {
    songRef.current = song;
  }, [song]);

  // ------------------------- history (undo / redo) -------------------------

  const commitSong = useCallback(
    (mut: (prev: MixSong) => MixSong, msg?: string) => {
      try {
        const h = histRef.current;
        h.past.push(JSON.parse(JSON.stringify(songRef.current)) as MixSong);
        if (h.past.length > 60) h.past.shift();
        h.future = [];
      } catch {
        /* history is best-effort */
      }
      setSong((prev) => mut(prev));
      setHistTick((t) => t + 1);
      if (msg) say(msg);
    },
    [say]
  );

  const undo = useCallback(() => {
    const h = histRef.current;
    const prev = h.past.pop();
    if (!prev) {
      say("Nothing to undo.");
      return;
    }
    try {
      h.future.push(JSON.parse(JSON.stringify(songRef.current)) as MixSong);
    } catch {
      /* ignore */
    }
    setSong(prev);
    setHistTick((t) => t + 1);
    say("Undone.");
  }, [say]);

  const redo = useCallback(() => {
    const h = histRef.current;
    const next = h.future.pop();
    if (!next) {
      say("Nothing to redo.");
      return;
    }
    try {
      h.past.push(JSON.parse(JSON.stringify(songRef.current)) as MixSong);
    } catch {
      /* ignore */
    }
    setSong(next);
    setHistTick((t) => t + 1);
    say("Redone.");
  }, [say]);

  // One-time restore (?song= link or draft) after hydration.
  useEffect(() => {
    const found = loadExternalSong();
    if (found) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time post-hydration restore (?song= link or draft); avoids an SSR mismatch.
      setSong(found.song);
      setNote(found.notice);
    }
  }, []);

  // Autosave draft (debounced, fail-closed: only valid songs persist).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.setTimeout(() => {
      try {
        const clean = toCanonical(song);
        if (validateSong(clean).ok) {
          window.localStorage.setItem(DRAFT_KEY, encodeSong(clean));
        }
      } catch {
        // Storage may be full or blocked; stay silent and fail open.
      }
    }, 600);
    return () => window.clearTimeout(id);
  }, [song]);

  // Progress display while the shared engine plays.
  useEffect(() => {
    if (!playing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset playhead when transport stops.
      setPlayStep(-1);
      return;
    }
    const started = Date.now();
    const total = mixSeconds(song);
    const totalSteps = BAR_COUNT * STEPS_PER_BAR;
    const id = window.setInterval(() => {
      try {
        if (!synthIsPlaying()) {
          setPlaying(false);
          setProgress(0);
          setPlayStep(-1);
          return;
        }
        if (total > 0) {
          const el = (Date.now() - started) / 1000;
          const frac = loop ? (el % total) / total : clampNum(el / total, 0, 1);
          setProgress(frac);
          setPlayStep(Math.floor(frac * totalSteps) % totalSteps);
        }
      } catch {
        // ignore ticker edge cases
      }
    }, 150);
    return () => window.clearInterval(id);
  }, [playing, song, loop]);

  // Stop the shared engine on unmount.
  useEffect(() => {
    return () => {
      try {
        synthStopSong();
      } catch {
        // ignore teardown edge cases
      }
    };
  }, []);

  const stopPlayback = useCallback(() => {
    try {
      synthStopSong();
    } catch {
      // ignore
    }
    setPlaying(false);
    setProgress(0);
    setPlayStep(-1);
  }, []);

  const startPlayback = useCallback(() => {
    const view = playbackView(song);
    if (view.tracks.length === 0) {
      say("Every track is muted, unmute one to hear it.");
      return;
    }
    const check = validateSong(view);
    if (!check.ok) {
      say(`Playback blocked: ${check.errors[0] ?? "bad shape"}`);
      return;
    }
    let ok = false;
    try {
      ok = synthPlaySong(view, { loop });
    } catch {
      ok = false;
    }
    if (!ok) {
      say("No audio output on this device, notes still save fine.");
      return;
    }
    setPlaying(true);
    say(loop ? "Playing on loop. Press Stop to end." : "Playing once. Press Stop to end early.");
  }, [song, loop, say]);

  // Keyboard shortcuts: Space plays/stops, arrows move the base note,
  // Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y) undo/redo. Ignored while typing.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      try {
        const el = ev.target as HTMLElement | null;
        const tag = (el && el.tagName) || "";
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (ev.code === "Space") {
          ev.preventDefault();
          if (playing) stopPlayback();
          else startPlayback();
        } else if (ev.key === "ArrowUp") {
          ev.preventDefault();
          setBaseNote((v) => clampNum(v + 1, 12, 108));
        } else if (ev.key === "ArrowDown") {
          ev.preventDefault();
          setBaseNote((v) => clampNum(v - 1, 12, 108));
        } else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z" && !ev.shiftKey) {
          ev.preventDefault();
          undo();
        } else if ((ev.ctrlKey || ev.metaKey) && (ev.key.toLowerCase() === "y" || (ev.key.toLowerCase() === "z" && ev.shiftKey))) {
          ev.preventDefault();
          redo();
        }
      } catch {
        /* ignore */
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [playing, startPlayback, stopPlayback, undo, redo]);

  const tapNote = useCallback(() => {
    const step = Math.floor(progress * BAR_COUNT * STEPS_PER_BAR);
    const beat = clampNum(Math.floor(step * STEP_BEATS * 100) / 100, 0, BAR_COUNT * BAR_BEATS - STEP_BEATS);
    const fresh: Note4W = { t: beat, n: baseNote, d: STEP_BEATS, v: noteVel };
    commitSong((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t, i) => (i === trackIdx ? { ...t, notes: [...t.notes, fresh].slice(0, 512) } : t)),
    }));
    auditionMidi(baseNote);
    say(`Tapped ${noteLabel(baseNote)} at beat ${beat.toFixed(2)} (heard when you replay).`);
  }, [trackIdx, progress, baseNote, noteVel, commitSong, say]);

  // ------------------------- sequencer ops -------------------------

  const cellHasNote = useCallback(
    (midi: number, step: number): boolean => {
      if (!track) return false;
      const beat = bar * BAR_BEATS + step * STEP_BEATS;
      return track.notes.some((n) => Math.abs(n.t - beat) < 0.001 && n.n === midi);
    },
    [track, bar]
  );

  const toggleCell = useCallback(
    (midi: number, step: number) => {
      const beat = Math.round((bar * BAR_BEATS + step * STEP_BEATS) * 100) / 100;
      const exists = track?.notes.some((n) => Math.abs(n.t - beat) < 0.001 && n.n === midi) ?? false;
      if (!exists) auditionMidi(midi);
      commitSong((prev) => {
        const tr = prev.tracks[trackIdx];
        if (!tr) return prev;
        const found = tr.notes.some((n) => Math.abs(n.t - beat) < 0.001 && n.n === midi);
        const notes = found
          ? tr.notes.filter((n) => !(Math.abs(n.t - beat) < 0.001 && n.n === midi))
          : [...tr.notes, { t: beat, n: midi, d: STEP_BEATS, v: noteVel }].slice(0, 512);
        const tracks = prev.tracks.map((t, i) => (i === trackIdx ? { ...t, notes } : t));
        return { ...prev, tracks };
      });
    },
    [bar, trackIdx, track, noteVel, commitSong]
  );

  const updateTrack = useCallback((idx: number, patch: Partial<MixTrack>) => {
    setSong((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t, i) => (i === idx ? { ...t, ...patch } : t)),
    }));
  }, []);

  const addTrack = useCallback(() => {
    commitSong((prev) => {
      if (prev.tracks.length >= 8) return prev;
      return { ...prev, tracks: [...prev.tracks, { wave: "square" as TrackWave4W, vol: 0.7, notes: [] }] };
    });
    say("Track added. Pick its sound on the left.");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- commitSong stable via songRef; say stable.
  }, [say]);

  const removeTrack = useCallback(
    (idx: number) => {
      commitSong((prev) => {
        if (prev.tracks.length <= 1) return prev;
        return { ...prev, tracks: prev.tracks.filter((_, i) => i !== idx) };
      });
      setTrackIdx(0);
      say("Track removed.");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- commitSong is stable via songRef; say is stable.
    [say]
  );

  // ------------------------- one-tap arrangers -------------------------

  const stampChord = useCallback(
    (minor: boolean) => {
      const root = baseNote;
      const tones = [root, root + (minor ? 3 : 4), root + 7];
      const lo = bar * BAR_BEATS;
      commitSong((prev) => {
        const tr = prev.tracks[trackIdx];
        if (!tr) return prev;
        const kept = tr.notes.filter((n) => !(n.t >= lo && n.t < lo + BAR_BEATS && tones.includes(n.n)));
        const chord = tones.map((n) => ({ t: lo, n, d: BAR_BEATS, v: noteVel }));
        const tracks = prev.tracks.map((t, i) => (i === trackIdx ? { ...t, notes: [...kept, ...chord].slice(0, 512) } : t));
        return { ...prev, tracks };
      }, `${minor ? "Minor" : "Major"} chord stamped in bar ${bar + 1}.`);
      auditionMidi(root);
    },
    [baseNote, bar, trackIdx, noteVel, commitSong, say]
  );

  const drumFill = useCallback(() => {
    const cur = songRef.current;
    const idx = cur.tracks.findIndex((t) => t.wave === "noise");
    if (idx === -1 && cur.tracks.length >= 8) {
      say("No room for a drum track, remove one first.");
      return;
    }
    const lo = bar * BAR_BEATS;
    commitSong((prev) => {
      let tracks = prev.tracks;
      let di = tracks.findIndex((t) => t.wave === "noise");
      if (di === -1) {
        tracks = [...tracks, { wave: "noise" as TrackWave4W, vol: 0.6, notes: [] }];
        di = tracks.length - 1;
      }
      const drums: Note4W[] = [];
      for (let s = 0; s < STEPS_PER_BAR; s += 1) {
        const beat = Math.round((lo + s * STEP_BEATS) * 100) / 100;
        if (s % 4 === 0) drums.push({ t: beat, n: 36, d: 0.2, v: 1 });
        else if (s % 2 === 0) drums.push({ t: beat, n: 42, d: 0.1, v: 0.5 });
      }
      const kept = tracks[di].notes.filter((n) => n.t < lo || n.t >= lo + BAR_BEATS);
      const next = tracks.map((t, i) => (i === di ? { ...t, notes: [...kept, ...drums].slice(0, 512) } : t));
      return { ...prev, tracks: next };
    }, `Drums dropped into bar ${bar + 1}.`);
    if (idx !== -1) setTrackIdx(idx);
    else setTrackIdx(cur.tracks.length);
  }, [bar, commitSong, say]);

  const loadTemplate = useCallback(
    (make: () => MixSong, label: string) => {
      commitSong(() => make(), `${label} loaded. Press Play.`);
      setBar(0);
      setTrackIdx(0);
    },
    [commitSong]
  );

  const copyBar = useCallback(() => {
    if (!track) return;
    const lo = bar * BAR_BEATS;
    const hi = lo + BAR_BEATS;
    const clip = track.notes
      .filter((n) => n.t >= lo && n.t < hi)
      .map((n) => ({ ...n, t: Math.round((n.t - lo) * 100) / 100 }));
    setBarClipboard(clip);
    say(clip.length === 0 ? `Bar ${bar + 1} is empty, nothing copied.` : `Copied ${clip.length} notes from bar ${bar + 1}.`);
  }, [track, bar, say]);

  const pasteBar = useCallback(() => {
    if (!barClipboard || barClipboard.length === 0) {
      say("Clipboard is empty, copy a bar first.");
      return;
    }
    const lo = bar * BAR_BEATS;
    commitSong((prev) => {
      const tr = prev.tracks[trackIdx];
      if (!tr) return prev;
      const kept = tr.notes.filter((n) => n.t < lo || n.t >= lo + BAR_BEATS);
      const added = barClipboard.map((n) => ({ ...n, t: Math.round((lo + n.t) * 100) / 100 }));
      const tracks = prev.tracks.map((t, i) => (i === trackIdx ? { ...t, notes: [...kept, ...added].slice(0, 512) } : t));
      return { ...prev, tracks };
    }, `Pasted ${barClipboard.length} notes into bar ${bar + 1}.`);
  }, [barClipboard, bar, trackIdx, commitSong, say]);

  const clearBar = useCallback(() => {
    const lo = bar * BAR_BEATS;
    commitSong((prev) => {
      const tr = prev.tracks[trackIdx];
      if (!tr) return prev;
      const tracks = prev.tracks.map((t, i) =>
        i === trackIdx ? { ...t, notes: t.notes.filter((n) => n.t < lo || n.t >= lo + BAR_BEATS) } : t
      );
      return { ...prev, tracks };
    }, `Cleared bar ${bar + 1} on this track.`);
  }, [bar, trackIdx, commitSong, say]);

  // ------------------------- wave lab ops -------------------------

  const renderMix = useCallback(async () => {
    say("Rendering mix, one moment...");
    const out = await renderMixSamples(song);
    if (!out) {
      say("Render needs a browser with offline audio. Notes are safe.");
      return;
    }
    samplesRef.current = out.samples;
    waveSrRef.current = out.sampleRate;
    setWaveReady(true);
    setSelA(0);
    setSelB(100);
    setWaveVersion((v) => v + 1);
    say(`Mix rendered: ${(out.samples.length / out.sampleRate).toFixed(2)}s. Select, edit, export.`);
  }, [song, say]);

  const selRange = useCallback((): [number, number] | null => {
    const s = samplesRef.current;
    if (!s || s.length === 0) return null;
    const a = Math.floor((clampNum(Math.min(selA, selB), 0, 100) / 100) * s.length);
    const b = Math.ceil((clampNum(Math.max(selA, selB), 0, 100) / 100) * s.length);
    return [clampNum(a, 0, s.length), clampNum(b, 0, s.length)];
  }, [selA, selB]);

  const commit = useCallback(
    (next: Float32Array | null, msg: string) => {
      samplesRef.current = next;
      setWaveReady(next !== null && next.length > 0);
      setWaveVersion((v) => v + 1);
      say(msg);
    },
    [say]
  );

  const waveCopy = useCallback(() => {
    const r = selRange();
    const s = samplesRef.current;
    if (!r || !s) {
      say("Render the mix first.");
      return;
    }
    setSampleClipboard(new Float32Array(s.slice(r[0], r[1])));
    say(`Copied ${(((r[1] - r[0]) / waveSrRef.current) * 1000).toFixed(0)} ms of audio.`);
  }, [selRange, say]);

  const waveCut = useCallback(() => {
    const r = selRange();
    const s = samplesRef.current;
    if (!r || !s) {
      say("Render the mix first.");
      return;
    }
    setSampleClipboard(new Float32Array(s.slice(r[0], r[1])));
    const next = new Float32Array(s.length - (r[1] - r[0]));
    next.set(s.slice(0, r[0]), 0);
    next.set(s.slice(r[1]), r[0]);
    commit(next, "Cut selection to clipboard.");
  }, [selRange, commit, say]);

  const wavePaste = useCallback(() => {
    const s = samplesRef.current;
    if (!s) {
      say("Render the mix first.");
      return;
    }
    if (!sampleClipboard || sampleClipboard.length === 0) {
      say("Clipboard is empty, copy or cut first.");
      return;
    }
    const r = selRange();
    const at = r ? r[0] : s.length;
    const next = new Float32Array(s.length + sampleClipboard.length);
    next.set(s.slice(0, at), 0);
    next.set(sampleClipboard, at);
    next.set(s.slice(at), at + sampleClipboard.length);
    commit(next, `Pasted ${sampleClipboard.length} samples.`);
  }, [selRange, sampleClipboard, commit, say]);

  const waveTrim = useCallback(() => {
    const r = selRange();
    const s = samplesRef.current;
    if (!r || !s) {
      say("Render the mix first.");
      return;
    }
    commit(new Float32Array(s.slice(r[0], r[1])), "Trimmed to selection.");
  }, [selRange, commit, say]);

  const waveGain = useCallback(
    (amount: number, label: string) => {
      const s = samplesRef.current;
      if (!s) {
        say("Render the mix first.");
        return;
      }
      const next = new Float32Array(s);
      for (let i = 0; i < next.length; i += 1) next[i] = clampNum((next[i] ?? 0) * amount, -1, 1);
      commit(next, label);
    },
    [commit, say]
  );

  const waveFade = useCallback(
    (mode: "in" | "out") => {
      const r = selRange();
      const s = samplesRef.current;
      if (!r || !s) {
        say("Render the mix first.");
        return;
      }
      const next = new Float32Array(s);
      const span = Math.max(1, r[1] - r[0]);
      for (let i = r[0]; i < r[1]; i += 1) {
        const k = (i - r[0]) / span;
        const g = mode === "in" ? k : 1 - k;
        next[i] = (next[i] ?? 0) * g;
      }
      commit(next, mode === "in" ? "Fade-in applied to selection." : "Fade-out applied to selection.");
    },
    [selRange, commit, say]
  );

  const waveNormalize = useCallback(() => {
    const s = samplesRef.current;
    if (!s) {
      say("Render the mix first.");
      return;
    }
    let peak = 0;
    for (let i = 0; i < s.length; i += 1) peak = Math.max(peak, Math.abs(s[i] ?? 0));
    if (peak < 0.0001) {
      say("Mix is silent, nothing to normalize.");
      return;
    }
    const g = 0.98 / peak;
    const next = new Float32Array(s.length);
    for (let i = 0; i < s.length; i += 1) next[i] = clampNum((s[i] ?? 0) * g, -1, 1);
    commit(next, `Normalized to peak (gain x${g.toFixed(2)}).`);
  }, [commit, say]);

  const waveEcho = useCallback(() => {
    const s = samplesRef.current;
    if (!s) {
      say("Render the mix first.");
      return;
    }
    const sr = waveSrRef.current;
    const delay = Math.max(1, Math.floor((clampNum(echoMs, 20, 1000) / 1000) * sr));
    const reps = clampNum(Math.round(echoRepeats), 1, 8);
    const mix = clampNum(echoMix, 0, 0.9);
    const next = new Float32Array(s);
    for (let r = 1; r <= reps; r += 1) {
      const g = Math.pow(mix, r);
      const off = delay * r;
      for (let i = 0; i + off < next.length; i += 1) {
        next[i + off] = clampNum((next[i + off] ?? 0) + (s[i] ?? 0) * g, -1, 1);
      }
    }
    commit(next, `Echo added: ${echoMs} ms x${reps}.`);
  }, [echoMs, echoRepeats, echoMix, commit, say]);

  const playSelection = useCallback(() => {
    const s = samplesRef.current;
    if (!s) {
      say("Render the mix first.");
      return;
    }
    let ctx: AudioContext | null = null;
    try {
      ctx = ensureAudio();
    } catch {
      ctx = null;
    }
    if (!ctx) {
      say("No audio output on this device.");
      return;
    }
    const r = selRange();
    const slice = r ? s.slice(r[0], r[1]) : s;
    if (slice.length === 0) {
      say("Selection is empty.");
      return;
    }
    try {
      const buf = ctx.createBuffer(1, slice.length, waveSrRef.current);
      buf.getChannelData(0).set(slice);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start();
      say("Playing selection.");
    } catch {
      say("Could not play selection.");
    }
  }, [selRange, say]);

  const exportWav = useCallback(() => {
    const s = samplesRef.current;
    if (!s || s.length === 0) {
      say("Render the mix first.");
      return;
    }
    try {
      const blob = encodeWav16Mono(s, waveSrRef.current);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${song.title || "song"}.wav`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      say("WAV downloaded. Check your downloads folder.");
    } catch {
      say("WAV export failed on this browser.");
    }
  }, [song, say]);

  // Draw waveform.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || tab !== "wave") return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx2d.fillStyle = "#0f172a";
    ctx2d.fillRect(0, 0, W, H);
    const s = samplesRef.current;
    if (!s || s.length === 0) {
      ctx2d.fillStyle = "#64748b";
      ctx2d.font = "12px sans-serif";
      ctx2d.fillText("Render the mix to see waves here.", 12, H / 2);
      return;
    }
    const mid = H / 2;
    ctx2d.strokeStyle = "#22d3ee";
    ctx2d.lineWidth = 1;
    ctx2d.beginPath();
    for (let x = 0; x < W; x += 1) {
      const i0 = Math.floor((x / W) * s.length);
      const i1 = Math.max(i0 + 1, Math.floor(((x + 1) / W) * s.length));
      let peak = 0;
      for (let i = i0; i < i1 && i < s.length; i += 1) peak = Math.max(peak, Math.abs(s[i] ?? 0));
      const y = peak * (mid - 4);
      ctx2d.moveTo(x + 0.5, mid - y);
      ctx2d.lineTo(x + 0.5, mid + y);
    }
    ctx2d.stroke();
    const ax = (clampNum(Math.min(selA, selB), 0, 100) / 100) * W;
    const bx = (clampNum(Math.max(selA, selB), 0, 100) / 100) * W;
    ctx2d.fillStyle = "rgba(34, 211, 238, 0.18)";
    ctx2d.fillRect(ax, 0, Math.max(1, bx - ax), H);
    ctx2d.fillStyle = "#22d3ee";
    ctx2d.fillRect(ax - 1, 0, 2, H);
    ctx2d.fillRect(bx - 1, 0, 2, H);
    // Redraw trigger (effect deps below); no direct read needed.
    void waveVersion;
  }, [tab, selA, selB, waveVersion]);

  // ------------------------- sfx ops -------------------------

  const playSfx = useCallback(
    (target?: Sfx4W) => {
      const fx = target ?? sfx;
      const check = validateSfx(fx);
      if (!check.ok) {
        say(`SFX blocked: ${check.errors[0] ?? "bad shape"}`);
        return;
      }
      let ok = false;
      try {
        ok = synthPlaySfx(fx);
      } catch {
        ok = false;
      }
      say(ok ? `Playing ${fx.name}.` : "No audio output on this device, edits still save.");
    },
    [sfx, say]
  );

  const randomizeSfx = useCallback(() => {
    setSfx((prev) => {
      const kinds: SfxKind4W[] = [...SFX_KINDS];
      const kind = kinds[Math.floor(Math.random() * kinds.length)] ?? "click";
      const base = presetSfx(kind);
      const steps = base.steps.map((st) => ({
        ...st,
        freq: Math.round(clampNum(st.freq * (0.7 + Math.random() * 0.6), 20, 20000)),
        freqEnd: Math.round(clampNum(st.freqEnd * (0.7 + Math.random() * 0.6), 20, 20000)),
        dur: Math.round(clampNum(st.dur * (0.7 + Math.random() * 0.6), 0.03, 2) * 100) / 100,
        vol: Math.round(clampNum(st.vol, 0.2, 1) * 100) / 100,
      }));
      return { v: 1 as const, name: prev.name || kind, kind, steps };
    });
    setSfxStepIdx(0);
    say("Shuffled a fresh random effect. Press play.");
  }, [say]);

  const updateSfxStep = useCallback(
    (patch: Partial<SfxStep4W>) => {
      setSfx((prev) => ({
        ...prev,
        steps: prev.steps.map((st, i) => (i === sfxStepIdx ? { ...st, ...patch } : st)),
      }));
    },
    [sfxStepIdx]
  );

  // ------------------------- data ops -------------------------

  const copyText = useCallback(
    async (text: string, okMsg: string) => {
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(text);
          say(okMsg);
        } else {
          say("Clipboard blocked here, use download instead.");
        }
      } catch {
        say("Copy blocked here, use download instead.");
      }
    },
    [say]
  );

  const exportSongFile = useCallback(() => {
    const clean = toCanonical(song);
    const check = validateSong(clean);
    if (!check.ok) {
      say(`Export blocked: ${check.errors[0] ?? "bad shape"}`);
      return;
    }
    try {
      const blob = new Blob([encodeSong(clean)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${song.title || "song"}.4w.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      say("Song file downloaded.");
    } catch {
      say("Download failed on this browser.");
    }
  }, [song, say]);

  const importSongText = useCallback(
    (text: string) => {
      const res = decodeSong(text);
      if (!res.ok || !res.song) {
        say(`Import blocked: ${res.errors[0] ?? "bad shape"}`);
        return;
      }
      setSong(fromCanonical(res.song));
      setTrackIdx(0);
      setBar(0);
      say("Song imported. Press Play to hear it.");
    },
    [say]
  );

  const shareLink = useCallback(() => {
    const clean = toCanonical(song);
    const check = validateSong(clean);
    if (!check.ok) {
      say(`Share blocked: ${check.errors[0] ?? "bad shape"}`);
      return;
    }
    const b64 = jsonToB64(encodeSong(clean));
    if (!b64) {
      say("Share encoding failed here.");
      return;
    }
    const url = typeof window !== "undefined" ? `${window.location.origin}/music/maker?song=${b64}` : b64;
    void copyText(url, "Share link copied. Anyone opening it loads this song.");
  }, [song, copyText, say]);

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    setSong(demoSongA());
    setTrackIdx(0);
    setBar(0);
    say("Draft cleared, fresh demo loaded.");
  }, [say]);

  const activeSfxStep = sfx.steps[sfxStepIdx] ?? sfx.steps[0] ?? null;
  const overBudget = bytes < 0 || bytes > MAX_SONG_BYTES;
  const sfxOver = sfxSize < 0 || sfxSize > MAX_SFX_BYTES;

  const tabBtn = (id: Tab, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      aria-pressed={tab === id}
      className={`rounded-full px-4 py-2 text-sm font-bold transition ${
        tab === id ? "bg-cyan-400 text-slate-950" : "bg-white/10 text-slate-200 hover:bg-white/20"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[.03] p-4 sm:p-6">
      <p role="status" className="rounded-xl bg-cyan-400/10 p-3 text-sm text-cyan-100">
        {note} (shared song lib linked)
      </p>

      {/* Transport header */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">Title</span>
          <input
            value={song.title}
            maxLength={64}
            onChange={(e) => setSong((p) => ({ ...p, title: e.target.value }))}
            className="w-36 rounded-lg bg-white/10 px-2 py-1 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-300"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">Tempo {song.bpm}</span>
          <input
            type="range"
            min={40}
            max={240}
            value={clampNum(song.bpm, 40, 240)}
            onChange={(e) => setSong((p) => ({ ...p, bpm: Number(e.target.value) }))}
            aria-label="Tempo in beats per minute"
          />
        </label>
        <button
          type="button"
          onClick={() => setLoop((v) => !v)}
          aria-pressed={loop}
          className={`rounded-full px-4 py-2 text-sm font-bold ${loop ? "bg-emerald-400 text-slate-950" : "bg-white/10 text-slate-200"}`}
        >
          Loop {loop ? "on" : "off"}
        </button>
        {playing ? (
          <button type="button" onClick={stopPlayback} className="rounded-full bg-rose-400 px-5 py-2 text-sm font-bold text-slate-950">
            Stop
          </button>
        ) : (
          <button type="button" onClick={startPlayback} className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-bold text-slate-950">
            Play
          </button>
        )}
        <button type="button" onClick={tapNote} className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/20">
          Tap note
        </button>
        <button type="button" onClick={undo} className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/20" aria-label="Undo last edit">
          Undo
        </button>
        <button type="button" onClick={redo} className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/20" aria-label="Redo last undone edit">
          Redo
        </button>
        <span className={`ml-auto text-sm font-bold ${overBudget ? "text-rose-300" : "text-emerald-300"}`} aria-live="polite">
          {bytes < 0 ? "n/a" : bytes} / {MAX_SONG_BYTES} bytes
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <div className="h-full bg-cyan-300 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Maker sections">
        {tabBtn("seq", "Sequencer")}
        {tabBtn("wave", "Wave Lab")}
        {tabBtn("sfx", "SFX")}
        {tabBtn("data", "Data + Share")}
      </div>

      {/* ------------------------- SEQUENCER ------------------------- */}
      {tab === "seq" && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[240px_1fr]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Tracks</h2>
              <button type="button" onClick={addTrack} className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold hover:bg-white/20">
                + Add
              </button>
            </div>
            {song.tracks.map((t, i) => (
              <div
                key={i}
                className={`rounded-xl border p-2 text-xs ${i === trackIdx ? "border-cyan-300/60 bg-cyan-400/10" : "border-white/10 bg-white/[.02]"}`}
              >
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setTrackIdx(i)} className="font-bold text-white">
                    {i + 1}. {t.wave}
                  </button>
                  <span className="text-slate-500">{t.notes.length} notes</span>
                  <button type="button" onClick={() => removeTrack(i)} aria-label={`Remove track ${i + 1}`} className="ml-auto text-slate-500 hover:text-rose-300">
                    x
                  </button>
                </div>
                <label className="mt-1 flex items-center gap-1 text-slate-400">
                  Sound
                  <select
                    value={t.wave}
                    onChange={(e) => updateTrack(i, { wave: e.target.value as TrackWave4W })}
                    className="rounded bg-white/10 px-1 py-0.5 text-white"
                  >
                    {TRACK_WAVES.map((w) => (
                      <option key={w} value={w} className="text-slate-900">
                        {w}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mt-1 flex items-center gap-1 text-slate-400">
                  Vol
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={t.vol ?? 0.7}
                    onChange={(e) => updateTrack(i, { vol: Number(e.target.value) })}
                    aria-label={`Track ${i + 1} volume`}
                    className="w-20"
                  />
                  <span>{Math.round((t.vol ?? 0.7) * 100)}</span>
                </label>
                <label className="mt-1 flex items-center gap-1 text-slate-400">
                  Pan
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.1}
                    value={t.pan ?? 0}
                    onChange={(e) => updateTrack(i, { pan: Number(e.target.value) })}
                    aria-label={`Track ${i + 1} pan`}
                    className="w-20"
                  />
                  <span>{(t.pan ?? 0) > 0 ? "R" : (t.pan ?? 0) < 0 ? "L" : "C"}</span>
                </label>
                <div className="mt-1 flex gap-1">
                  <button
                    type="button"
                    onClick={() => updateTrack(i, { mute: !t.mute })}
                    aria-pressed={!!t.mute}
                    className={`rounded px-2 py-0.5 font-bold ${t.mute ? "bg-amber-400 text-slate-950" : "bg-white/10"}`}
                  >
                    Mute
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTrack(i, { solo: !t.solo })}
                    aria-pressed={!!t.solo}
                    className={`rounded px-2 py-0.5 font-bold ${t.solo ? "bg-emerald-400 text-slate-950" : "bg-white/10"}`}
                  >
                    Solo
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-bold">Bar</span>
              {[0, 1, 2, 3].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBar(b)}
                  aria-pressed={bar === b}
                  className={`rounded px-3 py-1 font-bold ${bar === b ? "bg-cyan-400 text-slate-950" : "bg-white/10"}`}
                >
                  {b + 1}
                </button>
              ))}
              <span className="ml-2 text-slate-400">Base {noteLabel(baseNote)}</span>
              <button type="button" onClick={() => setBaseNote((v) => clampNum(v - 12, 12, 96))} className="rounded bg-white/10 px-2 py-1" aria-label="Octave down">
                -oct
              </button>
              <button type="button" onClick={() => setBaseNote((v) => clampNum(v + 12, 12, 96))} className="rounded bg-white/10 px-2 py-1" aria-label="Octave up">
                +oct
              </button>
              <span className="ml-auto flex gap-1">
                <button type="button" onClick={copyBar} className="rounded bg-white/10 px-2 py-1 text-xs font-bold hover:bg-white/20">
                  Copy bar
                </button>
                <button type="button" onClick={pasteBar} className="rounded bg-white/10 px-2 py-1 text-xs font-bold hover:bg-white/20">
                  Paste bar
                </button>
                <button type="button" onClick={clearBar} className="rounded bg-white/10 px-2 py-1 text-xs font-bold hover:bg-white/20">
                  Clear bar
                </button>
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-400">START FROM</span>
              <button type="button" onClick={() => loadTemplate(templateMarch, "Parade march")} className="rounded bg-white/10 px-2 py-1 font-bold hover:bg-white/20">
                March
              </button>
              <button type="button" onClick={() => loadTemplate(templateBoss, "Boss loop")} className="rounded bg-white/10 px-2 py-1 font-bold hover:bg-white/20">
                Boss loop
              </button>
              <button type="button" onClick={() => loadTemplate(templateDream, "Dream arp")} className="rounded bg-white/10 px-2 py-1 font-bold hover:bg-white/20">
                Dream arp
              </button>
              <span className="font-bold text-slate-400">CHORD</span>
              <button type="button" onClick={() => stampChord(false)} className="rounded bg-white/10 px-2 py-1 font-bold hover:bg-white/20">
                Major
              </button>
              <button type="button" onClick={() => stampChord(true)} className="rounded bg-white/10 px-2 py-1 font-bold hover:bg-white/20">
                Minor
              </button>
              <button type="button" onClick={drumFill} className="rounded bg-white/10 px-2 py-1 font-bold hover:bg-white/20">
                Drum fill
              </button>
              <label className="flex items-center gap-1 text-slate-400">
                Hit
                <input
                  type="range"
                  min={0.3}
                  max={1}
                  step={0.05}
                  value={noteVel}
                  onChange={(e) => setNoteVel(Number(e.target.value))}
                  aria-label="New note strength"
                  className="w-16"
                />
                <span>{Math.round(noteVel * 100)}</span>
              </label>
            </div>
            <div className="mt-2 overflow-x-auto">
              <div className="grid min-w-[520px]" style={{ gridTemplateColumns: `52px repeat(${STEPS_PER_BAR}, 1fr)` }} role="grid" aria-label="Piano roll">
                {Array.from({ length: ROWS }, (_, row) => {
                  const midi = baseNote + (ROWS - 1 - row);
                  const inScale = MAJOR_SCALE.includes(((midi % 12) + 12) % 12);
                  return (
                    <div key={row} className="contents">
                      <div className={`py-0.5 pr-1 text-right text-[10px] ${inScale ? "text-slate-300" : "text-slate-600"}`}>{noteLabel(midi)}</div>
                      {Array.from({ length: STEPS_PER_BAR }, (_, step) => {
                        const on = cellHasNote(midi, step);
                        const downbeat = step % 4 === 0;
                        const hot = playing && step + bar * STEPS_PER_BAR === playStep;
                        return (
                          <button
                            key={step}
                            type="button"
                            role="gridcell"
                            aria-label={`${noteLabel(midi)} step ${step + 1}${on ? " on" : ""}`}
                            onClick={() => toggleCell(midi, step)}
                            className={`m-[1px] h-6 rounded-sm border ${
                              on
                                ? hot
                                  ? "border-white bg-white"
                                  : "border-cyan-200 bg-cyan-300"
                                : hot
                                  ? "border-cyan-300/70 bg-cyan-300/30"
                                  : downbeat
                                    ? "border-white/20 bg-white/10 hover:bg-white/25"
                                    : "border-white/10 bg-white/[.04] hover:bg-white/20"
                            }`}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Editing track {trackIdx + 1}, bar {bar + 1} of {BAR_COUNT}. Each column is a 16th note. Bright note names sit in C major.
              Undo (Ctrl+Z) and redo (Ctrl+Y) cover every note and bar edit. Space plays or stops, arrow keys move the base note, tapping a square previews its pitch.
              Pan shapes the rendered mix and WAV export.
            </p>
          </div>
        </div>
      )}

      {/* ------------------------- WAVE LAB ------------------------- */}
      {tab === "wave" && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void renderMix()} className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950">
              Render mix
            </button>
            <button type="button" onClick={playSelection} disabled={!waveReady} className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold disabled:opacity-40">
              Play selection
            </button>
            <button type="button" onClick={exportWav} disabled={!waveReady} className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold disabled:opacity-40">
              Export WAV
            </button>
          </div>
          <canvas ref={canvasRef} width={640} height={160} className="w-full rounded-xl border border-white/10" aria-label="Waveform view" />
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <span className="text-slate-400">Start {selA}%</span>
              <input type="range" min={0} max={100} value={selA} onChange={(e) => setSelA(Number(e.target.value))} aria-label="Selection start percent" />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-slate-400">End {selB}%</span>
              <input type="range" min={0} max={100} value={selB} onChange={(e) => setSelB(Number(e.target.value))} aria-label="Selection end percent" />
            </label>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <button type="button" onClick={waveCut} disabled={!waveReady} className="rounded bg-white/10 px-3 py-1 font-bold disabled:opacity-40">Cut</button>
            <button type="button" onClick={waveCopy} disabled={!waveReady} className="rounded bg-white/10 px-3 py-1 font-bold disabled:opacity-40">Copy</button>
            <button type="button" onClick={wavePaste} disabled={!waveReady} className="rounded bg-white/10 px-3 py-1 font-bold disabled:opacity-40">Paste</button>
            <button type="button" onClick={waveTrim} disabled={!waveReady} className="rounded bg-white/10 px-3 py-1 font-bold disabled:opacity-40">Trim</button>
            <button type="button" onClick={() => waveGain(1.25, "Gain up x1.25 on mix.")} disabled={!waveReady} className="rounded bg-white/10 px-3 py-1 font-bold disabled:opacity-40">Gain +</button>
            <button type="button" onClick={() => waveGain(0.8, "Gain down x0.8 on mix.")} disabled={!waveReady} className="rounded bg-white/10 px-3 py-1 font-bold disabled:opacity-40">Gain -</button>
            <button type="button" onClick={() => waveFade("in")} disabled={!waveReady} className="rounded bg-white/10 px-3 py-1 font-bold disabled:opacity-40">Fade in</button>
            <button type="button" onClick={() => waveFade("out")} disabled={!waveReady} className="rounded bg-white/10 px-3 py-1 font-bold disabled:opacity-40">Fade out</button>
            <button type="button" onClick={waveNormalize} disabled={!waveReady} className="rounded bg-white/10 px-3 py-1 font-bold disabled:opacity-40">Normalize</button>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 p-3 text-sm">
            <span className="font-bold">Echo</span>
            <label className="flex items-center gap-1 text-slate-400">
              Delay {echoMs}ms
              <input type="range" min={20} max={1000} step={10} value={echoMs} onChange={(e) => setEchoMs(Number(e.target.value))} aria-label="Echo delay milliseconds" />
            </label>
            <label className="flex items-center gap-1 text-slate-400">
              Repeats {echoRepeats}
              <input type="range" min={1} max={8} step={1} value={echoRepeats} onChange={(e) => setEchoRepeats(Number(e.target.value))} aria-label="Echo repeats" />
            </label>
            <label className="flex items-center gap-1 text-slate-400">
              Mix {Math.round(echoMix * 100)}%
              <input type="range" min={0} max={0.9} step={0.05} value={echoMix} onChange={(e) => setEchoMix(Number(e.target.value))} aria-label="Echo mix" />
            </label>
            <button type="button" onClick={waveEcho} disabled={!waveReady} className="rounded bg-emerald-400 px-3 py-1 font-bold text-slate-950 disabled:opacity-40">
              Apply echo
            </button>
          </div>
          <p className="text-xs text-slate-500">
            The wave lab edits the rendered mix only, honoring mute, solo, and pan. Note edits stay in the Sequencer. Render again after changing notes to refresh the wave.
            Wave key {waveVersion} {waveReady ? "ready" : "empty"}.
          </p>
        </div>
      )}

      {/* ------------------------- SFX ------------------------- */}
      {tab === "sfx" && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {SFX_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setSfx(presetSfx(k));
                  setSfxStepIdx(0);
                  say(`Loaded ${k} preset. Press play.`);
                }}
                aria-pressed={sfx.kind === k}
                className={`rounded-full px-3 py-1 text-xs font-bold ${sfx.kind === k ? "bg-cyan-400 text-slate-950" : "bg-white/10 hover:bg-white/20"}`}
              >
                {k}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="flex items-center gap-2">
              <span className="text-slate-400">Name</span>
              <input
                value={sfx.name}
                maxLength={32}
                onChange={(e) => setSfx((p) => ({ ...p, name: e.target.value }))}
                className="w-32 rounded-lg bg-white/10 px-2 py-1 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-300"
              />
            </label>
            <button type="button" onClick={() => playSfx()} className="rounded-full bg-cyan-400 px-4 py-1 font-bold text-slate-950">
              Play
            </button>
            <button type="button" onClick={randomizeSfx} className="rounded-full bg-white/10 px-4 py-1 font-bold hover:bg-white/20">
              Randomize
            </button>
            <button
              type="button"
              onClick={() => void copyText(encodeSfx(sfx), "SFX JSON copied.")}
              className="rounded-full bg-white/10 px-4 py-1 font-bold hover:bg-white/20"
            >
              Copy JSON
            </button>
            <span className={`ml-auto font-bold ${sfxOver ? "text-rose-300" : "text-emerald-300"}`}>
              {sfxSize < 0 ? "n/a" : sfxSize} / {MAX_SFX_BYTES} bytes
            </span>
          </div>
          <div className="flex gap-2 text-sm">
            {sfx.steps.map((st, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSfxStepIdx(i)}
                aria-pressed={sfxStepIdx === i}
                className={`rounded px-3 py-1 font-bold ${sfxStepIdx === i ? "bg-cyan-400 text-slate-950" : "bg-white/10"}`}
              >
                Step {i + 1}
              </button>
            ))}
          </div>
          {activeSfxStep && (
            <div className="grid gap-2 rounded-xl border border-white/10 p-3 text-sm sm:grid-cols-2">
              <label className="flex items-center gap-2">
                <span className="w-20 text-slate-400">Freq {activeSfxStep.freq}</span>
                <input type="range" min={20} max={20000} value={clampNum(activeSfxStep.freq, 20, 20000)} onChange={(e) => updateSfxStep({ freq: Number(e.target.value) })} aria-label="SFX step frequency" className="flex-1" />
              </label>
              <label className="flex items-center gap-2">
                <span className="w-20 text-slate-400">Slide {activeSfxStep.freqEnd}</span>
                <input type="range" min={20} max={20000} value={clampNum(activeSfxStep.freqEnd, 20, 20000)} onChange={(e) => updateSfxStep({ freqEnd: Number(e.target.value) })} aria-label="SFX step slide target" className="flex-1" />
              </label>
              <label className="flex items-center gap-2">
                <span className="w-20 text-slate-400">Len {activeSfxStep.dur}s</span>
                <input type="range" min={0.03} max={2} step={0.01} value={activeSfxStep.dur} onChange={(e) => updateSfxStep({ dur: Number(e.target.value) })} aria-label="SFX step length" className="flex-1" />
              </label>
              <label className="flex items-center gap-2">
                <span className="w-20 text-slate-400">Vol {Math.round(activeSfxStep.vol * 100)}</span>
                <input type="range" min={0} max={1} step={0.05} value={activeSfxStep.vol} onChange={(e) => updateSfxStep({ vol: Number(e.target.value) })} aria-label="SFX step volume" className="flex-1" />
              </label>
              <label className="flex items-center gap-2">
                <span className="w-20 text-slate-400">Wave</span>
                <select
                  value={activeSfxStep.wave}
                  onChange={(e) => updateSfxStep({ wave: e.target.value as TrackWave4W })}
                  className="rounded bg-white/10 px-2 py-1 text-white"
                >
                  {TRACK_WAVES.map((w) => (
                    <option key={w} value={w} className="text-slate-900">
                      {w}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => updateSfxStep({ type: activeSfxStep.type === "tone" ? "noise" : "tone" })}
                className="rounded bg-white/10 px-3 py-1 font-bold hover:bg-white/20"
                aria-pressed={activeSfxStep.type === "noise"}
              >
                Type: {activeSfxStep.type}
              </button>
            </div>
          )}
          <p className="text-xs text-slate-500">Ten classic game sounds, ready for your own games. Keep each under {MAX_SFX_BYTES} bytes so it fits anywhere.</p>
        </div>
      )}

      {/* ------------------------- DATA ------------------------- */}
      {tab === "data" && (
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void copyText(encodeSong(toCanonical(song)), "Song JSON copied.")} className="rounded-full bg-cyan-400 px-4 py-2 font-bold text-slate-950">
              Copy song JSON
            </button>
            <button type="button" onClick={exportSongFile} className="rounded-full bg-white/10 px-4 py-2 font-bold hover:bg-white/20">
              Download file
            </button>
            <button type="button" onClick={shareLink} className="rounded-full bg-white/10 px-4 py-2 font-bold hover:bg-white/20">
              Copy share link
            </button>
            <button type="button" onClick={clearDraft} className="rounded-full bg-white/10 px-4 py-2 font-bold hover:bg-white/20">
              Clear draft
            </button>
            <button type="button" onClick={() => setSong(demoSongA())} className="rounded-full bg-white/10 px-4 py-2 font-bold hover:bg-white/20">
              Demo A
            </button>
            <button type="button" onClick={() => setSong(demoSongB())} className="rounded-full bg-white/10 px-4 py-2 font-bold hover:bg-white/20">
              Demo B
            </button>
          </div>
          <p className={overBudget ? "font-bold text-rose-300" : "text-emerald-300"}>
            Size {bytes < 0 ? "n/a" : bytes} / {MAX_SONG_BYTES} bytes {overBudget ? "(over budget: delete notes or tracks)" : "(fits the tiny format)"}
          </p>
          <label className="block">
            <span className="mb-1 block text-slate-400">Import song JSON (paste, then press Import)</span>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={6}
              spellCheck={false}
              placeholder="Paste a 4W-1 song JSON here"
              className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 font-mono text-xs text-slate-200 outline-none focus:ring-2 focus:ring-cyan-300"
            />
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => importSongText(importText)} className="rounded-full bg-emerald-400 px-4 py-2 font-bold text-slate-950">
              Import
            </button>
            <button type="button" onClick={() => setImportText(encodeSong(toCanonical(song)))} className="rounded-full bg-white/10 px-4 py-2 font-bold hover:bg-white/20">
              Show current JSON
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Drafts save in this browser only. Share links carry the whole song in the address, no server involved.
          </p>
        </div>
      )}
    </div>
  );
}
