import type { Metadata, Viewport } from "next";

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
// the gravegain2dB slug (static beats dynamic in Next.js routing). It frames
// the v2 bundle (/games/gravegain2dB/index.html) directly — no new shared
// components — mirroring app/games/gravegain5d/play. Catalog/sitemap/nav
// wiring for this route is requested via QUEUE (shared manifests are
// steward-owned).
export default function GraveGain2dBPlayPage() {
  return (
    <div className="bg-black text-white" data-theme-lock="dark">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-4 sm:px-5">
        <nav
          aria-label="Game breadcrumb"
          className="flex flex-wrap items-center gap-2 text-sm"
        >
          <a
            href="/games"
            className="font-semibold text-cyan-300 hover:underline"
          >
            ← All games
          </a>
          <span aria-hidden="true" className="text-white/30">
            /
          </span>
          <span className="font-semibold text-white">GraveGain2dB</span>
        </nav>
        <h1 className="mt-3 text-2xl font-black sm:text-3xl">
          🌙 Play GraveGain2dB
        </h1>
        <div className="mt-4" id="game-frame">
          <iframe
            src="/games/gravegain2dB/index.html"
            title="GraveGain2dB — Breach MoonRock"
            className="aspect-[5/3] w-full rounded-xl border border-white/10 bg-black"
            allow="fullscreen; autoplay; gamepad"
            allowFullScreen
          />
        </div>
        <p className="mt-3 text-sm text-white/60">
          Breach the MoonRock crypts — dodge cave-ins, loot lunar relics, and
          escape before the breach seals.
        </p>
      </div>
    </div>
  );
}
