import type { Metadata } from "next";
import { games } from "@/content/games";
import { GameCatalog } from "@/components/games/game-catalog";
import { canonical, itemListJsonLd, jsonLdScript } from "@/lib/seo";

export const metadata: Metadata = {
  title: "All Games - 34 Free Browser Experiments",
  description:
    "Browse all 34 4weird browser games: arcade racers, typing survival, dungeon crawlers, finance sims, and neon classics. Free to try with guides, cloud saves, and coin-metered play that pays creators.",
  keywords: [
    "free browser games",
    "online arcade games",
    "typing survival game",
    "browser dungeon crawler",
    "arcade racer",
    "finance simulator game",
    "neon arcade games",
  ],
  alternates: { canonical: "/games" },
  openGraph: {
    title: "All Games - 34 Free Browser Experiments | 4weird Games",
    description:
      "Arcade racers, typing survival, dungeon crawlers, finance sims, and neon classics. Free to try; play pays creators.",
  },
};

export default function GamesPage() {
  return (
    <div className="bg-[#070912] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            itemListJsonLd(
              "All 4weird browser games",
              "Every playable 4weird browser game: free to try with guides, cloud saves, and coin-metered play that pays creators.",
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
