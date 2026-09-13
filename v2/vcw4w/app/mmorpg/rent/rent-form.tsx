"use client";

/**
 * /mmorpg/rent form (web lane).
 *
 * Posts a live quote to POST /api/mmorpg/rent; ANY failure (offline, 404, bad
 * payload — the route may not exist yet) falls back to a local estimate from
 * the same per-minute seed table so the form never bricks (fail-open safety).
 *
 * SSR-safe: fetch runs in event handlers only, BroadcastChannel emit guarded
 * by typeof window, no browser APIs in the render path.
 */

import { useState } from "react";
import type { AgeBand, Dimension } from "../mmorpg-browser";

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
  const found = GAME_OPTIONS.find((option) => option.dimension === dimension);
  return found ?? GAME_OPTIONS[1];
}

const AGE_MULTIPLIER: Record<AgeBand, number> = {
  kids: 0.8,
  teens: 1,
  adults: 1.25,
};

function estimateQuote(
  dimension: Dimension,
  ageBand: AgeBand,
  hours: number,
  hostFree: boolean,
): RentQuote {
  const perMin = BASE_PER_MIN[dimension] * AGE_MULTIPLIER[ageBand];
  const totalCoins = Math.round(perMin * 60 * Math.max(0, hours));
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
  const [quote, setQuote] = useState<RentQuote | null>(null);
  const [quoting, setQuoting] = useState<boolean>(false);

  function handleDimensionChange(next: Dimension): void {
    setDimension(next);
    setGameId(gameForDimension(next).id);
  }

  function handleGameChange(nextId: string): void {
    const found = GAME_OPTIONS.find((option) => option.id === nextId);
    if (!found) return; // fail-open: ignore unknown game ids
    setGameId(found.id);
    setDimension(found.dimension);
  }

  async function fetchQuote(): Promise<void> {
    setQuoting(true);
    const payload = { dimension, game: gameId, ageBand, hostFree, hours };
    try {
      const res = await fetch("/api/mmorpg/rent", {
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

  return (
    <form
      className="rounded-2xl border border-white/10 bg-white/[.04] p-6 sm:p-8"
      onSubmit={(event) => {
        event.preventDefault();
        void fetchQuote();
      }}
    >
      <div className="grid gap-5">
        <label className="text-sm text-slate-300">
          Game
          <select
            value={gameId}
            onChange={(event) => handleGameChange(event.target.value)}
            className="mt-2 block w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
          >
            {GAME_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} - {BASE_PER_MIN[option.dimension]} coins/min
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-300">
          Game dimension
          <select
            value={dimension}
            onChange={(event) => handleDimensionChange(event.target.value as Dimension)}
            className="mt-2 block w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
          >
            <option value="1d">1D — text realm</option>
            <option value="2d">2D — sprite world</option>
            <option value="3d">3D — full expanse</option>
            <option value="4d">4D - dream golf</option>
            <option value="5d">5D - multiverse</option>
          </select>
        </label>

        <fieldset>
          <legend className="text-sm text-slate-300">Age band</legend>
          <div className="mt-2 flex gap-2">
            {(["kids", "teens", "adults"] as AgeBand[]).map((band) => (
              <button
                key={band}
                type="button"
                onClick={() => setAgeBand(band)}
                aria-pressed={ageBand === band}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
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

        <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={hostFree}
            onChange={(event) => setHostFree(event.target.checked)}
            className="mt-1 h-4 w-4 accent-cyan-300"
          />
          <span>
            <span className="font-semibold text-white">
              Host-free for players
            </span>
            <span className="mt-1 block text-xs text-slate-400">
              When host-free is on, players join free — the host pays the
              server, load, and rental costs instead.
            </span>
          </span>
        </label>

        <label className="text-sm text-slate-300">
          Hours
          <input
            type="number"
            min={1}
            max={72}
            value={hours}
            onChange={(event) =>
              setHours(Math.max(1, Math.min(72, Number(event.target.value) || 1)))
            }
            className="mt-2 block w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
          />
        </label>

        <button
          type="submit"
          disabled={quoting}
          className="rounded-full bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
        >
          {quoting ? "Quoting…" : "Get live quote"}
        </button>
      </div>

      {quote ? (
        <div className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/[.06] p-5">
          <p className="text-sm text-slate-300">
            {quote.source === "live" ? "Live quote" : "Estimate (offline)"}
          </p>
          <p className="mt-1 text-3xl font-black text-cyan-300">
            {quote.totalCoins} coins
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {quote.hostFree
              ? "Players join free — you (the host) cover server, load, and rental."
              : `≈ ${quote.perPlayerCoins} coins per player for ${hours}h.`}
          </p>
        </div>
      ) : null}
    </form>
  );
}
