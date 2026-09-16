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
      {/* Sticky launch header: generation stays 1-click accessible at y:0. */}
      <CachedLaunchHeader />
      {/* Split cockpit: prompt rail (left 45%) + live builder (right 55%).
          Single scroll column on mobile; independent per-column scroll on lg
          for a zero-page-scroll cockpit. */}
      <section className="mx-auto grid min-h-0 w-full max-w-6xl flex-1 grid-cols-1 gap-2 overflow-y-auto px-3 py-2 lg:grid-cols-[45%_55%] lg:overflow-hidden">
        <CachedPromptRail />
        <div id="ngp-builder" className="min-h-0 scroll-mt-20 lg:overflow-y-auto">
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

// Static launch bar: no per-user data, cached hourly. The real launch control
// lives in the builder island below; this sticky anchor jumps straight to it.
async function CachedLaunchHeader() {
  "use cache";
  cacheLife("hours");
  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-white/10 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">NewGamePlus</p>
        <h1 className="text-sm font-black">Type a prompt. Get a tested game.</h1>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-slate-400">
          Fast lane ≤5 min · auto-approve ≤20
        </span>
        <a
          href="#ngp-builder"
          className="ml-auto rounded-full bg-cyan-400 px-3 py-1 text-xs font-black text-slate-950 hover:bg-cyan-300"
        >
          ⚡ Launch NewGamePlus
        </a>
        <details className="group relative">
          <summary className="cursor-pointer list-none rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2 py-0.5 text-xs font-bold text-cyan-300 marker:hidden hover:bg-cyan-400/20">
            ⓘ How it works
          </summary>
          <div className="absolute right-0 z-20 mt-1 w-80 rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs leading-relaxed text-slate-300 shadow-xl">
            VibeCodeWorker + every related service in one launch: a bot symphony (Scout → Forge → Pixel → Echo → Sage) builds an original HTML/CSS/JS game, intelligently shortlists the fal.ai media the prompt needs, pushes it to the{" "}
            <b>Draft</b> game folder inside your org, then executes a real local playtest of it
            (boot the canvas, pump frames, drive input, observe HUD — observe → reason → act repair loops, with optional VCW ledger verify). Quality 0-10 (default 5) · Budget 100 coins default (1-10,000;
            above 250 triggers Confirm the Amount). Each build auto-approves up to your 20-coin ceiling (configurable, max 250) and asks permission above it. Fast lane (≤250 coins) finishes in ≤5 minutes; deluxe budgets run longer but stay fast. Cheapest viable build, newest viable runtime, 25% cut included
            - and it succeeds.
          </div>
        </details>
      </div>
    </header>
  );
}

// Static prompt rail: layout-level pairing hints + tuning drawer. No per-user
// data, cached hourly. All live controls stay in the builder island.
async function CachedPromptRail() {
  "use cache";
  cacheLife("hours");
  return (
    <aside className="min-h-0 lg:overflow-y-auto lg:pr-1">
      {/* Compact 2-column inline grid: paired control hints. */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
          <p className="font-bold text-slate-200">Budget</p>
          <p className="text-slate-400">100 default · 1–10,000 · &gt;250 confirms</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
          <p className="font-bold text-slate-200">Auto-approve</p>
          <p className="text-slate-400">≤20 auto-builds · ceiling max 250</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
          <p className="font-bold text-slate-200">Archetype</p>
          <p className="text-slate-400">Pick a game shape in the builder</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
          <p className="font-bold text-slate-200">Draft folder</p>
          <p className="text-slate-400">Ships to your org&apos;s Draft folder</p>
        </div>
      </div>
      {/* Collapsible prompt-tuning drawer: secondary tuning guidance. */}
      <details className="mt-2 rounded-lg border border-white/10 bg-white/[0.02] p-2 text-xs">
        <summary className="cursor-pointer font-bold text-slate-200">
          🎛 Prompt tuning
        </summary>
        <p className="mt-1 leading-relaxed text-slate-400">
          Quality 0–10 (default 5) trades build depth against spend; deluxe
          budgets run longer but stay fast. Style notes, seed, and temperature
          live on the builder form — describe art direction and mechanics in
          the prompt, then tune spend with Budget + auto-approve.
        </p>
      </details>
      <details className="mt-2 rounded-lg border border-white/10 bg-white/[0.02] p-2 text-xs">
        <summary className="cursor-pointer font-bold text-slate-200">
          Fast vs deluxe?
        </summary>
        <p className="mt-1 leading-relaxed text-slate-400">
          Fast lane (≤250 coins) finishes in ≤5 minutes. Deluxe budgets run
          longer with deeper repair loops. Every build auto-approves up to
          your 20-coin ceiling and asks permission above it.
        </p>
      </details>
    </aside>
  );
}
