import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, SplitBar, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/vibe-coins" },
  title: "Vibe Coins",
  description:
    "The 4weird coin economy: 100 coins = $1.00, packs, custom amounts, daily bonus, referrals, trial, checkout, balance, and where every coin goes.",
};

const theme = {
  bg: "bg-gradient-to-br from-yellow-950 via-slate-950 to-amber-950",
  border: "border-yellow-300/20",
  chip: "border-yellow-300/40 bg-yellow-300/10 text-yellow-200",
  title: "bg-gradient-to-r from-yellow-300 via-amber-200 to-orange-300 bg-clip-text text-transparent",
};

const PACKS: [string, string, string][] = [
  ["500 ðŸª™", "$5", "Pocket change for sessions + clan fees"],
  ["1,500 ðŸª™", "$15", "The regular's stash"],
  ["5,000 ðŸª™", "$50", "Clan treasuries + agent hours"],
  ["25,000 ðŸª™", "$250", "Team war chest"],
  ["Custom", "500â€“100k", "Any amount at 1Â¢/coin"],
];

export default function VibeCoinsPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs Â· the vault"
        title={<>Money, but <span className={theme.title}>make it fun.</span></>}
        lede={<>One coin economy across games, clans, bots, agents, and teams: 100 coins = exactly $1.00 ($0.01/coin). Every price already includes the 25% platform cut â€” never added on top.</>}
        stats={[
          ["100 ðŸª™", "= $1.00 exactly"],
          ["1Â¢", "per coin, always"],
          ["5 packs", "+ custom sizes"],
          ["0", "asterisks"],
        ]}
        glyph="ðŸª™"
        theme={theme}
        crumb="Vibe Coins"
        art={
          <div className="flex items-end gap-2" aria-hidden="true">
            {[38, 56, 44, 70, 60, 84, 72].map((h, i) => (
              <div
                key={i}
                className="docs-float w-10 rounded-t-full border border-yellow-200/50 bg-gradient-to-t from-amber-500 to-yellow-300 shadow-lg sm:w-12"
                style={{ height: h, animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="The promise"
        title="A cent is a cent is a cent"
        body="When you pay 400 coins ($4.00) for compute, 100 goes to the platform and 300 credits the provider as on-site platform credits — but you only ever see the gross 400. Same rule for game rentals, clan fees, game AI, Buddy turns, and squad cloud. All credits are spendable on cloud computing, game credits, and other on-site services only; never cash-out, never withdrawable. Your receipt is /my/usage/."
      />
      <SplitBar />

      <SectionHead
        index="2"
        kicker="Incoming"
        title="Five ways coins arrive"
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["ðŸŽ Free 100-coin trial", "Automatic on signup, once per person. There is intentionally no 100-coin pack â€” the trial stays special."],
          ["ðŸ“… Daily bonus 5â€“12", "One button on /account, once per UTC day: 5 coins + 1 per streak day, capped at 12."],
          ["ðŸ’Œ Referrals 25/25", "Share your 8-char code; both sides get 25 coins on redeem. One use per invitee, no self-use."],
          ["ðŸ›’ Packs + custom", "500 / 1.5k / 5k / 25k + custom 500â€“100k at 1Â¢/coin on /pricing. Shopify checkout, reconciled by order email."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-yellow-400/50">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <Callout tone="gold" title="Grant didn't land? Recover by email first.">
        Paid grants reconcile by order email with anti-double-mint guards. Use the attach-by-email recovery on{" "}
        <Link className="underline" href="/account">/account</Link> before contacting support â€” it resolves most cases instantly.
      </Callout>

      <SectionHead
        index="3"
        kicker="The menu"
        title="Pick your stash"
        body="100 coins is the free trial â€” never sold. Everything else is on /pricing, purchasable from /account."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {PACKS.map(([pack, price, blurb], i) => (
          <div
            key={pack}
            className={`relative overflow-hidden rounded-2xl border p-4 text-center transition hover:-translate-y-1 ${
              i === 2 ? "border-yellow-300/60 bg-gradient-to-b from-yellow-300/20 to-transparent shadow-xl" : "border-border bg-card"
            }`}
          >
            {i === 2 && (
              <p className="absolute inset-x-0 top-0 bg-yellow-300 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-950">
                Popular
              </p>
            )}
            <p className={`font-black ${i === 2 ? "mt-3" : ""}`}>{pack}</p>
            <p className="text-2xl font-black text-yellow-600 dark:text-yellow-300">{price}</p>
            <p className="mt-1 text-xs text-muted-foreground">{blurb}</p>
          </div>
        ))}
      </div>

      <SectionHead
        index="4"
        kicker="Outgoing"
        title="Where coins go when you spend"
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["ðŸ•¹ï¸ Game rentals", "Load fee by exact bytes + per-second play. Same version free 24h. Itemized per game."],
          ["ðŸ‘¾ Clan activity", "Byte-linear post/comment/message fees, split 25% platform / 75% clan wallet. Funds upkeep."],
          ["ðŸŽ™ï¸ Game AI + Buddy", "Dialogue, directors, voice, screen reads â€” per token, character, or GPU minute."],
          ["â˜ï¸ Agents + teams", "Bookings escrow gross coins; heartbeats settle 25/75 downward, never above escrow."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-bold">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <SectionHead
        index="5"
        kicker="Self-defense"
        title="Rules that protect your wallet"
      />
      <ul className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <li className="rounded-xl border border-border bg-card p-3">ðŸ§¾ <strong className="text-foreground">Read /my/usage/ first.</strong> Session + total + 1h/24h, by-kind + by-game, recent turns â€” it answers nearly every â€œwhat did I pay?â€ question.</li>
        <li className="rounded-xl border border-border bg-card p-3">ðŸ” <strong className="text-foreground">Money moves server-side only.</strong> Never trust a client-side display offering to â€œaward yourselfâ€ coins.</li>
        <li className="rounded-xl border border-border bg-card p-3">ðŸ“œ <strong className="text-foreground">Coins are licensed features</strong> â€” no cash value, never cash-out, never withdrawable, non-transferable, spendable on cloud computing, game credits, and other on-site services only; purchases final except where law requires otherwise (<Link className="underline" href="/terms">Terms Â§8</Link>).</li>
      </ul>

      <Pager current="/docs/vibe-coins" />
    </article>
  );
}
