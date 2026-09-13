import { cacheLife, cacheTag } from "next/cache";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PaintStudio } from "@/components/studio/paint-studio";

export const metadata: Metadata = {
  alternates: { canonical: "/studio/paint" },
  title: "DictatePic: Layered Raster Drawing & AI Inpaint | 4weird",
  description:
    "DictatePic paint studio: layered raster drawing with brush, eraser, stamp shapes, 2-layer stack, 20+ step undo, HiDPI canvas, and PNG export — all on-device in your browser.",
};

export default async function Page() {
  "use cache";
  cacheLife("hours");
  cacheTag("studio");

  return (
    <div className="bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-5 sm:pt-20">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300 sm:text-sm">
          DictatePic · Studio
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
          Layered raster <span className="text-cyan-300">drawing.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
          Sketch on two layers with brush, eraser, and stamp shapes — undo,
          per-layer visibility, HiDPI-crisp strokes, and one-click PNG export.
          Everything stays on your device.
        </p>
        <div className="mt-8">
          <Suspense
            fallback={
              <p role="status" className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400">
                Loading the paint studio…
              </p>
            }
          >
            <PaintStudio />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
