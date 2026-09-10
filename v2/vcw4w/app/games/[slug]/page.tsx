import Link from "next/link";
import { notFound } from "next/navigation";
import { games, getGame } from "@/content/games";
import { getGameManifest } from "@/content/game-manifests";

export function generateStaticParams() {
  return games.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const g = getGame((await params).slug);
  return g ? { title: `${g.title} | 4weird`, description: g.description } : {};
}

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const g = getGame((await params).slug);
  if (!g) notFound();
  const m = getGameManifest(g.slug);
  const guide = ["demolichdom", "discoveramerica", "fridgesimulator", "serversavershield"].includes(g.slug)
    ? `/games/${g.slug}/guide.html`
    : null;
  return (
    <div className="bg-slate-950 text-white">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <Link href="/games" className="text-sm font-semibold text-cyan-300 hover:underline">
          ← All games
        </Link>
        <h1 className="mt-6 text-4xl font-black tracking-tight sm:mt-10 sm:text-5xl">
          {g.emoji} {g.title}
        </h1>
        <p className="mt-4 text-lg text-slate-300 sm:mt-5 sm:text-xl">{g.description}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href={`/games/${g.slug}/play`}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-cyan-300 px-7 py-3 font-bold text-slate-950 transition hover:bg-cyan-200 sm:mt-8"
          >
            Play game
          </Link>
          {guide && (
            <a
              href={guide}
              className="inline-flex items-center justify-center rounded-full border border-cyan-300/50 px-7 py-3 font-bold text-cyan-200 transition hover:bg-cyan-300/10 sm:mt-8"
            >
              Read guide
            </a>
          )}
        </div>
        <p className="mt-10 text-slate-400 sm:mt-12">
          A hand-crafted HTML5 experience. The original game runtime is preserved intact.
        </p>
        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:mt-10 sm:p-6">
          <h2 className="text-lg font-bold sm:text-xl">Runtime manifest</h2>
          <p className="mt-3 break-words text-sm text-slate-400">
            Source: {m.sourcePath} · Runtime: {m.runtimePath}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Storage: {m.storage.join(", ")} · Audio: preserved · Cleanup: {m.cleanup.join(", ")}
          </p>
        </section>
      </main>
    </div>
  );
}
