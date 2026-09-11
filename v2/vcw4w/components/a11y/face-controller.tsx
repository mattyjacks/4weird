"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  A11Y_EVENT,
  WEBCAM_POSITIONS,
  isWebcamPosition,
  loadA11y,
  saveA11y,
  type WebcamPosition,
} from "@/lib/a11y";

export type FaceGameInput =
  | { kind: "click"; x?: number; y?: number }
  | { kind: "rightclick"; x?: number; y?: number }
  | { kind: "key"; key: string };

type Status =
  | { state: "idle" }
  | { state: "starting" }
  | { state: "running"; backend: "mediapipe" | "motion-fallback" }
  | { state: "error"; message: string };

const COOLDOWN_MS = 900;
// MediaPipe FaceLandmarker (478 pts) indices.
const LEFT_EYE = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380];
const MOUTH_LEFT = 61;
const MOUTH_RIGHT = 291;
const MOUTH_TOP = 13;
const MOUTH_BOTTOM = 14;
const NOSE_TIP = 1;
const LEFT_EYE_OUTER = 33;
const RIGHT_EYE_OUTER = 263;
const FOREHEAD = 10;
const CHIN = 152;

type Pt = { x: number; y: number };

function ear(pts: Pt[], idx: number[]): number {
  const p = (i: number) => pts[idx[i]];
  const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
  const horiz = dist(p(0), p(3)) || 1;
  return (dist(p(1), p(5)) + dist(p(2), p(4))) / (2 * horiz);
}

/**
 * Per-webcam angular offsets: the camera sees the face from a different
 * angle than the screen the user looks at, so neutral nose position is not
 * centered in camera space. We subtract the expected offset for the chosen
 * mount before gain is applied.
 */
function webcamOffset(webcam: WebcamPosition): { x: number; y: number } {
  switch (webcam) {
    case "left":
      return { x: -0.06, y: 0 };
    case "right":
      return { x: 0.06, y: 0 };
    case "above":
      return { x: 0, y: -0.05 };
    case "below":
      return { x: 0, y: 0.05 };
    case "phone":
      return { x: 0, y: 0.08 };
    default:
      return { x: 0, y: 0 };
  }
}

/**
 * Face + head gameplay controller.
 *
 * Two channels, both on-device:
 *  - Gestures: left wink = left click, right wink = right click, held
 *    smile = configurable key. Both-eyes shut is a natural blink: ignored.
 *  - Head pointer: nose direction (nose tip vs. eye midpoint, normalized by
 *    face size) drives an on-screen cursor, compensated for where the webcam
 *    sits (front / phone / left / right / above / below). Calibrate while
 *    looking at the screen center; gain + smoothing are adjustable.
 *
 * Clicks land twice: the DOM under the head cursor (menus/shell buttons)
 * and the game via onGameInput, which the play shell forwards through the
 * runtime-bridge postMessage channel (reaches cross-origin iframes where
 * synthetic DOM events cannot).
 */
export function FaceController({ onGameInput }: { onGameInput?: (input: FaceGameInput) => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [lastGesture, setLastGesture] = useState("—");
  const [smileToClick, setSmileToClick] = useState(true);
  const [headPointer, setHeadPointer] = useState(() => loadA11ySafe().headPointer);
  const [webcam, setWebcam] = useState<WebcamPosition>(() => loadA11ySafe().webcam);
  const [gain, setGain] = useState(() => loadA11ySafe().headGain);
  const [smoothing, setSmoothing] = useState(() => loadA11ySafe().headSmooth);
  const [smileKey, setSmileKey] = useState(() => loadA11ySafe().smileKey);
  const [neutral, setNeutral] = useState<{ x: number; y: number } | null>(null);
  const [cursor, setCursor] = useState({ x: 0.5, y: 0.5 });
  const [noseVec, setNoseVec] = useState({ x: 0, y: 0 });

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const landmarkerRef = useRef<{ detectForVideo: (v: HTMLVideoElement, t: number) => { faceLandmarks?: Pt[][] } } | null>(null);
  const runningRef = useRef(false);
  const lastFireRef = useRef(0);
  const baselineRef = useRef<number | null>(null);
  const neutralRef = useRef<{ x: number; y: number } | null>(null);
  const cursorRef = useRef({ x: 0.5, y: 0.5 });
  const holdRef = useRef<{ gesture: string; frames: number }>({ gesture: "", frames: 0 });
  const pointerRef = useRef({ x: -1, y: -1 });
  const cfgRef = useRef({ headPointer, webcam, gain, smoothing, smileToClick, smileKey });
  cfgRef.current = { headPointer, webcam, gain, smoothing, smileToClick, smileKey };
  const onGameInputRef = useRef(onGameInput);
  onGameInputRef.current = onGameInput;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  function loadA11ySafe() {
    try {
      return loadA11y();
    } catch {
      return { headPointer: false, webcam: "front", headGain: 1.6, headSmooth: 0.75, smileKey: " " } as ReturnType<typeof loadA11y>;
    }
  }

  const persistHeadCfg = (patch: { headPointer?: boolean; webcam?: WebcamPosition; headGain?: number; headSmooth?: number; smileKey?: string }) => {
    try {
      const s = loadA11y();
      saveA11y({ ...s, ...patch });
    } catch {
      /* storage locked; local state still applies */
    }
  };

  const cursorPoint = () => {
    if (cfgRef.current.headPointer) {
      return {
        x: Math.round(cursorRef.current.x * window.innerWidth),
        y: Math.round(cursorRef.current.y * window.innerHeight),
      };
    }
    const { x, y } = pointerRef.current;
    return x >= 0 ? { x, y } : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  };

  const fire = useCallback((gesture: "left-wink" | "right-wink" | "smile") => {
    const now = performance.now();
    if (now - lastFireRef.current < COOLDOWN_MS) return;
    lastFireRef.current = now;
    setLastGesture(
      gesture === "left-wink" ? "😉 Left wink → left click" : gesture === "right-wink" ? "😉 Right wink → right click" : `😄 Smile → key "${cfgRef.current.smileKey === " " ? "Space" : cfgRef.current.smileKey}"`,
    );
    const { x, y } = cursorPoint();
    try {
      const el = document.elementFromPoint(x, y);
      const clickable = (el as HTMLElement | null)?.closest?.(
        'button, a[href], input, select, [role="button"], canvas, iframe',
      ) as HTMLElement | null;
      if (gesture === "smile") {
        onGameInputRef.current?.({ kind: "key", key: cfgRef.current.smileKey });
        if (clickable && ["BUTTON", "A", "INPUT", "SELECT"].includes(clickable.tagName)) clickable.click();
      } else if (clickable && ["BUTTON", "A", "INPUT", "SELECT"].includes(clickable.tagName)) {
        clickable.click();
        onGameInputRef.current?.(gesture === "right-wink" ? { kind: "rightclick", x, y } : { kind: "click", x, y });
      } else if (el instanceof HTMLElement) {
        el.dispatchEvent(
          new MouseEvent(gesture === "right-wink" ? "contextmenu" : "click", {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            button: gesture === "right-wink" ? 2 : 0,
          }),
        );
        onGameInputRef.current?.(gesture === "right-wink" ? { kind: "rightclick", x, y } : { kind: "click", x, y });
      } else {
        onGameInputRef.current?.(gesture === "right-wink" ? { kind: "rightclick", x, y } : { kind: "click", x, y });
      }
    } catch {
      try {
        onGameInputRef.current?.(gesture === "smile" ? { kind: "key", key: cfgRef.current.smileKey } : gesture === "right-wink" ? { kind: "rightclick", x, y } : { kind: "click", x, y });
      } catch {
        /* bridge unavailable */
      }
    }
  }, []);

  const stop = useCallback(() => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    landmarkerRef.current = null;
    baselineRef.current = null;
    holdRef.current = { gesture: "", frames: 0 };
    for (const track of streamRef.current?.getTracks() ?? []) {
      try {
        track.stop();
      } catch {
        /* already stopped */
      }
    }
    streamRef.current = null;
    setStatus({ state: "idle" });
  }, []);

  useEffect(() => stop, [stop]);

  /** Nose-direction vector in face-normalized units, webcam-compensated. */
  const noseVector = (face: Pt[], webcamPos: WebcamPosition) => {
    const midX = (face[LEFT_EYE_OUTER].x + face[RIGHT_EYE_OUTER].x) / 2;
    const midY = (face[LEFT_EYE_OUTER].y + face[RIGHT_EYE_OUTER].y) / 2;
    const faceW = Math.abs(face[RIGHT_EYE_OUTER].x - face[LEFT_EYE_OUTER].x) || 1;
    const faceH = Math.abs(face[CHIN].y - face[FOREHEAD].y) || 1;
    const off = webcamOffset(webcamPos);
    // Mirror X: camera image is mirrored, head-turn-right must move cursor right.
    return {
      x: -((face[NOSE_TIP].x - midX) / faceW) - off.x,
      y: (face[NOSE_TIP].y - midY) / faceH - off.y,
    };
  };

  const loop = useCallback(() => {
    if (!runningRef.current) return;
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    const cfg = cfgRef.current;
    if (video && landmarker && video.readyState >= 2 && video.videoWidth > 0) {
      try {
        const result = landmarker.detectForVideo(video, performance.now());
        const face = result.faceLandmarks?.[0];
        if (face) {
          // --- head pointer ---
          const vec = noseVector(face, cfg.webcam);
          const rel = neutralRef.current ? { x: vec.x - neutralRef.current.x, y: vec.y - neutralRef.current.y } : vec;
          setNoseVec({ x: rel.x, y: rel.y });
          if (cfg.headPointer) {
            const target = {
              x: Math.min(1, Math.max(0, 0.5 + rel.x * cfg.gain * 4)),
              y: Math.min(1, Math.max(0, 0.5 + rel.y * cfg.gain * 4)),
            };
            const s = cfg.smoothing;
            cursorRef.current = {
              x: cursorRef.current.x * s + target.x * (1 - s),
              y: cursorRef.current.y * s + target.y * (1 - s),
            };
            setCursor({ ...cursorRef.current });
          }
          // --- gestures ---
          const leftEar = ear(face, LEFT_EYE);
          const rightEar = ear(face, RIGHT_EYE);
          const leftClosed = leftEar < 0.19;
          const rightClosed = rightEar < 0.19;
          const mouthW = Math.hypot(face[MOUTH_RIGHT].x - face[MOUTH_LEFT].x, face[MOUTH_RIGHT].y - face[MOUTH_LEFT].y);
          const mouthH = Math.hypot(face[MOUTH_BOTTOM].x - face[MOUTH_TOP].x, face[MOUTH_BOTTOM].y - face[MOUTH_TOP].y) || 1;
          const ratio = mouthW / mouthH;
          if (baselineRef.current === null) baselineRef.current = ratio;
          const smiled = ratio > baselineRef.current * 1.18 && ratio > 2.6;
          let gesture = "";
          if (leftClosed && rightClosed) gesture = ""; // natural blink: never fires
          else if (leftClosed && !rightClosed) gesture = "left-wink";
          else if (rightClosed && !leftClosed) gesture = "right-wink";
          else if (smiled) gesture = "smile";
          if (gesture && gesture === holdRef.current.gesture) holdRef.current.frames += 1;
          else holdRef.current = { gesture, frames: gesture ? 1 : 0 };
          if (holdRef.current.frames >= 2) {
            if (gesture === "smile" && !cfg.smileToClick) {
              /* smile click disabled */
            } else if (gesture) {
              fire(gesture as "left-wink" | "right-wink" | "smile");
              holdRef.current.frames = -6;
            }
          }
        }
      } catch {
        /* per-frame errors are transient; keep looping */
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [fire]);

  const start = useCallback(async () => {
    setStatus({ state: "starting" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("preview unavailable");
      video.srcObject = stream;
      await video.play().catch(() => undefined);
    } catch {
      setStatus({ state: "error", message: "Camera blocked — allow camera access and try again. Nothing is recorded." });
      return;
    }
    try {
      // Untyped CDN import: no npm dep, model loads on-device at runtime.
      const vision = (await Function(
        "return import(/* webpackIgnore: true */ 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs')",
      )()) as {
        FilesetResolver: { forVisionTasks: (wasm: string) => Promise<unknown> };
        FaceLandmarker: {
          createFromOptions: (
            fileset: unknown,
            opts: {
              baseOptions: { modelAssetPath: string; delegate: string };
              runningMode: string;
              numFaces: number;
            },
          ) => Promise<{ detectForVideo: (v: HTMLVideoElement, t: number) => { faceLandmarks?: Pt[][] } }>;
        };
      };
      const fileset = await vision.FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
      );
      const landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numFaces: 1,
      });
      landmarkerRef.current = landmarker as unknown as NonNullable<typeof landmarkerRef.current>;
      runningRef.current = true;
      setStatus({ state: "running", backend: "mediapipe" });
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      runningRef.current = true;
      setStatus({ state: "running", backend: "motion-fallback" });
    }
  }, [loop]);

  const calibrate = () => {
    neutralRef.current = { ...noseVec };
    setNeutral({ ...noseVec });
  };

  const showCursor = open && status.state === "running" && headPointer;

  return (
    <div className="rounded-2xl border border-white/15 bg-slate-950 p-4 sm:p-5">
      {showCursor && (
        <div
          aria-hidden="true"
          className="a11y-head-cursor"
          style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }}
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-black text-white">😄 Face + head controller</h2>
        <span className="text-xs text-slate-400">nose aims · left wink = click · right wink = right-click · smile = key</span>
        <span className="ml-auto flex gap-2">
          {!open ? (
            <button type="button" onClick={() => setOpen(true)} className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-200">
              Open face controller
            </button>
          ) : status.state === "idle" || status.state === "error" ? (
            <button type="button" onClick={() => void start()} className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-200">
              {status.state === "error" ? "Retry camera" : "Start camera"}
            </button>
          ) : (
            <button type="button" onClick={stop} className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
              Stop camera
            </button>
          )}
          {open && (
            <button type="button" onClick={() => { stop(); setOpen(false); }} className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
              Close
            </button>
          )}
        </span>
      </div>

      {open && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr]">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
            <video ref={videoRef} muted playsInline className="h-40 w-full object-cover" aria-label="Face controller camera preview" />
            <p className="px-2 py-1 text-center text-[11px] text-slate-400">Preview stays on this device</p>
          </div>
          <div className="text-sm text-slate-300">
            <p role="status">
              Status:{" "}
              {status.state === "idle" && "camera off"}
              {status.state === "starting" && "starting camera…"}
              {status.state === "running" && (status.backend === "mediapipe" ? "watching — aim with your nose, wink or smile to click" : "camera on, face model unreachable — test buttons below still drive the game")}
              {status.state === "error" && <span className="text-amber-200">{status.message}</span>}
            </p>
            <p className="mt-1">Last gesture: <b className="text-white">{lastGesture}</b></p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] p-3">
                <input
                  type="checkbox"
                  checked={headPointer}
                  onChange={(e) => { setHeadPointer(e.target.checked); persistHeadCfg({ headPointer: e.target.checked }); window.dispatchEvent(new CustomEvent(A11Y_EVENT)); }}
                  className="h-4 w-4 accent-cyan-300"
                />
                <span><span className="block font-bold text-white">Head pointer</span><span className="block text-xs text-slate-400">Nose direction moves the ✛ cursor</span></span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] p-3">
                <input type="checkbox" checked={smileToClick} onChange={(e) => setSmileToClick(e.target.checked)} className="h-4 w-4 accent-cyan-300" />
                <span><span className="block font-bold text-white">Smile sends key</span><span className="block text-xs text-slate-400">Uncheck for wink-only play</span></span>
              </label>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="rounded-xl border border-white/10 bg-white/[.04] p-3">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Webcam position</span>
                <select
                  value={webcam}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (isWebcamPosition(v)) { setWebcam(v); persistHeadCfg({ webcam: v }); }
                  }}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900 p-2 text-sm text-white"
                >
                  {WEBCAM_POSITIONS.map((p) => <option key={p.id} value={p.id}>{p.label} — {p.hint}</option>)}
                </select>
              </label>
              <label className="rounded-xl border border-white/10 bg-white/[.04] p-3">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Smile key</span>
                <select
                  value={smileKey}
                  onChange={(e) => { setSmileKey(e.target.value); persistHeadCfg({ smileKey: e.target.value }); }}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900 p-2 text-sm text-white"
                >
                  {[" ", "Enter", "e", "f", "r", "p"].map((k) => (
                    <option key={k} value={k}>{k === " " ? "Space" : k}</option>
                  ))}
                </select>
              </label>
              <label className="rounded-xl border border-white/10 bg-white/[.04] p-3">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Pointer speed {gain.toFixed(1)}×</span>
                <input type="range" min={0.4} max={5} step={0.1} value={gain} onChange={(e) => { const v = Number(e.target.value); setGain(v); persistHeadCfg({ headGain: v }); }} className="mt-1 w-full accent-cyan-300" aria-label="Head pointer speed" />
              </label>
              <label className="rounded-xl border border-white/10 bg-white/[.04] p-3">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Steadiness {(smoothing * 100).toFixed(0)}%</span>
                <input type="range" min={0} max={0.95} step={0.05} value={smoothing} onChange={(e) => { const v = Number(e.target.value); setSmoothing(v); persistHeadCfg({ headSmooth: v }); }} className="mt-1 w-full accent-cyan-300" aria-label="Head pointer steadiness" />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={calibrate} className="rounded-full bg-cyan-300 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-200" title="Look at the screen center, then press to zero the pointer">
                ◎ Calibrate (look at center)
              </button>
              <button type="button" onClick={() => fire("left-wink")} className="rounded-full border border-cyan-300/50 px-4 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-300/10">Test left click</button>
              <button type="button" onClick={() => fire("right-wink")} className="rounded-full border border-cyan-300/50 px-4 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-300/10">Test right click</button>
              <button type="button" onClick={() => onGameInputRef.current?.({ kind: "key", key: smileKey })} className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10">
                Send {smileKey === " " ? "Space" : smileKey} key
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {neutral ? `Calibrated (dx ${neutral.x.toFixed(3)}, dy ${neutral.y.toFixed(3)}). ` : "Not calibrated — pointer assumes your neutral gaze is centered. "}
              Both-eyes blinks never fire · ~0.9s cooldown between clicks · side webcams are angle-compensated.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
