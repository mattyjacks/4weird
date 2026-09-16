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
      <section className="mx-auto w-full max-w-7xl px-3 py-3 sm:px-4">
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="shrink-0 text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
              DictatePic · Studio
            </p>
            <h1 className="truncate text-2xl font-black leading-tight tracking-tight">
              Layered raster <span className="text-cyan-300">drawing.</span>
            </h1>
          </div>
          <p className="shrink-0 rounded-full border border-white/10 bg-white/[.03] px-3 py-1 text-[11px] font-bold text-slate-300">
            2 layers · PNG export
          </p>
        </header>
        <p className="mt-1 max-w-3xl text-xs text-slate-400">
          Sketch on two layers with brush, eraser, and stamp shapes — undo,
          per-layer visibility, HiDPI-crisp strokes, and one-click PNG export.
          Everything stays on your device.
        </p>
        <div className="mt-2 min-w-0 lg:h-[calc(100vh-190px)] lg:min-h-[480px] lg:overflow-y-auto">
          <Suspense
            fallback={
              <p role="status" className="rounded-xl border border-white/10 bg-white/[.03] p-3.5 text-sm text-slate-400">
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
