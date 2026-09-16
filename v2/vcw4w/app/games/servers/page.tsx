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

/**
 * In-table skeleton shown while ServerBrowser resolves (uxpass p35).
 * Mirrors the spec table columns (status|name|dimension|region|players|ping|connect)
 * so the shell never collapses into the footer on slow loads.
 */
function ServersTableSkeleton() {
  const cols = ["Status", "Server", "Dim", "Region", "Players", "Ping", "Connect"];
  return (
    <div
      role="status"
      aria-label="Loading game servers"
      className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[.03]"
    >
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-white/10 bg-[#070912] text-[11px] uppercase tracking-wider text-slate-400">
            {cols.map((col) => (
              <th key={col} scope="col" className="px-2 py-1 font-semibold">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody aria-hidden="true">
          {[0, 1, 2, 3].map((row) => (
            <tr key={row} className="animate-pulse border-b border-white/5">
              {cols.map((col) => (
                <td key={col} className="px-2 py-1.5">
                  <span className="block h-3 w-3/4 rounded bg-white/10" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-3 py-2 text-[11px] text-slate-500">
        Loading live rooms… if everything is full, you can spin up an on-demand node from
        the rent page.
      </p>
    </div>
  );
}

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
      <main className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/games" className="shrink-0 text-xs font-semibold text-cyan-300 hover:underline">
            ← All games
          </Link>
          <h1 className="truncate text-sm font-black tracking-tight">
            Game servers
          </h1>
          <p className="hidden truncate text-[11px] text-slate-400 md:block">
            Live rooms with coins/min quotes — host-covered rooms are free-play.
          </p>
          <Link
            href="/games/servers/rent"
            className="ml-auto shrink-0 rounded-full bg-cyan-300 px-4 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-200"
          >
            Rent your own room
          </Link>
        </div>
        <div className="mt-2">
          <Suspense fallback={<ServersTableSkeleton />}>
            <ServerBrowser />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
