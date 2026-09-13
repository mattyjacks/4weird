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

      <Pager current="/docs/remastery/kanban" />
    </article>
  );
}
