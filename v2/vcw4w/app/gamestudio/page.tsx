import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GamestudioClient } from "./gamestudio-client";

export const metadata: Metadata = {
  alternates: { canonical: "/gamestudio" },
  title: "GameStudio — Project Scaffolder",
  description:
    "Scaffold a new 4weird game project: pick a template, pin a Godot version, download project.json plus a starter README.",
};

export default function GameStudioPage() {
  return (
    <main className="flex h-[calc(100vh-56px)] min-h-[500px] flex-col overflow-hidden bg-slate-950 text-white">
      <section className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 py-3">
        <div className="flex shrink-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-300">
            4WEIRD // GAMESTUDIO
          </p>
          <h1 className="text-xl font-black">GameStudio</h1>
          <p className="ml-auto text-[11px] text-slate-500">Browser-only scaffolder</p>
        </div>
        {/* 40px ribbon command toolbar: real routes only, no dummy buttons */}
        <nav
          aria-label="GameStudio quick actions"
          className="mt-2 flex h-10 shrink-0 items-center gap-1.5 overflow-x-auto rounded-xl border border-white/10 bg-white/[.03] px-2"
        >
          <Link
            href="/gamestudio/debugplay"
            className="shrink-0 rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-300"
          >
            ▶ Run · DebugPlay
          </Link>
          <Link
            href="/vibecodeworker"
            className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-white transition hover:border-emerald-300/50"
          >
            🤖 Automate · VibeCodeWorker
          </Link>
          <Link
            href="/submit"
            className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-white transition hover:border-emerald-300/50"
          >
            ⤴ Publish · Submit
          </Link>
          <span className="ml-auto hidden shrink-0 font-mono text-[10px] text-slate-500 sm:inline">
            Godot · project.json + README → .zip
          </span>
        </nav>
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
          <Suspense
            fallback={
              <p
                role="status"
                className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400"
              >
                Loading the scaffolder…
              </p>
            }
          >
            <GamestudioClient />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
