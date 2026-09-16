import { cacheLife, cacheTag } from "next/cache";
import type { Metadata } from "next";
import Link from "next/link";
import { getToolsCatalog } from "@/lib/site-content";

export const metadata: Metadata = {
  alternates: { canonical: "/tools" },
  title: "Free Tools | 4weird Games",
  description:
    "Free forever browser tools from 4weird: SEO analyzer with SERP preview, image optimizer and compressor, game writing helpers, and word counters. No signup, runs on-device.",
};

export default async function Page() {
  "use cache";
  cacheLife("hours");
  cacheTag("tools");

  // Single source of truth lives in lib/site-content.ts (itself a cached
  // fetcher under the same "tools" tag, so hub page + ToolShell + catalog
  // invalidate together).
  const tools = await getToolsCatalog();

  return (
    <div className="bg-slate-950 text-white">
      {/* LAYOUT-ONLY (UXPASS p53): compressed hero + dense 4-col 120px tool grid; live search/filter lives in tool components (handoff). */}
      <section className="mx-auto max-w-6xl px-3 pb-4 pt-4 sm:px-4 sm:pt-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
          Free tools
        </p>
        <h1 className="mt-1.5 max-w-3xl text-xl font-black leading-tight tracking-tight sm:text-2xl">
          Free utilities. <span className="text-cyan-300">No signup.</span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-slate-300">
          SEO, image, writing, and counting tools that run entirely in your
          browser. Nothing uploads, nothing meters, nothing breaks the page if
          a feature is missing.
        </p>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="min-h-[120px] rounded-xl border border-white/10 bg-white/[.04] p-3 transition hover:border-cyan-300/50 hover:bg-white/[.06]"
            >
              <h2 className="text-sm font-black">{tool.name}</h2>
              <p className="mt-1 line-clamp-2 text-xs text-slate-400">{tool.blurb}</p>
              <span className="mt-2 inline-block text-xs font-semibold text-cyan-300">
                Open tool &rarr;
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
