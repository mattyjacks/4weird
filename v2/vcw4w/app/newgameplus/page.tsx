import type { Metadata } from "next";
import { NewGamePlusBuilder } from "@/components/newgameplus/newgameplus-builder";

export const metadata: Metadata = {
  alternates: { canonical: "/newgameplus" },
  title: "NewGamePlus; type a prompt, ship a tested game | 4weird",
    description:
      "Type a game prompt, tune Quality (0-10) + Budget coins, and NewGamePlus generates an original HTML/CSS/JS game, pushes it to the Draft folder in your org, and executes a real local playtest (boot, frames, input, HUD) with optional VibeCodeWorker ledger verify. Best quality, lowest price, greatest speed.",
};

export default function NewGamePlusPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">NewGamePlus</p>
        <h1 className="mt-2 text-4xl font-black">Type a prompt. Get a tested game.</h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          VibeCodeWorker + every related service in one launch: a bot symphony (Scout → Forge → Pixel → Echo → Sage) builds an original HTML/CSS/JS game, intelligently shortlists the fal.ai media the prompt needs, pushes it to the{" "}
          <b>Draft</b> game folder inside your org, then executes a real local playtest of it
          (boot the canvas, pump frames, drive input, observe HUD — observe → reason → act repair loops, with optional VCW ledger verify). Quality 0-10 (default 5) · Budget 100 coins default (1-10,000;
          above 250 triggers Confirm the Amount). Fast lane (≤250 coins) finishes in ≤5 minutes; deluxe budgets run longer but stay fast. Cheapest viable build, newest viable runtime, 25% cut included
 - and it succeeds.
        </p>
        <div className="mt-8">
          <NewGamePlusBuilder />
        </div>
      </section>
    </main>
  );
}
