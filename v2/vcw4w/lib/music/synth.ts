/**
 * DS-MUS-02 — WebAudio synth engine (4W music contract, local copy).
 *
 * SSR-safe: this module touches no browser APIs at import time. The
 * AudioContext is created lazily on first use and everything no-ops (never
 * throws) when no context exists — e.g. SSR, offline, or autoplay-blocked
 * environments.
 *
 * 4W-1 CONTRACT shapes are copied locally (normative per envelope goal) so
 * this file never imports the sibling `format.ts`, which may land
 * concurrently:
 *   Song4W  = { v:1, title:string, bpm:40-240, tracks:Track4W[<=8] }
 *   Track4W = { wave:'square'|'saw'|'tri'|'sine'|'noise', vol?:0..1,
 *               notes:Note4W[<=512] }
 *   Note4W  = { t:start beats, n:MIDI 0-127, d:len beats, v?:0..1 }
 *   song JSON <= 8192 bytes.
 *   Sfx4W   = { v:1, name, kind, steps:[{wave,freq,freqEnd,dur,vol,
 *               type:'tone'|'noise'}] } <= 1024 bytes.
 *
 * Hook shapes mirror (read-only reference, never imported):
 *   public/games/html/gravegain3d/audio/sound-engine.js
 *     (initCtx / playSfx / master*sfx volumes, lazy ctx, exp ramps)
 *   public/games/html/gravegain4d/audio/sound4d.js
 *     (initCtx / bindFirstGesture / _tone / _noise / playSfx aliases,
 *      putt + wshift + rewind-swell + splat recipes, never throws)
 */

// ---------------------------------------------------------------------------
// Local 4W-1 contract copies (do NOT import from ./format — sibling may land
// concurrently; keep these in sync with the envelope goal text).
// ---------------------------------------------------------------------------

/** Oscillator wave for a song track. `saw`/`tri` are short aliases. */
export type TrackWave4W = 'square' | 'saw' | 'tri' | 'sine' | 'noise';

/** One note: t = start in beats, n = MIDI 0-127, d = length in beats. */
export interface Note4W {
  t: number;
  n: number;
  d: number;
  v?: number;
}

/** One track: a single wave + volume shared by all its notes. */
export interface Track4W {
  wave: TrackWave4W;
  vol?: number;
  notes: Note4W[];
}

/** A song: <= 8 tracks, bpm clamped to 40-240, JSON <= 8192 bytes. */
export interface Song4W {
  v: 1;
  title: string;
  bpm: number;
  tracks: Track4W[];
}

/** Gain-envelope curve for an SFX step. */
export type SfxCurve4W = 'exp' | 'lin' | 'swell';

/** One SFX step. `type:'noise'` ignores wave and plays filtered noise. */
export interface SfxStep4W {
  wave: 'square' | 'sawtooth' | 'saw' | 'triangle' | 'tri' | 'sine';
  freq: number;
  freqEnd?: number;
  dur: number;
  vol: number;
  type: 'tone' | 'noise';
  curve?: SfxCurve4W;
  /** Seconds after recipe start before this step fires. */
  delay?: number;
}

/** A one-shot recipe: a name plus an ordered list of steps. */
export interface SfxRecipe {
  name?: string;
  steps: SfxStep4W[];
}

/** Envelope-goal Sfx4W object shape (local copy; kind is informational). */
export interface Sfx4W {
  v: 1;
  name: string;
  kind: string;
  steps: SfxStep4W[];
}

/** Options for {@link playSong}. */
export interface PlaySongOpts {
  /** Tempo override (beats per minute). Defaults to song.bpm. */
  bpm?: number;
  /** Music-bus volume multiplier for this song (0..1). */
  musicVol?: number;
  /** Start offset in beats (use with pauseSong for resume). */
  fromBeat?: number;
  /** Loop the song instead of stopping at the end. */
  loop?: boolean;
  /** Fired (best-effort) when a song ends naturally. */
  onEnd?: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Presets (hook shapes follow sound4d.js: putt thock, wshift shimmer,
// rewind reverse-swell, splat noise+gurgle; plus gravegain3d raygun/death/
// pickup/explosion voices).
// ---------------------------------------------------------------------------

export type SfxPresetName =
  | 'raygun'
  | 'death'
  | 'pickup'
  | 'explosion'
  | 'putt'
  | 'wshift'
  | 'rewind'
  | 'splat';

export const SFX_PRESETS: Record<SfxPresetName, SfxRecipe> = {
  raygun: {
    name: 'raygun',
    steps: [{ wave: 'square', freq: 1800, freqEnd: 200, dur: 0.18, vol: 0.35, type: 'tone', curve: 'exp' }],
  },
  death: {
    name: 'death',
    steps: [{ wave: 'sawtooth', freq: 300, freqEnd: 30, dur: 0.5, vol: 0.45, type: 'tone', curve: 'exp' }],
  },
  pickup: {
    name: 'pickup',
    steps: [{ wave: 'sine', freq: 880, freqEnd: 1320, dur: 0.12, vol: 0.3, type: 'tone', curve: 'exp' }],
  },
  explosion: {
    name: 'explosion',
    steps: [
      { wave: 'sawtooth', freq: 90, freqEnd: 30, dur: 0.4, vol: 0.55, type: 'tone', curve: 'exp' },
      { wave: 'sine', freq: 90, freqEnd: 40, dur: 0.4, vol: 0.4, type: 'noise', curve: 'exp' },
    ],
  },
  putt: {
    name: 'putt',
    steps: [
      { wave: 'sine', freq: 220, freqEnd: 70, dur: 0.12, vol: 0.5, type: 'tone', curve: 'exp' },
      { wave: 'sine', freq: 2500, freqEnd: 1200, dur: 0.03, vol: 0.22, type: 'noise', curve: 'exp' },
    ],
  },
  wshift: {
    name: 'wshift',
    steps: [
      { wave: 'triangle', freq: 400, freqEnd: 1400, dur: 0.28, vol: 0.3, type: 'tone', curve: 'exp' },
      { wave: 'sine', freq: 600, freqEnd: 2100, dur: 0.28, vol: 0.2, type: 'tone', curve: 'exp', delay: 0.03 },
    ],
  },
  rewind: {
    name: 'rewind',
    steps: [{ wave: 'sawtooth', freq: 1200, freqEnd: 120, dur: 0.4, vol: 0.35, type: 'tone', curve: 'swell' }],
  },
  splat: {
    name: 'splat',
    steps: [
      { wave: 'sine', freq: 900, freqEnd: 200, dur: 0.18, vol: 0.4, type: 'noise', curve: 'exp' },
      { wave: 'square', freq: 140, freqEnd: 40, dur: 0.2, vol: 0.22, type: 'tone', curve: 'exp' },
    ],
  },
};

// ---------------------------------------------------------------------------
// Pure helpers (safe anywhere, including SSR).
// ---------------------------------------------------------------------------

/** MIDI note -> frequency in Hz (A4 = 440). Returns 0 for out-of-range input. */
export function midiToFreq(m: number): number {
  if (!isFinite(m) || m < 0 || m > 127) return 0;
  return 440 * Math.pow(2, (m - 69) / 12);
}

/** Clamp a value into [min, max]; non-finite input yields min. */
function clamp(v: number, min: number, max: number): number {
  if (!isFinite(v)) return min;
  return Math.min(max, Math.max(min, v));
}

/** Lightweight Song4W guard (contract limits only, no exceptions). */
export function isSong4W(song: unknown): song is Song4W {
  try {
    if (typeof song !== 'object' || song === null) return false;
    const s = song as Record<string, unknown>;
    if (s['v'] !== 1 || typeof s['title'] !== 'string') return false;
    if (typeof s['bpm'] !== 'number' || !isFinite(s['bpm'] as number)) return false;
    if (!Array.isArray(s['tracks'])) return false;
    const tracks = s['tracks'] as unknown[];
    if (tracks.length > 8) return false;
    for (const t of tracks) {
      if (typeof t !== 'object' || t === null) return false;
      const tr = t as Record<string, unknown>;
      if (!['square', 'saw', 'tri', 'sine', 'noise'].includes(tr['wave'] as string)) return false;
      if (!Array.isArray(tr['notes']) || (tr['notes'] as unknown[]).length > 512) return false;
    }
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Lazy AudioContext + gain graph (created on first use, never at import).
// ---------------------------------------------------------------------------

type AC = AudioContext;

let sharedCtx: AC | null = null;
let masterGain: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let gestureBound = false;
let muted = false;
let masterVol = 0.8;
let musicVol = 0.5;
let sfxVol = 0.8;
let songSeq = 0;

function audioCtor(): (new () => AC) | null {
  try {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as Record<string, unknown>;
    const Ctor = (w['AudioContext'] ?? w['webkitAudioContext']) as (new () => AC) | undefined;
    return typeof Ctor === 'function' ? Ctor : null;
  } catch {
    return null;
  }
}

/**
 * Lazily create (or return) the shared AudioContext. Returns null on SSR or
 * when the browser has no WebAudio — callers must no-op on null, never throw.
 */
export function getAudioContext(): AC | null {
  try {
    if (sharedCtx) {
      if (sharedCtx.state === 'suspended') void sharedCtx.resume().catch(() => undefined);
      return sharedCtx;
    }
    const Ctor = audioCtor();
    if (!Ctor) return null;
    sharedCtx = new Ctor();
    ensureGraph(sharedCtx);
    if (sharedCtx.state === 'suspended') void sharedCtx.resume().catch(() => undefined);
    return sharedCtx;
  } catch {
    return null;
  }
}

/** Resume a suspended context (call from a user gesture). Never throws. */
export function resumeAudio(): boolean {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

/**
 * Bind one-time gesture listeners so a suspended context resumes lazily on
 * first pointer/key interaction (same shape as sound4d.js bindFirstGesture).
 * No-op on SSR. Never throws.
 */
export function bindFirstGesture(): void {
  try {
    if (gestureBound || typeof window === 'undefined') return;
    gestureBound = true;
    const wake = (): void => {
      resumeAudio();
    };
    for (const t of ['pointerdown', 'touchend', 'keydown'] as const) {
      try {
        window.addEventListener(t, wake, { once: true, passive: true });
      } catch {
        try {
          window.addEventListener(t, wake);
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }
}

function ensureGraph(ctx: AC): void {
  try {
    if (masterGain && musicBus && sfxBus) {
      applyVolumes();
      return;
    }
    masterGain = ctx.createGain();
    musicBus = ctx.createGain();
    sfxBus = ctx.createGain();
    musicBus.connect(masterGain);
    sfxBus.connect(masterGain);
    masterGain.connect(ctx.destination);
    applyVolumes();
  } catch {
    /* ignore — callers treat missing graph as no-ctx */
  }
}

function applyVolumes(): void {
  try {
    if (!sharedCtx || !masterGain || !musicBus || !sfxBus) return;
    const t = sharedCtx.currentTime;
    masterGain.gain.setValueAtTime(muted ? 0 : clamp(masterVol, 0, 1), t);
    musicBus.gain.setValueAtTime(clamp(musicVol, 0, 1), t);
    sfxBus.gain.setValueAtTime(clamp(sfxVol, 0, 1), t);
  } catch {
    /* ignore */
  }
}

/** Cached 1s white-noise buffer (built lazily per context). */
function getNoiseBuffer(ctx: AC): AudioBuffer | null {
  try {
    if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
    const len = Math.max(1, Math.floor(ctx.sampleRate));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuf = buf;
    return buf;
  } catch {
    return null;
  }
}

function trackOscType(wave: TrackWave4W): OscillatorType {
  switch (wave) {
    case 'saw':
      return 'sawtooth';
    case 'tri':
      return 'triangle';
    case 'noise':
      return 'sine'; // unreachable: noise tracks take the buffer path
    default:
      return wave;
  }
}

// ---------------------------------------------------------------------------
// Volume / mute controls (safe without a context; applied on next ensure).
// ---------------------------------------------------------------------------

export function setMuted(m: boolean): boolean {
  try {
    muted = !!m;
    applyVolumes();
    return muted;
  } catch {
    return muted;
  }
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(): boolean {
  return setMuted(!muted);
}

export function setMasterVolume(v: number): void {
  masterVol = clamp(v, 0, 1);
  applyVolumes();
}

export function setMusicVolume(v: number): void {
  musicVol = clamp(v, 0, 1);
  applyVolumes();
}

export function setSfxVolume(v: number): void {
  sfxVol = clamp(v, 0, 1);
  applyVolumes();
}

// ---------------------------------------------------------------------------
// Song scheduler: lookahead 16th-note grid over per-track note events.
// ---------------------------------------------------------------------------

interface SongEvent {
  /** Start time in song-timeline beats. */
  beat: number;
  /** Resolved frequency in Hz (-1 = noise track, 0 = skip). */
  freq: number;
  /** Length in beats. */
  lenBeats: number;
  /** Track wave. */
  wave: TrackWave4W;
  /** Resolved track * note velocity (0..1). */
  vol: number;
}

interface ActiveSong {
  id: string;
  song: Song4W;
  /** Pending events in song-timeline beats (sorted). */
  events: SongEvent[];
  totalBeats: number;
  bpm: number;
  secPerBeat: number;
  /** Context time at which startBeat sounds. */
  startCtxTime: number;
  /** Song-timeline beat sounding at startCtxTime. */
  startBeat: number;
  /** Song-timeline beat at which this pass ends. */
  endBeat: number;
  timer: ReturnType<typeof setInterval> | null;
  sources: Set<AudioScheduledSourceNode>;
  gain: GainNode | null;
  loop: boolean;
  onEnd: ((id: string) => void) | null;
  stopped: boolean;
}

const activeSongs = new Map<string, ActiveSong>();

const LOOKAHEAD_SEC = 0.15;
const TICK_MS = 25;
/** Events more than a 16th behind the cursor are stale: drop, don't replay. */
const STALE_BEATS = 0.25;

function buildEvents(song: Song4W): { events: SongEvent[]; totalBeats: number } {
  const events: SongEvent[] = [];
  let totalBeats = 0;
  for (const track of song.tracks) {
    const tVol = clamp(track.vol ?? 0.8, 0, 1);
    for (const n of track.notes) {
      if (typeof n.t !== 'number' || typeof n.d !== 'number' || !isFinite(n.t) || !isFinite(n.d) || n.d <= 0)
        continue;
      if (!Number.isInteger(n.n) || n.n < 0 || n.n > 127) continue;
      events.push({
        beat: Math.max(0, n.t),
        freq: track.wave === 'noise' ? -1 : midiToFreq(n.n),
        lenBeats: n.d,
        wave: track.wave,
        vol: tVol * clamp(n.v ?? 0.9, 0, 1),
      });
      totalBeats = Math.max(totalBeats, n.t + n.d);
    }
  }
  events.sort((a, b) => a.beat - b.beat);
  return { events, totalBeats };
}

function scheduleEvent(ctx: AC, out: GainNode, ev: SongEvent, atTime: number, secPerBeat: number): void {
  try {
    const durSec = Math.max(0.02, ev.lenBeats * secPerBeat);
    if (ev.vol <= 0.001 || muted) return;
    const song = activeSongs.get(currentPumpingId);
    if (ev.wave === 'noise') {
      const buf = getNoiseBuffer(ctx);
      if (!buf) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const g = ctx.createGain();
      g.gain.setValueAtTime(ev.vol, atTime);
      g.gain.exponentialRampToValueAtTime(0.001, atTime + durSec);
      src.connect(g);
      g.connect(out);
      src.start(atTime);
      src.stop(atTime + durSec + 0.02);
      if (song) {
        song.sources.add(src);
        src.onended = (): void => {
          song.sources.delete(src);
        };
      }
    } else {
      if (ev.freq < 20) return;
      const osc = ctx.createOscillator();
      osc.type = trackOscType(ev.wave);
      osc.frequency.setValueAtTime(Math.max(20, ev.freq), atTime);
      const g = ctx.createGain();
      g.gain.setValueAtTime(ev.vol, atTime);
      g.gain.exponentialRampToValueAtTime(0.001, atTime + durSec);
      osc.connect(g);
      g.connect(out);
      osc.start(atTime);
      osc.stop(atTime + durSec + 0.02);
      if (song) {
        song.sources.add(osc);
        osc.onended = (): void => {
          song.sources.delete(osc);
        };
      }
    }
  } catch {
    /* per-note failure must not kill the scheduler */
  }
}

let currentPumpingId = '';

function pumpSong(song: ActiveSong): void {
  try {
    const ctx = sharedCtx;
    if (!ctx || !song.gain || song.stopped) return;
    currentPumpingId = song.id;
    const out = song.gain;
    const now = ctx.currentTime;
    // 16th-note lookahead scheduler: each tick, fire every pending event
    // whose timeline beat falls inside [cursor - stale, cursor + lookahead].
    const cursorBeat = song.startBeat + (now - song.startCtxTime) / song.secPerBeat;
    const horizon = cursorBeat + LOOKAHEAD_SEC / song.secPerBeat;
    const kept: SongEvent[] = [];
    for (const ev of song.events) {
      if (ev.beat > horizon) {
        kept.push(ev);
        continue;
      }
      if (ev.beat >= cursorBeat - STALE_BEATS) {
        const atTime = Math.max(now, song.startCtxTime + (ev.beat - song.startBeat) * song.secPerBeat);
        scheduleEvent(ctx, out, ev, atTime, song.secPerBeat);
      }
      // Consumed (or stale-dropped): do not keep.
    }
    song.events = kept;
    // Natural end: all events consumed and sounding time has passed.
    const endCtxTime = song.startCtxTime + (song.endBeat - song.startBeat) * song.secPerBeat;
    if (song.events.length === 0 && now >= endCtxTime) {
      if (song.loop) {
        const rebuilt = buildEvents(song.song);
        song.events = rebuilt.events;
        song.startCtxTime = now + 0.05;
        song.startBeat = 0;
        song.endBeat = rebuilt.totalBeats;
      } else {
        const cb = song.onEnd;
        const id = song.id;
        stopSong(id);
        try {
          if (cb) cb(id);
        } catch {
          /* ignore listener errors */
        }
      }
    }
  } catch {
    /* scheduler tick must never throw */
  } finally {
    currentPumpingId = '';
  }
}

/**
 * Play a song with a lookahead 16th-note scheduler.
 *
 * @param song 4W song (validated against contract limits).
 * @param ctx  AudioContext to play on; pass null/undefined to use (or lazily
 *             create) the shared context. Null context (SSR/offline) = no-op.
 * @param opts tempo override, volume, start offset, loop, onEnd.
 * @returns song id, or null when playback could not start (never throws).
 */
export function playSong(song: unknown, ctx?: AC | null, opts?: PlaySongOpts): string | null {
  try {
    bindFirstGesture();
    if (!isSong4W(song)) return null;
    try {
      if (JSON.stringify(song).length > 8192) return null;
    } catch {
      return null;
    }
    const ac = ctx ?? getAudioContext();
    if (!ac) return null;
    ensureGraph(ac);
    if (!musicBus) return null;

    const bpm = clamp(opts?.bpm ?? song.bpm, 40, 240);
    const secPerBeat = 60 / bpm;
    const { events, totalBeats } = buildEvents(song);
    if (events.length === 0 || totalBeats <= 0) return null;

    const songGain = ac.createGain();
    songGain.gain.setValueAtTime(clamp(opts?.musicVol ?? 1, 0, 1), ac.currentTime);
    songGain.connect(musicBus);

    songSeq += 1;
    const id = `song-${songSeq}`;
    const fromBeat = clamp(opts?.fromBeat ?? 0, 0, Math.max(0, totalBeats - 0.001));
    const active: ActiveSong = {
      id,
      song,
      events: events.filter((ev) => ev.beat + ev.lenBeats > fromBeat),
      totalBeats,
      bpm,
      secPerBeat,
      startCtxTime: ac.currentTime + 0.06,
      startBeat: fromBeat,
      endBeat: totalBeats,
      timer: null,
      sources: new Set(),
      gain: songGain,
      loop: opts?.loop ?? false,
      onEnd: opts?.onEnd ?? null,
      stopped: false,
    };
    active.timer = setInterval(() => pumpSong(active), TICK_MS);
    activeSongs.set(id, active);
    pumpSong(active);
    return id;
  } catch {
    return null;
  }
}

/** Stop a song started by {@link playSong}. Returns false when unknown. */
export function stopSong(id: string): boolean {
  try {
    const song = activeSongs.get(id);
    if (!song) return false;
    song.stopped = true;
    if (song.timer) clearInterval(song.timer);
    song.timer = null;
    for (const src of song.sources) {
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
    }
    song.sources.clear();
    try {
      song.gain?.disconnect();
    } catch {
      /* ignore */
    }
    activeSongs.delete(id);
    return true;
  } catch {
    return false;
  }
}

/**
 * Pause a song: halts scheduling, silences current voices, and returns the
 * beat cursor so playback can resume via
 * `playSong(song, ctx, { fromBeat })`. Returns -1 when the id is unknown.
 */
export function pauseSong(id: string): number {
  try {
    const song = activeSongs.get(id);
    const ctx = sharedCtx;
    if (!song || !ctx) return -1;
    const beat = song.startBeat + Math.max(0, ctx.currentTime - song.startCtxTime) / song.secPerBeat;
    const clamped = clamp(beat, 0, song.totalBeats);
    stopSong(id);
    return clamped;
  } catch {
    return -1;
  }
}

// ---------------------------------------------------------------------------
// One-shot SFX with exp / lin / swell envelopes.
// ---------------------------------------------------------------------------

function applyCurve(param: AudioParam, curve: SfxCurve4W, vol: number, atTime: number, dur: number): void {
  const peak = Math.max(0.001, vol);
  if (curve === 'lin') {
    param.setValueAtTime(peak, atTime);
    param.linearRampToValueAtTime(0.001, atTime + dur);
  } else if (curve === 'swell') {
    // Reverse-feel swell: rise then fall (rewind voice from sound4d.js).
    param.setValueAtTime(0.001, atTime);
    param.exponentialRampToValueAtTime(peak, atTime + dur * 0.7);
    param.exponentialRampToValueAtTime(0.001, atTime + dur + 0.05);
  } else {
    param.setValueAtTime(peak, atTime);
    param.exponentialRampToValueAtTime(0.001, atTime + dur);
  }
}

function stepOscType(wave: SfxStep4W['wave']): OscillatorType {
  if (wave === 'saw') return 'sawtooth';
  if (wave === 'tri') return 'triangle';
  return wave;
}

function playStep(ctx: AC, out: GainNode, step: SfxStep4W, atTime: number): void {
  const curve = step.curve ?? 'exp';
  const vol = clamp(step.vol, 0, 1);
  const dur = Math.max(0.02, step.dur);
  if (vol <= 0.0005 || muted) return;
  if (step.type === 'noise') {
    const buf = getNoiseBuffer(ctx);
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2;
    filter.frequency.setValueAtTime(Math.max(40, step.freq), atTime);
    if (isFinite(step.freqEnd ?? NaN)) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, step.freqEnd as number), atTime + dur);
    }
    const g = ctx.createGain();
    applyCurve(g.gain, curve, vol, atTime, dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(out);
    src.start(atTime);
    src.stop(atTime + dur + 0.05);
  } else {
    const osc = ctx.createOscillator();
    osc.type = stepOscType(step.wave);
    osc.frequency.setValueAtTime(Math.max(20, step.freq), atTime);
    if (isFinite(step.freqEnd ?? NaN)) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, step.freqEnd as number), atTime + dur);
    }
    const g = ctx.createGain();
    applyCurve(g.gain, curve, vol, atTime, dur);
    osc.connect(g);
    g.connect(out);
    osc.start(atTime);
    osc.stop(atTime + dur + 0.05);
  }
}

/**
 * Play a one-shot SFX recipe (or a named {@link SFX_PRESETS} preset).
 * Returns false when there is no context / muted / invalid — never throws.
 */
export function playSfx(recipe: SfxRecipe | Sfx4W | SfxPresetName, ctx?: AC | null): boolean {
  try {
    bindFirstGesture();
    const resolved: SfxRecipe | null =
      typeof recipe === 'string'
        ? (SFX_PRESETS[recipe] ?? null)
        : recipe !== null && typeof recipe === 'object' && Array.isArray((recipe as SfxRecipe).steps)
          ? (recipe as SfxRecipe)
          : null;
    if (!resolved || resolved.steps.length === 0) return false;
    const ac = ctx ?? getAudioContext();
    if (!ac) return false;
    ensureGraph(ac);
    if (!sfxBus) return false;
    const bus = sfxBus;
    const now = ac.currentTime;
    let fired = false;
    for (const step of resolved.steps.slice(0, 16)) {
      try {
        if (!step || !isFinite(step.dur) || !isFinite(step.freq)) continue;
        const atTime = now + Math.max(0, step.delay ?? 0);
        playStep(ac, bus, step, atTime);
        fired = true;
      } catch {
        /* skip bad steps */
      }
    }
    return fired;
  } catch {
    return false;
  }
}

/** Stop every playing song and silence scheduled voices. Never throws. */
export function stopAll(): void {
  try {
    for (const id of Array.from(activeSongs.keys())) stopSong(id);
    try {
      if (sharedCtx) applyVolumes();
    } catch {
      /* ignore */
    }
  } catch {
    /* ignore */
  }
}

/** Number of currently scheduled songs (useful for tests/wiring). */
export function activeSongCount(): number {
  try {
    return activeSongs.size;
  } catch {
    return 0;
  }
}
