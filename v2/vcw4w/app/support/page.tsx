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
          â† Home
        </Link>
        <header className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">Support</p>
          <h1 className="text-4xl font-black sm:text-5xl">Back the weird you love.</h1>
          <p className="max-w-2xl text-slate-300">
            Subscribe to a verified creator or a clan for monthly coins, or send a one-time tip â€” coffee money, not a
            contract. Every amount already includes the 25% platform cut. Coins have no cash value and can never be
            cashed out.
          </p>
        </header>
        <SupportClient />
      </section>
    </main>
  );
}
