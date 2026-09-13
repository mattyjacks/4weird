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
      <section className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">Pexels · Royalty-free stock</p>
        <h1 className="mt-2 text-4xl font-black">🖼️ Free Stock - images + video</h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          Real photos and video clips for loading screens, thumbnails, backdrops, and trailers - free to use, 0 coins
          a search. The only price is credit: every asset names its creator, so copy the credit line wherever you use
          it. Prefer AI-made art instead? Try the{" "}
          <a className="underline" href="/fal">fal.ai Studio</a>.
        </p>
        <div className="mt-10">
          <Suspense
            fallback={
              <p role="status" className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400">
                Loading free stock…
              </p>
            }
          >
            <StockStudio />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
