import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Playing games",
  description:
    "How to browse, play, save, rent game time, play as a guest, use Cheat Mode safely, and climb the leaderboards on 4weird Games.",
};

const h2 = "mt-10 text-2xl font-bold tracking-tight";
const p = "mt-3 text-muted-foreground leading-relaxed";

export default function PlayingGamesPage() {
  return (
    <article>
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-300">
        Docs · Play
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Playing games</h1>
      <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
        34 preserved browser games in isolated play shells — with guides, cloud saves,
        leaderboards, guest passes, and coin-metered rentals. A 5-hour session on default
        rates costs about 6 coins.
      </p>

      <h2 className={h2}>1. Browse the catalog (/games)</h2>
      <p className={p}>
        <Link className="underline" href="/games">/games</Link> lists all 34 titles with emoji, genre,
        and descriptions. Each game has a <strong className="text-foreground">detail page (/games/[slug])</strong> with
        its guide link (read it when present — it explains controls and scoring), metadata, the
        play-rate badge (what this game costs), and AI badges when the game uses dialogue bots, AI
        directors, or voice. The <strong className="text-foreground">play page (/games/[slug]/play)</strong> is the
        PlayGate shell around the isolated game frame; add <code>?match=</code> to join a match.
      </p>

      <h2 className={h2}>2. How game rentals meter (signed-in players)</h2>
      <p className={p}>
        Signed-in play never shows ads — it meters Vibe Coins instead, with the 25% cut already
        inside every figure. The model has two parts:
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
        <li><strong className="text-foreground">Load fee (default 1 coin per 1 MiB of fresh bytes):</strong> proportional to exact bytes — even loads under 1 MB pay their exact fraction, down to 1 centicentcoin (0.01 coins). Replaying the same version within 24 hours is never double-billed.</li>
        <li><strong className="text-foreground">Running play (default 1 coin/hr, billed per second from the first second):</strong> 1 coin/hr = 100 centicentcoins spread over 3,600 seconds. One-minute heartbeats bill only the delta. Every 5 hours a “still playing?” check asks you to confirm metering continues (the game keeps running either way).</li>
        <li><strong className="text-foreground">Developer rates 0–100:</strong> mapped game developers set their own coins-per-load and coins-per-hour (0 = free game). The public price list is always visible before you play.</li>
        <li><strong className="text-foreground">AI meters separately on top:</strong> dialogue, directors, voice, and Buddy turns bill per token/character/GPU-minute. See <Link className="underline" href="/docs/game-ai-buddy">Game AI &amp; Buddy</Link>.</li>
      </ul>
      <p className={p}>
        Worked example: a full 1 MiB first load (up to ~1 coin) + 5 hours of play (5 coins) ≈ 6 coins
        ≈ $0.06. Your day-1 daily bonus (5 coins) plus the 100-coin trial covers many sessions.
        Everything is itemized on <Link className="underline" href="/my/usage/">/my/usage/</Link>.
      </p>

      <h2 className={h2}>3. Guests: free play with skippable ads</h2>
      <p className={p}>
        Guests never pay and never need an account: request a guest pass for a game (IP-throttled —
        roughly 10/minute burst, 20/day) for <strong className="text-foreground">3 free loads per day</strong>,
        then keep playing by viewing instantly-skippable house ads, with an ad banner every 30 minutes
        mid-play. House ads rotate across coins, Buddy, clans, agents, testing, and network sites — and
        always offer an instant Skip. Trade-off: no cloud saves, no multiplayer/AI/Buddy. Signing up
        replaces ads with coin metering and unlocks everything.
      </p>

      <h2 className={h2}>4. Cloud saves (slots 1–3)</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
        <li>Three versioned slots per game, up to 1 MiB each. Save and load from the play shell; balances show coins + centicentcoins on /account.</li>
        <li><strong className="text-foreground">Cheat Mode warning:</strong> enabling cheats permanently marks that save (cheat_mode:true) as a database invariant — deleting and recreating the save cannot launder it. Marked saves are still playable but flagged. Use a throwaway slot for experiments.</li>
        <li>Cloud saves generally cannot be reset from the client; if a save is stuck, contact support (see <Link className="underline" href="/docs/faq">FAQ &amp; support</Link>) rather than hammering retries.</li>
      </ul>

      <h2 className={h2}>5. Telemetry + leaderboards</h2>
      <p className={p}>
        Gameplay emits events (kills, actions, active seconds) that power{" "}
        <Link className="underline" href="/leaderboards">/leaderboards</Link> — per-game boards showing
        handles and totals only, anonymous-friendly. No per-action surveillance feed: boards aggregate.
        Telemetry never decides billing; the rental session (start/heartbeat/end) does.
      </p>

      <h2 className={h2}>6. Lobbies + matches</h2>
      <p className={p}>
        <Link className="underline" href="/lobbies">/lobbies</Link> lists open matches and presence so you
        can find players and join via <code>?match=</code> links. Matchmaking, presence, friends, and
        direct messages are provided as-is and may change. For persistent teams and chat, join a clan
        instead (see <Link className="underline" href="/docs/clans">Clans</Link>).
      </p>

      <h2 className={h2}>7. Troubleshooting play issues</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
        <li><strong className="text-foreground">Game won&apos;t load:</strong> hard-refresh, try the guide link for browser requirements, then try a different game to isolate catalog vs. title issues.</li>
        <li><strong className="text-foreground">“Ad required” as guest:</strong> you used your 3 free daily loads — watch one skippable house ad to continue, or sign in for coin-metered ad-free play.</li>
        <li><strong className="text-foreground">Save too large:</strong> slots cap at 1 MiB — trim progress (fewer stored entities/screenshots) and retry.</li>
        <li><strong className="text-foreground">Billing question:</strong> open <Link className="underline" href="/my/usage/">/my/usage/</Link> first — session + total + per-game lines answer most “what did I pay?” questions.</li>
      </ul>

      <p className="mt-8 text-sm text-muted-foreground">
        Next: <Link className="underline" href="/docs/vibe-coins">Vibe Coins →</Link> ·{" "}
        <Link className="underline" href="/docs/game-ai-buddy">Game AI &amp; Buddy →</Link>
      </p>
    </article>
  );
}
