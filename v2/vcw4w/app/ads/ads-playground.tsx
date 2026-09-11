"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HOUSE_ADS } from "@/lib/ads";
import { HouseAdCard } from "@/components/ads/AdSlot";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function AdsPlayground() {
  const [order, setOrder] = useState(() => HOUSE_ADS.map((ad) => ad.id));
  const [skipped, setSkipped] = useState(0);
  const [confetti, setConfetti] = useState(false);

  const ads = useMemo(
    () => order.map((id) => HOUSE_ADS.find((ad) => ad.id === id)!).filter(Boolean),
    [order],
  );

  const reshuffle = () => {
    setOrder(shuffle(HOUSE_ADS.map((ad) => ad.id)));
    setConfetti(true);
    window.setTimeout(() => setConfetti(false), 1200);
  };

  const skipEverything = () => setSkipped((n) => n + ads.length);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={reshuffle}
          className="rounded-full bg-yellow-300 px-6 py-3 text-center text-sm font-black text-slate-950 transition hover:bg-yellow-200"
        >
          🎲 Shuffle the ads {confetti ? "✨" : ""}
        </button>
        <button
          type="button"
          onClick={skipEverything}
          className="rounded-full border border-white/20 px-6 py-3 text-center text-sm font-bold transition hover:bg-white/10"
        >
          Skip ALL the ads ({skipped} skipped)
        </button>
        <p className="text-xs text-slate-500">
          Skipping is instant and guilt-free. The ads forgive you. Probably.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {ads.map((ad, index) => (
          <article
            key={ad.id}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/10 via-white/[.03] to-cyan-500/10 p-5"
          >
            <p className="absolute right-4 top-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">
              Ad #{index + 1} of {ads.length}
            </p>
            <HouseAdCard ad={ad} />
            <p className="mt-3 border-t border-white/10 pt-2 text-[11px] text-slate-500">
              House ad · supports 4weird ·{" "}
              <Link href={ad.href} className="font-bold text-cyan-300 hover:underline">
                {ad.cta}
              </Link>
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
