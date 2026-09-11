import type { Metadata } from "next";
import { MeshyStudio } from "@/components/meshy/meshy-studio";
import { MESHY_CUT_NOTE } from "@/lib/meshy";

export const metadata: Metadata = {
  alternates: { canonical: "/meshy" },
  title: "Meshy 3D Studio; text/image to 3D | 4weird",
  description: `Full Meshy.ai through the API: text-to-3D, image-to-3D, textures, animation, remesh; with auto-vault + game-ready advice. ${MESHY_CUT_NOTE}`,
};

export default function MeshyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-fuchsia-300">Meshy.ai · 3D for games</p>
        <h1 className="mt-2 text-4xl font-black">🧊 Meshy 3D Studio</h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          The full Meshy.ai surface, handled purely through the API; plus 4weird
          improvements: budget-first quotes, preview-then-refine pipelines, automatic
          Vault saves of every finished model, and browser-game readiness advice. Every
          run is metered in Vibe Coins with the 25% cut included.
        </p>
        <div className="mt-10">
          <MeshyStudio />
        </div>
      </section>
    </main>
  );
}
