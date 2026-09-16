import { cacheLife, cacheTag } from "next/cache";
import type { Metadata } from "next";
import { Suspense } from "react";
import { MeshyStudio } from "@/components/meshy/meshy-studio";
import { MESHY_CUT_NOTE } from "@/lib/meshy";

export const metadata: Metadata = {
  alternates: { canonical: "/meshy" },
  title: "Meshy 3D Studio; text/image to 3D | 4weird",
  description: `Full Meshy.ai through the API: text-to-3D, image-to-3D, textures, animation, remesh; with auto-vault + game-ready advice. ${MESHY_CUT_NOTE}`,
};

export default async function MeshyPage() {
  "use cache";
  cacheLife("hours");
  cacheTag("studio");

  return (
    <main className="h-[calc(100vh-64px)] min-h-[560px] overflow-hidden bg-slate-950 text-white">
      <section className="mx-auto flex h-full max-w-7xl flex-col gap-2 overflow-hidden px-3 py-3">
        {/* Compact command bar (was: 400px+ hero). Real prompt/dropzone/polycount/texture/Generate live in MeshyStudio (left pane). */}
        <header className="flex h-12 shrink-0 items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-white/[.03] px-3">
          <h1 className="truncate text-sm font-black">🧊 Meshy 3D Studio</h1>
          <span className="hidden shrink-0 rounded-full border border-fuchsia-300/30 px-2 py-0.5 text-[11px] font-semibold text-fuchsia-200 md:inline">
            text-to-3D · image-to-3D · textures
          </span>
          <p className="hidden min-w-0 flex-1 truncate text-xs text-slate-400 lg:block">
            Budget-first quotes · preview-then-refine · every finished model autosaves to the Vault · 25% cut included
          </p>
          <a href="#meshy-studio" className="ml-auto shrink-0 rounded-full bg-fuchsia-600 px-3 py-1 text-xs font-black hover:bg-fuchsia-500">
            Generate ↓
          </a>
          <a href="/vault" className="shrink-0 rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-slate-200 hover:border-fuchsia-300/40">
            Vault
          </a>
        </header>

        {/* Split-screen studio: 35% controls / 65% viewport preview */}
        <div className="grid min-h-0 flex-1 gap-2 overflow-hidden lg:grid-cols-[35%_65%]">
          <div id="meshy-studio" className="min-h-0 scroll-mt-3 overflow-y-auto rounded-xl border border-white/10 bg-white/[.02] p-2">
            <Suspense
              fallback={
                <p role="status" className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400">
                  Loading Meshy 3D Studio…
                </p>
              }
            >
              <MeshyStudio />
            </Suspense>
          </div>

          {/* Viewport panel: placeholder canvas + floating export overlay toolbar + 64px filmstrip. Live model rendering happens in-studio; finished assets land in Vault. */}
          <div className="flex min-h-[320px] min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-black/40 lg:min-h-0">
            <div className="flex h-9 shrink-0 items-center gap-1.5 overflow-hidden border-b border-white/10 px-2">
              <span className="shrink-0 text-xs font-bold text-slate-300">Viewport</span>
              <span className="hidden rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 sm:inline">360° preview placeholder</span>
              <div className="ml-auto flex items-center gap-1.5 overflow-x-auto">
                <a href="#meshy-studio" title="Rotate: live once a model is generated in the studio" className="shrink-0 rounded-md border border-white/15 px-2 py-0.5 text-[11px] font-bold text-slate-200 hover:border-fuchsia-300/40">⟳ Rotate</a>
                <a href="#meshy-studio" title="Zoom: live once a model is generated in the studio" className="shrink-0 rounded-md border border-white/15 px-2 py-0.5 text-[11px] font-bold text-slate-200 hover:border-fuchsia-300/40">🔍 Zoom</a>
                <a href="#meshy-studio" title="Wireframe: live once a model is generated in the studio" className="shrink-0 rounded-md border border-white/15 px-2 py-0.5 text-[11px] font-bold text-slate-200 hover:border-fuchsia-300/40">🕸 Wireframe</a>
                <span aria-hidden="true" className="h-4 w-px shrink-0 bg-white/10" />
                <a href="/vault" title="Export GLB from the Vault — finished models autosave there" className="shrink-0 rounded-md bg-fuchsia-600 px-2 py-0.5 text-[11px] font-black text-white hover:bg-fuchsia-500">Export GLB → Vault</a>
                <a href="/vault" title="Export OBJ from the Vault — finished models autosave there" className="shrink-0 rounded-md border border-fuchsia-300/40 px-2 py-0.5 text-[11px] font-bold text-fuchsia-100 hover:border-fuchsia-200">Export OBJ → Vault</a>
              </div>
            </div>
            <div
              role="img"
              aria-label="3D viewport placeholder: generated models preview here; finished models autosave to the Vault"
              className="relative grid min-h-0 flex-1 place-items-center bg-[linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] bg-[size:24px_24px]"
            >
              <div className="px-4 text-center">
                <p className="text-4xl">🧊</p>
                <p className="mt-2 text-sm font-bold text-slate-200">WebGL canvas placeholder</p>
                <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
                  Generate on the left — the interactive 360° preview docks here, and every finished model autosaves to the Vault.
                </p>
              </div>
            </div>
            {/* 64px asset history filmstrip docked beneath the canvas (was: 70px footer tray below the grid). */}
            <div className="flex h-16 shrink-0 items-center gap-2 overflow-x-auto border-t border-white/10 bg-white/[.02] px-2" role="list" aria-label="Recent generations filmstrip">
              <span className="shrink-0 text-[11px] font-black text-slate-300">History</span>
              <span className="hidden shrink-0 truncate text-[11px] text-slate-500 md:inline">Autosaves to Vault —</span>
              <div role="listitem" className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[.03] text-lg" title="Generation slot 1 — live thumbnails render once models exist">🧊</div>
              <div role="listitem" className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[.03] text-lg" title="Generation slot 2 — live thumbnails render once models exist">🧊</div>
              <div role="listitem" className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[.03] text-lg" title="Generation slot 3 — live thumbnails render once models exist">🧊</div>
              <div role="listitem" className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-dashed border-white/15 bg-transparent text-lg text-slate-500" title="More history lives in the Vault">＋</div>
              <a href="/vault" className="ml-auto shrink-0 rounded-full border border-white/15 px-3 py-1 text-[11px] font-bold text-slate-100 hover:border-fuchsia-300/40">Open Vault →</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
