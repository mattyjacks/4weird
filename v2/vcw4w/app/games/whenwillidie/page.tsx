import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, canonical, jsonLdScript } from "@/lib/seo";
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
  return (
    <div className="bg-slate-950 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              ["Games", "/games"],
              ["When Will I Die?", "/games/whenwillidie"],
            ]),
          ),
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
      </main>
    </div>
  );
}
