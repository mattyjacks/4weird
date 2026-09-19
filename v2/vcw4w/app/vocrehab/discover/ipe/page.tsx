import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Vocational assessment and IPE builder | VocRehab",
  description:
    "Draft your employment plan in plain language: interests, strengths, barriers, and three suggested goals your counselor reviews with you.",
  alternates: { canonical: "/vocrehab/discover/ipe" },
};

export default function VocrehabDiscoverIpePage() {
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/discover">Discover</Link> → Vocational assessment
      </nav>
      <h1 className="text-xl font-bold">Vocational assessment (IPE builder)</h1>
      <p className="text-sm text-muted-foreground">
        Answer in plain language. Game results can prefill the strengths box, and you edit everything. This draft
        helps your counselor write your employment plan, called an Individualized Plan for Employment. Nothing here is
        a verdict. You approve every word before anything becomes official.
      </p>

      <section aria-label="What an IPE contains" className="space-y-2">
        <h2 className="font-semibold">What an employment plan contains</h2>
        <p className="text-sm text-muted-foreground">
          An IPE turns interests, strengths, and support needs into three suggested employment goals plus the services
          that make them reachable. Typical services include counseling, training funds, assistive technology trials,
          transportation help, and placement support. Your draft proposes language. Your counselor checks accuracy,
          adds required formal wording, and approves the final version with your signature. The plan stays reviewable,
          so amendments follow the same path when goals or needs change.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li><strong>Interests:</strong> the kinds of tasks, settings, shifts, and people you prefer, in your own words.</li>
          <li><strong>Strengths:</strong> observable behaviors from game play and real life, such as steady pace or careful checking.</li>
          <li><strong>Barriers and supports:</strong> what gets in the way plus the specific help that addresses it, with backups.</li>
          <li><strong>Three suggested goals:</strong> ranked directions with a first trial step and a review date.</li>
        </ul>
      </section>

      <section aria-label="Draft it well" className="space-y-2">
        <h2 className="font-semibold">Draft it well in five steps</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Describe work that sounds good plus what gets in the way. Example: stocking shelves mornings, while the bus connection is the hard part.</li>
          <li>List strengths one per line. Copy lines from <Link className="underline" href="/vocrehab/play/file-sort">File Sort</Link> or <Link className="underline" href="/vocrehab/play/focus-shift">Focus Shift</Link> results, then add one real life proof each.</li>
          <li>Mark the barriers that apply, borrowing wording from the <Link className="underline" href="/vocrehab/discover/barriers">barriers shortlist</Link> you already built.</li>
          <li>Propose three goals in order, each with one trial step and one measure, such as complete two practice shifts or finish a certificate module.</li>
          <li>Print the draft and bring it to your session. Walk through edits line by line and confirm what the counselor will formalize.</li>
        </ol>
      </section>

      <section aria-label="Example draft" className="space-y-2">
        <h2 className="font-semibold">Example draft, annotated</h2>
        <p className="text-sm text-muted-foreground">
          Interests: morning warehouse or grocery stocking, weekday shifts, steady routines with clear lists. Strengths:
          kept a steady pace across sorting rounds, bounced back after misfiles without stopping, asked for
          clarification once instead of guessing. Barriers: transfer bus arrives ten minutes before shift start,
          evening fatigue after long standing blocks. Supports: backup ride contact, ten minute early arrival buffer,
          break signal agreed with supervisor. Goals: grocery stocking mornings first, warehouse picking second with a
          forklift certificate question, office filing third pending keyboard comfort practice. Each goal carries a two
          week trial and a dated review. Notice how every claim pairs with evidence or a next check, which is exactly
          what counselors need to approve services.
        </p>
      </section>

      <section aria-label="Common mistakes" className="space-y-2">
        <h2 className="font-semibold">Common mistakes to avoid</h2>
        <p className="text-sm text-muted-foreground">
          Vague interests produce vague plans, so name tasks, places, and shifts. Borrowed strengths without proof
          sound hollow, so attach game lines plus lived examples. Hidden barriers resurface later, so write down
          transportation, scheduling, stamina, technology, and benefits worries now, even briefly. Finally, never treat
          the draft as submitted. Until your counselor reviews and you sign, it remains a worksheet. That boundary
          protects you and keeps the formal plan accurate.
        </p>
      </section>

      <section aria-label="Frequently asked questions" className="space-y-2">
        <h2 className="font-semibold">Frequently asked questions</h2>
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-semibold">Does this draft obligate me to anything?</summary>
          <p className="mt-1 text-sm text-muted-foreground">
            No. It is a worksheet for discussion. Services, goals, and wording become official only after counselor
            review and your signed approval. You can revise, pause, or restart the draft at any point, and earlier
            versions never count against you.
          </p>
        </details>
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-semibold">What should I bring to the IPE meeting?</summary>
          <p className="mt-1 text-sm text-muted-foreground">
            Bring this printed draft, your <Link className="underline" href="/vocrehab/discover/readiness">readiness profile</Link> and
            <Link className="underline" href="/vocrehab/discover/goals"> goal check</Link>, plus any schedule limits, medical notes you
            choose to share, and questions about training or technology. Check the <Link className="underline" href="/vocrehab/course">course chapters</Link> on
            working with counselors for extra preparation prompts.
          </p>
        </details>
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-semibold">How often can the plan change?</summary>
          <p className="mt-1 text-sm text-muted-foreground">
            Whenever facts change. New strengths, failed strategies, schedule shifts, or fresh local openings all
            justify amendments. Keep dated notes from game runs and trials, request a review meeting, and walk through
            the same draft steps with updated wording.
          </p>
        </details>
      </section>
    </main>
  );
}
