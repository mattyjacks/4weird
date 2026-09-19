/**
 * VocRehab Focus Shift game page (client composition boundary).
 *
 * Usage: route `app/vocrehab/play/focus-shift/page.tsx`. Client component
 * composing the shared `VocrehabGameFrame` with its game via render prop.
 * Practice-first copy and the no-test promise render above the frame.
 * Follow-up for lead: route metadata + canonical until a server layout
 * covers this route (client components cannot export metadata).
 */

"use client";

import Link from "next/link";
import VocrehabGameFrame from "@/components/vocrehab/vocrehab-game-frame";
import VocrehabGameFocusShift from "@/components/vocrehab/vocrehab-game-focus-shift";

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/play">Work & Life Practice Games</Link> → Focus Shift
      </nav>
      <h1 className="text-xl font-bold">Focus Shift: refocus after interruptions</h1>
      <p className="text-sm text-muted-foreground">
        Start with the untimed practice rep. Interruptions happen at work, this shows what helps
        you refocus. Practice, not a test, nothing here grades you.
      </p>
      <VocrehabGameFrame
        vocrehabGameId="focus-shift"
        vocrehabTitle="Focus Shift"
        vocrehabInstructions="Match 10 symbol pairs. A scripted interruption will appear partway through — pause, notice it, then refocus."
        vocrehabPracticeSteps={[
          "Flip two cards to find a matching pair.",
          "Keep going until all pairs are matched.",
          "When the interruption appears, read it, then return to the cards.",
        ]}
        vocrehabTimeLimitSec={240}
        vocrehabExitHref="/vocrehab/play"
      >
        {(run) => <VocrehabGameFocusShift {...run} />}
      </VocrehabGameFrame>
      <section aria-label="How to play Focus Shift" className="space-y-2 pt-2">
        <h2 className="text-base font-bold">How to play</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            Flip two cards at a time to find matching symbol pairs. Ten pairs are
            hidden in the grid, and the untimed practice rep lets you learn their
            positions without pressure.
          </li>
          <li>
            Keep a steady rhythm: check two cards, note what you saw, then move on.
            Remembering approximate zones beats chasing exact squares early in the run.
          </li>
          <li>
            When the scripted interruption appears midway, pause and read it fully.
            Then return to the cards and replay your last known pair first to rebuild
            momentum.
          </li>
          <li>
            Finish all ten pairs. The scored run allows four minutes, which rewards
            calm recovery far more than frantic flipping.
          </li>
        </ol>
        <h3 className="font-semibold text-foreground">Before you start</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Protect a calm six minutes. Dim screen glare, mute messaging apps, and tell
          housemates you are rehearsing. Sit upright, breathe slowly, and preview the
          grid without flipping anything for ten seconds. Entering the run relaxed
          yields cleaner scans and faster rebounds when the interruption lands.
        </p>
      </section>
      <section aria-label="Focus Shift refocusing strategies" className="space-y-2">
        <h2 className="text-base font-bold">Refocusing strategies for real workplaces</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong className="text-foreground">Bookmark your place.</strong> Before
            answering any interruption, note exactly where you stopped. Workers who
            leave a visible marker return to tasks twice as fast.
          </li>
          <li>
            <strong className="text-foreground">Close the loop out loud.</strong> After an
            interruption, restate your next micro step, such as checking the two cards
            in the top row. One spoken sentence restores context.
          </li>
          <li>
            <strong className="text-foreground">Slow the first minute back.</strong> Deliberate,
            accurate flips right after an interruption rebuild confidence faster than
            rushing to make up lost time.
          </li>
          <li>
            <strong className="text-foreground">Debrief your pattern.</strong> Notice whether
            noise, messages, or people break your focus most. That self knowledge powers
            accommodation requests you can rehearse in the{" "}
            <Link href="/vocrehab/course" className="underline">course lessons</Link>, and the{" "}
            <Link href="/vocrehab/discover" className="underline">Discover section</Link>{" "}
            helps map it to strengths.
          </li>
        </ul>
      </section>
      <section aria-label="Focus Shift questions" className="space-y-2">
        <h2 className="text-base font-bold">Common questions</h2>
        <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h3 className="font-semibold text-foreground">Why does the game interrupt me on purpose?</h3>
            <p>
              Because real shifts include pages, questions, and announcements. The
              scripted break lets you rehearse the hardest ten seconds of any workday:
              the return. Your recovery routine here transfers directly to registers,
              desks, and shop floors.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">What if my memory for pairs is weak?</h3>
            <p>
              Play the untimed rep twice before scoring, and narrate card positions
              quietly as you go. Most players improve sharply by the third run, since the
              skill is systematic scanning, not photographic recall. See the{" "}
              <Link href="/vocrehab/play" className="underline">games index</Link> for
              more attention practice.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Does a slower time mean poor focus?</h3>
            <p>
              Not at all. Steady, methodical players often finish with fewer wasted flips
              than speedy ones, and the four minute allowance rewards exactly that style.
              Compare your recovery after the interruption across runs: shrinking return
              times signal growing focus control better than any single finish time.
            </p>
          </div>
        </div>
      </section>
      <section aria-label="Focus Shift measures and who benefits" className="space-y-2">
        <h2 className="text-base font-bold">What the run measures</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The run tracks scanning efficiency, or how few redundant flips you need;
          interruption recovery, or seconds between reading the scripted break and your
          next productive match; and closing accuracy, or clean finishes once two pairs
          remain. Recovery is the headline metric because supervisors remember who
          restabilizes quickest after pages and announcements. Watching it shrink over
          several attempts proves a trainable skill, not a fixed trait.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Receptionists juggling callers and visitors, retail associates covering
          registers amid announcements, warehouse spotters rotating stations, and
          students studying in busy households all rehearse their exact workday here.
          If your environment guarantees frequent pings, this game builds the ten
          second reset ritual that keeps output consistent from opening to close.
        </p>
      </section>
    </main>
  );
}
