"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GAME_LOAD_COINS_DEFAULT, GAME_HOURLY_COINS_DEFAULT, perSecondCenticentcoins } from "@/lib/game-rent";

type Rate = { game_slug: string; coins_per_load: number; coins_per_hour: number };

/**
 * PlayRateBadge — the honest price tag on every game: proportional load fee
 * + hourly rate billed per second, and the dev-rate pointer.
 * Rates come from /api/games/rates (public); missing rows mean defaults.
 */
export function PlayRateBadge({ slug, compact }: { slug: string; compact?: boolean }) {
  const [rate, setRate] = useState<Rate | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/games/rates", { credentials: "include" })
      .then((r) => r.json().catch(() => null))
      .then((body) => {
        if (!live) return;
        const rows = (body?.rates ?? []) as Rate[];
        setRate(rows.find((r) => r.game_slug === slug) ?? null);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [slug]);

  const load = rate?.coins_per_load ?? GAME_LOAD_COINS_DEFAULT;
  const hour = rate?.coins_per_hour ?? GAME_HOURLY_COINS_DEFAULT;
  const free = load === 0 && hour === 0;
  const perSecondCc = perSecondCenticentcoins(hour);

  return (
    <p
      className={
        compact
          ? "text-xs text-slate-400"
          : "mt-3 rounded-xl border border-white/10 bg-white/[.03] px-4 py-2.5 text-sm text-slate-300"
      }
    >
      {free ? (
        <>🆓 Free to play — the developer set this game to 0 coins.</>
      ) : (
        <>
          🪙 <b className="text-white">{load} coin{load === 1 ? "" : "s"} per load</b> (exact fresh bytes, 1 MiB = full fee)
          {" "}· <b className="text-white">{hour} coin{hour === 1 ? "" : "s"}/hr</b> billed per second ({perSecondCc.toFixed(4)} centicentcoins/s) ·{" "}
          <Link href="/pricing" className="text-cyan-300 hover:underline">
            100 coins = $1.00
          </Link>
        </>
      )}
    </p>
  );
}
