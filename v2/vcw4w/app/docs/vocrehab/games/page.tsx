import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";

export const metadata: Metadata = {
  title: "VocRehab games catalog",
  description:
    "Every VocRehab micro-game in one place: what each game observes, how to play it keyboard-only, and the retry policy. Practice, never a test.",
  alternates: { canonical: "/docs/vocrehab/games" },
};

const theme = {
  bg: "bg-gradient-to-br from-emerald-950 via-slate-950 to-teal-950",
  border: "border-emerald-400/20",
  chip: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200",
  title:
    "bg-gradient-to-r from-emerald-300 via-teal-200 to-lime-300 bg-clip-text text-transparent",
};

// /docs/vocrehab/games — catalog guide to every micro-game (server, plain language).
export default function Page() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · VocRehab"
        title={
          <>
            Eleven small games. <span className={theme.title}>Zero grades.</span>
          </>
        }
        lede={
          <>
            Every VocRehab micro-game in one place: what each one observes, how to play it
            keyboard-only, and the retry policy. Each game starts with an untimed practice round,
            and every run is strengths-first — practice, not a test.
          </>
        }
        stats={[
          ["11", "micro-games covered"],
          ["5 + 3 + 3", "core · pack-2 · new crew"],
          ["⌨️", "fully keyboard-playable"],
          ["∞", "retries, all equal"],
        ]}
        glyph="🎮"
        theme={theme}
        crumb="VocRehab games"
      />

      <main className="mx-auto max-w-3xl space-y-8 p-6">
        <Link href="/docs/vocrehab" className="text-sm underline">
          All guides
        </Link>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">The shared rules</h2>
          <ul className="list-disc space-y-2 pl-6 text-sm">
            <li>
              <strong>Practice first.</strong> Every game opens with an untimed practice round, then
              a countdown into the scored run. You can pause or exit at any time.
            </li>
            <li>
              <strong>Keyboard play.</strong> Every control is a native keyboard-focusable button or
              option: Tab to move, Enter or Space to choose. File Sort additionally supports arrow
              keys plus Enter. Results are announced through a live region for screen readers, and
              reduced-motion preferences are respected.
            </li>
            <li>
              <strong>Retry policy.</strong> You can retry any game any time, and retries always
              count the same — a later run never penalizes an earlier one. Barrier Run invites
              replays to try other story paths.
            </li>
            <li>
              <strong>Strengths-first scoring.</strong> Summaries use plain bands (steady, strong,
              developing) and supports, never IQ-like numbers or percentiles. Signing in saves runs
              to your profile; guests can play everything.
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Play them at <Link href="/vocrehab/play" className="underline">the practice arcade</Link>.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">The five core games</h2>
          <p className="text-sm text-muted-foreground">
            The original set: short, timed-or-untimed rehearsals of office and scheduling skills.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            <li className="rounded-xl border border-white/15 p-5">
              <Link href="/vocrehab/play/file-sort" className="font-bold underline">
                File Sort
              </Link>
              <p className="mt-1 text-sm">
                <strong>Observes:</strong> sorting accuracy and steadiness — 12 files into 3 folders
                (Invoices, Schedules, Client Notes), timed at 3 minutes.
              </p>
              <p className="mt-1 text-sm">
                <strong>Keyboard:</strong> click, tap, or arrow keys plus Enter.
              </p>
              <p className="mt-1 text-sm">
                <strong>Retry:</strong> anytime; one practice round first.
              </p>
            </li>
            <li className="rounded-xl border border-white/15 p-5">
              <Link href="/vocrehab/play/inbox-sprint" className="font-bold underline">
                Inbox Sprint
              </Link>
              <p className="mt-1 text-sm">
                <strong>Observes:</strong> prioritization and caution — triage 8 mock messages
                (reply now, schedule, file, or flag), write one short reply from a sentence
                starter, and flag anything that looks like phishing. Flagging is always safe.
                Timed at 3 minutes.
              </p>
              <p className="mt-1 text-sm">
                <strong>Keyboard:</strong> Tab through messages, Enter to choose an action.
              </p>
              <p className="mt-1 text-sm">
                <strong>Retry:</strong> anytime; see also the phishing drill below.
              </p>
            </li>
            <li className="rounded-xl border border-white/15 p-5">
              <Link href="/vocrehab/play/focus-shift" className="font-bold underline">
                Focus Shift
              </Link>
              <p className="mt-1 text-sm">
                <strong>Observes:</strong> refocusing, not speed — match 10 symbol pairs while a
                scripted interruption appears partway through. What matters is what helps you
                refocus. Timed at 4 minutes.
              </p>
              <p className="mt-1 text-sm">
                <strong>Keyboard:</strong> Tab to pairs, Enter to flip.
              </p>
              <p className="mt-1 text-sm">
                <strong>Retry:</strong> anytime.
              </p>
            </li>
            <li className="rounded-xl border border-white/15 p-5">
              <Link href="/vocrehab/play/barrier-run" className="font-bold underline">
                Barrier Run
              </Link>
              <p className="mt-1 text-sm">
                <strong>Observes:</strong> situation navigation — a branching workday story
                (commute, shift swap, disclosure moment, tool failure). Every choice is valid.
                Untimed.
              </p>
              <p className="mt-1 text-sm">
                <strong>Keyboard:</strong> Tab to choices, Enter to take a path.
              </p>
              <p className="mt-1 text-sm">
                <strong>Retry:</strong> replay freely to try other paths.
              </p>
            </li>
            <li className="rounded-xl border border-white/15 p-5">
              <Link href="/vocrehab/play/schedule-juggle" className="font-bold underline">
                Schedule Juggle
              </Link>
              <p className="mt-1 text-sm">
                <strong>Observes:</strong> constraint planning — place 3 shifts and 1 training
                block on a 7-day grid around transport, medication, childcare, rest, and class
                constraints. Conflicts highlight with plain-language fixes, never red errors.
                Untimed.
              </p>
              <p className="mt-1 text-sm">
                <strong>Keyboard:</strong> Tab across the grid, Enter to place or move a block.
              </p>
              <p className="mt-1 text-sm">
                <strong>Retry:</strong> rearrange freely until the week fits.
              </p>
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">Pack-2: front-desk and shift games</h2>
          <p className="text-sm text-muted-foreground">
            Three newer games about courtesy, punctuality, and tool safety.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            <li className="rounded-xl border border-white/15 p-5">
              <Link href="/vocrehab/play/phone-greeting" className="font-bold underline">
                Front-Desk Hello
              </Link>
              <p className="mt-1 text-sm">
                <strong>Observes:</strong> phone courtesy plus listening and recall — greet 6
                callers warmly and remember one detail from each call. Untimed.
              </p>
              <p className="mt-1 text-sm">
                <strong>Keyboard:</strong> Tab to greeting options, Enter to answer.
              </p>
              <p className="mt-1 text-sm">
                <strong>Retry:</strong> anytime; tip: answer with your name and workplace first.
              </p>
            </li>
            <li className="rounded-xl border border-white/15 p-5">
              <Link href="/vocrehab/play/time-punch" className="font-bold underline">
                Shift Punch
              </Link>
              <p className="mt-1 text-sm">
                <strong>Observes:</strong> punctuality, time management, and recovery — punch 6
                shift tasks inside their time windows, including one late-bus surprise with a grace
                window. Timed at 3 minutes.
              </p>
              <p className="mt-1 text-sm">
                <strong>Keyboard:</strong> Tab to the punch button, Enter to punch.
              </p>
              <p className="mt-1 text-sm">
                <strong>Retry:</strong> anytime; using the grace window well is itself the skill.
              </p>
            </li>
            <li className="rounded-xl border border-white/15 p-5">
              <Link href="/vocrehab/play/tool-match" className="font-bold underline">
                Tool Crib
              </Link>
              <p className="mt-1 text-sm">
                <strong>Observes:</strong> task knowledge and safety awareness — match 8 jobs to the
                right tool and flag when safety gear is needed. When in doubt, flagging gear is
                always forgiven. Untimed.
              </p>
              <p className="mt-1 text-sm">
                <strong>Keyboard:</strong> Tab to tools and gear flags, Enter to pick.
              </p>
              <p className="mt-1 text-sm">
                <strong>Retry:</strong> anytime.
              </p>
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">New from our crew</h2>
          <p className="text-sm text-muted-foreground">
            Two additions built alongside this guide. Anything marked pending-merge is described
            here so you know what is coming, and will link to its play page once it lands.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            <li className="rounded-xl border border-white/15 p-5">
              <Link href="/vocrehab/play/energy-budget" className="font-bold underline">
                Energy Budget
              </Link>
              <p className="mt-1 text-sm">
                <strong>Observes:</strong> pacing and recovery planning — fit a Mon–Fri week
                inside 12 energy tokens with work shifts, appointments, and protected rest.
                Over-budget days get kind plain-language notes, never red errors. Untimed.
              </p>
              <p className="mt-1 text-sm">
                <strong>Keyboard:</strong> Tab across the week grid, Enter to place or remove
                a block.
              </p>
              <p className="mt-1 text-sm">
                <strong>Retry:</strong> anytime; practice round first, scored run after.
              </p>
            </li>
            <li className="rounded-xl border border-white/15 p-5">
              <p className="font-bold">
                Resume Rescue{" "}
                <span className="ml-1 rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 text-xs font-semibold text-amber-200">
                  pending-merge: play route
                </span>
              </p>
              <p className="mt-1 text-sm">
                <strong>Observes:</strong> attention to detail plus written communication — proofread
                10 resume lines, spot the error on each (typo, vague verb, or missing number), then
                pick the professional rewrite from 3 options. The game component is landed with the
                same intro, practice, countdown, run, and results phases as its siblings; its play
                route is still merging.
              </p>
              <p className="mt-1 text-sm">
                <strong>Keyboard:</strong> Tab to spot options and rewrites, Enter to choose;
                reduced-motion respected, results announced live.
              </p>
              <p className="mt-1 text-sm">
                <strong>Retry:</strong> anytime once the route lands, same as every game.
              </p>
            </li>
            <li className="rounded-xl border border-white/15 p-5">
              <p className="font-bold">
                Inbox Drill{" "}
                <span className="ml-1 rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 text-xs font-semibold text-amber-200">
                  pending-merge
                </span>
              </p>
              <p className="mt-1 text-sm">
                <strong>Observes:</strong> phishing judgment — a 12-scenario drill expanding Inbox
                Sprint, purely additive: the drill lives on its own page and never changes the
                original game. Its data lib and drill page are still merging.
              </p>
              <p className="mt-1 text-sm">
                <strong>Keyboard:</strong> same Tab plus Enter pattern as Inbox Sprint.
              </p>
              <p className="mt-1 text-sm">
                <strong>Retry:</strong> anytime once landed; flagging is always safe.
              </p>
            </li>
          </ul>
        </section>

        <p className="rounded-xl border border-white/15 p-4 text-sm">
          Working with a counselor? Runs save to your profile so you can spot supports together.
          Read <Link href="/docs/vocrehab/counselors" className="underline">the counselor guide</Link>{" "}
          and <Link href="/docs/vocrehab/privacy-safety" className="underline">privacy and safety</Link>.
        </p>
      </main>
    </article>
  );
}
