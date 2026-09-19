import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Schedule Juggle — VocRehab",
  description:
    "How Schedule Juggle monthly play works: the 24-hour day, travel modes including plane and Alaska trips, Easy, Medium, and Hard levels, saves, and privacy.",
  alternates: { canonical: "/docs/vocrehab/schedule-juggle" },
};

// /docs/vocrehab/schedule-juggle — monthly play, travel, difficulty, saves + privacy.
export default function Page() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <Link href="/docs/vocrehab" className="text-sm underline">
        All guides
      </Link>
      <h1 className="text-2xl font-bold">Schedule Juggle</h1>
      <p className="text-sm text-muted-foreground">
        Schedule Juggle is planning practice that starts from what you already
        do well: keeping track, making choices, and adjusting when the day
        changes. There is no failing here — every month you finish teaches you
        something you can reuse next month.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">How monthly play works</h2>
        <p className="text-sm">
          You play one month at a time. Each month gives you a calendar of
          shifts, appointments, rest, and a few surprises. You place each item
          where it fits best, then run the month and see how it went.
        </p>
        <ol className="list-decimal space-y-2 pl-6 text-sm">
          <li>
            <strong>Look at the month.</strong> See what is fixed (work shifts,
            appointments) and what can move (errands, rest, practice).
          </li>
          <li>
            <strong>Place your week.</strong> Drag or pick a time for each
            item. The game shows overlaps right away so you can adjust.
          </li>
          <li>
            <strong>Run the month.</strong> Watch each day resolve. Steady
            routines build momentum; overpacked days cost extra energy.
          </li>
          <li>
            <strong>Review your strengths.</strong> The summary names what
            worked — protected rest, on-time arrivals, backup plans — and
            suggests one small tweak for next month.
          </li>
        </ol>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">Your 24-hour day</h2>
        <p className="text-sm">
          Every day has the same 24 hours you do. Sleep, meals, travel, work,
          and rest all draw from that budget, so trade-offs are visible: a
          late shift means a later start tomorrow, and a packed day means
          tomorrow works better with margin. A day meter shows hours used and
          hours left as you plan.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">Travel modes</h2>
        <p className="text-sm">
          Getting there is part of the plan. Pick the travel mode that fits
          the distance and your energy — faster options save time and cost
          more, steadier options save money and take longer.
        </p>
        <ul className="list-disc space-y-2 pl-6 text-sm">
          <li>
            <strong>Walk and roll.</strong> Best for nearby stops. Low cost,
            gentle pace, good when the weather cooperates.
          </li>
          <li>
            <strong>Bus and train.</strong> Reliable for cross-town trips.
            Follows a timetable, so plan a buffer around arrivals.
          </li>
          <li>
            <strong>Drive and rideshare.</strong> Flexible door-to-door trips.
            Costs more and depends on traffic and availability.
          </li>
          <li>
            <strong>Plane.</strong> For long-distance months with out-of-town
            interviews, training, or family visits. Booking ahead lowers the
            cost; same-day flights cost extra time and money.
          </li>
        </ul>
        <p className="rounded-xl border border-white/15 p-4 text-sm">
          Alaska note: distances in Alaska can be much longer than they look,
          and winter weather can change plans. The game adds extra travel time
          and a weather buffer on Alaska routes, and suggests building a
          backup plan — your planning strength, not a penalty.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">Difficulty levels</h2>
        <p className="text-sm">
          Start where you feel comfortable. You can switch levels between
          months, and untimed practice is always available.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/15">
                <th className="py-2 pr-4 font-bold">Level</th>
                <th className="py-2 pr-4 font-bold">Month shape</th>
                <th className="py-2 font-bold">Best for</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/10">
                <td className="py-2 pr-4 font-bold">Easy</td>
                <td className="py-2 pr-4">
                  Fewer events, generous buffers, gentle surprises.
                </td>
                <td className="py-2">
                  Learning the ropes and building a steady routine.
                </td>
              </tr>
              <tr className="border-b border-white/10">
                <td className="py-2 pr-4 font-bold">Medium</td>
                <td className="py-2 pr-4">
                  Full calendar, tighter evenings, occasional changes.
                </td>
                <td className="py-2">
                  Practicing trade-offs and backup plans.
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-bold">Hard</td>
                <td className="py-2 pr-4">
                  Packed weeks, shift swaps, weather and travel curveballs.
                </td>
                <td className="py-2">
                  Stretching juggling skills with support nearby.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">Save, load, and clear</h2>
        <ul className="list-disc space-y-2 pl-6 text-sm">
          <li>
            <strong>Save.</strong> Your current month and best months are
            saved so you can pause and come back anytime.
          </li>
          <li>
            <strong>Load.</strong> Reopen a saved month to retry a week or
            show a counselor what you tried.
          </li>
          <li>
            <strong>Clear.</strong> Remove a saved month whenever you want a
            fresh start. Clearing only affects this game&apos;s saves.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">Privacy</h2>
        <p className="text-sm">
          Addresses you type for planning stay on your own device — they are
          never uploaded or shared. If you choose to share usage details to
          help improve the game, they are anonymized first, so nothing can be
          traced back to you or your address. Read{" "}
          <Link href="/docs/vocrehab/privacy-safety" className="underline">
            privacy and safety
          </Link>{" "}
          for the full picture.
        </p>
      </section>

      <p className="rounded-xl border border-white/15 p-4 text-sm">
        New here? Start with{" "}
        <Link href="/docs/vocrehab/getting-started" className="underline">
          getting started
        </Link>{" "}
        or browse{" "}
        <Link href="/docs/vocrehab/games" className="underline">
          the practice games
        </Link>
        .
      </p>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Worked month: a steady Easy start</h2>
        <p className="text-sm">
          Play your first month on Easy with one rule: protect rest before placing shifts.
          Block sleep and one rest window each day, then place three evening shifts around
          them. Add the training block to a morning with a bus buffer on both sides. When a
          surprise lands, such as a moved appointment, drag the flexible errand first and
          leave fixed shifts alone. Run the month and read the summary for strengths: on-time
          arrivals, protected rest, a backup plan used well. Keep the one suggested tweak,
          for example a longer margin after late shifts, and replay the month with only that
          change. That loop, one tweak per month, is the whole skill.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Troubleshooting</h2>
        <ul className="list-disc space-y-2 pl-6 text-sm">
          <li>
            <strong>Everything overlaps.</strong> Clear the flexible items first, protect
            sleep and rest, then re-place one block at a time. The conflict notes name a
            plain-language fix for each overlap.
          </li>
          <li>
            <strong>Days run out of hours.</strong> Check the day meter: travel plus work
            plus meals may already fill the budget. Swap a drive for a bus ride, move an
            errand to a light day, or drop one optional item.
          </li>
          <li>
            <strong>Travel eats the week.</strong> Group nearby stops on the same day and pick
            the steadier mode with a timetable buffer. For Alaska routes, keep the weather
            buffer and a backup plan rather than trimming them.
          </li>
          <li>
            <strong>A save vanished.</strong> Saves live per device for this game. Clearing a
            save affects only Schedule Juggle. Reload the saved month from{" "}
            <Link href="/vocrehab/play/schedule-juggle" className="underline">
              the game page
            </Link>{" "}
            to confirm before replaying.
          </li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Common questions</h2>
        <ul className="list-disc space-y-2 pl-6 text-sm">
          <li>
            <strong>Can I fail a month.</strong> No. Every finished month names strengths and
            one tweak. Overpacked days cost energy in the game, never grades or penalties.
          </li>
          <li>
            <strong>Which level should I pick.</strong> Easy for routines, Medium for
            trade-offs, Hard for packed weeks with support nearby. Switch between months
            freely.
          </li>
          <li>
            <strong>How do I review with a counselor.</strong> Sign in so months save, load a
            saved month together, and talk through the summary strengths. Privacy rules live
            in{" "}
            <Link href="/docs/vocrehab/privacy-safety" className="underline">
              privacy and safety
            </Link>
            .
          </li>
        </ul>
      </section>
    </main>
  );
}
