import { cacheLife, cacheTag } from "next/cache";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AudioClient } from "./audio-client";

export const metadata: Metadata = {
  alternates: { canonical: "/studio/audio" },
  title: "AliveSpeech Lab: Voice Cloning & Audio Mastering | 4weird",
  description:
    "AliveSpeech Lab: upload audio, inspect real duration/peak/RMS analysis, apply gain and normalize-to-peak mastering, A/B playback, and WAV export — all on-device in your browser.",
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
              AliveSpeech Lab · Studio
            </p>
            <h1 className="truncate text-2xl font-black leading-tight tracking-tight">
              Voice cloning &amp; audio <span className="text-cyan-300">mastering.</span>
            </h1>
          </div>
          <p className="shrink-0 rounded-full border border-white/10 bg-white/[.03] px-3 py-1 text-[11px] font-bold text-slate-300">
            on-device · WAV export
          </p>
        </header>
        <p className="mt-1 max-w-3xl text-xs text-slate-400">
          Local mastering bench: decode real audio, measure duration, peak dB
          and RMS, apply gain or normalize-to-peak, A/B the result, and export
          a 16-bit WAV. Voice cloning lives elsewhere — this page never leaves
          your device.
        </p>
        <div className="mt-2 min-w-0 lg:h-[calc(100vh-190px)] lg:min-h-[480px] lg:overflow-y-auto">
          <Suspense
            fallback={
              <p role="status" className="rounded-xl border border-white/10 bg-white/[.03] p-3.5 text-sm text-slate-400">
                Loading the audio lab…
              </p>
            }
          >
            <AudioClient />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
