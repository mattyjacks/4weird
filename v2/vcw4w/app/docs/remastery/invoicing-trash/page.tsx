import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/remastery/invoicing-trash" },
  title: "Invoicing & trash lifecycle guide (Wave 1)",
  description:
    "Plain-English guide to 4weird invoices: the live memoranda flow at /business/invoices today and the planned client directory, PDF export, and 30-day trash.",
};

export default function InvoicingTrashDocsPage() {
  return (
    <article>
      <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-300">
        4weird.com/docs/remastery/invoicing-trash · Wave 1
      </p>
      <h1 className="mt-2 text-3xl font-black">Invoicing &amp; trash, in plain English</h1>
      <p className="mt-3 text-muted-foreground">
        Bill clients in coins at{" "}
        <Link className="font-bold underline" href="/business/invoices">/business/invoices</Link> —
        100 🪙 = exactly $1.00. Draft a memorandum, send it, mark it paid when the guarded
        checkout settles.
      </p>

      <p className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm font-bold">
        These are NOT tax invoices — internal coin accounting only. Marking one paid moves no
        coins by itself. Ghost Cash (👻) has no cash value and can never settle an invoice.
      </p>

      <h2 className="mt-8 text-xl font-black">What exists today</h2>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        <li><strong>Org-scoped memoranda:</strong> every invoice belongs to one org and never crosses orgs.</li>
        <li><strong>Lifecycle:</strong> draft → sent → paid, or void. Overdue dates are flagged; sent-but-unpaid totals roll up.</li>
        <li><strong>Line items:</strong> label, quantity, and coin unit price per line; totals show coins with the USD equivalent.</li>
        <li><strong>Exports:</strong> CSV download and a printable view for the books.</li>
        <li><strong>Company + contact pickers</strong> tie an invoice to CRM records.</li>
      </ul>

      <h2 className="mt-8 text-xl font-black">Planned: directory, PDF, trash</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The remastery blueprint adds three upgrades. <strong>Status: planned</strong> — none of
        these exist yet:
      </p>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        <li><strong>Client directory:</strong> managed client companies with billing addresses and VAT IDs.</li>
        <li><strong>Vector PDF export:</strong> one-click client-ready downloadable PDF per invoice.</li>
        <li><strong>30-day trash lifecycle:</strong> deleting an invoice stamps it with a deleted-at time, parks it in a Trash tab with an auto-purge countdown, and offers 1-click restore before the 30 days run out.</li>
      </ul>

      <h2 className="mt-8 text-xl font-black">Data shapes (planned schema)</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2 font-black">Table</th>
              <th className="px-4 py-2 font-black">What it holds</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-mono text-xs font-bold">invoice_clients</td>
              <td className="px-4 py-2 text-muted-foreground">user_id, name, email, address, phone, vat_number.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-mono text-xs font-bold">invoices</td>
              <td className="px-4 py-2 text-muted-foreground">user_id, client_id, invoice_number, issue_date, due_date, currency, tax_rate, subtotal, tax_amount, total_amount, status (draft | sent | paid | overdue | cancelled), sender company fields, deleted_at (trash), timestamps.</td>
            </tr>
            <tr className="border-b-0">
              <td className="px-4 py-2 font-mono text-xs font-bold">invoice_line_items</td>
              <td className="px-4 py-2 text-muted-foreground">invoice_id, description, quantity, unit_rate, total, position.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Invoices and clients are yours only (planned per-user RLS); line items follow their invoice.
      </p>

      <h2 className="mt-8 text-xl font-black">FAQ</h2>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        <li><strong>Is void the same as delete?</strong> Today void cancels an invoice in place. Trash (soft-delete + restore + auto-purge) is the planned replacement for hard removal.</li>
        <li><strong>Can I send a PDF to a client today?</strong> Use the printable view or CSV for now — one-click PDF is planned.</li>
        <li><strong>Full terms?</strong> <Link className="underline" href="/terms">/terms</Link>. Business overview: <Link className="underline" href="/docs/business">/docs/business</Link>.</li>
      </ul>

      <p className="mt-8 rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        Next: <Link className="underline" href="/docs/remastery/time-tracking">Time tracking</Link> ·{" "}
        <Link className="underline" href="/docs/remastery/chat">Chat</Link> ·{" "}
        <Link className="underline" href="/business/invoices">Open invoices</Link> ·{" "}
        <Link className="underline" href="/docs">All docs</Link>
      </p>
    </article>
  );
}
