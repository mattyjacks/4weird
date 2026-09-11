import type { Metadata } from "next";
import Link from "next/link";
import { SupportClient } from "@/components/support/support-client";

export const metadata: Metadata = {
  alternates: { canonical: "/support" },
  title: "Support creators & clans | 4weird Games",
  description:
    "Voluntary coin support for verified creators and clans: monthly tiers and one-time tips. Not a charity, not tax-deductible, no cash-out.",
};

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-4xl space-y-8 px-5 py-20">
        <Link className="text-cyan-300 hover:underline" href="/">
          ← Home
        </Link>
        <header className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">Support</p>
          <h1 className="text-4xl font-black sm:text-5xl">Back the weird you love.</h1>
          <p className="max-w-2xl text-slate-300">
            Subscribe to a verified creator or a clan for monthly coins, or send a one-time tip — coffee money, not a
            contract. Every amount already includes the 25% platform cut. Coins have no cash value and can never be cashed out directly. Individual recipients earn time-locked Crowns (Terms 8A.1: 30-day unlock, 1-year expiry, 1:1 convert to Coins, or fiat payout via our licensed provider (30-day unlock + 5-10 business days processing, KYC required, payout countries not yet announced). Timelines are set by fraud, tax, and payments law and cannot be bypassed). Holding Crowns never guarantees a fiat payout: restricted countries, failed KYC, sanctions, or law/provider limits can leave convert-to-Coins as your only exit, with no claim against us (Terms 8A.1).
            cashed out.
          </p>
        </header>
        <SupportClient />
      </section>
    </main>
  );
}




