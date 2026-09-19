import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/remastery/squads" },
  title: "Remastery Squad Workspaces",
  description:
    "Wave 1 squad workspaces (UnitUnite): invite-only team homes with projects, roles, and pooled coin balances — all GiveGigs tooling, zero marketplace risk.",
};

const theme = {
  bg: "bg-gradient-to-br from-emerald-950 via-slate-950 to-cyan-950",
  border: "border-emerald-300/20",
  chip: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200",
  title: "bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent",
};

export default function RemasterySquadsPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · remastery wave 1"
        title={<>Squads are <span className={theme.title}>home base.</span></>}
        lede={<>Private, invite-only team workspaces (UnitUnite) where trusted collaborators coordinate game development: shared projects, member roles, sprint links, time budgets, invoices, and pooled coin balances — with no public labor marketplace anywhere in the loop.</>}
        stats={[
          ["Invite", "only, always"],
          ["3 roles", "lead · contributor · reviewer"],
          ["75 / 25", "on pooled spend"],
          ["F14", "spec feature 14"],
        ]}
        glyph="🏕️"
        theme={theme}
        crumb="Squads"
        art={
          <div className="flex items-end gap-2" aria-hidden="true">
            {[52, 70, 58, 80, 62, 74, 66].map((h, i) => (
              <div
                key={i}
                className="docs-float w-10 rounded-t-full border border-emerald-200/50 bg-gradient-to-t from-cyan-500 to-emerald-300 shadow-lg sm:w-12"
                style={{ height: h, animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="The idea"
        title="Teams, not marketplaces"
        body="A squad is a permissioned workspace: a roster of people you invited, the game projects you share, and the boards, clocks, and invoices attached to them. Strangers cannot browse squads, bid on work, or message members — that entire marketplace surface was rejected on purpose."
      />
      <MockWindow title="squad workspace — at a glance" badge="UnitUnite">
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>GraveGain 3D · instanced meshes</span><span className="font-black text-emerald-300">3 contributors</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>Active sprint: “ship the raid”</span><span className="font-black text-emerald-300">68% done</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>Pooled balance</span><span className="font-black text-emerald-300">2,400 🪙</span></div>
          <div className="flex justify-between gap-3 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2"><span className="font-bold text-emerald-200">This week tracked</span><span className="font-black text-emerald-200">14.5h → draft invoice</span></div>
        </div>
      </MockWindow>

      <SectionHead
        index="2"
        kicker="Membership"
        title="Roles and projects"
        body="Squad projects carry a name, description, repository URL, and target game slug. Members join projects as lead, contributor, or reviewer. Reads are gated by squad membership in RLS: if you are not on the roster, the workspace does not exist for you."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["👑 Lead", "Creates projects, manages the roster, approves invoices and pooled spend."],
          ["🔧 Contributor", "Ships work: moves kanban cards, clocks time, attaches evidence."],
          ["🔍 Reviewer", "Reads everything, approves diffs, signs off sprints — no direct spend."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <SectionHead
        index="3"
        kicker="The hub"
        title="Everything hangs off the workspace"
      />
      <Steps
        items={[
          ["Open the kanban board", <>Plan the sprint on the <Link className="underline" href="/docs/remastery/kanban">squad kanban board</Link> — cards carry hour estimates that the timer understands.</>],
          ["Clock real hours", <>Contributors track against squad projects in the <Link className="underline" href="/docs/remastery/time-tracking">time tracker</Link>; budgets and burn roll up to the workspace.</>],
          ["Bill without drama", <>Convert unbilled entries to a draft in the <Link className="underline" href="/docs/remastery/invoicing">invoicing suite</Link> and export a client-ready PDF.</>],
          ["Stay in sync", <>Sprint updates, render completions, and raid calls surface in <Link className="underline" href="/docs/remastery/notifications-chat">notifications and chat</Link>.</>],
        ]}
      />
      <Callout tone="emerald" title="Pooled balances follow the same 75/25 rule.">
        When squad cloud spend settles, providers keep 75% as on-site credits and the platform keeps 25% for
        infrastructure. The workspace shows gross balances only — the split is receipt detail, never a surcharge.
      </Callout>

      <SectionHead
        index="4"
        kicker="Worked example"
        title="First week of a new squad"
        body="A lead spins up a four person GraveGain squad on Monday. By Sunday the workspace hums: roster set, project linked, sprint running, hours clocked, first draft invoice ready."
      />
      <MockWindow title="new squad checklist" badge="day 7">
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>Invite 4 collaborators</span><span className="font-black text-emerald-300">roster set</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>Create project + repository URL</span><span className="font-black text-emerald-300">code linked</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>Open sprint with 6 estimated cards</span><span className="font-black text-emerald-300">board live</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>Clock 14.5 hours against cards</span><span className="font-black text-emerald-300">burn visible</span></div>
          <div className="flex justify-between gap-3 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2"><span className="font-bold text-emerald-200">Convert unbilled to draft</span><span className="font-black text-emerald-200">invoice ready</span></div>
        </div>
      </MockWindow>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Roles carry the week: the lead approves roster and spend, contributors move cards and clock
        time, the reviewer signs off the sprint demo. The pooled balance shows gross coins only, and
        the plain English tour lives in the{" "}
        <Link className="underline" href="/docs/remastery/squad-workspaces">squad workspaces guide</Link>.
        Setting up the tables underneath? Follow the{" "}
        <Link className="underline" href="/docs/remastery/migration">migration runbook</Link>.
      </p>
      <Callout tone="gold" title="Invite people you would lend a laptop to.">
        There is no public squad directory and no application queue. Leads invite collaborators
        directly, grant the narrowest role that fits, and remove access the day someone leaves.
      </Callout>

      <SectionHead
        index="5"
        kicker="Troubleshooting"
        title="Workspace missing or empty"
      />
      <Steps
        items={[
          ["Squad is invisible", <>Strangers see nothing by design. If an invited member cannot find the squad, they are not on the roster yet: the lead re-sends the invite and the workspace appears.</>],
          ["Projects list is empty", <>Squad membership and project membership are two separate joins. Belonging to the squad shows the workspace; belonging to the project shows its board, clock, and invoices.</>],
          ["Pooled balance looks off", <>The workspace shows gross balances before any split. Provider cloud settlements divide 75 percent to on-site credits and 25 percent to platform infrastructure on the receipt, never as a surcharge.</>],
          ["Reviewer queue stalls", <>Demos pile up when sign off waits for a ceremony. Reviewers approve diffs asynchronously inside the sprint, and anything unreviewed for a week returns to doing with a named shepherd.</>],
        ]}
      />

      <Pager current="/docs/remastery/squads" />
    </article>
  );
}
