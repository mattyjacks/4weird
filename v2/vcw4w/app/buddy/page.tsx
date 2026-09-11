import type { Metadata } from "next";
import Link from "next/link";
import { GamingBuddy } from "@/components/buddy/gaming-buddy";
import { BUDDY_DEFAULT_VOICE, BUDDY_VOICES } from "@/lib/game-ai";

export const metadata: Metadata = {
  title: "Gaming Buddy | 4weird Games",
  description:
    "Your universal screen-aware Gaming Buddy: talks while you play in 9 OpenAI voices (Nova by default), reads the screen with your permission, reacts to the action. Metered at true cost in Vibe Coins with the 25% cut included.",
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
          One buddy for every game. With your permission it sees your screen (this tab only, if you
          choose), reacts to score changes, and talks back in any of 9
          OpenAI voices (Nova by default) — powered by the same observe→reason→act engine as VibeCodeWorker. OpenAI + database turns meter
          Vibe Coins at true cost with the same 25% cut included, and your spend shows live below + on{" "}
          <Link href="/my/usage/" className="text-cyan-300 hover:underline">/my/usage/</Link>.
        </p>
        <div className="mt-6">
          <GamingBuddy gameSlug="lobby" gameTitle="4weird lobby" />
        </div>
        <section aria-label="Voices" className="mt-8 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-6">
          <h2 className="text-lg font-bold sm:text-xl">9 voices (Nova by default)</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {BUDDY_VOICES.map((v) => (
              <li key={v.id} className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm">
                <b className="text-white">{v.label}</b> <small className="text-slate-500">{v.tone}</small>
                {v.id === BUDDY_DEFAULT_VOICE && <small className="ml-1 text-cyan-300">default</small>}
                <br />
                <span className="text-slate-400">{v.blurb}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-slate-400">
            Models: tts-1 (fast, $15/1M chars) + tts-1-hd (rich, $30/1M chars). Speeds 0.5x–2.0x. Chat runs on{" "}
            <code className="text-cyan-300">BUDDY_MODEL</code> (default gpt-4o-mini). Every turn is metered at true
            upstream cost plus database writes, converted to gross coins with the 25% cut included and shown per
            turn in Coins + CentiCentCoins (100 centicentcoins = 1 coin).
          </p>
        </section>
        <section aria-label="Screen sharing" className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/[.04] p-5 sm:p-6">
          <h2 className="text-lg font-bold sm:text-xl">👁️ Screen sharing is your choice</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            The buddy works from game text + score events without any permission. If you want it to actually{" "}
            <em>see</em> the game, start a session and press <b>Share this tab only</b> — the browser picker is
            constrained to this 4weird tab, so other tabs, windows, and apps stay private. Only one downscaled
            snapshot per message is sent to the model (never video, never stored); stop sharing anytime from the
            widget or the browser bar. Snapshot turns carry a small image-token charge, itemized in that turn&apos;s
            cost line.
          </p>
        </section>
      </main>
    </div>
  );
}
