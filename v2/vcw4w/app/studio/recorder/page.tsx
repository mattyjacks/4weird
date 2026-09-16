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
      <section className="mx-auto w-full max-w-7xl px-3 py-3 sm:px-4">
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="shrink-0 text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
              DemoRecorder · Studio
            </p>
            <h1 className="truncate text-2xl font-black tracking-tight sm:text-3xl">
              Screen recording &amp; <span className="text-cyan-300">input logger.</span>
            </h1>
          </div>
          <p className="shrink-0 rounded-full border border-white/10 bg-white/[.03] px-3 py-1 text-[11px] font-bold text-slate-300">
            on-device · .webm + JSON export
          </p>
        </header>
        <p className="mt-1 max-w-2xl truncate text-xs text-slate-400">
          Record your screen, watch a live preview with a running timer, log
          key and mouse input with timestamps while you record, and export
          .webm video plus a JSON event dataset. All processing stays on-device.
        </p>
        <div className="mt-2 min-w-0">
          <Suspense
            fallback={
              <p role="status" className="rounded-xl border border-white/10 bg-white/[.03] p-3.5 text-sm text-slate-400">
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
