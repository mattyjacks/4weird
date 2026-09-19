import type { Metadata } from "next";
import Link from "next/link";
import { vocrehabInterviewJobs } from "@/lib/vocrehab-interview-jobs";
import VocrehabJobCard from "@/components/vocrehab/vocrehab-job-card";

export const metadata: Metadata = {
  title: "Job interview sim — VocRehab",
  description:
    "VocRehab live interview sim: 20 real jobs × 3 difficulties. Turn-based or live voice, typing always free, nothing saved unless you tap Save.",
  alternates: { canonical: "/vocrehab/interview/jobs" },
};

export default function Page() {
  return (
    <main className="vocrehab-interview-jobs mx-auto w-full max-w-3xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/interview">Interview</Link> → Jobs
      </nav>
      <h1 className="text-xl font-bold">Pick a job to rehearse</h1>
      <p className="text-muted-foreground">
        20 real jobs, one shared question frame, role-tailored final question plus
        follow-ups and a curveball. Beginner is always open; Advanced unlocks after
        a Beginner pass, Expert after an Advanced pass — retries unlimited.
      </p>
      <ul className="grid gap-2">
        {vocrehabInterviewJobs.map((job) => (
          <li key={job.id}>
            <VocrehabJobCard job={job} />
          </li>
        ))}
      </ul>
      <section aria-label="How the sim works" className="space-y-2 pt-2">
        <h2 className="text-lg font-semibold">How the sim works</h2>
        <p className="text-sm text-muted-foreground">
          Pick any of the twenty roles to open its rehearsal room. You and
          the practice manager trade turns, up to six, then you receive a
          report card with one praise, one tweak, and a retry offer. Typing
          is always available, voice is offered where supported, and the
          transcript stays visible throughout. Nothing saves unless you tap
          Save, so a rough first attempt costs you nothing and teaches you
          plenty.
        </p>
        <ol className="list-decimal space-y-2 rounded-xl border p-3 pl-8 text-sm">
          <li>
            <p className="font-medium">Choose a job you might actually seek.</p>
            <p className="text-muted-foreground">
              Relevance beats novelty. A cashier rehearsal helps a cashier
              applicant far more than a prestige role you will never pursue.
            </p>
          </li>
          <li>
            <p className="font-medium">Start on Beginner, always open.</p>
            <p className="text-muted-foreground">
              Beginner asks the core questions kindly. Advanced unlocks after
              a Beginner pass, and Expert after an Advanced pass, with
              unlimited retries at every level.
            </p>
          </li>
          <li>
            <p className="font-medium">Answer in short true stories.</p>
            <p className="text-muted-foreground">
              One situation, what you did next, and what came of it. Two to
              four sentences per turn keeps the manager engaged.
            </p>
          </li>
          <li>
            <p className="font-medium">Read the report card, then retry once.</p>
            <p className="text-muted-foreground">
              Apply the single tweak immediately while the exchange is fresh.
              Same-day retries lock in the improvement.
            </p>
          </li>
        </ol>
      </section>
      <section aria-label="Question frame and difficulties" className="space-y-2">
        <h2 className="text-lg font-semibold">The shared frame, and the three difficulties</h2>
        <p className="text-sm text-muted-foreground">
          Every role uses one shared question frame so skills transfer: an
          opener about yourself, a strengths question, a challenge story, a
          teamwork moment, and a role tailored closer with follow-ups plus
          one curveball. Beginner keeps follow-ups gentle and the curveball
          light. Advanced presses for specifics, asking for numbers, dates,
          or step by step recall. Expert adds interruptions, skepticism, and
          tighter time pressure, the closest thing to a tough panel. If
          Expert rattles you, drop back to Advanced for one clean pass, then
          climb again. Progress is a ladder, not a verdict.
        </p>
      </section>
      <section aria-label="Tips that raise your score" className="space-y-2">
        <h2 className="text-lg font-semibold">Tips that raise your score</h2>
        <ul className="list-disc space-y-2 rounded-xl border p-3 pl-8 text-sm text-muted-foreground">
          <li>
            Open every answer with the point, then the proof. Managers score
            clarity first and detail second.
          </li>
          <li>
            Borrow language from your{" "}
            <Link href="/vocrehab/interview/prep" className="underline">
              prep generator
            </Link>{" "}
            answers so your stories stay consistent across rooms.
          </li>
          <li>
            If a background question appears, use your{" "}
            <Link href="/vocrehab/interview/pivot" className="underline">
              pivot script
            </Link>
            : one neutral line, what changed, what is true now, then stop.
          </li>
          <li>
            End turns with forward energy. One line about what you will bring
            to this role beats trailing off.
          </li>
          <li>
            Rehearse the same job twice in one week. Familiarity with the
            frame frees attention for delivery: pace, breath, and posture.
          </li>
        </ul>
      </section>
      <section aria-label="Sample exchange" className="space-y-2">
        <h2 className="text-lg font-semibold">A sample first exchange</h2>
        <p className="text-sm text-muted-foreground">
          Wondering what a turn feels like? Here is a fictional Beginner
          opener for a stock associate role and a solid reply. Notice the
          brevity, the concrete detail, and the forward close.
        </p>
        <div className="space-y-2 rounded-xl border p-3 text-sm">
          <p>
            <strong>Manager:</strong> Tell me a little about yourself and why
            this stock role appeals to you.
          </p>
          <p className="text-muted-foreground">
            <strong>Strong reply:</strong> I am an early riser who loves
            orderly shelves. At a pantry I faced three aisles nightly and
            logged every donation without errors. I want that same precision
            for your overnight crew.
          </p>
          <p className="text-muted-foreground">
            The manager would praise the specific proof, then nudge you to
            add what morning availability you offer. One tweak, one retry,
            and the answer is interview ready. Multiply that loop across six
            turns and you see why regulars improve swiftly.
          </p>
        </div>
      </section>
      <section aria-label="Job sim questions" className="space-y-2">
        <h2 className="text-lg font-semibold">Common questions</h2>
        <div className="space-y-3 text-sm">
          <div className="rounded-xl border p-3">
            <p className="font-medium">Which job should I rehearse first?</p>
            <p className="mt-1 text-muted-foreground">
              The one you will apply for next. Search your goal on the{" "}
              <Link href="/vocrehab/discover/goals" className="underline">
                goals page
              </Link>
              , then match it to the closest sim role. Real stakes make
              practice stick, and your counselor can confirm the match.
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="font-medium">Do I have to use voice mode?</p>
            <p className="mt-1 text-muted-foreground">
              No. Typing is always free and fully supported, and many
              learners plan in text first, then repeat the same answers by
              voice for delivery practice. Use the mode that lets you attempt
              more turns, since turns are what build skill.
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="font-medium">What does the report card measure?</p>
            <p className="mt-1 text-muted-foreground">
              It quotes your own words back with one thing that landed and
              one concrete tweak, then invites a retry. There is no permanent
              score and no record unless you save. Treat it as coaching notes
              for the next attempt, and bring a saved card to your counselor
              to show growth across attempts.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
