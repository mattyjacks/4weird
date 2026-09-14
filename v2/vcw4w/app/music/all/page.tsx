import { cacheLife, cacheTag } from "next/cache";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SongGrid } from "@/components/music/song-card";
import { FALLBACK_SONGS } from "@/lib/music-seeds";
import { GalleryClient } from "./gallery-client";

export const metadata: Metadata = {
  alternates: { canonical: "/music/all" },
  title: "Full Music Library: Every Synth Loop | 4weird",
  description:
    "Every $music:1 synth loop in the 4weird library — game seed tracks, built-in loops, and songs saved on this device. Preview them all in your browser.",
};

export default async function Page(): Promise<React.JSX.Element> {
  "use cache";
  cacheLife("hours");
  cacheTag("music");

  return (
    <div className="bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-5 sm:pt-20">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-fuchsia-300 sm:text-sm">
          4weird · Music · All
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
          The full <span className="text-fuchsia-300">library.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
          Every seed track, every built-in loop, plus songs saved on this
          device. New game soundtracks land here as they are transcribed.
        </p>
        <div className="mt-8">
          <Suspense
            fallback={
              <p role="status" className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400">
                Tuning the instruments…
              </p>
            }
          >
            <SongGrid initial={[...FALLBACK_SONGS]} />
          </Suspense>
        </div>
        <div className="mt-8">
          <Suspense
            fallback={
              <p role="status" className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400">
                Loading your saved songs…
              </p>
            }
          >
            <GalleryClient />
          </Suspense>
        </div>
        <p className="mt-8">
          <Link
            href="/music"
            className="inline-block rounded-xl bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/20"
          >
            ← Back to featured
          </Link>
        </p>
      </section>
    </div>
  );
}
