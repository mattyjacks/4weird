import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { games, getGame } from "@/content/games";
import { PlayGate } from "@/components/games/play-gate";
import { PlayRateBadge } from "@/components/games/play-rate-badge";
import { GameAiBadge } from "@/components/games/game-ai-badge";
import { GamingBuddy } from "@/components/buddy/gaming-buddy";

export function generateStaticParams() {
  return games.map((game) => ({ slug: game.slug }));
}

// Closed catalog (see ../page.tsx): unknown slugs 404 with a real 404 status.
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const game = getGame((await params).slug);
  if (!game) return {};
  return {
    title: `Play ${game.title} | 4weird Games`,
    description: `Play ${game.title}: ${game.description}`,
    robots: { index: false, follow: false },
  };
}

export default async function PlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const game = getGame((await params).slug);
  if (!game) notFound();
  // NOTE: the page stays static (no searchParams read) so the closed catalog
  // above 404s unknown slugs with a real 404 status. Lobby joins land here
  // as /games/<slug>/play?match=<uuid>; PlayGate forwards the match id into
  // the runtime iframe's query string client-side, where the game's own
  // matchmaking code reads it. The runtime iframe is same-origin.
  const src = game.runtimePath;
  return (
    <div className="bg-black text-white">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-5">
        <nav aria-label="Game breadcrumb" className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="/games" className="font-semibold text-cyan-300 hover:underline">
            ← All games
          </Link>
          <span aria-hidden="true" className="text-white/30">
            /
          </span>
          <Link href={`/games/${game.slug}`} className="font-semibold text-white hover:underline">
            {game.title}
          </Link>
          <span className="ml-auto hidden text-xs text-white/60 sm:inline">
            Touch-ready runtime · rotate for the best view
          </span>
        </nav>
        <h1 className="mt-3 text-2xl font-black sm:text-3xl">
          {game.emoji} Play {game.title}
        </h1>
        <PlayRateBadge slug={game.slug} />
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-5">
        <div className="mt-4">
          <PlayGate slug={game.slug} title={game.title} src={src} />
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/games/${game.slug}`}
            className="rounded-full border border-white/20 px-5 py-2.5 text-center text-sm font-semibold hover:bg-white/10"
          >
            ← Back to {game.title} details
          </Link>
          <Link
            href="/games"
            className="rounded-full border border-white/20 px-5 py-2.5 text-center text-sm font-semibold hover:bg-white/10"
          >
            Browse all games
          </Link>
          <Link
            href="/my/usage/"
            className="rounded-full border border-white/20 px-5 py-2.5 text-center text-sm font-semibold hover:bg-white/10"
          >
            My usage
          </Link>
        </div>
        <GameAiBadge slug={game.slug} />
        <GamingBuddy gameSlug={game.slug} gameTitle={game.title} />
      </div>
    </div>
  );
}
