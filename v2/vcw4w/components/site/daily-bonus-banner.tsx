"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type StatusBody = {
  success?: boolean;
  available?: boolean;
  nextAward?: number;
  streak?: number;
  today?: string;
};

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function msUntilUtcMidnight(): number {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 5));
  return Math.max(1000, next.getTime() - now.getTime());
}

function dismissedToday(): boolean {
  try {
    return window.localStorage.getItem(`fw-daily-banner-dismissed-${utcToday()}`) === "1";
  } catch {
    return false;
  }
}

function dismissToday(): void {
  try {
    window.localStorage.setItem(`fw-daily-banner-dismissed-${utcToday()}`, "1");
  } catch {
    /* storage may be blocked; banner simply returns next visit */
  }
}

/**
 * Top-of-site daily-bonus banner. Renders ONLY when the bonus is available.
 *
 * Server-cost design (event-driven, not hourly polling):
 * - ONE `GET /api/coins/daily/status` per page load (single PK lookup).
 * - After that, zero server calls: a client-side timer waits for the next
 *   UTC midnight (the only moment availability can flip false->true), and
 *   focus/visibility handlers re-check only if the UTC date rolled while
 *   the tab was hidden. Hourly DB polling would cost ~24x per daily user.
 * - Hides immediately on claim (DailyClaim dispatches
 *   `vibe-coins-changed` + `daily-bonus-claimed`) with no extra fetch.
 */
export function DailyBonusBanner() {
  const [visible, setVisible] = useState(false);
  const [nextAward, setNextAward] = useState(5);
  const [claiming, setClaiming] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastCheckedDayRef = useRef<string>(utcToday());
  const inflightRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const scheduleMidnightRecheck = useCallback(() => {
    clearTimer();
    // The ONLY scheduled server contact: one re-check just after UTC
    // midnight, when a new bonus may exist. No hourly interval.
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void check();
    }, msUntilUtcMidnight());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const check = useCallback(async () => {
    if (inflightRef.current) return;
    inflightRef.current = true;
    try {
      const response = await fetch("/api/coins/daily/status", { credentials: "include" });
      if (response.status === 401) {
        setVisible(false);
        return;
      }
      if (!response.ok) return;
      const body = (await response.json().catch(() => null)) as StatusBody | null;
      if (!body || body.success === false) return;
      lastCheckedDayRef.current = utcToday();
      if (body.available && !dismissedToday()) {
        setNextAward(typeof body.nextAward === "number" && body.nextAward > 0 ? body.nextAward : 5);
        setVisible(true);
      } else {
        setVisible(false);
      }
    } catch {
      /* transient failure: stay hidden, retry on next navigation/focus */
    } finally {
      inflightRef.current = false;
      scheduleMidnightRecheck();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void check();
    const onClaimed = () => {
      setVisible(false);
      setClaiming(false);
      scheduleMidnightRecheck();
    };
    // Re-check on focus/visibility ONLY when the UTC date rolled since the
    // last check (tab slept past midnight) — otherwise do nothing, so
    // background tabs never poll.
    const onFocus = () => {
      if (utcToday() !== lastCheckedDayRef.current) void check();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible" && utcToday() !== lastCheckedDayRef.current) void check();
    };
    window.addEventListener("daily-bonus-claimed", onClaimed);
    window.addEventListener("vibe-coins-changed", onClaimed);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimer();
      window.removeEventListener("daily-bonus-claimed", onClaimed);
      window.removeEventListener("vibe-coins-changed", onClaimed);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = useCallback(() => {
    dismissToday();
    setVisible(false);
  }, []);

  const claim = useCallback(async () => {
    if (claiming) return;
    setClaiming(true);
    setNote(null);
    try {
      const response = await fetch("/api/coins/daily", { method: "POST", credentials: "include" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Unable to claim.");
      window.dispatchEvent(new Event("vibe-coins-changed"));
      window.dispatchEvent(new Event("love-letters-changed"));
      window.dispatchEvent(new Event("daily-bonus-claimed"));
      setVisible(false);
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Unable to claim.");
      setClaiming(false);
    }
  }, [claiming]);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Daily bonus available"
      className="border-b border-amber-300/30 bg-gradient-to-r from-amber-500/20 via-yellow-400/15 to-amber-500/20"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-sm">
        <span aria-hidden="true">🎁</span>
        <p className="font-semibold text-foreground">
          Daily bonus available: <b>+{nextAward} coins + 💌x1</b>.{" "}
          <Link href="/account" className="underline underline-offset-2 hover:no-underline">
            Claim on your dashboard
          </Link>
          {note && <span className="ml-2 font-normal text-muted-foreground">{note}</span>}
        </p>
        <span className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={claim}
            disabled={claiming}
            className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"
          >
            {claiming ? "Claiming…" : "Claim now"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss daily bonus banner for today"
            className="rounded-full border border-border px-3 py-1 text-xs font-bold text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            Dismiss
          </button>
        </span>
      </div>
    </div>
  );
}
