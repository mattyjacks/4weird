import type { Metadata } from "next";
import { Suspense } from "react";
import { ToolShell } from "@/components/tools/tool-shell";
import { ImageOptimizer } from "@/components/tools/image-optimizer";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/image" },
  title: "Image Optimizer | Free Tools | 4weird Games",
  description:
    "Free image optimizer: convert to WebP, JPEG, or PNG, compress, resize, and strip EXIF metadata — entirely in your browser, nothing uploads.",
};

export default function Page() {
  return (
    <ToolShell
      kicker="Free tool · Image"
      title="Image Optimizer"
      blurb="Shrink game art, screenshots, and thumbnails for the web: pick a format, tune quality and size, and download the result. Re-encoding strips EXIF metadata automatically."
    >
      {/* LAYOUT-ONLY (UXPASS p55): compact workbench wrapper; 50/50 dropzone+preview | settings+export live in ImageOptimizer. */}
      <div className="grid min-w-0 gap-3">
        <Suspense
          fallback={
            <p role="status" className="rounded-xl border border-white/10 bg-white/[.03] p-3 text-sm text-slate-400">
              Loading image optimizer…
            </p>
          }
        >
          <ImageOptimizer />
        </Suspense>
      </div>
    </ToolShell>
  );
}
