import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/remastery/time-tracking" },
  title: "Time tracking guide (Wave 1)",
  description:
    "Plain-English guide to 4weird time tracking: the live Ghost Timer at /timer today and the planned pro clock with budgets and 1-click invoicing.",
};

export default function TimeTrackingDocsPage() {
  return (
    <article>
      <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-300">
        4weird.com/docs/remastery/time-tracking · Wave 1
      </p>
      <h1 className="mt-2 text-3xl font-black">Time tracking, in plain English</h1>
      <p className="mt-3 text-muted-foreground">
        Clock org work to the second at <Link className="font-bold underline" href="/timer">/timer</Link>.
        Tracked seconds can invoice into debts — but Ghost Cash (👻) is a hypothetical ruler for
        debts with <strong>no cash value</strong>: it measures, stores nothing, buys nothing.
      </p>

      <h2 className="mt-8 text-xl font-black">What exists today at /timer</h2>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        <li><strong>Second-precision work clock</strong> with activity-beat presence proof.</li>
        <li><strong>Ghost Cash IOUs:</strong> hypothetical, centrally-controlled, no legal value — a ruler for who-owes-whom, not money.</li>
        <li><strong>Work-diary CSV export</strong> for bookkeeping; shift notes attach proof in the Vault; contracts live under /business/contracts and clients in the CRM.</li>
        <li><strong>Business cross-links:</strong> tracked time flows toward real invoices from the Business Hub.</li>
      </ul>

      <h2 className="mt-8 text-xl font-black">Planned: pro clock (/timer/pro)</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The remastery blueprint upgrades the clock into a drift-proof pro tracker.{" "}
        <strong>Status: planned</strong> — none of these exist yet:
      </p>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        <li><strong>Background-tick engine:</strong> ticks keep running accurately even when the tab is minimized.</li>
        <li><strong>Projects with rates &amp; budgets:</strong> hourly rate plus budget-hours per project so teams see burn.</li>
        <li><strong>Kanban-linked entries:</strong> attach a time entry to a sprint card to compare logged vs estimated hours.</li>
        <li><strong>1-click invoice conversion:</strong> aggregate unbilled entries into a pre-filled draft invoice.</li>
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
              <td className="px-4 py-2 font-mono text-xs font-bold">time_projects</td>
              <td className="px-4 py-2 text-muted-foreground">user_id, squad_id, name, color_hex, hourly_rate, budget_hours, is_billable.</td>
            </tr>
            <tr className="border-b-0">
              <td className="px-4 py-2 font-mono text-xs font-bold">time_entries</td>
              <td className="px-4 py-2 text-muted-foreground">user_id, project_id, card_id, description, start_time, end_time, duration_seconds, is_billable, is_invoiced.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Entries are yours only (planned per-user RLS). Marking time billable never moves coins by
        itself — settlement happens only in guarded checkout flows.
      </p>

      <h2 className="mt-8 text-xl font-black">FAQ</h2>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        <li><strong>Can Ghost Cash pay an invoice?</strong> No — Ghost Cash IOUs never settle an invoice; invoices are memoranda, not tax invoices.</li>
        <li><strong>Coins vs USD?</strong> 100 Vibe Coins = exactly $1.00 wherever totals appear.</li>
        <li><strong>Does minimizing the tab lose seconds today?</strong> The current /timer clock can drift when backgrounded — the drift-proof engine is the planned fix.</li>
      </ul>

      <p className="mt-8 rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        Next: <Link className="underline" href="/docs/remastery/invoicing-trash">Invoicing &amp; trash</Link> ·{" "}
        <Link className="underline" href="/docs/remastery/kanban-sprints">Kanban sprints</Link> ·{" "}
        <Link className="underline" href="/timer">Open /timer</Link> ·{" "}
        <Link className="underline" href="/docs">All docs</Link>
      </p>
    </article>
  );
}
