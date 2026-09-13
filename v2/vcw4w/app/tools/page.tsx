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
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-5 sm:pt-20">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300 sm:text-sm">
          Free tools
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
          Free utilities. <span className="text-cyan-300">No signup.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
          SEO, image, writing, and counting tools that run entirely in your
          browser. Nothing uploads, nothing meters, nothing breaks the page if
          a feature is missing.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="rounded-3xl border border-white/10 bg-white/[.04] p-6 transition hover:border-cyan-300/50 hover:bg-white/[.06] sm:p-8"
            >
              <h2 className="text-2xl font-black">{tool.name}</h2>
              <p className="mt-2 text-sm text-slate-400">{tool.blurb}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-cyan-300">
                Open tool &rarr;
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
