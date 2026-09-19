import type { Metadata } from "next";
import Link from "next/link";
import VocrehabGameEnergyBudget from "@/components/vocrehab/vocrehab-game-energy-budget";
import { parseSeed } from "@/lib/vocrehab-seed";

export const metadata: Metadata = {
  title: "Energy Budget: Weekly Planning Practice | VocRehab",
  description:
    "Rehearse pacing a full work week inside a fixed energy allowance. Place shifts, appointments, and rest blocks, then replay with new priorities. Untimed, replayable, never graded.",
  alternates: { canonical: "/vocrehab/play/energy-budget" },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ seed?: string | string[]; savedStateId?: string | string[]; kid_id?: string | string[] }> }) {
  const params = await searchParams;
  const seed = parseSeed(typeof params.seed === "string" ? params.seed : null) ?? undefined;
  const savedStateId = typeof params.savedStateId === "string" ? params.savedStateId : undefined;
  const kidId = typeof params.kid_id === "string" ? params.kid_id : undefined;
  return (
    <main className="mx-auto max-w-3xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/play">Work & Life Practice Games</Link> → Energy Budget
      </nav>
      <h1 className="text-xl font-bold">Energy Budget: plan a week without burning out</h1>
      <p className="text-sm text-muted-foreground">
        No timer, plan at your own pace. Practice, not a test, nothing here
        grades you.
      </p>
      <VocrehabGameEnergyBudget vocrehabSeed={seed} vocrehabSavedStateId={savedStateId} vocrehabKidId={kidId} />
      <section aria-label="How to play Energy Budget" className="space-y-2 pt-2">
        <h2 className="text-base font-bold">How to play</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            Review your fixed energy allowance for the week. Every block you place,
            whether a shift, an appointment, or rest, spends from the same pool, so
            tradeoffs are visible immediately.
          </li>
          <li>
            Place your nonnegotiable commitments first: scheduled shifts, medical
            appointments, and transportation windows. These anchor the week before
            flexible blocks fill the gaps.
          </li>
          <li>
            Protect at least one genuine rest block before adding optional extras.
            Rest here is a strategic placement, not leftover time, and weeks with
            guarded recovery finish stronger.
          </li>
          <li>
            Submit the week, read the feedback on balance and coverage, then replay
            with a new seed or a changed priority, such as an extra appointment or a
            shorter shift pattern.
          </li>
        </ol>
        <h3 className="font-semibold text-foreground">Before you start</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Set yourself up for a calm planning session. Silence notifications, grab a
          drink, and open your real calendar beside the game so practice tradeoffs
          mirror genuine obligations. If you share a device, ask for fifteen
          uninterrupted minutes. Players who rehearse in a quiet corner with authentic
          appointments nearby produce weeks they actually follow.
        </p>
      </section>
      <section aria-label="Energy Budget strategies" className="space-y-2">
        <h2 className="text-base font-bold">Strategies that transfer to real scheduling</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            Front load demanding shifts early in the week when your focus is freshest,
            and keep lighter appointments for days after long shifts.
          </li>
          <li>
            Pair appointments that share a location or bus route on the same day to
            protect travel energy, then defend the freed day as rest.
          </li>
          <li>
            Treat rest as an appointment with yourself: named, placed, and defended.
            Weeks fail most often when recovery is assumed instead of scheduled.
          </li>
          <li>
            If a week cannot fit everything, practice saying which block moves and why.
            That sentence is exactly what to bring to a supervisor or counselor
            conversation, and the{" "}
            <Link href="/vocrehab/discover/goals" className="underline">goals page</Link>{" "}
            helps you connect hours to direction.
          </li>
        </ul>
      </section>
      <section aria-label="Energy Budget questions" className="space-y-2">
        <h2 className="text-base font-bold">Common questions</h2>
        <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h3 className="font-semibold text-foreground">Is there a right answer week?</h3>
            <p>
              No. Any week that covers your commitments and protects rest is a good
              week. The feedback highlights balance patterns, such as stacked demanding
              days or missing recovery, so you can adjust. Different priorities produce
              different good weeks.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">How does this connect to the course?</h3>
            <p>
              Pacing shows up in planning meetings and progress measures. A balanced
              practice week gives you concrete language for sustainable hours, which
              feeds directly into{" "}
              <Link href="/vocrehab/course" className="underline">course lessons</Link> on
              goals and next steps. Explore the full{" "}
              <Link href="/vocrehab/play" className="underline">games index</Link> for
              related planning practice.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">What if my real schedule changes midweek?</h3>
            <p>
              Come back and rebuild the week with the new constraint in place. Players
              who rehearse a disruption, such as a moved appointment or an added shift,
              report calmer real conversations with supervisors. Save both versions and
              compare which rest blocks survived; the survivors reveal your true
              nonnegotiables.
            </p>
          </div>
        </div>
      </section>
      <section aria-label="Energy Budget feedback and who benefits" className="space-y-2">
        <h2 className="text-base font-bold">What the feedback tells you</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          After you submit a week, the review comments on three dimensions: coverage,
          meaning every obligation found a slot; distribution, meaning heavy blocks are
          scattered rather than stacked; and restoration, meaning rest appears as
          deliberate placements rather than accidental gaps. A week can score well on
          coverage yet flag restoration, which mirrors the most frequent real world
          failure: everything scheduled, nobody rested.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Part time associates weighing extra hours, trainees combining coursework with
          shifts, and caregivers guarding appointment windows all profit from this
          rehearsal. If you have ever accepted a rota that looked fine on paper and
          felt crushing by Thursday, practicing the tradeoff here teaches you to spot
          that collapse before committing. Bring a balanced practice week to your
          counselor as a starting bid for sustainable hours. Snapshot the finished
          layout with your phone camera so the arrangement survives beyond the browser
          session.
        </p>
      </section>
    </main>
  );
}
