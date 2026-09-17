/**
 * VocRehab Work & Life Practice Games index (server component).
 *
 * Usage: route `app/vocrehab/play/page.tsx`. Lists all 11 practice games
 * with practice-first copy and the no-test promise. Links only — each game
 * lives on its own page so the frame, timer, and telemetry mount per game.
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Work & Life Practice Games — VocRehab",
  description:
    "Eleven low-stakes VocRehab practice games for focus, planning, workplace communication, and everyday work skills. Practice, not a test — nothing here grades you.",
  alternates: { canonical: "/vocrehab/play" },
};

const VOCREHAB_GAMES = [
  {
    href: "/vocrehab/play/file-sort",
    title: "File Sort",
    blurb: "Sort 12 files into 3 folders, steady through one manager message.",
    xp: 25,
    difficulty: "Easy",
    glyph: "🗂️",
  },
  {
    href: "/vocrehab/play/inbox-sprint",
    title: "Inbox Sprint",
    blurb: "Triage 8 mock messages, including one careful reply and one phishing check.",
    xp: 25,
    difficulty: "Medium",
    glyph: "📥",
  },
  {
    href: "/vocrehab/play/focus-shift",
    title: "Focus Shift",
    blurb: "Match 10 symbol pairs and refocus after a scripted interruption.",
    xp: 25,
    difficulty: "Medium",
    glyph: "🎯",
  },
  {
    href: "/vocrehab/play/barrier-run",
    title: "Barrier Run",
    blurb: "Walk four work situations — commute, swap, disclosure, tool failure — at your own pace.",
    xp: 25,
    difficulty: "Easy",
    glyph: "🧭",
  },
  {
    href: "/vocrehab/play/schedule-juggle",
    title: "Schedule Juggle",
    blurb: "Fit 3 shifts and 1 training block around 5 real-life constraints.",
    xp: 10,
    difficulty: "Easy",
    glyph: "🗓️",
  },
  {
    href: "/vocrehab/play/phone-greeting",
    title: "Front-Desk Hello",
    blurb: "Practice warm greetings and remembering details across six calls.",
    xp: 20,
    difficulty: "Easy",
    glyph: "☎️",
  },
  {
    href: "/vocrehab/play/time-punch",
    title: "Shift Punch",
    blurb: "Work through a shift by completing tasks inside their time windows.",
    xp: 20,
    difficulty: "Medium",
    glyph: "⏱️",
  },
  {
    href: "/vocrehab/play/tool-match",
    title: "Tool Crib",
    blurb: "Match everyday jobs with tools and consider when safety gear helps.",
    xp: 20,
    difficulty: "Easy",
    glyph: "🧰",
  },
  {
    href: "/vocrehab/play/paycheck-plan",
    title: "Paycheck Planner",
    blurb: "Explore a paycheck, everyday costs, and an unexpected expense.",
    xp: 20,
    difficulty: "Medium",
    glyph: "💵",
  },
  {
    href: "/vocrehab/play/energy-budget",
    title: "Energy Budget",
    blurb: "Plan work, appointments, and rest across a week at your own pace.",
    xp: 20,
    difficulty: "Easy",
    glyph: "🔋",
  },
  {
    href: "/vocrehab/play/resume-rescue",
    title: "Resume Rescue",
    blurb: "Spot rough resume lines and practice clearer, professional rewrites.",
    xp: 20,
    difficulty: "Medium",
    glyph: "📝",
  },
];

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-2 px-3 py-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
          <Link href="/vocrehab">VocRehab</Link> → Work & Life Practice Games
        </nav>
        <h1 className="text-base font-bold tracking-tight">Work & Life Practice Games</h1>
        <span className="ml-auto shrink-0 rounded-full border border-white/15 px-2 py-px text-[11px] font-bold text-muted-foreground">
          {VOCREHAB_GAMES.length} games
        </span>
      </div>
      <p className="max-w-3xl text-xs text-muted-foreground">
        Eleven short practice games for different parts of work and daily planning. Each game
        carries the same promise: <strong>practice, not a test — nothing here grades you.</strong>{" "}
        Guests can play everything; signing in only lets you save runs to your profile.
      </p>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {VOCREHAB_GAMES.map((game) => (
          <li key={game.href}>
            <Link
              href={game.href}
              className="group flex min-h-[168px] flex-col rounded-2xl border border-white/15 bg-gradient-to-br from-white/[.07] to-white/[.02] p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/50 hover:from-cyan-300/[.10] hover:to-white/[.03] hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-xl leading-none ring-1 ring-white/10">{game.glyph}</span>
                <span className="text-[15px] font-bold leading-tight">{game.title}</span>
                <span className="ml-auto shrink-0 rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                  {game.xp} XP
                </span>
              </span>
              <span className="mt-3 block text-sm leading-relaxed text-muted-foreground">{game.blurb}</span>
              <span className="mt-auto flex items-center justify-between pt-2">
                <span className="text-[11px] font-medium text-muted-foreground">
                  <span className="mr-1.5 inline-block size-1.5 rounded-full bg-emerald-400 align-middle" aria-hidden="true" />{game.difficulty} · Practice at your pace
                </span>
                <span className="text-[13px] font-semibold text-cyan-300 transition group-hover:text-cyan-200">Play game <span aria-hidden="true">→</span></span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
