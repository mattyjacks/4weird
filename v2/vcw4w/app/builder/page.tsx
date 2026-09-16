import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BuilderClient } from "./builder-client";

export const metadata: Metadata = {
  alternates: { canonical: "/builder" },
  title: "Clone Tool | 4weird",
  description:
    "Visual installer generator producing standalone .exe, .dmg, and .deb packages from 4weird projects. Pick platforms, icon, license, and bundled runtimes, then download the config JSON.",
};

export default function BuilderPage() {
  return (
    <main className="flex h-[calc(100vh-56px)] min-h-[500px] flex-col overflow-hidden bg-slate-950 text-white">
      <section className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 py-3">
        {/* Sticky header build bar: title + primary destinations above the fold */}
        <div className="flex shrink-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-300">
            4WEIRD // CLONE TOOL
          </p>
          <h1 className="text-xl font-black">Installer config builder</h1>
          <p className="ml-auto text-[11px] text-slate-500">
            Browser-only · autosaves locally ·{" "}
            <Link href="/tools" className="font-bold text-cyan-300 hover:underline">
              Free tools
            </Link>{" "}
            ·{" "}
            <Link href="/business" className="font-bold text-cyan-300 hover:underline">
              Business hub
            </Link>
          </p>
        </div>
        {/* 2-column configuration cockpit fills the viewport (client owns the split) */}
        <div className="mt-2 min-h-0 flex-1">
          <Suspense
            fallback={
              <p
                role="status"
                className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400"
              >
                Loading the installer builder…
              </p>
            }
          >
            <BuilderClient />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
