"use client";

import { useEffect, useState } from "react";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function TelemetryBar() {
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const t0 = Date.now();
    const id = window.setInterval(() => {
      setUptime(Math.floor((Date.now() - t0) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const mm = pad(Math.floor(uptime / 60));
  const ss = pad(uptime % 60);

  return (
    <div
      role="status"
      aria-label="Session telemetry: local agent, token usage, uptime"
      className="flex h-6 shrink-0 items-center gap-3 overflow-hidden rounded-md border border-emerald-400/20 bg-black px-2 font-mono text-[10px] text-emerald-300"
    >
      <span className="inline-flex items-center gap-1">
        <span aria-hidden="true" className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        agent: local
      </span>
      <span>tokens: 0 net calls</span>
      <span>
        uptime: {mm}:{ss}
      </span>
      <span className="ml-auto hidden text-emerald-500 sm:inline">▓▓ retro link ● 60hz</span>
    </div>
  );
}
