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
  return <main className="min-h-screen bg-black"><div className="flex items-center justify-between px-4 py-3 text-white"><a href={`/games/${game.slug}`}>← {game.title}</a><span className="text-xs text-white/60">Original HTML runtime</span></div><div className="h-[calc(100vh-52px)]"><GameRuntimeFrame slug={game.slug} title={game.title} src={game.runtimePath} /></div></main>;
}
