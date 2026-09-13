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
      <section className="mx-auto max-w-5xl px-5 py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
          4WEIRD // BUSINESS // TAX INFO BOT
        </p>
        <h1 className="mt-2 text-4xl font-black">Freelance tax estimator</h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          Rough planning math only — not tax advice. Everything runs in your
          browser and receipts autosave locally. Related:{" "}
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
        </p>
        <div className="mt-10">
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
