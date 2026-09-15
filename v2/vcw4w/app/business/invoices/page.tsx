import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { InvoiceManager } from "@/components/crm/invoice-manager";

export const metadata: Metadata = {
  alternates: { canonical: "/business/invoices" },
  title: "Invoices",
  description:
    "Org-scoped coin memoranda: draft, send, and track client invoices in Vibe Coins.",
};

// Ledger-first shell: the InvoiceManager below already renders its filter bar,
// a collapsed <details> draft form, then the ledger with status badges and
// inline row actions (mark/void, duplicate, CSV, print). This shell keeps the
// ledger above the fold with a compact header + 36px utility bar.
const STATUS_LEGEND = ["Draft", "Sent", "Paid", "Overdue"] as const;

export default function InvoicesPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-none px-3 py-4 sm:px-4">
        {/* Compact inline title bar (replaces the tall hero). */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-cyan-300">
            4WEIRD // BUSINESS
          </p>
          <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-0.5 text-[11px] font-bold text-cyan-200">
            100 🪙 = exactly $1.00
          </span>
          <nav aria-label="Related business pages" className="ml-auto flex items-center gap-3 text-xs">
            <Link href="/business/crm" className="font-bold text-cyan-300 hover:underline">
              CRM
            </Link>
            <Link href="/business" className="font-bold text-cyan-300 hover:underline">
              Business hub
            </Link>
            <Link href="/docs/business" className="font-bold text-cyan-300 hover:underline">
              Business guide
            </Link>
          </nav>
        </div>
        <h1 className="mt-1 text-xl font-black">Invoices</h1>

        {/* Collapsed explainer: the full guide used to push the ledger down. */}
        <details className="mt-1 text-sm">
          <summary className="cursor-pointer text-xs font-semibold text-slate-400 hover:text-slate-200">
            How invoicing works (draft → send → mark paid)
          </summary>
          <p className="mt-1 max-w-4xl text-sm text-slate-300">
            Bill clients in coins — draft a memorandum, send it, then mark it paid when the
            guarded checkout settles.
          </p>
        </details>

        {/* 36px utility bar: creation entry point + status legend. */}
        <div className="mt-3 flex h-9 items-center gap-1.5 overflow-x-auto rounded-xl border border-white/10 bg-white/[.03] px-2">
          <a
            href="#invoices-workspace"
            title="Open the draft form inside the workspace below"
            className="shrink-0 rounded-lg bg-cyan-300 px-2.5 py-1 text-xs font-bold text-slate-950 transition hover:bg-cyan-200"
          >
            + Create Invoice
          </a>
          <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-white/10" />
          <div className="flex items-center gap-1.5" role="group" aria-label="Invoice statuses used in the ledger">
            {STATUS_LEGEND.map((status) => (
              <a
                key={status}
                href="#invoices-workspace"
                title="Filter by status inside the ledger below"
                className="shrink-0 rounded-full border border-white/10 bg-white/[.04] px-2 py-0.5 text-[11px] font-semibold text-slate-300 transition hover:border-cyan-300/50 hover:text-white"
              >
                {status}
              </a>
            ))}
          </div>
        </div>

        <div id="invoices-workspace" className="mt-3 scroll-mt-20">
          {/* Per-user board: never cached. The static header above streams in
              the shell; the invoice list resolves at request time. */}
          <Suspense
            fallback={
              <p role="status" className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400">
                Loading your invoices…
              </p>
            }
          >
            <InvoiceManager />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
