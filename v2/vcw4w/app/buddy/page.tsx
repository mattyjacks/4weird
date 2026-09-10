import type { Metadata } from "next";
import Link from "next/link";
import { GamingBuddy } from "@/components/buddy/gaming-buddy";
import { BUDDY_VOICES } from "@/lib/game-ai";

export const metadata: Metadata = {
  title: "Gaming Buddy | 4weird Games",
  description:
    "Your universal screen-aware Gaming Buddy: talks while you play in 9 OpenAI voices, reads the screen, reacts to the action. Metered in Vibe Coins with the 25% cut included.",
};

export default function BuddyPage() {
  return (
    <div className="bg-slate-950 text-white">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <Link href="/games" className="text-sm font-semibold text-cyan-300 hover:underline">
          ← All games
        </Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-violet-300">Universal companion</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">🎧 Gaming Buddy</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-300">
          One buddy for every game. It reads your screen, reacts to score changes, and talks back in any of 9
          OpenAI voices — powered by the same observe→reason→act engine as VibeCodeWorker. Every turn meters
          Vibe Coins with the same 25% cut included, and your spend shows live below + on{" "}
          <Link href="/my/usage/" className="text-cyan-300 hover:underline">/my/usage/</Link>.
        </p>
        <div className="mt-6">
          <GamingBuddy gameSlug="lobby" gameTitle="4weird lobby" />
        </div>
        <section aria-label="Voices" className="mt-8 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-6">
          <h2 className="text-lg font-bold sm:text-xl">9 voices</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {BUDDY_VOICES.map((v) => (
              <li key={v.id} className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm">
                <b className="text-white">{v.label}</b> <small className="text-slate-500">{v.tone}</small>
                <br />
                <span className="text-slate-400">{v.blurb}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-slate-400">
            Models: tts-1 (fast) + tts-1-hd (rich). Speeds 0.5x–2.0x. Starting price $15/1M chars — settled in
            coins at 2 coins per 1k chars (buddy-tts), 25% cut included.
          </p>
        </section>
      </main>
    </div>
  );
}
