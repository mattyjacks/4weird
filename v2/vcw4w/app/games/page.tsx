import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { GameCatalog } from "@/components/games/game-catalog";
import { canonical, itemListJsonLd, jsonLdScript } from "@/lib/seo";
import { getCachedGames } from "@/lib/games-catalog";

export const metadata: Metadata = {
  title: "Find Your Next Weird World - All 36 Games, Free to Try",
  description:
    "Find your next weird world: all 36 4weird browser games. Gamers get arcade racers, typing survival, and dungeon crawlers; business minds get cap-table, finance, and pipeline sims; coders can ship their own via NewGamePlus. Free to try with guides, cloud saves, and coin-metered play that pays creators.",
  keywords: [
    "free browser games",
    "online arcade games",
    "typing survival game",
    "browser dungeon crawler",
    "arcade racer",
    "finance simulator game",
    "cap table simulator",
    "business simulation game",
    "sales pipeline game",
    "build browser game from prompt",
    "neon arcade games",
  ],
  alternates: { canonical: "/games" },
  openGraph: {
    title: "Find Your Next Weird World - 36 Free Browser Games | 4weird",
    description:
      "Racers, RPGs, typing survival, plus business sims that teach real money skills. Free to try, playing takes seconds; play pays creators.",
    images: [
      {
        url: "/og/og-games.jpg",
        width: 1200,
        height: 630,
        alt: "4weird Games Arcade - 35 Free Browser Games",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
      title: "Find Your Next Weird World - 36 Free Browser Games | 4weird",
    description:
      "Racers, RPGs, typing survival, plus business sims that teach real money skills. Free to try, playing takes seconds; play pays creators.",
    images: ["/og/og-games.jpg"],
  },
};

export default async function GamesPage() {
  "use cache";
  cacheLife("hours");
  cacheTag("games");
  // Cached catalog read (lib/games-catalog.ts): the GameCatalog client UI
  // hydrates on top; its per-visitor filtering (Kids Mode, search) runs
  // client-side and is unaffected by this server cache.
  const games = await getCachedGames();
  return (
    <div id="top" className="bg-[#070912] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            itemListJsonLd(
              `Find your next weird world: all ${games.length} 4weird browser games`,
              "Every playable 4weird browser game — racers, RPGs, typing survival, and business sims: free to try with guides, cloud saves, and coin-metered play that pays creators.",
              games.map((g) => ({
                name: `${g.title} (${g.genre})`,
                url: canonical(`/games/${g.slug}`),
              })),
            ),
          ),
        }}
      />
      {/* Compact sticky arcade command bar (44px): title + count + actions stay visible */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-[#070912]/90 backdrop-blur">
        <div className="mx-auto flex h-11 max-w-6xl items-center gap-1.5 overflow-x-auto px-3 sm:px-4">
          <h1 className="shrink-0 text-sm font-black tracking-tight">Arcade</h1>
          <span className="shrink-0 rounded-full border border-fuchsia-400/40 px-1.5 py-0.5 font-mono text-[10px] font-bold text-fuchsia-200">{games.length} games</span>
          <span className="hidden shrink-0 rounded-full border border-emerald-400/40 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-200 sm:inline">free to try</span>
          <span className="flex-1" />
          <a href="#catalog" className="shrink-0 whitespace-nowrap rounded-full border border-white/20 px-2.5 py-1 text-[11px] font-bold hover:bg-white/10">Browse catalog</a>
          <a href="/newgameplus" className="shrink-0 whitespace-nowrap rounded-full bg-fuchsia-500 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-fuchsia-400">Ship your own</a>
        </div>
      </div>
      <div id="catalog" className="mx-auto max-w-6xl scroll-mt-[88px] px-3 py-2 sm:px-4">
        {/* Sticky 40px section shortcut bar (docked under 44px command bar):
          anchor shortcuts only, no logic. scroll-mt-88px = 44px bar + 40px
          docked nav + 4px breathing room, so #catalog lands just below the
          stacked sticky chrome and the catalog starts above the fold.
          Filter/search + dense grid + staff-picks ribbon live in
          <GameCatalog/> (component-owned, QUEUE handoff in DS-UXPASS2-02). */}
      <nav aria-label="Arcade sections" className="sticky top-11 z-10 border-b border-white/10 bg-[#070912]/90 backdrop-blur">
        <div className="mx-auto flex h-10 max-w-6xl items-center gap-1.5 overflow-x-auto px-1 py-0.5">
          <span className="shrink-0 text-xs font-black tracking-tight">
            Arcade
          </span>
          <span className="shrink-0 rounded-full border border-white/15 px-1.5 py-0.5 font-mono text-[10px] text-white/70">
            {games.length} games · free to try
          </span>
          <a href="#recommended" className="shrink-0 whitespace-nowrap rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-white/80 transition hover:bg-white/10">
            Staff picks ↓
          </a>
          <a href="#top" className="shrink-0 whitespace-nowrap rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-white/80 transition hover:bg-white/10">
            Back to top ↑
          </a>
        </div>
      </nav>
      <GameCatalog games={games} />
      </div>
    </div>
  );
}
