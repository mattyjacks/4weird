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
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-5 sm:pt-20">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300 sm:text-sm">
          DictatePic · Wave 3
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
          Layered canvas <span className="text-cyan-300">studio.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
          Paint GraveGain textures and NewGamePlus sprites on stacked layers —
          integer-pixel brushwork on a 512 × 512 document, checkerboard
          transparency, blend modes, 30-step undo, one-click PNG export, and a
          spritesheet slicer. AI brushes stay honest: offline means disabled,
          never broken.
        </p>
        <div className="mt-8">
          <Suspense
            fallback={
              <p role="status" className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400">
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
