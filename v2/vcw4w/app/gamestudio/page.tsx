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
    <main className="bg-slate-950 text-white">
      <section className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-300">
            4WEIRD // GAMESTUDIO
          </p>
          <h1 className="text-xl font-black">GameStudio</h1>
          <p className="ml-auto text-[11px] text-slate-500">
            Browser-only scaffolder -{" "}
            <Link href="/gamestudio/debugplay" className="font-bold text-emerald-300 hover:underline">
              DebugPlay
            </Link>{" "}
            -{" "}
            <Link href="/vibecodeworker" className="font-bold text-emerald-300 hover:underline">
              VibeCodeWorker
            </Link>{" "}
            -{" "}
            <Link href="/submit" className="font-bold text-emerald-300 hover:underline">
              Submit
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
