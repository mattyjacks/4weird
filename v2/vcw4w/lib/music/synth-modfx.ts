/**
 * lib/music/synth-modfx.ts - WebAudio ModFX renderer (DS-MUSDUB-02).
 *
 * Renders modulation + FX automation over a tiny structural song shape:
 * vibrato (osc detune LFO), wobble bass (filter-cutoff LFO with rate+depth),
 * filter cutoff sweeps, volume LFO, static detune, per-note pitch envelopes,
 * riser automation, and a halftime drop feel.
 *
 * Structural song type is LOCAL (duck-typed bridge for the DS-MUSDUB-01
 * ModLane4W/PartFx4W shape). ZERO imports from ./format-4w, ./synth-4w,
 * ../music-format, ../music-synth. Never edit those files.
 *
 * Engine: lazy AudioContext (first user gesture), lookahead scheduler
 * (25 ms timer, 120 ms horizon), fixed-size preallocated voice pool so the
 * scheduler tick performs zero allocation. SSR-safe: no browser APIs at
 * module top; every export is a no-op that never throws without audio.
 *
 * ASCII-only. No DOM, no Node APIs outside the lazy AudioContext path.
 */

// ---------------------------------------------------------------------------
// Local structural types (duck-typed ModLane4W / PartFx4W bridge)
// ---------------------------------------------------------------------------

/** Automation target for a modulation lane. */
export type ModTarget4W = "cutoff" | "wobble" | "vibrato" | "detune" | "vol";

/** One automation point: [step, value], both integers. */
export type ModPoint4W = [number, number];

/** Per-track automation lane: a target plus integer [step, value] points. */
export interface ModLane4W {
  target: ModTarget4W;
  points: ModPoint4W[];
  /** Track index the lane applies to (default 0). */
  track?: number;
}

/** Wobble bass FX: filter-cutoff LFO rate (Hz) + depth (Hz). */
export interface ModWobble4W {
  rate: number;
  depth: number;
}

/** Growl FX: waveshaper-ish grit amount 0..1 (rendered as extra detune). */
export interface ModGrowl4W {
  amount: number;
}

/** Riser FX: build length in bars. */
export interface ModRiser4W {
  bars: number;
}

/** Drop FX: halftime feel when true. */
export interface ModDrop4W {
  halftime: boolean;
}

/** Pitch envelope FX: semitone offset from start to end over `time` beats. */
export interface ModPitchEnv4W {
  start: number;
  end: number;
  time: number;
}

/** Dubstep event block on a part. All fields optional (duck-typed). */
export interface PartFx4W {
  /** Beat where this FX block starts (default 0). */
  atBeat?: number;
  /** Length in steps (default 16). */
  steps?: number;
  wobble?: ModWobble4W;
  growl?: ModGrowl4W;
  riser?: ModRiser4W;
  drop?: ModDrop4W;
  pitchEnv?: ModPitchEnv4W;
}

/** Local structural note (mirrors the 4W-1 Note4W shape, no import). */
export interface ModNote4W {
  t: number;
  n: number;
  d: number;
  v?: number;
}

/** Local structural track. */
export interface ModTrack4W {
  wave: "square" | "saw" | "tri" | "sine" | "noise";
  vol?: number;
  notes: ModNote4W[];
}

/** Local structural song with optional modulation + FX. */
export interface ModSong4W {
  title?: string;
  bpm: number;
  tracks: ModTrack4W[];
  lanes?: ModLane4W[];
  fx?: PartFx4W[];
}

/** Options for playModSong. All fields optional. */
export interface ModPlayOptions {
  startBeat?: number;
  loop?: boolean;
  lookahead?: number;
  /** Master output level 0..1 (default 0.8). */
  volume?: number;
}

/** Snapshot of ModFX engine state. Never throws. */
export interface ModFxState {
  playing: boolean;
  hasContext: boolean;
  muted: boolean;
  voices: number;
  scheduled: number;
}

/** Result of the pure headless schedule preview. Never throws. */
export interface ModSchedulePreview {
  ok: boolean;
  events: number;
  mods: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Constants + module state (no browser APIs here - SSR-safe)
// ---------------------------------------------------------------------------

const MOD_SCHED_TIMER_MS = 25;
const MOD_DEFAULT_LOOKAHEAD_SEC = 0.12;
const MOD_START_DELAY_SEC = 0.06;
const MOD_MIN_GAIN = 0.0001;
const MOD_MAX_VOICES = 16;
const MOD_MAX_EVENTS = 2048;
const MOD_STEPS_PER_BEAT = 4;

interface ModVoice {
  inUse: boolean;
  osc: AudioScheduledSourceNode | null;
  gain: GainNode | null;
  filter: BiquadFilterNode | null;
  lfo: OscillatorNode | null;
  lfoGain: GainNode | null;
  stopAt: number;
}

interface ModEvent {
  beat: number;
  trackIndex: number;
  wave: string;
  vol: number;
  midi: number;
  lenBeats: number;
  vel: number;
}

let modCtx: AudioContext | null = null;
let modMaster: GainNode | null = null;
let modNoiseBuf: AudioBuffer | null = null;
let modTimer: ReturnType<typeof setInterval> | null = null;
const modVoices: ModVoice[] = [];
const modEvents: ModEvent[] = [];
let modEventCount = 0;
let modEventIndex = 0;
let modSongEndBeat = 0;
let modStartCtxTime = 0;
let modStartBeatOffset = 0;
let modPlaying = false;
let modLoop = false;
let modLookahead = MOD_DEFAULT_LOOKAHEAD_SEC;
let modMuted = false;
let modVolume = 0.8;
let modScheduled = 0;
let modHalftimeFromBeat = -1;

// ---------------------------------------------------------------------------
// Small pure helpers (no audio)
// ---------------------------------------------------------------------------

function modClamp(value: number, lo: number, hi: number): number {
  if (!Number.isFinite(value)) return lo;
  if (value < lo) return lo;
  if (value > hi) return hi;
  return value;
}

function modMidiToFreq(midi: number): number {
  const m = modClamp(midi, 0, 127);
  return 440 * Math.pow(2, (m - 69) / 12);
}

function modBeatsToSec(beats: number, bpm: number): number {
  const safeBpm = bpm > 0 && Number.isFinite(bpm) ? bpm : 120;
  return (beats * 60) / safeBpm;
}

function modOscType(wave: string): OscillatorType {
  if (wave === "saw") return "sawtooth";
  if (wave === "tri") return "triangle";
  if (wave === "sine") return "sine";
  return "square";
}

function isModTarget(t: unknown): t is ModTarget4W {
  return (
    t === "cutoff" ||
    t === "wobble" ||
    t === "vibrato" ||
    t === "detune" ||
    t === "vol"
  );
}

function lanePointsOf(lane: ModLane4W): ModPoint4W[] {
  if (!lane || !Array.isArray(lane.points)) return [];
  const out: ModPoint4W[] = [];
  for (let i = 0; i < lane.points.length; i++) {
    const p = lane.points[i];
    if (!Array.isArray(p) || p.length < 2) continue;
    const step = p[0];
    const value = p[1];
    if (!Number.isInteger(step) || !Number.isInteger(value)) continue;
    if (step < 0 || step > 4096) continue;
    out.push([step, value]);
  }
  out.sort((a, b) => a[0] - b[0]);
  return out;
}

function lanesForTrack(
  lanes: ModLane4W[] | undefined,
  target: ModTarget4W,
  trackIndex: number,
): ModPoint4W[] {
  if (!Array.isArray(lanes)) return [];
  for (let i = 0; i < lanes.length; i++) {
    const lane = lanes[i];
    if (!lane || !isModTarget(lane.target) || lane.target !== target) continue;
    const laneTrack = lane.track === undefined ? 0 : lane.track;
    if (laneTrack !== trackIndex) continue;
    return lanePointsOf(lane);
  }
  return [];
}

function fxAtBeat(fx: PartFx4W | undefined): number {
  if (!fx || typeof fx.atBeat !== "number" || !Number.isFinite(fx.atBeat)) {
    return 0;
  }
  return Math.max(0, fx.atBeat);
}

/** Pure headless schedule preview: counts note events + applied mods. */
export function previewModSchedule(song: ModSong4W): ModSchedulePreview {
  try {
    const errors: string[] = [];
    if (!song || typeof song !== "object") {
      return { ok: false, events: 0, mods: 0, errors: ["not-a-song"] };
    }
    if (!Array.isArray(song.tracks)) {
      return { ok: false, events: 0, mods: 0, errors: ["no-tracks"] };
    }
    let events = 0;
    for (let ti = 0; ti < song.tracks.length; ti++) {
      const track = song.tracks[ti];
      if (!track || !Array.isArray(track.notes)) {
        errors.push("bad-track-" + ti);
        continue;
      }
      for (let ni = 0; ni < track.notes.length; ni++) {
        const note = track.notes[ni];
        if (!note || typeof note.t !== "number" || typeof note.n !== "number") {
          errors.push("bad-note-" + ti + "-" + ni);
          continue;
        }
        events++;
      }
    }
    let mods = 0;
    if (Array.isArray(song.lanes)) {
      for (let li = 0; li < song.lanes.length; li++) {
        const lane = song.lanes[li];
        if (!lane || !isModTarget(lane.target)) {
          errors.push("bad-lane-" + li);
          continue;
        }
        mods += lanePointsOf(lane).length;
      }
    }
    if (Array.isArray(song.fx)) {
      for (let fi = 0; fi < song.fx.length; fi++) {
        const fx = song.fx[fi];
        if (!fx || typeof fx !== "object") {
          errors.push("bad-fx-" + fi);
          continue;
        }
        if (fx.wobble) mods++;
        if (fx.riser) mods++;
        if (fx.pitchEnv) mods++;
        if (fx.drop) mods++;
        if (fx.growl) mods++;
      }
    }
    return { ok: errors.length === 0, events, mods, errors };
  } catch {
    return { ok: false, events: 0, mods: 0, errors: ["threw"] };
  }
}

function rebuildModEvents(song: ModSong4W, startBeat: number): void {
  modEventCount = 0;
  modEventIndex = 0;
  modSongEndBeat = 0;
  modHalftimeFromBeat = -1;
  if (!song || !Array.isArray(song.tracks)) return;
  if (Array.isArray(song.fx)) {
    for (let fi = 0; fi < song.fx.length; fi++) {
      const fx = song.fx[fi];
      if (fx && fx.drop && fx.drop.halftime === true) {
        const at = fxAtBeat(fx);
        if (modHalftimeFromBeat < 0 || at < modHalftimeFromBeat) {
          modHalftimeFromBeat = at;
        }
      }
    }
  }
  for (let ti = 0; ti < song.tracks.length; ti++) {
    const track = song.tracks[ti];
    if (!track || !Array.isArray(track.notes)) continue;
    const vol = track.vol === undefined ? 0.8 : modClamp(track.vol, 0, 1);
    for (let ni = 0; ni < track.notes.length; ni++) {
      const note = track.notes[ni];
      if (!note || typeof note.t !== "number" || typeof note.n !== "number") {
        continue;
      }
      if (typeof note.d !== "number") continue;
      if (note.t + note.d < startBeat) continue;
      if (modEventCount >= MOD_MAX_EVENTS) return;
      let slot = modEvents[modEventCount];
      if (!slot) {
        slot = {
          beat: 0,
          trackIndex: 0,
          wave: "square",
          vol: 0.8,
          midi: 60,
          lenBeats: 1,
          vel: 0.8,
        };
        modEvents[modEventCount] = slot;
      }
      slot.beat = note.t;
      slot.trackIndex = ti;
      slot.wave = typeof track.wave === "string" ? track.wave : "square";
      slot.vol = vol;
      slot.midi = modClamp(Math.round(note.n), 0, 127);
      slot.lenBeats = Math.max(0.05, note.d);
      slot.vel =
        note.v === undefined ? 0.8 : modClamp(note.v, 0, 1);
      const stop = note.t + note.d;
      if (stop > modSongEndBeat) modSongEndBeat = stop;
      modEventCount++;
    }
  }
  // Insertion sort over the filled prefix (no allocation).
  for (let i = 1; i < modEventCount; i++) {
    const key = modEvents[i];
    if (!key) continue;
    const keyBeat = key.beat;
    const keyTrack = key.trackIndex;
    let j = i - 1;
    while (j >= 0) {
      const cur = modEvents[j];
      if (!cur) break;
      if (cur.beat > keyBeat || (cur.beat === keyBeat && cur.trackIndex > keyTrack)) {
        modEvents[j + 1] = cur;
        j--;
      } else {
        break;
      }
    }
    modEvents[j + 1] = key;
  }
}

/** Beat-to-context-time with halftime drop feel after the drop beat. */
function modBeatToCtxTime(
  song: ModSong4W,
  beat: number,
  baseBeat: number,
  baseTime: number,
): number {
  const bpm = song && Number.isFinite(song.bpm) && song.bpm > 0 ? song.bpm : 120;
  if (modHalftimeFromBeat >= 0 && beat >= modHalftimeFromBeat) {
    const preBeats = Math.max(0, modHalftimeFromBeat - baseBeat);
    const postBeats = Math.max(0, beat - Math.max(baseBeat, modHalftimeFromBeat));
    return baseTime + modBeatsToSec(preBeats, bpm) + modBeatsToSec(postBeats * 2, bpm);
  }
  return baseTime + modBeatsToSec(Math.max(0, beat - baseBeat), bpm);
}

// ---------------------------------------------------------------------------
// Lazy AudioContext + preallocated voice pool. Never throws.
// ---------------------------------------------------------------------------

function modCreateContext(): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;
    const w = window as unknown as Record<string, unknown>;
    const Ctor = (w.AudioContext ??
      w.webkitAudioContext) as unknown as
      | (new () => AudioContext)
      | undefined;
    if (typeof Ctor !== "function") return null;
    return new Ctor();
  } catch {
    return null;
  }
}

function modBuildPool(c: AudioContext): void {
  try {
    modMaster = c.createGain();
    modMaster.gain.value = modMuted ? 0 : modClamp(modVolume, 0, 1);
    modMaster.connect(c.destination);
  } catch {
    modMaster = null;
  }
  try {
    const len = Math.max(1, Math.floor(c.sampleRate / 4));
    modNoiseBuf = c.createBuffer(1, len, c.sampleRate);
    const data = modNoiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (i % 2 === 0 ? 1 : -1) * (0.25 + 0.75 * (i / data.length));
    }
  } catch {
    modNoiseBuf = null;
  }
  modVoices.length = 0;
  for (let i = 0; i < MOD_MAX_VOICES; i++) {
    modVoices.push({
      inUse: false,
      osc: null,
      gain: null,
      filter: null,
      lfo: null,
      lfoGain: null,
      stopAt: 0,
    });
  }
}

/**
 * Ensure the lazy AudioContext exists (call from a user gesture).
 * Returns the context or null when unavailable. Never throws.
 */
export function ensureModAudio(): AudioContext | null {
  try {
    if (modCtx) {
      try {
        if (modCtx.state === "suspended") void modCtx.resume();
      } catch {
        // ignore resume failures
      }
      return modCtx;
    }
    const created = modCreateContext();
    if (!created) return null;
    modCtx = created;
    modBuildPool(created);
    try {
      if (modCtx.state === "suspended") void modCtx.resume();
    } catch {
      // ignore resume failures
    }
    return modCtx;
  } catch {
    return null;
  }
}

function modFreeVoice(slot: ModVoice): void {
  try {
    if (slot.lfo) {
      try {
        slot.lfo.stop();
      } catch {
        // already stopped
      }
      try {
        slot.lfo.disconnect();
      } catch {
        // already disconnected
      }
      slot.lfo = null;
    }
    if (slot.lfoGain) {
      try {
        slot.lfoGain.disconnect();
      } catch {
        // already disconnected
      }
      slot.lfoGain = null;
    }
    if (slot.osc) {
      try {
        slot.osc.stop();
      } catch {
        // already stopped
      }
      try {
        slot.osc.disconnect();
      } catch {
        // already disconnected
      }
      slot.osc = null;
    }
    if (slot.gain) {
      try {
        slot.gain.disconnect();
      } catch {
        // already disconnected
      }
      slot.gain = null;
    }
    if (slot.filter) {
      try {
        slot.filter.disconnect();
      } catch {
        // already disconnected
      }
      slot.filter = null;
    }
  } catch {
    // never throw from cleanup
  }
  slot.inUse = false;
  slot.stopAt = 0;
}

function modAllocVoice(): ModVoice | null {
  for (let i = 0; i < modVoices.length; i++) {
    const slot = modVoices[i];
    if (slot && !slot.inUse) {
      slot.inUse = true;
      return slot;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Note renderer: osc + filter + gain + optional LFOs. Never throws.
// ---------------------------------------------------------------------------

function modScheduleNote(
  c: AudioContext,
  song: ModSong4W,
  ev: ModEvent,
  atTime: number,
  durSec: number,
): void {
  try {
    const slot = modAllocVoice();
    if (!slot || !modMaster) {
      if (slot) slot.inUse = false;
      return;
    }
    const trackIndex = ev.trackIndex;
    const freq = modMidiToFreq(ev.midi);
    const peak = MOD_MIN_GAIN + ev.vol * ev.vel * 0.5;

    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.8;

    // Base cutoff: cutoff lane value at this beat, or wide open.
    let cutoff = 8000;
    const cutoffPts = lanesForTrack(song.lanes, "cutoff", trackIndex);
    if (cutoffPts.length > 0) {
      const stepNow = Math.floor(ev.beat * MOD_STEPS_PER_BEAT);
      let v = cutoffPts[0] ? cutoffPts[0][1] : 64;
      for (let i = 0; i < cutoffPts.length; i++) {
        const pt = cutoffPts[i];
        if (pt && pt[0] <= stepNow) v = pt[1];
        else break;
      }
      cutoff = 200 + modClamp(v, 0, 127) * 60;
    }
    filter.frequency.setValueAtTime(modClamp(cutoff, 40, 20000), atTime);
    // Filter sweep: ramp toward the next lane point across the note.
    if (cutoffPts.length > 1) {
      const stepEnd = Math.floor((ev.beat + ev.lenBeats) * MOD_STEPS_PER_BEAT);
      let vEnd = cutoffPts[cutoffPts.length - 1] ? cutoffPts[cutoffPts.length - 1][1] : 64;
      for (let i = 0; i < cutoffPts.length; i++) {
        const pt = cutoffPts[i];
        if (pt && pt[0] <= stepEnd) vEnd = pt[1];
        else break;
      }
      const cutoffEnd = 200 + modClamp(vEnd, 0, 127) * 60;
      try {
        filter.frequency.linearRampToValueAtTime(
          modClamp(cutoffEnd, 40, 20000),
          atTime + Math.max(0.01, durSec),
        );
      } catch {
        // keep the initial cutoff when ramps are unsupported
      }
    }

    const gain = c.createGain();
    gain.gain.setValueAtTime(MOD_MIN_GAIN, atTime);
    gain.gain.linearRampToValueAtTime(Math.max(MOD_MIN_GAIN, peak), atTime + 0.01);

    // Volume LFO lane: depth 0..127 maps to tremolo amount.
    const volPts = lanesForTrack(song.lanes, "vol", trackIndex);
    let tremoloDepth = 0;
    if (volPts.length > 0) {
      const stepNow = Math.floor(ev.beat * MOD_STEPS_PER_BEAT);
      let v = volPts[0] ? volPts[0][1] : 0;
      for (let i = 0; i < volPts.length; i++) {
        const pt = volPts[i];
        if (pt && pt[0] <= stepNow) v = pt[1];
        else break;
      }
      tremoloDepth = modClamp(v, 0, 127) / 127;
    }

    let osc: AudioScheduledSourceNode;
    if (ev.wave === "noise" && modNoiseBuf) {
      const src = c.createBufferSource();
      src.buffer = modNoiseBuf;
      src.loop = true;
      osc = src;
    } else {
      const o = c.createOscillator();
      o.type = modOscType(ev.wave);
      o.frequency.setValueAtTime(freq, atTime);
      // Pitch envelope FX: ramp semitones start->end over its time.
      if (Array.isArray(song.fx)) {
        for (let fi = 0; fi < song.fx.length; fi++) {
          const fx = song.fx[fi];
          if (!fx || !fx.pitchEnv) continue;
          if (ev.beat < fxAtBeat(fx)) continue;
          const env = fx.pitchEnv;
          const startF = freq * Math.pow(2, modClamp(env.start, -24, 24) / 12);
          const endF = freq * Math.pow(2, modClamp(env.end, -24, 24) / 12);
          try {
            o.frequency.setValueAtTime(Math.max(20, startF), atTime);
            o.frequency.exponentialRampToValueAtTime(
              Math.max(20, endF),
              atTime + Math.max(0.01, modClamp(env.time, 0.05, 16)),
            );
          } catch {
            // keep the base frequency
          }
          break;
        }
      }
      // Growl FX: extra detune grit.
      if (Array.isArray(song.fx)) {
        for (let fi = 0; fi < song.fx.length; fi++) {
          const fx = song.fx[fi];
          if (!fx || !fx.growl) continue;
          if (ev.beat < fxAtBeat(fx)) continue;
          try {
            o.detune.setValueAtTime(modClamp(fx.growl.amount, 0, 1) * 35, atTime);
          } catch {
            // detune unsupported
          }
          break;
        }
      }
      // Static detune lane: value 0..127 maps to -50..+50 cents.
      const detunePts = lanesForTrack(song.lanes, "detune", trackIndex);
      if (detunePts.length > 0) {
        const stepNow = Math.floor(ev.beat * MOD_STEPS_PER_BEAT);
        let v = detunePts[0] ? detunePts[0][1] : 64;
        for (let i = 0; i < detunePts.length; i++) {
          const pt = detunePts[i];
          if (pt && pt[0] <= stepNow) v = pt[1];
          else break;
        }
        try {
          o.detune.setValueAtTime((modClamp(v, 0, 127) - 64) * (50 / 64), atTime);
        } catch {
          // detune unsupported
        }
      }
      osc = o;
    }

    // Vibrato lane: detune LFO depth in cents (0..127 -> 0..60 cents).
    const vibPts = lanesForTrack(song.lanes, "vibrato", trackIndex);
    let vibDepth = 0;
    if (vibPts.length > 0) {
      const stepNow = Math.floor(ev.beat * MOD_STEPS_PER_BEAT);
      let v = vibPts[0] ? vibPts[0][1] : 0;
      for (let i = 0; i < vibPts.length; i++) {
        const pt = vibPts[i];
        if (pt && pt[0] <= stepNow) v = pt[1];
        else break;
      }
      vibDepth = (modClamp(v, 0, 127) / 127) * 60;
    }

    // Wobble: filter-cutoff LFO. Lane target "wobble" gates it (value>0 =
    // on); PartFx wobble{rate,depth} supplies rate+depth. Lane point value
    // scales depth when present.
    let wobRate = 0;
    let wobDepth = 0;
    const wobPts = lanesForTrack(song.lanes, "wobble", trackIndex);
    let wobGate = wobPts.length === 0;
    let wobScale = 1;
    if (wobPts.length > 0) {
      const stepNow = Math.floor(ev.beat * MOD_STEPS_PER_BEAT);
      let v = wobPts[0] ? wobPts[0][1] : 0;
      for (let i = 0; i < wobPts.length; i++) {
        const pt = wobPts[i];
        if (pt && pt[0] <= stepNow) v = pt[1];
        else break;
      }
      wobGate = v > 0;
      wobScale = modClamp(v, 0, 127) / 127;
    }
    if (wobGate && Array.isArray(song.fx)) {
      for (let fi = 0; fi < song.fx.length; fi++) {
        const fx = song.fx[fi];
        if (!fx || !fx.wobble) continue;
        if (ev.beat < fxAtBeat(fx)) continue;
        wobRate = modClamp(fx.wobble.rate, 0.1, 30);
        wobDepth = modClamp(fx.wobble.depth, 0, 6000) * (wobPts.length === 0 ? 1 : wobScale);
        break;
      }
    }

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(modMaster);

    let lfo: OscillatorNode | null = null;
    let lfoGain: GainNode | null = null;

    // One shared LFO node per voice drives vibrato and/or wobble and/or
    // tremolo by fanning out through gain nodes (preallocated per voice,
    // created here once per note and freed on end - none per tick).
    if ((vibDepth > 0 || wobDepth > 0 || tremoloDepth > 0) && osc instanceof OscillatorNode) {
      try {
        lfo = c.createOscillator();
        lfo.type = "sine";
        lfo.frequency.setValueAtTime(wobRate > 0 ? wobRate : 5.5, atTime);
        lfoGain = c.createGain();
        lfoGain.gain.setValueAtTime(0, atTime);
        lfo.connect(lfoGain);
        if (vibDepth > 0) {
          try {
            const vibGain = c.createGain();
            vibGain.gain.setValueAtTime(vibDepth, atTime);
            lfo.connect(vibGain);
            vibGain.connect(osc.detune);
          } catch {
            // vibrato routing unsupported
          }
        }
        if (wobDepth > 0) {
          try {
            const wobGain = c.createGain();
            wobGain.gain.setValueAtTime(wobDepth, atTime);
            lfo.connect(wobGain);
            wobGain.connect(filter.frequency);
          } catch {
            // wobble routing unsupported
          }
        }
        if (tremoloDepth > 0) {
          try {
            const tremGain = c.createGain();
            tremGain.gain.setValueAtTime(peak * tremoloDepth * 0.5, atTime);
            lfo.connect(tremGain);
            tremGain.connect(gain.gain);
          } catch {
            // tremolo routing unsupported
          }
        }
        lfo.start(atTime);
      } catch {
        lfo = null;
        lfoGain = null;
      }
    }

    const stopAt = atTime + Math.max(0.03, durSec);
    try {
      gain.gain.setValueAtTime(Math.max(MOD_MIN_GAIN, peak), Math.max(atTime, stopAt - 0.03));
      gain.gain.linearRampToValueAtTime(MOD_MIN_GAIN, stopAt);
    } catch {
      // keep the attack envelope when release ramps fail
    }
    try {
      osc.start(atTime);
      osc.stop(stopAt + 0.05);
    } catch {
      modFreeVoice(slot);
      return;
    }
    if (lfo) {
      try {
        lfo.stop(stopAt + 0.05);
      } catch {
        // already stopped
      }
    }
    slot.osc = osc;
    slot.gain = gain;
    slot.filter = filter;
    slot.lfo = lfo;
    slot.lfoGain = lfoGain;
    slot.stopAt = stopAt;
    modScheduled++;
  } catch {
    // a single bad note never kills the scheduler
  }
}

function modScheduleRiser(
  c: AudioContext,
  song: ModSong4W,
  fx: PartFx4W,
  baseBeat: number,
  baseTime: number,
): void {
  try {
    if (!fx || !fx.riser || !modMaster) return;
    const slot = modAllocVoice();
    if (!slot) return;
    const bars = modClamp(Math.round(fx.riser.bars), 1, 8);
    const atBeat = fxAtBeat(fx);
    const atTime = modBeatToCtxTime(song, atBeat, baseBeat, baseTime);
    const now = c.currentTime;
    const startAt = Math.max(now + 0.01, atTime);
    const durSec = bars * 4 * (60 / (song && song.bpm > 0 ? song.bpm : 120));
    if (durSec <= 0 || !Number.isFinite(durSec)) {
      slot.inUse = false;
      return;
    }
    const osc = c.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(110, startAt);
    try {
      osc.frequency.exponentialRampToValueAtTime(880, startAt + durSec);
    } catch {
      // keep the base riser pitch
    }
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, startAt);
    try {
      filter.frequency.exponentialRampToValueAtTime(8000, startAt + durSec);
    } catch {
      // keep the base riser cutoff
    }
    const gain = c.createGain();
    gain.gain.setValueAtTime(MOD_MIN_GAIN, startAt);
    try {
      gain.gain.linearRampToValueAtTime(0.25, startAt + durSec);
    } catch {
      // keep the riser swell start
    }
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(modMaster);
    const stopAt = startAt + durSec;
    try {
      osc.start(startAt);
      osc.stop(stopAt + 0.05);
    } catch {
      modFreeVoice(slot);
      return;
    }
    slot.osc = osc;
    slot.gain = gain;
    slot.filter = filter;
    slot.lfo = null;
    slot.lfoGain = null;
    slot.stopAt = stopAt;
    modScheduled++;
  } catch {
    // risers are decorative; never break playback
  }
}

// ---------------------------------------------------------------------------
// Lookahead scheduler tick (zero allocation: fixed pool + index walk)
// ---------------------------------------------------------------------------

let modSongRef: ModSong4W | null = null;

function modTick(): void {
  try {
    const c = modCtx;
    const song = modSongRef;
    if (!c || !song || !modPlaying) return;
    const horizon = c.currentTime + modLookahead;
    let guard = 0;
    while (modEventIndex < modEventCount && guard < 64) {
      guard++;
      const ev = modEvents[modEventIndex];
      if (!ev) {
        modEventIndex++;
        continue;
      }
      const atTime = modBeatToCtxTime(song, ev.beat, modStartBeatOffset, modStartCtxTime);
      if (atTime > horizon) break;
      if (atTime >= c.currentTime - 0.05) {
        const bpm = song.bpm > 0 ? song.bpm : 120;
        let durSec = modBeatsToSec(ev.lenBeats, bpm);
        if (modHalftimeFromBeat >= 0 && ev.beat >= modHalftimeFromBeat) {
          durSec *= 2;
        }
        modScheduleNote(c, song, ev, Math.max(c.currentTime + 0.01, atTime), durSec);
      }
      modEventIndex++;
    }
    // Free finished voices (index walk over the fixed pool).
    const now = c.currentTime;
    for (let i = 0; i < modVoices.length; i++) {
      const slot = modVoices[i];
      if (slot && slot.inUse && slot.stopAt > 0 && slot.stopAt + 0.1 < now) {
        modFreeVoice(slot);
      }
    }
    const endTime = modBeatToCtxTime(song, modSongEndBeat, modStartBeatOffset, modStartCtxTime);
    if (modEventIndex >= modEventCount && now > endTime + 0.25) {
      if (modLoop && modSongEndBeat > modStartBeatOffset) {
        modStartBeatOffset = modLoop ? modStartBeatOffset : modStartBeatOffset;
        modStartCtxTime = now + MOD_START_DELAY_SEC;
        modEventIndex = 0;
      } else {
        stopModSong();
      }
    }
  } catch {
    // the tick never throws; worst case it skips a slice
  }
}

// ---------------------------------------------------------------------------
// Public transport. Every export never throws (headless no-op safe).
// ---------------------------------------------------------------------------

/**
 * Play a structural modulated song. Returns true when scheduling started
 * (or when running headless-safe without audio). Never throws.
 */
export function playModSong(song: ModSong4W, opts?: ModPlayOptions): boolean {
  try {
    stopModSong();
    const preview = previewModSchedule(song);
    if (!preview.ok && preview.events === 0) return false;
    const startBeat = opts && typeof opts.startBeat === "number" ? Math.max(0, opts.startBeat) : 0;
    modLoop = !!(opts && opts.loop);
    modLookahead =
      opts && typeof opts.lookahead === "number"
        ? modClamp(opts.lookahead, 0.05, 0.5)
        : MOD_DEFAULT_LOOKAHEAD_SEC;
    if (opts && typeof opts.volume === "number") {
      modVolume = modClamp(opts.volume, 0, 1);
    }
    rebuildModEvents(song, startBeat);
    modSongRef = song;
    modScheduled = 0;
    const c = ensureModAudio();
    if (!c) {
      // Headless/SSR: count the schedule without audio and report ok.
      modScheduled = modEventCount;
      return preview.events > 0;
    }
    try {
      if (modMaster) modMaster.gain.value = modMuted ? 0 : modClamp(modVolume, 0, 1);
    } catch {
      // keep previous master level
    }
    modStartBeatOffset = startBeat;
    modStartCtxTime = c.currentTime + MOD_START_DELAY_SEC;
    modEventIndex = 0;
    // Schedule risers up front (decorative one-shots, not on the tick).
    if (Array.isArray(song.fx)) {
      for (let fi = 0; fi < song.fx.length; fi++) {
        const fx = song.fx[fi];
        if (fx && fx.riser && fxAtBeat(fx) >= startBeat) {
          modScheduleRiser(c, song, fx, modStartBeatOffset, modStartCtxTime);
        }
      }
    }
    modPlaying = true;
    if (modTimer) {
      try {
        clearInterval(modTimer);
      } catch {
        // ignore clear failures
      }
      modTimer = null;
    }
    modTimer = setInterval(modTick, MOD_SCHED_TIMER_MS);
    return true;
  } catch {
    return false;
  }
}

/** Stop ModFX playback and free all voices. Never throws. */
export function stopModSong(): boolean {
  try {
    modPlaying = false;
    if (modTimer) {
      try {
        clearInterval(modTimer);
      } catch {
        // ignore clear failures
      }
      modTimer = null;
    }
    for (let i = 0; i < modVoices.length; i++) {
      const slot = modVoices[i];
      if (slot && slot.inUse) modFreeVoice(slot);
    }
    modEventIndex = 0;
    modEventCount = 0;
    modSongRef = null;
    return true;
  } catch {
    return false;
  }
}

/** Snapshot of ModFX engine state. Never throws. */
export function getModState(): ModFxState {
  try {
    let voices = 0;
    for (let i = 0; i < modVoices.length; i++) {
      if (modVoices[i] && modVoices[i].inUse) voices++;
    }
    return {
      playing: modPlaying,
      hasContext: modCtx !== null,
      muted: modMuted,
      voices,
      scheduled: modScheduled,
    };
  } catch {
    return { playing: false, hasContext: false, muted: false, voices: 0, scheduled: 0 };
  }
}

/** Mute/unmute ModFX output. Never throws. */
export function setModMuted(muted: boolean): boolean {
  try {
    modMuted = muted === true;
    if (modCtx && modMaster) {
      try {
        modMaster.gain.value = modMuted ? 0 : modClamp(modVolume, 0, 1);
      } catch {
        // keep previous master level
      }
    }
    return true;
  } catch {
    return false;
  }
}
