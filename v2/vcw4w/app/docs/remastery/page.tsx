import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, SplitBar, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/remastery" },
  title: "Remastery Wave 1 Rollout",
  description:
    "The 4weird remastery Wave 1 rollout overview: private squad workspaces, kanban sprints, time tracking, invoicing, notifications, and direct chat — with zero public marketplace risk.",
};

const theme = {
  bg: "bg-gradient-to-br from-cyan-950 via-slate-950 to-violet-950",
  border: "border-cyan-300/20",
  chip: "border-cyan-300/40 bg-cyan-300/10 text-cyan-200",
  title: "bg-gradient-to-r from-cyan-300 via-violet-200 to-fuchsia-300 bg-clip-text text-transparent",
};

const WAVES: [string, string, string, string][] = [
  ["Wave 1", "Squads + invoicing + time", "SHIPPED IN THESE DOCS — squad workspaces, kanban sprints, time tracking, invoicing suite, notifications, 1-on-1 chat.", "🛠️"],
  ["Wave 2", "AI infra + MCP + P2P", "PLANNED — @4weird/mcp package, chat bot, DebugPlay visual QA, DPS WebGPU compute sharing.", "🤖"],
  ["Wave 3", "Creative suite + NLE", "PLANNED — Media Mogul video timeline, DictatePic canvas, interop bus, .4weird container format.", "🎬"],
];

const SLICES: [string, string, string][] = [
  ["/docs/remastery/squads", "🏕️ Squad workspaces", "Invite-only team homes (UnitUnite): projects, roles, pooled coin balances."],
  ["/docs/remastery/kanban", "🗂️ Kanban sprints", "Drag-and-drop boards with cycles, priorities, and hour estimates."],
  ["/docs/remastery/time-tracking", "⏱️ Time tracking", "Drift-proof work clock with project rates and 1-click invoice conversion."],
  ["/docs/remastery/invoicing", "🧾 Invoicing suite", "Client directory, vector PDF export, 30-day soft-delete trash."],
  ["/docs/remastery/notifications-chat", "🔔 Notifications + chat", "Realtime notification center and private 1-on-1 squad chat."],
  ["/docs/remastery/migration", "🗄️ SQL migration runbook", "Run the Wave 1 Supabase migration step by step, then verify it."],
  ["/docs/remastery/axioms", "📜 Axiom sheet", "100 coins = $1, 75/25 split, fail-open, zero marketplace risk."],
];

export default function RemasteryPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · remastery"
        title={<>Wave 1: squads ship <span className={theme.title}>together.</span></>}
        lede={<>The remastery folds GiveGigs-style team tooling into private 4weird squads — workspaces, kanban, time tracking, invoicing, notifications, and chat. No public labor marketplace, ever: invite-only squads carry the whole collaboration story.</>}
        stats={[
          ["Wave 1", "6 slices, this guide"],
          ["100 🪙", "= $1.00 always"],
          ["75 / 25", "provider / platform"],
          ["0", "marketplace risk"],
        ]}
        glyph="🛠️"
        theme={theme}
        crumb="Remastery"
        art={
          <div className="flex items-end gap-2" aria-hidden="true">
            {[44, 66, 52, 78, 60, 88, 72].map((h, i) => (
              <div
                key={i}
                className="docs-float w-10 rounded-t-full border border-cyan-200/50 bg-gradient-to-t from-violet-500 to-cyan-300 shadow-lg sm:w-12"
                style={{ height: h, animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="The map"
        title="Three waves, one direction"
        body="Wave 1 lays the team foundation every later wave stands on: squads to belong to, boards to plan on, a clock that tells the truth, invoices that pay, and realtime pings that keep everyone in sync. Waves 2 and 3 add AI infrastructure and the creative suite on top."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {WAVES.map(([wave, title, blurb, glyph]) => (
          <div key={wave} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-2xl" aria-hidden="true">{glyph}</p>
            <p className="mt-1 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">{wave}</p>
            <p className="font-black">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
          </div>
        ))}
      </div>

      <Callout tone="violet" title="Zero worker marketplace risk — by design, not by accident.">
        An open public freelancer directory was evaluated and <strong>rejected</strong>: labor-law liability,
        doxxing and spam exposure, money-transmitter licensing, and off-platform leakage. Squads are invite-only,
        permissioned team workspaces instead. Read the full reasoning on the{" "}
        <Link className="underline" href="/docs/remastery/axioms">axiom sheet</Link>.
      </Callout>

      <SectionHead
        index="2"
        kicker="The slices"
        title="What Wave 1 delivers"
        body="Each slice below has its own page: what it is, where it lives, which tables back it, and how coins flow through it. Start anywhere — but if you run infrastructure, start with the migration runbook."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {SLICES.map(([href, title, blurb]) => (
          <Link
            key={href}
            href={href}
            className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-cyan-400/50"
          >
            <p className="font-black group-hover:text-cyan-600 dark:group-hover:text-cyan-300">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
            <p className="mt-2 text-xs font-bold text-cyan-600 dark:text-cyan-300">Read the slice →</p>
          </Link>
        ))}
      </div>

      <SectionHead
        index="3"
        kicker="Money in one picture"
        title="Every Wave 1 coin move splits 75/25"
        body="Squad cloud bookings, pooled balances, and provider payouts all follow the same rule: the provider keeps 75% as on-site credits, the platform keeps 25% for infrastructure. You only ever see the gross."
      />
      <SplitBar leftLabel="75% provider credits" rightLabel="25% platform" />

      <SectionHead
        index="4"
        kicker="Rollout order"
        title="Suggested path through Wave 1"
      />
      <Steps
        items={[
          ["Read the axioms", <>Five minutes on the <Link className="underline" href="/docs/remastery/axioms">axiom sheet</Link> so the coin math and safety rules are second nature before you touch anything.</>],
          ["Run the migration", <>Follow the <Link className="underline" href="/docs/remastery/migration">SQL migration runbook</Link> in the Supabase SQL editor: tables, RLS, indexes, then the verify queries.</>],
          ["Open a squad workspace", <>Create a squad, invite collaborators, and open the <Link className="underline" href="/docs/remastery/squads">workspace</Link> and <Link className="underline" href="/docs/remastery/kanban">kanban board</Link>.</>],
          ["Clock time, send an invoice", <>Track real hours with the <Link className="underline" href="/docs/remastery/time-tracking">time tracker</Link>, convert them in one click, and issue the <Link className="underline" href="/docs/remastery/invoicing">invoice</Link>.</>],
        ]}
      />

      <SectionHead
        index="5"
        kicker="Coin math"
        title="One invoice, fully priced"
        body="The 75/25 rule is easiest to see on a single invoice. Gross on the paper, split on the receipt, coins everywhere."
      />
      <div className="mt-5 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2 font-black">Line</th>
              <th className="px-4 py-2 font-black">Dollars</th>
              <th className="px-4 py-2 font-black">Coins</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 text-muted-foreground">Sprint work: 2 hours at $50 per hour</td>
              <td className="px-4 py-2 font-bold">$100.00</td>
              <td className="px-4 py-2 font-bold">10,000</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 text-muted-foreground">Provider keeps 75 percent as on-site credits</td>
              <td className="px-4 py-2 font-bold">$75.00</td>
              <td className="px-4 py-2 font-bold">7,500</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 text-muted-foreground">Platform keeps 25 percent for infrastructure</td>
              <td className="px-4 py-2 font-bold">$25.00</td>
              <td className="px-4 py-2 font-bold">2,500</td>
            </tr>
            <tr className="border-b-0">
              <td className="px-4 py-2 text-muted-foreground">Client sees gross only</td>
              <td className="px-4 py-2 font-bold">$100.00</td>
              <td className="px-4 py-2 font-bold">10,000</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Callout tone="cyan" title="The axiom sheet is the source of truth.">
        Parity, split, fail-open, idempotency, and workspace privacy are defined on the{" "}
        <Link className="underline" href="/docs/remastery/axioms">axiom sheet</Link>. When this overview and that
        sheet disagree, the sheet wins.
      </Callout>

      <SectionHead
        index="6"
        kicker="FAQ"
        title="Wave 1 questions, answered"
        body="Scope, safety, and starting points for squads adopting Wave 1 this week."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">Where do squads live?</p>
          <p className="mt-1 text-sm text-muted-foreground">Invite-only workspaces under <Link className="underline" href="/docs/remastery/squads">squad workspaces</Link>: projects, roles, and pooled coin balances per team. No public directory, no stranger discovery.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">How do hours become invoices?</p>
          <p className="mt-1 text-sm text-muted-foreground">Track with the <Link className="underline" href="/docs/remastery/time-tracking">time tracker</Link>, convert unbilled entries in one click, and issue from the <Link className="underline" href="/docs/remastery/invoicing">invoicing suite</Link> with vector PDF export.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">What keeps everyone in sync?</p>
          <p className="mt-1 text-sm text-muted-foreground">Plan on <Link className="underline" href="/docs/remastery/kanban">kanban boards</Link> and hear about it in <Link className="underline" href="/docs/remastery/notifications-chat">notifications plus chat</Link>: realtime pings with polling fallback, plus private squad threads.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">What does infrastructure run first?</p>
          <p className="mt-1 text-sm text-muted-foreground">          The <Link className="underline" href="/docs/remastery/migration">SQL migration runbook</Link>: tables, row policies, indexes, then verify queries. App teams can read axioms while that runs.</p>
        </div>
      </div>

      <SectionHead
        index="7"
        kicker="Role paths"
        title="Pick your path through Wave 1"
        body="Three starting points depending on your job in the squad. Each path ends at shipped value, not at reading more docs."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-2xl" aria-hidden="true">🏕️</p>
          <p className="mt-1 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">Squad lead</p>
          <p className="font-black">Found the squad</p>
          <p className="mt-1 text-sm text-muted-foreground">Create the <Link className="underline" href="/docs/remastery/squads">workspace</Link>, invite collaborators with roles, open the <Link className="underline" href="/docs/remastery/kanban">kanban board</Link>, and run the first sprint cycle with hour estimates on every card.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-2xl" aria-hidden="true">💻</p>
          <p className="mt-1 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">Contributor</p>
          <p className="font-black">Clock and deliver</p>
          <p className="mt-1 text-sm text-muted-foreground">Pull cards from the board, track honest hours in the <Link className="underline" href="/docs/remastery/time-tracking">time tracker</Link>, and follow <Link className="underline" href="/docs/remastery/notifications-chat">notifications plus chat</Link> so reviews never wait on you.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-2xl" aria-hidden="true">🧾</p>
          <p className="mt-1 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">Finance</p>
          <p className="font-black">Bill and reconcile</p>
          <p className="mt-1 text-sm text-muted-foreground">Convert tracked hours into the <Link className="underline" href="/docs/remastery/invoicing">invoicing suite</Link>, export vector PDFs, and reconcile against the <Link className="underline" href="/docs/remastery/axioms">75/25 axiom</Link> receipts each month.</p>
        </div>
      </div>
      <Callout tone="violet" title="Operators start at the migration, everyone else at the axioms.">
        If you own the database, the <Link className="underline" href="/docs/remastery/migration">migration runbook</Link> is
        step zero. If you own the work, five minutes on the <Link className="underline" href="/docs/remastery/axioms">axiom sheet</Link> pays
        back every week you run Wave 1.
      </Callout>

      <Pager current="/docs/remastery" />
    </article>
  );
}
