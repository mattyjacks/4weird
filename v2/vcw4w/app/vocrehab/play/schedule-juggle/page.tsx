/**
 * VocRehab Schedule Juggle game page (client composition boundary).
 *
 * Usage: route `app/vocrehab/play/schedule-juggle/page.tsx`. Client
 * component composing the shared `VocrehabGameFrame` (untimed) with its game
 * via render prop. Practice-first copy and the no-test promise render above
 * the frame. Follow-up for lead: route metadata + canonical until a server
 * layout covers this route (client components cannot export metadata).
 */

"use client";

import Link from "next/link";
import VocrehabGameFrame from "@/components/vocrehab/vocrehab-game-frame";
import VocrehabGameScheduleJuggle from "@/components/vocrehab/vocrehab-game-schedule-juggle";

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/play">Practice arcade</Link> → Schedule Juggle
      </nav>
      <p className="text-sm text-muted-foreground">
        No timer — conflicts get plain-language notes with one-tap fixes, never red errors.
        Practice, not a test — nothing here grades you.
      </p>
      <VocrehabGameFrame
        vocrehabGameId="schedule-juggle"
        vocrehabTitle="Schedule Juggle"
        vocrehabInstructions="Fit 3 shifts and 1 training block into a 7-day grid around 5 life constraints. Conflicts get plain-language notes and one-tap fixes."
        vocrehabPracticeSteps={[
          "Pick shifts or training, then tap grid cells to place them.",
          "Read each constraint card before placing.",
          "Use one-tap fixes when a conflict is highlighted.",
        ]}
        vocrehabTimeLimitSec={null}
        vocrehabExitHref="/vocrehab/play"
      >
        {(run) => <VocrehabGameScheduleJuggle {...run} />}
      </VocrehabGameFrame>
    </main>
  );
}
