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
      <section className="mx-auto max-w-7xl px-3 pb-4 pt-4 sm:px-4 sm:pt-6">
        <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
            Studio · Wave 3
          </p>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Make things <span className="text-cyan-300">here.</span>
          </h1>
        </header>
        <p className="mt-1 max-w-2xl text-xs text-slate-400 sm:text-sm">
          Five small studios for drawing, video, and sound — every tool runs
          on your device, nothing uploads unless you export it.
        </p>
        <div className="mt-3">
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
