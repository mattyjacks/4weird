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
      <p className="text-sm text-muted-foreground">
        Start with the untimed practice rep. Interruptions happen at work — this shows what helps
        you refocus. Practice, not a test — nothing here grades you.
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
    </main>
  );
}
