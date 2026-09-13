/**
 * lib/music/synth-4w.ts - WebAudio synth engine for the 4W-1 contract (DS-MUS-02).
 *
 * Imports ONLY types/guards from './format-4w' (read-only dependency).
 * All other logic lives here. SSR-safe: no browser APIs at module top.
 * Offline-safe: every export is a no-op (never throws) when there is no
 * AudioContext (SSR, unsupported browser, or blocked autoplay).
 *
 * Engine: lazy AudioContext created on first user gesture (playSong/playSfx
 * or ensureAudio), lookahead scheduler (25 ms timer, 120 ms horizon) for
 * songs, one-shot step player for SFX, per-track osc (square/saw/tri/sine)
 * plus a shared noise buffer, master/music/sfx gains plus mute.
 *
 * ASCII-only. No DOM, no Node APIs outside the lazy AudioContext path.
 */

import {
  noteToFreq,
  validateSfx,
  validateSong,
} from "./format-4w";
import type {
  Sfx4W,
  SfxStep4W,
  Song4W,
  TrackWave4W,
} from "./format-4w";

// ---------------------------------------------------------------------------
// Options + tiny public state
// ---------------------------------------------------------------------------

/** Options for playSong. All fields optional. */
export interface SynthPlayOptions {
  /** Beat to start from (default 0). Clamped to >= 0. */
  startBeat?: number;
  /** Loop the song when it ends (default false). */
  loop?: boolean;
  /** Seconds of scheduler lookahead (default 0.12, clamped 0.05..0.5). */
  lookahead?: number;
}

/** Snapshot of engine state. Never throws. */
export interface SynthState {
  playing: boolean;
  paused: boolean;
  pausedBeat: number;
  muted: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  hasContext: boolean;
}

interface SongEvent {
  beat: number;
  trackIndex: number;
  trackWave: TrackWave4W;
  trackVol: number;
  midi: number;
  lenBeats: number;
  vel: number;
}

// ---------------------------------------------------------------------------
// Module state (no browser APIs here - SSR-safe)
// ---------------------------------------------------------------------------

const SCHED_TIMER_MS = 25;
const DEFAULT_LOOKAHEAD_SEC = 0.12;
const START_DELAY_SEC = 0.06;
const MIN_GAIN = 0.0001;

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;

let timerId: ReturnType<typeof setInterval> | null = null;
let activeNodes: AudioScheduledSourceNode[] = [];
let events: SongEvent[] = [];
let eventIndex = 0;
let currentSong: Song4W | null = null;
let currentLoop = false;
let currentLookahead = DEFAULT_LOOKAHEAD_SEC;
let songEndBeat = 0;
let startCtxTime = 0;
let startBeatOffset = 0;
let pausedBeat = 0;
let playing = false;

let masterVolume = 0.8;
let musicVolume = 0.8;
let sfxVolume = 0.9;
let muted = false;

// ---------------------------------------------------------------------------
// Small pure helpers (no audio)
// ---------------------------------------------------------------------------

function clamp(value: number, lo: number, hi: number): number {
  if (!Number.isFinite(value)) return lo;
  if (value < lo) return lo;
  if (value > hi) return hi;
  return value;
}

function beatsToSec(beats: number, bpm: number): number {
  return (beats * 60) / bpm;
}

function toOscType(wave: TrackWave4W): OscillatorType {
  if (wave === "saw") return "sawtooth";
  if (wave === "tri") return "triangle";
  if (wave === "sine") return "sine";
  return "square";
}

function trackVolOf(trackVol: number | undefined): number {
  return trackVol === undefined ? 0.8 : clamp(trackVol, 0, 1);
}

function noteVelOf(vel: number | undefined): number {
  return vel === undefined ? 0.8 : clamp(vel, 0, 1);
}

function buildEvents(song: Song4W): SongEvent[] {
  const out: SongEvent[] = [];
  for (let ti = 0; ti < song.tracks.length; ti++) {
    const track = song.tracks[ti];
    if (!track) continue;
    const vol = trackVolOf(track.vol);
    for (const note of track.notes) {
      out.push({
        beat: note.t,
        trackIndex: ti,
        trackWave: track.wave,
        trackVol: vol,
        midi: note.n,
        lenBeats: note.d,
        vel: noteVelOf(note.v),
      });
    }
  }
  out.sort((a, b) => a.beat - b.beat || a.trackIndex - b.trackIndex);
  return out;
}

function songEndOf(song: Song4W): number {
  let end = 0;
  for (const track of song.tracks) {
    for (const note of track.notes) {
      const stop = note.t + note.d;
      if (stop > end) end = stop;
    }
  }
  return end;
}

// ---------------------------------------------------------------------------
// Lazy AudioContext (first-gesture creation + resume). Never throws.
// ---------------------------------------------------------------------------

function createContext(): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;
    const w = window as unknown as Record<string, unknown>;
    const Ctor = (w.AudioContext ??
      w.webkitAudioContext) as unknown as
      | (new () => AudioContext)
      | undefined;
    if (typeof Ctor !== "function") return null;
    const created = new Ctor();
    return created;
  } catch {
    return null;
  }
}

function buildGraph(c: AudioContext): void {
  masterGain = c.createGain();
  musicGain = c.createGain();
  sfxGain = c.createGain();
  masterGain.gain.value = muted ? 0 : clamp(masterVolume, 0, 1);
  musicGain.gain.value = clamp(musicVolume, 0, 1);
  sfxGain.gain.value = clamp(sfxVolume, 0, 1);
  musicGain.connect(masterGain);
  sfxGain.connect(masterGain);
  masterGain.connect(c.destination);
  noiseBuffer = null;
}

/**
 * Ensure the lazy AudioContext exists and is resumed (call from a user
 * gesture). Returns the context or null when unavailable. Never throws.
 */
export function ensureAudio(): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;
    if (!ctx) {
      const created = createContext();
      if (!created) return null;
      ctx = created;
      buildGraph(created);
    }
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => undefined);
    }
    return ctx;
  } catch {
    return null;
  }
}

function getNoiseBuffer(c: AudioContext): AudioBuffer | null {
  try {
    if (noiseBuffer) return noiseBuffer;
    const len = Math.max(1, Math.floor(c.sampleRate));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noiseBuffer = buf;
    return buf;
  } catch {
    return null;
  }
}

function trackNode(node: AudioScheduledSourceNode): void {
  activeNodes.push(node);
  if (activeNodes.length > 512) {
    activeNodes = activeNodes.slice(-256);
  }
}

function silenceActive(): void {
  const nodes = activeNodes;
  activeNodes = [];
  for (const node of nodes) {
    try {
      node.stop();
    } catch {
      // already stopped - ignore
    }
    try {
      node.disconnect();
    } catch {
      // already disconnected - ignore
    }
  }
}

// ---------------------------------------------------------------------------
// Note + step players (context-bound, guarded, never throw outward)
// ---------------------------------------------------------------------------

function scheduleSongNote(
  c: AudioContext,
  atTime: number,
  ev: SongEvent,
  bpm: number,
): void {
  try {
    if (!musicGain) return;
    const durSec = Math.max(0.03, beatsToSec(ev.lenBeats, bpm));
    const peak = clamp(ev.trackVol * ev.vel, 0, 1) * 0.5;
    if (peak <= 0.001) return;
    if (ev.trackWave === "noise") {
      const buf = getNoiseBuffer(c);
      if (!buf) return;
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const g = c.createGain();
      g.gain.setValueAtTime(MIN_GAIN, atTime);
      g.gain.exponentialRampToValueAtTime(Math.max(MIN_GAIN, peak), atTime + 0.005);
      g.gain.exponentialRampToValueAtTime(MIN_GAIN, atTime + durSec);
      src.connect(g);
      g.connect(musicGain);
      src.start(atTime);
      src.stop(atTime + durSec + 0.02);
      trackNode(src);
      return;
    }
    const osc = c.createOscillator();
    osc.type = toOscType(ev.trackWave);
    const freq = noteToFreq(ev.midi);
    if (!Number.isFinite(freq) || freq <= 0) return;
    osc.frequency.setValueAtTime(clamp(freq, 20, 20000), atTime);
    const g = c.createGain();
    g.gain.setValueAtTime(MIN_GAIN, atTime);
    g.gain.exponentialRampToValueAtTime(Math.max(MIN_GAIN, peak), atTime + 0.005);
    g.gain.exponentialRampToValueAtTime(MIN_GAIN, atTime + durSec);
    osc.connect(g);
    g.connect(musicGain);
    osc.start(atTime);
    osc.stop(atTime + durSec + 0.02);
    trackNode(osc);
  } catch {
    // per-note failure must not break the scheduler
  }
}

function playSfxStep(
  c: AudioContext,
  step: SfxStep4W,
  atTime: number,
): void {
  try {
    if (!sfxGain) return;
    const dur = clamp(step.dur, 0.01, 4);
    const peak = clamp(step.vol, 0, 1) * 0.6;
    if (peak <= 0.001) return;
    const freq = clamp(step.freq, 20, 20000);
    const freqEnd = clamp(step.freqEnd, 20, 20000);
    if (step.type === "noise") {
      const buf = getNoiseBuffer(c);
      if (!buf) return;
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const g = c.createGain();
      g.gain.setValueAtTime(Math.max(MIN_GAIN, peak), atTime);
      g.gain.exponentialRampToValueAtTime(MIN_GAIN, atTime + dur);
      src.connect(g);
      g.connect(sfxGain);
      src.start(atTime);
      src.stop(atTime + dur + 0.02);
      trackNode(src);
      return;
    }
    const osc = c.createOscillator();
    osc.type = toOscType(step.wave);
    osc.frequency.setValueAtTime(freq, atTime);
    if (freqEnd !== freq) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, atTime + dur);
    }
    const g = c.createGain();
    g.gain.setValueAtTime(Math.max(MIN_GAIN, peak), atTime);
    g.gain.exponentialRampToValueAtTime(MIN_GAIN, atTime + dur);
    osc.connect(g);
    g.connect(sfxGain);
    osc.start(atTime);
    osc.stop(atTime + dur + 0.02);
    trackNode(osc);
  } catch {
    // per-step failure must not break the SFX
  }
}

// ---------------------------------------------------------------------------
// Lookahead scheduler
// ---------------------------------------------------------------------------

function clearTimer(): void {
  if (timerId !== null) {
    try {
      clearInterval(timerId);
    } catch {
      // ignore
    }
    timerId = null;
  }
}

function schedulerTick(): void {
  try {
    const c = ctx;
    const song = currentSong;
    if (!c || !song || !playing) return;
    const horizon = c.currentTime + currentLookahead;
    while (eventIndex < events.length) {
      const ev = events[eventIndex];
      if (!ev) break;
      const atTime = startCtxTime + beatsToSec(ev.beat - startBeatOffset, song.bpm);
      if (atTime > horizon) break;
      if (atTime >= c.currentTime - 0.05) {
        scheduleSongNote(c, Math.max(atTime, c.currentTime), ev, song.bpm);
      }
      eventIndex++;
    }
    const endTime = startCtxTime + beatsToSec(songEndBeat - startBeatOffset, song.bpm);
    if (eventIndex >= events.length && c.currentTime >= endTime) {
      if (currentLoop) {
        startBeatOffset = 0;
        eventIndex = 0;
        startCtxTime = c.currentTime + START_DELAY_SEC;
      } else {
        stopSong();
      }
    }
  } catch {
    // scheduler must never throw; next tick retries
  }
}

// ---------------------------------------------------------------------------
// Transport: playSong / stopSong / pauseSong / resumeSong
// ---------------------------------------------------------------------------

/**
 * Play a 4W-1 song through the lookahead scheduler. Validates with
 * validateSong; returns false (no-op, never throws) when invalid or when
 * no AudioContext is available. Starting a song stops any current one.
 */
export function playSong(song: unknown, opts?: SynthPlayOptions): boolean {
  try {
    const check = validateSong(song);
    if (!check.ok) return false;
    const valid = song as Song4W;
    const c = ensureAudio();
    if (!c || !musicGain) return false;
    stopSong();
    const startBeat = clamp(opts?.startBeat ?? 0, 0, 4096);
    currentSong = valid;
    currentLoop = opts?.loop === true;
    currentLookahead = clamp(opts?.lookahead ?? DEFAULT_LOOKAHEAD_SEC, 0.05, 0.5);
    events = buildEvents(valid).filter((ev) => ev.beat + ev.lenBeats > startBeat);
    songEndBeat = songEndOf(valid);
    if (songEndBeat <= startBeat && !currentLoop) return false;
    eventIndex = 0;
    startBeatOffset = startBeat;
    startCtxTime = c.currentTime + START_DELAY_SEC;
    pausedBeat = startBeat;
    playing = true;
    timerId = setInterval(schedulerTick, SCHED_TIMER_MS);
    return true;
  } catch {
    return false;
  }
}

/** Stop playback, silence sounding nodes, clear scheduler. Never throws. */
export function stopSong(): void {
  try {
    clearTimer();
    silenceActive();
    playing = false;
    pausedBeat = 0;
    currentSong = null;
    events = [];
    eventIndex = 0;
  } catch {
    // never throws
  }
}

/** Pause playback, remembering the beat position. Never throws. */
export function pauseSong(): void {
  try {
    if (!playing || !currentSong || !ctx) return;
    const elapsedSec = Math.max(0, ctx.currentTime - startCtxTime);
    pausedBeat = startBeatOffset + (elapsedSec * currentSong.bpm) / 60;
    clearTimer();
    silenceActive();
    playing = false;
  } catch {
    // never throws
  }
}

/**
 * Resume from the paused beat. Returns false when there is nothing to
 * resume or no AudioContext. Never throws.
 */
export function resumeSong(): boolean {
  try {
    const song = currentSong;
    if (!song || playing) return false;
    return playSong(song, { startBeat: pausedBeat, loop: currentLoop });
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// SFX one-shots
// ---------------------------------------------------------------------------

/**
 * Play a 4W-1 SFX as one-shot steps. Validates with validateSfx; returns
 * false (no-op, never throws) when invalid or no AudioContext.
 */
export function playSfx(sfx: unknown): boolean {
  try {
    const check = validateSfx(sfx);
    if (!check.ok) return false;
    const valid = sfx as Sfx4W;
    const c = ensureAudio();
    if (!c || !sfxGain) return false;
    let atTime = c.currentTime + 0.01;
    for (const step of valid.steps) {
      playSfxStep(c, step as SfxStep4W, atTime);
      atTime += clamp(step.dur, 0.01, 4);
    }
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Volumes + mute + state
// ---------------------------------------------------------------------------

/** Set master volume 0..1 (stored until ctx exists). Never throws. */
export function setMasterVolume(value: number): void {
  try {
    masterVolume = clamp(value, 0, 1);
    if (masterGain && ctx) {
      masterGain.gain.setValueAtTime(muted ? 0 : masterVolume, ctx.currentTime);
    }
  } catch {
    // never throws
  }
}

/** Set music volume 0..1 (stored until ctx exists). Never throws. */
export function setMusicVolume(value: number): void {
  try {
    musicVolume = clamp(value, 0, 1);
    if (musicGain && ctx) {
      musicGain.gain.setValueAtTime(musicVolume, ctx.currentTime);
    }
  } catch {
    // never throws
  }
}

/** Set SFX volume 0..1 (stored until ctx exists). Never throws. */
export function setSfxVolume(value: number): void {
  try {
    sfxVolume = clamp(value, 0, 1);
    if (sfxGain && ctx) {
      sfxGain.gain.setValueAtTime(sfxVolume, ctx.currentTime);
    }
  } catch {
    // never throws
  }
}

/** Mute/unmute the master output. Never throws. */
export function setMuted(value: boolean): void {
  try {
    muted = value === true;
    if (masterGain && ctx) {
      masterGain.gain.setValueAtTime(muted ? 0 : clamp(masterVolume, 0, 1), ctx.currentTime);
    }
  } catch {
    // never throws
  }
}

/** True while the scheduler is running. Never throws. */
export function isPlaying(): boolean {
  try {
    return playing;
  } catch {
    return false;
  }
}

/** True when muted. Never throws. */
export function isMuted(): boolean {
  try {
    return muted;
  } catch {
    return false;
  }
}

/** Read-only snapshot of engine state. Never throws. */
export function getSynthState(): SynthState {
  try {
    return {
      playing,
      paused: !playing && currentSong !== null,
      pausedBeat,
      muted,
      masterVolume: clamp(masterVolume, 0, 1),
      musicVolume: clamp(musicVolume, 0, 1),
      sfxVolume: clamp(sfxVolume, 0, 1),
      hasContext: ctx !== null,
    };
  } catch {
    return {
      playing: false,
      paused: false,
      pausedBeat: 0,
      muted: false,
      masterVolume: 0.8,
      musicVolume: 0.8,
      sfxVolume: 0.9,
      hasContext: false,
    };
  }
}

/**
 * Tear down scheduler, nodes, and context (for tests/unmount).
 * Never throws.
 */
export function disposeSynth(): void {
  try {
    stopSong();
    try {
      if (ctx) void ctx.close().catch(() => undefined);
    } catch {
      // ignore close errors
    }
    ctx = null;
    masterGain = null;
    musicGain = null;
    sfxGain = null;
    noiseBuffer = null;
  } catch {
    // never throws
  }
}
