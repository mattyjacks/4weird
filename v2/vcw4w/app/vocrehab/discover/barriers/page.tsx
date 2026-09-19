import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Barrier Buster: name barriers, match supports | VocRehab",
  description:
    "Name seven common work barriers, from transport to stamina, and match each one to concrete strategies, backups, and counselor handoffs.",
  alternates: { canonical: "/vocrehab/discover/barriers" },
};

const BARRIERS = [
  { title: "Getting to work", body: "Bus routes, ride shares, distance, winter schedules. Example strategies: backup ride list, shift start negotiation, travel practice runs." },
  { title: "Schedule conflicts", body: "Family care, classes, second jobs. Example strategies: visible weekly calendar, swap request scripts, availability cards for managers." },
  { title: "Sharing disability information", body: "Whether, when, and how to disclose. Example strategies: two sentence disclosure draft, timing map review, practice with a counselor first." },
  { title: "Tools and technology", body: "Screen readers, magnifiers, speech input, seating. Example strategies: one assistive technology trial at a time, setup checklist, IT contact saved." },
  { title: "Benefits and earnings worry", body: "SSI questions, hours limits, pay timing. Example strategies: sketch numbers on the SSI page, list questions for a benefits counselor, never guess alone." },
  { title: "Stamina and rest", body: "Energy across shifts, break needs, recovery. Example strategies: break signal agreed with supervisor, energy budget plan, shorter trial shifts first." },
  { title: "Childcare and family care", body: "Coverage gaps, pickup times, backup care. Example strategies: backup caregiver list, pickup time window in writing, emergency contact chain." },
] as const;

export default function VocrehabDiscoverBarriersPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/discover">Discover</Link> → Barrier Buster
      </nav>
      <h1 className="text-xl font-bold">Barrier Buster</h1>
      <p className="text-sm text-muted-foreground">
        Pick the barriers that fit your life. Each one maps to concrete strategies with exit ramps. These are
        suggestions, never prescriptions. Medical, legal, and benefits questions are handoffs to a person, not
        answers from this page.
      </p>

      <section aria-label="The seven barriers" className="space-y-3">
        <h2 className="font-semibold">The seven barriers, with examples</h2>
        {BARRIERS.map((b) => (
          <article key={b.title} className="rounded-lg border p-3">
            <h3 className="font-medium">{b.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{b.body}</p>
          </article>
        ))}
      </section>

      <section aria-label="Build your shortlist" className="space-y-2">
        <h2 className="font-semibold">Build your shortlist in five steps</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Circle the two barriers that disrupt your week most often. Start there and ignore the rest for now.</li>
          <li>Write one recent example for each: what happened, when it happened, and what it cost you.</li>
          <li>Choose one strategy per barrier that you would genuinely try, plus one backup if the first fails.</li>
          <li>Date the trial. A strategy without a start date stays a wish, so put it on a calendar.</li>
          <li>Review the shortlist with a counselor. Confirm referrals for benefits, medical, or legal questions, then print or save the page.</li>
        </ol>
        <p className="text-sm text-muted-foreground">
          The fastest way to prepare is playing <Link className="underline" href="/vocrehab/play/barrier-run">Barrier Run</Link>,
          the four scene practice game where commute, shift swap, disclosure, and tool failure stories each map to the
          same barriers above. Players arrive at this page already knowing which stories felt familiar.
        </p>
      </section>

      <section aria-label="Common mistakes" className="space-y-2">
        <h2 className="font-semibold">Common mistakes to avoid</h2>
        <p className="text-sm text-muted-foreground">
          The biggest mistake is checking every barrier and finishing with a vague list nobody can act on. A short,
          honest shortlist beats a long unchecked one every time. The second mistake is copying strategies you would
          never use, like a 5 a.m. bus you cannot catch or software your workplace does not allow. Choose tactics that
          fit your actual routes, hours, budget, and equipment. The third mistake is treating a failed strategy as
          personal failure. Note what broke down, whether timing, cost, coverage, or communication, and switch to the
          backup. That note becomes valuable evidence for your counselor instead of a dead end.
        </p>
      </section>

      <section aria-label="Frequently asked questions" className="space-y-2">
        <h2 className="font-semibold">Frequently asked questions</h2>
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-semibold">Should I list every barrier that applies?</summary>
          <p className="mt-1 text-sm text-muted-foreground">
            Start with the two most frequent barriers so energy goes toward workable trials. Add more once the first
            strategies show results. A focused shortlist helps counselors arrange transportation help, schedule
            adjustments, or technology trials faster than a broad survey with no priorities marked.
          </p>
        </details>
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-semibold">What if a strategy stops working?</summary>
          <p className="mt-1 text-sm text-muted-foreground">
            Record the date, the breakdown point, and the backup you switched to. Bring those notes to your next
            session or revisit the <Link className="underline" href="/vocrehab/discover/goals">goals checker</Link> to
            confirm the job target still fits. Plans that document reality earn better supports than plans that
            pretend everything worked.
          </p>
        </details>
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-semibold">Where does this shortlist go next?</summary>
          <p className="mt-1 text-sm text-muted-foreground">
            It feeds the <Link className="underline" href="/vocrehab/discover/ipe">IPE builder draft</Link>, the
            <Link className="underline" href="/vocrehab/course"> course lessons</Link> on supports, and counselor
            conversations about accommodations. Keep a printed copy with your <Link className="underline" href="/vocrehab/export">exported data</Link> so
            every meeting starts from the same page.
          </p>
        </details>
      </section>
    </main>
  );
}
