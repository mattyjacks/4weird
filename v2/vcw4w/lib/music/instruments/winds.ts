/**
 * lib/music/instruments/winds.ts - Wind/string/key voices (DS-MUSIC-03).
 *
 * Family file: imports ONLY from "./core" and calls registerInstrument
 * at load. Core NEVER imports this file (no cycles).
 *
 * Voices: flute, trumpet, sax, violin, organ.
 * note.dur is seconds (default 0.5). All voices are vel-scaled,
 * stop their nodes, and never throw outward.
 *
 * SSR-safe: no browser APIs at module top (functions + registry only).
 * ASCII-only. No secrets, no DOM, no Node APIs.
 */

import {
  type InstrumentId,
  type VoiceFn,
  adsrGain,
  midiToFreq,
  noiseBuffer,
  registerInstrument,
} from "./core";

/** Wind-family instrument ids owned by this file. */
export const WIND_IDS: InstrumentId[] = [
  "flute",
  "trumpet",
  "sax",
  "violin",
  "organ",
];

const MIN_GAIN = 0.0001;

function noteFreq(note: { midi: number; freq?: number }): number {
  if (typeof note.freq === "number" && Number.isFinite(note.freq) && note.freq > 0) {
    return Math.min(12000, Math.max(20, note.freq));
  }
  const f = midiToFreq(note.midi);
  if (!Number.isFinite(f) || f <= 0) return 440;
  return Math.min(12000, Math.max(20, f));
}

function noteDur(note: { dur?: number }): number {
  if (typeof note.dur === "number" && Number.isFinite(note.dur) && note.dur > 0) {
    return Math.min(8, Math.max(0.05, note.dur));
  }
  return 0.5;
}

function noteVel(note: { vel?: number }): number {
  if (typeof note.vel === "number" && Number.isFinite(note.vel)) {
    return Math.min(1, Math.max(0, note.vel));
  }
  return 0.8;
}

function stopAt(nodes: Array<{ stop: (when?: number) => void }>, when: number): void {
  for (const n of nodes) {
    try {
      n.stop(when);
    } catch {
      // already stopped - ignore
    }
  }
}

/** Sine LFO wired to an AudioParam for vibrato. Caller stops the lfo. */
function addVibrato(
  ctx: BaseAudioContext,
  target: AudioParam,
  time: number,
  rate: number,
  depthHz: number,
  delay: number,
): OscillatorNode {
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.setValueAtTime(rate, time);
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(MIN_GAIN, time);
  depth.gain.linearRampToValueAtTime(Math.max(MIN_GAIN, depthHz), time + delay + 0.15);
  lfo.connect(depth);
  depth.connect(target);
  lfo.start(time);
  return lfo;
}

/** Breath-noise layer through a bandpass. Caller stops the source. */
function breathLayer(
  ctx: BaseAudioContext,
  dest: AudioNode,
  time: number,
  dur: number,
  vel: number,
  bandFreq: number,
  peak: number,
  attack: number,
): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(Math.min(10000, Math.max(200, bandFreq)), time);
  bp.Q.setValueAtTime(1.0, time);
  const g = ctx.createGain();
  g.gain.setValueAtTime(MIN_GAIN, time);
  g.gain.linearRampToValueAtTime(Math.max(MIN_GAIN, peak * vel), time + attack);
  g.gain.setValueAtTime(Math.max(MIN_GAIN, peak * vel), time + Math.max(attack, dur - 0.08));
  g.gain.linearRampToValueAtTime(MIN_GAIN, time + dur + 0.08);
  src.connect(bp);
  bp.connect(g);
  g.connect(dest);
  src.start(time);
  return src;
}

const flute: VoiceFn = (ctx, dest, note) => {
  try {
    const freq = noteFreq(note);
    const dur = noteDur(note);
    const vel = noteVel(note);
    const time = note.time;
    const stop = time + dur + 0.25;
    const out = ctx.createGain();
    out.gain.value = 1;
    out.connect(dest);

    const env = adsrGain(ctx, time, 0.06, 0.08, 0.85, Math.min(0.2, dur * 0.4 + 0.05), 0.5 * vel + MIN_GAIN);
    env.connect(out);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, time);
    osc.connect(env);
    osc.start(time);

    // Airy octave shimmer, very quiet.
    const shimmer = ctx.createOscillator();
    shimmer.type = "sine";
    shimmer.frequency.setValueAtTime(freq * 2, time);
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.setValueAtTime(MIN_GAIN, time);
    shimmerGain.gain.linearRampToValueAtTime(0.06 * vel, time + 0.08);
    shimmerGain.gain.linearRampToValueAtTime(MIN_GAIN, time + dur + 0.1);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(out);
    shimmer.start(time);

    const breath = breathLayer(ctx, out, time, dur, vel, Math.min(8000, freq * 3), 0.05, 0.07);

    const stoppables: Array<{ stop: (when?: number) => void }> = [osc, shimmer, breath];
    if (dur > 0.4) {
      const lfo = addVibrato(ctx, osc.frequency, time, 5.5, freq * 0.008, 0.12);
      stoppables.push(lfo);
    }
    stopAt(stoppables, stop);
  } catch {
    // fail-open per VoiceFn contract
  }
};

const trumpet: VoiceFn = (ctx, dest, note) => {
  try {
    const freq = noteFreq(note);
    const dur = noteDur(note);
    const vel = noteVel(note);
    const time = note.time;
    const stop = time + dur + 0.25;

    // Brassy lowpass that bites at attack then settles.
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.setValueAtTime(1.2, time);
    filter.frequency.setValueAtTime(Math.min(9000, Math.max(800, freq * 6)), time);
    filter.frequency.exponentialRampToValueAtTime(
      Math.min(7000, Math.max(600, freq * 2.5)),
      time + 0.12,
    );
    filter.connect(dest);

    // Brassy attack: quick bite to full, settle to sustain.
    const env = ctx.createGain();
    const peak = 0.42 * vel + MIN_GAIN;
    env.gain.setValueAtTime(MIN_GAIN, time);
    env.gain.linearRampToValueAtTime(peak, time + 0.025);
    env.gain.linearRampToValueAtTime(Math.max(MIN_GAIN, peak * 0.8), time + 0.12);
    env.gain.setValueAtTime(Math.max(MIN_GAIN, peak * 0.8), time + Math.max(0.12, dur - 0.08));
    env.gain.linearRampToValueAtTime(MIN_GAIN, time + dur + 0.1);
    env.connect(filter);

    const stoppables: Array<{ stop: (when?: number) => void }> = [];
    const detunes = [0, 4, -4];
    for (const cents of detunes) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, time);
      osc.detune.setValueAtTime(cents, time);
      osc.connect(env);
      osc.start(time);
      stoppables.push(osc);
    }
    stopAt(stoppables, stop);
  } catch {
    // fail-open per VoiceFn contract
  }
};

const sax: VoiceFn = (ctx, dest, note) => {
  try {
    const freq = noteFreq(note);
    const dur = noteDur(note);
    const vel = noteVel(note);
    const time = note.time;
    const stop = time + dur + 0.25;

    // Mellow low cutoff for the reed body.
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.setValueAtTime(0.8, time);
    filter.frequency.setValueAtTime(Math.min(4000, Math.max(500, freq * 2)), time);
    filter.connect(dest);

    const env = adsrGain(ctx, time, 0.05, 0.09, 0.85, 0.12, 0.45 * vel + MIN_GAIN);
    env.connect(filter);

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, time);
    osc.connect(env);
    osc.start(time);

    const breath = breathLayer(ctx, filter, time, dur, vel, Math.min(5000, freq * 2), 0.04, 0.06);

    stopAt([osc, breath], stop);
  } catch {
    // fail-open per VoiceFn contract
  }
};

const violin: VoiceFn = (ctx, dest, note) => {
  try {
    const freq = noteFreq(note);
    const dur = noteDur(note);
    const vel = noteVel(note);
    const time = note.time;
    const stop = time + dur + 0.3;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.setValueAtTime(0.7, time);
    filter.frequency.setValueAtTime(Math.min(6000, Math.max(800, freq * 3)), time);
    filter.connect(dest);

    // 0.08s bow attack, hold through dur, gentle release.
    const env = ctx.createGain();
    const peak = 0.4 * vel + MIN_GAIN;
    env.gain.setValueAtTime(MIN_GAIN, time);
    env.gain.linearRampToValueAtTime(peak, time + 0.08);
    env.gain.setValueAtTime(peak, time + Math.max(0.08, dur - 0.12));
    env.gain.linearRampToValueAtTime(MIN_GAIN, time + dur + 0.15);
    env.connect(filter);

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, time);
    osc.connect(env);
    osc.start(time);

    const osc2 = ctx.createOscillator();
    osc2.type = "sawtooth";
    osc2.frequency.setValueAtTime(freq, time);
    osc2.detune.setValueAtTime(5, time);
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.4, time);
    osc2.connect(osc2Gain);
    osc2Gain.connect(env);
    osc2.start(time);

    const lfo = addVibrato(ctx, osc.frequency, time + 0.1, 5.8, freq * 0.007, 0.15);
    const lfo2 = addVibrato(ctx, osc2.frequency, time + 0.1, 5.8, freq * 0.007, 0.15);

    stopAt([osc, osc2, lfo, lfo2], stop);
  } catch {
    // fail-open per VoiceFn contract
  }
};

const organ: VoiceFn = (ctx, dest, note) => {
  try {
    const freq = noteFreq(note);
    const dur = noteDur(note);
    const vel = noteVel(note);
    const time = note.time;
    const stop = time + dur + 0.25;

    const out = ctx.createGain();
    out.connect(dest);

    // Full hold through dur, short release.
    const env = ctx.createGain();
    const peak = 0.5 * vel + MIN_GAIN;
    env.gain.setValueAtTime(MIN_GAIN, time);
    env.gain.linearRampToValueAtTime(peak, time + 0.01);
    env.gain.setValueAtTime(peak, time + Math.max(0.01, dur - 0.05));
    env.gain.linearRampToValueAtTime(MIN_GAIN, time + dur + 0.08);
    env.connect(out);

    // 3 drawbar sines: fundamental + 2x + 4x.
    const drawbars: Array<[number, number]> = [
      [1, 0.5],
      [2, 0.3],
      [4, 0.2],
    ];
    const stoppables: Array<{ stop: (when?: number) => void }> = [];
    for (const [mult, level] of drawbars) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(Math.min(12000, freq * mult), time);
      const g = ctx.createGain();
      g.gain.setValueAtTime(level, time);
      osc.connect(g);
      g.connect(env);
      osc.start(time);
      stoppables.push(osc);
    }

    // Key click: tiny noise burst at attack.
    const click = ctx.createBufferSource();
    click.buffer = noiseBuffer(ctx);
    const clickFilter = ctx.createBiquadFilter();
    clickFilter.type = "highpass";
    clickFilter.frequency.setValueAtTime(3000, time);
    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.12 * vel + MIN_GAIN, time);
    clickGain.gain.exponentialRampToValueAtTime(MIN_GAIN, time + 0.02);
    click.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(out);
    click.start(time);
    stoppables.push(click);

    stopAt(stoppables, stop);
  } catch {
    // fail-open per VoiceFn contract
  }
};

registerInstrument("flute", flute);
registerInstrument("trumpet", trumpet);
registerInstrument("sax", sax);
registerInstrument("violin", violin);
registerInstrument("organ", organ);
