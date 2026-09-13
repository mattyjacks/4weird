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
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-5 sm:pt-20">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300 sm:text-sm">
          Studio · Wave 3
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
          Make things <span className="text-cyan-300">here.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
          Five small studios for drawing, video, and sound — every tool runs
          on your device, nothing uploads unless you export it.
        </p>
        <div className="mt-8">
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
