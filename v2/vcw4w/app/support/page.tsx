import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { SupportClient } from "@/components/support/support-client";

export const metadata: Metadata = {
  alternates: { canonical: "/support" },
  title: "Support creators & clans | 4weird Games",
  description:
    "Voluntary coin support for verified creators and clans: monthly tiers and one-time tips. Not a charity, not tax-deductible, no cash-out.",
};

// Fully static header copy ('days'). SupportClient is NEVER cached: it
// fetches per-user tiers/subscriptions/verification over /api/*.
async function CachedSupportHeader() {
  'use cache';
  cacheLife('days');
  return (
    <header className="space-y-1.5">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">Support</p>
      <h1 className="text-xl font-black">Back the weird you love.</h1>
      <p className="max-w-2xl text-sm text-slate-300">
        Subscribe to a verified creator or a clan for monthly coins, or send a one-time tip - coffee money, not a
        contract. Every amount already includes the 25% platform cut.
      </p>
      <details className="max-w-2xl rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
        <summary className="cursor-pointer font-semibold text-slate-200">Legal Terms & Disclaimers ⓘ</summary>
        <p className="mt-1">
          Coins have no cash value and can never be cashed out directly. Individual recipients earn time-locked Crowns (Terms 8A.1: 30-day unlock, 1-year expiry, 1:1 convert to Coins, or fiat payout via our licensed provider (30-day unlock + 5-10 business days processing, KYC required, payout countries not yet announced). Timelines are set by fraud, tax, and payments law and cannot be bypassed). Holding Crowns never guarantees a fiat payout: restricted countries, failed KYC, sanctions, or law/provider limits can leave convert-to-Coins as your only exit, with no claim against us (Terms 8A.1).
        </p>
      </details>
    </header>
  );
}

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-4xl space-y-2.5 px-4 py-3">
        <Link className="text-cyan-300 hover:underline" href="/">
          ← Home
        </Link>
        <Suspense fallback={<p className="text-sm text-slate-400">Loading…</p>}>
          <CachedSupportHeader />
        </Suspense>
        <Suspense fallback={<p className="text-sm text-slate-400">Loading support options…</p>}>
          <SupportClient />
        </Suspense>
      </section>
    </main>
  );
}
