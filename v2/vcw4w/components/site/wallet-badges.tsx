"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

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

async function fetchJson<T>(path: string): Promise<{ body: T | null; unauthorized: boolean }> {
  try {
    const response = await fetch(path, { credentials: "include", cache: "no-store" });
    if (response.status === 401) return { body: null, unauthorized: true };
    if (!response.ok) return { body: null, unauthorized: false };
    const body = (await response.json().catch(() => null)) as (T & { success?: boolean }) | null;
    if (!body || (body as { success?: boolean }).success === false) return { body: null, unauthorized: false };
    return { body: body as T, unauthorized: false };
  } catch {
    return { body: null, unauthorized: false };
  }
}

/** Round fractional centicentcoins to the nearest whole coin for menu display. */
export function formatMenuCoins(centicentcoins: number): string {
  return `${Math.round(centicentcoins / 100).toLocaleString("en-US")} 🪙`;
}

/** Whole-crown menu display with thousands separators. */
export function formatMenuCrowns(totalCrowns: number): string {
  return `${Math.round(totalCrowns).toLocaleString("en-US")} 👑`;
}

/**
 * Always-on wallet badges for the site menu.
 * Polls coin + crown balances every 10s while signed in.
 * Coins always show (rounded from centicentcoins); crowns always show
 * too (total including locked crowns, 👑0 when none yet).
 *
 * 401 handling: a 401 means the server no longer sees a session (expired,
 * revoked, or cookie desync) even though the client thought we were signed
 * in. We re-check the browser session once to cover the refresh race, then
 * report up via onUnauthorized so the header flips to logged-out and stops
 * polling — otherwise the 10s interval spams `GET .../balance 401` in the
 * console forever (e.g. visible on /bot/setup).
 */
export function WalletBadges({
  signedIn,
  onUnauthorized,
}: {
  signedIn: boolean | null;
  onUnauthorized?: () => void;
}) {
  const [coinsCc, setCoinsCc] = useState<number | null>(null);
  const [crownsTotal, setCrownsTotal] = useState<number | null>(null);
  const [authLost, setAuthLost] = useState(false);
  const failsRef = useRef(0);

  const load = useCallback(async () => {
    const [{ body: coinBody, unauthorized: coin401 }, { body: crownBody, unauthorized: crown401 }] =
      await Promise.all([
        fetchJson<CoinBalance>("/api/coins/balance"),
        fetchJson<CrownBalance>("/api/crowns/balance"),
      ]);
    if (coin401 || crown401) {
      failsRef.current += 1;
      // First 401 can be a refresh race (client has a session, server
      // cookies haven't caught up). Re-check the browser session: if it is
      // already gone, or a second consecutive poll still 401s, give up.
      let hasSession = true;
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const { data } = await createClient().auth.getSession();
        hasSession = Boolean(data.session);
      } catch {
        hasSession = true;
      }
      if (!hasSession || failsRef.current >= 2) {
        setAuthLost(true);
        onUnauthorized?.();
      }
      return;
    }
    failsRef.current = 0;
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
    }
    // Non-401 failure: leave previous values alone so a transient
    // failure never flashes the badges away; a fresh login reloads them.
  }, [onUnauthorized]);

  useEffect(() => {
    if (signedIn !== true || authLost) return;
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [signedIn, authLost, load]);

  if (signedIn !== true || authLost) return null;
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
