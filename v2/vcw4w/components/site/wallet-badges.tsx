"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const POLL_MS = 10_000;

type CoinBalance = {
  balance?: unknown;
  centicentcoins?: unknown;
};

type CrownBalance = {
  total?: unknown;
  locked?: unknown;
  eligible?: unknown;
};

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(path, { credentials: "include", cache: "no-store" });
    if (response.status === 401) return null;
    if (!response.ok) return null;
    const body = (await response.json().catch(() => null)) as (T & { success?: boolean }) | null;
    if (!body || (body as { success?: boolean }).success === false) return null;
    return body as T;
  } catch {
    return null;
  }
}

/** Round fractional centicentcoins to the nearest whole coin for menu display. */
export function formatMenuCoins(centicentcoins: number): string {
  return `(🪙${Math.round(centicentcoins / 100).toLocaleString("en-US")})`;
}

/** Whole-crown menu display with thousands separators. */
export function formatMenuCrowns(totalCrowns: number): string {
  return `👑${Math.round(totalCrowns).toLocaleString("en-US")}`;
}

/**
 * Always-on wallet badges for the site menu.
 * Polls coin + crown balances every 10s while signed in.
 * Coins always show (rounded from centicentcoins); crowns always show
 * too (total including locked crowns, 👑0 when none yet).
 */
export function WalletBadges({ signedIn }: { signedIn: boolean | null }) {
  const [coinsCc, setCoinsCc] = useState<number | null>(null);
  const [crownsTotal, setCrownsTotal] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [coinBody, crownBody] = await Promise.all([
      fetchJson<CoinBalance>("/api/coins/balance"),
      fetchJson<CrownBalance>("/api/crowns/balance"),
    ]);
    if (coinBody) {
      const cc =
        typeof coinBody.centicentcoins === "number"
          ? coinBody.centicentcoins
          : Math.round((Number(coinBody.balance) || 0) * 100);
      if (Number.isFinite(cc)) setCoinsCc(Math.round(cc));
    }
    if (crownBody) {
      const total = Number(crownBody.total);
      if (Number.isFinite(total)) setCrownsTotal(total);
    } else if (crownBody === null) {
      // 401/non-ok: leave previous crown value alone so a transient
      // failure never flashes the 👑 badge away; a fresh login reloads it.
    }
  }, []);

  useEffect(() => {
    if (signedIn !== true) return;
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [signedIn, load]);

  if (signedIn !== true) return null;
  if (coinsCc === null) return null;

  const crowns = crownsTotal ?? 0;
  const coinsLabel = `${Math.round(coinsCc / 100).toLocaleString("en-US")} coins`;
  const crownsLabel = `${Math.round(crowns).toLocaleString("en-US")} crowns`;

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={`${coinsLabel}, ${crownsLabel}`}
      className="inline-flex items-center gap-1.5 text-sm font-bold"
    >
      <Link
        href="/account"
        title="Your coin balance (rounded to whole coins)"
        className="rounded-full border border-border px-2 py-0.5 text-foreground transition hover:bg-accent hover:text-accent-foreground"
      >
        {formatMenuCoins(coinsCc)}
      </Link>
      <Link
        href="/account"
        title="Your crown balance, including locked crowns"
        className="rounded-full border border-border px-2 py-0.5 text-foreground transition hover:bg-accent hover:text-accent-foreground"
      >
        {formatMenuCrowns(crowns)}
      </Link>
    </span>
  );
}
