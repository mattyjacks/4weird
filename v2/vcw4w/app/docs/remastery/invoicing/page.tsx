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

      <SectionHead
        index="4"
        kicker="Worked example"
        title="One sprint, billed and paid"
        body="A two hour sprint becomes a paid invoice with no retyping: track, convert, address, send, export, settle."
      />
      <Steps
        items={[
          ["Track two hours", <>Run the <Link className="underline" href="/docs/remastery/time-tracking">time tracker</Link> during the raid build. Two unbilled entries at the project rate of $50 per hour wait as 10,000 coins of value.</>],
          ["Convert to a draft", <>One click aggregates the entries into draft INV-1042 with line items, quantities, and unit rates pre-filled. The draft holds tax 0 percent and USD currency until you change them.</>],
          ["Address and brand", <>Pick the client from the directory, set issue and due dates, and confirm sender branding. The PDF preview renders exactly the database row, so what you see is what the client gets.</>],
          ["Send, then export", <>Move draft to sent and generate the vector PDF for the client record. The PDF is a render of the row, never a separate truth that can drift.</>],
          ["Mark paid on settlement", <>When value lands, mark paid. Coin-denominated totals follow the <Link className="underline" href="/docs/remastery/axioms">75/25 axiom</Link>: 7,500 provider credits and 2,500 platform on a 10,000 coin gross.</>],
        ]}
      />

      <SectionHead
        index="5"
        kicker="Lifecycle"
        title="Five states, one direction"
        body="Invoices move forward through states; only trash moves them sideways. Learn the five so a status badge never confuses you."
      />
      <div className="mt-5 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2 font-black">State</th>
              <th className="px-4 py-2 font-black">What it means</th>
              <th className="px-4 py-2 font-black">Allowed next moves</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-bold">draft</td>
              <td className="px-4 py-2 text-muted-foreground">Editable working copy, invisible to the client.</td>
              <td className="px-4 py-2 text-muted-foreground">Edit freely, then send or trash.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-bold">sent</td>
              <td className="px-4 py-2 text-muted-foreground">Issued to the client, awaiting value.</td>
              <td className="px-4 py-2 text-muted-foreground">Mark paid, mark overdue, cancel, or trash.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-bold">paid</td>
              <td className="px-4 py-2 text-muted-foreground">Value landed and reconciled.</td>
              <td className="px-4 py-2 text-muted-foreground">Terminal: kept for the books, never edited.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-bold">overdue</td>
              <td className="px-4 py-2 text-muted-foreground">Past due date while still unpaid.</td>
              <td className="px-4 py-2 text-muted-foreground">Nudge the client, then paid or cancelled.</td>
            </tr>
            <tr className="border-b-0">
              <td className="px-4 py-2 font-bold">cancelled</td>
              <td className="px-4 py-2 text-muted-foreground">Voided in place, kept for audit.</td>
              <td className="px-4 py-2 text-muted-foreground">Terminal: trash handles removal instead.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SectionHead
        index="6"
        kicker="FAQ"
        title="Invoicing questions, answered"
        body="Ownership, trash timing, and the plain-English companion guide."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">Can a squad lead read my invoices?</p>
          <p className="mt-1 text-sm text-muted-foreground">No. Invoices and clients are owner-scoped and line items inherit through the parent invoice. No squad role can cross that boundary.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">How long does trash keep an invoice?</p>
          <p className="mt-1 text-sm text-muted-foreground">Thirty days with a visible auto-purge countdown, then permanent purge. Restore any time inside the window with one click and history stays intact.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">PDF or database: which is truth?</p>
          <p className="mt-1 text-sm text-muted-foreground">The database row. The vector PDF is a render generated per export, so regenerating after an edit always reflects the current row.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">Is there a plain-English version?</p>
          <p className="mt-1 text-sm text-muted-foreground">          Yes: <Link className="underline" href="/docs/remastery/invoicing-trash">invoicing and trash, in plain English</Link> covers the live memoranda flow plus the planned upgrades in everyday language.</p>
        </div>
      </div>

      <SectionHead
        index="7"
        kicker="Troubleshooting"
        title="When invoicing misbehaves"
        body="Four fixes for the most common invoice surprises. All are local data checks, never permission escalations."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">Converted draft shows zero lines</p>
          <p className="mt-1 text-sm text-muted-foreground">The tracker had no unbilled entries for that project and period. Log hours first, confirm they appear as unbilled, then convert again.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">PDF totals differ from memory</p>
          <p className="mt-1 text-sm text-muted-foreground">Regenerate after any edit: the export renders the live row. Stale downloads from before a correction are the usual mismatch.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">Restore button missing</p>
          <p className="mt-1 text-sm text-muted-foreground">You are looking at the active list, not the Trash tab. Switch tabs to see the countdown and the one-click restore control.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">Client cannot open the PDF</p>
          <p className="mt-1 text-sm text-muted-foreground">Re-export and resend: the file is a standard vector document with no viewer lock-in. Confirm the client record holds the right email before resending.</p>
        </div>
      </div>

      <Pager current="/docs/remastery/invoicing" />
    </article>
  );
}
