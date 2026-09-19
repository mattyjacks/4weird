import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/remastery/kanban" },
  title: "Remastery Squad Kanban",
  description:
    "Wave 1 squad kanban boards: drag-and-drop columns, sprint cycles, priorities, and hour estimates linked to the time tracker.",
};

const theme = {
  bg: "bg-gradient-to-br from-violet-950 via-slate-950 to-cyan-950",
  border: "border-violet-300/20",
  chip: "border-violet-300/40 bg-violet-300/10 text-violet-200",
  title: "bg-gradient-to-r from-violet-300 via-fuchsia-200 to-cyan-300 bg-clip-text text-transparent",
};

export default function RemasteryKanbanPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · remastery wave 1"
        title={<>Sprints you can <span className={theme.title}>see move.</span></>}
        lede={<>Visual kanban boards for every squad: drag-and-drop cards across positioned columns, deadline-bound sprint cycles, priorities, hour estimates, and assignees — with estimates that flow straight into the time tracker.</>}
        stats={[
          ["3+ cols", "todo → doing → done"],
          ["4 priors", "low · med · high · urgent"],
          ["0–100%", "cycle progress"],
          ["F15", "spec feature 15"],
        ]}
        glyph="🗂️"
        theme={theme}
        crumb="Kanban"
        art={
          <div className="flex items-end gap-2" aria-hidden="true">
            {[68, 48, 76, 56, 82, 60, 72].map((h, i) => (
              <div
                key={i}
                className="docs-float w-10 rounded-t-full border border-violet-200/50 bg-gradient-to-t from-fuchsia-500 to-violet-300 shadow-lg sm:w-12"
                style={{ height: h, animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="The board"
        title="Columns, cards, and cycles"
        body="Each board belongs to a squad (and optionally a project) with an owner. Columns are positioned lists; cards carry title, description, priority, estimate_hours, due_date, labels, assignee, and position. Cycles are sprint windows with start/end dates and a 0–100 progress percentage; cards attach to the active cycle."
      />
      <MockWindow title="sprint board — “ship the raid”" badge="68% done">
        <div className="grid gap-2 font-mono text-xs sm:grid-cols-3">
          <div className="rounded-lg bg-white/5 p-2">
            <p className="font-black text-slate-300">TODO</p>
            <p className="mt-1 rounded bg-white/5 px-2 py-1">Instanced mesh pass 🔴 4h</p>
          </div>
          <div className="rounded-lg bg-white/5 p-2">
            <p className="font-black text-slate-300">DOING</p>
            <p className="mt-1 rounded bg-white/5 px-2 py-1">Timer Web Worker 🟠 2.5h</p>
          </div>
          <div className="rounded-lg bg-white/5 p-2">
            <p className="font-black text-slate-300">DONE</p>
            <p className="mt-1 rounded bg-white/5 px-2 py-1">Remastery routes test 🟢 1h</p>
          </div>
        </div>
      </MockWindow>

      <SectionHead
        index="2"
        kicker="Access"
        title="Your squad sees your board"
        body="Board access is owner-or-member: the owner plus anyone on the squad roster. Card access resolves through the parent board, so there is no back door — if you cannot see the board, you cannot see its cards."
      />
      <Callout tone="violet" title="Estimates are promises the timer keeps.">
        Card estimate_hours seed the <Link className="underline" href="/docs/remastery/time-tracking">time tracker</Link>:
        clocking against a card compares actual seconds to the estimate, and unbilled entries convert to invoices in one
        click. Estimate honestly — the invoice will quote you.
      </Callout>

      <SectionHead
        index="3"
        kicker="Ritual"
        title="Running a sprint"
      />
      <Steps
        items={[
          ["Open a cycle", <>Name the sprint, set start and end dates, mark it active. One active cycle per board keeps progress math honest.</>],
          ["Fill the columns", <>Cards start in todo with priority, estimate, due date, and an assignee. Drag toward done as work lands — positions persist per column.</>],
          ["Track against cards", <>Contributors clock time linked to card_id, so the board shows actuals beside estimates while the sprint runs.</>],
          ["Close and convert", <>At cycle end, completed cards stay as history; remaining estimates roll into the next cycle, and unbilled hours become a draft invoice.</>],
        ]}
      />

      <SectionHead
        index="4"
        kicker="Worked example"
        title="One sprint, six cards"
        body="Follow one fictional week on the GraveGain raid squad board. Six cards, one active cycle, estimates in hours. By Friday the math tells the story without a status meeting."
      />
      <MockWindow title="cycle preview: ship the raid, week 1" badge="54% done">
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>Instanced mesh pass · urgent 4h</span><span className="font-black text-emerald-300">done</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>Timer Web Worker · high 2.5h</span><span className="font-black text-emerald-300">done</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>Remastery routes test · med 1h</span><span className="font-black text-emerald-300">done</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>Raid lobby presence · high 3h</span><span className="font-black text-amber-300">doing</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>Boss theme hookup · low 2h</span><span className="font-black text-slate-400">todo</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>Victory poster · med 1.5h</span><span className="font-black text-slate-400">todo</span></div>
        </div>
      </MockWindow>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Done estimates total 7.5 of 14 planned hours, so the cycle bar reads 54 percent. The doing
        card holds the risk: one high priority item with a named owner and a due date beats three
        unowned cards every time. At review the squad rolls the two todo cards into week 2 and
        converts the 7.5 unbilled hours toward a draft invoice. Prefer plain English? Read the{" "}
        <Link className="underline" href="/docs/remastery/kanban-sprints">kanban sprints guide</Link>,
        then reconcile logged hours in the{" "}
        <Link className="underline" href="/docs/remastery/time-tracking">time tracker</Link>.
      </p>
      <Callout tone="gold" title="Cap work in progress.">
        Two cards per person in doing, maximum. A third card may not enter doing until one reaches
        done. Unowned cards rot, so every doing card names an assignee plus a due date at creation.
      </Callout>

      <SectionHead
        index="5"
        kicker="Troubleshooting"
        title="When the board looks wrong"
      />
      <Steps
        items={[
          ["Cycle progress reads zero", <>Finished cards may sit outside the active cycle. Attach completed cards to the active cycle identifier, or close the stale cycle before opening the new one.</>],
          ["A dragged card snaps back", <>Confirm squad membership first, then retry the move. The board persists positions per column, so a rejected write means the permission check or the position value failed.</>],
          ["Estimates always miss", <>Compare clocked seconds per card across two full cycles, then re-estimate from those actuals. A chronic twofold miss means the card is secretly three cards: split it and estimate each slice.</>],
          ["Labels multiply without mercy", <>Prune the label taxonomy monthly: archive synonyms, keep a tiny palette such as frontend, art, audio, and blocker. Filters stay useful only while the vocabulary stays small.</>],
        ]}
      />

      <Pager current="/docs/remastery/kanban" />
    </article>
  );
}
