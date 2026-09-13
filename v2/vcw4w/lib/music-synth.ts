/**
 * $music:1 dependency-free WebAudio synth engine.
 *
 * Plays songs + one-shot SFX recipes, and renders songs to a 16-bit PCM
 * WAV Blob for download export. No dependencies, no assets — pure WebAudio.
 *
 * Song/SFX shapes are owned by `@/lib/music-format` (agent music-01);
 * this module only imports those types and never redeclares them.
 *
 * SSR-safe: this module touches no browser API at import time. Every
 * `AudioContext` / `OfflineAudioContext` / `window` / `Blob` access
 * happens inside functions, so importing this file on the server is fine.
 *
 * Usage example:
 *
 * ```ts
 * import { getAudioContext, playSong, playSfx, renderSongWav } from "@/lib/music-synth";
 * import type { MusicSong, MusicSfx } from "@/lib/music-format";
 *
 * declare const song: MusicSong;
 * declare const sfx: MusicSfx;
 *
 * // Inside a click handler (user gesture unlocks audio):
 * const handle = playSong(song, { loop: true });
 * // ...later:
 * handle.stop();
 *
 * const blip = playSfx(sfx);
 * // ...to cut it short:
 * blip.stop();
 *
 * // Context-first shapes also exist (same exports) for callers that
 * // already hold a live context: playSong(ctx, song, opts?),
 * // playSfx(ctx, sfx). getAudioContext() exposes the shared singleton.
 *
 * // Export a download:
 * const blob = await renderSongWav(song);
 * const url = URL.createObjectURL(blob);
 * ```
 */

import type { MusicSfx, MusicSong } from "@/lib/music-format";

/** Options for {@link playSong}. */
export interface PlaySongOptions {
  /** Repeat the song when the pass ends. Defaults to the song's own `loop` flag. */
  loop?: boolean;
}

/** Live-song handle returned by {@link playSong}. */
export interface SongHandle {
  /** Stop playback immediately and release scheduled nodes. Safe to call twice. */
  stop: () => void;
}

// ---------------------------------------------------------------------------
// Small pure helpers (no browser APIs — safe anywhere)
// ---------------------------------------------------------------------------

/** MIDI note number -> frequency in Hz (A4 = 69 = 440Hz). */
function midiToFreq(midi: number): number {
  const m = Math.min(127, Math.max(0, Math.round(midi)));
  return 440 * Math.pow(2, (m - 69) / 12);
}

/** Tempo in BPM. Reads `bpm` (tolerated alias: `BPM`); falls back to 120. */
function bpmOf(song: MusicSong): number {
  const extra = song as Partial<{ bpm: unknown; BPM: unknown }>;
  const v = extra.bpm ?? extra.BPM;
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 120;
}

/** Steps per beat. Reads `stepsPerBeat` when the payload carries it; default 4. */
function stepsPerBeatOf(song: MusicSong): number {
  const extra = song as Partial<{ stepsPerBeat: unknown }>;
  const v = extra.stepsPerBeat;
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 4;
}

/** Seconds per sequencer step: stepDur = 60 / BPM / stepsPerBeat. */
function stepDuration(song: MusicSong): number {
  return 60 / bpmOf(song) / stepsPerBeatOf(song);
}

/** Total song length in seconds (last note end), excluding tail. */
function songLength(song: MusicSong): number {
  const step = stepDuration(song);
  let end = 0;
  for (const track of song.tracks ?? []) {
    for (const note of track.notes ?? []) {
      const noteEnd = (note.t + note.d) * step;
      if (noteEnd > end) end = noteEnd;
    }
  }
  return Math.max(0, end);
}

/** Note velocity -> 0..1 gain scale. Accepts MIDI 0-127 (0..1 tolerated). */
function normalizeVelocity(v: number | undefined): number {
  const raw = v ?? 0.8;
  const scaled = raw > 1 ? raw / 127 : raw;
  if (!Number.isFinite(scaled)) return 0.8;
  return Math.min(1, Math.max(0, scaled));
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

/** Map a wave/inst name to an OscillatorType; `noise`/unknown falls back to square. */
function toOscType(name: string): OscillatorType {
  const n = name.trim().toLowerCase();
  if (n === "sine" || n === "triangle" || n === "sawtooth" || n === "square") return n;
  return "square";
}

/**
 * Narrow `AudioContext | MusicSong | MusicSfx` to `AudioContext` by
 * duck-typing the live context shape (a song/sfx payload carries no
 * `currentTime`/`destination`). Used by the playSong/playSfx overloads so
 * one export serves both the spec shape and the context-first shape.
 */
function isLiveContext(v: AudioContext | MusicSong | MusicSfx): v is AudioContext {
  const c = v as Partial<AudioContext>;
  return typeof c.currentTime === "number" && c.destination !== undefined;
}

/**
 * Loop flag for a song: explicit `opts.loop` wins, otherwise a runtime
 * `loop` boolean carried on the payload (tolerated when present).
 */
function songLoopFlag(song: MusicSong): boolean {
  const extra = song as Partial<{ loop: unknown }>;
  return extra.loop === true;
}

/** SFX waveform name. Reads `wave` when the payload carries it; default `square`. */
function sfxWaveOf(sfx: MusicSfx): string {
  const extra = sfx as Partial<{ wave: unknown }>;
  return typeof extra.wave === "string" ? extra.wave : "square";
}

// ---------------------------------------------------------------------------
// Shared scheduling core (works on AudioContext and OfflineAudioContext)
// ---------------------------------------------------------------------------

/** Lazily built 1s white-noise buffer, cached per BaseAudioContext. */
let cachedNoise: { owner: BaseAudioContext; buffer: AudioBuffer } | null = null;

function getNoiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  if (cachedNoise && cachedNoise.owner === ctx) return cachedNoise.buffer;
  const sampleRate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, sampleRate, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  cachedNoise = { owner: ctx, buffer };
  return buffer;
}

/** Melodic voice: oscillator + short attack/decay envelope scaled by velocity. */
function scheduleMelodic(
  ctx: BaseAudioContext,
  out: AudioNode,
  wave: OscillatorType,
  when: number,
  durSec: number,
  midi: number,
  vel: number,
  registry: AudioScheduledSourceNode[],
): void {
  const osc = ctx.createOscillator();
  osc.type = wave;
  osc.frequency.setValueAtTime(midiToFreq(midi), when);
  const gain = ctx.createGain();
  const peak = 0.28 * vel;
  const attack = Math.min(0.012, durSec * 0.25);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(Math.max(0.0002, peak), when + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + durSec);
  osc.connect(gain);
  gain.connect(out);
  osc.start(when);
  osc.stop(when + durSec + 0.05);
  registry.push(osc);
}

/** Kick drum: sine pitch-drop 150Hz -> 50Hz with a fast pitch + gain envelope. */
function scheduleKick(
  ctx: BaseAudioContext,
  out: AudioNode,
  when: number,
  durSec: number,
  vel: number,
  registry: AudioScheduledSourceNode[],
): void {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, when);
  osc.frequency.exponentialRampToValueAtTime(50, when + 0.12);
  const gain = ctx.createGain();
  const hitDur = Math.max(durSec, 0.25);
  gain.gain.setValueAtTime(0.9 * vel, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + hitDur);
  osc.connect(gain);
  gain.connect(out);
  osc.start(when);
  osc.stop(when + hitDur + 0.05);
  registry.push(osc);
}

/** Snare / hat / noise: buffered white noise + highpass + short envelope. */
function scheduleNoiseHit(
  ctx: BaseAudioContext,
  out: AudioNode,
  kind: "snare" | "hat" | "noise",
  when: number,
  durSec: number,
  vel: number,
  registry: AudioScheduledSourceNode[],
): void {
  const preset =
    kind === "hat"
      ? { hp: 7500, min: 0.05, peak: 0.32 }
      : kind === "snare"
        ? { hp: 1800, min: 0.16, peak: 0.5 }
        : { hp: 900, min: 0.25, peak: 0.4 };
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  src.loop = true;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = preset.hp;
  const gain = ctx.createGain();
  const hitDur = Math.max(durSec, preset.min);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(Math.max(0.0002, preset.peak * vel), when + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + hitDur);
  src.connect(hp);
  hp.connect(gain);
  gain.connect(out);
  src.start(when);
  src.stop(when + hitDur + 0.05);
  registry.push(src);
}

/** Track waveform preference. Reads `track.wave` when the payload carries it. */
function trackWaveOf(track: MusicSong["tracks"][number]): string | undefined {
  const extra = track as Partial<{ wave: unknown }>;
  return typeof extra.wave === "string" ? extra.wave : undefined;
}

/** Dispatch one sequencer note to the melodic or drum voice. */
function scheduleNote(
  ctx: BaseAudioContext,
  out: AudioNode,
  inst: string,
  wave: string | undefined,
  when: number,
  durSec: number,
  midi: number,
  vel: number,
  registry: AudioScheduledSourceNode[],
): void {
  const name = inst.trim().toLowerCase();
  if (name === "kick") {
    scheduleKick(ctx, out, when, durSec, vel, registry);
    return;
  }
  if (name === "snare" || name === "hat" || name === "noise") {
    scheduleNoiseHit(ctx, out, name, when, durSec, vel, registry);
    return;
  }
  scheduleMelodic(ctx, out, toOscType(wave ?? name), when, durSec, midi, vel, registry);
}

/** Schedule every track/note of a song once, starting at `offset` seconds. */
function scheduleSongPass(
  ctx: BaseAudioContext,
  out: AudioNode,
  song: MusicSong,
  offset: number,
  registry: AudioScheduledSourceNode[],
): void {
  const step = stepDuration(song);
  for (const track of song.tracks ?? []) {
    const wave = trackWaveOf(track);
    for (const note of track.notes ?? []) {
      const when = offset + note.t * step;
      const durSec = Math.max(note.d * step, 0.02);
      scheduleNote(ctx, out, track.inst, wave, when, durSec, note.n, normalizeVelocity(note.v), registry);
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Play a $music:1 song.
 *
 * Melodic instruments (`square`/`triangle`/`sawtooth`/`sine`) render as
 * oscillators with a short attack/decay envelope scaled by per-note
 * velocity; `kick` renders as a sine pitch-drop (150Hz -> 50Hz) and
 * `snare`/`hat`/`noise` render as highpassed white-noise bursts.
 * Timing uses `stepDur = 60 / bpm / stepsPerBeat` (default 4 steps/beat).
 *
 * Two call shapes (same export, no rename): the spec shape
 * `playSong(song, opts?)` plays on the shared lazy AudioContext (created +
 * resumed here, so call it from a user gesture), and the context-first
 * shape `playSong(ctx, song, opts?)` plays on an explicit live context.
 */
export function playSong(song: MusicSong, opts?: PlaySongOptions): SongHandle;
export function playSong(
  ctx: AudioContext,
  song: MusicSong,
  opts?: PlaySongOptions,
): SongHandle;
export function playSong(
  first: AudioContext | MusicSong,
  second?: MusicSong | PlaySongOptions,
  third?: PlaySongOptions,
): SongHandle {
  const ctx = isLiveContext(first) ? first : getAudioContext();
  const song = (isLiveContext(first) ? second : first) as MusicSong;
  const opts = (isLiveContext(first) ? third : second) as
    | PlaySongOptions
    | undefined;
  const shouldLoop = opts?.loop ?? songLoopFlag(song);
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);

  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const sources: AudioScheduledSourceNode[] = [];
  const total = songLength(song);

  scheduleSongPass(ctx, master, song, ctx.currentTime + 0.06, sources);

  if (shouldLoop && total > 0) {
    const passMs = total * 1000;
    const tick = (): void => {
      if (stopped) return;
      scheduleSongPass(ctx, master, song, ctx.currentTime + 0.06, sources);
      timer = setTimeout(tick, passMs);
    };
    timer = setTimeout(tick, passMs);
  }

  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    for (const s of sources) {
      try {
        s.stop();
      } catch {
        // Already finished — safe to ignore.
      }
      s.disconnect();
    }
    sources.length = 0;
    master.disconnect();
  };

  return { stop };
}

/**
 * Play a one-shot $music:1 SFX recipe: an oscillator sweeping
 * `freqStart` -> `freqEnd` over `dur` seconds, plus an optional
 * white-noise layer scaled by `noiseMix` (0..1).
 *
 * Two call shapes (same export, no rename): the spec shape `playSfx(sfx)`
 * plays on the shared lazy AudioContext, and the context-first shape
 * `playSfx(ctx, sfx)` plays on an explicit live context.
 *
 * @returns A stop handle that silences the SFX early. Safe to call twice.
 */
export function playSfx(sfx: MusicSfx): SongHandle;
export function playSfx(ctx: AudioContext, sfx: MusicSfx): SongHandle;
export function playSfx(
  first: AudioContext | MusicSfx,
  second?: MusicSfx,
): SongHandle {
  const ctx = isLiveContext(first) ? first : getAudioContext();
  const sfx = (isLiveContext(first) ? second : first) as MusicSfx;
  const when = ctx.currentTime + 0.01;
  const dur = Math.max(sfx.dur, 0.02);
  const vol = clamp01(sfx.vol ?? 0.8);
  const peak = 0.4 * vol;
  const attack = Math.min(0.01, dur * 0.25);
  const waveName = sfxWaveOf(sfx);
  const registry: AudioScheduledSourceNode[] = [];
  let stopped = false;
  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    for (const s of registry) {
      try {
        s.stop();
      } catch {
        // Already finished — safe to ignore.
      }
      try {
        s.disconnect();
      } catch {
        // Already disconnected — safe to ignore.
      }
    }
    registry.length = 0;
  };

  // `noise`-wave SFX skip the oscillator: the main voice is a noise burst.
  if (waveName.trim().toLowerCase() === "noise") {
    scheduleNoiseHit(ctx, ctx.destination, "noise", when, dur, vol, registry);
    return { stop };
  }

  const osc = ctx.createOscillator();
  osc.type = toOscType(waveName);
  osc.frequency.setValueAtTime(Math.max(1, sfx.freqStart), when);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, sfx.freqEnd), when + dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(Math.max(0.0002, peak), when + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(when);
  osc.stop(when + dur + 0.05);
  registry.push(osc);

  const mix = clamp01(sfx.noiseMix ?? 0);
  if (mix > 0) {
    const src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer(ctx);
    src.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1200;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, when);
    ng.gain.linearRampToValueAtTime(Math.max(0.0002, peak * mix), when + attack);
    ng.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(hp);
    hp.connect(ng);
    ng.connect(ctx.destination);
    src.start(when);
    src.stop(when + dur + 0.05);
    registry.push(src);
  }

  return { stop };
}

/**
 * Render a $music:1 song offline and encode it as a 16-bit PCM WAV Blob,
 * ready for download export (e.g. via `URL.createObjectURL`).
 */
export async function renderSongWav(song: MusicSong): Promise<Blob> {
  if (typeof OfflineAudioContext === "undefined" || typeof Blob === "undefined") {
    throw new Error("renderSongWav() requires a browser environment.");
  }
  const sampleRate = 44100;
  const tailSec = 0.6;
  const total = songLength(song) + tailSec;
  const length = Math.max(1, Math.ceil(total * sampleRate));
  const offline = new OfflineAudioContext(1, length, sampleRate);
  const master = offline.createGain();
  master.gain.value = 0.9;
  master.connect(offline.destination);
  const registry: AudioScheduledSourceNode[] = [];
  scheduleSongPass(offline, master, song, 0.02, registry);
  const rendered = await offline.startRendering();
  return encodeWav(rendered);
}

/**
 * Lazy AudioContext singleton. Safe to call from UI event handlers;
 * throws when called outside a browser (no `window`).
 */
let sharedCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (sharedCtx) {
    if (sharedCtx.state === "suspended") {
      void sharedCtx.resume();
    }
    return sharedCtx;
  }
  if (typeof window === "undefined") {
    throw new Error("getAudioContext() requires a browser environment.");
  }
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) {
    throw new Error("Web Audio is not supported in this browser.");
  }
  const ctx = new Ctor();
  sharedCtx = ctx;
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// WAV encoding (pure data work; Blob is constructed here, inside a function)
// ---------------------------------------------------------------------------

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

/** Encode an AudioBuffer as a 16-bit PCM WAV Blob. */
function encodeWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = buffer.length * blockAlign;
  const out = new ArrayBuffer(44 + dataSize);
  const view = new DataView(out);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const s = Math.min(1, Math.max(-1, channels[c][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([out], { type: "audio/wav" });
}
