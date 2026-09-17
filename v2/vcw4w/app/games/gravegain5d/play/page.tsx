import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { RatingMatrix } from "@/components/games/rating-matrix";

export const metadata: Metadata = {
  title: "Play GraveGain5DA | 4weird Games",
    description:
      "Play GraveGain5DA: turn-based multiverse dungeon combat across six parallel Arroyos — strike haunts, chain hops, vent paradox, beat the collapse timers.",
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
// the gravegain5d slug (static beats dynamic in Next.js routing). It frames
// the v2 bundle (/games/gravegain5dA/index.html) directly — no new shared
// components — mirroring app/games/gravegain4d/play. Catalog/sitemap/nav
// wiring for this route is requested via QUEUE (shared manifests are
// steward-owned).
export default function GraveGain5DAPlayPage() {
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
          <span className="font-semibold text-white">GraveGain5DA</span>
        </nav>
        <h1 className="mt-3 text-2xl font-black sm:text-3xl">
          🌀 Play GraveGain5DA
        </h1>
        <div className="mt-3">
          <RatingMatrix rating="teens" compact />
        </div>
        <div id="game-frame" className="perf-frame play-frame-height play-frame-ar mt-4 overflow-hidden rounded-2xl border border-white/15 bg-black">
          <iframe
            src="/games/gravegain5dA/index.html"
            title="GraveGain5DA — Multiverse Transcendence"
            className="h-full w-full border-0 bg-black"
            allow="fullscreen; autoplay; gamepad"
            allowFullScreen
          />
        </div>
        <p className="mt-3 text-sm text-white/60">
          Turn-based combat across 6 universes — hop with U, strike with Space, vent
          paradox before hot universes collapse.
        </p>
      </div>
    </div>
  );
}
