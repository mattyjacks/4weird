import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { VideoNle } from "@/components/studio/video/video-nle";

export const metadata: Metadata = {
  alternates: { canonical: "/studio/video/editor" },
  title: "Media Mogul Video NLE (editor) | 4weird",
  description:
    "Disjoint-path NLE editor: asset library, audio-clock preview viewport, multi-track timeline with razor-split, and fail-open cloud-render export.",
};

export default function Page() {
  return (
    <div className="bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-5 sm:pt-20">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300 sm:text-sm">
          Media Mogul · Wave 3 · NLE editor
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
          Video NLE <span className="text-cyan-300">editor.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
          Library, preview, and timeline in one shell. The sibling{" "}
          <Link href="/studio/video" className="text-cyan-300 underline">
            /studio/video
          </Link>{" "}
          studio (R11) stays the canonical route — this editor path is the strictly-disjoint
          convergence build: zero shared files, same cloud-render endpoint.
        </p>
        <div className="mt-8">
          {/* Per-user NLE session: never cached. Static copy above streams in
              the shell; library/preview/timeline resolve at request time. */}
          <Suspense
            fallback={
              <p role="status" className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400">
                Loading the NLE editor…
              </p>
            }
          >
            <VideoNle />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
