import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { ZipSubmitForm } from "@/components/submit/zip-submit-form";
import { SUBMIT_CUT_NOTE } from "@/lib/zip-submit";

export const metadata: Metadata = {
  alternates: { canonical: "/submit" },
  title: "Submit your game (.zip) | 4weird",
  description: `Upload your game as a .zip (50 MB max; every game loads fast) with a project game root. Automatic safety scan: safe, warning, unsafe, or denied. ${SUBMIT_CUT_NOTE}`,
};

// Fully static intro copy ('days'). ZipSubmitForm stays uncached: it is a
// 'use client' upload form with per-user file state + POSTs.
async function CachedSubmitIntro() {
  'use cache';
  cacheLife('days');
  return (
    <div className="flex h-12 items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-white/[.03] px-3">
      <h1 className="truncate text-sm font-black">📦 Submit your game</h1>
      <p className="hidden min-w-0 flex-1 truncate text-xs text-slate-400 md:block">
        Max <strong>50 MB</strong> ⚡ · game root = folder with index.html · verdicts: <strong>safe</strong> / <strong>warning</strong> / <strong>unsafe</strong> / <strong>denied</strong> (malware hard-denied, quarantined, human review) · coins metered, 25% cut included
      </p>
      <a href="#zip-submit-form" className="ml-auto shrink-0 rounded-full bg-cyan-600 px-3 py-1 text-xs font-black hover:bg-cyan-500">
        Publish ↓
      </a>
    </div>
  );
}

export default function SubmitPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex max-w-6xl flex-col gap-2 px-3 py-3">
        <Suspense fallback={<p className="text-sm text-slate-400">Loading…</p>}>
          <CachedSubmitIntro />
        </Suspense>
        {/* 3-step ribbon (was: long instruction paragraphs). */}
        <ol aria-label="Submission steps" className="flex h-9 shrink-0 items-center gap-1 overflow-hidden rounded-xl border border-white/10 bg-white/[.02] px-2 text-[11px] font-bold">
          <li className="truncate rounded-full bg-cyan-600/25 px-2 py-0.5 text-cyan-200">1 Metadata</li>
          <li aria-hidden="true" className="shrink-0 text-slate-600">→</li>
          <li className="truncate rounded-full px-2 py-0.5 text-slate-400">2 Assets</li>
          <li aria-hidden="true" className="shrink-0 text-slate-600">→</li>
          <li className="truncate rounded-full px-2 py-0.5 text-slate-400">3 Review &amp; Sign</li>
          <li className="ml-auto hidden shrink-0 text-slate-500 sm:block">zero-scroll cockpit</li>
        </ol>
        {/* 2-col cockpit: 45% metadata explainer / 55% live form (zip dropzone + thumbnail + revenue selector live in ZipSubmitForm). */}
        <div className="grid gap-2 lg:grid-cols-[45%_55%]">
          <aside className="h-fit rounded-xl border border-white/10 bg-white/[.02] p-3 text-xs lg:sticky lg:top-3">
            <p className="text-xs font-black">Metadata</p>
            <dl className="mt-2 space-y-1.5 text-slate-300">
              <div className="flex gap-2"><dt className="w-16 shrink-0 font-bold text-slate-400">Title</dt><dd>Game name (defaults to .zip filename).</dd></div>
              <div className="flex gap-2"><dt className="w-16 shrink-0 font-bold text-slate-400">Slug</dt><dd>URL-safe id derived at publish.</dd></div>
              <div className="flex gap-2"><dt className="w-16 shrink-0 font-bold text-slate-400">Category</dt><dd>Arcade genre picked at review.</dd></div>
              <div className="flex gap-2"><dt className="w-16 shrink-0 font-bold text-slate-400">Engine</dt><dd className="flex flex-wrap gap-1">
                {["HTML5", "Godot", "Unity WebGL", "Phaser"].map((e) => (
                  <span key={e} className="rounded-full border border-white/10 px-1.5 py-px text-[10px] text-slate-300">{e}</span>
                ))}
              </dd></div>
            </dl>
            <p className="mt-2 border-t border-white/10 pt-2 text-[11px] text-slate-400">
              Revenue: Free / Vibe Coins / Direct Tip — chosen at review. Developer contract signed at step 3.
            </p>
          </aside>
          <div id="zip-submit-form" className="min-w-0 scroll-mt-3">
            <Suspense fallback={<p className="text-sm text-slate-400">Loading form…</p>}>
              <ZipSubmitForm />
            </Suspense>
          </div>
        </div>
        {/* Docked Publish shortcut (real Upload + scan button lives in the form). */}
        <div className="sticky bottom-3 flex justify-end">
          <a href="#zip-submit-form" className="rounded-full bg-cyan-600 px-5 py-2 text-sm font-black shadow-lg shadow-cyan-950/50 hover:bg-cyan-500">
            Publish Game to Arcade ↓
          </a>
        </div>
      </section>
    </main>
  );
}
