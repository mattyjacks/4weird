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
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-5xl px-5 py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
          4WEIRD // CLONE TOOL
        </p>
        <h1 className="mt-2 text-4xl font-black">Installer config builder</h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          Describe your desktop or mobile installer and download a ready-to-use
          config JSON. Everything runs in your browser and drafts autosave
          locally. Related:{" "}
          <Link href="/tools" className="font-bold text-cyan-300 hover:underline">
            Free tools
          </Link>{" "}
          ·{" "}
          <Link href="/business" className="font-bold text-cyan-300 hover:underline">
            Business hub
          </Link>
          .
        </p>
        <div className="mt-10">
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
