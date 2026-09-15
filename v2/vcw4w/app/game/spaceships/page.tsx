import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { SpaceshipRuntime } from "@/components/spaceships/spaceship-runtime";

export const metadata: Metadata = {
  alternates: { canonical: "/game/spaceships" },
  title: "Spaceship Simulation",
  description: "Pilot the original 4weird WebGL spaceship simulation.",
};

export default function Page() {
  return (
    <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden bg-slate-950 text-white">
      <section className="flex h-9 shrink-0 items-center gap-2 overflow-hidden border-b border-white/10 px-3">
        <CachedSpaceshipsIntro />
      </section>
      <div className="min-h-0 flex-1 overflow-hidden">
        {/* WebGL runtime (live canvas, per-visitor state): dynamic island
            streaming behind the fallback; never cached. */}
        <Suspense fallback={<p className="text-sm text-slate-400">Loading starship…</p>}>
          <SpaceshipRuntime />
        </Suspense>
      </div>
    </div>
  );
}

// Static intro copy: no per-user data, cached hourly.
// Compact single-row bar so the canvas fills the viewport (zero-scroll arcade).
async function CachedSpaceshipsIntro() {
  "use cache";
  cacheLife("hours");
  return (
    <>
      <p className="shrink-0 text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-300">Spaceship Simulation</p>
      <h1 className="shrink-0 truncate text-sm font-black tracking-tight">Pilot a weird little starship</h1>
      <p className="hidden truncate text-xs text-slate-400 xl:block">
        The original 4weird WebGL spaceship simulation, preserved intact and touch-ready.
      </p>
    </>
  );
}
