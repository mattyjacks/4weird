import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Work readiness profile | VocRehab",
  description:
    "Map seven work dimensions into steady strengths and support needs, with plain language bands and next practice steps.",
  alternates: { canonical: "/vocrehab/discover/readiness" },
};

const DIMENSIONS = [
  { title: "Getting through tasks", body: "Sustained throughput at a realistic pace. Support example: extra time plus a clear starting order." },
  { title: "Understanding instructions", body: "Following multi step directions. Support example: written steps alongside any video or verbal briefing." },
  { title: "Bouncing back from mistakes", body: "Recovery without freezing. Support example: mistake friendly practice with undo and calm retry routines." },
  { title: "Handling interruptions", body: "Pausing and refocusing. Support example: an agreed pause signal plus a short refocus checklist." },
  { title: "Writing short messages", body: "Clear brief workplace writing. Support example: sentence starters, templates, and one proofreading pass." },
  { title: "Keeping a steady schedule", body: "Attendance across weeks. Support example: a visible weekly plan with reminders and backup contacts." },
  { title: "Knowing which tools help", body: "Assistive technology awareness. Support example: one tool trial at a time with setup notes." },
] as const;

export default function VocrehabDiscoverReadinessPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/discover">Discover</Link> → Work readiness
      </nav>
      <h1 className="text-xl font-bold">Work readiness profile</h1>
      <p className="text-sm text-muted-foreground">
        Mark the areas that feel steady. The rest become supports, not failures. Numbers stay behind an explainer,
        and the headline is always human language. Accommodation flags are conversation starters, never automated
        prescriptions.
      </p>

      <section aria-label="The seven dimensions" className="space-y-3">
        <h2 className="font-semibold">The seven dimensions, explained</h2>
        {DIMENSIONS.map((d) => (
          <article key={d.title} className="rounded-lg border p-3">
            <h3 className="font-medium">{d.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{d.body}</p>
          </article>
        ))}
        <p className="text-sm text-muted-foreground">
          Read the profile in bands. Exploring means several supports are still being mapped, and short practice reps
          matter most. Supported means a solid base plus named accommodations, ready for trials with check-ins.
          Ready means steady across most dimensions, ready for applications with routine supports. Every band leads to
          practice, never to a verdict.
        </p>
      </section>

      <section aria-label="Build your profile" className="space-y-2">
        <h2 className="font-semibold">Build your profile in five steps</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Mark each dimension steady or still building. Trust recent weeks over old memories.</li>
          <li>Add completed games as evidence: <Link className="underline" href="/vocrehab/play/file-sort">File Sort</Link> for throughput, <Link className="underline" href="/vocrehab/play/inbox-sprint">Inbox Sprint</Link> for writing, <Link className="underline" href="/vocrehab/play/focus-shift">Focus Shift</Link> for recovery, <Link className="underline" href="/vocrehab/play/schedule-juggle">Schedule Juggle</Link> for planning.</li>
          <li>Turn every non steady area into one support sentence with a who, what, and when.</li>
          <li>Pick two practice next steps, such as one untimed game replay plus one real life trial.</li>
          <li>Share the profile with a counselor alongside your <Link className="underline" href="/vocrehab/discover/goals">goal check</Link> and <Link className="underline" href="/vocrehab/discover/barriers">barrier shortlist</Link> for a complete picture.</li>
        </ol>
      </section>

      <section aria-label="Common mistakes" className="space-y-2">
        <h2 className="font-semibold">Common mistakes to avoid</h2>
        <p className="text-sm text-muted-foreground">
          Marking everything steady to look good hides the supports that would actually help, while marking everything
          low hides real strengths employers value. Aim for honesty over impression. A second mistake is reading the
          band as a grade. Bands describe support density, not worth or potential, and they shift with practice. A
          third mistake is stopping at labels. Throughput plus extra time is actionable. Throughput alone is not.
          Always finish each dimension with a concrete tactic, a trial date, and a person who knows about it.
        </p>
      </section>

      <section aria-label="Frequently asked questions" className="space-y-2">
        <h2 className="font-semibold">Frequently asked questions</h2>
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-semibold">How do games change my band?</summary>
          <p className="mt-1 text-sm text-muted-foreground">
            Each completed game adds observed evidence to matching dimensions, which can move the summary from
            exploring toward supported or ready. Replays count too, especially calm recoveries after mistakes. Bring
            the run summaries to your session so the counselor sees behavior, not only self ratings.
          </p>
        </details>
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-semibold">Can I share this with an employer?</summary>
          <p className="mt-1 text-sm text-muted-foreground">
            Share selectively. Strengths lines travel well to resumes and <Link className="underline" href="/vocrehab/interview/prep">interview answers</Link>,
            while support details usually stay between you and your counselor until you draft an accommodation request.
            Review the disclosure timing guidance before attaching anything to an application.
          </p>
        </details>
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-semibold">How often should I redo the profile?</summary>
          <p className="mt-1 text-sm text-muted-foreground">
            Revisit after every few game sessions or whenever routines change. New schedules, new tools, or completed
            trials all justify an update. Dated snapshots show growth over months, which helps IPE reviews and
            encourages steady practice through the <Link className="underline" href="/vocrehab/course">course</Link>.
          </p>
        </details>
      </section>
    </main>
  );
}
