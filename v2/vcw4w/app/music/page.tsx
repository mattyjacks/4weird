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

function noteCount(song: (typeof FALLBACK_SONGS)[number]): number {
  try {
    return song.tracks.reduce((sum, t) => sum + t.notes.length, 0);
  } catch {
    return 0;
  }
}

export default async function Page(): Promise<React.JSX.Element> {
  "use cache";
  cacheLife("hours");
  cacheTag("music");

  const songs = [...FALLBACK_SONGS];

  return (
    <div className="flex h-dvh flex-col bg-slate-950 text-white">
      <header className="flex h-10 shrink-0 items-center gap-3 border-b border-white/10 px-3 sm:px-4">
        <p className="shrink-0 text-[11px] font-bold uppercase tracking-[0.2em] text-fuchsia-300">
          4weird · Music
        </p>
        <h1 className="truncate text-sm font-bold text-white">
          Tiny songs, <span className="text-fuchsia-300">playable instantly.</span>
        </h1>
        <p className="ml-auto hidden shrink-0 text-xs text-slate-400 sm:block">
          {songs.length} seed loops · live browser render
        </p>
        <nav className="flex shrink-0 items-center gap-2" aria-label="Music sections">
          <Link
            href="/music/all"
            className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-white/20"
          >
            Full library
          </Link>
          <Link
            href="/music/maker"
            className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-white/20"
          >
            Maker
          </Link>
        </nav>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-3 py-3 sm:px-4">
          <table className="w-full border-collapse text-sm">
            <caption className="pb-2 text-left text-xs text-slate-400">
              Seed loop index — every loop below is playable in your browser, no downloads needed.
            </caption>
            <thead className="sticky top-0 z-10 bg-slate-950">
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th scope="col" className="w-8 px-2 py-1 font-semibold">#</th>
                <th scope="col" className="px-2 py-1 font-semibold">Track title</th>
                <th scope="col" className="hidden px-2 py-1 font-semibold sm:table-cell">Instruments</th>
                <th scope="col" className="w-20 px-2 py-1 font-semibold">BPM</th>
                <th scope="col" className="hidden w-16 px-2 py-1 text-right font-semibold md:table-cell">Notes</th>
              </tr>
            </thead>
            <tbody>
              {songs.map((song, i) => (
                <tr key={song.title} className="h-9 border-t border-white/5 hover:bg-white/[.03]">
                  <td className="px-2 py-1 text-xs text-slate-500">{i + 1}</td>
                  <td className="truncate px-2 py-1 font-semibold text-white">{song.title}</td>
                  <td className="hidden truncate px-2 py-1 text-xs text-slate-400 sm:table-cell">
                    {song.tracks.map((t) => t.inst).join(" · ")}
                  </td>
                  <td className="px-2 py-1">
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                      {song.BPM} BPM
                    </span>
                  </td>
                  <td className="hidden px-2 py-1 text-right text-xs text-slate-400 md:table-cell">
                    {noteCount(song)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3">
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
        </div>
      </div>
    </div>
  );
}
