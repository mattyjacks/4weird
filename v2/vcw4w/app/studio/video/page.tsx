import type { Metadata } from "next";
import { VideoStudio } from "@/components/studio/video-studio/video-studio";

export const metadata: Metadata = {
  alternates: { canonical: "/studio/video" },
  title: "Media Mogul Video Studio | 4weird",
  description:
    "Browser video-timeline studio: multi-track timeline with playhead drag, razor split, snap and zoom, live preview viewport, and RunPod render export.",
};

export default function Page() {
  return (
    <div className="bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-5 sm:pt-20">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300 sm:text-sm">
          Media Mogul · Wave 3
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
          Video timeline <span className="text-cyan-300">studio.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
          Gameplay clips, Blender renders, fal.ai generations, music, and
          voiceover on four tracks. Drag the playhead, razor-split clips, snap
          to the grid, zoom the timeline, preview on an audio-clock canvas —
          then package it for a RunPod render worker.
        </p>
        <div className="mt-8">
          <VideoStudio />
        </div>
      </section>
    </div>
  );
}
