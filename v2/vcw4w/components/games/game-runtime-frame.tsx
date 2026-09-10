"use client";

import { useEffect, useRef, useState } from "react";

type RuntimeEvent = {
  version?: number;
  type?: string;
  slot?: number;
  schema_version?: number;
  data?: unknown;
  message?: string;
  score?: number;
};

export function GameRuntimeFrame({ slug, title, src }: { slug: string; title: string; src: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState("Loading original HTML runtime…");
  const [score, setScore] = useState<number | null>(null);
  const [showTouchPad, setShowTouchPad] = useState(false);

  const sendKey = (key: string, pressed: boolean) => {
    const target = frame.current?.contentWindow;
    if (!target) return;
    const event = new KeyboardEvent(pressed ? "keydown" : "keyup", { key, code: key === " " ? "Space" : `Arrow${key.replace("Arrow", "")}`, bubbles: true });
    target.dispatchEvent(event);
    target.document?.dispatchEvent(event);
  };

  const resetSave = async () => {
    if (!window.confirm("Reset this game's cloud save? This cannot be undone.")) return;
    const response = await fetch(`/api/saves?game=${encodeURIComponent(slug)}&slot=1`, { method: "DELETE", credentials: "include" });
    setStatus(response.ok ? "Cloud save reset." : "Unable to reset cloud save.");
    if (response.ok) frame.current?.contentWindow?.postMessage({ version: 1, type: "reset", slug }, new URL(src, window.location.href).origin);
  };

  useEffect(() => {
    setStatus("Loading original HTML runtime…");
    loadTimer.current = setTimeout(() => setStatus("The game is taking longer than expected to load. You can still use the original runtime URL."), 8000);
    return () => { if (loadTimer.current) clearTimeout(loadTimer.current); };
  }, [src]);

  const prepareRuntime = () => {
    if (loadTimer.current) clearTimeout(loadTimer.current);
    setStatus("");
    const document = frame.current?.contentDocument;
    if (!document || document.getElementById("fourweird-v2-runtime-shell")) return;
    const style = document.createElement("style");
    style.id = "fourweird-v2-runtime-shell";
    style.textContent = `
      /* V2 embeds the game, so hide the legacy site shell rather than duplicate it. */
      #TEMPLATE-4weird-nav-placeholder, .TEMPLATE-4weird-game-header,
      .TEMPLATE-4weird-game-info-panel, .TEMPLATE-4weird-credits-section,
      .TEMPLATE-4weird-bio-section, .TEMPLATE-4weird-more-games,
      #TEMPLATE-4weird-footer-placeholder { display: none !important; }
      html, body { min-height: 100% !important; height: 100% !important; overflow: hidden !important; }
      .TEMPLATE-4weird-game-page, .TEMPLATE-4weird-game-main { margin: 0 !important; padding: 0 !important; min-height: 100% !important; height: 100% !important; max-width: none !important; }
      .TEMPLATE-4weird-game-frame { width: 100% !important; height: 100% !important; min-height: 100% !important; border: 0 !important; border-radius: 0 !important; }
    `;
    document.head.append(style);
  };

  useEffect(() => {
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const updateTouchMode = () => setShowTouchPad(coarsePointer.matches);
    updateTouchMode();
    coarsePointer.addEventListener("change", updateTouchMode);
    return () => coarsePointer.removeEventListener("change", updateTouchMode);
  }, []);

  useEffect(() => {
    const origin = new URL(src, window.location.href).origin;
    const onMessage = (event: MessageEvent<RuntimeEvent>) => {
      if (event.origin !== origin || event.source !== frame.current?.contentWindow || !event.data || event.data.version !== 1) return;
      const payload = event.data;
      if (payload.type === "score" && Number.isFinite(payload.score)) {
        setScore(payload.score!);
        return;
      }
      if (payload.type === "ready") {
        setStatus("");
        frame.current?.contentWindow?.postMessage({ version: 1, type: "host-ready", slug }, origin);
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
  }, [slug, src]);

  const command = (type: "pause" | "resume" | "fullscreen") => {
    const origin = new URL(src, window.location.href).origin;
    if (type === "fullscreen") void frame.current?.requestFullscreen?.();
    frame.current?.contentWindow?.postMessage({ version: 1, type, slug }, origin);
  };

  const padButton = (label: string, key: string, className = "") => <button type="button" aria-label={label} className={`grid h-12 w-12 touch-none place-items-center rounded-full border border-cyan-100/40 bg-slate-950/85 text-lg text-cyan-50 active:bg-cyan-400 active:text-black ${className}`} onPointerDown={(event) => { event.preventDefault(); sendKey(key, true); }} onPointerUp={() => sendKey(key, false)} onPointerCancel={() => sendKey(key, false)} onPointerLeave={() => sendKey(key, false)}>{label}</button>;
  return <div className="relative h-full w-full"><div className="absolute right-2 top-2 z-20 flex max-w-[calc(100%-1rem)] flex-wrap justify-end gap-1 rounded bg-black/70 p-1.5">{score !== null && <span role="status" className="px-2 py-1 text-xs text-cyan-200">Score: {score}</span>}<button type="button" onClick={() => command("pause")} className="hidden rounded px-2 py-1 text-xs text-white hover:bg-white/20 sm:inline">Pause</button><button type="button" onClick={() => command("resume")} className="hidden rounded px-2 py-1 text-xs text-white hover:bg-white/20 sm:inline">Resume</button><button type="button" onClick={() => command("fullscreen")} className="rounded px-2 py-1 text-xs text-white hover:bg-white/20">Fullscreen</button><button type="button" onClick={resetSave} className="rounded px-2 py-1 text-xs text-amber-200 hover:bg-white/20">Reset save</button></div><p role="status" className={`absolute left-2 top-2 z-20 max-w-[70%] rounded bg-black/70 px-3 py-1 text-xs text-white/80 ${status ? "" : "sr-only"}`}>{status}</p>{showTouchPad && <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex items-end justify-between"><div className="pointer-events-auto grid grid-cols-3 gap-1">{padButton("↑", "ArrowUp", "col-start-2")}{padButton("←", "ArrowLeft")}{padButton("↓", "ArrowDown")}{padButton("→", "ArrowRight")}</div><div className="pointer-events-auto flex gap-2">{padButton("A", " ")}{padButton("↻", "r")}</div></div>}<iframe ref={frame} title={title} src={src} onLoad={prepareRuntime} onError={() => setStatus("The game could not be loaded. Open the original runtime URL to debug it.")} className="h-full w-full touch-manipulation border-0" allow="autoplay; fullscreen; gamepad" sandbox="allow-forms allow-modals allow-pointer-lock allow-same-origin allow-scripts" /></div>;
}
