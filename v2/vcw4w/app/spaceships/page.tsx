import type { Metadata } from "next";
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
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">Spaceship Simulation</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Pilot a weird little starship</h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          The original 4weird WebGL spaceship simulation, preserved intact and touch-ready.
        </p>
        <div className="mt-8">
          <SpaceshipRuntime />
        </div>
      </section>
    </div>
  );
}
