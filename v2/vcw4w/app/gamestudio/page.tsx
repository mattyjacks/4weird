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
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-5xl px-5 py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">
          4WEIRD // GAMESTUDIO
        </p>
        <h1 className="mt-2 text-4xl font-black">GameStudio</h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          Scaffold a new game project in seconds — name it, pick a template,
          pin a Godot version, then download a ready-to-open{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-sm text-emerald-200">
            project.json
          </code>{" "}
          plus a starter README. Everything runs in your browser; nothing is
          uploaded or stored. Related:{" "}
          <Link href="/gamestudio/debugplay" className="font-bold text-emerald-300 hover:underline">
            DebugPlay
          </Link>{" "}
          ·{" "}
          <Link href="/vibecodeworker" className="font-bold text-emerald-300 hover:underline">
            VibeCodeWorker
          </Link>{" "}
          ·{" "}
          <Link href="/submit" className="font-bold text-emerald-300 hover:underline">
            Submit
          </Link>{" "}
          ·{" "}
          <Link href="/tools" className="font-bold text-emerald-300 hover:underline">
            Tools
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
