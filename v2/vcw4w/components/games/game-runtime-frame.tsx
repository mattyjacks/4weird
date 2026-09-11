"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { A11Y_EVENT, loadA11y } from "@/lib/a11y";
import { FaceController, type FaceGameInput } from "@/components/a11y/face-controller";

type RuntimeEvent = {
  version?: number;
  type?: string;
  slot?: number;
  schema_version?: number;
  data?: unknown;
  message?: string;
  score?: number;
  bytes?: number;
  active_seconds?: number;
  actions?: number;
};

// First-party hosts the shell and the static game bundles can be served
// from. Kept in sync with public/games/html/runtime-bridge.js. Exported so
// other shell listeners (e.g. the Buddy widget's score feed) can apply the
// same origin allowlist instead of trusting every iframe on the page.
export const TRUSTED_GAME_ORIGINS = [
  "https://4weird.com",
  "https://www.4weird.com",
];

function originOf(src: string) {
  try {
    return new URL(src, window.location.href).origin;
  } catch {
    return window.location.origin;
  }
}

export function GameRuntimeFrame({ slug, title, src }: { slug: string; title: string; src: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The bundle can end up on the apex/www counterpart of the shell's origin
  // (Vercel redirects apex -> www, so a cached apex shell frames a www
  // bundle). Track the runtime's actual origin from its messages and accept
  // handshakes from any first-party host instead of the shell origin only.
  const runtimeOrigin = useRef<string | null>(null);
  const postToRuntime = useCallback(
    (message: Record<string, unknown>) => {
      frame.current?.contentWindow?.postMessage(message, runtimeOrigin.current ?? originOf(src));
    },
    [src],
  );
  const [status, setStatus] = useState("Loading original HTML runtime…");
  const [score, setScore] = useState<number | null>(null);
  const [showTouchPad, setShowTouchPad] = useState(false);

  const pushA11y = useCallback(() => {
    try {
      postToRuntime({ version: 1, type: "a11y", slug, settings: loadA11y() });
    } catch {
      /* bridge absent; site-level classes still apply */
    }
  }, [slug, postToRuntime]);

  const sendKey = (key: string, pressed: boolean) => {
    const target = frame.current?.contentWindow;
    if (!target) return;
    try {
      const code = key === " " ? "Space" : key.startsWith("Arrow") ? key : `Key${key.toUpperCase()}`;
      const event = new KeyboardEvent(pressed ? "keydown" : "keyup", { key, code, bubbles: true });
      target.dispatchEvent(event);
      target.document?.dispatchEvent(event);
    } catch {
      // Cross-origin runtime (apex/www redirect): synthetic keys cannot be
      // dispatched. The touch pad stays visible but inert rather than throwing.
    }
  };

  /** Assistive input (face winks, head pointer, switch): normalized 0..1. */
  const handleGameInput = useCallback(
    (input: FaceGameInput) => {
      const rect = frame.current?.getBoundingClientRect();
      if (input.kind === "key") {
        sendKey(input.key, true);
        setTimeout(() => sendKey(input.key, false), 60);
        postToRuntime({ version: 1, type: "input", slug, action: "key", key: input.key });
        return;
      }
      let nx = 0.5;
      let ny = 0.5;
      if (typeof input.x === "number" && typeof input.y === "number" && rect && rect.width > 0 && rect.height > 0) {
        nx = Math.min(1, Math.max(0, (input.x - rect.left) / rect.width));
        ny = Math.min(1, Math.max(0, (input.y - rect.top) / rect.height));
      }
      postToRuntime({
        version: 1,
        type: "input",
        slug,
        action: input.kind === "rightclick" ? "rightclick" : "click",
        nx,
        ny,
      });
    },
    [slug, postToRuntime],
  );

  useEffect(() => {
    setStatus("Loading game…");
    loadTimer.current = setTimeout(() => setStatus("The game is taking longer than expected to load. You can still open the standalone runtime URL in a new tab."), 8000);
    return () => { if (loadTimer.current) clearTimeout(loadTimer.current); };
  }, [src]);

  // The runtime bundle is game-only (the sync step strips the legacy site
  // chrome at build time), so the shell must NOT reach into the iframe's
  // document: that access throws cross-origin after an apex/www redirect and
  // is unnecessary same-origin. The postMessage handshake below ("ready")
  // is the single source of truth for load state.
  const handleLoad = () => {
    if (loadTimer.current) clearTimeout(loadTimer.current);
    setStatus("");
    pushA11y();
    focusGame();
  };

  const focusGame = () => {
    try {
      frame.current?.contentWindow?.focus();
    } catch {
      try {
        frame.current?.focus();
      } catch {
        /* iframe focus unavailable; keyboard still works after a click */
      }
    }
  };

  useEffect(() => {
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const updateTouchMode = () => setShowTouchPad(coarsePointer.matches);
    updateTouchMode();
    coarsePointer.addEventListener("change", updateTouchMode);
    return () => coarsePointer.removeEventListener("change", updateTouchMode);
  }, []);

  // Shell-side a11y changes (colorblind filter, reduced motion, …) must
  // reach the game document, where shell CSS cannot penetrate.
  useEffect(() => {
    const onA11y = () => pushA11y();
    window.addEventListener(A11Y_EVENT, onA11y);
    return () => window.removeEventListener(A11Y_EVENT, onA11y);
  }, [pushA11y]);

  useEffect(() => {
    const expected = originOf(src);
    const onMessage = (event: MessageEvent<RuntimeEvent>) => {
      if ((event.origin !== expected && !TRUSTED_GAME_ORIGINS.includes(event.origin)) || event.source !== frame.current?.contentWindow || !event.data || event.data.version !== 1) return;
      runtimeOrigin.current = event.origin;
      const origin = event.origin;
      const payload = event.data;
      if (payload.type === "score" && Number.isFinite(payload.score)) {
        setScore(payload.score!);
        return;
      }
      if (payload.type === "stats") {
        // Bridge-observed engagement (visible seconds + real inputs) for
        // legacy games that never learned the telemetry protocol. Guests
        // 401 here and are silently skipped; failures never surface as UI
        // noise. kills/deaths stay 0 - the bridge cannot observe them.
        const sec = Math.floor(Number(payload.active_seconds));
        const acts = Math.floor(Number(payload.actions));
        if (Number.isFinite(sec) && Number.isFinite(acts) && (sec > 0 || acts > 0)) {
          void fetch("/api/stats", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              game_slug: slug,
              active_seconds: Math.max(0, Math.min(3600, sec)),
              actions: Math.max(0, Math.min(100000, acts)),
              kills: 0,
              deaths: 0,
            }),
          }).catch(() => undefined);
        }
        return;
      }
      if (payload.type === "metering" && Number.isFinite(payload.bytes)) {
        // Cache accounting from inside the runtime (transferSize is 0 for
        // cache hits): re-broadcast where the play-metering gate listens.
        window.dispatchEvent(
          new CustomEvent("fourweird-metering", { detail: { bytes: Math.max(0, Math.floor(payload.bytes!)), slug } }),
        );
        return;
      }
      if (payload.type === "ready") {
        setStatus("");
        frame.current?.contentWindow?.postMessage({ version: 1, type: "host-ready", slug }, origin);
        pushA11y();
        void fetch(`/api/saves?game=${encodeURIComponent(slug)}&slot=1`, { credentials: "include" })
          .then((response) => { if (!response.ok) { setStatus("Cloud save unavailable; playing with local progress."); return null; } return response.json(); })
          .then((body) => {
            const save = Array.isArray(body?.saves) ? body.saves[0] : null;
            if (body && !Array.isArray(body.saves)) { setStatus("Cloud save data was invalid; playing with local progress."); return; }
            if (save?.data && typeof save.data === "object" && !Array.isArray(save.data)) frame.current?.contentWindow?.postMessage({ version: 1, type: "load", slot: save.slot, schema_version: save.schema_version ?? 1, data: save.data }, origin);
          })
          .catch(() => undefined);
      } else if (payload.type === "error") {
        setStatus(payload.message || "The game reported a runtime error.");
      } else if (payload.type === "save" && payload.data && typeof payload.data === "object") {
        const slot = Number.isInteger(payload.slot) && payload.slot! >= 1 && payload.slot! <= 3 ? payload.slot : 1;
        void fetch("/api/saves", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ game_slug: slug, slot, schema_version: Number.isInteger(payload.schema_version) ? payload.schema_version : 1, data: payload.data }),
        }).then((response) => { if (!response.ok) throw new Error("save_failed"); }).catch(() => setStatus("Cloud save unavailable; local progress is unchanged."));
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [slug, src, pushA11y]);

  const command = (type: "pause" | "resume" | "fullscreen") => {
    if (type === "fullscreen") void frame.current?.requestFullscreen?.();
    postToRuntime({ version: 1, type, slug });
  };

  const padButton = (label: string, key: string, className = "") => <button type="button" aria-label={label} className={`grid h-12 w-12 touch-none place-items-center rounded-full border border-cyan-100/40 bg-slate-950/85 text-lg text-cyan-50 active:bg-cyan-400 active:text-black ${className}`} onPointerDown={(event) => { event.preventDefault(); sendKey(key, true); }} onPointerUp={() => sendKey(key, false)} onPointerCancel={() => sendKey(key, false)} onPointerLeave={() => sendKey(key, false)}>{label}</button>;
  return (
    <div>
      <div className="perf-frame relative h-full w-full bg-black" onClick={focusGame}>
        <div className="absolute right-2 top-2 z-20 flex max-w-[calc(100%-1rem)] flex-wrap items-center justify-end gap-1 rounded bg-black/70 p-1.5">
          {score !== null && <span role="status" className="px-2 py-1 text-xs text-cyan-200">Score: {score}</span>}
          <button type="button" onClick={focusGame} className="hidden rounded px-2 py-1 text-xs text-white hover:bg-white/20 sm:inline" title="Focus the game so keyboard controls respond">Focus</button>
          <button type="button" onClick={() => command("pause")} className="hidden rounded px-2 py-1 text-xs text-white hover:bg-white/20 sm:inline">Pause</button>
          <button type="button" onClick={() => command("resume")} className="hidden rounded px-2 py-1 text-xs text-white hover:bg-white/20 sm:inline">Resume</button>
          <button type="button" onClick={() => command("fullscreen")} className="rounded px-2 py-1 text-xs text-white hover:bg-white/20">Fullscreen</button>
          <a href={src} target="_blank" rel="noopener" className="rounded px-2 py-1 text-xs text-white hover:bg-white/20" title="Open the standalone game window in a new tab">Pop out</a>
        </div>
        <p role="status" className={`absolute left-2 top-2 z-20 max-w-[70%] rounded bg-black/70 px-3 py-1 text-xs text-white/80 ${status ? "" : "sr-only"}`}>{status}</p>
        {showTouchPad && <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex items-end justify-between"><div className="pointer-events-auto grid grid-cols-3 gap-1">{padButton("↑", "ArrowUp", "col-start-2")}{padButton("←", "ArrowLeft")}{padButton("↓", "ArrowDown")}{padButton("→", "ArrowRight")}</div><div className="pointer-events-auto flex gap-2">{padButton("A", " ")}{padButton("↻", "r")}</div></div>}
        <iframe ref={frame} title={title} src={src} onLoad={handleLoad} onError={() => setStatus("The game could not be loaded. Try the Pop out link to open the standalone runtime.")} className="h-full w-full touch-manipulation border-0 bg-black" allow="autoplay; fullscreen; gamepad" sandbox="allow-forms allow-modals allow-pointer-lock allow-same-origin allow-scripts" />
      </div>
      <div className="mt-3">
        <FaceController onGameInput={handleGameInput} />
      </div>
    </div>
  );
}
