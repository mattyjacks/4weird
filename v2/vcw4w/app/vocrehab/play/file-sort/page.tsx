/**
 * VocRehab File Sort game page (client composition boundary).
 *
 * Usage: route `app/vocrehab/play/file-sort/page.tsx`. This file is a client
 * component because it composes the shared `VocrehabGameFrame` with its game
 * via a render-prop function, which cannot cross the server/client boundary.
 * Practice-first copy and the no-test promise render above the frame.
 * Follow-up for lead: route metadata + canonical live in the practice-games index
 * until a server layout covers this route (client components cannot export
 * metadata).
 */

"use client";

import Link from "next/link";
import VocrehabGameFrame from "@/components/vocrehab/vocrehab-game-frame";
import VocrehabGameFileSort from "@/components/vocrehab/vocrehab-game-file-sort";

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/play">Work & Life Practice Games</Link> → File Sort
      </nav>
      <h1 className="text-xl font-bold">File Sort: steady office sorting practice</h1>
      <p className="text-sm text-muted-foreground">
        Start with the untimed practice rep. The scored run gives you 3 minutes, and you can
        grant yourself 60 extra seconds with zero penalty. Practice, not a test, nothing here
        grades you.
      </p>
      <VocrehabGameFrame
        vocrehabGameId="file-sort"
        vocrehabTitle="File Sort"
        vocrehabInstructions="Sort 12 files into Invoices, Schedules, and Client Notes. A manager message may pop up midway — either order is fine."
        vocrehabPracticeSteps={[
          "Pick a file to select it.",
          "Choose the folder it belongs in.",
          "Misfiled something? Just move it — recovery counts.",
        ]}
        vocrehabTimeLimitSec={180}
        vocrehabExitHref="/vocrehab/play"
      >
        {(run) => <VocrehabGameFileSort {...run} />}
      </VocrehabGameFrame>
      <section aria-label="How to play File Sort" className="space-y-2 pt-2">
        <h2 className="text-base font-bold">How to play</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            Warm up with the untimed practice rep. Pick a file to select it, then choose
            among Invoices, Schedules, and Client Notes. Misfiled something? Just move
            it, recovery counts as skill here.
          </li>
          <li>
            Start the scored run when ready: twelve files, three minutes, with one
            manager message popping up midway. Either handling order is fine, so answer
            the message when it suits your rhythm.
          </li>
          <li>
            If the clock pressures you, grant yourself the 60 extra seconds. It carries
            zero penalty and models a real accommodation: asking for the time you need
            before quality slips.
          </li>
        </ol>
        <h3 className="font-semibold text-foreground">Before you start</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Arrange a focused workstation. Brighten the screen, silence your phone, and
          keep a notebook handy for jotting which folder tricks you. If background noise
          distracts you, try headphones or relocate to a quieter corner. Short,
          deliberate warmups beat marathon sessions: two crisp practice reps prime
          steadier hands than ten tired ones.
        </p>
      </section>
      <section aria-label="File Sort scoring and strategy" className="space-y-2">
        <h2 className="text-base font-bold">Scoring and strategy</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong className="text-foreground">Sort in passes.</strong> Place the obvious
            files first to build momentum, then slow down for ambiguous names. Accuracy
            on the tricky third matters more than raw speed.
          </li>
          <li>
            <strong className="text-foreground">Batch the interruption.</strong> Finish the
            file in your hand before reading the manager message, then return to the
            next file without rechecking finished ones.
          </li>
          <li>
            <strong className="text-foreground">Fix fast, without spiraling.</strong> A
            misfile costs little when corrected immediately. The run rewards bouncing
            back, which is exactly what supervisors value on real office tasks.
          </li>
          <li>
            <strong className="text-foreground">Watch your pattern.</strong> After two runs,
            note whether errors cluster in one folder. That observation becomes a resume
            line about attention to detail and a talking point for{" "}
            <Link href="/vocrehab/interview/resume" className="underline">your resume builder</Link>{" "}
            or the <Link href="/vocrehab/course" className="underline">course lessons</Link>.
          </li>
        </ul>
      </section>
      <section aria-label="File Sort questions" className="space-y-2">
        <h2 className="text-base font-bold">Common questions</h2>
        <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h3 className="font-semibold text-foreground">Does using the extra 60 seconds lower my score?</h3>
            <p>
              No. The extension exists so you can practice pacing honestly, and invoking
              it never penalizes you. Compare runs with and without it to learn which
              pace keeps your accuracy highest.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">What if I keep mixing up two folders?</h3>
            <p>
              Name the difference out loud before each placement, for example invoice
              amounts versus appointment dates. Players who verbalize the rule for three
              placements in a row usually stop the confusion. Browse the{" "}
              <Link href="/vocrehab/play" className="underline">games index</Link> for
              related focus practice.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">How many runs should I do before the scored attempt?</h3>
            <p>
              Two untimed reps are enough for most players: one to learn the folders,
              one to settle a rhythm. If misfiles persist, do a third rep narrating each
              decision aloud. Jump to the scored run while the pattern feels fresh, and
              remember the bonus minute is always available.
            </p>
          </div>
        </div>
      </section>
      <section aria-label="File Sort measures and who benefits" className="space-y-2">
        <h2 className="text-base font-bold">What the run measures</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The scored run observes three qualities employers screen for: tempo, or files
          resolved per minute without rushing; precision, or first attempt placements
          that stick; and composure, or how quickly you steady yourself after a misfile
          and the mid run manager ping. Composure carries special weight because
          workplaces forgive errors far more readily than meltdowns. Your summary shows
          all three, so you can see whether speed is costing you correctness.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Aspiring data entry clerks, receptionists, stockroom assistants, and anyone
          returning to desk routines after hands on labor will find this drill directly
          relevant. If job postings keep asking for detail orientation plus multitasking,
          two calm scored runs give you honest evidence for interviews and a concrete
          anecdote about handling interruptions gracefully.
        </p>
      </section>
    </main>
  );
}
