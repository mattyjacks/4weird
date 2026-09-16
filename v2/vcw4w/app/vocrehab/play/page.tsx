/**
 * VocRehab practice arcade index (server component).
 *
 * Usage: route `app/vocrehab/play/page.tsx`. Lists the five micro-games
 * with practice-first copy and the no-test promise. Links only — each game
 * lives on its own page so the frame, timer, and telemetry mount per game.
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Practice Arcade — VocRehab",
  description:
    "Five low-stakes VocRehab practice games: sorting, inbox triage, refocus, situations, and scheduling. Practice, not a test — nothing here grades you.",
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
];

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-2 px-3 py-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
          <Link href="/vocrehab">VocRehab</Link> → Practice arcade
        </nav>
        <h1 className="text-base font-bold tracking-tight">Practice arcade</h1>
        <span className="ml-auto shrink-0 rounded-full border border-white/15 px-2 py-px text-[11px] font-bold text-muted-foreground">
          5 drills
        </span>
      </div>
      <p className="max-w-3xl text-xs text-muted-foreground">
        Five short practice games. Every game starts with an untimed practice rep, and every game
        carries the same promise: <strong>practice, not a test — nothing here grades you.</strong>{" "}
        Guests can play everything; signing in only lets you save runs to your profile.
      </p>
      <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
        {VOCREHAB_GAMES.map((game) => (
          <li key={game.href}>
            <Link
              href={game.href}
              className="flex h-[180px] flex-col rounded-xl border border-white/15 p-3 hover:bg-white/5"
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="text-lg leading-none">{game.glyph}</span>
                <span className="text-[15px] font-bold">{game.title}</span>
                <span className="ml-auto shrink-0 rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                  {game.xp} XP
                </span>
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">{game.blurb}</span>
              <span className="mt-auto flex items-center justify-between pt-2">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Difficulty: {game.difficulty}
                </span>
                <span className="text-[13px] font-semibold text-cyan-600">Play Drill →</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
