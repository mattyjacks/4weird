import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { GameCatalog } from "@/components/games/game-catalog";
import { canonical, itemListJsonLd, jsonLdScript } from "@/lib/seo";
import { getCachedGames } from "@/lib/games-catalog";

export const metadata: Metadata = {
  title: "Find Your Next Weird World - All 34 Games, Free to Try",
  description:
    "Find your next weird world: all 34 4weird browser games. Gamers get arcade racers, typing survival, and dungeon crawlers; business minds get cap-table, finance, and pipeline sims; coders can ship their own via NewGamePlus. Free to try with guides, cloud saves, and coin-metered play that pays creators.",
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
    title: "Find Your Next Weird World - 34 Free Browser Games | 4weird",
    description:
      "Racers, RPGs, typing survival, plus business sims that teach real money skills. Free to try, playing takes seconds; play pays creators.",
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
    <div className="bg-[#070912] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            itemListJsonLd(
              "Find your next weird world: all 34 4weird browser games",
              "Every playable 4weird browser game — racers, RPGs, typing survival, and business sims: free to try with guides, cloud saves, and coin-metered play that pays creators.",
              games.map((g) => ({
                name: `${g.title} (${g.genre})`,
                url: canonical(`/games/${g.slug}`),
              })),
            ),
          ),
        }}
      />
      <GameCatalog games={games} />
    </div>
  );
}
