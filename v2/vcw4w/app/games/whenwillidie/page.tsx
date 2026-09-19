import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, canonical, faqJsonLd, jsonLdScript } from "@/lib/seo";
import { GROUP_08_SPOTLIGHTS } from "@/content/game-spotlights/group-08";
import WhenWillIDieClient from "./whenwillidie-client";

export const metadata: Metadata = {
  title: "When Will I Die? - Novelty Death Predictor + Skeleton Filter",
  description:
    "For entertainment only: answer lifestyle questions for a novelty statistical death-date estimate (OpenAI-narrated when configured), then turn your photo into a skeleton on the same background — 100% on-device. Self-censor your PII.",
  keywords: ["when will i die", "death predictor", "novelty game", "skeleton filter", "free browser game", "play online"],
  alternates: { canonical: "/games/whenwillidie" },
  openGraph: {
    type: "article",
    title: "When Will I Die? | 4weird Games",
    description:
      "Novelty actuarial death-date game + on-device skeleton photo filter. Entertainment only — self-censor your PII.",
    url: "/games/whenwillidie",
  },
  twitter: {
    card: "summary",
    title: "When Will I Die? | 4weird Games",
    description: "Novelty death predictor + skeleton filter. Entertainment only.",
  },
};

// NOTE: static route (static beats the app/games/[slug] dynamic route).
// AI-free game shell: no iframe bundle, no catalog entry — the game is this
// page plus POST /api/games/whenwillidie/predict. Listed in app/sitemap.ts
// GAMES_EXTRA (verify-sitemap requires every static route to be listed).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-visual",
};

export default function WhenWillIDiePage() {
  const spotlight = GROUP_08_SPOTLIGHTS.find((entry) => entry.slug === "whenwillidie");
  return (
    <div className="bg-slate-950 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([
            breadcrumbJsonLd([
              ["Games", "/games"],
              ["When Will I Die?", "/games/whenwillidie"],
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
          💀 When Will I Die?
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-slate-300">
          A novelty mortality oracle: feed it lifestyle stats, get a statistical
          roast of your remaining years with a live countdown — then pose for
          your own skeleton portrait. Powered by real life-table math plus the
          OpenAI API for narration when the server key is configured.
        </p>
        <p className="mt-3 max-w-3xl rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-2 text-sm text-amber-100">
          ⚠️ <b>FOR ENTERTAINMENT ONLY</b> — not medical advice, not a real prediction.
          Self-censor your personally identifiable information: never enter your name,
          email, phone, or address. <span className="break-all">{canonical("/games/whenwillidie")}</span>
        </p>
        <div className="mt-6">
          <WhenWillIDieClient />
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/games"
            className="rounded-full border border-white/20 px-5 py-2.5 text-center text-sm font-semibold hover:bg-white/10"
          >
            Browse all games
          </Link>
          <span
            className="rounded-full border border-white/20 px-5 py-2.5 text-center text-sm font-semibold text-slate-400"
            title="POST-only JSON API"
          >
            API: POST /api/games/whenwillidie/predict
          </span>
        </div>
        {spotlight && (
          <section aria-label="About When Will I Die?" className="mt-8 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-6">
            <h2 className="text-lg font-bold sm:text-xl">About When Will I Die?</h2>
            {spotlight.about.map((paragraph, index) => (
              <p key={index} className="mt-3 text-sm leading-relaxed text-slate-300">
                {paragraph}
              </p>
            ))}
          </section>
        )}
        {spotlight && spotlight.faq.length > 0 && (
          <section aria-label="When Will I Die? questions" className="mt-8 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-6">
            <h2 className="text-lg font-bold sm:text-xl">When Will I Die?: questions, answered</h2>
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
