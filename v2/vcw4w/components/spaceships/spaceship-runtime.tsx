"use client";

import { useEffect, useState } from "react";

export function SpaceshipRuntime() {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const retry = () => { setReady(false); setFailed(false); setAttempt((value) => value + 1); };

  useEffect(() => {
    const id = window.setTimeout(() => { if (!ready) setFailed(true); }, 8000);
    return () => window.clearTimeout(id);
  }, [ready, attempt]);

  return <div className="relative h-[calc(100vh-73px)] w-full bg-black"><div role="status" className="absolute left-4 top-4 z-10 rounded-lg bg-black/75 px-3 py-2 text-sm text-white/80">{ready ? "Simulation ready" : failed ? "The simulation is taking longer than expected. Check WebGL support or reload the page." : "Loading simulation…"}</div>{failed && <button type="button" onClick={retry} className="absolute left-4 top-16 z-10 rounded-lg bg-cyan-300 px-3 py-2 text-sm font-bold text-slate-950">Reload simulation</button>}<iframe key={attempt} title="4weird Spaceship Simulation" src="/spaceships.html" onLoad={() => { setReady(true); setFailed(false); }} onError={() => setFailed(true)} className="h-full w-full border-0" allow="fullscreen; gamepad" sandbox="allow-forms allow-modals allow-pointer-lock allow-same-origin allow-scripts" /></div>;
}
