import type { Metadata } from "next";
import Link from "next/link";
import { GamingBuddy } from "@/components/buddy/gaming-buddy";
import { BUDDY_DEFAULT_VOICE, BUDDY_VOICES } from "@/lib/game-ai";
import { games, getGame } from "@/content/games";

export const metadata: Metadata = {
  alternates: { canonical: "/buddy" },
  title: "Gaming Buddy | 4weird Games",
  description:
    "Your universal screen-aware Gaming Buddy: talks while you play in 9 OpenAI voices (Nova by default), reads the screen with your permission, reacts to the action. Metered at true cost in Vibe Coins with the 25% cut included.",
};

const PICKER_SLUGS = ["lobby", "gravegain2d", "gravegain3d", "lastwordszombies", "assassinanimals", "battlesharks2", "platform-wars", "overtake", "serversavershield"] as const;

function pickerGames() {
  const out: { slug: string; title: string; emoji: string }[] = [{ slug: "lobby", title: "4weird lobby", emoji: "🎧" }];
  for (const slug of PICKER_SLUGS.slice(1)) {
    const g = getGame(slug);
    if (g) out.push({ slug: g.slug, title: g.title, emoji: g.emoji });
  }
  for (const g of games) {
    if (out.some((o) => o.slug === g.slug)) continue;
    out.push({ slug: g.slug, title: g.title, emoji: g.emoji });
  }
  return out;
}

export default async function BuddyPage({ searchParams }: { searchParams?: Promise<{ game?: string }> }) {
  const raw = (await searchParams)?.game?.toLowerCase() ?? "lobby";
  const picked = raw === "lobby" ? null : getGame(raw);
  const gameSlug = picked ? picked.slug : "lobby";
  const gameTitle = picked ? picked.title : "4weird lobby";
  const options = pickerGames();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "4weird Gaming Buddy",
    applicationCategory: "GameApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "VBC", description: "Metered per turn in Vibe Coins at true cost, 25% cut included." },
    description: "Screen-aware voice companion for 4weird games. 9 OpenAI voices, Nova by default.",
  };

  return (
    <div className="bg-slate-950 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <Link href="/games" className="text-sm font-semibold text-cyan-300 hover:underline">
          ← All games
        </Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-violet-300">Universal companion</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">🎧 Gaming Buddy</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-300">
          One buddy for every game. With your permission it sees your screen (this tab only, if you
          choose), reacts to score changes, and talks back in any of 9
          OpenAI voices (Nova by default) - powered by the same observe→reason→act engine as VibeCodeWorker. OpenAI + database turns meter
          Vibe Coins at true cost with the same 25% cut included, and your spend shows live below + on{" "}
          <Link href="/my/usage/" className="text-cyan-300 hover:underline">/my/usage/</Link>.
        </p>

        <section aria-label="Pick a game" className="mt-6 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-6">
          <h2 className="text-lg font-bold sm:text-xl">Pick which game Buddy watches</h2>
          <p className="mt-1 text-sm text-slate-400">
            Buddy tunes its greeting, tactics, and screen context per game. Currently watching:{" "}
            <b className="text-white">{gameTitle}</b>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {options.map((o) => (
              <Link
                key={o.slug}
                href={o.slug === "lobby" ? "/buddy" : `/buddy?game=${o.slug}`}
                aria-current={o.slug === gameSlug ? "true" : undefined}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  o.slug === gameSlug
                    ? "border-violet-300 bg-violet-300/20 text-white"
                    : "border-white/15 text-slate-300 hover:bg-white/10"
                }`}
              >
                {o.emoji} {o.title}
              </Link>
            ))}
          </div>
          {picked && (
            <p className="mt-3 text-sm text-slate-400">
              Playing now?{" "}
              <Link href={`/games/${picked.slug}/play`} className="font-semibold text-cyan-300 hover:underline">
                Open {picked.title} in the play shell →
              </Link>{" "}
              Buddy also lives at the bottom of every play page.
            </p>
          )}
        </section>

        <div className="mt-6" key={gameSlug}>
          <GamingBuddy gameSlug={gameSlug} gameTitle={gameTitle} />
        </div>

        <section aria-label="How it works" className="mt-4 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-6">
          <h2 className="text-lg font-bold sm:text-xl">How it works (4 steps)</h2>
          <ol className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-4">
            <li className="rounded-xl border border-white/10 bg-black/30 p-3"><b className="text-white">1. Start.</b> Open a session - Buddy greets you for {gameTitle} and the clock starts.</li>
            <li className="rounded-xl border border-white/10 bg-black/30 p-3"><b className="text-white">2. Observe.</b> Buddy reads headings, score events, and - only if you share - one snapshot per message.</li>
            <li className="rounded-xl border border-white/10 bg-black/30 p-3"><b className="text-white">3. Reason + act.</b> The answer streams word-by-word, then speaks in your voice. Interrupt anytime.</li>
            <li className="rounded-xl border border-white/10 bg-black/30 p-3"><b className="text-white">4. Meter.</b> Every turn shows Coins + CentiCentCoins; the ledger on /my/usage/ is authoritative.</li>
          </ol>
        </section>

        <section aria-label="Chat shortcuts" className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/[.04] p-5 sm:p-6">
          <h2 className="text-lg font-bold sm:text-xl">⌨️ Chat shortcuts</h2>
          <p className="mt-1 text-sm text-slate-400">Type these instead of full sentences. Ctrl+Enter sends, Esc clears the draft.</p>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <li className="rounded-xl border border-white/10 bg-black/30 p-3"><code className="text-cyan-300">/tactics</code> <span className="text-slate-300">- one fair tip for the current moment</span></li>
            <li className="rounded-xl border border-white/10 bg-black/30 p-3"><code className="text-cyan-300">/hail</code> <span className="text-slate-300">- enemy-commander taunt + counter-tactic</span></li>
            <li className="rounded-xl border border-white/10 bg-black/30 p-3"><code className="text-cyan-300">/react</code> <span className="text-slate-300">- react to the current screen in 1-2 lines</span></li>
            <li className="rounded-xl border border-white/10 bg-black/30 p-3"><code className="text-cyan-300">/vibe</code> <span className="text-slate-300">- read your camera frame, match your energy</span></li>
          </ul>
        </section>

        <section aria-label="Voices" className="mt-4 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-6">
          <h2 className="text-lg font-bold sm:text-xl">9 voices (Nova by default)</h2>
          <p className="mt-1 text-sm text-slate-400">Preview any voice free from the widget - no session, no coins.</p>
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
            Models: tts-1 (fast, $15/1M chars) + tts-1-hd (rich, $30/1M chars). Speeds 0.5x-2.0x. Chat runs on{" "}
            <code className="text-cyan-300">BUDDY_MODEL</code> (default gpt-4o-mini). Every turn is metered at true
            upstream cost plus database writes, converted to gross coins with the 25% cut included and shown per
            turn in Coins + CentiCentCoins (100 centicentcoins = 1 coin).
          </p>
        </section>

        <section aria-label="Pricing" className="mt-4 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-6">
          <h2 className="text-lg font-bold sm:text-xl">💰 True-cost pricing (25% cut included, never on top)</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3">What</th>
                  <th className="py-2 pr-3">Unit</th>
                  <th className="py-2 pr-3">Gross</th>
                  <th className="py-2">Notes</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-t border-white/10"><td className="py-2 pr-3 font-semibold text-white">Chat turn</td><td className="py-2 pr-3">tokens + snapshot</td><td className="py-2 pr-3">~0.01+ coins</td><td className="py-2">Prompt + reply + optional 1k-token image + DB leg</td></tr>
                <tr className="border-t border-white/10"><td className="py-2 pr-3 font-semibold text-white">Voice reply</td><td className="py-2 pr-3">chars</td><td className="py-2 pr-3">~0.01+ coins</td><td className="py-2">tts-1 vs tts-1-hd rate + DB leg; browser speech is free</td></tr>
                <tr className="border-t border-white/10"><td className="py-2 pr-3 font-semibold text-white">3D avatar</td><td className="py-2 pr-3">minute</td><td className="py-2 pr-3">8 centicentcoins</td><td className="py-2">Only while visible; hidden = free</td></tr>
                <tr className="border-t border-white/10"><td className="py-2 pr-3 font-semibold text-white">Camera frame</td><td className="py-2 pr-3">frame</td><td className="py-2 pr-3">3 centicentcoins</td><td className="py-2">One frame per message you send, never silent</td></tr>
                <tr className="border-t border-white/10"><td className="py-2 pr-3 font-semibold text-white">Local fallback</td><td className="py-2 pr-3">reply</td><td className="py-2 pr-3">free</td><td className="py-2">When AI is unavailable; browser speech included</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-slate-400">
            Wallet running low? Turns fail fast with a 402 before any AI spend.{" "}
            <Link href="/my/usage/" className="text-cyan-300 hover:underline">Check /my/usage/ →</Link>
          </p>
        </section>

        <section aria-label="Screen sharing" className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/[.04] p-5 sm:p-6">
          <h2 className="text-lg font-bold sm:text-xl">👁️ Screen sharing is your choice</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            The buddy works from game text + score events without any permission. If you want it to actually{" "}
            <em>see</em> the game, start a session and press <b>Share this tab only</b> - the browser picker is
            constrained to this 4weird tab, so other tabs, windows, and apps stay private. At most one small JPEG
            snapshot per message is sent to the model (never video, never stored) - unchanged screens skip the
            re-upload so the turn answers faster, and when screen + camera ride one turn the model sees both;
            stop sharing anytime from the
            widget or the browser bar. Snapshot turns carry a small image-token charge, itemized in that turn&apos;s
            cost line.
          </p>
        </section>

        <section aria-label="FAQ" className="mt-4 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-6">
          <h2 className="text-lg font-bold sm:text-xl">❓ FAQ</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div><dt className="font-bold text-white">Do I have to share my screen?</dt><dd className="mt-0.5 text-slate-300">No. Buddy reacts to game text + score with zero permissions. Sharing only makes its reactions visual.</dd></div>
            <div><dt className="font-bold text-white">Is my screen/mic/camera recorded?</dt><dd className="mt-0.5 text-slate-300">No. One snapshot/frame per message you send, used for that turn only, never stored. Mic audio never leaves the device - only transcripts do.</dd></div>
            <div><dt className="font-bold text-white">Why did my turn cost 0 / show “local · free”?</dt><dd className="mt-0.5 text-slate-300">The AI provider was unreachable, so Buddy answered locally with browser speech. Free turns never touch your wallet.</dd></div>
            <div><dt className="font-bold text-white">Can I interrupt Buddy?</dt><dd className="mt-0.5 text-slate-300">Yes - enable the mic and just talk. Buddy stops, keeps both sides of the interruption, and resumes from your cut-in.</dd></div>
            <div><dt className="font-bold text-white">I reloaded mid-session - is my session lost?</dt><dd className="mt-0.5 text-slate-300">No. The widget lists your still-open sessions with a Resume button; the ledger keeps every metered turn either way.</dd></div>
            <div><dt className="font-bold text-white">Does Buddy remember me?</dt><dd className="mt-0.5 text-slate-300">Only if you toggle “Remember me”. Then it keeps a short rolling note per game (your words, no screen dumps, auto-trimmed) - zero AI cost, never shared.</dd></div>
            <div><dt className="font-bold text-white">Can Buddy talk on its own?</dt><dd className="mt-0.5 text-slate-300">Only if you enable auto-reacts: big score jumps trigger one metered reaction, spaced 60s apart, max 10 per session. Off by default.</dd></div>
            <div><dt className="font-bold text-white">What are one-click delegations?</dt><dd className="mt-0.5 text-slate-300">Shortcuts over specialists that already exist: coach tips and taunts (buddy turns), theme music, posters, and voice lines (quoted Fal media), plus a jump into the play shell.</dd></div>
            <div><dt className="font-bold text-white">What is a Super-pack?</dt><dd className="mt-0.5 text-slate-300">One goal fanned out to specialist writers (coach, hype, voice, lore, sfx, quest, herald) in parallel, merged into a single pack you can speak, copy, or turn into Fal media. Each live leg meters ~1 centicentcoin; offline legs are free and labelled.</dd></div>
            <div><dt className="font-bold text-white">Do answers stream?</dt><dd className="mt-0.5 text-slate-300">Yes - first words render live while the model still writes; metering lands before the turn completes, and screen-reader announcements wait for the full reply.</dd></div>
          </dl>
        </section>

        <section aria-label="Troubleshooting" className="mt-4 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-6">
          <h2 className="text-lg font-bold sm:text-xl">🛠️ Troubleshooting</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-300">
            <li><b className="text-white">“Authentication required” / sign-in box:</b> Buddy is metered per account - sign in, then Start.</li>
            <li><b className="text-white">“Insufficient balance” (402):</b> top up; the turn was rejected before any AI spend.</li>
            <li><b className="text-white">“Rate limited”:</b> wait ~60s; the widget shows the countdown and your wallet was not charged.</li>
            <li><b className="text-white">No frame was ready:</b> the share preview is empty - re-pick the tab and resend (no image charge).</li>
            <li><b className="text-white">Mic blocked:</b> allow mic in the browser bar, or keep typing - everything works typed.</li>
            <li><b className="text-white">No voice audio:</b> check the mute/volume, then use 🔊 Replay; fallback replies always use browser speech.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
