import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/business" },
  title: "Business suite guide",
  description:
    "Plain-English guide to the 4weird Business suite: UnitUnite, orgs, timer, projects, CRM, invoices, vault.",
};

const API_ROWS: [string, string][] = [
  ["GET /api/crm/companies?org_id=", "List an org's companies."],
  ["POST /api/crm/companies", "Create a company { org_id, name, domain?, industry?, size?, website?, notes? }."],
  ["GET /api/crm/contacts?org_id=", "List an org's contacts."],
  ["POST /api/crm/contacts", "Create a contact { org_id, full_name, email?, phone?, company_id? }."],
  ["GET /api/crm/deals?org_id=&stage=", "List deals, optionally by pipeline stage."],
  ["POST /api/crm/deals", "Create a deal { org_id, title, value_coins, stage?, probability? }."],
  ["PATCH /api/crm/deals", "Move a deal { id, stage } through lead → qualified → proposal → negotiation → won/lost."],
  ["GET /api/crm/activities?org_id=", "List follow-ups and tasks."],
  ["POST /api/crm/activities", "Log a note, call, email, meeting, or task { org_id, kind?, body?, due_at? }."],
  ["PATCH /api/crm/activities", "Complete or edit an activity { id, done? }."],
  ["GET /api/crm/invoices?org_id=", "List invoices with line items { invoices: [{ …invoice, items }] }."],
  ["POST /api/crm/invoices", "Draft an invoice { org_id, items: [{ label, qty, unit_coins }], number?, tax_coins?, due_date?, payment_ref? }. Numbers are unique per org."],
  ["PATCH /api/crm/invoices", "Advance status { id, status }: draft → sent → paid, or void."],
  ["GET /api/crm/summary?org_id=", "Dashboard rollup: pipeline coins, open deals, overdue activities, unpaid invoices."],
];

const SECTIONS: [string, string, string][] = [
  ["🚀 UnitUnite", "/squads", "Squad workspaces: people, projects (Code + Issues), encrypted team messaging, cloud services."],
  ["🏢 Orgs & teams", "/squads#orgs", "Orgs hold billing and audit; roles gate every action. New users get one zero-cost default org."],
  ["⏱️ Timer", "/timer", "Second-by-second work clock. Team ticks invoice into Ghost Cash books — memoranda only."],
  ["📋 Projects", "/squads", "Team code projects with milestones and tasks, inside the workspace."],
  ["🤝 CRM", "/business/crm", "Companies, contacts, deal pipeline, activities, and the summary dashboard."],
  ["🧾 Invoices", "/business/invoices", "Coin memoranda in Vibe Coins (100 🪙 = $1.00). Draft → sent → paid, or void."],
  ["🗄️ Vault", "/vault", "Private files for you, your team, or your org — strictly separated."],
];

export default function BusinessDocsPage() {
  return (
    <article>
      <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-300">
        4weird.com/docs/business · Business suite
      </p>
      <h1 className="mt-2 text-3xl font-black">Business, in plain English</h1>
      <p className="mt-3 text-muted-foreground">
        Seven tools, one rule: <strong>100 Vibe Coins = exactly $1.00</strong>, and the 25%
        cut is already inside every price. Start at{" "}
        <Link className="font-bold underline" href="/business">/business</Link>, do the
        work in <Link className="font-bold underline" href="/squads">/squads</Link>, bill it
        from <Link className="font-bold underline" href="/business/invoices">/business/invoices</Link>.
      </p>

      <h2 className="mt-8 text-xl font-black">The seven tools</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {SECTIONS.map(([title, href, body]) => (
          <Link
            key={href + title}
            href={href}
            className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-cyan-500/50 hover:shadow-xl"
          >
            <p className="font-black group-hover:text-cyan-600 dark:group-hover:text-cyan-300">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-8 text-xl font-black">CRM API</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        All routes need a login; all writes are org-scoped and rate-limited. Coins never move
        here — settlement happens only in the guarded checkout and ledger flows.
      </p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2 font-black">Route</th>
              <th className="px-4 py-2 font-black">What it does</th>
            </tr>
          </thead>
          <tbody>
            {API_ROWS.map(([route, what]) => (
              <tr key={route} className="border-b border-border/50 last:border-0">
                <td className="px-4 py-2 font-mono text-xs font-bold">{route}</td>
                <td className="px-4 py-2 text-muted-foreground">{what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-xl font-black">Invoices are memoranda, not tax invoices</h2>
      <p className="mt-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm font-bold">
        These are NOT tax invoices - internal coin accounting only (100 coins = $1.00).
        Marking one paid moves no coins by itself.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        An invoice here is an org memorandum — a polite, itemized reminder. It is not a tax
        invoice, VAT/GST invoice, payroll record, or receipt, and marking one paid moves no
        coins by itself. Ghost Cash (👻) has no cash value and can never settle an invoice.
        Full terms live in <Link className="underline" href="/terms">/terms</Link>.
      </p>

      <h2 className="mt-8 text-xl font-black">FAQ</h2>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        <li><strong>Is CRM data org-scoped?</strong> Yes — every company, contact, deal, activity, and invoice belongs to one org and never crosses orgs.</li>
        <li><strong>Coins vs USD?</strong> 100 Vibe Coins = exactly $1.00 everywhere in the CRM; totals show both.</li>
        <li><strong>Ghost Cash vs invoices?</strong> Ghost Cash (👻) IOUs never settle an invoice; invoices are memoranda, NOT tax invoices.</li>
      </ul>

      <p className="mt-8 rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        Next: <Link className="underline" href="/business">Business hub</Link> ·{" "}
        <Link className="underline" href="/business/crm">CRM</Link> ·{" "}
        <Link className="underline" href="/business/invoices">Invoices</Link> ·{" "}
        <Link className="underline" href="/docs">All docs</Link>
      </p>
    </article>
  );
}
