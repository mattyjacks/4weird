/**
 * VocRehab File Sort game page (client composition boundary).
 *
 * Usage: route `app/vocrehab/play/file-sort/page.tsx`. This file is a client
 * component because it composes the shared `VocrehabGameFrame` with its game
 * via a render-prop function, which cannot cross the server/client boundary.
 * Practice-first copy and the no-test promise render above the frame.
 * Follow-up for lead: route metadata + canonical live in the arcade index
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
        <Link href="/vocrehab/play">Practice arcade</Link> → File Sort
      </nav>
      <p className="text-sm text-muted-foreground">
        Start with the untimed practice rep. The scored run gives you 3 minutes, and you can
        grant yourself 60 extra seconds with zero penalty. Practice, not a test — nothing here
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
    </main>
  );
}
