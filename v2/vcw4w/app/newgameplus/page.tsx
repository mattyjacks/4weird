import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { NewGamePlusBuilder } from "@/components/newgameplus/newgameplus-builder";

export const metadata: Metadata = {
  alternates: { canonical: "/newgameplus" },
  title: "NewGamePlus; type a prompt, ship a tested game | 4weird",
    description:
      "Type a game prompt, tune Quality (0-10) + Budget coins, and NewGamePlus generates an original HTML/CSS/JS game, pushes it to the Draft folder in your org, and executes a real local playtest (boot, frames, input, HUD) with optional VibeCodeWorker ledger verify. Best quality, lowest price, greatest speed.",
};

export default function NewGamePlusPage() {
  return (
    <main className="flex h-screen flex-col overflow-hidden bg-slate-950 text-white">
      <section className="mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col px-3 py-2">
        <CachedNewGamePlusIntro />
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
          {/* Interactive builder (per-user session state, API-backed): dynamic
              island streaming behind the fallback; never cached. */}
          <Suspense fallback={<p className="text-sm text-slate-400">Loading the game builder…</p>}>
            <NewGamePlusBuilder />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

// Static marketing copy: no per-user data, cached hourly.
async function CachedNewGamePlusIntro() {
  "use cache";
  cacheLife("hours");
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">NewGamePlus</p>
      <h1 className="text-lg font-black">Type a prompt. Get a tested game.</h1>
      <details className="group relative">
        <summary className="cursor-pointer list-none rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2 py-0.5 text-xs font-bold text-cyan-300 marker:hidden hover:bg-cyan-400/20">
          ⓘ How it works
        </summary>
        <div className="absolute left-0 z-20 mt-1 w-80 rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs leading-relaxed text-slate-300 shadow-xl">
          VibeCodeWorker + every related service in one launch: a bot symphony (Scout → Forge → Pixel → Echo → Sage) builds an original HTML/CSS/JS game, intelligently shortlists the fal.ai media the prompt needs, pushes it to the{" "}
          <b>Draft</b> game folder inside your org, then executes a real local playtest of it
          (boot the canvas, pump frames, drive input, observe HUD — observe → reason → act repair loops, with optional VCW ledger verify). Quality 0-10 (default 5) · Budget 100 coins default (1-10,000;
          above 250 triggers Confirm the Amount). Each build auto-approves up to your 20-coin ceiling (configurable, max 250) and asks permission above it. Fast lane (≤250 coins) finishes in ≤5 minutes; deluxe budgets run longer but stay fast. Cheapest viable build, newest viable runtime, 25% cut included
          - and it succeeds.
        </div>
      </details>
    </div>
  );
}
