import { cacheLife, cacheTag } from "next/cache";
import type { Metadata } from "next";
import { Suspense } from "react";
import { FalStudio } from "@/components/fal/fal-studio";
import { FAL_CUT_NOTE, FAL_OPS } from "@/lib/fal";

export const metadata: Metadata = {
  alternates: { canonical: "/fal" },
  title: "fal.ai Studio - 30 magical media tools | 4weird",
  description: `Concept art, sprites, 3D, trailers, voices, music + coding promo kits on fal.ai. ${FAL_CUT_NOTE}`,
};

// uxpass-2 Page 12 (/fal): sticky 44px category ribbon + search, collapsible
// header, dense-catalog shell. Layout-only: the ?cat= / ?q= URL contract below
// is set by this ribbon, but filtering + compact 4-col ~140px cards live inside
// <FalStudio /> (component-owned) — see DS-UXPASS2-12 handoff, do not wire here.
const CATEGORY_PILLS = [
  { slug: "game-art", label: "Game Art", emoji: "🎨" },
  { slug: "video", label: "Video", emoji: "🎬" },
  { slug: "audio", label: "Audio", emoji: "🔊" },
  { slug: "3d", label: "3D", emoji: "🧊" },
  { slug: "coding", label: "Code", emoji: "💻" },
] as const;

function countFor(label: string): number {
  return FAL_OPS.filter((o) => o.category === label || (label === "Code" && o.category === "Coding")).length;
}

const pillClass =
  "shrink-0 rounded-full border border-white/10 bg-white/[.04] px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:border-fuchsia-300/50 hover:text-white";

export default async function FalPage() {
  "use cache";
  cacheLife("hours");
  cacheTag("studio");

  const total = FAL_OPS.length;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-7xl px-4 pt-3">
        {/* Collapsible command header: eyebrow + title stay visible; pitch collapses */}
        <header>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-fuchsia-300">fal.ai · Game dev + coding</p>
            <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-bold text-emerald-200">{total} tools · 25% cut included</span>
            <a href="/stock" className="ml-auto text-[11px] font-semibold text-cyan-300 hover:underline">Need real photos? Free stock (Pexels) →</a>
          </div>
          <h1 className="mt-0.5 text-xl font-black">✨ fal.ai Studio - 30 ways to make magic</h1>
          <details className="mt-0.5">
            <summary className="cursor-pointer text-[11px] font-semibold text-slate-400 hover:text-slate-200">About pricing + usage</summary>
            <p className="mt-0.5 max-w-4xl text-xs text-slate-400">
              Concept art to cutscenes to NPC voices to transcribed playtests, metered in Vibe Coins (100 coins = $1.00).
              Usage lands on <a className="underline" href="/my/usage/">/my/usage</a> per op + game; VibeCodeWorker runs can file fal art into their evidence trail.
            </p>
          </details>
        </header>

        {/* Sticky 44px category ribbon + search (h-11); full-bleed inside padded section */}
        <div className="sticky top-0 z-20 -mx-4 mt-2 border-y border-white/10 bg-slate-950/90 backdrop-blur">
          <div className="mx-auto flex h-11 max-w-7xl items-center gap-1.5 overflow-x-auto px-4">
            <a href="/fal" aria-label="Show all tools" className={pillClass}>All ({total})</a>
            {CATEGORY_PILLS.map((c) => (
              <a key={c.slug} href={`/fal?cat=${c.slug}`} aria-label={`Filter to ${c.label} tools`} className={pillClass}>
                {c.emoji} {c.label} ({countFor(c.label)})
              </a>
            ))}
            <form action="/fal" method="get" role="search" className="ml-auto flex shrink-0 items-center pl-2">
              <label htmlFor="fal-filter" className="sr-only">Filter fal.ai models</label>
              <input
                id="fal-filter"
                type="search"
                name="q"
                placeholder="Filter models… ⌘K"
                autoComplete="off"
                className="h-7 w-36 rounded-full border border-white/15 bg-black/40 px-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-fuchsia-300/60 focus:outline-none sm:w-44"
              />
            </form>
          </div>
        </div>

        {/* Dense-catalog shell: anchors below the sticky ribbon; card density ships via component handoff */}
        <div id="fal-studio" className="mt-2 scroll-mt-14 pb-6">
          <p className="text-[11px] text-slate-500">{total} tools · pick one to configure + queue below</p>
          <div className="mt-1.5">
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
        </div>
      </section>
    </main>
  );
}
