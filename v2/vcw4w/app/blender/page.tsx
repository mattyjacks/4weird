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
          <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 text-xs font-bold text-amber-200">
            Pinned RTX 4090 · ~1.65 coins/min
          </span>
        </div>
        <ol className="mt-1 flex shrink-0 items-center gap-x-2 overflow-x-auto whitespace-nowrap text-xs text-slate-400">
          <li><b className="text-white">1 · Upload .blend</b> <span className="text-slate-600">→</span></li>
          <li><b className="text-white">2 · Set frames</b> <span className="text-slate-600">→</span></li>
          <li><b className="text-white">3 · Render MP4</b></li>
          <li className="ml-auto hidden sm:inline">
            .blend ≤ {BLENDER_MAX_SCENE_BYTES / 1_048_576} MB · ≤ {BLENDER_MAX_FRAMES} frames/job ·{" "}
            <a href={BLENDER_DEMO_FILES_URL} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">
              demo scenes
            </a>
            {" · "}
            <details className="group relative inline">
              <summary className="inline cursor-pointer list-none text-cyan-300 marker:hidden hover:underline">
                scene tips ⓘ
              </summary>
              <span className="absolute right-0 z-20 mt-1 block w-72 whitespace-normal rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs leading-relaxed text-slate-300 shadow-xl">
                Frames 1-60 at 24 fps is a 2.5-second clip. Cycles files render as authored; scenes above 4K pixels are refused with a clear message instead of a surprise bill. Classic starter: open Blender, keep the default cube, move it, press I → Location on frames 1 and 60, save the .blend.
              </span>
            </details>
          </li>
        </ol>

        <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
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
