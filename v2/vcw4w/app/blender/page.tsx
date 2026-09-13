import type { Metadata } from "next";
import Link from "next/link";
import { BlenderStudio } from "@/components/blender/blender-studio";
import { BLENDER_DEMO_FILES_URL, BLENDER_MAX_FRAMES, BLENDER_MAX_SCENE_BYTES } from "@/lib/blender-render";

export const metadata: Metadata = {
  alternates: { canonical: "/blender" },
  title: "Blender GPU Renders (RTX 4090) | 4weird Games",
  description:
    "Upload a Blender .blend scene and get an mp4 back, rendered on a pinned RTX 4090 RunPod worker. No Blender install needed.",
};

export default function BlenderPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-4xl px-5 py-14">
        <Link className="text-cyan-300 hover:underline" href="/desktop">
          ← Virtual desktops
        </Link>
        <p className="mt-4 text-xs font-bold tracking-widest text-cyan-300">🌐 RENT TECH / BLENDER RENDER FARM</p>
        <h1 className="mt-2 text-4xl font-black">Render Blender on a 4090, from your browser</h1>
        <p className="mt-4 text-slate-300">
          Blender is the free, open-source 3D suite (blender.org): you build a scene - models, materials, lights,
          camera - and animate it on a timeline of <b className="text-white">frames</b> (24 or 30 per second).
          {" "}<b className="text-white">Rendering</b> computes every frame into images; we then encode them into an
          H.264 <b className="text-white">mp4</b> you can watch anywhere. The heavy part runs here, on a pinned
          RTX 4090 cloud GPU with Blender&apos;s Cycles ray-tracer on OptiX. You never install Blender.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="font-bold">1 · Bring a scene</h2>
            <p className="mt-2 text-sm text-slate-400">
              A <code>.blend</code> file up to {BLENDER_MAX_SCENE_BYTES / 1_048_576} MB. Don&apos;t have one? Grab a
              free demo scene -{" "}
              <a href={BLENDER_DEMO_FILES_URL} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">
                blender.org demo files
              </a>{" "}
              - or make the classic in 2 minutes: open Blender, keep the default cube, move it, press{" "}
              <kbd className="rounded bg-black/50 px-1">I</kbd> → Location on frames 1 and 60, save the .blend.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="font-bold">2 · Pick frames</h2>
            <p className="mt-2 text-sm text-slate-400">
              Frames 1-60 at 24 fps is a 2.5-second clip. One job covers up to {BLENDER_MAX_FRAMES} frames; longer
              animations go in several jobs. Cycles files render as authored; scenes above 4K pixels are refused
              with a clear message instead of a surprise bill.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="font-bold">3 · Get the mp4</h2>
            <p className="mt-2 text-sm text-slate-400">
              The worker uploads your mp4 to your storage and exits itself - billing ends with no clicks. If the
              upload ever fails, the file stays served from the worker until you download it and stop the pod.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <BlenderStudio />
        </div>

        <p className="mt-6 text-sm text-slate-400">
          Want the full Blender app in a browser instead?{" "}
          <Link href="/desktop" className="text-cyan-300 hover:underline">
            Rent a GPU graphical desktop →
          </Link>
        </p>
      </section>
    </main>
  );
}
