"use client";

import { useEffect, useState } from "react";
import { FreePlayBadge } from "./server-card";

/** 100 coins = exactly $1.00 USD (mirrors the mmorpg quote/rent rate cards). */
export const COINS_PER_USD = 100;

export function formatUsd(coins: unknown): string {
  const n = Number(coins);
  if (!Number.isFinite(n) || n < 0) return "$0.00";
  return `$${(n / COINS_PER_USD).toFixed(2)}`;
}

export type ServerQuoteInput = {
  /** Live quote lookup for a known server id (GET /api/mmorpg/quote). */
  serverId?: string;
  /** Fallback per-player per-minute rate when no live quote loads. */
  coinPerMin?: number | null;
  /** Host covers the room — guests play free. */
  hostFree?: boolean;
  /** Session length to quote (minutes). Defaults to 60. */
  minutes?: number;
};

type LiveQuote = {
  perPlayerPerMin?: unknown;
  usdEquivalent?: unknown;
  estimated?: unknown;
  knownServer?: unknown;
};

/**
 * ServerQuote — live per-minute quote with a fail-open local fallback.
 *
 * Tries GET /api/mmorpg/quote?serverId=<id> first; on any failure it quotes
 * from the `coinPerMin` prop (or 0 = free) with identical display math, so
 * the browser and rent flow never blank-screen when the API is down.
 * QUOTE ONLY — settlement stays economy-lane owned (paired coin_ledger
 * writes via a guarded RPC, never from this component).
 */
export function ServerQuote({ serverId, coinPerMin, hostFree, minutes = 60 }: ServerQuoteInput) {
  const [live, setLive] = useState<LiveQuote | null>(null);

  useEffect(() => {
    if (!serverId) return;
    let cancelled = false;
    fetch(`/api/mmorpg/quote?serverId=${encodeURIComponent(serverId)}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json().catch(() => null) : null))
      .then((body: unknown) => {
        if (!cancelled && body && typeof body === "object") setLive(body as LiveQuote);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [serverId]);

  const fallbackRate = typeof coinPerMin === "number" && Number.isFinite(coinPerMin) && coinPerMin >= 0 ? coinPerMin : 0;
  const liveRate = Number((live as LiveQuote | null)?.perPlayerPerMin);
  const rate = Number.isFinite(liveRate) && liveRate >= 0 ? liveRate : fallbackRate;
  const minsRaw = Number(minutes);
  const mins = Number.isFinite(minsRaw) && minsRaw > 0 ? Math.floor(Math.min(minsRaw, 24 * 60)) : 60;
  const sessionCoins = rate * mins;
  const estimated = live ? (live as LiveQuote).estimated === true || (live as LiveQuote).knownServer === false : serverId ? true : false;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4" aria-label="Server price quote">
      <div className="flex flex-wrap items-center gap-2">
        <b className="text-lg text-white">
          {rate} coin/min <span className="text-sm font-normal text-slate-400">({formatUsd(rate)})</span>
        </b>
        {hostFree ? <FreePlayBadge /> : null}
        {estimated ? (
          <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[.06] px-2.5 py-0.5 text-xs font-semibold text-slate-300">
            Estimated
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-slate-300">
        {mins} min session ≈ <b className="text-white">{sessionCoins} coins</b> ({formatUsd(sessionCoins)}) per player
        {hostFree ? " — covered by the host, guests play free." : "."}
      </p>
      <p className="mt-1 text-xs text-slate-500">Quote only — no coins move until you join or confirm a rental.</p>
    </div>
  );
}
