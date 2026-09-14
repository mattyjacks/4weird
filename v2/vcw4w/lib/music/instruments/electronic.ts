/**
 * lib/music/instruments/electronic.ts - Electronic family voices (DS-MUSIC-04).
 *
 * Four voices built ONLY against ./core: theremin, synth-lead, synth-pad,
 * chiptune. Each voice is registered at load via registerInstrument; core
 * NEVER imports this file (no cycles).
 *
 * SSR-safe: no browser APIs at module top (functions + id list only;
 * all AudioContext use happens inside VoiceFn calls or startTheremin).
 * ASCII-only. No secrets, no DOM, no Node APIs. Never touch
 * format-4w/core.ts/rack.
 */

import { adsrGain, midiToFreq, registerInstrument } from "./core";
import type { InstrumentId, VoiceFn } from "./core";

/** Ids owned by this family file (all 4 registered below). */
export const ELECTRONIC_IDS: InstrumentId[] = [
  "theremin",
  "synth-lead",
  "synth-pad",
  "chiptune",
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

function stopNode(node: OscillatorNode, t: number): void {
  try {
    node.stop(t);
    /* scheduled */
  } catch {
    /* already stopped or ended: fail-open */
  }
}

// ---------------------------------------------------------------------------
// theremin: sine + portamento glide + vibrato LFO
// ---------------------------------------------------------------------------

const thereminVoice: VoiceFn = (ctx, dest, note) => {
  try {
    const freq = noteFreq(note);
    if (!Number.isFinite(freq) || freq <= 0) return;
    const vel = noteVel(note);
    const dur = noteDur(note, 0.5);
    const t = note.time;
    const env = adsrGain(ctx, t, 0.08, 0.1, 0.8, 0.2, vel * 0.85);
    env.connect(dest);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    // Portamento glide: start a 6th below-ish, slide into the note.
    const startFreq = Math.max(1, freq * 0.94);
    osc.frequency.setValueAtTime(startFreq, t);
    try {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq), t + 0.08);
      /* glide scheduled */
    } catch {
      /* ramp unsupported: keep steady pitch */
    }
    // Vibrato LFO: ~5.5 Hz wobble at ~2% depth.
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(5.5, t);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(Math.max(0.1, freq * 0.02), t);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(env);
    const end = t + dur + 0.4;
    osc.start(t);
    lfo.start(t);
    stopNode(osc, end);
    stopNode(lfo, end);
  } catch {
    /* fail-open: voices must not throw outward */
  }
};

// ---------------------------------------------------------------------------
// synth-lead: detuned saws + sweeping lowpass
// ---------------------------------------------------------------------------

const synthLeadVoice: VoiceFn = (ctx, dest, note) => {
  try {
    const freq = noteFreq(note);
    if (!Number.isFinite(freq) || freq <= 0) return;
    const vel = noteVel(note);
    const dur = noteDur(note, 0.4);
    const t = note.time;
    const env = adsrGain(ctx, t, 0.01, 0.08, 0.7, 0.15, vel * 0.85);
    env.connect(dest);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.setValueAtTime(4, t);
    const sweepFrom = Math.min(12000, Math.max(100, freq * 2));
    const sweepTo = Math.min(12000, Math.max(100, freq * 8));
    filter.frequency.setValueAtTime(sweepFrom, t);
    try {
      filter.frequency.linearRampToValueAtTime(sweepTo, t + Math.max(0.05, dur));
      /* sweep scheduled */
    } catch {
      /* ramp unsupported: keep static cutoff */
    }
    filter.connect(env);
    const detunes = [-6, 6];
    const oscs: OscillatorNode[] = [];
    for (const cents of detunes) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(Math.max(1, freq), t);
      osc.detune.setValueAtTime(cents, t);
      osc.connect(filter);
      oscs.push(osc);
    }
    const end = t + 0.01 + 0.08 + 0.15 + Math.max(0.05, dur) + 0.05;
    for (const osc of oscs) {
      osc.start(t);
      stopNode(osc, end);
    }
  } catch {
    /* fail-open: voices must not throw outward */
  }
};

// ---------------------------------------------------------------------------
// synth-pad: 4-osc detuned stack, 0.4s attack, long release
// ---------------------------------------------------------------------------

const synthPadVoice: VoiceFn = (ctx, dest, note) => {
  try {
    const freq = noteFreq(note);
    if (!Number.isFinite(freq) || freq <= 0) return;
    const vel = noteVel(note);
    const dur = noteDur(note, 1.2);
    const t = note.time;
    const env = adsrGain(ctx, t, 0.4, 0.3, 0.8, 1.5, vel * 0.7);
    env.connect(dest);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.setValueAtTime(0.5, t);
    filter.frequency.setValueAtTime(Math.min(8000, Math.max(200, freq * 2)), t);
    filter.connect(env);
    const detunes = [-12, -4, 4, 12];
    const oscs: OscillatorNode[] = [];
    for (const cents of detunes) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(Math.max(1, freq), t);
      osc.detune.setValueAtTime(cents, t);
      const trim = ctx.createGain();
      trim.gain.setValueAtTime(0.25, t);
      osc.connect(trim);
      trim.connect(filter);
      oscs.push(osc);
    }
    const hold = Math.max(0.8, dur);
    const end = t + 0.4 + 0.3 + hold + 1.5 + 0.1;
    for (const osc of oscs) {
      osc.start(t);
      stopNode(osc, end);
    }
  } catch {
    /* fail-open: voices must not throw outward */
  }
};

// ---------------------------------------------------------------------------
// chiptune: raw square, octave tick on dur > 0.3
// ---------------------------------------------------------------------------

const chiptuneVoice: VoiceFn = (ctx, dest, note) => {
  try {
    const freq = noteFreq(note);
    if (!Number.isFinite(freq) || freq <= 0) return;
    const vel = noteVel(note);
    const dur = noteDur(note, 0.25);
    const t = note.time;
    const env = adsrGain(ctx, t, 0.003, 0.02, 0.9, 0.06, vel * 0.65);
    env.connect(dest);
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(Math.max(1, freq), t);
    osc.connect(env);
    const end = t + Math.max(0.05, dur) + 0.15;
    osc.start(t);
    stopNode(osc, end);
    // Octave tick: short 2x blip at note start for long notes.
    if (dur > 0.3) {
      try {
        const tick = ctx.createOscillator();
        tick.type = "square";
        tick.frequency.setValueAtTime(Math.max(1, freq * 2), t);
        const tickGain = ctx.createGain();
        tickGain.gain.setValueAtTime(vel * 0.4, t);
        tick.connect(tickGain);
        tickGain.connect(dest);
        tick.start(t);
        stopNode(tick, t + 0.06);
      } catch {
        /* tick optional: main voice already scheduled */
      }
    }
  } catch {
    /* fail-open: voices must not throw outward */
  }
};

// ---------------------------------------------------------------------------
// startTheremin: live theremin handle for the rack UI (probed dynamically)
// ---------------------------------------------------------------------------

/** Live theremin handle: glide pitch/volume, then stop. Never throws. */
export interface ThereminHandle {
  setFreq: (freq: number) => void;
  setVol: (vol: number) => void;
  stop: () => void;
}

export function startTheremin(
  ctx: BaseAudioContext,
  dest: AudioNode,
): ThereminHandle {
  const noop: ThereminHandle = {
    setFreq: () => undefined,
    setVol: () => undefined,
    stop: () => undefined,
  };
  try {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.setTargetAtTime(0.5, ctx.currentTime, 0.05);
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(5.5, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(8, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(ctx.currentTime);
    lfo.start(ctx.currentTime);
    let stopped = false;
    return {
      setFreq: (freq: number) => {
        try {
          if (!Number.isFinite(freq) || freq <= 0) return;
          // Portamento glide toward the new pitch.
          osc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.03);
        } catch {
          /* fail-open */
        }
      },
      setVol: (vol: number) => {
        try {
          if (!Number.isFinite(vol)) return;
          const v = Math.min(1, Math.max(0, vol));
          gain.gain.setTargetAtTime(Math.max(0.0001, v), ctx.currentTime, 0.03);
        } catch {
          /* fail-open */
        }
      },
      stop: () => {
        try {
          if (stopped) return;
          stopped = true;
          const end = ctx.currentTime + 0.1;
          try {
            gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.03);
            /* fade scheduled */
          } catch {
            /* keep stopping anyway */
          }
          stopNode(osc, end);
          stopNode(lfo, end);
        } catch {
          /* fail-open */
        }
      },
    };
  } catch {
    return noop;
  }
}

// ---------------------------------------------------------------------------
// Registration (load-time side effect; core never imports back)
// ---------------------------------------------------------------------------

registerInstrument("theremin", thereminVoice);
registerInstrument("synth-lead", synthLeadVoice);
registerInstrument("synth-pad", synthPadVoice);
registerInstrument("chiptune", chiptuneVoice);
