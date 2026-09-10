import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { games, getGame } from "@/content/games";
import { GameRuntimeFrame } from "@/components/games/game-runtime-frame";

export function generateStaticParams() {
  return games.map((game) => ({ slug: game.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const game = getGame((await params).slug);
  if (!game) return {};
  return {
    title: `Play ${game.title} | 4weird Games`,
    description: `Play ${game.title}: ${game.description}`,
    robots: { index: false, follow: false },
  };
}

export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ match?: string }>;
}) {
  const game = getGame((await params).slug);
  if (!game) notFound();
  // Lobby joins land here as /games/<slug>/play?match=<uuid>. The runtime
  // iframe is same-origin, so the match id is forwarded into its query
  // string where the game's own matchmaking code reads it.
  const match = (await searchParams)?.match;
  const src = /^[0-9a-f-]{36}$/i.test(String(match ?? ""))
    ? `${game.runtimePath}?match=${encodeURIComponent(String(match))}`
    : game.runtimePath;
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
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-5">
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/15 bg-black">
          <div className="h-[70vh] min-h-[420px] sm:h-[75vh]">
            <GameRuntimeFrame slug={game.slug} title={game.title} src={src} />
          </div>
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
        </div>
      </div>
    </div>
  );
}
