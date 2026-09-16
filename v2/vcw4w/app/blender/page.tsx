import { cacheLife, cacheTag } from "next/cache";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BlenderStudio } from "@/components/blender/blender-studio";
import { BLENDER_DEMO_FILES_URL, BLENDER_MAX_FRAMES, BLENDER_MAX_SCENE_BYTES } from "@/lib/blender-render";

export const metadata: Metadata = {
  alternates: { canonical: "/blender" },
  title: "Blender GPU Renders (RTX 4090) | 4weird Games",
  description:
    "Upload a Blender .blend scene and get an mp4 back, rendered on a pinned RTX 4090 RunPod worker. No Blender install needed.",
};

export default async function BlenderPage() {
  "use cache";
  cacheLife("hours");
  cacheTag("studio");

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-slate-950 text-white">
      <section className="mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col px-3 py-2">
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link className="text-xs text-cyan-300 hover:underline" href="/desktop">
            ← Desktops
          </Link>
          <h1 className="text-lg font-black">Blender renders on a 4090</h1>
          <span
            aria-label="Render rate: pinned RTX 4090, about 1.65 coins per minute"
            className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 text-xs font-bold text-amber-200"
          >
            ⚡ RTX 4090 · ~1.65 coins/min
          </span>
        </div>

        <div
          aria-label="Render launcher"
          className="mt-2 flex h-12 shrink-0 items-center gap-2 overflow-x-auto whitespace-nowrap rounded-xl border border-cyan-300/25 bg-cyan-300/[.05] px-3 text-xs text-slate-300"
        >
          <span className="font-bold text-white">1 · Upload .blend</span>
          <span aria-hidden="true" className="text-slate-600">→</span>
          <span className="font-bold text-white">2 · Set frames</span>
          <span aria-hidden="true" className="text-slate-600">→</span>
          <span className="font-bold text-white">3 · Render MP4</span>
          <span className="ml-auto hidden text-slate-400 sm:inline">
            .blend ≤ {BLENDER_MAX_SCENE_BYTES / 1_048_576} MB · ≤ {BLENDER_MAX_FRAMES} frames/job · start below ↓
          </span>
        </div>

        <details className="group mt-2 shrink-0 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-slate-400">
          <summary className="cursor-pointer list-none font-bold text-slate-200 marker:hidden hover:underline">
            How it works · guide
          </summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Upload a .blend scene (≤ {BLENDER_MAX_SCENE_BYTES / 1_048_576} MB).</li>
            <li>Set the frame range (≤ {BLENDER_MAX_FRAMES} frames per job).</li>
            <li>Render the MP4 on the pinned worker; billing ends when the worker exits.</li>
          </ol>
          <p className="mt-2">
            <a href={BLENDER_DEMO_FILES_URL} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">
              demo scenes
            </a>
            {" · "}
            <details className="group/tips relative inline">
              <summary className="inline cursor-pointer list-none text-cyan-300 marker:hidden hover:underline">
                scene tips ⓘ
              </summary>
              <span className="absolute left-0 z-20 mt-1 block w-72 whitespace-normal rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs leading-relaxed text-slate-300 shadow-xl">
                Frames 1-60 at 24 fps is a 2.5-second clip. Cycles files render as authored; scenes above 4K pixels are refused with a clear message instead of a surprise bill. Classic starter: open Blender, keep the default cube, move it, press I → Location on frames 1 and 60, save the .blend.
              </span>
            </details>
          </p>
        </details>

        <div
          id="render-queue"
          role="region"
          aria-label="Render console and active renders queue"
          className="mt-2 min-h-0 flex-1 overflow-y-auto"
        >
          <Suspense
            fallback={
              <p role="status" className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400">
                Loading the render console…
              </p>
            }
          >
            <BlenderStudio />
          </Suspense>
        </div>

        <p className="mt-1 shrink-0 text-xs text-slate-500">
          Full Blender app in a browser?{" "}
          <Link href="/desktop" className="text-cyan-300 hover:underline">
            Rent a GPU desktop →
          </Link>
        </p>
      </section>
    </main>
  );
}
