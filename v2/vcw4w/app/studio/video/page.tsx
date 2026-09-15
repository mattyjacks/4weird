import { cacheLife, cacheTag } from "next/cache";
import type { Metadata } from "next";
import { Suspense } from "react";
import { VideoStudio } from "@/components/studio/video-studio/video-studio";

export const metadata: Metadata = {
  alternates: { canonical: "/studio/video" },
  title: "Media Mogul Video Studio | 4weird",
  description:
    "Browser video-timeline studio: multi-track timeline with playhead drag, razor split, snap and zoom, live preview viewport, and RunPod render export.",
};

export default async function Page() {
  "use cache";
  cacheLife("hours");
  cacheTag("studio");

  return (
    <div className="flex h-dvh flex-col bg-slate-950 text-white">
      <header className="flex h-10 shrink-0 items-center gap-3 border-b border-white/10 px-3 sm:px-4">
        <p className="shrink-0 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">
          Media Mogul · Video
        </p>
        <h1 className="truncate text-sm font-bold text-white">
          Video timeline studio
        </h1>
        <p className="ml-auto hidden truncate text-xs text-slate-400 lg:block">
          4-track timeline · preview monitor · RunPod render export
        </p>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-3 py-3 sm:px-4">
          <Suspense
            fallback={
              <p role="status" className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400">
                Loading the video studio…
              </p>
            }
          >
            <VideoStudio />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
