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
        <Link href="/vocrehab/play">Practice arcade</Link> → Barrier Run
      </nav>
      <p className="text-sm text-muted-foreground">
        No timer — progress saves per scene, and replaying shows alternate paths. Every choice is
        valid. Practice, not a test — nothing here grades you.
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
    </main>
  );
}
