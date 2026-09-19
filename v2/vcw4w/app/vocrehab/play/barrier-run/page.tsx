/**
 * VocRehab Barrier Run game page (client composition boundary).
 *
 * Usage: route `app/vocrehab/play/barrier-run/page.tsx`. Client component
 * composing the shared `VocrehabGameFrame` (untimed) with its game via
 * render prop. Practice-first copy and the no-test promise render above the
 * frame. Follow-up for lead: route metadata + canonical until a server
 * layout covers this route (client components cannot export metadata).
 */

"use client";

import Link from "next/link";
import VocrehabGameFrame from "@/components/vocrehab/vocrehab-game-frame";
import VocrehabGameBarrierRun from "@/components/vocrehab/vocrehab-game-barrier-run";

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/play">Work & Life Practice Games</Link> → Barrier Run
      </nav>
      <h1 className="text-xl font-bold">Barrier Run: rehearse four classic work barriers</h1>
      <p className="text-sm text-muted-foreground">
        No timer, progress saves per scene, and replaying shows alternate paths. Every choice is
        valid. Practice, not a test, nothing here grades you.
      </p>
      <VocrehabGameFrame
        vocrehabGameId="barrier-run"
        vocrehabTitle="Barrier Run"
        vocrehabInstructions="Walk four work situations — commute, shift swap, disclosure, tool failure. Every choice is valid and maps to a barrier plus a strategy."
        vocrehabPracticeSteps={[
          "Read the scene.",
          "Pick the option closest to what you would do.",
          "Replay to explore the paths you did not take.",
        ]}
        vocrehabTimeLimitSec={null}
        vocrehabExitHref="/vocrehab/play"
      >
        {(run) => <VocrehabGameBarrierRun {...run} />}
      </VocrehabGameFrame>
      <section aria-label="How to play Barrier Run" className="space-y-2 pt-2">
        <h2 className="text-base font-bold">How to play</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            Read each scene slowly. You will meet four work situations: a difficult
            commute, a shift swap request, a disclosure timing decision, and a tool
            failure on the job.
          </li>
          <li>
            Pick the option closest to what you would honestly do. There are no trick
            answers, and every choice maps to a named barrier plus a practical strategy.
          </li>
          <li>
            Replay scenes to explore the paths you did not take. Alternate branches
            reveal exit ramps, such as asking for a backup contact or requesting a
            temporary accommodation.
          </li>
        </ol>
      </section>
      <section aria-label="Barrier Run strategies" className="space-y-2">
        <h2 className="text-base font-bold">What each situation teaches</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong className="text-foreground">Commute trouble</strong> rehearses backup
            planning: earlier buses, carpool contacts, and what to text a supervisor
            when transit fails.
          </li>
          <li>
            <strong className="text-foreground">Shift swaps</strong> practice clear,
            early communication plus knowing your workplace swap policy before you need it.
          </li>
          <li>
            <strong className="text-foreground">Disclosure timing</strong> walks through
            when sharing helps and when waiting is wiser, always ending with a short
            script starter you can adapt.
          </li>
          <li>
            <strong className="text-foreground">Tool failure</strong> builds the habit of
            reporting promptly, switching to manual backup steps, and logging what broke
            for maintenance.
          </li>
        </ul>
        <p className="text-sm leading-relaxed text-muted-foreground">
          To go deeper on any barrier you recognized, visit{" "}
          <Link href="/vocrehab/discover/barriers" className="underline">Name Barriers, Map Supports</Link>{" "}
          or continue with the{" "}
          <Link href="/vocrehab/course" className="underline">course lessons</Link>. The full{" "}
          <Link href="/vocrehab/play" className="underline">games index</Link> has related
          planning practice.
        </p>
      </section>
      <section aria-label="Barrier Run questions" className="space-y-2">
        <h2 className="text-base font-bold">Common questions</h2>
        <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h3 className="font-semibold text-foreground">Can I pick a wrong answer?</h3>
            <p>
              No. Every option is treated as valid information about your instincts, and
              each one earns a mapped strategy. The point is noticing which barriers feel
              familiar and collecting two or three responses you would actually use.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Should I replay scenes I already finished?</h3>
            <p>
              Yes, replaying is where the learning compounds. Untaken branches show
              strategies you might never have considered, such as a temporary schedule
              adjustment or a different person to notify first. Bring your favorite new
              strategy to your next counselor conversation.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">How long does a full walkthrough take?</h3>
            <p>
              Most players finish all four scenes in under fifteen minutes, since there
              is no timer and each scene is a single situation. Treat it as a warmup:
              one walkthrough to see every barrier, then focused replays on the scene
              that felt closest to your life.
            </p>
          </div>
        </div>
      </section>
      <section aria-label="Barrier Run feedback and who benefits" className="space-y-2">
        <h2 className="text-base font-bold">Feedback style and who benefits most</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Each scene closes with a brief debrief naming the barrier you met and two or
          three tactics fellow workers use against it. There is no numeric score and no
          passing mark. Instead, the game tracks which branches you have explored, so
          return visits surface fresh alternatives rather than bigger numbers. Guests
          retain this history in the browser, while signed in players build a visible
          record of rehearsal breadth across weeks. Many players screenshot a favorite
          debrief line into a notebook for interview preparation.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Career changers entering unfamiliar routines, students starting a first
          supervised job, and returning employees rebuilding assurance after time away
          gain the most from pressure free rehearsal. If transit mishaps, rota
          negotiations, or equipment breakdowns have derailed you previously, walking
          those moments here banks phrasing and backup plans you can reuse when stakes
          are genuine.
        </p>
      </section>
    </main>
  );
}
