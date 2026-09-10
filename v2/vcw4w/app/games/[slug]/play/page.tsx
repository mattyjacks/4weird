import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { games, getGame } from "@/content/games";
import { GameRuntimeFrame } from "@/components/games/game-runtime-frame";

export function generateStaticParams() { return games.map((game) => ({ slug: game.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const game = getGame((await params).slug);
  if (!game) return {};
  return { title: `Play ${game.title} | 4weird Games`, description: `Play ${game.title}: ${game.description}`, robots: { index: false, follow: false } };
}

export default async function PlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const game = getGame((await params).slug);
  if (!game) notFound();
  return <main className="h-[100dvh] overflow-hidden bg-black"><div className="flex h-11 items-center justify-between gap-3 overflow-hidden border-b border-white/10 px-3 text-sm text-white"><a href={`/games/${game.slug}`} className="shrink-0 font-semibold">← {game.title}</a><span className="hidden truncate text-xs text-white/60 sm:inline">Touch-ready runtime · rotate for the best view</span></div><div className="h-[calc(100dvh-44px)]"><GameRuntimeFrame slug={game.slug} title={game.title} src={game.runtimePath} /></div></main>;
}
