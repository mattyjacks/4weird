"use client";

/**
 * /mmo/rent form (web lane).
 *
 * Posts a live quote to POST /api/mmo/rent; ANY failure (offline, 404, bad
 * payload — the route may not exist yet) falls back to a local estimate from
 * the same per-minute seed table so the form never bricks (fail-open safety).
 *
 * SSR-safe: fetch runs in event handlers only, BroadcastChannel emit guarded
 * by typeof window, no browser APIs in the render path.
 */

import { useEffect, useMemo, useState } from "react";
import type { AgeBand, Dimension } from "../mmo-browser";

interface RentQuote {
  totalCoins: number;
  perPlayerCoins: number;
  hostFree: boolean;
  source: "live" | "estimate";
}

const BASE_PER_MIN: Record<Dimension, number> = { "1d": 3, "2d": 8, "3d": 18, "4d": 30, "5d": 40 };

interface GameOption {
  id: string;
  label: string;
  dimension: Dimension;
}

/** Demo seed games per dimension (4d = Dream Golf, 5d = Multiverse). */
const GAME_OPTIONS: GameOption[] = [
  { id: "classic-1d", label: "Classic 1D realm", dimension: "1d" },
  { id: "classic-2d", label: "Classic 2D world", dimension: "2d" },
  { id: "classic-3d", label: "Classic 3D expanse", dimension: "3d" },
  { id: "dream-golf-4d", label: "Dream Golf (4D)", dimension: "4d" },
  { id: "multiverse-5d", label: "Multiverse (5D)", dimension: "5d" },
];

function gameForDimension(dimension: Dimension): GameOption {
  const found = (Array.isArray(GAME_OPTIONS) ? GAME_OPTIONS : []).find((option) => option?.dimension === dimension);
  return found ?? GAME_OPTIONS[1] ?? GAME_OPTIONS[0] ?? { id: "classic-2d", label: "Classic 2D world", dimension: "2d" as Dimension };
}

const AGE_MULTIPLIER: Record<AgeBand, number> = {
  kids: 0.8,
  teens: 1,
  adults: 1.25,
};

const SPECS: Record<Dimension, { cpu: string; ram: string; region: string }> = {
  "1d": { cpu: "2 vCPU", ram: "4 GB RAM", region: "US-East" },
  "2d": { cpu: "4 vCPU", ram: "8 GB RAM", region: "US-East" },
  "3d": { cpu: "8 vCPU", ram: "16 GB RAM", region: "US-West" },
  "4d": { cpu: "8 vCPU + GPU", ram: "32 GB RAM", region: "EU-West" },
  "5d": { cpu: "16 vCPU + GPU", ram: "64 GB RAM", region: "EU-Central" },
};

function estimateQuote(
  dimension: Dimension,
  ageBand: AgeBand,
  hours: number,
  hostFree: boolean,
): RentQuote {
  const perMin = (BASE_PER_MIN[dimension] ?? 0) * (AGE_MULTIPLIER[ageBand] ?? 1);
  const safeHours = Number.isFinite(hours) ? Math.max(0, hours) : 0;
  const totalCoins = Math.round(perMin * 60 * safeHours);
  return {
    totalCoins,
    perPlayerCoins: hostFree ? 0 : totalCoins,
    hostFree,
    source: "estimate",
  };
}

function isRentQuote(value: unknown): value is RentQuote {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  const quote = (row.quote as Record<string, unknown> | undefined) ?? row;
  return (
    typeof quote.totalCoins === "number" &&
    Number.isFinite(quote.totalCoins) &&
    typeof quote.perPlayerCoins === "number" &&
    Number.isFinite(quote.perPlayerCoins) &&
    typeof quote.hostFree === "boolean"
  );
}

function normalizeQuote(value: unknown, hostFree: boolean): RentQuote | null {
  if (!isRentQuote(value)) return null;
  const row = value as { quote?: RentQuote } & RentQuote;
  const quote = row.quote ?? row;
  return { ...quote, hostFree: quote.hostFree ?? hostFree, source: "live" };
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

export function RentForm() {
  const [dimension, setDimension] = useState<Dimension>("2d");
  const [gameId, setGameId] = useState<string>("classic-2d");
  const [ageBand, setAgeBand] = useState<AgeBand>("teens");
  const [hostFree, setHostFree] = useState<boolean>(true);
  const [hours, setHours] = useState<number>(2);
  const [region, setRegion] = useState<string>(SPECS["2d"].region);
  const [quote, setQuote] = useState<RentQuote | null>(null);
  const [quoting, setQuoting] = useState<boolean>(false);

  function handleDimensionChange(next: Dimension): void {
    if (!SPECS[next as Dimension]) return;
    setDimension(next);
    setGameId(gameForDimension(next).id);
    setRegion(String(SPECS[next]?.region ?? ""));
  }

  function handleGameChange(nextId: string): void {
    const found = (Array.isArray(GAME_OPTIONS) ? GAME_OPTIONS : []).find((option) => option?.id === nextId);
    if (!found) return; // fail-open: ignore unknown game ids
    setGameId(found.id);
    setDimension(found.dimension);
  }

  async function fetchQuote(): Promise<void> {
    setQuoting(true);
    const payload = { dimension, game: gameId, ageBand, hostFree, hours, region };
    try {
      const res = await fetch("/api/mmo/rent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`quote HTTP ${res.status}`);
      const data: unknown = await res.json();
      const live = normalizeQuote(data, hostFree);
      if (live) {
        setQuote(live);
        emitInterop("mmorpg:rent-quoted", { ...payload, source: "live" });
        return;
      }
      throw new Error("bad quote shape");
    } catch {
      // Fail-open: local estimate keeps the form usable with zero backend.
      setQuote(estimateQuote(dimension, ageBand, hours, hostFree));
      emitInterop("mmorpg:rent-quoted", { ...payload, source: "estimate" });
    } finally {
      setQuoting(false);
    }
  }

  // Live offline estimate recomputed on every input — quote panel never needs scroll.
  const live = useMemo(
    () => estimateQuote(dimension, ageBand, hours, hostFree),
    [dimension, ageBand, hours, hostFree],
  );
  const shown: RentQuote = quote ?? live;
  const perHour = Math.round(((BASE_PER_MIN[dimension] ?? 0) * (AGE_MULTIPLIER[ageBand] ?? 1) * 60 + Number.EPSILON) * 100) / 100;
  const monthly = Math.round(perHour * 730);
  const specs = SPECS[dimension] ?? SPECS["2d"];

  useEffect(() => {
    emitInterop("mmorpg:rent-estimate", { dimension, ageBand, hours, hostFree, totalCoins: live.totalCoins });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimension, ageBand, hours, hostFree]);

  function handleDeploy(): void {
    emitInterop("mmorpg:rent-deploy", { dimension, game: gameId, ageBand, hostFree, hours, region, totalCoins: shown.totalCoins });
    void fetchQuote();
  }

  return (
    <form
      className="grid gap-3 lg:h-[calc(100vh-120px)] lg:grid-cols-[55%_45%] lg:overflow-hidden"
      onSubmit={(event) => {
        event.preventDefault();
        void fetchQuote();
      }}
    >
      {/* Left 55%: config */}
      <div className="rounded-xl border border-white/10 bg-white/[.04] p-4">
        <div className="grid gap-3">
          <label className="text-xs text-slate-300">
            Game
            <select
              value={gameId}
              onChange={(event) => handleGameChange(String(event.target.value ?? ""))}
              className="mt-1 block w-full rounded-md border border-white/10 bg-slate-900 px-2 py-1.5 text-xs text-white"
            >
              {(Array.isArray(GAME_OPTIONS) ? GAME_OPTIONS : []).map((option, index) => (
                <option key={String(option?.id ?? index)} value={String(option?.id ?? "")}>
                  {String(option?.label ?? "Realm")} - {Number(option?.dimension ? BASE_PER_MIN[option.dimension] ?? 0 : 0)} coins/min
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-slate-300">
              Dimension
              <select
                value={dimension}
                onChange={(event) => handleDimensionChange(String(event.target.value ?? "2d") as Dimension)}
                className="mt-1 block w-full rounded-md border border-white/10 bg-slate-900 px-2 py-1.5 text-xs text-white"
              >
                <option value="1d">1D — text realm</option>
                <option value="2d">2D — sprite world</option>
                <option value="3d">3D — full expanse</option>
                <option value="4d">4D - dream golf</option>
                <option value="5d">5D - multiverse</option>
              </select>
            </label>
            <label className="text-xs text-slate-300">
              Region
              <select
                value={region}
                onChange={(event) => setRegion(String(event.target.value ?? ""))}
                className="mt-1 block w-full rounded-md border border-white/10 bg-slate-900 px-2 py-1.5 text-xs text-white"
              >
                {["US-East", "US-West", "EU-West", "EU-Central", "AP-South"].map((r, index) => (
                  <option key={String(r ?? index)} value={String(r ?? "")}>{String(r ?? "")}</option>
                ))}
              </select>
            </label>
          </div>

          <fieldset>
            <legend className="text-xs text-slate-300">Age band</legend>
            <div className="mt-1 flex gap-1.5">
              {(["kids", "teens", "adults"] as AgeBand[]).map((band, index) => (
                <button
                  key={String(band ?? index)}
                  type="button"
                  onClick={() => setAgeBand(band)}
                  aria-pressed={ageBand === band}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    ageBand === band
                      ? "bg-cyan-300 text-slate-950"
                      : "border border-white/10 bg-transparent text-slate-300 hover:border-cyan-300/50"
                  }`}
                >
                  {band}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex cursor-pointer items-start gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={hostFree}
              onChange={(event) => setHostFree(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-cyan-300"
            />
            <span>
              <span className="font-semibold text-white">Host-free for players</span>
              <span className="block text-[11px] text-slate-400">
                Players join free — the host pays server, load, and rental.
              </span>
            </span>
          </label>

          <label className="text-xs text-slate-300">
            <span className="flex items-center justify-between">
              Duration <span className="font-bold text-cyan-300">{hours}h</span>
            </span>
            <input
              type="range"
              min={1}
              max={72}
              value={hours}
              onChange={(event) => setHours(Number(String(event.target.value ?? "")) || 1)}
              className="mt-1 w-full accent-cyan-300"
              aria-label="Duration in hours"
            />
          </label>
        </div>
      </div>

      {/* Right 45%: live quote, no scroll needed */}
      <div className="flex flex-col rounded-xl border border-cyan-300/20 bg-cyan-300/[.06] p-4">
        <p className="text-[11px] uppercase tracking-wider text-slate-400">
          {quote?.source === "live" ? "Live quote" : "Live estimate"} &middot; {region}
        </p>
        <p className="mt-1 text-2xl font-black text-cyan-300">
          {perHour} coins/hr
        </p>
        <p className="text-xs text-slate-300">
          {shown.totalCoins} coins / {hours}h &middot; ≈{monthly} coins/mo
        </p>
        <dl className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
          <div className="rounded-md bg-black/30 px-2 py-1"><dt className="text-slate-500">CPU</dt><dd className="font-semibold text-white">{String(specs?.cpu ?? "")}</dd></div>
          <div className="rounded-md bg-black/30 px-2 py-1"><dt className="text-slate-500">RAM</dt><dd className="font-semibold text-white">{String(specs?.ram ?? "")}</dd></div>
          <div className="rounded-md bg-black/30 px-2 py-1"><dt className="text-slate-500">Region</dt><dd className="font-semibold text-white">{String(region ?? "")}</dd></div>
          <div className="rounded-md bg-black/30 px-2 py-1"><dt className="text-slate-500">Players</dt><dd className="font-semibold text-white">{shown.hostFree ? "Free join" : "Paid join"}</dd></div>
        </dl>
        <p className="mt-2 text-[11px] text-slate-400">
          {shown.hostFree
            ? "Players join free — you (the host) cover server, load, and rental."
            : `≈ ${shown.perPlayerCoins} coins per player for ${hours}h.`}
        </p>
        <div className="mt-auto flex gap-2 pt-3">
          <button
            type="submit"
            disabled={quoting}
            className="flex-1 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/20 disabled:opacity-60"
          >
            {quoting ? "Quoting…" : "Refresh quote"}
          </button>
          <button
            type="button"
            onClick={handleDeploy}
            className="flex-1 rounded-full bg-cyan-300 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-200"
          >
            Deploy Realm
          </button>
        </div>
      </div>
    </form>
  );
}