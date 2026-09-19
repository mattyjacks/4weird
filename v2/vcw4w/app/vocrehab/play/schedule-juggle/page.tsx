/**
 * VocRehab Schedule Juggle game page (client composition boundary).
 *
 * Usage: route `app/vocrehab/play/schedule-juggle/page.tsx`. Client
 * component composing the shared `VocrehabGameFrame` (untimed) with its game
 * via render prop. The calendar is the main screen: select a type, tap Add
 * on a date, or tap a scheduled item to remove it. Day details adjust a
 * one-hour block in five-minute steps. Trips estimate between saved
 * places, and the month saves to this device. `?legacy=1` keeps the
 * original 7-day grid. Route metadata + canonical live in the sibling
 * server layout.
 */

"use client";

import Link from "next/link";
import VocrehabGameFrame from "@/components/vocrehab/vocrehab-game-frame";
import VocrehabGameScheduleJuggle from "@/components/vocrehab/vocrehab-game-schedule-juggle";

export default function Page() {
  return (
    <main className="mx-auto max-w-6xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/play">Work & Life Practice Games</Link> → Schedule Juggle
      </nav>
      <h1 className="text-xl font-bold">Schedule Juggle: fit work around real life</h1>
      <p className="text-sm text-muted-foreground">
        Your calendar is ready first. Tap a date to plan its hours, or add and remove items right on the month view. Practice, not a test. Nothing here grades you.
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
      <section aria-label="How to play Schedule Juggle" className="mx-auto max-w-3xl space-y-2 pt-2">
        <h2 className="text-base font-bold">How to play</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            Open the calendar and pick an activity type first: shifts, training,
            appointments, or personal time. Personal is preselected so your first tap
            can be exploratory without consequences.
          </li>
          <li>
            Tap + Add 1 hr on any date to place a block, or open the date for its
            hourly plan and tap an open hour. Tap a scheduled item to remove it.
            Nothing is final until you say so.
          </li>
          <li>
            Tune blocks in day details: move them between hours, extend or reduce in
            five-minute steps, and stack travel time around fixed commitments. Small
            adjustments compound into a month that actually fits.
          </li>
          <li>
            Use the Travel tab to estimate trips between two saved places, then apply
            the result as steady travel time. Save the month to this device from the
            Save tab, then replay the seed to improve on your own plan.
          </li>
        </ol>
        <h3 className="font-semibold text-foreground">Before you start</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          List your real fixed commitments on paper first: work shifts, classes, bus
          windows, caregiving hours. Enter those before anything flexible, because a
          calendar built around anchors survives contact with reality. Prefer the
          classic 7-day grid? Append ?legacy=1 to the URL for the original view.
        </p>
      </section>
      <section aria-label="Schedule Juggle scoring and strategy" className="mx-auto max-w-3xl space-y-2">
        <h2 className="text-base font-bold">Planning strategy</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong className="text-foreground">Anchors first.</strong> Place shifts,
            classes, and appointments before flexible blocks. A month planned around
            fixed points rarely collapses; a month planned around wishes always does.
          </li>
          <li>
            <strong className="text-foreground">Budget travel honestly.</strong> Estimate
            every regular trip and bake it into the day. Commuters who plan door to
            door stop being late far more reliably than commuters who plan optimistically.
          </li>
          <li>
            <strong className="text-foreground">Leave white space.</strong> A calendar
            packed edge to edge has nowhere for life to go. Keep one buffer block per
            week for the errand, the callback, or the rest you will need. Review the
            result with{" "}
            <Link href="/vocrehab/course" className="underline">the course lessons</Link>{" "}
            on barriers and supports.
          </li>
          <li>
            <strong className="text-foreground">Iterate on the same seed.</strong> Replay
            the identical month layout and beat your own arrangement: fewer overlaps,
            shorter travel chains, calmer weeks. Iteration is the skill being trained,
            so compare versions on the{" "}
            <Link href="/vocrehab/play" className="underline">games index</Link> between attempts.
          </li>
        </ul>
      </section>
      <section aria-label="Schedule Juggle questions" className="mx-auto max-w-3xl space-y-2">
        <h2 className="text-base font-bold">Common questions</h2>
        <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h3 className="font-semibold text-foreground">Is there a timer or score?</h3>
            <p>
              No. Schedule Juggle is untimed and unscored on purpose: real planning
              rewards thoughtfulness, not speed. Your saved month is the artifact, and
              comparing versions across replays shows your progress.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Where does my saved month live?</h3>
            <p>
              On this device only, through the Save tab. Nothing uploads anywhere,
              which keeps your real appointments private. Export or screenshot the
              month if you want to show a counselor your plan.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">How does this help with actual employment?</h3>
            <p>
              Every shift job asks when you are available, and strong candidates answer
              with specifics. A practiced month of anchors, travel, and buffers becomes
              availability you can state confidently in interviews and defend in your{" "}
              <Link href="/vocrehab/interview/prep" className="underline">interview prep</Link>.
            </p>
          </div>
        </div>
      </section>
      <section aria-label="Schedule Juggle measures and who benefits" className="mx-auto max-w-3xl space-y-2">
        <h2 className="text-base font-bold">What the practice builds</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          This drill builds three planning muscles employers and programs screen for:
          constraint mapping, or fitting shifts and training around buses, childcare,
          and appointments; travel realism, or costing trips before committing to
          hours; and buffer discipline, or leaving room for life without guilt. The
          month view makes tradeoffs visible instead of theoretical.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Students balancing classes with part-time shifts, parents coordinating
          childcare windows, and anyone starting shift work with a bus pass will find
          this drill directly relevant. If counselors keep asking how work fits your
          life, a saved month you built yourself is the strongest possible answer.
        </p>
      </section>
    </main>
  );
}
