import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TaxClient } from "./tax-client";

export const metadata: Metadata = {
  alternates: { canonical: "/business/tax" },
  title: "Tax Info Bot | 4weird Business",
  description:
    "Freelance tax calculator and receipt organizer for creators: estimate quarterly taxes from income, expenses, and state, track receipts, and export a clean CSV.",
};

export default function TaxPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Full-width 50/50 dashboard shell: TaxClient already renders inputs +
          live breakdown (left) and the receipts ledger with + Log Expense and
          CSV export (right). This shell keeps both above the fold. */}
      <section className="mx-auto max-w-7xl px-3 py-4 sm:px-4">
        {/* Compact title bar with inline disclaimer badge (replaces the tall
            preamble + hero). Full text stays one click away. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-cyan-300">
            4WEIRD // BUSINESS // TAX INFO BOT
          </p>
          <details className="relative">
            <summary
              className="cursor-pointer list-none rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 text-[11px] font-bold text-amber-200 hover:border-amber-200/60 [&::-webkit-details-marker]:hidden"
              title="Planning math only — not tax advice"
            >
              ⓘ Planning math only — not tax advice
            </summary>
            <div className="absolute left-0 z-10 mt-1 w-72 rounded-xl border border-white/10 bg-slate-900 p-3 text-xs leading-relaxed text-slate-300 shadow-xl">
              Rough planning math only — not tax advice. Everything runs in your browser and
              receipts autosave locally. Related:{" "}
              <Link href="/business" className="font-bold text-cyan-300 hover:underline">
                Business hub
              </Link>{" "}
              ·{" "}
              <Link
                href="/business/invoices"
                className="font-bold text-cyan-300 hover:underline"
              >
                Invoices
              </Link>
              .
            </div>
          </details>
          <nav aria-label="Related business pages" className="ml-auto flex items-center gap-3 text-xs">
            <Link href="/business" className="font-bold text-cyan-300 hover:underline">
              Business hub
            </Link>
            <Link
              href="/business/invoices"
              className="font-bold text-cyan-300 hover:underline"
            >
              Invoices
            </Link>
          </nav>
        </div>
        <h1 className="mt-1 text-xl font-black">Freelance tax estimator</h1>

        <div className="mt-3">
          <Suspense
            fallback={
              <p
                role="status"
                className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400"
              >
                Loading the tax estimator…
              </p>
            }
          >
            <TaxClient />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
