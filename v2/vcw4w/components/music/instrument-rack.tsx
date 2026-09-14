"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* DS-MUSIC-06 (owner mus-06): human instrument-rack UI for all 20 instruments.
 * Contract ids (lead-fixed): melodic piano,guitar,bass,harp,marimba,music-box |
 * wind flute,trumpet,sax,violin,organ | electronic theremin,synth-lead,synth-pad,chiptune |
 * drums kick,snare,hihat,tom,crash.
 * Engine status at build: lib/music/instruments/* absent (mus-01 in flight), so this
 * rack builds against a LOCAL id list + dynamic engine lookup with a graceful
 * "voices loading" fallback. Static imports of the engine are deliberately avoided:
 * importing absent modules would break tsc/build. When the engine lands, the
 * dynamic import below picks up playInstrument/INSTRUMENT_META/startTheremin
 * automatically (family modules register via side effect on import). */

export type LocalInstrumentId =
  | "piano"
  | "guitar"
  | "bass"
  | "harp"
  | "marimba"
  | "music-box"
  | "flute"
  | "trumpet"
  | "sax"
  | "violin"
  | "organ"
  | "theremin"
  | "synth-lead"
  | "synth-pad"
  | "chiptune"
  | "kick"
  | "snare"
  | "hihat"
  | "tom"
  | "crash";

type Family = "melodic" | "wind" | "electronic" | "drums";

const GROUPS: { family: Family; label: string; ids: LocalInstrumentId[] }[] = [
  { family: "melodic", label: "Melodic", ids: ["piano", "guitar", "bass", "harp", "marimba", "music-box"] },
  { family: "wind", label: "Wind & Strings", ids: ["flute", "trumpet", "sax", "violin", "organ"] },
  { family: "electronic", label: "Electronic", ids: ["theremin", "synth-lead", "synth-pad", "chiptune"] },
  { family: "drums", label: "Drums", ids: ["kick", "snare", "hihat", "tom", "crash"] },
];

const DRUM_MIDI: Record<string, number> = { kick: 36, snare: 38, hihat: 42, tom: 45, crash: 49 };

type EngineNote = { midi: number; freq?: number; time: number; dur?: number; vel?: number };
type ThereminHandle = { setFreq?: (hz: number) => void; setVolume?: (v: number) => void; stop?: () => void };
type EngineApi = {
  playInstrument?: (id: string, ctx: BaseAudioContext, dest: AudioNode, note: EngineNote) => boolean;
  startTheremin?: (ctx: BaseAudioContext, dest: AudioNode) => ThereminHandle | void;
  meta?: Record<string, { name?: string; kind?: string; description?: string }>;
};

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function prettyName(id: string): string {
  return id
    .split("-")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Dynamically probe for the engine. Never throws; returns null while voices load. */
async function loadEngine(): Promise<EngineApi | null> {
  try {
    // Family modules register via side effect when present; import them first.
    for (const mod of ["melodic", "wind", "electronic", "drums", "percussion"]) {
      try {
        await import(`@/lib/music/instruments/${mod}`);
      } catch {
        /* family not landed yet — skip */
      }
    }
    const core = (await import("@/lib/music/instruments/core")) as unknown as Record<string, unknown>;
    const api: EngineApi = {};
    if (typeof core["playInstrument"] === "function") {
      api.playInstrument = core["playInstrument"] as EngineApi["playInstrument"];
    }
    if (core["INSTRUMENT_META"] && typeof core["INSTRUMENT_META"] === "object") {
      api.meta = core["INSTRUMENT_META"] as EngineApi["meta"];
    }
    try {
      // Built dynamically so tsc/build pass while the engine is still in flight.
      const spec = "@/lib/music/instruments/" + "electronic";
      const electronic = (await import(spec)) as unknown as Record<string, unknown>;
      if (typeof electronic["startTheremin"] === "function") {
        api.startTheremin = electronic["startTheremin"] as EngineApi["startTheremin"];
      }
    } catch {
      /* theremin helper not landed yet — fallback oscillator covers it */
    }
    return api.playInstrument || api.startTheremin ? api : null;
  } catch {
    return null;
  }
}

const KEY_MAP: Record<string, number> = {
  a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12, o: 13, l: 14,
};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function InstrumentRack() {
  const [instrument, setInstrument] = useState<LocalInstrumentId>("piano");
  const [octave, setOctave] = useState(4);
  const [volume, setVolume] = useState(0.8);
  const [engine, setEngine] = useState<EngineApi | null>(null);
  const [audition, setAudition] = useState<string>("No note played yet — pick an instrument and press a key.");
  const ctxRef = useRef<AudioContext | null>(null);
  const destRef = useRef<GainNode | null>(null);
  const fallbackThereminRef = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null);
  const engineThereminRef = useRef<ThereminHandle | null>(null);
  const thereminBoxRef = useRef<HTMLDivElement | null>(null);
  const [thereminActive, setThereminActive] = useState(false);
  const [thereminReadout, setThereminReadout] = useState("— Hz · — %");

  // Probe for the engine once on the client. AudioContext is never created here.
  useEffect(() => {
    let cancelled = false;
    loadEngine().then((api) => {
      if (!cancelled && api) setEngine(api);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const ensureCtx = useCallback((): { ctx: AudioContext; dest: GainNode } | null => {
    if (typeof window === "undefined") return null;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!ctxRef.current) {
      ctxRef.current = new AC();
      destRef.current = ctxRef.current.createGain();
      destRef.current.connect(ctxRef.current.destination);
    }
    const ctx = ctxRef.current;
    const dest = destRef.current;
    if (!ctx || !dest) return null;
    if (ctx.state === "suspended") void ctx.resume();
    dest.gain.setTargetAtTime(volume, ctx.currentTime, 0.02);
    return { ctx, dest };
  }, [volume]);

  const fallbackBlip = useCallback((nodes: { ctx: AudioContext; dest: GainNode }, midi: number, dur = 0.35) => {
    const { ctx, dest } = nodes;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    osc.type = "triangle";
    osc.frequency.setValueAtTime(midiToFreq(midi), t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.9, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }, []);

  const playNote = useCallback(
    (id: string, midi: number, dur = 0.35) => {
      const nodes = ensureCtx();
      if (!nodes) return;
      const { ctx, dest } = nodes;
      const note: EngineNote = { midi, freq: midiToFreq(midi), time: ctx.currentTime, dur, vel: 0.9 };
      let handled = false;
      try {
        handled = engine?.playInstrument?.(id, ctx, dest, note) === true;
      } catch {
        handled = false;
      }
      if (!handled) fallbackBlip(nodes, midi, dur);
      const label = `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
      setAudition(`${prettyName(id)} · ${label} (MIDI ${midi}, ${midiToFreq(midi).toFixed(1)} Hz)${handled ? "" : " · preview voice"}`);
    },
    [engine, ensureCtx, fallbackBlip],
  );

  const playDrum = useCallback(
    (id: string) => {
      playNote(id, DRUM_MIDI[id] ?? 38, 0.3);
    },
    [playNote],
  );

  // Computer-keyboard mapping (A-K row) plays the selected melodic instrument.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const offset = KEY_MAP[e.key.toLowerCase()];
      if (offset === undefined) return;
      e.preventDefault();
      const base = (octave + 1) * 12; // C of the current octave
      playNote(instrument, base + offset, 0.35);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [instrument, octave, playNote]);

  // Keep master volume live on the shared bus.
  useEffect(() => {
    if (ctxRef.current && destRef.current) {
      destRef.current.gain.setTargetAtTime(volume, ctxRef.current.currentTime, 0.02);
    }
  }, [volume]);

  // Stop any theremin voice on unmount.
  useEffect(() => {
    return () => {
      try {
        engineThereminRef.current?.stop?.();
      } catch {
        /* noop */
      }
      engineThereminRef.current = null;
      const fb = fallbackThereminRef.current;
      fallbackThereminRef.current = null;
      if (fb) {
        try {
          fb.osc.stop();
        } catch {
          /* already stopped */
        }
        fb.osc.disconnect();
        fb.gain.disconnect();
      }
    };
  }, []);

  const thereminFromEvent = useCallback((clientX: number, clientY: number) => {
    const box = thereminBoxRef.current;
    if (!box) return { hz: 440, vol: 0.5 };
    const rect = box.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width)));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / Math.max(1, rect.height)));
    // X = pitch 110–880 Hz on a log scale (3 octaves); Y = volume (top = loud).
    const hz = 110 * Math.pow(8, x);
    const vol = 1 - y;
    return { hz, vol };
  }, []);

  const startThereminVoice = useCallback(() => {
    const nodes = ensureCtx();
    if (!nodes) return;
    const { ctx, dest } = nodes;
    if (engine?.startTheremin) {
      try {
        const handle = engine.startTheremin(ctx, dest) as ThereminHandle | void;
        if (handle && typeof handle === "object") engineThereminRef.current = handle;
      } catch {
        engineThereminRef.current = null;
      }
    }
    if (!engineThereminRef.current && !fallbackThereminRef.current) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      fallbackThereminRef.current = { osc, gain };
    }
  }, [engine, ensureCtx]);

  const moveThereminVoice = useCallback(
    (clientX: number, clientY: number) => {
      const { hz, vol } = thereminFromEvent(clientX, clientY);
      setThereminReadout(`${hz.toFixed(1)} Hz · ${Math.round(vol * 100)} %`);
      const handle = engineThereminRef.current;
      if (handle) {
        try {
          handle.setFreq?.(hz);
          handle.setVolume?.(vol * volume);
        } catch {
          /* engine voice misbehaved — fall through to fallback below */
        }
        if (handle.setFreq || handle.setVolume) return;
      }
      const fb = fallbackThereminRef.current;
      const nodes = ctxRef.current;
      if (fb && nodes) {
        fb.osc.frequency.setTargetAtTime(hz, nodes.currentTime, 0.02);
        fb.gain.gain.setTargetAtTime(Math.max(0.0001, vol * volume), nodes.currentTime, 0.02);
      }
      setAudition(`Theremin · ${hz.toFixed(1)} Hz · ${Math.round(vol * 100)} % volume`);
    },
    [thereminFromEvent, volume],
  );

  const stopThereminVoice = useCallback(() => {
    try {
      engineThereminRef.current?.stop?.();
    } catch {
      /* noop */
    }
    engineThereminRef.current = null;
    const fb = fallbackThereminRef.current;
    fallbackThereminRef.current = null;
    if (fb && ctxRef.current) {
      const t = ctxRef.current.currentTime;
      fb.gain.gain.setTargetAtTime(0.0001, t, 0.03);
      const osc = fb.osc;
      window.setTimeout(() => {
        try {
          osc.stop();
        } catch {
          /* already stopped */
        }
        osc.disconnect();
        fb.gain.disconnect();
      }, 200);
    }
    setThereminActive(false);
  }, []);

  const baseMidi = (octave + 1) * 12;
  const whiteKeys = Array.from({ length: 14 }, (_, i) => baseMidi + [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23][i]);
  const blackKeys: { midi: number; slot: number }[] = [];
  for (let o = 0; o < 2; o += 1) {
    for (const [off, slot] of [[1, 0], [3, 1], [6, 3], [8, 4], [10, 5]] as const) {
      blackKeys.push({ midi: baseMidi + o * 12 + off, slot: o * 7 + slot });
    }
  }

  return (
    <div className="space-y-6">
      {!engine && (
        <p role="status" className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-200">
          Voices loading — the instrument engine has not landed yet, so notes play a built-in preview voice.
          Everything on this page still works.
        </p>
      )}

      <div aria-live="polite" className="rounded-xl border border-white/10 bg-white/[.03] p-3 text-sm text-slate-200">
        <span className="font-semibold text-cyan-300">Now auditioning: </span>
        {audition}
      </div>

      <section aria-label="Instrument picker" className="space-y-3">
        {GROUPS.map((group) => (
          <div key={group.family}>
            <h3 className="mb-1.5 text-xs font-bold uppercase tracking-[0.25em] text-slate-400">{group.label}</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {group.ids.map((id) => {
                const active = instrument === id;
                const metaName = engine?.meta?.[id]?.name;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setInstrument(id);
                      if (DRUM_MIDI[id] !== undefined) playDrum(id);
                      else playNote(id, 60, 0.35);
                    }}
                    className={`rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                      active
                        ? "border-cyan-300/70 bg-cyan-300/15 text-cyan-100"
                        : "border-white/10 bg-white/[.03] text-slate-200 hover:border-white/25 hover:bg-white/[.06]"
                    }`}
                  >
                    {metaName ?? prettyName(id)}
                    <span className="block text-[11px] font-normal text-slate-400">{group.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-white/[.03] p-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-300">Octave</span>
          <button
            type="button"
            aria-label="Octave down"
            onClick={() => setOctave((o) => Math.max(1, o - 1))}
            className="rounded-lg border border-white/15 px-2.5 py-1 font-bold hover:bg-white/10"
          >
            −
          </button>
          <span aria-live="polite" className="w-8 text-center font-mono text-cyan-200">C{octave}</span>
          <button
            type="button"
            aria-label="Octave up"
            onClick={() => setOctave((o) => Math.min(7, o + 1))}
            className="rounded-lg border border-white/15 px-2.5 py-1 font-bold hover:bg-white/10"
          >
            +
          </button>
        </div>
        <label className="flex items-center gap-2">
          <span className="text-slate-300">Volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Master volume"
            className="w-36 accent-cyan-300"
          />
          <span className="w-10 text-right font-mono text-cyan-200">{Math.round(volume * 100)}%</span>
        </label>
        <p className="text-xs text-slate-400">Tip: computer keys A–K play the selected instrument (W/E/T/Y/U are sharps).</p>
      </div>

      <section aria-label="Piano keyboard">
        <h3 className="mb-1.5 text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Keys · {prettyName(instrument)}</h3>
        <div className="relative select-none" style={{ touchAction: "none" }}>
          <div className="flex gap-1">
            {whiteKeys.map((midi) => (
              <button
                key={midi}
                type="button"
                aria-label={`${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  playNote(instrument, midi, 0.4);
                }}
                className="h-36 flex-1 rounded-b-lg border border-slate-500/40 bg-slate-100 text-slate-600 active:bg-cyan-200 sm:h-44"
              />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 flex h-20 sm:h-24">
            {Array.from({ length: 14 }, (_, slot) => {
              const key = blackKeys.find((b) => b.slot === slot);
              return (
                <div key={slot} className="relative flex-1">
                  {key && (
                    <button
                      type="button"
                      aria-label={`${NOTE_NAMES[key.midi % 12]}${Math.floor(key.midi / 12) - 1}`}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        playNote(instrument, key.midi, 0.4);
                      }}
                      className="pointer-events-auto absolute -right-[22%] top-0 z-10 h-full w-[44%] rounded-b-md border border-black bg-slate-900 active:bg-cyan-400"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-500">Two octaves · C{octave}–B{octave + 1} · mouse, touch, and A–K keys.</p>
      </section>

      <section aria-label="Drum pads">
        <h3 className="mb-1.5 text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Drum pads</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {(["kick", "snare", "hihat", "tom", "crash"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                playDrum(id);
              }}
              className={`h-24 rounded-2xl border text-base font-black uppercase tracking-widest transition-colors active:scale-[.98] ${
                instrument === id
                  ? "border-fuchsia-300/70 bg-fuchsia-400/20 text-fuchsia-100"
                  : "border-white/10 bg-white/[.03] text-slate-100 hover:border-fuchsia-300/40"
              }`}
            >
              {prettyName(id)}
            </button>
          ))}
        </div>
      </section>

      <section aria-label="Theremin surface">
        <h3 className="mb-1.5 text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Theremin · XY surface</h3>
        <div
          ref={thereminBoxRef}
          role="application"
          aria-label="Theremin surface: horizontal position sets pitch from 110 to 880 hertz, vertical position sets volume"
          onPointerDown={(e) => {
            e.preventDefault();
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            setThereminActive(true);
            startThereminVoice();
            moveThereminVoice(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (!thereminActive) return;
            moveThereminVoice(e.clientX, e.clientY);
          }}
          onPointerUp={() => stopThereminVoice()}
          onPointerCancel={() => stopThereminVoice()}
          className={`flex h-52 cursor-crosshair items-center justify-center rounded-2xl border text-sm ${
            thereminActive ? "border-emerald-300/70 bg-emerald-300/10 text-emerald-100" : "border-white/10 bg-white/[.03] text-slate-400"
          }`}
          style={{ touchAction: "none" }}
        >
          <span aria-live="polite" className="pointer-events-none font-mono">
            {thereminActive ? thereminReadout : "Touch / click and drag — X = pitch (110–880 Hz) · Y = volume"}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Left edge 110 Hz · right edge 880 Hz (log) · top loud · release stops. Readout: {thereminReadout}
        </p>
      </section>
    </div>
  );
}
