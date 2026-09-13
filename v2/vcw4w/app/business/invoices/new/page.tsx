import type { Metadata } from "next";
import Link from "next/link";
import { InvoiceForm } from "@/components/invoice/invoice-form";

export const metadata: Metadata = {
  alternates: { canonical: "/business/invoices/new" },
  title: "New invoice",
  description: "Draft a client invoice with line items, tax, and live totals.",
};

export default function NewInvoicePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-5xl px-5 py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
          4WEIRD // BUSINESS // INVOICES
        </p>
        <h1 className="mt-2 text-4xl font-black">New invoice</h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          Drafts autosave locally in your browser. Related:{" "}
          <Link href="/business/invoices" className="font-bold text-cyan-300 hover:underline">
            Invoice list
          </Link>{" "}
          ·{" "}
          <Link href="/business/invoices/trash" className="font-bold text-cyan-300 hover:underline">
            Trash
          </Link>
          .
        </p>
        <div className="mt-10">
          <InvoiceForm />
        </div>
      </section>
    </main>
  );
}
