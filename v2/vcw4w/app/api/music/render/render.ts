// DS-MUSIC-07 pure-TS float-sample render engine (Node-safe).
// Scope: ONLY app/api/music/render/**. No WebAudio, no
// OfflineAudioContext (Node has neither) — every timbre is float
// math over Float32Array. Deterministic: same input bytes produce
// the same WAV bytes (seeded noise), so bots get stable output.
// ASCII-only.

export const SAMPLE_RATE = 22050;
export const MAX_NOTES = 64;
export const MAX_SECONDS = 30;
export const TAIL_SECONDS = 0.6;
export const BPM_MIN = 40;
export const BPM_MAX = 240;

export const INSTRUMENT_IDS = [
  "piano",
  "guitar",
  "bass",
  "harp",
  "marimba",
  "music-box",
  "flute",
  "trumpet",
  "sax",
  "violin",
  "organ",
  "theremin",
  "synth-lead",
  "synth-pad",
  "chiptune",
  "kick",
  "snare",
  "hihat",
  "tom",
  "crash",
] as const;

export type InstrumentId = (typeof INSTRUMENT_IDS)[number];

export const INSTRUMENT_META: Record<
  InstrumentId,
  { name: string; family: string; description: string }
> = {
  piano: { name: "Piano", family: "melodic", description: "Warm struck-string tone from layered triangle and sine." },
  guitar: { name: "Guitar", family: "melodic", description: "Plucked string via Karplus-Strong physical modeling." },
  bass: { name: "Bass", family: "melodic", description: "Deep rounded low end from sine plus soft square." },
  harp: { name: "Harp", family: "melodic", description: "Bright long-ringing pluck with a shimmer partial." },
  marimba: { name: "Marimba", family: "melodic", description: "Mellow mallet: sine plus a fast-decaying fourth harmonic." },
  "music-box": { name: "Music Box", family: "melodic", description: "Glassy bell: sine with high long-ringing partials." },
  flute: { name: "Flute", family: "wind", description: "Breathy sine lead with gentle vibrato and soft attack." },
  trumpet: { name: "Trumpet", family: "wind", description: "Bold brass saw with a firm attack and full sustain." },
  sax: { name: "Sax", family: "wind", description: "Reedy saw/square blend with expressive vibrato." },
  violin: { name: "Violin", family: "wind", description: "Bowed-string saw with slow attack and singing vibrato." },
  organ: { name: "Organ", family: "wind", description: "Drawbar-style stacked sine harmonics with flat sustain." },
  theremin: { name: "Theremin", family: "electronic", description: "Gliding sine that slides from the previous note pitch." },
  "synth-lead": { name: "Synth Lead", family: "electronic", description: "Cutting detuned dual-saw lead." },
  "synth-pad": { name: "Synth Pad", family: "electronic", description: "Slow-attack stacked-oscillator wash." },
  chiptune: { name: "Chiptune", family: "electronic", description: "Retro square-wave pulse blip." },
  kick: { name: "Kick", family: "drums", description: "Punchy sine pitch-drop thump." },
  snare: { name: "Snare", family: "drums", description: "Noise crack over a short body tone." },
  hihat: { name: "Hihat", family: "drums", description: "Bright highpassed noise tick." },
  tom: { name: "Tom", family: "drums", description: "Tuned pitch-drop drum head." },
  crash: { name: "Crash", family: "drums", description: "Long bright noise wash." },
};

export interface RenderNote {
  midi: number;
  t: number;
  d: number;
  v?: number;
}

export function isInstrumentId(v: unknown): v is InstrumentId {
  return typeof v === "string" && (INSTRUMENT_IDS as readonly string[]).includes(v);
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Deterministic PRNG (LCG) so renders are byte-stable per input.
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296 - 0.5; // -0.5..0.5 white sample
  };
}

type OscKind = "sine" | "square" | "saw" | "tri";

function oscValue(kind: OscKind, phase: number): number {
  const p = phase - Math.floor(phase); // cycles 0..1
  switch (kind) {
    case "sine":
      return Math.sin(2 * Math.PI * p);
    case "square":
      return p < 0.5 ? 1 : -1;
    case "saw":
      return 2 * p - 1;
    case "tri":
      return p < 0.5 ? 4 * p - 1 : 3 - 4 * p;
  }
}

interface ToneOpts {
  osc: OscKind;
  osc2?: OscKind;
  mix2?: number; // 0..1 weight of osc2 (osc2 at 2x freq)
  detune?: number; // ratio for a second osc1 copy (e.g. 1.003)
  attack: number; // seconds
  decayRate: number; // exp decay per second after attack
  sustain: number; // 0..1 floor during hold
  release: number; // seconds of release tail
  vibratoRate?: number; // Hz, 0 = off
  vibratoDepth?: number; // fractional freq wobble
  glideFrom?: number; // Hz start for pitch glide (theremin), 0 = off
  dropTo?: number; // ratio end/start for pitch-drop drums (0 = off)
  dropTime?: number; // seconds over which the drop happens
}

// Oscillating voice with exp-decay ADSR and optional vibrato /
// glide / pitch drop. Length = hold + release, capped at 4s.
function toneVoice(freq: number, durSec: number, vel: number, o: ToneOpts): Float32Array {
  const hold = Math.max(0.01, Math.min(durSec, 3.5));
  const rel = Math.max(0.02, Math.min(o.release, 1.5));
  const n = Math.min(Math.floor((hold + rel) * SAMPLE_RATE), SAMPLE_RATE * 4);
  const out = new Float32Array(n);
  const holdN = Math.floor(hold * SAMPLE_RATE);
  const attackN = Math.max(1, Math.floor(o.attack * SAMPLE_RATE));
  const glideFrom = o.glideFrom && o.glideFrom > 0 ? o.glideFrom : freq;
  const dropTo = o.dropTo && o.dropTo > 0 ? o.dropTo : 1;
  const dropN = Math.max(1, Math.floor((o.dropTime ?? 0.09) * SAMPLE_RATE));
  let phase = 0;
  let phaseB = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    // Pitch path: glide (first 30% of hold) then optional drop.
    let f = freq;
    if (glideFrom !== freq && i < holdN) {
      const k = Math.min(1, i / Math.max(1, Math.floor(holdN * 0.3)));
      f = glideFrom + (freq - glideFrom) * k;
    }
    if (dropTo !== 1) {
      const k = Math.min(1, i / dropN);
      f = f * (1 + (dropTo - 1) * (1 - Math.exp(-4 * k)));
    }
    if (o.vibratoRate && o.vibratoDepth) {
      f = f * (1 + o.vibratoDepth * Math.sin(2 * Math.PI * o.vibratoRate * t));
    }
    phase += f / SAMPLE_RATE;
    phaseB += (f * (o.detune ?? 1)) / SAMPLE_RATE;
    let s = oscValue(o.osc, phase);
    if (o.osc2) s = s * (1 - (o.mix2 ?? 0.3)) + oscValue(o.osc2, phase * 2) * (o.mix2 ?? 0.3);
    if (o.detune) s = (s + oscValue(o.osc, phaseB)) * 0.5;
    // Envelope: linear attack, exp decay to sustain, exp release.
    let env: number;
    if (i < attackN) {
      env = i / attackN;
    } else if (i < holdN) {
      const dt = (i - attackN) / SAMPLE_RATE;
      env = o.sustain + (1 - o.sustain) * Math.exp(-o.decayRate * dt);
    } else {
      const dt = (i - holdN) / SAMPLE_RATE;
      const startEnv = o.sustain + (1 - o.sustain) * Math.exp(-o.decayRate * hold);
      env = startEnv * Math.exp(-6 * (dt / rel));
    }
    out[i] = s * env * vel * 0.5;
  }
  return out;
}

// Karplus-Strong plucked string with an overall exp-decay guarantee.
function pluckVoice(freq: number, durSec: number, vel: number, rng: () => number, bright: number): Float32Array {
  const hold = Math.max(0.05, Math.min(durSec + 0.5, 3.5));
  const n = Math.floor(hold * SAMPLE_RATE);
  const out = new Float32Array(n);
  const period = Math.max(2, Math.round(SAMPLE_RATE / Math.max(20, Math.min(5000, freq))));
  const ring = new Float32Array(period);
  for (let i = 0; i < period; i++) ring[i] = rng() * 2;
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const cur = ring[idx];
    const nxt = ring[(idx + 1) % period];
    ring[idx] = bright * 0.5 * (cur + nxt);
    idx = (idx + 1) % period;
    const t = i / SAMPLE_RATE;
    out[i] = cur * Math.exp(-1.6 * t) * vel * 0.6;
  }
  return out;
}

// Noise burst with exp decay; highpass flag takes first-difference
// for hihat/crash brightness.
function noiseVoice(durSec: number, vel: number, rng: () => number, decayRate: number, highpass: boolean): Float32Array {
  const n = Math.max(1, Math.floor(Math.min(durSec, 2) * SAMPLE_RATE));
  const out = new Float32Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let s = rng() * 2;
    if (highpass) {
      const y = s - prev;
      prev = s;
      s = y;
    }
    out[i] = s * Math.exp(-decayRate * t) * vel * 0.5;
  }
  return out;
}

function mixInto(master: Float32Array, voice: Float32Array, start: number): void {
  for (let i = 0; i < voice.length; i++) {
    const j = start + i;
    if (j < 0 || j >= master.length) break;
    master[j] += voice[i];
  }
}

function renderVoice(
  id: InstrumentId,
  freq: number,
  durSec: number,
  vel: number,
  rng: () => number,
  glideFrom: number,
): Float32Array {
  const dur = Math.max(0.03, Math.min(durSec, 8));
  switch (id) {
    case "piano":
      return toneVoice(freq, dur, vel, { osc: "tri", osc2: "sine", mix2: 0.4, attack: 0.004, decayRate: 2.6, sustain: 0.08, release: 0.35 });
    case "guitar":
      return pluckVoice(freq, dur, vel, rng, 0.996);
    case "bass":
      return toneVoice(freq / 2, dur, vel, { osc: "sine", osc2: "square", mix2: 0.25, attack: 0.006, decayRate: 3.2, sustain: 0.25, release: 0.2 });
    case "harp": {
      const pluck = pluckVoice(freq, dur, vel, rng, 0.998);
      const shimmer = toneVoice(freq * 2, Math.min(dur, 1.2), vel * 0.25, { osc: "sine", attack: 0.004, decayRate: 4, sustain: 0.02, release: 0.3 });
      const out = new Float32Array(Math.max(pluck.length, shimmer.length));
      mixInto(out, pluck, 0);
      mixInto(out, shimmer, 0);
      return out;
    }
    case "marimba":
      return toneVoice(freq, dur, vel, { osc: "sine", osc2: "sine", mix2: 0.3, attack: 0.003, decayRate: 7, sustain: 0.02, release: 0.15 });
    case "music-box":
      return toneVoice(freq * 2, dur + 0.4, vel, { osc: "sine", osc2: "sine", mix2: 0.2, attack: 0.002, decayRate: 1.8, sustain: 0.05, release: 0.6 });
    case "flute":
      return toneVoice(freq, dur, vel, { osc: "sine", attack: 0.05, decayRate: 0.6, sustain: 0.85, release: 0.12, vibratoRate: 5, vibratoDepth: 0.006 });
    case "trumpet":
      return toneVoice(freq, dur, vel, { osc: "saw", attack: 0.03, decayRate: 0.8, sustain: 0.7, release: 0.12 });
    case "sax":
      return toneVoice(freq, dur, vel, { osc: "saw", osc2: "square", mix2: 0.3, attack: 0.04, decayRate: 0.9, sustain: 0.65, release: 0.14, vibratoRate: 5.5, vibratoDepth: 0.008 });
    case "violin":
      return toneVoice(freq, dur, vel, { osc: "saw", attack: 0.12, decayRate: 0.5, sustain: 0.8, release: 0.2, vibratoRate: 6, vibratoDepth: 0.007 });
    case "organ":
      return toneVoice(freq, dur, vel, { osc: "sine", osc2: "sine", mix2: 0.45, attack: 0.01, decayRate: 0.2, sustain: 0.9, release: 0.08 });
    case "theremin":
      return toneVoice(freq, dur, vel, { osc: "sine", attack: 0.06, decayRate: 0.4, sustain: 0.85, release: 0.2, vibratoRate: 5.5, vibratoDepth: 0.004, glideFrom });
    case "synth-lead":
      return toneVoice(freq, dur, vel, { osc: "saw", detune: 1.004, attack: 0.008, decayRate: 0.9, sustain: 0.75, release: 0.15 });
    case "synth-pad":
      return toneVoice(freq, dur + 0.4, vel * 0.9, { osc: "sine", detune: 1.002, attack: 0.3, decayRate: 0.4, sustain: 0.8, release: 0.5 });
    case "chiptune":
      return toneVoice(freq, Math.min(dur, 1.5), vel, { osc: "square", attack: 0.003, decayRate: 3.5, sustain: 0.4, release: 0.06 });
    case "kick": {
      const body = toneVoice(Math.max(40, freq / 4), 0.32, vel, { osc: "sine", attack: 0.001, decayRate: 9, sustain: 0.02, release: 0.08, dropTo: 0.32, dropTime: 0.09 });
      const click = noiseVoice(0.02, vel * 0.5, rng, 120, false);
      const out = new Float32Array(body.length);
      mixInto(out, body, 0);
      mixInto(out, click, 0);
      return out;
    }
    case "snare": {
      const noise = noiseVoice(0.22, vel, rng, 22, false);
      const body = toneVoice(190, 0.14, vel * 0.7, { osc: "tri", attack: 0.001, decayRate: 26, sustain: 0.05, release: 0.05 });
      const out = new Float32Array(noise.length);
      mixInto(out, noise, 0);
      mixInto(out, body, 0);
      return out;
    }
    case "hihat":
      return noiseVoice(Math.min(dur, 0.3), vel * 0.8, rng, 60, true);
    case "tom":
      return toneVoice(Math.max(60, Math.min(400, freq / 2)), 0.4, vel, { osc: "sine", attack: 0.002, decayRate: 8, sustain: 0.05, release: 0.12, dropTo: 0.5, dropTime: 0.15 });
    case "crash":
      return noiseVoice(1.4, vel * 0.9, rng, 3.2, true);
  }
}

export interface RenderedAudio {
  samples: Float32Array;
  sampleRate: number;
  seconds: number;
}

export function renderInstrument(id: InstrumentId, notes: RenderNote[], bpm: number): RenderedAudio {
  const spb = 60 / bpm;
  let endBeats = 0;
  for (const n of notes) endBeats = Math.max(endBeats, n.t + n.d);
  const seconds = Math.min(endBeats * spb + TAIL_SECONDS, MAX_SECONDS);
  const total = Math.max(1, Math.floor(seconds * SAMPLE_RATE));
  const master = new Float32Array(total);
  const sorted = [...notes].sort((a, b) => a.t - b.t);
  let prevFreq = 0;
  sorted.forEach((n, i) => {
    const freq = midiToFreq(n.midi);
    const vel = n.v ?? 0.8;
    const start = Math.floor(n.t * spb * SAMPLE_RATE);
    if (start >= total) return;
    const voice = renderVoice(id, freq, n.d * spb, vel, makeRng(0x9e37 + i * 101 + n.midi * 7), prevFreq);
    mixInto(master, voice, start);
    prevFreq = freq;
  });
  // Normalize + soft-clip so stacked voices never hard-clip.
  let peak = 0;
  for (let i = 0; i < master.length; i++) {
    const a = Math.abs(master[i]);
    if (a > peak) peak = a;
  }
  const gain = peak > 0 ? Math.min(1, 0.89 / peak) : 1;
  for (let i = 0; i < master.length; i++) {
    const x = master[i] * gain;
    master[i] = x / (1 + Math.abs(x) * 0.15);
  }
  return { samples: master, sampleRate: SAMPLE_RATE, seconds };
}

// 16-bit PCM mono WAV encoder.
export function encodeWav(samples: Float32Array, sampleRate: number): Buffer {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buf;
}
