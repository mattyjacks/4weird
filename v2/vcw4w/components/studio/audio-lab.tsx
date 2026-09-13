"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Analysis {
  fileName: string;
  durationSec: number;
  peak: number;
  peakDb: number;
  rms: number;
  sampleRate: number;
  channels: number;
}

function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function analyzeBuffer(buf: AudioBuffer, fileName: string): Analysis {
  let peak = 0;
  let sumSq = 0;
  let total = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch += 1) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < data.length; i += 1) {
      const v = Math.abs(data[i] ?? 0);
      if (v > peak) peak = v;
      sumSq += (data[i] ?? 0) * (data[i] ?? 0);
      total += 1;
    }
  }
  const rms = total > 0 ? Math.sqrt(sumSq / total) : 0;
  return {
    fileName,
    durationSec: buf.duration,
    peak,
    peakDb: peak > 0 ? 20 * Math.log10(peak) : -Infinity,
    rms,
    sampleRate: buf.sampleRate,
    channels: buf.numberOfChannels,
  };
}

function formatDb(db: number): string {
  if (!Number.isFinite(db)) return "-∞ dB";
  return `${db.toFixed(1)} dB`;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return m > 0 ? `${m}:${s.toFixed(2).padStart(5, "0")}` : `${s.toFixed(2)}s`;
}

/** Encode an AudioBuffer as a 16-bit PCM WAV blob. */
function encodeWav16(buf: AudioBuffer): Blob {
  const channels = buf.numberOfChannels;
  const sampleRate = buf.sampleRate;
  const length = buf.length;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i += 1) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < channels; ch += 1) channelData.push(buf.getChannelData(ch));
  let offset = 44;
  for (let i = 0; i < length; i += 1) {
    for (let ch = 0; ch < channels; ch += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[ch]?.[i] ?? 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([buffer], { type: "audio/wav" });
}

// AliveSpeech Lab (local mastering bench): upload → Web Audio decode → real
// duration/peak/RMS analysis → gain + normalize-to-peak via
// OfflineAudioContext → A/B playback → 16-bit WAV download. Plainly NOT voice
// cloning: cloning lives elsewhere; this page only masters locally.
export function AudioLab() {
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const originalRef = useRef<AudioBuffer | null>(null);
  const processedRef = useRef<AudioBuffer | null>(null);
  const fileNameRef = useRef("audio");
  const urlRef = useRef<string | null>(null);

  const [status, setStatus] = useState("Upload an audio file to begin — everything stays on this device.");
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [processedAnalysis, setProcessedAnalysis] = useState<Analysis | null>(null);
  const [gainPct, setGainPct] = useState(100);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState<"original" | "processed" | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const getCtx = useCallback((): AudioContext | null => {
    const Ctor = getAudioContextCtor();
    if (!Ctor) return null;
    if (!ctxRef.current) ctxRef.current = new Ctor();
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }, []);

  const stopPlayback = useCallback(() => {
    try {
      sourceRef.current?.stop();
    } catch {
      // already stopped — safe to ignore
    }
    sourceRef.current = null;
    setPlaying(null);
  }, []);

  useEffect(() => {
    return () => {
      try {
        sourceRef.current?.stop();
      } catch {
        // teardown — safe to ignore
      }
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      void ctxRef.current?.close().catch(() => undefined);
    };
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setDownloadUrl(null);
      processedRef.current = null;
      setProcessedAnalysis(null);
      stopPlayback();
      const Ctor = getAudioContextCtor();
      if (!Ctor) {
        setError("Web Audio API is unavailable in this browser — try a recent Chrome, Edge, Firefox, or Safari.");
        return;
      }
      setBusy(true);
      setStatus(`Decoding ${file.name}…`);
      try {
        const raw = await file.arrayBuffer();
        // Decode with a throwaway context so sample-rate quirks surface here.
        const tmp = new Ctor();
        let decoded: AudioBuffer;
        try {
          decoded = await tmp.decodeAudioData(raw.slice(0));
        } finally {
          void tmp.close().catch(() => undefined);
        }
        originalRef.current = decoded;
        fileNameRef.current = file.name;
        setAnalysis(analyzeBuffer(decoded, file.name));
        setGainPct(100);
        setStatus(`Decoded ${file.name} — adjust gain or normalize, then A/B the result.`);
      } catch {
        originalRef.current = null;
        setAnalysis(null);
        setError(
          "Could not decode that file. Upload a real audio file (WAV, MP3, OGG, M4A, or FLAC). If it plays elsewhere, try exporting it as WAV first.",
        );
        setStatus("Decode failed — no audio loaded.");
      } finally {
        setBusy(false);
      }
    },
    [stopPlayback],
  );

  const renderProcessed = useCallback(async (gain: number, label: string) => {
      const original = originalRef.current;
      if (!original) {
        setError("Upload and decode an audio file first.");
        return;
      }
      setBusy(true);
      setError(null);
      setStatus(`${label}…`);
      try {
        const offline = new OfflineAudioContext(
          original.numberOfChannels,
          original.length,
          original.sampleRate,
        );
        const src = offline.createBufferSource();
        src.buffer = original;
        const g = offline.createGain();
        g.gain.value = gain;
        src.connect(g);
        g.connect(offline.destination);
        src.start(0);
        const rendered = await offline.startRendering();
        processedRef.current = rendered;
        setProcessedAnalysis(analyzeBuffer(rendered, `${fileNameRef.current} (${label})`));
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        const blob = encodeWav16(rendered);
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setDownloadUrl(url);
        setStatus(`${label} done — A/B playback is ready and a WAV download is available.`);
      } catch {
        setError("Rendering failed in this browser — try reloading the page and decoding the file again.");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const applyGain = useCallback(() => {
    void renderProcessed(gainPct / 100, `Applying ${(gainPct / 100).toFixed(2)}× gain`);
  }, [gainPct, renderProcessed]);

  const normalize = useCallback(() => {
    const original = originalRef.current;
    if (!original) {
      setError("Upload and decode an audio file first.");
      return;
    }
    let peak = 0;
    for (let ch = 0; ch < original.numberOfChannels; ch += 1) {
      const data = original.getChannelData(ch);
      for (let i = 0; i < data.length; i += 1) {
        const v = Math.abs(data[i] ?? 0);
        if (v > peak) peak = v;
      }
    }
    if (peak <= 0) {
      setError("This file is silent (peak is 0) — there is nothing to normalize.");
      return;
    }
    const gain = 0.99 / peak;
    setGainPct(Math.round(gain * 100));
    void renderProcessed(gain, `Normalizing to peak 0.99 (${gain.toFixed(2)}× gain)`);
  }, [renderProcessed]);

  const play = useCallback(
    (which: "original" | "processed") => {
      const ctx = getCtx();
      const buf = which === "original" ? originalRef.current : processedRef.current;
      if (!ctx) {
        setError("Web Audio API is unavailable in this browser.");
        return;
      }
      if (!buf) {
        setError(which === "original" ? "Upload an audio file first." : "Render a processed version first (gain or normalize).");
        return;
      }
      stopPlayback();
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.onended = () => setPlaying(null);
      sourceRef.current = src;
      src.start(0);
      setPlaying(which);
      setStatus(`Playing ${which}…`);
    },
    [getCtx, stopPlayback],
  );

  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
        <h2 className="text-lg font-black">1 · Upload audio</h2>
        <p className="mt-2 text-sm text-slate-400">
          Local mastering only — this page does <strong>not</strong> do voice cloning. Cloning lives elsewhere.
        </p>
        <label htmlFor="audio-lab-file" className="mt-4 block text-sm font-semibold text-slate-200">
          Audio file (audio/*)
        </label>
        <input
          id="audio-lab-file"
          type="file"
          accept="audio/*"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
          className="mt-2 block w-full text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-300 file:px-5 file:py-2.5 file:text-sm file:font-bold file:text-slate-950 hover:file:bg-cyan-200 disabled:opacity-50"
        />
        <p aria-live="polite" role="status" className="mt-4 text-sm text-slate-300">
          {status}
        </p>
        {error ? (
          <p aria-live="assertive" role="alert" className="mt-2 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
          <h2 className="text-lg font-black">2 · Real analysis</h2>
          {analysis ? (
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <dt className="text-xs font-bold uppercase tracking-widest text-slate-500">File</dt>
                <dd className="mt-1 break-all text-white">{analysis.fileName}</dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <dt className="text-xs font-bold uppercase tracking-widest text-slate-500">Duration</dt>
                <dd className="mt-1 text-xl font-black text-white">{formatTime(analysis.durationSec)}</dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <dt className="text-xs font-bold uppercase tracking-widest text-slate-500">Peak</dt>
                <dd className="mt-1 text-xl font-black text-white">
                  {analysis.peak.toFixed(3)} <span className="text-sm font-semibold text-slate-400">({formatDb(analysis.peakDb)})</span>
                </dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <dt className="text-xs font-bold uppercase tracking-widest text-slate-500">RMS</dt>
                <dd className="mt-1 text-xl font-black text-white">{analysis.rms.toFixed(4)}</dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <dt className="text-xs font-bold uppercase tracking-widest text-slate-500">Sample rate</dt>
                <dd className="mt-1 text-xl font-black text-white">{analysis.sampleRate.toLocaleString()} Hz</dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <dt className="text-xs font-bold uppercase tracking-widest text-slate-500">Channels</dt>
                <dd className="mt-1 text-xl font-black text-white">{analysis.channels}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No audio decoded yet — upload a file to see real measurements.</p>
          )}
          {processedAnalysis ? (
            <div className="mt-4 rounded-2xl border border-cyan-300/30 bg-cyan-300/5 p-4 text-sm text-slate-300">
              <p className="font-bold text-cyan-200">Processed</p>
              <p className="mt-1">
                Peak {processedAnalysis.peak.toFixed(3)} ({formatDb(processedAnalysis.peakDb)}) · RMS{" "}
                {processedAnalysis.rms.toFixed(4)} · {formatTime(processedAnalysis.durationSec)}
              </p>
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
          <h2 className="text-lg font-black">3 · Process, compare, export</h2>
          <label htmlFor="audio-lab-gain" className="mt-4 block text-sm font-semibold text-slate-200">
            Gain: {(gainPct / 100).toFixed(2)}× ({gainPct}%)
          </label>
          <input
            id="audio-lab-gain"
            type="range"
            min={0}
            max={200}
            step={1}
            value={gainPct}
            disabled={busy || !analysis}
            onChange={(e) => setGainPct(Number(e.target.value))}
            className="mt-2 w-full accent-cyan-300"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={applyGain}
              disabled={busy || !analysis}
              className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-40"
            >
              Apply gain
            </button>
            <button
              type="button"
              onClick={normalize}
              disabled={busy || !analysis}
              className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-40"
            >
              Normalize to peak
            </button>
          </div>
          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="text-sm font-bold text-slate-200">A/B playback</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => play("original")}
                disabled={busy || !analysis}
                aria-pressed={playing === "original"}
                className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-40"
              >
                {playing === "original" ? "▶ Playing original…" : "Play original"}
              </button>
              <button
                type="button"
                onClick={() => play("processed")}
                disabled={busy || !processedAnalysis}
                aria-pressed={playing === "processed"}
                className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-40"
              >
                {playing === "processed" ? "▶ Playing processed…" : "Play processed"}
              </button>
              <button
                type="button"
                onClick={() => {
                  stopPlayback();
                  setStatus("Playback stopped.");
                }}
                disabled={!playing}
                className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-40"
              >
                Stop
              </button>
            </div>
          </div>
          <div className="mt-6 border-t border-white/10 pt-4">
            {downloadUrl ? (
              <a
                href={downloadUrl}
                download="alivespeech-mastered.wav"
                className="inline-block rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
              >
                Download mastered WAV
              </a>
            ) : (
              <p className="text-sm text-slate-500">Render with gain or normalize to unlock the WAV download.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
