import type { Metadata } from "next";
import { FalStudio } from "@/components/fal/fal-studio";
import { FAL_CUT_NOTE } from "@/lib/fal";

export const metadata: Metadata = {
  alternates: { canonical: "/fal" },
  title: "fal.ai Studio - 30 magical media tools | 4weird",
  description: `Concept art, sprites, 3D, trailers, voices, music + coding promo kits on fal.ai. ${FAL_CUT_NOTE}`,
};

export default function FalPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-fuchsia-300">fal.ai · Game dev + coding</p>
        <h1 className="mt-2 text-4xl font-black">✨ fal.ai Studio - 30 ways to make magic</h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          Concept art to cutscenes to NPC voices to transcribed playtests: every run is metered in
          Vibe Coins (100 coins = $1.00) with the 25% platform cut INCLUDED â€” never added on top.
          Signed-in players meter coins; usage lands on <a className="underline" href="/my/usage/">/my/usage</a> per
          op + game, and VibeCodeWorker runs can file fal art straight into their evidence trail.
        </p>
        <div className="mt-10">
          <FalStudio />
        </div>
      </section>
    </main>
  );
}
