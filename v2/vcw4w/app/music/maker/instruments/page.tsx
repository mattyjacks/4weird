import { cacheLife, cacheTag } from "next/cache";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { InstrumentRack } from "@/components/music/instrument-rack";

export const metadata: Metadata = {
  alternates: { canonical: "/music/maker/instruments" },
  title: "Instrument Rack: Play All 20 Instruments | 4weird",
  description:
    "Instrument rack: audition all 20 Music Maker instruments — two piano octaves, five drum pads, and an XY theremin surface. Runs on your device, no saves touched.",
};

export default async function Page() {
  "use cache";
  cacheLife("hours");
  cacheTag("music");

  return (
    <div className="bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-3 pb-6 pt-4 sm:px-4 sm:pt-6">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300 sm:text-sm">
          Music Maker · Instrument Rack
        </p>
        <h1 className="mt-1 max-w-3xl text-2xl font-black leading-tight tracking-tight sm:text-3xl">
          Play every instrument, <span className="text-cyan-300">right here.</span>
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-300">
          All twenty voices in one rack: two piano octaves (mouse, touch, or
          A–K keys), five drum pads, and an XY theremin surface. Everything
          runs on your device — nothing is saved.
        </p>
        <p className="mt-2 text-sm">
          <Link href="/music/maker" className="font-semibold text-cyan-300 underline-offset-4 hover:underline">
            ← Back to the Music Maker
          </Link>
        </p>
        <div className="mt-4">
          <Suspense
            fallback={
              <p role="status" className="rounded-lg border border-white/10 bg-white/[.03] px-3 py-2 text-sm text-slate-400">
                Loading the instrument rack…
              </p>
            }
          >
            <InstrumentRack />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
