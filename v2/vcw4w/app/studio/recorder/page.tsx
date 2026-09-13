import { cacheLife, cacheTag } from "next/cache";
import type { Metadata } from "next";
import { Suspense } from "react";
import { DemoRecorder } from "@/components/studio/demo-recorder";

export const metadata: Metadata = {
  alternates: { canonical: "/studio/recorder" },
  title: "DemoRecorder: Screen Recording & AI Input Logger | 4weird",
  description:
    "DemoRecorder: capture your screen with getDisplayMedia, preview and export .webm, plus a live key/mouse input-event logger with JSON dataset export — all on-device in your browser.",
};

export default async function Page() {
  "use cache";
  cacheLife("hours");
  cacheTag("studio");

  return (
    <div className="bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-5 sm:pt-20">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300 sm:text-sm">
          DemoRecorder · Studio
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
          Screen recording &amp; <span className="text-cyan-300">input logger.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
          Record your screen, watch a live preview with a running timer, log
          key and mouse input with timestamps while you record, and export
          .webm video plus a JSON event dataset. All processing stays on-device.
        </p>
        <div className="mt-8">
          <Suspense
            fallback={
              <p role="status" className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400">
                Loading the demo recorder…
              </p>
            }
          >
            <DemoRecorder />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
