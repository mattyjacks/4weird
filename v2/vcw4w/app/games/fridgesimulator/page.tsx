import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { breadcrumbJsonLd, canonical, faqJsonLd, jsonLdScript } from "@/lib/seo";
import { GROUP_08_SPOTLIGHTS } from "@/content/game-spotlights/group-08";
import { PlayExtras } from "./play-extras";

export const metadata: Metadata = {
  title: "Fridge Simulator - Play Free in Your Browser",
  description:
    "Manage fridges, balance nutrition, and keep families alive. Play Fridge Simulator free in your browser with guides, cloud saves, and mobile-friendly controls.",
  keywords: ["Fridge Simulator", "Simulation", "Strategy", "free browser game", "play online"],
  alternates: { canonical: "/games/fridgesimulator" },
  openGraph: {
    type: "article",
    title: "Fridge Simulator | 4weird Games",
    description:
      "Manage fridges, balance nutrition, and keep families alive — free to try in your browser with cloud saves.",
    url: "/games/fridgesimulator",
  },
  twitter: {
    card: "summary",
    title: "Fridge Simulator | 4weird Games",
    description: "Manage fridges, balance nutrition, and keep families alive — free to try in your browser.",
  },
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

// NOTE: this static route takes precedence over app/games/[slug] for the
// fridgesimulator slug (static beats dynamic in Next.js routing). It is a
// play-extras shell only — the game bundle itself
// (/games/html/fridgesimulator/) is untouched; nav/sitemap wiring for this
// route is requested via QUEUE (shared manifests are steward-owned).
export default function FridgeSimulatorPage() {
  const spotlight = GROUP_08_SPOTLIGHTS.find((entry) => entry.slug === "fridgesimulator");
  return (
    <div className="bg-slate-950 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([
            breadcrumbJsonLd([
              ["Games", "/games"],
              ["Fridge Simulator", "/games/fridgesimulator"],
            ]),
            ...(spotlight && spotlight.faq.length > 0
              ? [
                  faqJsonLd(
                    spotlight.faq.map((entry) => [entry.q, entry.a] as [string, string]),
                  ),
                ]
              : []),
          ]),
        }}
      />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <Link href="/games" className="text-sm font-semibold text-cyan-300 hover:underline">
          ← All games
        </Link>
        <h1 className="mt-6 text-4xl font-black tracking-tight sm:mt-8 sm:text-5xl">
          Fridge Simulator
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-slate-300">
          Manage fridges, balance nutrition, and keep families alive. The original HTML runtime plays
          below, wrapped with a save panel, the food-catalog tour, and mobile hints.
        </p>
        <p className="mt-3 text-sm text-slate-400">
          Canonical page: <span className="break-all">{canonical("/games/fridgesimulator")}</span>
        </p>
        <div className="mt-6">
          <Suspense
            fallback={<p className="py-10 text-center text-sm text-white/60">Loading game player…</p>}
          >
            <PlayExtras />
          </Suspense>
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/games"
            className="rounded-full border border-white/20 px-5 py-2.5 text-center text-sm font-semibold hover:bg-white/10"
          >
            Browse all games
          </Link>
          <a
            href="/games/html/fridgesimulator/guide.html"
            className="rounded-full border border-white/20 px-5 py-2.5 text-center text-sm font-semibold hover:bg-white/10"
          >
            Read the Fridge Simulator guide
          </a>
        </div>
        {spotlight && (
          <section aria-label="About Fridge Simulator" className="mt-8 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-6">
            <h2 className="text-lg font-bold sm:text-xl">About Fridge Simulator</h2>
            {spotlight.about.map((paragraph, index) => (
              <p key={index} className="mt-3 text-sm leading-relaxed text-slate-300">
                {paragraph}
              </p>
            ))}
          </section>
        )}
        {spotlight && spotlight.faq.length > 0 && (
          <section aria-label="Fridge Simulator questions" className="mt-8 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-6">
            <h2 className="text-lg font-bold sm:text-xl">Fridge Simulator: questions, answered</h2>
            <div className="mt-4 space-y-3">
              {spotlight.faq.map((entry) => (
                <details key={entry.q} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <summary className="cursor-pointer font-bold text-white">{entry.q}</summary>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{entry.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
