import { cacheLife, cacheTag } from "next/cache";
import type { Metadata } from "next";
import { Suspense } from "react";
import { FalStudio } from "@/components/fal/fal-studio";
import { FAL_CUT_NOTE } from "@/lib/fal";

export const metadata: Metadata = {
  alternates: { canonical: "/fal" },
  title: "fal.ai Studio - 30 magical media tools | 4weird",
  description: `Concept art, sprites, 3D, trailers, voices, music + coding promo kits on fal.ai. ${FAL_CUT_NOTE}`,
};

export default async function FalPage() {
  "use cache";
  cacheLife("hours");
  cacheTag("studio");

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Compact command header: title + 1-line pitch; studio catalog starts ~y:100, above the fold */}
      <section className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-fuchsia-300">fal.ai · Game dev + coding</p>
          <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-bold text-emerald-200">30 tools · 25% cut included</span>
          <a href="/stock" className="ml-auto text-[11px] font-semibold text-cyan-300 hover:underline">Need real photos? Free stock (Pexels) →</a>
        </div>
        <h1 className="mt-0.5 text-xl font-black">✨ fal.ai Studio - 30 ways to make magic</h1>
        <p className="mt-0.5 max-w-4xl text-xs text-slate-400">
          Concept art to cutscenes to NPC voices to transcribed playtests, metered in Vibe Coins (100 coins = $1.00).
          Usage lands on <a className="underline" href="/my/usage/">/my/usage</a> per op + game; VibeCodeWorker runs can file fal art into their evidence trail.
        </p>
        <div className="mt-2">
          <Suspense
            fallback={
              <p role="status" className="rounded-xl border border-white/10 bg-white/[.03] p-3 text-xs text-slate-400">
                Loading fal.ai Studio…
              </p>
            }
          >
            <FalStudio />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
