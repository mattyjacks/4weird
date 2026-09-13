import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ServerBrowser } from "@/components/games/server-browser";
import { breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Find a Multiplayer Room - 4weird Game Servers",
  description:
    "Browse live 4weird multiplayer rooms by game dimension, age band, and population, with a live per-minute coin quote and free-play badges on host-covered rooms.",
  keywords: ["multiplayer rooms", "game servers", "free play", "browser MMO rooms", "join server"],
  alternates: { canonical: "/games/servers" },
  openGraph: {
    title: "Find a Multiplayer Room | 4weird Servers",
    description:
      "Live rooms by dimension, age band, and population — live coin/min quotes, free-play badges, one-click join.",
    url: "/games/servers",
  },
};

export default function ServersPage() {
  return (
    <div className="bg-[#070912] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              ["Games", "/games"],
              ["Servers", "/games/servers"],
            ]),
          ),
        }}
      />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <Link href="/games" className="text-sm font-semibold text-cyan-300 hover:underline">
          ← All games
        </Link>
        <h1 className="mt-6 text-4xl font-black tracking-tight sm:mt-10 sm:text-5xl">
          Game servers
        </h1>
        <p className="mt-4 text-lg text-slate-300 sm:mt-5 sm:text-xl">
          Live multiplayer rooms with per-minute coin quotes. Host-covered rooms carry a free-play
          badge — guests play free while the host meter runs.
        </p>
        <div className="mt-6">
          <Link
            href="/games/servers/rent"
            className="inline-flex items-center justify-center rounded-full bg-cyan-300 px-7 py-3 font-bold text-slate-950 transition hover:bg-cyan-200"
          >
            Rent your own room
          </Link>
        </div>
        <div className="mt-10">
          <Suspense fallback={<p className="text-sm text-slate-400">Loading servers…</p>}>
            <ServerBrowser />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
