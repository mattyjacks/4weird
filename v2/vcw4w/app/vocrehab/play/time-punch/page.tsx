import type { Metadata } from "next";
import Link from "next/link";
import { VocrehabGameTimePunch } from "@/components/vocrehab/vocrehab-game-time-punch";
import { parseSeed } from "@/lib/vocrehab-seed";

export const metadata: Metadata = {
  title: "Shift Punch: on-time punch practice game | VocRehab",
  description: "VocRehab punctuality game: punch 6 shift tasks inside their time windows across a 3-minute shift, with a late-bus grace window and a penalty-free extra minute.",
  alternates: { canonical: "/vocrehab/play/time-punch" },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ seed?: string | string[] }> }) {
  const params = await searchParams;
  const seed = parseSeed(typeof params.seed === "string" ? params.seed : null) ?? undefined;
  return (
    <main className="mx-auto max-w-3xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/play">Work & Life Practice Games</Link> → Shift Punch
      </nav>
      <h1 className="text-xl font-bold">Shift Punch: on-time punch practice</h1>
      <p className="text-sm text-muted-foreground">
        Start with the untimed practice rep. The scored run gives you a three-minute
        shift, and you can grant yourself 60 extra seconds with zero penalty.
        Practice, not a test, nothing here grades you.
      </p>
      <VocrehabGameTimePunch vocrehabSeed={seed} />
      <section aria-label="How to play Shift Punch" className="space-y-2 pt-2">
        <h2 className="text-base font-bold">How to play</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            Press start and watch the three-minute clock. Six shift tasks appear on a
            timeline, each with its own open window. Punch each task once while its
            window light is on.
          </li>
          <li>
            Wait for the window before you punch. Punching early marks the punch early
            rather than on time, so train the pause: light on, punch once, move on.
            Missed windows stay missed, which mirrors real attendance policies.
          </li>
          <li>
            At ninety seconds the late-bus grace window opens for twenty seconds. If
            transit or a hallway delay made you late, punch inside grace and the run
            credits your backup plan instead of punishing the delay.
          </li>
          <li>
            Need breathing room? Grant yourself the extra sixty seconds with zero
            penalty, the same way you would ask a supervisor for help before a rush.
          </li>
        </ol>
        <h3 className="font-semibold text-foreground">Before you start</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Silence notifications and keep your eyes on the timeline, not the clock
          digits. Decide your punch order in the practice rep: consecutive windows
          first, then the loners. Two calm reps teach the rhythm better than ten
          rushed ones, and replaying the same seed lets you compare pacing choices
          fairly.
        </p>
      </section>
      <section aria-label="Shift Punch scoring and strategy" className="space-y-2">
        <h2 className="text-base font-bold">Scoring and strategy</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong className="text-foreground">One alarm per window.</strong> In real
            shifts a phone buzz beats watching the clock. Mentally assign each task a
            cue, then trust the cue instead of hovering over the punch button.
          </li>
          <li>
            <strong className="text-foreground">Early is eagerness, not failure.</strong> An
            early punch still misses that window, so convert rushing into waiting.
            Supervisors notice reliability before speed, and the summary says so.
          </li>
          <li>
            <strong className="text-foreground">Spend grace like a backup plan.</strong> Grace
            exists for late buses and slow elevators. Using it exactly right earns a
            callout in your run summary, because backup plans are a work skill.
          </li>
          <li>
            <strong className="text-foreground">Study your miss pattern.</strong> Misses that
            cluster early mean slow starts, while late misses mean fading focus. Bring
            that observation to{" "}
            <Link href="/vocrehab/interview/prep" className="underline">interview prep</Link>{" "}
            as an honest growth story, or drill steadiness in{" "}
            <Link href="/vocrehab/play/file-sort" className="underline">File Sort</Link>.
          </li>
        </ul>
      </section>
      <section aria-label="Shift Punch questions" className="space-y-2">
        <h2 className="text-base font-bold">Common questions</h2>
        <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h3 className="font-semibold text-foreground">Does the extra 60 seconds lower my score?</h3>
            <p>
              No. The extension models asking for the help you need before quality
              slips, and invoking it never penalizes you. Compare runs with and without
              it to find the pace where your on-time rate stays highest.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Why do early punches not count?</h3>
            <p>
              Because clocking in ten minutes early is not the same skill as arriving in
              your window. The game separates eagerness from punctuality so you can see
              which one needs work, then practice the pause deliberately.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">What score should I aim for?</h3>
            <p>
              Five of six on time clears the steady band at 80 percent and above. Below
              half lands in exploring, which simply means more reps, not less promise.
              Browse the <Link href="/vocrehab/play" className="underline">games index</Link> for
              companion drills while the rhythm settles.
            </p>
          </div>
        </div>
      </section>
      <section aria-label="Shift Punch measures and who benefits" className="space-y-2">
        <h2 className="text-base font-bold">What the run measures</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The scored run observes three qualities hiring managers screen for: timing,
          or punches landing inside their windows; patience, or resisting the urge to
          punch early; and recovery, or using grace and the extra minute like planned
          accommodations instead of panicking. Your summary reports on-time count,
          early count, and misses, so you can see exactly which habit to train next.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Retail associates, warehouse pickers, food service crew, home health aides,
          and anyone whose job starts with a time clock will find this drill directly
          relevant. If applications keep asking about reliability and attendance, two
          steady scored runs give you honest evidence and a concrete anecdote about
          managing your minutes.
        </p>
      </section>
    </main>
  );
}
