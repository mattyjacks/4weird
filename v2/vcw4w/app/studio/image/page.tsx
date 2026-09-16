import { cacheLife, cacheTag } from "next/cache";
import type { Metadata } from "next";
import { Suspense } from "react";
import { DictateImageEditor } from "@/components/studio/image/dictate-image-editor";

export const metadata: Metadata = {
  alternates: { canonical: "/studio/image" },
  title: "DictatePic Canvas Editor | 4weird",
  description:
    "GIMP-style layered canvas and sprite editor: multi-layer 512px viewport with checkerboard transparency, brush/pencil/eraser/bucket/picker tools, blend modes, bounded undo, PNG export, and spritesheet slicing. AI brushes fail open when offline.",
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
              DictatePic · Wave 3
            </p>
            <h1 className="truncate text-2xl font-black tracking-tight sm:text-3xl">
              Layered canvas <span className="text-cyan-300">studio.</span>
            </h1>
          </div>
          <p className="shrink-0 rounded-full border border-white/10 bg-white/[.03] px-3 py-1 text-[11px] font-bold text-slate-300">
            512 × 512 · layers · PNG export
          </p>
        </header>
        <p className="mt-1 max-w-2xl truncate text-xs text-slate-400">
          Paint GraveGain textures and NewGamePlus sprites on stacked layers —
          integer-pixel brushwork on a 512 × 512 document, checkerboard
          transparency, blend modes, 30-step undo, one-click PNG export, and a
          spritesheet slicer. AI brushes stay honest: offline means disabled,
          never broken.
        </p>
        <div className="mt-2 min-w-0">
          <Suspense
            fallback={
              <p role="status" className="rounded-xl border border-white/10 bg-white/[.03] p-3.5 text-sm text-slate-400">
                Loading the canvas editor…
              </p>
            }
          >
            <DictateImageEditor />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
