import { games } from '@/content/games'; import { GameCatalog } from '@/components/games/game-catalog';
export const metadata={title:'Games | 4weird',description:'Play weird, wonderful browser games from 4weird.'};
export default function GamesPage(){return <main className="mx-auto min-h-screen max-w-6xl px-6 py-16"><p className="text-sm uppercase tracking-widest text-cyan-400">4weird arcade</p><h1 className="mt-3 text-5xl font-bold">Games</h1><GameCatalog games={games}/></main>}
