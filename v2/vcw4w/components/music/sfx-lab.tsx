"use client";

import { useState } from "react";
import {
  COIN,
  DEATH,
  EXPLOSION,
  GAMEOVER,
  JUMP,
  LASER,
  POWERUP,
  RAYGUN,
  type MusicSfx,
  type SfxWave,
} from "@/lib/music-sfx-presets";

const WAVES: SfxWave[] = ["sine", "square", "sawtooth", "triangle", "noise"];

import { playSfx } from "@/lib/music-synth";

function fallbackPlaySfx(preset: MusicSfx): void {
  try {
    if (typeof window === "undefined") return;
    const win = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const AC = win.AudioContext ?? win.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const t0 = ctx.currentTime;
    const dur = Math.min(Math.max(preset.dur, 0.05), 4);
    const vol = preset.vol ?? 0.6;
    const noiseMix = preset.noiseMix ?? 0;

    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t0);
    out.gain.exponentialRampToValueAtTime(Math.max(vol, 0.001), t0 + 0.02);
    out.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    out.connect(ctx.destination);

    const start = Math.max(preset.freqStart, 1);
    const end = Math.max(preset.freqEnd, 1);

    if (preset.wave === "noise") {
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(Math.max(start, 20), t0);
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(end, 20),
        t0 + dur,
      );
      src.connect(filter);
      filter.connect(out);
      src.start(t0);
      src.stop(t0 + dur);
    } else {
      const osc = ctx.createOscillator();
      osc.type = preset.wave;
      osc.frequency.setValueAtTime(start, t0);
      osc.frequency.exponentialRampToValueAtTime(end, t0 + dur);
      osc.connect(out);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);

      if (noiseMix > 0) {
        const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
        const nsrc = ctx.createBufferSource();
        nsrc.buffer = buf;
        const ngain = ctx.createGain();
        ngain.gain.value = Math.min(Math.max(noiseMix, 0), 1) * vol * 0.5;
        nsrc.connect(ngain);
        ngain.connect(ctx.destination);
        nsrc.start(t0);
        nsrc.stop(t0 + dur);
      }
    }

    window.setTimeout(() => {
      try {
        void ctx.close().catch(() => {});
      } catch {
        /* ignore */
      }
    }, (dur + 0.3) * 1000);
  } catch {
    /* fail-open: preview must never throw */
  }
}

/**
 * Live preview via music-02's `playSfx(sfx)` (static import — the module
 * landed 2026-09-13 and manages its own AudioContext). Any failure falls
 * through to the local WebAudio sweep: preview is fail-open and never
 * throws out of a click handler.
 */
async function playPreview(preset: MusicSfx): Promise<boolean> {
  try {
    playSfx(preset);
    return true;
  } catch {
    /* synth unavailable here — use local fallback */
  }
  fallbackPlaySfx(preset);
  return true;
}

const PRESET_BUTTONS: Array<{ name: string; preset: MusicSfx }> = [
  { name: "Raygun", preset: RAYGUN },
  { name: "Death", preset: DEATH },
  { name: "Jump", preset: JUMP },
  { name: "Coin", preset: COIN },
  { name: "Explosion", preset: EXPLOSION },
  { name: "Laser", preset: LASER },
  { name: "Powerup", preset: POWERUP },
  { name: "Game Over", preset: GAMEOVER },
];

function downloadJson(preset: MusicSfx): boolean {
  try {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return false;
    }
    const blob = new Blob([JSON.stringify(preset, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${preset.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.sfx.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
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

export function SfxLab(): React.JSX.Element {
  const [title, setTitle] = useState("My SFX");
  const [wave, setWave] = useState<SfxWave>("sawtooth");
  const [freqStart, setFreqStart] = useState(1200);
  const [freqEnd, setFreqEnd] = useState(200);
  const [dur, setDur] = useState(0.4);
  const [vol, setVol] = useState(0.6);
  const [noiseMix, setNoiseMix] = useState(0);
  const [status, setStatus] = useState("");

  const safeTitle = title.trim() === "" ? "Untitled SFX" : title;
  const current: MusicSfx = {
    format: "$music:1",
    kind: "sfx",
    title: safeTitle,
    wave,
    freqStart,
    freqEnd,
    dur,
    vol,
    noiseMix,
  };

  function loadPreset(preset: MusicSfx): void {
    try {
      setTitle(preset.title);
      setWave(preset.wave);
      setFreqStart(preset.freqStart);
      setFreqEnd(preset.freqEnd);
      setDur(preset.dur);
      setVol(preset.vol ?? 0.6);
      setNoiseMix(preset.noiseMix ?? 0);
      setStatus(`Loaded preset "${preset.title}".`);
    } catch {
      /* fail-open */
    }
  }

  async function onPreview(): Promise<void> {
    try {
      await playPreview(current);
      setStatus(`Playing "${current.title}".`);
    } catch {
      setStatus("Preview failed in this browser (fail-open).");
    }
  }

  function onDownload(): void {
    const ok = downloadJson(current);
    setStatus(ok ? "Downloaded JSON." : "Download failed in this browser.");
  }

  async function onCopy(): Promise<void> {
    const ok = await copyText(JSON.stringify(current, null, 2));
    setStatus(ok ? "Copied JSON to clipboard." : "Copy failed in this browser.");
  }

  return (
    <section aria-label="SFX lab" className="min-w-0 max-w-full overflow-x-clip">
      <style>{`.sfx-touch-slider{-webkit-appearance:none;appearance:none;height:44px;background:transparent;cursor:pointer}.sfx-touch-slider::-webkit-slider-runnable-track{height:8px;border-radius:9999px;background:rgba(255,255,255,.15)}.sfx-touch-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;margin-top:-10px;height:28px;width:28px;border-radius:9999px;background:#67e8f9;border:2px solid #0e7490}.sfx-touch-slider::-moz-range-track{height:8px;border-radius:9999px;background:rgba(255,255,255,.15)}.sfx-touch-slider::-moz-range-thumb{height:28px;width:28px;border-radius:9999px;background:#67e8f9;border:2px solid #0e7490}`}</style>
      <h2 className="text-lg font-black text-white">SFX Lab</h2>

      <div className="mt-3 min-w-0 max-w-full">
        <span id="sfx-wave-label" className="text-sm font-bold text-slate-200">Wave</span>
        <div role="group" aria-labelledby="sfx-wave-label" className="mt-2 flex max-w-full flex-wrap gap-2 overflow-x-auto overscroll-x-contain pb-1">
          {WAVES.map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={wave === w}
              onClick={() => setWave(w)}
              className={`min-h-[44px] min-w-[44px] touch-manipulation rounded-xl border px-4 py-3 text-sm font-bold ${
                wave === w
                  ? "border-cyan-300 bg-cyan-300 text-slate-950"
                  : "border-white/15 bg-white/[.05] text-white hover:bg-white/[.12]"
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      <label className="mt-4 block min-w-0 max-w-full text-sm font-bold text-slate-200">
        Title
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={64}
          className="mt-2 min-h-[44px] w-full max-w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-base font-normal text-white"
        />
      </label>

      <label className="mt-4 block min-w-0 max-w-full text-sm font-bold text-slate-200">
        Freq start: {freqStart} Hz
        <input
          type="range"
          min={20}
          max={4000}
          step={10}
          value={freqStart}
          onChange={(e) => setFreqStart(Number(e.target.value))}
          className="sfx-touch-slider mt-1 h-[44px] w-full max-w-full touch-manipulation accent-cyan-300"
        />
      </label>

      <label className="mt-2 block min-w-0 max-w-full text-sm font-bold text-slate-200">
        Freq end: {freqEnd} Hz
        <input
          type="range"
          min={20}
          max={4000}
          step={10}
          value={freqEnd}
          onChange={(e) => setFreqEnd(Number(e.target.value))}
          className="sfx-touch-slider mt-1 h-[44px] w-full max-w-full touch-manipulation accent-cyan-300"
        />
      </label>

      <label className="mt-2 block min-w-0 max-w-full text-sm font-bold text-slate-200">
        Duration: {dur.toFixed(2)}s
        <input
          type="range"
          min={0.05}
          max={4}
          step={0.05}
          value={dur}
          onChange={(e) => setDur(Number(e.target.value))}
          className="sfx-touch-slider mt-1 h-[44px] w-full max-w-full touch-manipulation accent-cyan-300"
        />
      </label>

      <label className="mt-2 block min-w-0 max-w-full text-sm font-bold text-slate-200">
        Volume: {vol.toFixed(2)}
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={vol}
          onChange={(e) => setVol(Number(e.target.value))}
          className="sfx-touch-slider mt-1 h-[44px] w-full max-w-full touch-manipulation accent-cyan-300"
        />
      </label>

      <label className="mt-2 block min-w-0 max-w-full text-sm font-bold text-slate-200">
        Noise mix: {noiseMix.toFixed(2)}
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={noiseMix}
          onChange={(e) => setNoiseMix(Number(e.target.value))}
          className="sfx-touch-slider mt-1 h-[44px] w-full max-w-full touch-manipulation accent-cyan-300"
        />
      </label>

      <div className="mt-4 flex max-w-full flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void onPreview()}
          className="min-h-[44px] touch-manipulation rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-200"
        >
          Preview
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="min-h-[44px] touch-manipulation rounded-xl border border-white/15 bg-white/[.05] px-5 py-3 text-sm font-bold text-white hover:bg-white/[.12]"
        >
          Download JSON
        </button>
        <button
          type="button"
          onClick={() => void onCopy()}
          className="min-h-[44px] touch-manipulation rounded-xl border border-white/15 bg-white/[.05] px-5 py-3 text-sm font-bold text-white hover:bg-white/[.12]"
        >
          Copy JSON
        </button>
      </div>

      <div className="mt-4 min-w-0 max-w-full">
        <span id="sfx-preset-label" className="text-sm font-bold text-slate-200">Presets</span>
        <div role="group" aria-labelledby="sfx-preset-label" className="mt-2 flex max-w-full flex-wrap gap-2 overflow-x-auto overscroll-x-contain pb-1">
          {PRESET_BUTTONS.map(({ name, preset }) => (
            <button
              key={name}
              type="button"
              onClick={() => loadPreset(preset)}
              className="min-h-[44px] min-w-[44px] touch-manipulation rounded-xl border border-white/15 bg-white/[.05] px-4 py-3 text-sm font-bold text-white hover:bg-white/[.12]"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <pre aria-label="Current SFX JSON" className="mt-4 max-w-full overflow-x-auto overscroll-x-contain rounded-xl border border-white/10 bg-slate-950 p-3 text-xs text-slate-200">
        {JSON.stringify(current, null, 2)}
      </pre>

      <p aria-live="polite" className="mt-2 text-sm text-slate-300">{status}</p>
    </section>
  );
}
