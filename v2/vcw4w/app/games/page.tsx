import { games } from "@/content/games";
import { GameCatalog } from "@/components/games/game-catalog";

export const metadata = {
  title: "Games | 4weird",
  description: "Play weird, wonderful browser games from 4weird.",
};

export default function GamesPage() {
  return (
    <div className="bg-[#070912] text-white">
      <GameCatalog games={games} />
    </div>
  );
}
