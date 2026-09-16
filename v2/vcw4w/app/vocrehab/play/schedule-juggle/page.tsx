/**
 * VocRehab Schedule Juggle game page (client composition boundary).
 *
 * Usage: route `app/vocrehab/play/schedule-juggle/page.tsx`. Client
 * component composing the shared `VocrehabGameFrame` (untimed) with its game
 * via render prop. Practice-first copy and the no-test promise render above
 * the frame. The board is a monthly calendar: each day opens a 24-hour
 * drawer, trips estimate between saved places, and the month saves to this
 * device. `?legacy=1` keeps the original 7-day grid. Follow-up for lead:
 * route metadata + canonical until a server layout covers this route
 * (client components cannot export metadata).
 */

"use client";

import Link from "next/link";
import VocrehabGameFrame from "@/components/vocrehab/vocrehab-game-frame";
import VocrehabGameScheduleJuggle from "@/components/vocrehab/vocrehab-game-schedule-juggle";

export default function Page() {
  return (
    <main className="mx-auto max-w-6xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/play">Practice arcade</Link> → Schedule Juggle
      </nav>
      <p className="text-sm text-muted-foreground">
        No timer — plan a whole month at your own pace. Open days get plain-language notes with
        one-tap fixes, never red errors. Practice, not a test — nothing here grades you.
      </p>
      <VocrehabGameFrame
        vocrehabGameId="schedule-juggle"
        vocrehabTitle="Schedule Juggle"
        vocrehabInstructions="Plan a whole month: open any day for its 24-hour view, place sleep, shifts, meals, and training, estimate trips between your saved places, and save the month to this device. Overlaps get plain-language notes and one-tap fixes."
        vocrehabPracticeSteps={[
          "Pick a home base (Tacoma, Manchester, or Anchorage), then open a day on the month grid.",
          "Choose an activity, then tap half-hour targets to build the 24-hour day — move or extend blocks anytime.",
          "Estimate a trip between two saved places and apply it as steady travel time.",
          "Save the month to this device, then replay the seed to build on what worked.",
        ]}
        vocrehabTimeLimitSec={null}
        vocrehabExitHref="/vocrehab/play"
      >
        {(run) => <VocrehabGameScheduleJuggle {...run} />}
      </VocrehabGameFrame>
    </main>
  );
}
