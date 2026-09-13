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
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-5 sm:pt-20">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300 sm:text-sm">
          AliveSpeech Lab · Studio
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
          Voice cloning &amp; audio <span className="text-cyan-300">mastering.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
          Local mastering bench: decode real audio, measure duration, peak dB
          and RMS, apply gain or normalize-to-peak, A/B the result, and export
          a 16-bit WAV. Voice cloning lives elsewhere — this page never leaves
          your device.
        </p>
        <div className="mt-8">
          <Suspense
            fallback={
              <p role="status" className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400">
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
