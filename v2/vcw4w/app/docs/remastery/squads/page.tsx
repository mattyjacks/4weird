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

      <Pager current="/docs/remastery/squads" />
    </article>
  );
}
