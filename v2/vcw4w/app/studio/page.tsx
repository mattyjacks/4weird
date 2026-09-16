import { cacheLife, cacheTag } from "next/cache";
import type { Metadata } from "next";
import { Suspense } from "react";
import { StudioHubClient } from "./studio-hub-client";

export const metadata: Metadata = {
  alternates: { canonical: "/studio" },
  title: "Studio | 4weird",
  description:
    "The 4weird studio hub: DictatePic canvas editor, Media Mogul video studio, paint app, AliveSpeech audio lab, and DemoRecorder — all on-device in your browser.",
};

export default async function Page() {
  "use cache";
  cacheLife("hours");
  cacheTag("studio");

  return (
    <div className="bg-slate-950 text-white">
      <section className="mx-auto max-w-7xl px-3 py-3 sm:px-4">
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="shrink-0 text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
              Studio · Wave 3
            </p>
            <h1 className="truncate text-2xl font-black tracking-tight sm:text-3xl">
              Make things <span className="text-cyan-300">here.</span>
            </h1>
          </div>
          <p className="shrink-0 rounded-full border border-white/10 bg-white/[.03] px-3 py-1 text-[11px] font-bold text-slate-300">
            5 studios · on-device
          </p>
        </header>
        <p className="mt-1 max-w-2xl truncate text-xs text-slate-400">
          Five small studios for drawing, video, and sound — nothing uploads unless you export it.
        </p>
        <div className="mt-2">
          <Suspense
            fallback={
              <p role="status" className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400">
                Loading the studio hub…
              </p>
            }
          >
            <StudioHubClient />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
