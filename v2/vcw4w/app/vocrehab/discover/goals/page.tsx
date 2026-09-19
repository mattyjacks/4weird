import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Job goal alignment checker | VocRehab",
  description:
    "Compare one job goal against game-observed strengths and your local hiring notes, with fit signals and trial steps instead of predictions.",
  alternates: { canonical: "/vocrehab/discover/goals" },
};

const CATEGORIES = [
  { title: "Office", body: "Filing, data entry, front desk support. Strengths that shine: sorting accuracy, written messages, steady throughput." },
  { title: "Retail", body: "Stocking, registers, customer floor. Strengths that shine: stamina, friendly greetings, recovery after busy rushes." },
  { title: "Warehouse", body: "Picking, packing, inventory counts. Strengths that shine: pace, careful checking, safety routine memory." },
  { title: "Remote", body: "Chat support, data tasks, scheduling. Strengths that shine: focus after interruptions, keyboard comfort, written clarity." },
  { title: "Food service", body: "Prep, serving, cleanup rotations. Strengths that shine: schedule reliability, stamina, calm communication under rush." },
  { title: "Healthcare support", body: "Transport, stocking, cleaning, clerical help. Strengths that shine: steady routines, careful steps, respectful communication." },
  { title: "Other", body: "Anything local and specific. Write the goal in your own words and bring facts about hours, pay, and requirements." },
] as const;

export default function VocrehabDiscoverGoalsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/discover">Discover</Link> → Goal alignment
      </nav>
      <h1 className="text-xl font-bold">Job goal alignment checker</h1>
      <p className="text-sm text-muted-foreground">
        Compare a job goal with strengths you observed in the games plus your own local market notes. There is no
        labor market database and no hiring prediction here, only reasons tied to what you showed you can do, matched
        against what you know about nearby work.
      </p>

      <section aria-label="Job categories" className="space-y-3">
        <h2 className="font-semibold">Seven categories, with examples</h2>
        {CATEGORIES.map((c) => (
          <article key={c.title} className="rounded-lg border p-3">
            <h3 className="font-medium">{c.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
          </article>
        ))}
        <p className="text-sm text-muted-foreground">
          Concrete beats vague. Morning stocking at the grocery on Route 9 beats retail. Evening data cleanup for a
          clinic office beats office. Specific goals make commute, hours, and certificate checks possible, and those
          checks decide whether a goal is a strong fit or a stretch with supports.
        </p>
      </section>

      <section aria-label="How to check alignment" className="space-y-2">
        <h2 className="font-semibold">How to check alignment in five steps</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Write the goal in one sentence: task, place, and shift. Example: weekday morning stocking, grocery, 8 to 12.</li>
          <li>Pick the closest category above and list two strengths your game play already showed, such as steady pace or careful checking.</li>
          <li>Add two local facts: who is hiring nearby, what hours they post, and whether certificates like forklift or food handling apply.</li>
          <li>Read the signals honestly. Strong fit means strengths plus facts line up. Stretch means the goal works with supports like extra training or schedule tweaks.</li>
          <li>Set one dated trial: a visit, a phone call, a practice task from the <Link className="underline" href="/vocrehab/play">games library</Link>, or a counselor review.</li>
        </ol>
        <p className="text-sm text-muted-foreground">
          Game evidence helps. <Link className="underline" href="/vocrehab/play/file-sort">File Sort</Link> shows sorting
          and refocus, <Link className="underline" href="/vocrehab/play/inbox-sprint">Inbox Sprint</Link> shows triage and
          writing, and <Link className="underline" href="/vocrehab/play/focus-shift">Focus Shift</Link> shows recovery after
          interruptions. Quote those results with real life examples when you discuss the goal.
        </p>
      </section>

      <section aria-label="Common mistakes" className="space-y-2">
        <h2 className="font-semibold">Common mistakes to avoid</h2>
        <p className="text-sm text-muted-foreground">
          Choosing what sounds impressive instead of what fits stamina, transportation, and schedule is the classic
          error. A second error is skipping local facts entirely and judging a goal on enthusiasm alone. Enthusiasm
          matters, but bus times, closing shifts, standing hours, and certificate costs decide sustainability. A third
          error is collecting five goals at once. Keep one active trial plus one parked backup. Two week tests of
          hours, tasks, and commute produce clearer evidence than months of debate between abstract options.
        </p>
      </section>

      <section aria-label="Frequently asked questions" className="space-y-2">
        <h2 className="font-semibold">Frequently asked questions</h2>
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-semibold">What if I like two very different goals?</summary>
          <p className="mt-1 text-sm text-muted-foreground">
            Trial one first while parking the second with its own reasons and facts. Compare evidence after two weeks:
            energy left at day end, commute reliability, and supervisor feedback. Counselors prefer one active trial
            plus one backup over two half started plans competing for attention.
          </p>
        </details>
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-semibold">Does this page predict hiring?</summary>
          <p className="mt-1 text-sm text-muted-foreground">
            No. It organizes alignment between demonstrated strengths and a goal plus local facts you supply. Hiring
            depends on employers, timing, and openings. The output is a clear starting point plus a trial plan, ready
            to revise with your counselor and ready to quote inside the <Link className="underline" href="/vocrehab/discover/ipe">IPE draft</Link>.
          </p>
        </details>
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-semibold">What do I do with a stretch signal?</summary>
          <p className="mt-1 text-sm text-muted-foreground">
            Name the gap precisely: a certificate, a schedule conflict, stamina for long shifts, or writing speed. Then
            match it to a support from the <Link className="underline" href="/vocrehab/discover/barriers">barriers page</Link> or
            a rehearsal in <Link className="underline" href="/vocrehab/interview/prep">interview prep</Link>. A stretch with
            named supports often becomes the strongest plan.
          </p>
        </details>
      </section>
    </main>
  );
}
