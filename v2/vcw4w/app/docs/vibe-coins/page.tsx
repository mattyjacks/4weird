import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Vibe Coins",
  description:
    "The 4weird coin economy: 100 coins = $1.00, packs, custom amounts, daily bonus, referrals, trial, checkout, balance, and where every coin goes.",
};

const h2 = "mt-10 text-2xl font-bold tracking-tight";
const p = "mt-3 text-muted-foreground leading-relaxed";

export default function VibeCoinsPage() {
  return (
    <article>
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-300">
        Docs · Economy
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Vibe Coins 🪙</h1>
      <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
        One coin economy across games, clans, bots, agents, and teams:{" "}
        <strong className="text-foreground">100 coins = exactly $1.00</strong> ($0.01/coin).
        Every price already includes the 25% platform cut — never added on top.
      </p>

      <h2 className={h2}>1. The promise in one paragraph</h2>
      <p className={p}>
        A coin is worth a cent. A dollar buys 100 coins. When you pay 400 coins ($4.00) for compute,
        100 goes to the platform and 300 to the provider — but you only ever see the gross 400. The
        same rule covers game rentals, clan posting fees, game AI, Buddy turns, and team cloud. Your
        receipt is <Link className="underline" href="/my/usage/">/my/usage/</Link>: session, total,
        last-hour, last-24h, by-kind, by-game, and combined 25/75 totals.
      </p>

      <h2 className={h2}>2. Getting coins</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
        <li><strong className="text-foreground">Free 100-coin ($1.00) trial:</strong> automatic on signup, once per person. There is intentionally no 100-coin pack for sale.</li>
        <li><strong className="text-foreground">Packs:</strong> 500 ($5) · 1,500 ($15) · 5,000 ($50) · 25,000 ($250), plus <strong className="text-foreground">custom 500–100,000</strong> at 1¢/coin. Browse on <Link className="underline" href="/pricing">/pricing</Link>, buy from <Link className="underline" href="/account">/account</Link>.</li>
        <li><strong className="text-foreground">Daily login bonus:</strong> 5 coins + 1 per streak day, capped at 12, once per UTC day. Claim from /account.</li>
        <li><strong className="text-foreground">Referrals (25/25):</strong> share your 8-character code; when someone redeems it you both get 25 coins. One use per invitee, no self-use.</li>
        <li><strong className="text-foreground">Checkout:</strong> powered by Shopify under their terms; paid grants reconcile by order email with anti-double-mint guards. If a paid grant doesn&apos;t appear, use the attach-by-email recovery on /account before contacting support.</li>
      </ul>

      <h2 className={h2}>3. Where coins go</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {[
          ["🕹️ Game rentals", "Load fee by exact bytes + per-second play (defaults ~1 coin + 1/hr). Same version free 24h. Itemized per game."],
          ["👾 Clan activity", "Every post/comment/message pays a byte-linear fee (0.01/KB + 0.05/image, min 1 centicentcoin), split 25% platform / 75% clan wallet. Funds per-minute upkeep."],
          ["🎙️ Game AI + Buddy", "Dialogue, directors, TTS/voice, screen reads — metered per token, character, or GPU minute. Watch live session/total/24h/1h spend in the Buddy widget."],
          ["🤖 Agents + teams", "Bookings escrow gross coins; metered heartbeats settle 25/75 and can only settle downward, never above escrow."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-bold">{t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <h2 className={h2}>4. Reading your balance + history</h2>
      <p className={p}>
        <Link className="underline" href="/account">/account</Link> shows coins + fractional centicentcoins.
        <Link className="underline" href="/my/usage/"> /my/usage/</Link> breaks it down: game AI/buddy by-kind +
        by-game, recent turns, coin movements, rental compute, clan personal spend (fees + funding + donations),
        workspace cloud with function runs broken out, game rentals, and the combined 25/75 totals. When anything
        looks wrong, screenshot the /my/usage/ lines first — support will ask for them.
      </p>

      <h2 className={h2}>5. Rules that protect you</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
        <li>Coins are licensed virtual features with no cash value: non-transferable, may change or be discontinued; purchases are final except where the law requires otherwise (see <Link className="underline" href="/terms">Terms §8</Link>).</li>
        <li>Money moves only in guarded server-side transactions — never trust any client-side coin display asking you to “award yourself” coins.</li>
        <li>Conditional-claim + unique-grant guards prevent double-minting; daily/referral/trial limits are enforced server-side.</li>
        <li>Prices always state the gross with “includes 25% cut.” If a page ever shows a price without it, treat the gross as authoritative and report it.</li>
      </ul>

      <p className="mt-8 text-sm text-muted-foreground">
        Next: <Link className="underline" href="/docs/clans">Clans →</Link> ·{" "}
        <Link className="underline" href="/docs/agents-compute">Agents &amp; cloud →</Link>
      </p>
    </article>
  );
}
