/**
 * lib/music/instruments/drums.ts - Drum family voices (DS-MUSIC-05).
 *
 * Imports ONLY from "./core" and registers kick, snare, hihat, tom, crash
 * at load. Core NEVER imports this file (no cycles).
 *
 * SSR-safe: no browser APIs at module top (function defs + registry calls).
 * ASCII-only. No secrets, no DOM, no Node APIs.
 */

import {
  adsrGain,
  midiToFreq,
  noiseBuffer,
  registerInstrument,
  type InstrumentId,
  type VoiceFn,
} from "./core";

/** The five drum voice ids (subset of InstrumentId). */
export const DRUM_IDS: InstrumentId[] = [
  "kick",
  "snare",
  "hihat",
  "tom",
  "crash",
];

/** General MIDI drum-map defaults for the five voices. */
export const DEFAULT_KIT: Record<string, number> = {
  kick: 36,
  snare: 38,
  hihat: 42,
  tom: 45,
  crash: 49,
};

function velOf(vel: number | undefined): number {
  if (!Number.isFinite(vel as number)) return 0.8;
  const v = vel as number;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function durOf(dur: number | undefined, fallback: number): number {
  if (!Number.isFinite(dur as number)) return fallback;
  const d = dur as number;
  if (d <= 0) return fallback;
  return Math.min(d, 4);
}

/** Kick: sine pitch drop 150 -> 45 Hz, 0.25 s thump. */
const kick: VoiceFn = (ctx, dest, note) => {
  try {
    const t = note.time;
    const vel = velOf(note.vel);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const g = adsrGain(ctx, t, 0.002, 0.08, 0.4, 0.16, vel);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + 0.3);
  } catch {
    /* fail-open: voice must not throw outward */
  }
};

/** Snare: bandpass noise snap + 180 Hz triangle body, 0.2 s. */
const snare: VoiceFn = (ctx, dest, note) => {
  try {
    const t = note.time;
    const vel = velOf(note.vel);
    // Noise snap through a bandpass.
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    bp.Q.value = 0.9;
    const ng = adsrGain(ctx, t, 0.001, 0.06, 0.3, 0.13, vel);
    src.connect(bp);
    bp.connect(ng);
    ng.connect(dest);
    src.start(t);
    src.stop(t + 0.25);
    // 180 Hz triangle body.
    const body = ctx.createOscillator();
    body.type = "triangle";
    body.frequency.setValueAtTime(180, t);
    const bg = adsrGain(ctx, t, 0.001, 0.05, 0.2, 0.12, vel * 0.7);
    body.connect(bg);
    bg.connect(dest);
    body.start(t);
    body.stop(t + 0.25);
  } catch {
    /* fail-open */
  }
};

/**
 * Hi-hat: highpass noise at 7 kHz. Closed 0.06 s; open 0.3 s when
 * note.dur > 0.3.
 */
const hihat: VoiceFn = (ctx, dest, note) => {
  try {
    const t = note.time;
    const vel = velOf(note.vel);
    const open = durOf(note.dur, 0.06) > 0.3;
    const len = open ? 0.3 : 0.06;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    const g = adsrGain(
      ctx,
      t,
      0.001,
      open ? 0.12 : 0.02,
      open ? 0.4 : 0.2,
      open ? 0.17 : 0.035,
      vel * 0.6,
    );
    src.connect(hp);
    hp.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(t + len + 0.05);
  } catch {
    /* fail-open */
  }
};

/**
 * Tom: sine drop from a midi-mapped start (clamped 80..200 Hz) down one
 * octave-ish, 0.3 s round thump.
 */
const tom: VoiceFn = (ctx, dest, note) => {
  try {
    const t = note.time;
    const vel = velOf(note.vel);
    let start = midiToFreq(note.midi);
    if (!Number.isFinite(start)) start = 120;
    start = Math.min(200, Math.max(80, start));
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(start, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, start * 0.5), t + 0.2);
    const g = adsrGain(ctx, t, 0.002, 0.1, 0.4, 0.18, vel);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + 0.35);
  } catch {
    /* fail-open */
  }
};

/** Crash: highpass noise wash + brighter shimmer tail, 1.2 s. */
const crash: VoiceFn = (ctx, dest, note) => {
  try {
    const t = note.time;
    const vel = velOf(note.vel);
    // Wash: highpass at 4 kHz, long decay.
    const wash = ctx.createBufferSource();
    wash.buffer = noiseBuffer(ctx);
    wash.loop = true;
    const washHp = ctx.createBiquadFilter();
    washHp.type = "highpass";
    washHp.frequency.value = 4000;
    const washGain = adsrGain(ctx, t, 0.002, 0.4, 0.35, 0.78, vel * 0.55);
    wash.connect(washHp);
    washHp.connect(washGain);
    washGain.connect(dest);
    wash.start(t);
    wash.stop(t + 1.25);
    // Shimmer: highpass at 8 kHz, quieter, shorter.
    const shim = ctx.createBufferSource();
    shim.buffer = noiseBuffer(ctx);
    shim.loop = true;
    const shimHp = ctx.createBiquadFilter();
    shimHp.type = "highpass";
    shimHp.frequency.value = 8000;
    const shimGain = adsrGain(ctx, t, 0.002, 0.25, 0.25, 0.55, vel * 0.3);
    shim.connect(shimHp);
    shimHp.connect(shimGain);
    shimGain.connect(dest);
    shim.start(t);
    shim.stop(t + 1.25);
  } catch {
    /* fail-open */
  }
};

registerInstrument("kick", kick);
registerInstrument("snare", snare);
registerInstrument("hihat", hihat);
registerInstrument("tom", tom);
registerInstrument("crash", crash);
