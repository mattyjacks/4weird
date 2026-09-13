import { cacheLife, cacheTag } from "next/cache";
import type { Metadata } from "next";
import { Suspense } from "react";
import { MakerShell } from "@/components/music/maker-shell";

export const metadata: Metadata = {
  alternates: { canonical: "/music/maker" },
  title: "Music Maker: Step Sequencer & SFX Lab | 4weird",
  description:
    "Music Maker: an on-device song suite — 16-step per-track sequencer, 8 instruments, BPM slider, live preview, browser saves, song JSON download, copy-to-clipboard, base64 ?song= share links, WAV export, and an SFX lab.",
};

export default async function Page() {
  "use cache";
  cacheLife("hours");
  cacheTag("music");

  return (
    <div className="bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-5 sm:pt-20">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300 sm:text-sm">
          Music Maker · Studio
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
          Sequence tiny songs, <span className="text-cyan-300">right here.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
          Sixteen steps per track, eight instruments, one tempo slider — plus
          an SFX lab for rayguns and explosions. Everything runs on your
          device: save to this browser, copy or download the song JSON, share
          a link, or export a WAV.
        </p>
        <div className="mt-8">
          <Suspense
            fallback={
              <p role="status" className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400">
                Loading the music maker…
              </p>
            }
          >
            <MakerShell />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
