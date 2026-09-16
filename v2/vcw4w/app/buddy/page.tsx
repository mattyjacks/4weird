import { cacheLife, cacheTag } from "next/cache";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GamingBuddy } from "@/components/buddy/gaming-buddy";
import { BUDDY_DEFAULT_VOICE, BUDDY_VOICES } from "@/lib/game-ai";
import { games, getGame } from "@/content/games";

export const metadata: Metadata = {
  alternates: { canonical: "/buddy" },
  title: "Gaming Buddy | 4weird Games",
  description:
    "Your universal screen-aware Gaming Buddy: talks while you play in 9 OpenAI voices (Nova by default), reads the screen with your permission, reacts to the action. Metered at true cost in Vibe Coins with the 25% cut included.",
  openGraph: {
    title: "Gaming Buddy - Screen-Aware AI Voice Companion | 4weird",
    description:
      "Your universal screen-aware Gaming Buddy: talks while you play in 9 OpenAI voices, reads the screen with your permission, reacts to the action.",
    images: [
      {
        url: "/og/og-buddy.png",
        width: 1200,
        height: 630,
        alt: "4weird Gaming Buddy - AI Voice Companion",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gaming Buddy - Screen-Aware AI Voice Companion | 4weird",
    description:
      "Your universal screen-aware Gaming Buddy: talks while you play in 9 OpenAI voices, reads the screen with your permission, reacts to the action.",
    images: ["/og/og-buddy.png"],
  },
};

const PICKER_SLUGS = ["lobby", "gravegain2dA", "gravegain3d", "lastwordszombies", "assassinanimals", "battlesharks2", "platform-wars", "overtake", "serversavershield"] as const;

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

export default function BuddyPage({ searchParams }: { searchParams?: Promise<{ game?: string }> }) {
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
      <main className="mx-auto max-w-6xl px-4 py-4">
        {/* Compact header: back link + title + 1-line pitch, no hero */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link href="/games" className="text-xs font-semibold text-cyan-300 hover:underline">
            ← All games
          </Link>
          <h1 className="text-xl font-black tracking-tight">🎧 Gaming Buddy</h1>
          <span className="rounded-full bg-violet-300/15 px-2 py-0.5 text-[11px] font-bold text-violet-200">Universal companion · 9 voices · Nova default</span>
        </div>
        <p className="mt-1 max-w-4xl text-xs text-slate-400">
          One buddy for every game. With your permission it sees this tab only, reacts to score changes, and talks back -
          same observe→reason→act engine as VibeCodeWorker. Turns meter Vibe Coins at true cost (25% cut included), live below + on{" "}
          <Link href="/my/usage/" className="text-cyan-300 hover:underline">/my/usage/</Link>.
        </p>

        {/* searchParams is request-time data: it is awaited inside the
            boundary below, so everything above stays in the static shell. */}
        <Suspense
          fallback={
            <p role="status" className="mt-3 rounded-xl border border-white/10 bg-white/[.03] p-3 text-xs text-slate-400">
              Loading the game picker…
            </p>
          }
        >
          <BuddyGameSection searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

// Dynamic island: resolves ?game= at request time (never cached), then renders
// the combobox, the per-user GamingBuddy widget, and the cached guide copy.
async function BuddyGameSection({ searchParams }: { searchParams?: Promise<{ game?: string }> }) {
  const raw = (await searchParams)?.game?.toLowerCase() ?? "lobby";
  const picked = raw === "lobby" ? null : getGame(raw);
  const gameSlug = picked ? picked.slug : "lobby";
  const gameTitle = picked ? picked.title : "4weird lobby";
  const options = pickerGames();

  return (
    <>
      {/* 38px searchable combobox: native input+datalist, zero JS, same ?game= selector logic */}
      <form action="/buddy" method="get" role="search" aria-label="Pick a game" className="mt-2 flex items-center gap-2">
        <input
          name="game"
          list="buddy-game-list"
          defaultValue={gameSlug === "lobby" ? "" : gameSlug}
          placeholder={`🔍 Select game (e.g. GraveGain, Xonotic, Fridge)… watching: ${gameTitle}`}
          aria-label="Select game for Buddy to watch"
          className="h-[38px] w-full rounded-lg border border-white/15 bg-black/30 px-3 text-sm text-white placeholder:text-slate-500"
        />
        <datalist id="buddy-game-list">
          {options.map((o) => (
            <option key={o.slug} value={o.slug}>{`${o.emoji} ${o.title}`}</option>
          ))}
        </datalist>
        <button type="submit" className="h-[38px] shrink-0 rounded-lg bg-violet-300 px-4 text-sm font-bold text-slate-950">
          Watch
        </button>
        {picked && (
          <Link href={`/games/${picked.slug}/play`} className="h-[38px] inline-flex shrink-0 items-center rounded-lg border border-cyan-300/40 px-3 text-xs font-semibold text-cyan-200 hover:bg-cyan-300/10">
            Open {picked.title} →
          </Link>
        )}
      </form>

      {/* 1-row hardware setup ribbon (layout only): Mic / Cam / Share toggles live in the widget below;
          this strip keeps session launch zero-scroll with no wiring changes. */}
      <div aria-label="Session hardware setup" className="mt-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-white/[.02] px-2 py-1.5 text-[11px] font-bold">
        <span className="px-1 text-slate-400">Session hardware:</span>
        <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-slate-200">🎙 Mic: toggle in widget</span>
        <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-slate-200">📹 Cam: toggle in widget</span>
        <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-slate-200">🖥 Share Screen: one click in widget</span>
        <a href="#buddy-session" className="ml-auto rounded-full bg-violet-300 px-2 py-0.5 text-slate-950">⤓ Jump to launcher</a>
      </div>

      {/* 2-col single screen: config widget | live status console */}
      <div id="buddy-session" className="mt-2 grid gap-2 lg:grid-cols-2">
        <div className="min-w-0" key={gameSlug}>
          <GamingBuddy gameSlug={gameSlug} gameTitle={gameTitle} />
        </div>
        <aside aria-label="Live companion status" className="min-w-0 rounded-2xl border border-white/10 bg-white/[.03] p-3 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold">📡 Live status</h2>
            <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-bold text-emerald-200">watching: {gameTitle}</span>
          </div>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-300">
            <li className="rounded-lg border border-white/10 bg-black/30 p-2"><b className="text-white">◉ Waveform / voice:</b> live mic + reply audio meters render in the widget while a session runs. Type <code className="text-cyan-300">/vibe</code> to match your energy.</li>
            <li className="rounded-lg border border-white/10 bg-black/30 p-2"><b className="text-white">👁️ Screen share:</b> off by default. Press <b>Share this tab only</b> in the widget - at most one JPEG snapshot per message, never stored.</li>
            <li className="rounded-lg border border-white/10 bg-black/30 p-2"><b className="text-white">💰 Spend:</b> every turn shows Coins + CentiCentCoins; the ledger on <Link href="/my/usage/" className="text-cyan-300 hover:underline">/my/usage/</Link> is authoritative. 402 = top up, turn rejected before spend.</li>
            <li className="rounded-lg border border-white/10 bg-black/30 p-2"><b className="text-white">⌨️ Shortcuts:</b> <code className="text-cyan-300">/tactics</code> tip · <code className="text-cyan-300">/hail</code> taunt · <code className="text-cyan-300">/react</code> screen react · <code className="text-cyan-300">/vibe</code> camera energy. Ctrl+Enter sends, Esc clears.</li>
          </ul>
          {picked && (
            <p className="mt-2 text-xs text-slate-400">
              Playing now?{" "}
              <Link href={`/games/${picked.slug}/play`} className="font-semibold text-cyan-300 hover:underline">
                Open {picked.title} in the play shell →
              </Link>{" "}
              Buddy also lives at the bottom of every play page.
            </p>
          )}
        </aside>
      </div>

      <BuddyGuide gameTitle={gameTitle} />
    </>
  );
}

// Evergreen marketing copy (voices, pricing, FAQ): static module constants,
// cached per game title (the only varying prop) with an hours lifetime.
// Collapsed into <details> so setup + session stay zero-scroll.
async function BuddyGuide({ gameTitle }: { gameTitle: string }) {
  "use cache";
  cacheLife("hours");
  cacheTag("studio");

  const detailCls = "mt-2 rounded-xl border border-white/10 bg-white/[.02] px-3 py-2 text-xs text-slate-300";
  const summaryCls = "cursor-pointer text-sm font-bold text-white";
  return (
    <div className="pb-4">
      <details className={detailCls} open={false}>
        <summary className={summaryCls}>⚙️ Customize Appearance &amp; Voice</summary>
        <p className="mt-1 text-slate-400">
          Avatar, TTS voice, and personality live in the session widget above (no page scroll needed) — pick a
          voice below to preview free, then set it in the widget when you start. Component-owned meters
          (waveform, token burn) render in-widget; queued as handoff, not touched here.
        </p>
      </details>
      <details className={detailCls}>
        <summary className={summaryCls}>How it works (4 steps) — for {gameTitle}</summary>
        <ol className="mt-2 grid gap-2 sm:grid-cols-4">
          <li className="rounded-lg border border-white/10 bg-black/30 p-2"><b className="text-white">1. Start.</b> Open a session - Buddy greets you for {gameTitle} and the clock starts.</li>
          <li className="rounded-lg border border-white/10 bg-black/30 p-2"><b className="text-white">2. Observe.</b> Buddy reads headings, score events, and - only if you share - one snapshot per message.</li>
          <li className="rounded-lg border border-white/10 bg-black/30 p-2"><b className="text-white">3. Reason + act.</b> The answer streams word-by-word, then speaks in your voice. Interrupt anytime.</li>
          <li className="rounded-lg border border-white/10 bg-black/30 p-2"><b className="text-white">4. Meter.</b> Every turn shows Coins + CentiCentCoins; the ledger on /my/usage/ is authoritative.</li>
        </ol>
      </details>

      <details className={detailCls}>
        <summary className={summaryCls}>9 voices (Nova by default)</summary>
        <p className="mt-1 text-slate-400">Preview any voice free from the widget - no session, no coins.</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-3">
          {BUDDY_VOICES.map((v) => (
            <li key={v.id} className="rounded-lg border border-white/10 bg-black/30 p-2">
              <b className="text-white">{v.label}</b> <small className="text-slate-500">{v.tone}</small>
              {v.id === BUDDY_DEFAULT_VOICE && <small className="ml-1 text-cyan-300">default</small>}
              <br />
              <span className="text-slate-400">{v.blurb}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-slate-400">
          Models: tts-1 (fast, $15/1M chars) + tts-1-hd (rich, $30/1M chars). Speeds 0.5x-2.0x. Chat runs on{" "}
          <code className="text-cyan-300">BUDDY_MODEL</code> (default gpt-4o-mini). Every turn is metered at true
          upstream cost plus database writes, converted to gross coins with the 25% cut included and shown per
          turn in Coins + CentiCentCoins (100 centicentcoins = 1 coin).
        </p>
      </details>

      <details className={detailCls}>
        <summary className={summaryCls}>💰 True-cost pricing (25% cut included, never on top)</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                <th className="py-1 pr-3">What</th>
                <th className="py-1 pr-3">Unit</th>
                <th className="py-1 pr-3">Gross</th>
                <th className="py-1">Notes</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-t border-white/10"><td className="py-1 pr-3 font-semibold text-white">Chat turn</td><td className="py-1 pr-3">tokens + snapshot</td><td className="py-1 pr-3">~0.01+ coins</td><td className="py-1">Prompt + reply + optional 1k-token image + DB leg</td></tr>
              <tr className="border-t border-white/10"><td className="py-1 pr-3 font-semibold text-white">Voice reply</td><td className="py-1 pr-3">chars</td><td className="py-1 pr-3">~0.01+ coins</td><td className="py-1">tts-1 vs tts-1-hd rate + DB leg; browser speech is free</td></tr>
              <tr className="border-t border-white/10"><td className="py-1 pr-3 font-semibold text-white">3D avatar</td><td className="py-1 pr-3">minute</td><td className="py-1 pr-3">8 centicentcoins</td><td className="py-1">Only while visible; hidden = free</td></tr>
              <tr className="border-t border-white/10"><td className="py-1 pr-3 font-semibold text-white">Camera frame</td><td className="py-1 pr-3">frame</td><td className="py-1 pr-3">3 centicentcoins</td><td className="py-1">One frame per message you send, never silent</td></tr>
              <tr className="border-t border-white/10"><td className="py-1 pr-3 font-semibold text-white">Local fallback</td><td className="py-1 pr-3">reply</td><td className="py-1 pr-3">free</td><td className="py-1">When AI is unavailable; browser speech included</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-slate-400">
          Wallet running low? Turns fail fast with a 402 before any AI spend.{" "}
          <Link href="/my/usage/" className="text-cyan-300 hover:underline">Check /my/usage/ →</Link>
        </p>
      </details>

      <details className={detailCls}>
        <summary className={summaryCls}>👁️ Screen sharing is your choice</summary>
        <p className="mt-1 leading-relaxed">
          The buddy works from game text + score events without any permission. If you want it to actually{" "}
          <em>see</em> the game, start a session and press <b>Share this tab only</b> - the browser picker is
          constrained to this 4weird tab, so other tabs, windows, and apps stay private. At most one small JPEG
          snapshot per message is sent to the model (never video, never stored) - unchanged screens skip the
          re-upload so the turn answers faster, and when screen + camera ride one turn the model sees both;
          stop sharing anytime from the
          widget or the browser bar. Snapshot turns carry a small image-token charge, itemized in that turn&apos;s
          cost line.
        </p>
      </details>

      <details className={detailCls}>
        <summary className={summaryCls}>❓ FAQ</summary>
        <dl className="mt-2 space-y-2">
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
      </details>

      <details className={detailCls}>
        <summary className={summaryCls}>🛠️ Troubleshooting</summary>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li><b className="text-white">“Authentication required” / sign-in box:</b> Buddy is metered per account - sign in, then Start.</li>
          <li><b className="text-white">“Insufficient balance” (402):</b> top up; the turn was rejected before any AI spend.</li>
          <li><b className="text-white">“Rate limited”:</b> wait ~60s; the widget shows the countdown and your wallet was not charged.</li>
          <li><b className="text-white">No frame was ready:</b> the share preview is empty - re-pick the tab and resend (no image charge).</li>
          <li><b className="text-white">Mic blocked:</b> allow mic in the browser bar, or keep typing - everything works typed.</li>
          <li><b className="text-white">No voice audio:</b> check the mute/volume, then use 🔊 Replay; fallback replies always use browser speech.</li>
        </ul>
      </details>
    </div>
  );
}
