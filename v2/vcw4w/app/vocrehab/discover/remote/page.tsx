import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Remote work feasibility analyzer | VocRehab",
  description:
    "Check remote readiness across home setup, game-observed focus skills, and backup plans, with hybrid options and accommodation ideas.",
  alternates: { canonical: "/vocrehab/discover/remote" },
};

const CHECKS = [
  { title: "A quiet space for work blocks", body: "A door, a corner, or scheduled alone hours. Headphones plus agreed quiet times count when rooms are shared." },
  { title: "Reliable internet", body: "Stable video calls without frequent drops. A speed test screenshot plus a backup location covers most employer questions." },
  { title: "A device that works well", body: "A computer that runs calls, documents, and one work app at once. Note age, webcam, microphone, and keyboard comfort." },
  { title: "A backup plan for outages", body: "A second location, a hotspot, or a call in number. Employers value continuity plans more than perfect setups." },
  { title: "Completed File Sort", body: "Shows sorting stamina and refocus on screen, the closest proxy to steady remote task work." },
  { title: "Completed Inbox Sprint", body: "Shows triage judgment and short written replies under mild time pressure." },
  { title: "Completed Focus Shift", body: "Shows recovery after scripted interruptions, the core remote resilience signal." },
  { title: "Finished a run keyboard-only", body: "Shows navigation without a mouse, useful for speed and many assistive setups." },
] as const;

export default function VocrehabDiscoverRemotePage() {
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/discover">Discover</Link> → Remote feasibility
      </nav>
      <h1 className="text-xl font-bold">Remote work feasibility analyzer</h1>
      <p className="text-sm text-muted-foreground">
        The verdict comes from the remote task game triple plus an environment checklist you fill in with plain yes or
        no answers, no jargon. Many people land on hybrid with supports rather than remote or nothing, and that counts
        as a win.
      </p>

      <section aria-label="The checklist" className="space-y-3">
        <h2 className="font-semibold">The eight checks, explained</h2>
        {CHECKS.map((c) => (
          <article key={c.title} className="rounded-lg border p-3">
            <h3 className="font-medium">{c.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
          </article>
        ))}
        <p className="text-sm text-muted-foreground">
          Play the triple in the <Link className="underline" href="/vocrehab/play">games library</Link>:
          <Link className="underline" href="/vocrehab/play/file-sort"> File Sort</Link>,
          <Link className="underline" href="/vocrehab/play/inbox-sprint"> Inbox Sprint</Link>, and
          <Link className="underline" href="/vocrehab/play/focus-shift"> Focus Shift</Link>. Finishing all three plus
          four environment checks already paints a credible hybrid picture for most entry roles.
        </p>
      </section>

      <section aria-label="Reading your result" className="space-y-2">
        <h2 className="font-semibold">Reading your result in five steps</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Count environment yes answers separately from game completions. Both halves matter equally.</li>
          <li>Strong setup plus two or more games points toward remote trials with routine check-ins.</li>
          <li>Mixed setup points toward hybrid: remote blocks for focused tasks plus onsite days for meetings and training.</li>
          <li>Early stage setups point toward preparation: one upgrade, one game replay, and one real life practice week.</li>
          <li>Turn gaps into supports. Each no becomes a sentence with a fix, a cost, and a date, ready for the <Link className="underline" href="/vocrehab/discover/ipe">IPE draft</Link>.</li>
        </ol>
      </section>

      <section aria-label="Common mistakes" className="space-y-2">
        <h2 className="font-semibold">Common mistakes to avoid</h2>
        <p className="text-sm text-muted-foreground">
          Demanding a perfect home office before applying stops many candidates who could succeed hybrid. Start from
          the role requirements instead: scheduled calls need quiet blocks, document work needs a comfortable
          keyboard, team chat needs reliable notifications. A second mistake is ignoring the backup plan. Outages,
          construction noise, and shared rooms happen, and a written fallback impresses employers. A third mistake is
          skipping game evidence. Saying you focus well convinces less than three finished runs with calm recoveries
          documented beside them.
        </p>
      </section>

      <section aria-label="Frequently asked questions" className="space-y-2">
        <h2 className="font-semibold">Frequently asked questions</h2>
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-semibold">Is hybrid really a good outcome?</summary>
          <p className="mt-1 text-sm text-muted-foreground">
            Yes. Hybrid pairs onsite training and relationships with remote focus blocks, and many counselors recommend
            it as a first step. It also keeps accommodation conversations concrete: quiet days, camera norms, and
            response time windows can be written plainly into the plan.
          </p>
        </details>
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-semibold">What accommodations suit remote work?</summary>
          <p className="mt-1 text-sm text-muted-foreground">
            Common starting points include written instructions beside video briefings, captioning on calls, flexible
            break timing, and screen reader or magnification trials. List candidates as conversation starters, then
            draft the formal request with your counselor before sharing anything with an employer.
          </p>
        </details>
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-semibold">What do I practice next?</summary>
          <p className="mt-1 text-sm text-muted-foreground">
            Replay the weakest game in the triple, rehearse introductions in <Link className="underline" href="/vocrehab/interview/prep">interview prep</Link>,
            and review schedule fit in <Link className="underline" href="/vocrehab/discover/readiness">readiness</Link>. Log
            one full practice week with hours, interruptions, and energy notes, then bring that log to your session.
          </p>
        </details>
      </section>
    </main>
  );
}
