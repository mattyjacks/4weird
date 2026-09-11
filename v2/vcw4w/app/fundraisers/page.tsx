import type { Metadata } from "next";
import Link from "next/link";
import { FundraiserBrowser } from "@/components/fundraisers/fundraiser-browser";

export const metadata: Metadata = {
  alternates: { canonical: "/fundraisers" },
  title: "Launch campaigns | 4weird Games",
  description:
    "Gift-based backing for game launches and tech startups in Vibe Coins. Creative projects only â€” not charity, not investment.",
};

export default function FundraisersPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-4xl space-y-8 px-5 py-20">
        <Link className="text-cyan-300 hover:underline" href="/">
          â† Home
        </Link>
        <header className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">Launch campaigns</p>
          <h1 className="text-4xl font-black sm:text-5xl">Fund the launch.</h1>
          <p className="max-w-2xl text-slate-300">
            Back someoneâ€™s game launch or tech startup with Vibe Coins â€” gifts for creative work, not charity and not
            investment. No equity, no interest, no profit-share, no cash-out. Every coin includes the 25% platform cut.
          </p>
        </header>
        <FundraiserBrowser />
      </section>
    </main>
  );
}
