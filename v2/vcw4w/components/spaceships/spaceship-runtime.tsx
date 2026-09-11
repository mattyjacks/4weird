"use client";

import { useEffect, useState } from "react";

export function SpaceshipRuntime() {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const retry = () => { setReady(false); setFailed(false); setAttempt((value) => value + 1); };

  useEffect(() => {
    // The static embed (public/spaceships.html) boots Three.js async, so the
    // iframe onLoad event alone is not a readiness signal. Poll the
    // same-origin frame for the game entrypoint instead; fall back to
    // onLoad success if polling is blocked. Hidden tabs skip polls so the
    // GPU/CPU idles instead of spinning for an unseen sim.
    const started = Date.now();
    const id = window.setInterval(() => {
      if (document.hidden) return;
      const frame = document.querySelector<HTMLIFrameElement>(
        'iframe[data-spaceship-sim]',
      );
      try {
        const win = frame?.contentWindow as unknown as
          | { spaceGameMain?: { initialized?: boolean }; spaceGameCore?: unknown }
          | undefined;
        if (win?.spaceGameMain?.initialized || win?.spaceGameCore) {
          setReady(true);
          setFailed(false);
          window.clearInterval(id);
        } else if (Date.now() - started > 15000) {
          window.clearInterval(id);
          setFailed((wasFailed) => (ready ? wasFailed : true));
        }
      } catch {
        // Cross-origin / blocked access: stop polling, let onLoad decide.
        window.clearInterval(id);
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [attempt, ready]);

  return <div className="perf-frame relative h-[calc(100vh-73px)] w-full bg-black"><div role="status" className="absolute left-4 top-4 z-10 rounded-lg bg-black/75 px-3 py-2 text-sm text-white/80">{ready ? "Simulation ready" : failed ? "The simulation is taking longer than expected. Check WebGL support or reload the page." : "Loading simulation…"}</div>{failed && <button type="button" onClick={retry} className="absolute left-4 top-16 z-10 rounded-lg bg-cyan-300 px-3 py-2 text-sm font-bold text-slate-950">Reload simulation</button>}<iframe data-spaceship-sim key={attempt} title="4weird Spaceship Simulation" src="/spaceships.html?v=11" onLoad={() => { setFailed(false); }} onError={() => setFailed(true)} className="h-full w-full border-0" allow="fullscreen; gamepad" sandbox="allow-forms allow-modals allow-pointer-lock allow-same-origin allow-scripts" /></div>;
}
