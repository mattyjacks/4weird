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
        Publish Game to Arcade 🚀
      </a>
    </div>
  );
}

// uxpass-2 Page 16: strict cockpit isolation — 100vh lock (minus 64px global
// header), zero page-level scroll. Columns scroll internally. No promo
// footers on this utility form.
export default function SubmitPage() {
  return (
    <main className="h-[calc(100vh-4rem)] overflow-hidden bg-slate-950 text-white">
      <section className="mx-auto flex h-full max-w-6xl flex-col gap-2 overflow-hidden px-3 py-3">
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
        {/* 2-col cockpit: 45% metadata 2x2 grid / 55% live form (zip
            dropzone + thumbnail + revenue selector live in ZipSubmitForm).
            Inline Publish CTA lives in the header bar above — no separated
            bottom action. */}
        <div className="grid min-h-0 flex-1 gap-2 overflow-hidden lg:grid-cols-[45%_55%]">
          <aside className="min-h-0 overflow-y-auto rounded-xl border border-white/10 bg-white/[.02] p-3 text-xs">
            <p className="text-xs font-black">Metadata</p>
            {/* High-density 2x2 grid (8px gaps): Title / Root Path / Category / Version. */}
            <dl className="mt-2 grid grid-cols-2 gap-2 text-slate-300">
              <div className="rounded-lg border border-white/10 bg-white/[.02] p-2"><dt className="font-bold text-slate-400">Title</dt><dd className="mt-0.5">Game name (defaults to .zip filename).</dd></div>
              <div className="rounded-lg border border-white/10 bg-white/[.02] p-2"><dt className="font-bold text-slate-400">Root Path</dt><dd className="mt-0.5">Folder with index.html inside the .zip.</dd></div>
              <div className="rounded-lg border border-white/10 bg-white/[.02] p-2"><dt className="font-bold text-slate-400">Category</dt><dd className="mt-0.5">Arcade genre picked at review.</dd></div>
              <div className="rounded-lg border border-white/10 bg-white/[.02] p-2"><dt className="font-bold text-slate-400">Version</dt><dd className="mt-0.5">Semver stamped at publish; slug derived then.</dd></div>
            </dl>
            <p className="mt-2 text-[11px] text-slate-400">
              Engine: {["HTML5", "Godot", "Unity WebGL", "Phaser"].join(" · ")}
            </p>
            <p className="mt-1 border-t border-white/10 pt-2 text-[11px] text-slate-400">
              Revenue: Free / Vibe Coins / Direct Tip — chosen at review. Developer contract signed at step 3.
            </p>
          </aside>
          <div id="zip-submit-form" className="min-h-0 min-w-0 overflow-y-auto scroll-mt-3">
            <Suspense fallback={<p className="text-sm text-slate-400">Loading form…</p>}>
              <ZipSubmitForm />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}
