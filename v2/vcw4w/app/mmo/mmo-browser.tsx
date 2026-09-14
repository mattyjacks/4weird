"use client";

/**
 * /mmo browser (web lane).
 *
 * Tries a live fetch of GET /api/mmo/quote first; ANY failure (offline,
 * 404, bad payload — the route may not exist yet) falls back to the validated
 * local demo seeds so the page never bricks navigation (fail-open safety).
 *
 * SSR-safe: all browser APIs (fetch runs in useEffect, BroadcastChannel emit
 * guarded by typeof window) stay out of the render path.
 */

import { useEffect, useMemo, useState } from "react";

export type Dimension = "1d" | "2d" | "3d" | "4d" | "5d";
export type AgeBand = "kids" | "teens" | "adults";

export interface MmorpgRealm {
  slug: string;
  name: string;
  dimension: Dimension;
  ageBand: AgeBand;
  /** Coins charged per player per minute. 0 with hostFree means free to join. */
  costPerMin: number;
  /** When true, the host pays server + load + rental so players join free. */
  hostFree: boolean;
  maxParty: number;
}

type Source = "live" | "demo";

const AGE_BANDS: AgeBand[] = ["kids", "teens", "adults"];

const DEMO_SEEDS: MmorpgRealm[] = [
  { slug: "ember-hold-1d", name: "Ember Hold", dimension: "1d", ageBand: "kids", costPerMin: 2, hostFree: true, maxParty: 8 },
  { slug: "lantern-deep-1d", name: "Lantern Deep", dimension: "1d", ageBand: "teens", costPerMin: 3, hostFree: false, maxParty: 12 },
  { slug: "ashfall-text-1d", name: "Ashfall Text", dimension: "1d", ageBand: "adults", costPerMin: 4, hostFree: false, maxParty: 16 },
  { slug: "grave-tide-2d", name: "Grave Tide", dimension: "2d", ageBand: "kids", costPerMin: 5, hostFree: true, maxParty: 10 },
  { slug: "neon-bastion-2d", name: "Neon Bastion", dimension: "2d", ageBand: "teens", costPerMin: 8, hostFree: false, maxParty: 24 },
  { slug: "hollow-crown-2d", name: "Hollow Crown", dimension: "2d", ageBand: "adults", costPerMin: 10, hostFree: false, maxParty: 32 },
  { slug: "skyforge-3d", name: "Skyforge Expanse", dimension: "3d", ageBand: "kids", costPerMin: 12, hostFree: true, maxParty: 12 },
  { slug: "obsidian-verge-3d", name: "Obsidian Verge", dimension: "3d", ageBand: "teens", costPerMin: 18, hostFree: false, maxParty: 40 },
  { slug: "elder-throne-3d", name: "Elder Throne", dimension: "3d", ageBand: "adults", costPerMin: 25, hostFree: false, maxParty: 60 },
  { slug: "dream-golf-4d", name: "Dream Golf", dimension: "4d", ageBand: "teens", costPerMin: 30, hostFree: false, maxParty: 24 },
  { slug: "multiverse-5d", name: "Multiverse", dimension: "5d", ageBand: "adults", costPerMin: 40, hostFree: false, maxParty: 32 },
];

function isDimension(value: unknown): value is Dimension {
  return value === "1d" || value === "2d" || value === "3d" || value === "4d" || value === "5d";
}

function isAgeBand(value: unknown): value is AgeBand {
  return value === "kids" || value === "teens" || value === "adults";
}

function isRealm(value: unknown): value is MmorpgRealm {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.slug === "string" &&
    typeof row.name === "string" &&
    isDimension(row.dimension) &&
    isAgeBand(row.ageBand) &&
    typeof row.costPerMin === "number" &&
    Number.isFinite(row.costPerMin) &&
    typeof row.hostFree === "boolean" &&
    typeof row.maxParty === "number" &&
    Number.isFinite(row.maxParty)
  );
}

function validateRealmList(value: unknown): MmorpgRealm[] | null {
  const list = (value as { realms?: unknown }).realms ?? value;
  if (!Array.isArray(list)) return null;
  const valid = list.filter(isRealm);
  return valid.length > 0 ? valid : null;
}

/** Best-effort emit on the canonical channel; never throws, never blocks render. */
function emitInterop(type: string, data: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("4weird_interop_bus");
    channel.postMessage({ type, data });
    channel.close();
  } catch {
    // Fail-open: cross-tab fan-out is best-effort.
  }
}

export function MmoBrowser() {
  const [realms, setRealms] = useState<MmorpgRealm[]>(DEMO_SEEDS);
  const [source, setSource] = useState<Source>("demo");
  const [gameFilter, setGameFilter] = useState<string>("all");
  const [ageFilter, setAgeFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    async function tryLive() {
      try {
        const res = await fetch("/api/mmo/quote", { cache: "no-store" });
        if (!res.ok) return; // stay on demo seeds
        const data: unknown = await res.json();
        const valid = validateRealmList(data);
        if (!cancelled && valid) {
          setRealms(valid);
          setSource("live");
          emitInterop("mmorpg:quote-loaded", { count: valid.length, source: "live" });
        }
      } catch {
        // Fail-open: demo seeds already rendered.
      }
    }
    void tryLive();
    return () => {
      cancelled = true;
    };
  }, []);

  const games = useMemo(
    () => Array.from(new Set(realms.map((realm) => realm.slug))),
    [realms],
  );

  const visible = useMemo(
    () =>
      realms.filter(
        (realm) =>
          (gameFilter === "all" || realm.slug === gameFilter) &&
          (ageFilter === "all" || realm.ageBand === ageFilter),
      ),
    [realms, gameFilter, ageFilter],
  );

  function handleGameChange(value: string): void {
    setGameFilter(value);
    emitInterop("mmorpg:filter", { by: "game", value });
  }

  function handleAgeChange(value: string): void {
    setAgeFilter(value);
    emitInterop("mmorpg:filter", { by: "ageBand", value });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-300">
          Game{" "}
          <select
            value={gameFilter}
            onChange={(event) => handleGameChange(event.target.value)}
            className="ml-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
          >
            <option value="all">All games</option>
            {games.map((slug) => (
              <option key={slug} value={slug}>
                {slug}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-300">
          Age band{" "}
          <select
            value={ageFilter}
            onChange={(event) => handleAgeChange(event.target.value)}
            className="ml-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
          >
            <option value="all">All ages</option>
            {AGE_BANDS.map((band) => (
              <option key={band} value={band}>
                {band}
              </option>
            ))}
          </select>
        </label>
        <span className="ml-auto text-xs text-slate-400">
          {source === "live" ? "Live quotes" : "Demo quotes (offline)"} &middot;{" "}
          {visible.length} realm{visible.length === 1 ? "" : "s"}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-white/10 bg-white/[.04] p-6 text-sm text-slate-300">
          No realms match these filters. Try widening the game or age band.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((realm) => (
            <li
              key={realm.slug}
              className="rounded-2xl border border-white/10 bg-white/[.04] p-6"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-xl font-black">{realm.name}</h2>
                {realm.hostFree ? (
                  <span className="shrink-0 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">
                    Host-free
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-slate-400">
                {realm.dimension.toUpperCase()} &middot; {realm.ageBand} &middot;
                up to {realm.maxParty} players
              </p>
              <p className="mt-4 text-sm text-slate-200">
                <span className="text-2xl font-black text-cyan-300">
                  {realm.costPerMin}
                </span>{" "}
                coins/min per player
              </p>
              {realm.hostFree ? (
                <p className="mt-1 text-xs text-emerald-300">
                  Free to join — the host covers server, load, and rental.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
