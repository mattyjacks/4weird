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
      <section className="mx-auto max-w-6xl px-4 pb-8 pt-8 sm:px-5 sm:pt-10">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300 sm:text-sm">
          Free tools
        </p>
        <h1 className="mt-3 max-w-3xl text-2xl font-black leading-tight tracking-tight sm:text-4xl">
          Free utilities. <span className="text-cyan-300">No signup.</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-300">
          SEO, image, writing, and counting tools that run entirely in your
          browser. Nothing uploads, nothing meters, nothing breaks the page if
          a feature is missing.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="min-h-[120px] rounded-2xl border border-white/10 bg-white/[.04] p-4 transition hover:border-cyan-300/50 hover:bg-white/[.06]"
            >
              <h2 className="text-base font-black">{tool.name}</h2>
              <p className="mt-1 text-xs text-slate-400">{tool.blurb}</p>
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
