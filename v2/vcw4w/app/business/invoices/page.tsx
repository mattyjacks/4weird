import type { Metadata } from "next";
import Link from "next/link";
import { InvoiceManager } from "@/components/crm/invoice-manager";

export const metadata: Metadata = {
  alternates: { canonical: "/business/invoices" },
  title: "Invoices",
  description:
    "Org-scoped coin memoranda: draft, send, and track client invoices in Vibe Coins.",
};

export default function InvoicesPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-5xl px-5 py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
          4WEIRD // BUSINESS
        </p>
        <h1 className="mt-2 text-4xl font-black">Invoices</h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          Bill clients in coins — 100 🪙 = exactly $1.00. Draft a memorandum, send it,
          then mark it paid when the guarded checkout settles. Related:{" "}
          <Link href="/business/crm" className="font-bold text-cyan-300 hover:underline">
            CRM
          </Link>{" "}
          ·{" "}
          <Link href="/business" className="font-bold text-cyan-300 hover:underline">
            Business hub
          </Link>{" "}
          ·{" "}
          <Link href="/docs/business" className="font-bold text-cyan-300 hover:underline">
            Business guide
          </Link>
          .
        </p>
        <div className="mt-10">
          <InvoiceManager />
        </div>
      </section>
    </main>
  );
}
