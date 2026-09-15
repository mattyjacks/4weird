"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  Sfx4W,
  SfxKind4W,
  SfxStep4W,
  TrackWave4W,
} from "@/lib/music/format-4w";

/**
 * DS-MUS-05 — SFX studio bench for the 4W-1 contract.
 *
 * Emits Sfx4W = { v: 1, name, kind, steps: [{ wave, freq, freqEnd, dur,
 * vol, type: 'tone' | 'noise' }] }, JSON <= 1024 bytes.
 *
 * Contract-first: ranges/budgets below mirror lib/music/format-4w
 * (MAX_SFX_BYTES 1024, freq 20..20000, dur >0..4, vol 0..1, <=32 steps,
 * ASCII name <=80 chars). When format-4w loads at runtime its validateSfx
 * is consulted too (dynamic import + local fallback mirror, fail-open).
 *
 * Playback prefers lib/music/synth-4w playSfx when it lands (dynamic
 * import by specifier string so tsc stays green until then), else a local
 * lazy-AudioContext fallback. SSR-safe: no browser globals at module
 * scope or during render; everything behind typeof guards / handlers.
 *
 * Next.js docs read: node_modules/next/dist/docs "use client" directive +
 * server-and-client-components guide — 'use client' first line, above
 * imports; client boundary owns state/event handlers/browser APIs.
 */

const SFX_MODULE = "@/lib/music/format-4w";
const SYNTH_MODULE = "@/lib/music/synth-4w";

// Hidden from static analysis on purpose: Turbopack treats even a variable
// `await import(SYNTH_MODULE)` as a resolvable dependency and fails the
// build while the sibling is mid-flight. `new Function` keeps the specifier
// opaque while the surrounding try/catch preserves fail-soft.
type DynamicImporter = (spec: string) => Promise<unknown>;
const dynImport: DynamicImporter = new Function(
  "s",
  "return import(s)",
) as DynamicImporter;

/** 4W-1 SFX budget (mirrors MAX_SFX_BYTES in format-4w). */
const SFX_MAX_BYTES = 1024;
const MIN_HZ = 20;
const MAX_HZ = 20000;
const MAX_DUR = 4;
const MAX_STEPS = 32;
const UI_MAX_STEPS = 8;
const MAX_NAME_CHARS = 80;

const SFX_KINDS: readonly SfxKind4W[] = [
  "raygun",
  "death",
  "putt",
  "coin",
  "hit",
  "jump",
  "win",
  "lose",
  "click",
  "alarm",
];

const WAVES: readonly TrackWave4W[] = [
  "square",
  "saw",
  "tri",
  "sine",
  "noise",
];

interface BenchParams {
  wave: TrackWave4W;
  freqStart: number;
  freqEnd: number;
  totalDur: number;
  vol: number;
  noiseMix: number;
  steps: number;
}

const KIND_PRESETS: Record<SfxKind4W, BenchParams> = {
  raygun: { wave: "saw", freqStart: 2000, freqEnd: 200, totalDur: 0.4, vol: 0.6, noiseMix: 0, steps: 2 },
  death: { wave: "square", freqStart: 400, freqEnd: 50, totalDur: 0.8, vol: 0.7, noiseMix: 0.4, steps: 3 },
  putt: { wave: "sine", freqStart: 300, freqEnd: 150, totalDur: 0.2, vol: 0.6, noiseMix: 0, steps: 1 },
  coin: { wave: "sine", freqStart: 900, freqEnd: 1800, totalDur: 0.3, vol: 0.6, noiseMix: 0, steps: 2 },
  hit: { wave: "square", freqStart: 250, freqEnd: 80, totalDur: 0.3, vol: 0.8, noiseMix: 0.5, steps: 2 },
  jump: { wave: "square", freqStart: 300, freqEnd: 900, totalDur: 0.25, vol: 0.5, noiseMix: 0, steps: 2 },
  win: { wave: "tri", freqStart: 500, freqEnd: 2000, totalDur: 0.6, vol: 0.6, noiseMix: 0, steps: 3 },
  lose: { wave: "tri", freqStart: 600, freqEnd: 100, totalDur: 1, vol: 0.65, noiseMix: 0, steps: 3 },
  click: { wave: "square", freqStart: 1500, freqEnd: 1200, totalDur: 0.06, vol: 0.5, noiseMix: 0, steps: 1 },
  alarm: { wave: "saw", freqStart: 600, freqEnd: 900, totalDur: 0.8, vol: 0.6, noiseMix: 0, steps: 4 },
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function isAscii(s: string): boolean {
  for (let i = 0; i < s.length; i += 1) {
    if (s.charCodeAt(i) > 127) return false;
  }
  return true;
}

/** Deterministic PRNG for the seeded RANDOMIZE button. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildSteps(p: BenchParams): SfxStep4W[] {
  const count = Math.min(
    UI_MAX_STEPS,
    Math.max(1, Math.round(p.steps)),
  );
  const perDur = Math.max(0.01, round3(p.totalDur / count));
  const noiseCount = Math.round(clamp(p.noiseMix, 0, 1) * count);
  const toneCount = count - noiseCount;
  const steps: SfxStep4W[] = [];
  for (let i = 0; i < count; i += 1) {
    const f = count === 1 ? 0 : i / (count - 1);
    const freq = Math.round(p.freqStart + (p.freqEnd - p.freqStart) * f);
    const isNoise = i >= toneCount;
    steps.push({
      wave: isNoise ? "noise" : p.wave,
      freq: clamp(freq, MIN_HZ, MAX_HZ),
      freqEnd: clamp(freq, MIN_HZ, MAX_HZ),
      dur: perDur,
      vol: clamp(round3(p.vol), 0, 1),
      type: isNoise ? "noise" : "tone",
    });
  }
  return steps;
}

function buildSfx(name: string, kind: SfxKind4W, p: BenchParams): Sfx4W {
  const clean = name.trim() === "" ? "Untitled" : name.trim().slice(0, MAX_NAME_CHARS);
  return { v: 1, name: clean, kind, steps: buildSteps(p) };
}

/** Local fallback mirror of format-4w validateSfx (budgets/kinds/ranges). */
function validateSfxLocal(sfx: Sfx4W): string[] {
  const errors: string[] = [];
  try {
    if (sfx.v !== 1) errors.push("sfx.v: must be 1");
    if (typeof sfx.name !== "string" || sfx.name.length === 0) {
      errors.push("sfx.name: must be a non-empty string");
    } else {
      if (sfx.name.length > MAX_NAME_CHARS) {
        errors.push(`sfx.name: max ${MAX_NAME_CHARS} chars`);
      }
      if (!isAscii(sfx.name)) errors.push("sfx.name: must be ASCII-only");
    }
    if (!(SFX_KINDS as readonly string[]).includes(sfx.kind)) {
      errors.push(`sfx.kind: must be one of ${SFX_KINDS.join("|")}`);
    }
    if (!Array.isArray(sfx.steps) || sfx.steps.length === 0) {
      errors.push("sfx.steps: must be a non-empty array");
    } else {
      if (sfx.steps.length > MAX_STEPS) {
        errors.push(`sfx.steps: max ${MAX_STEPS} steps`);
      }
      sfx.steps.forEach((st, i) => {
        const where = `sfx.steps[${i}]`;
        if (!(WAVES as readonly string[]).includes(st.wave)) {
          errors.push(`${where}.wave: must be one of ${WAVES.join("|")}`);
        }
        if (!(Number.isFinite(st.freq) && st.freq >= MIN_HZ && st.freq <= MAX_HZ)) {
          errors.push(`${where}.freq: must be ${MIN_HZ}..${MAX_HZ}`);
        }
        if (!(Number.isFinite(st.freqEnd) && st.freqEnd >= MIN_HZ && st.freqEnd <= MAX_HZ)) {
          errors.push(`${where}.freqEnd: must be ${MIN_HZ}..${MAX_HZ}`);
        }
        if (!(Number.isFinite(st.dur) && st.dur > 0 && st.dur <= MAX_DUR)) {
          errors.push(`${where}.dur: must be >0..${MAX_DUR}`);
        }
        if (!(Number.isFinite(st.vol) && st.vol >= 0 && st.vol <= 1)) {
          errors.push(`${where}.vol: must be 0..1`);
        }
        if (st.type !== "tone" && st.type !== "noise") {
          errors.push(`${where}.type: must be tone|noise`);
        }
      });
    }
    const bytes = JSON.stringify(sfx).length;
    if (bytes > SFX_MAX_BYTES) {
      errors.push(`sfx: JSON ${bytes} bytes exceeds ${SFX_MAX_BYTES}`);
    }
  } catch {
    errors.push("sfx: validation crashed (fail-open)");
  }
  return errors;
}

interface FormatMod {
  validateSfx?: (s: unknown) => { ok: boolean; errors: string[] };
}

interface SynthMod {
  playSfx?: unknown;
}

function fallbackPlaySfx(sfx: Sfx4W): void {
  try {
    if (typeof window === "undefined") return;
    const win = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const AC = win.AudioContext ?? win.webkitAudioContext;
    if (typeof AC === "undefined" || AC === null) return;
    const ctx = new AC();
    let t = ctx.currentTime + 0.02;
    for (const st of sfx.steps) {
      try {
        const dur = clamp(st.dur, 0.01, MAX_DUR);
        const vol = clamp(st.vol, 0, 1);
        const out = ctx.createGain();
        out.gain.setValueAtTime(0.0001, t);
        out.gain.exponentialRampToValueAtTime(Math.max(vol, 0.001), t + 0.02);
        out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        out.connect(ctx.destination);
        const start = clamp(st.freq, 1, MAX_HZ);
        const end = clamp(st.freqEnd, 1, MAX_HZ);
        if (st.type === "noise" || st.wave === "noise") {
          const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
          const buf = ctx.createBuffer(1, len, ctx.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
          const src = ctx.createBufferSource();
          src.buffer = buf;
          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(Math.max(start, MIN_HZ), t);
          filter.frequency.exponentialRampToValueAtTime(Math.max(end, MIN_HZ), t + dur);
          src.connect(filter);
          filter.connect(out);
          src.start(t);
          src.stop(t + dur);
        } else {
          const osc = ctx.createOscillator();
          osc.type =
            st.wave === "saw" ? "sawtooth" : st.wave === "tri" ? "triangle" : st.wave;
          osc.frequency.setValueAtTime(start, t);
          osc.frequency.exponentialRampToValueAtTime(end, t + dur);
          osc.connect(out);
          osc.start(t);
          osc.stop(t + dur + 0.02);
        }
        t += dur;
      } catch {
        /* one bad step must not kill the rest */
      }
    }
    const totalMs = (t - ctx.currentTime + 0.3) * 1000;
    window.setTimeout(() => {
      try {
        void ctx.close().catch(() => {});
      } catch {
        /* ignore */
      }
    }, totalMs);
  } catch {
    /* fail-open: playback must never throw */
  }
}

async function playSfxSmart(sfx: Sfx4W): Promise<void> {
  try {
    const mod: unknown = await dynImport(SYNTH_MODULE);
    if (mod !== null && typeof mod === "object" && "playSfx" in mod) {
      const fn = (mod as SynthMod).playSfx;
      if (typeof fn === "function") {
        await (fn as (s: Sfx4W) => Promise<void> | void)(sfx);
        return;
      }
    }
  } catch {
    /* synth-4w not landed yet — fall through to local playback */
  }
  fallbackPlaySfx(sfx);
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    throw new Error("clipboard unavailable");
  } catch {
    try {
      if (typeof document === "undefined") return false;
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

export function SfxStudio(): React.JSX.Element {
  const [name, setName] = useState("Zap");
  const [kind, setKind] = useState<SfxKind4W>("raygun");
  const [wave, setWave] = useState<TrackWave4W>("saw");
  const [freqStart, setFreqStart] = useState(2000);
  const [freqEnd, setFreqEnd] = useState(200);
  const [totalDur, setTotalDur] = useState(0.4);
  const [vol, setVol] = useState(0.6);
  const [noiseMix, setNoiseMix] = useState(0);
  const [stepCount, setStepCount] = useState(2);
  const [seed, setSeed] = useState(1337);
  const [status, setStatus] = useState("");
  const [libErrors, setLibErrors] = useState<string[]>([]);
  const [libBytes, setLibBytes] = useState<number | null>(null);

  const params: BenchParams = useMemo(
    () => ({
      wave,
      freqStart,
      freqEnd,
      totalDur,
      vol,
      noiseMix,
      steps: stepCount,
    }),
    [wave, freqStart, freqEnd, totalDur, vol, noiseMix, stepCount],
  );

  const sfx: Sfx4W = useMemo(
    () => buildSfx(name, kind, params),
    [name, kind, params],
  );

  const json = useMemo(() => {
    try {
      return JSON.stringify(sfx);
    } catch {
      return "{}";
    }
  }, [sfx]);

  const pretty = useMemo(() => {
    try {
      return JSON.stringify(sfx, null, 2);
    } catch {
      return "{}";
    }
  }, [sfx]);

  const bytes = json.length;
  const localErrors = useMemo(() => validateSfxLocal(sfx), [sfx]);
  const errors = useMemo(
    () => [...localErrors, ...libErrors],
    [localErrors, libErrors],
  );
  const over = bytes > SFX_MAX_BYTES;
  const pct = Math.min(100, Math.round((bytes / SFX_MAX_BYTES) * 100));

  /* Consult lib/music/format-4w when landed (dynamic import, fail-open).
   * All setState calls live in async callbacks (never the effect body),
   * per react-hooks/set-state-in-effect. */
  useEffect(() => {
    let live = true;
    const clearLib = (): void => {
      if (live) setLibErrors([]);
    };
    const applyModule = (mod: unknown): void => {
      if (!live) return;
      try {
        if (mod !== null && typeof mod === "object" && "validateSfx" in mod) {
          const fn = (mod as FormatMod).validateSfx;
          if (typeof fn === "function") {
            const r = fn(sfx);
            if (!live) return;
            setLibErrors(
              Array.isArray(r.errors)
                ? r.errors.filter((e) => !localErrors.includes(e))
                : [],
            );
            return;
          }
        }
        if (!live) return;
        if ("sfxByteSize" in (mod as Record<string, unknown>)) {
          const f = (mod as { sfxByteSize?: unknown }).sfxByteSize;
          if (typeof f === "function") {
            const n = (f as (s: Sfx4W) => number)(sfx);
            if (live && Number.isFinite(n)) setLibBytes(n);
          }
        }
        setLibErrors([]);
      } catch {
        clearLib();
      }
    };
    void Promise.resolve()
      .then(() => dynImport(SFX_MODULE))
      .then(applyModule, clearLib);
    return () => {
      live = false;
    };
  }, [sfx, localErrors]);

  function applyKind(next: SfxKind4W): void {
    try {
      const p = KIND_PRESETS[next];
      setKind(next);
      setWave(p.wave);
      setFreqStart(p.freqStart);
      setFreqEnd(p.freqEnd);
      setTotalDur(p.totalDur);
      setVol(p.vol);
      setNoiseMix(p.noiseMix);
      setStepCount(p.steps);
      setName(next.charAt(0).toUpperCase() + next.slice(1));
      setStatus(`Preset "${next}" loaded.`);
    } catch {
      /* fail-open */
    }
  }

  function onRandomize(): void {
    try {
      const rng = mulberry32(seed);
      const kinds: SfxKind4W[] = [...SFX_KINDS];
      const nextKind = kinds[Math.floor(rng() * kinds.length)] ?? "raygun";
      const wavePool: TrackWave4W[] = ["square", "saw", "tri", "sine"];
      setKind(nextKind);
      setWave(wavePool[Math.floor(rng() * wavePool.length)] ?? "square");
      setFreqStart(Math.round(80 + rng() * 3920));
      setFreqEnd(Math.round(80 + rng() * 3920));
      setTotalDur(round3(0.1 + rng() * 1.4));
      setVol(round3(0.3 + rng() * 0.7));
      setNoiseMix(round3(rng() * 0.8));
      setStepCount(1 + Math.floor(rng() * UI_MAX_STEPS));
      setStatus(`Randomized "${nextKind}" (seed ${seed}).`);
      setSeed((s) => (s + 1) >>> 0);
    } catch {
      setStatus("Randomize failed (fail-open).");
    }
  }

  async function onPlay(): Promise<void> {
    try {
      await playSfxSmart(sfx);
      setStatus(`Playing "${sfx.name}" (${sfx.kind}, ${bytes} bytes).`);
    } catch {
      setStatus("Playback failed in this browser (fail-open).");
    }
  }

  async function onCopy(): Promise<void> {
    try {
      const ok = await copyText(pretty);
      setStatus(
        ok
          ? `Copied SFX JSON (${bytes}/${SFX_MAX_BYTES} bytes).`
          : "Copy failed in this browser.",
      );
    } catch {
      setStatus("Copy failed in this browser.");
    }
  }

  return (
    <section aria-label="SFX studio">
      <h2>SFX Studio</h2>

      <div>
        <span id="sfx-kind-label">Preset (10 kinds)</span>
        <div role="group" aria-labelledby="sfx-kind-label">
          {SFX_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => applyKind(k)}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span id="sfx-wave-label">Wave</span>
        <div role="group" aria-labelledby="sfx-wave-label">
          {WAVES.map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={wave === w}
              onClick={() => setWave(w)}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      <label>
        Name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_NAME_CHARS}
        />
      </label>

      <label>
        Start freq: {freqStart} Hz
        <input
          type="range"
          min={MIN_HZ}
          max={MAX_HZ}
          step={10}
          value={freqStart}
          onChange={(e) => setFreqStart(Number(e.target.value))}
        />
      </label>

      <label>
        End freq: {freqEnd} Hz
        <input
          type="range"
          min={MIN_HZ}
          max={MAX_HZ}
          step={10}
          value={freqEnd}
          onChange={(e) => setFreqEnd(Number(e.target.value))}
        />
      </label>

      <label>
        Duration: {totalDur.toFixed(2)}s
        <input
          type="range"
          min={0.05}
          max={MAX_DUR}
          step={0.05}
          value={totalDur}
          onChange={(e) => setTotalDur(Number(e.target.value))}
        />
      </label>

      <label>
        Volume: {vol.toFixed(2)}
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={vol}
          onChange={(e) => setVol(Number(e.target.value))}
        />
      </label>

      <label>
        Noise mix: {noiseMix.toFixed(2)}
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={noiseMix}
          onChange={(e) => setNoiseMix(Number(e.target.value))}
        />
      </label>

      <label>
        Steps: {stepCount}
        <input
          type="range"
          min={1}
          max={UI_MAX_STEPS}
          step={1}
          value={stepCount}
          onChange={(e) => setStepCount(Number(e.target.value))}
        />
      </label>

      <div>
        <label>
          Seed
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value) >>> 0)}
          />
        </label>
        <button type="button" onClick={onRandomize}>
          RANDOMIZE
        </button>
      </div>

      <div>
        <button type="button" onClick={() => void onPlay()}>
          Play
        </button>
        <button type="button" onClick={() => void onCopy()}>
          Copy JSON
        </button>
      </div>

      <div aria-label="Byte meter" aria-live="polite">
        <span>
          {bytes} / {SFX_MAX_BYTES} bytes{over ? " — OVER BUDGET" : ""}
          {libBytes !== null && Number.isFinite(libBytes) ? ` (lib: ${libBytes})` : ""}
        </span>
        <div role="progressbar" aria-valuenow={bytes} aria-valuemin={0} aria-valuemax={SFX_MAX_BYTES}>
          <div style={{ width: `${pct}%` }} />
        </div>
      </div>

      {errors.length > 0 && (
        <ul aria-label="Validation errors">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <pre aria-label="Current SFX JSON">{pretty}</pre>

      <p aria-live="polite">{status}</p>
    </section>
  );
}
