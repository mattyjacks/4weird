import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "GraveGain2dB: Breach MoonRock | 4weird Games",
  description:
    "GraveGain2dB: Breach MoonRock — breach the MoonRock crypts in a 2D grave-diving arcade run. Free to try in your browser.",
  keywords: [
    "GraveGain2dB",
    "Breach MoonRock",
    "RPG",
    "free browser game",
    "play online",
  ],
  alternates: { canonical: "/games/gravegain2dB" },
  openGraph: {
    type: "article",
    title: "GraveGain2dB: Breach MoonRock | 4weird Games",
    description:
      "GraveGain2dB: Breach MoonRock — breach the MoonRock crypts in a 2D grave-diving arcade run. Free to try in your browser.",
    url: "/games/gravegain2dB",
  },
  twitter: {
    card: "summary",
    title: "GraveGain2dB: Breach MoonRock | 4weird Games",
    description:
      "GraveGain2dB: Breach MoonRock — breach the MoonRock crypts in a 2D grave-diving arcade run. Free to try in your browser.",
  },
};

// NOTE: static route takes precedence over app/games/[slug] for the
// gravegain2dB slug (static beats dynamic in Next.js routing). The catalog
// entry (content/games.ts) is steward/A1-owned; this page hardcodes the
// title + description so the route resolves before catalog wiring lands.
export default function GraveGain2dBPage() {
  return (
    <div className="bg-slate-950 text-white">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <Link
          href="/games"
          className="text-sm font-semibold text-cyan-300 hover:underline"
        >
          ← All games
        </Link>
        <h1 className="mt-6 text-4xl font-black tracking-tight sm:mt-10 sm:text-5xl">
          🌙 GraveGain2dB: Breach MoonRock
        </h1>
        <p className="mt-4 text-lg text-slate-300 sm:mt-5 sm:text-xl">
          Breach the MoonRock crypts in a 2D grave-diving arcade run — dodge
          cave-ins, loot lunar relics, and escape before the breach seals.
          Free to try in your browser.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/games/gravegain2dB/play"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-cyan-300 px-7 py-3 font-bold text-slate-950 transition hover:bg-cyan-200 sm:mt-8"
          >
            Play game
          </Link>
        </div>
        <p className="mt-10 text-slate-400 sm:mt-12">
          A hand-crafted HTML5 experience. The original game runtime is
          preserved intact.
        </p>
      </main>
    </div>
  );
}
