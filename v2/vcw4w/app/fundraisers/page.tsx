import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { FundraiserBrowser } from "@/components/fundraisers/fundraiser-browser";
import { CURRENCY_LEGEND, FUNDRAISERS_COMPLIANCE_NOTE, FUNDRAISERS_DISABLED_NOTICE } from "@/lib/support";

export const metadata: Metadata = {
  alternates: { canonical: "/fundraisers" },
  title: "Launch campaigns | 4weird Games",
  description:
    "Gift-based backing for game launches and tech startups in Vibe Coins. Creative projects only - not charity, not investment.",
};

/**
 * Static currency-legend fragment. Pure output from the CURRENCY_LEGEND
 * catalog — no per-user or live totals — so it is cached; campaign list,
 * raised amounts, and backer counts stay dynamic in FundraiserBrowser.
 */
async function CurrencyLegend() {
  "use cache";
  cacheLife("days");
  cacheTag("currency-legend");
  return (
    <ul className="mt-3 grid gap-2 sm:grid-cols-3">
      {CURRENCY_LEGEND.map((c) => (
        <li key={c.emoji + c.name} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
          <p className="font-bold">
            <span aria-hidden="true">{c.emoji}</span> {c.name}
          </p>
          <p className="mt-1 text-slate-300">{c.blurb}</p>
        </li>
      ))}
    </ul>
  );
}

export default function FundraisersPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl space-y-2.5 px-4 py-3">
        <Link className="text-cyan-300 hover:underline" href="/">
          ← Home
        </Link>
        <header className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">Launch campaigns</p>
          <h1 className="text-2xl font-black">Fund the launch.</h1>
          <p className="max-w-2xl text-sm text-slate-300">
            Back someone&apos;s game launch or tech startup with Vibe Coins; gifts for creative work, not charity and not
            investment. No equity, no interest, no profit-share, no cash-out. Every coin includes the 25% platform cut.
          </p>
        </header>
        <details className="rounded-full border border-red-300/30 bg-red-300/10 px-3 py-1.5 text-xs text-red-100">
          <summary className="cursor-pointer font-bold">🚧 Fundraisers are disabled for now; but still working under the hood. [Details]</summary>
          <p className="mt-1">{FUNDRAISERS_DISABLED_NOTICE}</p>
          <p className="mt-2 text-red-200/90">{FUNDRAISERS_COMPLIANCE_NOTE}</p>
        </details>
        <details aria-label="Currency legend" className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-1.5">
          <summary className="cursor-pointer"><h2 className="inline text-base font-bold">What each emoji means</h2></summary>
          <p className="mt-1 text-sm text-slate-400">
            One emoji, one meaning, everywhere on 4weird. Real money always uses 💸; never 🪙.
          </p>
          <CurrencyLegend />
        </details>
        <Suspense fallback={<p className="text-sm text-slate-400">Loading campaigns…</p>}>
          <FundraiserBrowser />
        </Suspense>
      </section>
    </main>
  );
}
