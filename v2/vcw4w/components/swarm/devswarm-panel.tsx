"use client";

import { useEffect, useState } from "react";

type CountKey = "open" | "claimed" | "in_progress" | "blocked" | "done";
type LinkKey = "brain" | "lanes" | "queue" | "memory" | "tasks" | "for_bots";

type DevSwarmStatus = Partial<{
  version: number;
  updated: string;
  swarm: string;
  counts: Partial<Record<CountKey, number>>;
  lanes: unknown[];
  links: Partial<Record<LinkKey, string>>;
}>;

const COUNT_CELLS: { key: CountKey; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "claimed", label: "Claimed" },
  { key: "in_progress", label: "In progress" },
  { key: "blocked", label: "Blocked" },
  { key: "done", label: "Done" },
];

const DEFAULT_LINKS: Record<LinkKey, string> = {
  brain: "/swarm/BRAIN.md",
  lanes: "/swarm/LANES.md",
  queue: "/swarm/QUEUE.md",
  memory: "/swarm/MEMORY.md",
  tasks: "/swarm/TASKS/",
  for_bots: "/swarm/FOR-BOTS.md",
};

const LINK_LABELS: { key: LinkKey; label: string }[] = [
  { key: "brain", label: "Brain" },
  { key: "lanes", label: "Lanes" },
  { key: "queue", label: "Queue" },
  { key: "memory", label: "Memory" },
  { key: "tasks", label: "Tasks" },
  { key: "for_bots", label: "For bots" },
];

const FALLBACK_BRAIN_HREF = DEFAULT_LINKS.brain;

export default function DevSwarmPanel() {
  const [data, setData] = useState<DevSwarmStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Edge-cached for 60s (see next.config /swarm/:path*): repeat views
        // resolve from cache instead of origin, so the board paints in ms.
        const res = await fetch("/swarm/STATUS.json", { next: { revalidate: 60 } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as DevSwarmStatus;
        if (!cancelled) {
          setData(json ?? {});
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    // Re-poll on a slow cadence so an open tab stays truthful without
    // hammering the bus (bots poll STATUS.json; humans get the same view).
    const timer = setInterval(() => void load(), 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (loading && !data) {
    return (
      <div aria-busy="true" className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {COUNT_CELLS.map((cell) => (
            <div key={cell.key} className="rounded-lg bg-slate-800/60 px-3 py-4">
              <div className="h-3 w-16 animate-pulse rounded bg-slate-700" />
              <div className="mt-2 h-6 w-10 animate-pulse rounded bg-slate-700" />
            </div>
          ))}
        </div>
        <div className="mt-4 h-3 w-40 animate-pulse rounded bg-slate-800" />
      </div>
    );
  }

  if ((error && !data) || (!loading && !data)) {
    return (
      <p className="text-sm text-slate-400">
        Live swarm status is unavailable right now — read the{" "}
        <a className="text-cyan-300 hover:underline" href={FALLBACK_BRAIN_HREF}>
          DevSwarm brain
        </a>
        .
      </p>
    );
  }

  const status: DevSwarmStatus = data ?? {};
  const counts = status.counts ?? {};
  const links = status.links ?? {};
  const updated = typeof status.updated === "string" && status.updated.length > 0 ? status.updated : null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {COUNT_CELLS.map((cell) => {
          const raw = counts[cell.key];
          const value = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
          return (
            <div key={cell.key} className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{cell.label}</p>
              <p className="mt-1 text-2xl font-black text-cyan-300">{value}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        {updated ? `Updated ${updated}` : "status pending"}
      </p>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {LINK_LABELS.map((link) => {
          const href = links[link.key] ?? DEFAULT_LINKS[link.key];
          return (
            <li key={link.key}>
              <a className="text-cyan-300 hover:underline" href={href}>
                {link.label}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
