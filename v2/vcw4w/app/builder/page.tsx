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
    <main className="bg-slate-950 text-white">
      <section className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
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
        <div className="mt-3">
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
