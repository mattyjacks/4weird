import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { SpaceshipRuntime } from "@/components/spaceships/spaceship-runtime";

export const metadata: Metadata = {
  alternates: { canonical: "/spaceships" },
  title: "Spaceship Simulation",
  description: "Pilot the original 4weird WebGL spaceship simulation.",
};

export default function Page() {
  return (
    <div className="bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-5 sm:py-14">
        <CachedSpaceshipsIntro />
        <div className="mt-8">
          {/* WebGL runtime (live canvas, per-visitor state): dynamic island
              streaming behind the fallback; never cached. */}
          <Suspense fallback={<p className="text-sm text-slate-400">Loading starship…</p>}>
            <SpaceshipRuntime />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

// Static intro copy: no per-user data, cached hourly.
async function CachedSpaceshipsIntro() {
  "use cache";
  cacheLife("hours");
  return (
    <>
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">Spaceship Simulation</p>
      <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Pilot a weird little starship</h1>
      <p className="mt-4 max-w-2xl text-slate-300">
        The original 4weird WebGL spaceship simulation, preserved intact and touch-ready.
      </p>
    </>
  );
}
