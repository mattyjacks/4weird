import { cacheLife, cacheTag } from "next/cache";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SongGrid } from "@/components/music/song-card";
import { FALLBACK_SONGS } from "@/lib/music-seeds";

export const metadata: Metadata = {
  alternates: { canonical: "/music" },
  title: "Music Library: Playable Synth Loops | 4weird",
  description:
    "The 4weird music library: tiny playable $music:1 synth loops from our games — preview them in your browser, no downloads needed.",
};

export default async function Page(): Promise<React.JSX.Element> {
  "use cache";
  cacheLife("hours");
  cacheTag("music");

  return (
    <div className="bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-5 sm:pt-20">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-fuchsia-300 sm:text-sm">
          4weird · Music
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
          Tiny songs, <span className="text-fuchsia-300">playable instantly.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
          Every loop is a few hundred bytes of $music:1 synth data rendered
          live in your browser — no audio files, no downloads. Hit play on
          anything below.
        </p>
        <div className="mt-8">
          <Suspense
            fallback={
              <p role="status" className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400">
                Tuning the instruments…
              </p>
            }
          >
            <SongGrid initial={[...FALLBACK_SONGS]} limit={6} />
          </Suspense>
        </div>
        <p className="mt-8">
          <Link
            href="/music/all"
            className="inline-block rounded-xl bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/20"
          >
            Browse the full library →
          </Link>
        </p>
      </section>
    </div>
  );
}
