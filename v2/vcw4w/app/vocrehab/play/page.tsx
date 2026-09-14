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
  },
  {
    href: "/vocrehab/play/inbox-sprint",
    title: "Inbox Sprint",
    blurb: "Triage 8 mock messages, including one careful reply and one phishing check.",
  },
  {
    href: "/vocrehab/play/focus-shift",
    title: "Focus Shift",
    blurb: "Match 10 symbol pairs and refocus after a scripted interruption.",
  },
  {
    href: "/vocrehab/play/barrier-run",
    title: "Barrier Run",
    blurb: "Walk four work situations — commute, swap, disclosure, tool failure — at your own pace.",
  },
  {
    href: "/vocrehab/play/schedule-juggle",
    title: "Schedule Juggle",
    blurb: "Fit 3 shifts and 1 training block around 5 real-life constraints.",
  },
];

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab">VocRehab</Link> → Practice arcade
      </nav>
      <h1 className="text-2xl font-bold">Practice arcade</h1>
      <p className="text-sm text-muted-foreground">
        Five short practice games. Every game starts with an untimed practice rep, and every game
        carries the same promise: <strong>practice, not a test — nothing here grades you.</strong>{" "}
        Guests can play everything; signing in only lets you save runs to your profile.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {VOCREHAB_GAMES.map((game) => (
          <li key={game.href}>
            <Link
              href={game.href}
              className="block rounded-xl border border-white/15 p-5 hover:bg-white/5"
            >
              <span className="font-bold">{game.title}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{game.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
