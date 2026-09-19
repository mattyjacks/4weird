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
        coins by itself. Ghost (👻) has no monetary value and can never settle an invoice.
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

      <h2 className="mt-8 text-xl font-black">Worked example: memorandum to paid</h2>
      <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li><strong>Draft the memorandum.</strong> Open <Link className="font-bold underline" href="/business/invoices">/business/invoices</Link>, create an invoice for the org, and add line items with label, quantity, and coin unit price. Totals show coins with the dollar equivalent at 100 to 1.</li>
        <li><strong>Tie it to the CRM.</strong> Use the company and contact pickers so the memorandum points at real CRM records. An invoice without a company link is harder to reconcile at month end.</li>
        <li><strong>Send it and watch the rollup.</strong> Move draft to sent. Sent-but-unpaid totals roll up per org, and overdue dates flag automatically once the due date passes.</li>
        <li><strong>Settle through guarded checkout, then mark paid.</strong> Marking paid records the outcome; it moves no coins by itself. Ghost balances never settle anything, since Ghost carries no monetary value.</li>
        <li><strong>Void instead of deleting.</strong> A mistaken memorandum is voided in place today, preserving the audit trail. The planned trash tab will later offer soft-delete with 1-click restore inside 30 days. The technical suite documents that lifecycle in the <Link className="underline" href="/docs/remastery/invoicing">invoicing suite</Link>.</li>
      </ol>

      <h2 className="mt-8 text-xl font-black">Void today versus trash planned</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2 font-black">Action</th>
              <th className="px-4 py-2 font-black">Status</th>
              <th className="px-4 py-2 font-black">What happens</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-bold">Void</td>
              <td className="px-4 py-2 text-muted-foreground">Live today</td>
              <td className="px-4 py-2 text-muted-foreground">Cancels the memorandum in place; the row stays for audit.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-bold">CSV download</td>
              <td className="px-4 py-2 text-muted-foreground">Live today</td>
              <td className="px-4 py-2 text-muted-foreground">Exports rows for the books alongside the printable view.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-bold">Client directory</td>
              <td className="px-4 py-2 text-muted-foreground">Planned</td>
              <td className="px-4 py-2 text-muted-foreground">Managed companies with billing addresses and VAT IDs.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-bold">Vector PDF</td>
              <td className="px-4 py-2 text-muted-foreground">Planned</td>
              <td className="px-4 py-2 text-muted-foreground">One-click client-ready PDF rendered from the database row.</td>
            </tr>
            <tr className="border-b-0">
              <td className="px-4 py-2 font-bold">30-day trash</td>
              <td className="px-4 py-2 text-muted-foreground">Planned</td>
              <td className="px-4 py-2 text-muted-foreground">Soft-delete stamp, Trash tab countdown, restore, auto-purge.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-xl font-black">Troubleshooting</h2>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        <li><strong>Totals look wrong:</strong> check each line item quantity against its coin unit price, then confirm the dollar equivalent divides by 100. A misplaced decimal in quantity is the usual cause.</li>
        <li><strong>Invoice missing from the list:</strong> confirm the org switcher points at the owning org. Memoranda never cross orgs, so the wrong org shows an empty list by design.</li>
        <li><strong>Cannot restore a deleted invoice:</strong> hard removal has no restore path today. Void preserves the row; treat delete as permanent until the planned trash tab ships with its 30-day window.</li>
        <li><strong>Client asks for a PDF now:</strong> send the printable view or CSV export. One-click vector PDF is planned, and the <Link className="underline" href="/docs/business">business suite guide</Link> covers what exports exist today.</li>
      </ul>

      <h2 className="mt-8 text-xl font-black">FAQ</h2>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        <li><strong>Is void the same as delete?</strong> Today void cancels an invoice in place. Trash (soft-delete + restore + auto-purge) is the planned replacement for hard removal.</li>
        <li><strong>Can I send a PDF to a client today?</strong> Use the printable view or CSV for now — one-click PDF is planned.</li>
        <li><strong>Full terms?</strong> <Link className="underline" href="/terms">/terms</Link>. Business overview: <Link className="underline" href="/docs/business">/docs/business</Link>.</li>
        <li><strong>Do invoices move coins?</strong> No. Memoranda record intent; only the guarded checkout settles value. Marking paid without settlement misstates the books.</li>
        <li><strong>How does the 75/25 split apply?</strong> Coin-denominated totals split 75 percent provider credits to 25 percent platform on the receipt. The gross on the memorandum never changes; see the <Link className="underline" href="/docs/remastery/axioms">axiom sheet</Link> for the rule.</li>
        <li><strong>Where do tracked hours fit?</strong> Time entries convert into draft line items in one click. The <Link className="underline" href="/docs/remastery/time-tracking">time tracking guide</Link> shows the clock that feeds this page.</li>
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
