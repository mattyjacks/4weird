"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface WaveEditorProps {
  /** Rendered 4W audio to edit. Null renders the empty state — never throws. */
  buffer: AudioBuffer | null;
  /** Called with the edited buffer when the user hits Commit. */
  onCommit?: (buf: AudioBuffer) => void;
}

interface Snapshot {
  channels: Float32Array[];
  sampleRate: number;
}

interface Selection {
  start: number;
  end: number;
}

const UNDO_DEPTH = 20;
const SPLIT_GAP_SEC = 0.2;
const NORMALIZE_PEAK = 0.99;
const ECHO_MAX_DELAY_SEC = 2;

function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function canUseAudio(): boolean {
  return typeof window !== "undefined" && typeof AudioBuffer !== "undefined";
}

function makeBuffer(channels: number, length: number, sampleRate: number): AudioBuffer | null {
  try {
    if (!canUseAudio()) return null;
    if (!Number.isFinite(channels) || !Number.isFinite(length) || !Number.isFinite(sampleRate)) return null;
    if (channels < 1 || length < 1 || sampleRate <= 0) return null;
    return new AudioBuffer({
      numberOfChannels: Math.floor(channels),
      length: Math.floor(length),
      sampleRate,
    });
  } catch {
    return null;
  }
}

function snapshotOf(buf: AudioBuffer): Snapshot {
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < buf.numberOfChannels; ch += 1) {
    channels.push(buf.getChannelData(ch).slice());
  }
  return { channels, sampleRate: buf.sampleRate };
}

function buildFromSnapshot(snap: Snapshot): AudioBuffer | null {
  const length = snap.channels[0]?.length ?? 0;
  const buf = makeBuffer(snap.channels.length, length, snap.sampleRate);
  if (!buf) return null;
  for (let ch = 0; ch < snap.channels.length; ch += 1) {
    buf.getChannelData(ch).set(snap.channels[ch] ?? new Float32Array(0));
  }
  return buf;
}

function resampleSnapshot(snap: Snapshot, targetRate: number): Snapshot {
  if (snap.sampleRate === targetRate) return snap;
  const ratio = snap.sampleRate / targetRate;
  const srcLen = snap.channels[0]?.length ?? 0;
  const dstLen = Math.max(1, Math.round(srcLen / ratio));
  const channels = snap.channels.map((src) => {
    const dst = new Float32Array(dstLen);
    for (let i = 0; i < dstLen; i += 1) {
      const pos = i * ratio;
      const i0 = Math.floor(pos);
      const i1 = Math.min(src.length - 1, i0 + 1);
      const frac = pos - i0;
      dst[i] = (src[i0] ?? 0) * (1 - frac) + (src[i1] ?? 0) * frac;
    }
    return dst;
  });
  return { channels, sampleRate: targetRate };
}

function normSel(sel: Selection, length: number): Selection {
  const len = Math.max(0, Math.floor(length));
  const a = Math.max(0, Math.min(len, Math.floor(sel.start)));
  const b = Math.max(0, Math.min(len, Math.floor(sel.end)));
  return a <= b ? { start: a, end: b } : { start: b, end: a };
}

/** Encode an AudioBuffer as a 16-bit PCM WAV blob (hand-rolled, no deps). */
function encodeWav16(buf: AudioBuffer): Blob | null {
  try {
    if (typeof Blob === "undefined") return null;
    const channels = buf.numberOfChannels;
    const sampleRate = buf.sampleRate;
    const length = buf.length;
    if (channels < 1 || length < 1) return null;
    const blockAlign = channels * 2;
    const dataSize = length * blockAlign;
    const raw = new ArrayBuffer(44 + dataSize);
    const view = new DataView(raw);
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
    return new Blob([raw], { type: "audio/wav" });
  } catch {
    return null;
  }
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "—";
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return m > 0 ? `${m}:${s.toFixed(2).padStart(5, "0")}` : `${s.toFixed(2)}s`;
}

// Audacity-spirit wave editor for rendered 4W audio: canvas waveform,
// click-drag selection, cut/copy/paste/split/trim, gain, fades, normalize,
// simple echo, play selection/all, 16-bit WAV export — all on-device.
export function WaveEditor({ buffer, onCommit }: WaveEditorProps) {
  const [work, setWork] = useState<AudioBuffer | null>(null);
  const [sel, setSel] = useState<Selection>({ start: 0, end: 0 });
  const [undo, setUndo] = useState<Snapshot[]>([]);
  const [gainPct, setGainPct] = useState(100);
  const [fadeSec, setFadeSec] = useState(0.5);
  const [echoDelaySec, setEchoDelaySec] = useState(0.3);
  const [echoFb, setEchoFb] = useState(0.35);
  const [status, setStatus] = useState("Waiting for audio — the maker passes a rendered AudioBuffer in.");
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<"selection" | "all" | null>(null);
  const [clipLen, setClipLen] = useState(0);
  const [sizeTick, setSizeTick] = useState(0);

  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const clipboardRef = useRef<Snapshot | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ anchor: number } | null>(null);
  const urlRef = useRef<string | null>(null);

  const getCtx = (): AudioContext | null => {
    const Ctor = getAudioContextCtor();
    if (!Ctor) return null;
    if (!ctxRef.current) ctxRef.current = new Ctor();
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  };

  const stopPlayback = () => {
    try {
      sourceRef.current?.stop();
    } catch {
      // already stopped — safe to ignore
    }
    sourceRef.current = null;
    setPlaying(null);
  };

  // Adopt a newly provided buffer (edits always copy, the prop is never mutated).
  // Adjusted during render (not in an effect) per react.dev/you-might-not-need-an-effect.
  const [prevProp, setPrevProp] = useState<AudioBuffer | null>(null);
  if (buffer !== prevProp) {
    setPrevProp(buffer);
    setPlaying(null);
    setWork(buffer);
    setUndo([]);
    setSel({ start: 0, end: buffer ? buffer.length : 0 });
    setError(null);
    setStatus(
      buffer
        ? `Loaded ${formatTime(buffer.duration)} · ${buffer.sampleRate} Hz · ${buffer.numberOfChannels}ch — drag on the waveform to select.`
        : "Waiting for audio — the maker passes a rendered AudioBuffer in.",
    );
  }

  // Stop any in-flight playback when a new buffer arrives (state syncs during
  // render above; only the ref side-effect lives here).
  useEffect(() => {
    try {
      sourceRef.current?.stop();
    } catch {
      // teardown — safe to ignore
    }
    sourceRef.current = null;
  }, [prevProp]);

  // Teardown: stop audio, revoke export URL, close the lazy context.
  useEffect(() => {
    return () => {
      try {
        sourceRef.current?.stop();
      } catch {
        // teardown — safe to ignore
      }
      if (urlRef.current && typeof URL !== "undefined") URL.revokeObjectURL(urlRef.current);
      void ctxRef.current?.close().catch(() => undefined);
    };
  }, []);

  // Redraw on resize.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setSizeTick((t) => t + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const stats = useMemo(() => {
    if (!work) return null;
    let peak = 0;
    for (let ch = 0; ch < work.numberOfChannels; ch += 1) {
      const data = work.getChannelData(ch);
      for (let i = 0; i < data.length; i += 1) {
        const v = Math.abs(data[i] ?? 0);
        if (v > peak) peak = v;
      }
    }
    return {
      duration: work.duration,
      sampleRate: work.sampleRate,
      channels: work.numberOfChannels,
      length: work.length,
      peak,
    };
  }, [work]);

  // Canvas waveform (peaks) + selection overlay.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const cssW = canvas.clientWidth || 640;
    const cssH = canvas.clientHeight || 180;
    canvas.width = Math.max(1, Math.floor(cssW * dpr));
    canvas.height = Math.max(1, Math.floor(cssH * dpr));
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssW, cssH);
    if (!work || work.length < 1) {
      ctx.fillStyle = "#64748b";
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillText("No audio — nothing to draw yet.", 12, cssH / 2);
      return;
    }
    const len = work.length;
    const nCh = work.numberOfChannels;
    const chData: Float32Array[] = [];
    for (let ch = 0; ch < nCh; ch += 1) chData.push(work.getChannelData(ch));
    const mid = cssH / 2;
    const amp = cssH / 2 - 8;
    ctx.fillStyle = "#38bdf8";
    const step = Math.max(1, Math.floor(len / cssW));
    for (let x = 0; x < cssW; x += 1) {
      const i0 = Math.min(len - 1, Math.floor((x / cssW) * len));
      const i1 = Math.min(len, i0 + step);
      let mn = 1;
      let mx = -1;
      for (let ch = 0; ch < nCh; ch += 1) {
        const data = chData[ch];
        if (!data) continue;
        for (let i = i0; i < i1; i += 1) {
          const v = (data[i] ?? 0) / nCh;
          if (v < mn) mn = v;
          if (v > mx) mx = v;
        }
      }
      const yTop = mid - mx * amp;
      const yBot = mid - mn * amp;
      ctx.fillRect(x, yTop, 1, Math.max(1, yBot - yTop));
    }
    // Center line.
    ctx.fillStyle = "rgba(148,163,184,0.5)";
    ctx.fillRect(0, mid, cssW, 1);
    // Selection overlay / cursor.
    const xOf = (s: number) => (s / len) * cssW;
    if (sel.end > sel.start) {
      ctx.fillStyle = "rgba(251,191,36,0.18)";
      ctx.fillRect(xOf(sel.start), 0, Math.max(1, xOf(sel.end) - xOf(sel.start)), cssH);
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(xOf(sel.start), 0, 1.5, cssH);
      ctx.fillRect(xOf(sel.end) - 1.5, 0, 1.5, cssH);
    } else {
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(xOf(sel.start), 0, 1.5, cssH);
    }
  }, [work, sel, sizeTick]);

  const sampleAtClientX = (clientX: number): number => {
    const canvas = canvasRef.current;
    if (!canvas || !work || work.length < 1) return 0;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(ratio * work.length);
  };

  const applyEdit = (
    label: string,
    build: (src: AudioBuffer) => AudioBuffer | null,
    newSel?: Selection,
  ) => {
    if (!work) {
      setError("No audio loaded — there is nothing to edit yet.");
      return;
    }
    setError(null);
    try {
      const next = build(work);
      if (!next) {
        setError(`${label} failed in this browser — the buffer was left unchanged.`);
        return;
      }
      const snap = snapshotOf(work);
      setUndo((u) => {
        const grown = [...u, snap];
        return grown.length > UNDO_DEPTH ? grown.slice(grown.length - UNDO_DEPTH) : grown;
      });
      setWork(next);
      setSel(normSel(newSel ?? sel, next.length));
      setStatus(
        `${label} done — ${formatTime(next.duration)} · undo depth ${Math.min(undo.length + 1, UNDO_DEPTH)}/${UNDO_DEPTH}.`,
      );
    } catch {
      setError(`${label} failed — the buffer was left unchanged.`);
    }
  };

  const hasSel = work != null && sel.end > sel.start;
  const editRange = (): Selection =>
    work == null ? { start: 0, end: 0 } : hasSel ? sel : { start: 0, end: work.length };

  const handleUndo = () => {
    if (!work) {
      setError("No audio loaded — there is nothing to undo.");
      return;
    }
    setError(null);
    const prev = undo[undo.length - 1];
    if (!prev) {
      setStatus("Nothing to undo.");
      return;
    }
    try {
      const restored = buildFromSnapshot(prev);
      if (!restored) {
        setError("Undo failed in this browser.");
        return;
      }
      setUndo((u) => u.slice(0, -1));
      setWork(restored);
      setSel(normSel(sel, restored.length));
      setStatus("Undid the last edit.");
    } catch {
      setError("Undo failed — the buffer was left unchanged.");
    }
  };

  const handleCut = () => {
    if (!work || !hasSel) {
      setError("Drag a selection on the waveform first, then Cut.");
      return;
    }
    const { start, end } = sel;
    applyEdit(
      "Cut",
      (src) => {
        clipboardRef.current = {
          channels: Array.from({ length: src.numberOfChannels }, (_, ch) =>
            src.getChannelData(ch).slice(start, end),
          ),
          sampleRate: src.sampleRate,
        };
        setClipLen(end - start);
        const buf = makeBuffer(src.numberOfChannels, src.length - (end - start), src.sampleRate);
        if (!buf) return null;
        for (let ch = 0; ch < src.numberOfChannels; ch += 1) {
          const s = src.getChannelData(ch);
          const d = buf.getChannelData(ch);
          d.set(s.subarray(0, start), 0);
          d.set(s.subarray(end), start);
        }
        return buf;
      },
      { start, end: start },
    );
  };

  const handleCopy = () => {
    if (!work || !hasSel) {
      setError("Drag a selection on the waveform first, then Copy.");
      return;
    }
    try {
      clipboardRef.current = {
        channels: Array.from({ length: work.numberOfChannels }, (_, ch) =>
          work.getChannelData(ch).slice(sel.start, sel.end),
        ),
        sampleRate: work.sampleRate,
      };
      setClipLen(sel.end - sel.start);
      setError(null);
      setStatus(`Copied ${formatTime((sel.end - sel.start) / work.sampleRate)} to the clipboard.`);
    } catch {
      setError("Copy failed — the clipboard was left unchanged.");
    }
  };

  const handlePaste = () => {
    const clip = clipboardRef.current;
    if (!work || !clip) {
      setError("Clipboard is empty — Cut or Copy a selection first.");
      return;
    }
    const at = hasSel ? sel.start : sel.start;
    const replaceLen = hasSel ? sel.end - sel.start : 0;
    applyEdit(
      "Paste",
      (src) => {
        const fitted = resampleSnapshot(clip, src.sampleRate);
        const insLen = fitted.channels[0]?.length ?? 0;
        const buf = makeBuffer(src.numberOfChannels, src.length - replaceLen + insLen, src.sampleRate);
        if (!buf) return null;
        for (let ch = 0; ch < src.numberOfChannels; ch += 1) {
          const s = src.getChannelData(ch);
          const d = buf.getChannelData(ch);
          const ins = fitted.channels[Math.min(ch, fitted.channels.length - 1)] ?? new Float32Array(0);
          d.set(s.subarray(0, at), 0);
          d.set(ins, at);
          d.set(s.subarray(at + replaceLen), at + insLen);
        }
        return buf;
      },
      { start: at, end: at + (resampleSnapshot(clip, work.sampleRate).channels[0]?.length ?? 0) },
    );
  };

  const handleSplit = () => {
    if (!work) {
      setError("No audio loaded — there is nothing to split.");
      return;
    }
    const at = hasSel ? sel.start : sel.start;
    const gap = Math.max(1, Math.round(SPLIT_GAP_SEC * work.sampleRate));
    applyEdit(
      `Split (inserted ${SPLIT_GAP_SEC}s gap)`,
      (src) => {
        const buf = makeBuffer(src.numberOfChannels, src.length + gap, src.sampleRate);
        if (!buf) return null;
        for (let ch = 0; ch < src.numberOfChannels; ch += 1) {
          const s = src.getChannelData(ch);
          const d = buf.getChannelData(ch);
          d.set(s.subarray(0, at), 0);
          d.fill(0, at, at + gap);
          d.set(s.subarray(at), at + gap);
        }
        return buf;
      },
      { start: at, end: at + gap },
    );
  };

  const handleTrim = () => {
    if (!work || !hasSel) {
      setError("Drag a selection on the waveform first — Trim keeps only the selection.");
      return;
    }
    const { start, end } = sel;
    applyEdit(
      "Trim",
      (src) => {
        const buf = makeBuffer(src.numberOfChannels, end - start, src.sampleRate);
        if (!buf) return null;
        for (let ch = 0; ch < src.numberOfChannels; ch += 1) {
          buf.getChannelData(ch).set(src.getChannelData(ch).subarray(start, end), 0);
        }
        return buf;
      },
      { start: 0, end: end - start },
    );
  };

  const handleGain = () => {
    const factor = gainPct / 100;
    const range = editRange();
    applyEdit(`Gain ×${factor.toFixed(2)}${hasSel ? " (selection)" : ""}`, (src) => {
      const buf = makeBuffer(src.numberOfChannels, src.length, src.sampleRate);
      if (!buf) return null;
      for (let ch = 0; ch < src.numberOfChannels; ch += 1) {
        const s = src.getChannelData(ch);
        const d = buf.getChannelData(ch);
        d.set(s, 0);
        for (let i = range.start; i < range.end; i += 1) d[i] = (d[i] ?? 0) * factor;
      }
      return buf;
    });
  };

  const handleFade = (kind: "in" | "out") => {
    const range = editRange();
    const secs = Math.max(0, fadeSec);
    applyEdit(`Fade-${kind} ${secs.toFixed(2)}s${hasSel ? " (selection)" : ""}`, (src) => {
      const fadeLen = Math.min(range.end - range.start, Math.round(secs * src.sampleRate));
      if (fadeLen < 1) return null;
      const buf = makeBuffer(src.numberOfChannels, src.length, src.sampleRate);
      if (!buf) return null;
      for (let ch = 0; ch < src.numberOfChannels; ch += 1) {
        const s = src.getChannelData(ch);
        const d = buf.getChannelData(ch);
        d.set(s, 0);
        for (let i = 0; i < fadeLen; i += 1) {
          const t = fadeLen <= 1 ? 1 : i / (fadeLen - 1);
          const idx = kind === "in" ? range.start + i : range.end - 1 - i;
          d[idx] = (d[idx] ?? 0) * t;
        }
      }
      return buf;
    });
  };

  const handleNormalize = () => {
    const range = editRange();
    applyEdit(`Normalize to peak ${NORMALIZE_PEAK}${hasSel ? " (selection)" : ""}`, (src) => {
      let peak = 0;
      for (let ch = 0; ch < src.numberOfChannels; ch += 1) {
        const s = src.getChannelData(ch);
        for (let i = range.start; i < range.end; i += 1) {
          const v = Math.abs(s[i] ?? 0);
          if (v > peak) peak = v;
        }
      }
      if (peak <= 0) return null;
      const k = NORMALIZE_PEAK / peak;
      const buf = makeBuffer(src.numberOfChannels, src.length, src.sampleRate);
      if (!buf) return null;
      for (let ch = 0; ch < src.numberOfChannels; ch += 1) {
        const s = src.getChannelData(ch);
        const d = buf.getChannelData(ch);
        d.set(s, 0);
        for (let i = range.start; i < range.end; i += 1) d[i] = (d[i] ?? 0) * k;
      }
      return buf;
    });
  };

  const handleEcho = () => {
    applyEdit("Echo", (src) => {
      const delay = Math.max(1, Math.min(Math.round(echoDelaySec * src.sampleRate), src.sampleRate * ECHO_MAX_DELAY_SEC));
      const fb = Math.max(0, Math.min(0.95, echoFb));
      const buf = makeBuffer(src.numberOfChannels, src.length, src.sampleRate);
      if (!buf) return null;
      for (let ch = 0; ch < src.numberOfChannels; ch += 1) {
        const s = src.getChannelData(ch);
        const d = buf.getChannelData(ch);
        for (let i = 0; i < src.length; i += 1) {
          const echo = i >= delay ? (d[i - delay] ?? 0) * fb : 0;
          const v = (s[i] ?? 0) + echo;
          d[i] = Math.max(-1, Math.min(1, v));
        }
      }
      return buf;
    });
  };

  const playRange = (mode: "selection" | "all") => {
    if (!work) {
      setError("No audio loaded — there is nothing to play.");
      return;
    }
    const ctx = getCtx();
    if (!ctx) {
      setError("Web Audio API is unavailable in this browser.");
      return;
    }
    let offset = 0;
    let duration = work.duration;
    if (mode === "selection") {
      if (!hasSel) {
        setError("Drag a selection on the waveform first, then Play selection.");
        return;
      }
      offset = sel.start / work.sampleRate;
      duration = (sel.end - sel.start) / work.sampleRate;
    }
    setError(null);
    stopPlayback();
    try {
      const src = ctx.createBufferSource();
      src.buffer = work;
      src.connect(ctx.destination);
      src.onended = () => {
        if (sourceRef.current === src) setPlaying(null);
      };
      sourceRef.current = src;
      src.start(0, offset, duration);
      setPlaying(mode);
      setStatus(mode === "selection" ? "Playing selection…" : "Playing all…");
    } catch {
      setError("Playback failed in this browser.");
    }
  };

  const handleExport = () => {
    if (!work) {
      setError("No audio loaded — there is nothing to export.");
      return;
    }
    setError(null);
    try {
      const blob = encodeWav16(work);
      if (!blob || typeof URL === "undefined" || typeof document === "undefined") {
        setError("WAV export failed in this browser.");
        return;
      }
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const a = document.createElement("a");
      a.href = url;
      a.download = "4w-edit.wav";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setStatus("Exported 16-bit WAV — check your downloads.");
    } catch {
      setError("WAV export failed — the buffer was left unchanged.");
    }
  };

  const handleCommit = () => {
    if (!work) {
      setError("No audio loaded — there is nothing to commit.");
      return;
    }
    setError(null);
    try {
      onCommit?.(work);
      setStatus("Committed — the edited buffer was sent back to the maker.");
    } catch {
      setError("Commit failed — the receiver rejected the buffer.");
    }
  };

  const btn =
    "rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/[.12] disabled:cursor-not-allowed disabled:opacity-40";
  const btnPrimary =
    "rounded-full bg-sky-400 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-40";
  const label = "block text-[11px] font-semibold uppercase tracking-wider text-slate-400";
  const field =
    "w-full rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1 text-xs text-slate-100";

  if (!work) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
        <h2 className="text-lg font-black text-slate-100">Wave editor</h2>
        <p className="mt-2 text-sm text-slate-400">
          No audio loaded — render or pick 4W audio in the maker and it will appear here for editing.
          Everything runs on this device.
        </p>
        <canvas
          ref={canvasRef}
          className="mt-4 h-[180px] w-full cursor-crosshair rounded-2xl border border-white/10 bg-slate-950/60"
        />
        <p className="mt-3 text-xs text-slate-500" role="status">
          {status}
        </p>
        {error ? (
          <p className="mt-1 text-xs text-rose-300" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  const selSecs = `${formatTime(sel.start / work.sampleRate)} → ${formatTime(sel.end / work.sampleRate)}`;

  return (
    <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/[.03] p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-black text-slate-100">Wave editor</h2>
        {stats ? (
          <p className="text-xs text-slate-400">
            {formatTime(stats.duration)} · {stats.sampleRate} Hz · {stats.channels}ch · peak{" "}
            {stats.peak.toFixed(3)} · sel {selSecs}
          </p>
        ) : null}
      </div>

      <canvas
        ref={canvasRef}
        className="h-[180px] w-full cursor-crosshair touch-none rounded-2xl border border-white/10 bg-slate-950/60"
        title="Drag to select a region; click to place the cursor"
        onMouseDown={(e) => {
          const s = sampleAtClientX(e.clientX);
          dragRef.current = { anchor: s };
          setSel({ start: s, end: s });
        }}
        onMouseMove={(e) => {
          const drag = dragRef.current;
          if (!drag || !work) return;
          const s = sampleAtClientX(e.clientX);
          setSel(normSel({ start: drag.anchor, end: s }, work.length));
        }}
        onMouseUp={() => {
          dragRef.current = null;
        }}
        onMouseLeave={() => {
          dragRef.current = null;
        }}
      />

      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} onClick={() => playRange("selection")} disabled={!hasSel}>
          Play selection
        </button>
        <button type="button" className={btn} onClick={() => playRange("all")} disabled={playing === "all"}>
          Play all
        </button>
        <button type="button" className={btn} onClick={stopPlayback} disabled={!playing}>
          Stop
        </button>
        <button type="button" className={btn} onClick={handleUndo} disabled={undo.length === 0}>
          Undo ({undo.length})
        </button>
        <button type="button" className={btn} onClick={handleExport}>
          Export WAV
        </button>
        <button type="button" className={btnPrimary} onClick={handleCommit} disabled={!onCommit}>
          Commit to maker
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 p-3">
          <p className={label}>Clipboard</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={handleCut} disabled={!hasSel}>
              Cut
            </button>
            <button type="button" className={btn} onClick={handleCopy} disabled={!hasSel}>
              Copy
            </button>
            <button type="button" className={btn} onClick={handlePaste} disabled={clipLen === 0}>
              Paste{clipLen > 0 && work ? ` (${formatTime(clipLen / work.sampleRate)})` : ""}
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 p-3">
          <p className={label}>Structure</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={handleSplit} title={`Inserts ${SPLIT_GAP_SEC}s of silence at the cursor like splitting a clip`}>
              Split (gap)
            </button>
            <button type="button" className={btn} onClick={handleTrim} disabled={!hasSel} title="Keep only the selection, delete the rest">
              Trim
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 p-3">
          <label className={label} htmlFor="wave-editor-gain">
            Gain — {gainPct}%
          </label>
          <input
            id="wave-editor-gain"
            type="range"
            min={0}
            max={200}
            step={1}
            value={gainPct}
            onChange={(e) => setGainPct(Number(e.target.value))}
            className="mt-2 w-full"
          />
          <button type="button" className={`${btn} mt-2`} onClick={handleGain}>
            Apply gain{hasSel ? " to selection" : ""}
          </button>
        </div>
        <div className="rounded-2xl border border-white/10 p-3">
          <label className={label} htmlFor="wave-editor-fade">
            Fade length (s)
          </label>
          <input
            id="wave-editor-fade"
            type="number"
            min={0}
            max={30}
            step={0.1}
            value={fadeSec}
            onChange={(e) => setFadeSec(Number(e.target.value))}
            className={`${field} mt-2`}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={() => handleFade("in")}>
              Fade in
            </button>
            <button type="button" className={btn} onClick={() => handleFade("out")}>
              Fade out
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 p-3">
          <p className={label}>Level</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className={btn}
              onClick={handleNormalize}
              title={`Scales so the loudest peak hits ${NORMALIZE_PEAK}`}
            >
              Normalize to peak
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 p-3">
          <p className={label}>Echo (delay + feedback)</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="text-[11px] text-slate-400">
              Delay (s)
              <input
                type="number"
                min={0.01}
                max={ECHO_MAX_DELAY_SEC}
                step={0.05}
                value={echoDelaySec}
                onChange={(e) => setEchoDelaySec(Number(e.target.value))}
                className={`${field} mt-1`}
              />
            </label>
            <label className="text-[11px] text-slate-400">
              Feedback
              <input
                type="number"
                min={0}
                max={0.95}
                step={0.05}
                value={echoFb}
                onChange={(e) => setEchoFb(Number(e.target.value))}
                className={`${field} mt-1`}
              />
            </label>
          </div>
          <button type="button" className={`${btn} mt-2`} onClick={handleEcho}>
            Apply echo
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500" role="status">
        {status}
      </p>
      {error ? (
        <p className="-mt-2 text-xs text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
