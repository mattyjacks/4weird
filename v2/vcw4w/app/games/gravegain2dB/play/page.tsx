import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PlayGate } from "@/components/games/play-gate";
import { RatingMatrix } from "@/components/games/rating-matrix";

export const metadata: Metadata = {
  title: "Play GraveGain2dB | 4weird Games",
  description:
    "Play GraveGain2dB: Breach MoonRock — breach the MoonRock crypts in a 2D grave-diving arcade run. Dodge cave-ins, loot lunar relics, escape before the breach seals.",
  robots: { index: false, follow: false },
};

// Same viewport contract as the canonical play shell
// (app/games/[slug]/play): the runtime lives inside an iframe, so the
// shell owns the viewport meta. resizes-visual keeps the mobile keyboard
// from shrinking the layout viewport and jumping the game frame.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-visual",
};

// NOTE: this static route takes precedence over app/games/[slug]/play for
// the gravegain2dB slug (static beats dynamic in Next.js routing). Keep this
// static route aligned with the shared paid/guest play gate and responsive
// runtime controls used by the dynamic arcade routes.
export default function GraveGain2dBPlayPage() {
  return (
    <div className="bg-black text-white" data-theme-lock="dark">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-4 sm:px-5">
        <nav
          aria-label="Game breadcrumb"
          className="flex flex-wrap items-center gap-2 text-sm"
        >
          <Link
            href="/games"
            className="font-semibold text-cyan-300 hover:underline"
          >
            ← All games
          </Link>
          <span aria-hidden="true" className="text-white/30">
            /
          </span>
          <span className="font-semibold text-white">GraveGain2dB</span>
        </nav>
        <h1 className="mt-3 text-2xl font-black sm:text-3xl">
          🌙 Play GraveGain2dB
        </h1>
        <div className="mt-3">
          <RatingMatrix rating="adults" compact />
        </div>
        <div className="mt-4" id="game-frame">
          <Suspense fallback={<p className="py-10 text-center text-sm text-white/60">Loading game player…</p>}>
            <PlayGate slug="gravegain2dB" title="GraveGain2dB: Breach MoonRock" src="/games/gravegain2dB/index.html" version="1" emoji="🌙" />
          </Suspense>
        </div>
        <p className="mt-3 text-sm text-white/60">
          Breach the MoonRock crypts — dodge cave-ins, loot lunar relics, and escape before the breach seals.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/games/gravegain2dB" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">Game details</Link>
          <Link href="/games" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">Browse all games</Link>
        </div>
      </div>
    </div>
  );
}
