import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Discover your work self | VocRehab",
  description:
    "Start VocRehab Discover: five short strengths-first assessments covering goals, barriers, readiness, remote fit, and your employment plan draft.",
  alternates: { canonical: "/vocrehab/discover" },
};

const LINKS = [
  { href: "/vocrehab/discover/ipe", title: "Your IPE", blurb: "What an employment plan is, in plain words." },
  { href: "/vocrehab/discover/barriers", title: "Barriers", blurb: "Name what gets in the way, then match supports." },
  { href: "/vocrehab/discover/readiness", title: "Readiness", blurb: "See where you stand, supports-first." },
  { href: "/vocrehab/discover/goals", title: "Goals", blurb: "Pick one direction to explore first." },
  { href: "/vocrehab/discover/remote", title: "Remote check", blurb: "Does remote work fit, and with what setup?" },
] as const;

export default function VocrehabDiscoverPage() {
  return (
    <main className="vocrehab-discover mx-auto w-full max-w-6xl space-y-6 px-3 py-4">
      <div className="flex h-8 items-center gap-2">
        <h1 className="truncate text-[15px] font-bold tracking-tight text-stone-900 dark:text-stone-50">Discover: no tests that feel like tests</h1>
        <span className="ml-auto shrink-0 rounded-full border border-stone-200 bg-white px-2 py-px text-[11px] font-bold text-stone-600">
          5 assessments
        </span>
      </div>
      <p className="max-w-3xl text-sm text-stone-700 dark:text-stone-300">
        You play short work scenarios instead of filling long forms. What you do in the game becomes your profile:
        strengths first, never labels. Each assessment below takes about five minutes, and you can complete them in
        any order. Guests keep results on this device, and signing in saves them to a profile a counselor can review
        with you.
      </p>

      <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="flex flex-col rounded-lg border border-stone-200 bg-white p-3 shadow-sm hover:shadow">
            <h2 className="text-sm font-semibold text-stone-900">{l.title}</h2>
            <p className="mt-0.5 text-xs text-stone-600">{l.blurb}</p>
            <p className="mt-1 text-[11px] font-medium text-stone-500">Estimated: 5 mins · Not Started</p>
            <span className="mt-auto pt-2 text-xs font-semibold text-cyan-700">Start Assessment &rarr;</span>
          </Link>
        ))}
      </div>

      <section aria-label="How Discover works" className="max-w-3xl space-y-2">
        <h2 className="text-base font-bold text-stone-900 dark:text-stone-50">How Discover works, step by step</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-stone-700 dark:text-stone-300">
          <li>Pick any assessment card above. Most people start with Goals or Readiness because those frame the rest.</li>
          <li>Answer in plain language. There are no trick questions, no timers, and no scores that follow you.</li>
          <li>Read the draft it builds: strengths, supports that help, and suggested next steps in your own words.</li>
          <li>Edit anything that sounds wrong. Every word stays yours until you choose to share it.</li>
          <li>Bring the pages to a counselor, or continue into the <Link className="underline" href="/vocrehab/course">course lessons</Link> and <Link className="underline" href="/vocrehab/play">practice games</Link> for deeper rehearsal.</li>
        </ol>
      </section>

      <section aria-label="What each assessment covers" className="max-w-3xl space-y-2">
        <h2 className="text-base font-bold text-stone-900 dark:text-stone-50">What each assessment covers</h2>
        <p className="text-sm text-stone-700 dark:text-stone-300">
          The Goals checker compares one job idea against strengths your game play already showed, plus your notes
          about local hiring, shifts, and commute. The Barriers page turns seven common obstacles, from transportation
          to stamina, into a shortlist of concrete strategies with backup options. Readiness maps seven work
          dimensions into steady areas and support needs, summarized in everyday language. The Remote check combines
          your home setup with results from the File Sort, Inbox Sprint, and Focus Shift games. The IPE builder pulls
          it all together into a draft employment plan you can edit freely.
        </p>
        <p className="text-sm text-stone-700 dark:text-stone-300">
          Examples help. A morning stocking goal pairs well with steady pace and schedule reliability. A bus commute
          barrier pairs with backup ride plans and shift start negotiations. A quiet workspace plus reliable internet
          plus one completed game round already signals meaningful remote potential. None of these pages predict
          hiring or diagnose anything. They organize your observations so conversations with counselors, family, and
          employers start from evidence rather than guesswork.
        </p>
      </section>

      <section aria-label="Who Discover helps most" className="max-w-3xl space-y-2">
        <h2 className="text-base font-bold text-stone-900 dark:text-stone-50">Who Discover helps most</h2>
        <p className="text-sm text-stone-700 dark:text-stone-300">
          Newcomers exploring vocational rehabilitation for the first time get orientation without paperwork pressure.
          Returning clients restarting after a pause can refresh goals quickly. Students transitioning from school,
          veterans navigating civilian schedules, parents balancing caregiving shifts, and rural job seekers weighing
          commutes all find concrete starting points. Counselors use the drafts as interview fuel, while family
          members gain a shared vocabulary for encouragement.
        </p>
      </section>

      <section aria-label="Frequently asked questions" className="max-w-3xl space-y-2">
        <h2 className="text-base font-bold text-stone-900 dark:text-stone-50">Frequently asked questions</h2>
        <details className="rounded-lg border border-stone-200 bg-white p-3">
          <summary className="cursor-pointer text-sm font-semibold text-stone-900">Do I have to finish all five assessments?</summary>
          <p className="mt-1 text-sm text-stone-700">
            No. Each page stands alone, and partial progress still helps. Many people complete Goals and one more page,
            then return later. Counselors prefer two thoughtful pages over five rushed ones, so take the time you need
            and skip nothing by pressure.
          </p>
        </details>
        <details className="rounded-lg border border-stone-200 bg-white p-3">
          <summary className="cursor-pointer text-sm font-semibold text-stone-900">Is anything here a test I can fail?</summary>
          <p className="mt-1 text-sm text-stone-700">
            Nothing here grades you. Games measure practice signals like pace, accuracy, and recovery, and the pages
            translate those signals into supportive language. Retries are unlimited, extra time is expected, and every
            summary invites correction before it is saved or shared anywhere.
          </p>
        </details>
        <details className="rounded-lg border border-stone-200 bg-white p-3">
          <summary className="cursor-pointer text-sm font-semibold text-stone-900">Where do I go after Discover?</summary>
          <p className="mt-1 text-sm text-stone-700">
            Continue to the <Link className="underline" href="/vocrehab/course">fourteen lesson course</Link> for
            guided chapters, rehearse conversations in <Link className="underline" href="/vocrehab/interview/prep">interview prep</Link>,
            or sketch earnings questions with the <Link className="underline" href="/vocrehab/decide/ssi">SSI slider</Link>.
            Your Discover drafts prefill several of those tools, so earlier answers keep paying off.
          </p>
        </details>
      </section>
    </main>
  );
}
