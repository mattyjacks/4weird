/**
 * lib/music/instruments/melodic.ts - Melodic family voices (DS-MUSIC-02).
 *
 * Six voices built ONLY against ./core: piano, guitar, bass, harp,
 * marimba, music-box. Each voice is registered at load via
 * registerInstrument; core NEVER imports this file (no cycles).
 *
 * SSR-safe: no browser APIs at module top (functions + id list only;
 * all AudioContext use happens inside VoiceFn calls). ASCII-only.
 * No secrets, no DOM, no Node APIs. Never touch format-4w/core.ts/rack.
 */

import { adsrGain, midiToFreq, noiseBuffer, registerInstrument } from "./core";
import type { InstrumentId, VoiceFn } from "./core";

/** Ids owned by this family file (all 6 registered below). */
export const MELODIC_IDS: InstrumentId[] = [
  "piano",
  "guitar",
  "bass",
  "harp",
  "marimba",
  "music-box",
];

// ---------------------------------------------------------------------------
// Local helpers (context-bound; no top-level audio)
// ---------------------------------------------------------------------------

function noteFreq(note: { midi: number; freq?: number }): number {
  if (typeof note.freq === "number" && Number.isFinite(note.freq)) {
    return note.freq as number;
  }
  return midiToFreq(note.midi);
}

function noteVel(note: { vel?: number }): number {
  if (typeof note.vel === "number" && Number.isFinite(note.vel)) {
    const v = note.vel as number;
    if (v < 0) return 0;
    if (v > 1) return 1;
    return v;
  }
  return 0.8;
}

function noteDur(note: { dur?: number }, fallback: number): number {
  if (
    typeof note.dur === "number" &&
    Number.isFinite(note.dur) &&
    (note.dur as number) > 0
  ) {
    return note.dur as number;
  }
  return fallback;
}

function stopSource(node: OscillatorNode | AudioBufferSourceNode, t: number): void {
  try {
    node.stop(t);
    /* scheduled */
  } catch {
    /* already stopped or ended: fail-open */
  }
}

function makeTone(
  ctx: BaseAudioContext,
  type: OscillatorType,
  freq: number,
  t: number,
  level: number,
): { osc: OscillatorNode; gain: GainNode } {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(level, t);
  osc.connect(gain);
  return { osc, gain };
}

// ---------------------------------------------------------------------------
// piano: triangle + sine-octave stack, ~2s decay
// ---------------------------------------------------------------------------

const pianoVoice: VoiceFn = (ctx, dest, note) => {
  try {
    const freq = noteFreq(note);
    if (!Number.isFinite(freq) || freq <= 0) return;
    const vel = noteVel(note);
    const t = note.time;
    const env = adsrGain(ctx, t, 0.004, 0.5, 0.25, 1.5, vel * 0.9);
    env.connect(dest);
    const body = makeTone(ctx, "triangle", freq, t, 0.7);
    body.gain.connect(env);
    const octave = makeTone(ctx, "sine", freq * 2, t, 0.22);
    octave.gain.connect(env);
    const end = t + 0.004 + 0.5 + 1.5 + 0.1;
    body.osc.start(t);
    octave.osc.start(t);
    stopSource(body.osc, end);
    stopSource(octave.osc, end);
  } catch {
    /* fail-open: voices must not throw outward */
  }
};

// ---------------------------------------------------------------------------
// guitar: Karplus-Strong pluck via DelayNode feedback loop
// ---------------------------------------------------------------------------

const guitarVoice: VoiceFn = (ctx, dest, note) => {
  try {
    const freq = noteFreq(note);
    if (!Number.isFinite(freq) || freq <= 0) return;
    const vel = noteVel(note);
    const dur = noteDur(note, 1.2);
    const t = note.time;
    const period = 1 / freq;
    const loop = ctx.createDelay(1.0);
    loop.delayTime.setValueAtTime(
      Math.min(1.0, Math.max(0.0005, period)),
      t,
    );
    const dampen = ctx.createBiquadFilter();
    dampen.type = "lowpass";
    dampen.frequency.setValueAtTime(
      Math.min(8000, Math.max(800, freq * 8)),
      t,
    );
    dampen.Q.setValueAtTime(0.5, t);
    const feedback = ctx.createGain();
    feedback.gain.setValueAtTime(0.96, t);
    loop.connect(dampen);
    dampen.connect(feedback);
    feedback.connect(loop);
    const out = ctx.createGain();
    out.gain.setValueAtTime(vel * 0.9, t);
    out.gain.setTargetAtTime(0.0001, t + 0.05, Math.max(0.05, dur / 3));
    loop.connect(out);
    out.connect(dest);
    // Short noise burst excites the loop, then dies away.
    const exc = ctx.createBufferSource();
    exc.buffer = noiseBuffer(ctx);
    const excGain = ctx.createGain();
    excGain.gain.setValueAtTime(vel, t);
    excGain.gain.setTargetAtTime(0.0001, t, 0.008);
    exc.connect(excGain);
    excGain.connect(loop);
    exc.start(t);
    const end = t + dur + 1.0;
    stopSource(exc, Math.min(end, t + 0.9));
    // Fade the loop so it cannot ring past the note.
    feedback.gain.setTargetAtTime(0.0001, end - 0.25, 0.05);
  } catch {
    /* fail-open: voices must not throw outward */
  }
};

// ---------------------------------------------------------------------------
// bass: sine body + square sub-octave punch
// ---------------------------------------------------------------------------

const bassVoice: VoiceFn = (ctx, dest, note) => {
  try {
    const freq = noteFreq(note);
    if (!Number.isFinite(freq) || freq <= 0) return;
    const vel = noteVel(note);
    const dur = noteDur(note, 0.4);
    const t = note.time;
    const env = adsrGain(ctx, t, 0.005, 0.08, 0.8, Math.min(0.6, 0.15 + dur), vel);
    env.connect(dest);
    // Punch: brief pitch drop into the root.
    const body = makeTone(ctx, "sine", freq * 1.25, t, 0.9);
    try {
      body.osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq), t + 0.05);
      /* punch scheduled */
    } catch {
      /* ramp unsupported: keep steady pitch */
    }
    body.gain.connect(env);
    const sub = makeTone(ctx, "square", Math.max(1, freq / 2), t, 0.3);
    const subTone = ctx.createBiquadFilter();
    subTone.type = "lowpass";
    subTone.frequency.setValueAtTime(Math.min(4000, Math.max(100, freq * 2)), t);
    sub.gain.connect(subTone);
    subTone.connect(env);
    const end = t + 0.005 + 0.08 + Math.min(0.6, 0.15 + dur) + 0.1;
    body.osc.start(t);
    sub.osc.start(t);
    stopSource(body.osc, end);
    stopSource(sub.osc, end);
  } catch {
    /* fail-open: voices must not throw outward */
  }
};

// ---------------------------------------------------------------------------
// harp: bright long pluck (triangle + octave + 3rd)
// ---------------------------------------------------------------------------

const harpVoice: VoiceFn = (ctx, dest, note) => {
  try {
    const freq = noteFreq(note);
    if (!Number.isFinite(freq) || freq <= 0) return;
    const vel = noteVel(note);
    const t = note.time;
    const env = adsrGain(ctx, t, 0.002, 0.6, 0.15, 1.8, vel * 0.85);
    env.connect(dest);
    const body = makeTone(ctx, "triangle", freq, t, 0.65);
    body.gain.connect(env);
    const octave = makeTone(ctx, "sine", freq * 2, t, 0.3);
    octave.gain.connect(env);
    const shimmer = makeTone(ctx, "sine", freq * 3, t, 0.12);
    shimmer.gain.connect(env);
    const end = t + 0.002 + 0.6 + 1.8 + 0.1;
    body.osc.start(t);
    octave.osc.start(t);
    shimmer.osc.start(t);
    stopSource(body.osc, end);
    stopSource(octave.osc, end);
    stopSource(shimmer.osc, end);
  } catch {
    /* fail-open: voices must not throw outward */
  }
};

// ---------------------------------------------------------------------------
// marimba: sine + 4th harmonic, short bounce (~0.4s)
// ---------------------------------------------------------------------------

const marimbaVoice: VoiceFn = (ctx, dest, note) => {
  try {
    const freq = noteFreq(note);
    if (!Number.isFinite(freq) || freq <= 0) return;
    const vel = noteVel(note);
    const t = note.time;
    const env = adsrGain(ctx, t, 0.003, 0.12, 0.1, 0.25, vel * 0.9);
    env.connect(dest);
    const body = makeTone(ctx, "sine", freq, t, 0.8);
    body.gain.connect(env);
    // 4th harmonic bar partial with its own fast fade.
    const partial = makeTone(ctx, "sine", freq * 4, t, 0.18);
    partial.gain.gain.setTargetAtTime(0.0001, t + 0.01, 0.05);
    partial.gain.connect(env);
    const end = t + 0.003 + 0.12 + 0.25 + 0.1;
    body.osc.start(t);
    partial.osc.start(t);
    stopSource(body.osc, end);
    stopSource(partial.osc, end);
  } catch {
    /* fail-open: voices must not throw outward */
  }
};

// ---------------------------------------------------------------------------
// music-box: high sine + 3rd partial, long metallic decay
// ---------------------------------------------------------------------------

const musicBoxVoice: VoiceFn = (ctx, dest, note) => {
  try {
    const freq = noteFreq(note);
    if (!Number.isFinite(freq) || freq <= 0) return;
    const vel = noteVel(note);
    const t = note.time;
    const env = adsrGain(ctx, t, 0.002, 0.8, 0.2, 2.2, vel * 0.7);
    env.connect(dest);
    const body = makeTone(ctx, "sine", freq, t, 0.75);
    body.gain.connect(env);
    const metallic = makeTone(ctx, "sine", freq * 3, t, 0.3);
    metallic.gain.connect(env);
    const end = t + 0.002 + 0.8 + 2.2 + 0.1;
    body.osc.start(t);
    metallic.osc.start(t);
    stopSource(body.osc, end);
    stopSource(metallic.osc, end);
  } catch {
    /* fail-open: voices must not throw outward */
  }
};

// ---------------------------------------------------------------------------
// Registration (load-time side effect; core never imports back)
// ---------------------------------------------------------------------------

registerInstrument("piano", pianoVoice);
registerInstrument("guitar", guitarVoice);
registerInstrument("bass", bassVoice);
registerInstrument("harp", harpVoice);
registerInstrument("marimba", marimbaVoice);
registerInstrument("music-box", musicBoxVoice);
