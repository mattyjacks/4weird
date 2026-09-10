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
  const [status, setStatus] = useState("Loading original HTML runtime…");
  const [score, setScore] = useState<number | null>(null);

  const resetSave = async () => {
    if (!window.confirm("Reset this game's cloud save? This cannot be undone.")) return;
    const response = await fetch(`/api/saves?game=${encodeURIComponent(slug)}&slot=1`, { method: "DELETE", credentials: "include" });
    setStatus(response.ok ? "Cloud save reset." : "Unable to reset cloud save.");
    if (response.ok) frame.current?.contentWindow?.postMessage({ version: 1, type: "reset", slug }, new URL(src, window.location.href).origin);
  };

  useEffect(() => {
    setStatus("Loading original HTML runtime…");
    const timer = setTimeout(() => setStatus("The game is taking longer than expected to load. You can still use the original runtime URL."), 8000);
    return () => clearTimeout(timer);
  }, [src]);

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

  return <div className="relative h-full w-full"><div className="absolute right-3 top-3 z-10 flex gap-2 rounded bg-black/70 p-2">{score !== null && <span role="status" className="px-2 py-1 text-xs text-cyan-200">Score: {score}</span>}<button type="button" onClick={() => command("pause")} className="rounded px-2 py-1 text-xs text-white hover:bg-white/20">Pause</button><button type="button" onClick={() => command("resume")} className="rounded px-2 py-1 text-xs text-white hover:bg-white/20">Resume</button><button type="button" onClick={() => command("fullscreen")} className="rounded px-2 py-1 text-xs text-white hover:bg-white/20">Fullscreen</button><button type="button" onClick={resetSave} className="rounded px-2 py-1 text-xs text-amber-200 hover:bg-white/20">Reset save</button></div><p role="status" className={`absolute left-3 top-3 z-10 rounded bg-black/70 px-3 py-1 text-xs text-white/80 ${status ? "" : "sr-only"}`}>{status}</p><iframe ref={frame} title={title} src={src} onLoad={() => setStatus("")} onError={() => setStatus("The game could not be loaded. Open the original runtime URL to debug it.")} className="h-full w-full border-0" allow="autoplay; fullscreen; gamepad" sandbox="allow-forms allow-modals allow-pointer-lock allow-same-origin allow-scripts" /></div>;
}
