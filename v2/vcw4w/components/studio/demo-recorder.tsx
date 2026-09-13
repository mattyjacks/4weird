"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface InputEvent {
  t: number;
  kind: "keydown" | "pointerdown" | "pointermove";
  detail: string;
}

function formatElapsed(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function pickMime(): string {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c;
    } catch {
      // ignore and try next candidate
    }
  }
  return "";
}

// DemoRecorder: real screen capture via getDisplayMedia + MediaRecorder with
// live preview, timer, .webm download, plus a key/mouse input-event logger
// with JSON dataset export. All on-device; permission denials get guidance.
export function DemoRecorder() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const eventsRef = useRef<InputEvent[]>([]);
  const urlRef = useRef<string | null>(null);
  const lastMoveRef = useRef(0);

  const [supported] = useState(
    () => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia,
  );
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState(
    "Ready — screen capture stays on this device. Nothing uploads.",
  );
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<InputEvent[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [mime, setMime] = useState("");

  const keyCount = events.filter((e) => e.kind === "keydown").length;
  const clickCount = events.filter((e) => e.kind === "pointerdown").length;
  const moveCount = events.filter((e) => e.kind === "pointermove").length;

  const pushEvent = useCallback((ev: InputEvent) => {
    eventsRef.current.push(ev);
    setEvents(eventsRef.current.slice(-300));
  }, []);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      const t = (Date.now() - startRef.current) / 1000;
      const key = e.key.length === 1 ? e.key : `<${e.key}>`;
      pushEvent({ t: Math.round(t * 100) / 100, kind: "keydown", detail: `key=${key} code=${e.code}` });
    },
    [pushEvent],
  );

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      const t = (Date.now() - startRef.current) / 1000;
      pushEvent({
        t: Math.round(t * 100) / 100,
        kind: "pointerdown",
        detail: `button=${e.button} x=${Math.round(e.clientX)} y=${Math.round(e.clientY)}`,
      });
    },
    [pushEvent],
  );

  // Throttle mousemove logging to ~5/sec so the dataset stays useful.
  const onMove = useCallback(
    (e: PointerEvent) => {
      const now = Date.now();
      if (now - lastMoveRef.current < 200) return;
      lastMoveRef.current = now;
      const t = (now - startRef.current) / 1000;
      pushEvent({
        t: Math.round(t * 100) / 100,
        kind: "pointermove",
        detail: `x=${Math.round(e.clientX)} y=${Math.round(e.clientY)}`,
      });
    },
    [pushEvent],
  );

  const onKeyRef = useRef(onKey);
  const onPointerDownRef = useRef(onPointerDown);
  const onMoveRef = useRef(onMove);

  useEffect(() => {
    onKeyRef.current = onKey;
    onPointerDownRef.current = onPointerDown;
    onMoveRef.current = onMove;
  }, [onKey, onPointerDown, onMove]);

  // Stable wrappers so add/removeEventListener always pair up.
  const keyWrap = useCallback((e: Event) => onKeyRef.current(e as KeyboardEvent), []);
  const downWrap = useCallback((e: Event) => onPointerDownRef.current(e as PointerEvent), []);
  const moveWrap = useCallback((e: Event) => onMoveRef.current(e as PointerEvent), []);

  const attach = useCallback(() => {
    window.addEventListener("keydown", keyWrap);
    window.addEventListener("pointerdown", downWrap);
    window.addEventListener("pointermove", moveWrap);
  }, [downWrap, keyWrap, moveWrap]);

  const detach = useCallback(() => {
    window.removeEventListener("keydown", keyWrap);
    window.removeEventListener("pointerdown", downWrap);
    window.removeEventListener("pointermove", moveWrap);
  }, [downWrap, keyWrap, moveWrap]);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    stopTimer();
    detach();
    setRecording(false);
    try {
      if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
    } catch {
      // already stopped — safe to ignore
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setStatus("Finishing recording…");
  }, [detach, stopTimer]);

  const stopRef = useRef(stop);
  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  const start = useCallback(async () => {
    setError(null);
    setDownloadUrl(null);
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError("Screen capture is unavailable here — open this page in Chrome or Edge on desktop over HTTPS or localhost.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setError("MediaRecorder is unavailable in this browser — try a recent Chrome, Edge, or Firefox on desktop.");
      return;
    }
    try {
      setStatus("Waiting for you to pick a screen, window, or tab…");
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        void videoRef.current.play().catch(() => undefined);
      }
      const chosen = pickMime();
      setMime(chosen);
      chunksRef.current = [];
      eventsRef.current = [];
      setEvents([]);
      const rec = chosen ? new MediaRecorder(stream, { mimeType: chosen }) : new MediaRecorder(stream);
      recorderRef.current = rec;
      rec.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const type = chosen || "video/webm";
        const blob = new Blob(chunksRef.current, { type });
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setDownloadUrl(url);
        setStatus(`Recording stopped — ${(blob.size / 1024 / 1024).toFixed(2)} MB captured with ${eventsRef.current.length} input event(s).`);
      };
      // If the user stops sharing from the browser chrome, end cleanly.
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          if (recorderRef.current?.state !== "inactive") stopRef.current();
        };
      });
      startRef.current = Date.now();
      setElapsed(0);
      rec.start(250);
      attach();
      setRecording(true);
      setStatus("Recording — keys and mouse are being logged with timestamps. All on-device.");
      timerRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }, 500);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError") {
        setError("Permission denied — you clicked Cancel or Blocked. Click Start again and choose a screen, window, or tab, then press Share.");
        setStatus("Capture cancelled — no video recorded.");
      } else if (name === "NotFoundError") {
        setError("No screen source was available — connect a display or try another browser window as the source.");
        setStatus("Capture failed — no source found.");
      } else {
        setError("Screen capture failed to start. Use Chrome or Edge on desktop (HTTPS or localhost) and allow the permission prompt.");
        setStatus("Capture failed to start.");
      }
    }
  }, [attach]);

  useEffect(() => {
    return () => {
      stopTimer();
      try {
        if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
      } catch {
        // teardown — safe to ignore
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      window.removeEventListener("keydown", keyWrap);
      window.removeEventListener("pointerdown", downWrap);
      window.removeEventListener("pointermove", moveWrap);
    };
  }, [downWrap, keyWrap, moveWrap, stopTimer]);

  const exportJson = useCallback(() => {
    const payload = {
      tool: "demorecorder",
      exportedAt: new Date().toISOString(),
      mime,
      durationSec: elapsed,
      counts: { keydown: keyCount, pointerdown: clickCount, pointermove: moveCount, total: eventsRef.current.length },
      events: eventsRef.current,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "demorecorder-input-log.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    setStatus("Input-event JSON dataset exported — check your downloads.");
  }, [clickCount, elapsed, keyCount, mime, moveCount]);

  const clearLog = useCallback(() => {
    if (!window.confirm("Clear the input-event log? Recorded video is unaffected.")) return;
    eventsRef.current = [];
    setEvents([]);
    setStatus("Input-event log cleared.");
  }, []);

  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
        <h2 className="text-lg font-black">1 · Screen capture</h2>
        <p className="mt-2 text-sm text-slate-400">
          Real <code>getDisplayMedia</code> + <code>MediaRecorder</code> capture. All processing stays on-device — nothing uploads.
        </p>
        {!supported ? (
          <p role="alert" className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-200">
            This browser does not expose screen capture — open this page in Chrome or Edge on desktop (HTTPS or localhost).
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {!recording ? (
            <button
              type="button"
              onClick={() => void start()}
              className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
            >
              Start recording
            </button>
          ) : (
            <button
              type="button"
              onClick={stop}
              className="rounded-full bg-red-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-red-300"
            >
              Stop recording
            </button>
          )}
          <p aria-live="polite" className="flex items-center gap-2 text-sm font-bold tabular-nums" role="timer" aria-label={`Recording timer: ${formatElapsed(elapsed)}`}>
            <span aria-hidden="true" className={`inline-block h-3 w-3 rounded-full ${recording ? "animate-pulse bg-red-400" : "bg-slate-600"}`} />
            {formatElapsed(elapsed)}
            {mime ? <span className="font-normal text-slate-500">· {mime}</span> : null}
          </p>
        </div>
        <p aria-live="polite" role="status" className="mt-3 text-sm text-slate-300">
          {status}
        </p>
        {error ? (
          <p aria-live="assertive" role="alert" className="mt-2 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        <video
          ref={videoRef}
          muted
          playsInline
          aria-label="Live screen-capture preview"
          className="mt-4 block aspect-video w-full rounded-2xl border border-white/10 bg-black"
        />
        {downloadUrl ? (
          <a
            href={downloadUrl}
            download="demorecorder-capture.webm"
            className="mt-4 inline-block rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
          >
            Download recording (.webm)
          </a>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Stop a recording to unlock the .webm download.</p>
        )}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
        <h2 className="text-lg font-black">2 · Input-event logger</h2>
        <p className="mt-2 text-sm text-slate-400">
          While recording, key presses and mouse coordinates are logged with timestamps into a live list below.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4" role="group" aria-label="Event counts">
          {[
            ["Keys", keyCount],
            ["Clicks", clickCount],
            ["Mouse moves", moveCount],
            ["Total", events.length],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{label as string}</p>
              <p className="mt-1 text-2xl font-black text-white">{value as number}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportJson}
            disabled={events.length === 0}
            className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-40"
          >
            Export JSON dataset
          </button>
          <button
            type="button"
            onClick={clearLog}
            disabled={events.length === 0}
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-40"
          >
            Clear log
          </button>
        </div>
        <div className="mt-4 max-h-64 overflow-auto rounded-2xl border border-white/10 bg-black/40 p-3" aria-live="polite" aria-label="Logged input events">
          {events.length === 0 ? (
            <p className="p-2 text-sm text-slate-500">No input events yet — start recording, then type or move the mouse.</p>
          ) : (
            <ul className="space-y-1 font-mono text-xs text-slate-300">
              {events.slice(-100).map((e, i) => (
                <li key={`${e.t}-${i}`}>
                  <span className="text-cyan-300">+{e.t.toFixed(2)}s</span> [{e.kind}] {e.detail}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
