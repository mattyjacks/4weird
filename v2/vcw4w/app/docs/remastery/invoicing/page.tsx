import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/remastery/invoicing" },
  title: "Remastery Invoicing Suite",
  description:
    "Wave 1 invoicing suite: client directory, draft-to-paid lifecycle, vector PDF export, and 30-day soft-delete trash with 1-click restore.",
};

const theme = {
  bg: "bg-gradient-to-br from-emerald-950 via-slate-950 to-teal-950",
  border: "border-emerald-300/20",
  chip: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200",
  title: "bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent",
};

export default function RemasteryInvoicingPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · remastery wave 1"
        title={<>Invoices that <span className={theme.title}>pay you back.</span></>}
        lede={<>The full B2B invoicing suite: a client directory with billing details, draft → sent → paid lifecycle, vector PDF export for clients, and a 30-day soft-delete trash with 1-click restore and auto-purge countdown.</>}
        stats={[
          ["30-day", "trash + restore"],
          ["PDF", "client-ready export"],
          ["5 states", "draft → paid"],
          ["F17", "spec feature 17"],
        ]}
        glyph="🧾"
        theme={theme}
        crumb="Invoicing"
        art={
          <div className="flex items-end gap-2" aria-hidden="true">
            {[62, 44, 70, 50, 76, 56, 66].map((h, i) => (
              <div
                key={i}
                className="docs-float w-10 rounded-t-full border border-emerald-200/50 bg-gradient-to-t from-teal-500 to-emerald-300 shadow-lg sm:w-12"
                style={{ height: h, animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="Clients"
        title="The directory"
        body="Invoice clients hold name, email, address, phone, and VAT number per user. Every invoice points at one client, and line items carry description, quantity, unit rate, total, and position — so the PDF renders exactly what the database says."
      />
      <MockWindow title="invoice INV-1042 — draft" badge="$100.00">
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>Sprint “ship the raid” · 2h × $50/h</span><span className="font-black text-emerald-300">$100.00</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>Tax 0% · USD</span><span className="font-black text-emerald-300">$0.00</span></div>
          <div className="flex justify-between gap-3 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2"><span className="font-bold text-emerald-200">Total due</span><span className="font-black text-emerald-200">$100.00</span></div>
        </div>
      </MockWindow>

      <SectionHead
        index="2"
        kicker="Safety net"
        title="The 30-day trash"
        body="Deleting an invoice sets deleted_at instead of removing the row. Trashed invoices sit in a Trash tab with an auto-purge countdown; restore clears deleted_at in one click, and after 30 days the row purges permanently. Active lists always filter deleted_at IS NULL — the index on (user_id, deleted_at) keeps both views fast."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["🗑️ Soft delete", "deleted_at timestamps the moment; nothing is ever hard-deleted by hand."],
          ["↩️ 1-click restore", "Clear the timestamp and the invoice rejoins the active list with history intact."],
          ["⏳ Auto-purge", "30-day countdown, then permanent purge — the trash cannot fill forever."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <Callout tone="emerald" title="Invoices are owner-scoped, line items inherit.">
        RLS is simple and strict: invoices and clients allow only their owner, and line items resolve through the
        parent invoice. No squad role — not even lead — can read another member&apos;s invoices.
      </Callout>

      <SectionHead
        index="3"
        kicker="Flow"
        title="From tracked hours to paid"
      />
      <Steps
        items={[
          ["Convert tracked time", <>One click in the <Link className="underline" href="/docs/remastery/time-tracking">time tracker</Link> aggregates unbilled entries into a pre-filled draft with line items.</>],
          ["Address and send", <>Pick the client from the directory, set issue and due dates, tax, and sender branding — then move draft → sent.</>],
          ["Export the PDF", <>Generate the vector PDF for the client record. The PDF is a render of the database row, never a separate truth.</>],
          ["Settle and mark paid", <>When value lands, mark paid. Coin-denominated totals follow the <Link className="underline" href="/docs/remastery/axioms">75/25 axiom</Link>: gross on the invoice, split on the receipt.</>],
        ]}
      />

      <Pager current="/docs/remastery/invoicing" />
    </article>
  );
}
