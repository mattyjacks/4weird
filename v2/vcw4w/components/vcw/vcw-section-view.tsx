"use client";

import { useEffect, useState } from "react";

type HealthState = {
  status?: string;
  reason?: string;
};

const STATUS_COPY: Record<string, string> = {
  ok: "Cloud service online.",
  unconfigured:
    "Browser workspace ready — the optional cloud service is not configured on this deployment.",
  degraded: "Cloud service is degraded — the browser workspace still runs locally.",
  unavailable:
    "Cloud service unreachable — the browser workspace still runs locally.",
};

export function VcwSectionView({
  title,
  intro,
  frameSrc,
  frameTitle,
}: {
  title: string;
  intro: string;
  frameSrc: string;
  frameTitle: string;
}) {
  const [health, setHealth] = useState<HealthState | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/vcw/health", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: HealthState) => {
        if (live) setHealth(data);
      })
      .catch(() => {
        if (live) setHealth({ status: "unavailable", reason: "connection_failed" });
      });
    return () => {
      live = false;
    };
  }, []);

  const status = health?.status ?? "checking";
  const copy =
    status === "checking"
      ? "Checking service status…"
      : (STATUS_COPY[status] ?? `Service status: ${status}.`);

  return (
    <div className="bg-slate-950 text-white">
      <article className="mx-auto max-w-6xl px-4 py-10 sm:px-5">
        <p className="text-xs font-bold tracking-widest text-cyan-300">
          4WEIRD / VIBECODEWORKER
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
          {intro}
        </p>
        <p
          className="mt-4 inline-block rounded-full border border-white/15 px-4 py-1 text-xs text-slate-300"
          role="status"
        >
          <span className="text-cyan-300">●</span> {copy}
        </p>
        <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-black">
          <iframe
            src={frameSrc}
            title={frameTitle}
            className="h-[80vh] w-full"
            allowFullScreen
          />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          The workspace above is the live VibeCodeWorker surface. Iframes stay
          on first-party 4weird origins only.
        </p>
      </article>
    </div>
  );
}
