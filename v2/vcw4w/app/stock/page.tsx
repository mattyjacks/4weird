import { cacheLife, cacheTag } from "next/cache";
import type { Metadata } from "next";
import { Suspense } from "react";
import { StockStudio } from "@/components/stock/stock-studio";
import { PEXELS_COLORS, PEXELS_CREDIT_NOTE, PEXELS_PRESETS } from "@/lib/pexels";

export const metadata: Metadata = {
  alternates: { canonical: "/stock" },
  title: "Free Stock - Pexels images + video | 4weird",
  description: `Royalty-free Pexels photos and videos for game art, thumbnails, and trailers. ${PEXELS_CREDIT_NOTE}`,
};

export default async function StockPage() {
  "use cache";
  cacheLife("hours");
  cacheTag("studio");

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* uxpass-2 Page 14: single-row unified search bar (48px). Search input +
          media-type tabs + submit share one horizontal bar; live search, kind
          toggle, orientation + Surprise Me run inside StockStudio below — this
          bar is layout-only and jumps to #stock-studio. */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-7xl items-center gap-2 px-3">
          <h1 className="shrink-0 truncate text-sm font-black">🖼️ Free Stock</h1>
          <span className="hidden shrink-0 rounded-full border border-emerald-300/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-200 lg:inline">
            Pexels · 0 coins a search
          </span>
          <div role="tablist" aria-label="Media type" className="flex shrink-0 items-center rounded-full border border-white/15 p-0.5 text-xs font-bold">
            <a role="tab" aria-selected="true" href="#stock-studio" className="rounded-full bg-white/10 px-2.5 py-1 text-white">
              🖼️ Images
            </a>
            <a role="tab" aria-selected="false" href="#stock-studio" className="rounded-full px-2.5 py-1 text-slate-300 hover:text-white">
              🎬 Videos
            </a>
          </div>
          <div role="search" className="flex min-w-0 flex-1 items-center gap-2">
            <label htmlFor="stock-unified-search" className="sr-only">
              Search free stock photos and videos
            </label>
            <input
              id="stock-unified-search"
              type="search"
              name="q"
              placeholder="Search free stock… ⌘K"
              autoComplete="off"
              className="h-9 min-w-0 flex-1 rounded-full border border-white/15 bg-black/30 px-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300/50 focus:outline-none"
            />
            <a href="#stock-studio" className="h-9 shrink-0 rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-black hover:bg-emerald-500">
              Search
            </a>
          </div>
          <a href="#stock-filters" className="hidden h-9 shrink-0 items-center rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-emerald-300/40 sm:inline-flex">
            🎨 Filters
          </a>
          <a href="/fal" className="hidden h-9 shrink-0 items-center rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-emerald-300/40 md:inline-flex">
            fal.ai Studio
          </a>
        </div>
      </header>
      {/* uxpass-2 Page 14: filters drawer (collapsed by default). The 10 preset
          vibe chips + color mood chips move out of the header into this
          expandable drawer, saving ~350px. Chips are layout-only anchors — the
          live preset / color / orientation controls run inside StockStudio. */}
      <details id="stock-filters" className="mx-auto max-w-7xl scroll-mt-14 px-3">
        <summary className="flex h-10 cursor-pointer list-none items-center gap-2 text-xs font-bold text-slate-300 hover:text-white [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true">🎨</span> Filters &amp; Moods
          <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
            10 vibes · {PEXELS_COLORS.length} colors · orientation
          </span>
          <span className="ml-auto text-[11px] font-semibold text-slate-500">expand ▾ · live controls inside ↓</span>
        </summary>
        <div className="space-y-2 rounded-xl border border-white/10 bg-white/[.03] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Vibe presets</p>
          <div className="flex flex-wrap gap-1.5">
            {PEXELS_PRESETS.map((preset) => (
              <a
                key={preset.label}
                href="#stock-studio"
                title={`${preset.label} — ${preset.blurb}`}
                className="rounded-full border border-white/15 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:border-emerald-300/40 hover:text-white"
              >
                {preset.emoji} {preset.label}
              </a>
            ))}
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Color mood</p>
          <div className="flex flex-wrap gap-1.5">
            {PEXELS_COLORS.map((color) => (
              <a
                key={color.name}
                href="#stock-studio"
                title={`${color.name} mood`}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:border-emerald-300/40 hover:text-white"
              >
                <span aria-hidden="true" className="inline-block size-3 rounded-full border border-white/20" style={{ backgroundColor: color.hex }} />
                {color.name}
              </a>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">
            Orientation (landscape / portrait / square) + live search run inside the studio below — this drawer is the
            compact layout shell. Every asset names its creator — copy the credit line wherever you use it.
          </p>
        </div>
      </details>
      {/* uxpass-2 Page 14: masonry results grid starts at ~y110 (48px bar + 40px
          drawer summary + tight padding). Live preset carousel, Photos/Videos
          toggle, Surprise Me, masonry grid, hover preview, Copy Attribution +
          Download run inside StockStudio. */}
      <section id="stock-studio" className="mx-auto max-w-7xl scroll-mt-20 px-3 pb-3 pt-1">
        <Suspense
          fallback={
            <p role="status" className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400">
              Loading free stock…
            </p>
          }
        >
          <StockStudio />
        </Suspense>
      </section>
    </main>
  );
}
