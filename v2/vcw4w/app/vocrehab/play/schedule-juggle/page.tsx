/**
 * VocRehab Schedule Juggle game page (client composition boundary).
 *
 * Usage: route `app/vocrehab/play/schedule-juggle/page.tsx`. Client
 * component composing the shared `VocrehabGameFrame` (untimed) with its game
 * via render prop. The calendar is the main screen: select a type, tap Add
 * on a date, or tap a scheduled item to remove it. Day details adjust a
 * one-hour block in five-minute steps. Trips estimate between saved
 * places, and the month saves to this device. `?legacy=1` keeps the
 * original 7-day grid. Follow-up for lead: route metadata + canonical until
 * a server layout covers this route (client components cannot export
 * metadata).
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
        Your calendar is ready first. Tap a date to plan its hours, or add and remove items right on the month view. Practice, not a test — nothing here grades you.
      </p>
      <VocrehabGameFrame
        vocrehabGameId="schedule-juggle"
        vocrehabTitle="Schedule Juggle"
        vocrehabInstructions="Start with the calendar. Choose an activity, tap + Add 1 hr on a date, and tap a scheduled item to remove it. Open a date for its hourly plan and adjust block length in five-minute steps. Save your month on this device."
        vocrehabPracticeSteps={[
          "Calendar tab: tap a date to see its hourly plan. Personal is selected to start; choose another activity any time.",
          "Tap + Add 1 hr on the calendar, or tap an open hour in day details. Tap a scheduled item to remove it.",
          "In day details, move blocks or extend and reduce them in five-minute steps.",
          "Travel tab: estimate a trip between two saved places and apply it as steady travel time.",
          "Save tab: save the month to this device, then replay the seed to build on what worked.",
        ]}
        vocrehabTimeLimitSec={null}
        vocrehabExitHref="/vocrehab/play"
        vocrehabStartInWorkspace
      >
        {(run) => <VocrehabGameScheduleJuggle {...run} />}
      </VocrehabGameFrame>
    </main>
  );
}
