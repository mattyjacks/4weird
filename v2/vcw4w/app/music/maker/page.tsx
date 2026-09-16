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
    <div className="flex h-dvh flex-col bg-slate-950 text-white">
      <header className="flex h-10 shrink-0 items-center gap-3 border-b border-white/10 px-3 sm:px-4">
        <p className="shrink-0 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">
          Music Maker · Studio
        </p>
        <h1 className="truncate text-sm font-bold text-white">
          Sequence tiny songs, <span className="text-cyan-300">right here.</span>
        </h1>
        <p className="ml-auto hidden truncate text-xs text-slate-400 lg:block">
          16 steps per track · 8 instruments · tempo · WAV export
        </p>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* LAYOUT-ONLY (UXPASS p52): tightened cockpit padding so the 16-step sequencer in MakerShell starts above the fold. */}
        <div className="mx-auto max-w-6xl px-2 py-2 sm:px-3">
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
      </div>
    </div>
  );
}
