import { cacheLife, cacheTag } from "next/cache";
import type { Metadata } from "next";
import { Suspense } from "react";
import { StockStudio } from "@/components/stock/stock-studio";
import { PEXELS_CREDIT_NOTE } from "@/lib/pexels";

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
      {/* 48px sticky search header: live search + Photos/Videos toggle + orientation + Surprise Me live in StockStudio below; this bar keeps identity + credit rule pinned. */}
      <header className="sticky top-0 z-10 flex h-12 items-center gap-3 overflow-hidden border-b border-white/10 bg-slate-950/90 px-3 backdrop-blur">
        <h1 className="truncate text-sm font-black">🖼️ Free Stock</h1>
        <span className="hidden shrink-0 rounded-full border border-emerald-300/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-200 sm:inline">
          Pexels · 0 coins a search
        </span>
        <p className="hidden min-w-0 flex-1 truncate text-xs text-slate-400 md:block">
          Every asset names its creator — copy the credit line wherever you use it.
        </p>
        <a href="#stock-studio" className="ml-auto shrink-0 rounded-full bg-emerald-600 px-3 py-1 text-xs font-black hover:bg-emerald-500">
          Search ↓
        </a>
        <a href="/fal" className="shrink-0 rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-slate-200 hover:border-emerald-300/40">
          fal.ai Studio
        </a>
      </header>
      {/* Preset chip carousel (32px) + 4-col masonry results with hover preview + Copy Attribution + Download live in StockStudio — mounted above the fold. */}
      <section id="stock-studio" className="mx-auto max-w-7xl scroll-mt-14 px-3 py-2">
        <div className="mb-2 flex items-center gap-2 text-[11px] text-slate-500">
          <span>Photos / Videos toggle · orientation filter · Surprise Me · 10 preset chips · results grid — all inside, above the fold</span>
        </div>
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
