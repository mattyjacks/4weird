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
  ["Wave 2", "AI infra + MCP + P2P", "PLANNED — @4weird/mcp package, Discord bot, DebugPlay visual QA, DPS WebGPU compute sharing.", "🤖"],
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

      <Pager current="/docs/remastery" />
    </article>
  );
}
