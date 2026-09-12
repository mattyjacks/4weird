import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, SplitBar, Pager } from "@/components/docs/docs-bits";

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
  ["500 🪙", "$5", "Pocket change for sessions + clan fees"],
  ["1,500 🪙", "$15", "The regular's stash"],
  ["5,000 🪙", "$50", "Clan treasuries + agent hours"],
  ["25,000 🪙", "$250", "Team war chest"],
  ["Custom", "500-100k", "Any amount at 1¢/coin"],
];

export default function VibeCoinsPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · the vault"
        title={<>Money, but <span className={theme.title}>make it fun.</span></>}
        lede={<>One coin economy across games, clans, bots, agents, and teams: 100 coins = exactly $1.00 ($0.01/coin). Every price already includes the 25% platform cut - never added on top.</>}
        stats={[
          ["100 🪙", "= $1.00 exactly"],
          ["1¢", "per coin, always"],
          ["5 packs", "+ custom sizes"],
          ["0", "asterisks"],
        ]}
        glyph="🪙"
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
        body="When you pay 400 coins ($4.00) for compute, 100 goes to the platform and 300 credits the provider as on-site platform credits - but you only ever see the gross 400. Same rule for game rentals, clan fees, game AI, Buddy turns, and squad cloud. Individual earn shares mint time-locked Crowns under Terms 8A.1 (convert 1:1 to Coins after a 30-day legal lock (instant once unlocked) or cash out via our payout provider (30 days + 5-10 business days, KYC required, countries not yet announced); shared wallet credits are spendable on cloud computing, game credits, and other on-site services only; never cash-out, never withdrawable. Your receipt is /my/usage/."
      />
      <SplitBar />

      <SectionHead
        index="2"
        kicker="Incoming"
        title="Five ways coins arrive"
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["🎁 Free 100-coin trial", "Automatic on signup, once per person. There is intentionally no 100-coin pack - the trial stays special."],
          ["📅 Daily bonus 5-12", "One button on /account, once per UTC day: 5 coins + 1 per streak day, capped at 12."],
          ["💌 Referrals 25/25", "Share your 8-char code; both sides get 25 coins on redeem. One use per invitee, no self-use."],
          ["🛒 Packs + custom", "500 / 1.5k / 5k / 25k + custom 500-100k at 1¢/coin on /pricing. Shopify checkout, reconciled by order email."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-yellow-400/50">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <Callout tone="gold" title="Grant didn't land? Recover by email first.">
        Paid grants reconcile by order email with anti-double-mint guards. Use the attach-by-email recovery on{" "}
        <Link className="underline" href="/account">/account</Link> before contacting support - it resolves most cases instantly.
      </Callout>

      <SectionHead
        index="3"
        kicker="The menu"
        title="Pick your stash"
        body="100 coins is the free trial - never sold. Everything else is on /pricing, purchasable from /account."
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
          ["🕹️ Game rentals", "Load fee by exact bytes + per-second play. Same version free 24h. Itemized per game."],
          ["👾 Clan activity", "Byte-linear post/comment/message fees, split 25% platform / 75% clan wallet. Funds upkeep."],
          ["🎙️ Game AI + Buddy", "Dialogue, directors, voice, screen reads - per token, character, or GPU minute."],
          ["☁️ Agents + teams", "Bookings escrow gross coins; heartbeats settle 25/75 downward, never above escrow."],
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
        <li className="rounded-xl border border-border bg-card p-3">🧾 <strong className="text-foreground">Read /my/usage/ first.</strong> Session + total + 1h/24h, by-kind + by-game, recent turns - it answers nearly every “what did I pay?” question.</li>
        <li className="rounded-xl border border-border bg-card p-3">🔐 <strong className="text-foreground">Money moves server-side only.</strong> Never trust a client-side display offering to “award yourself” coins.</li>
        <li className="rounded-xl border border-border bg-card p-3">📜 <strong className="text-foreground">Coins are licensed features</strong> - no cash value, never cash-out, never withdrawable, non-transferable, spendable on cloud computing, game credits, and other on-site services only; purchases final except where law requires otherwise (<Link className="underline" href="/terms">Terms §8</Link>).</li>
      </ul>

      <SectionHead
        index="6"
        kicker="The ledger"
        title="Your balance is a sum, not a cell"
        body="There is no balance column anywhere. Every coin movement appends one row to the coin_ledger table, and your balance is always SUM(delta) over your rows - computed live by the get_my_coin_balance() function. Paid Shopify orders leave a second trail in coin_grants (one row per order), and each grant can mint coins exactly once."
      />
      <MockWindow title="coin_ledger — append-only, newest first" badge="SUM(delta)">
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
            <span>Daily login bonus (day 4)</span>
            <span className="font-black text-emerald-300">+8</span>
          </div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
            <span>Shopify order #1042</span>
            <span className="font-black text-emerald-300">+5,000</span>
          </div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
            <span>Compute escrow: render-box</span>
            <span className="font-black text-rose-300">−400</span>
          </div>
          <div className="flex justify-between gap-3 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2">
            <span className="font-bold text-emerald-200">Balance = SUM(delta)</span>
            <span className="font-black text-emerald-200">4,708</span>
          </div>
        </div>
      </MockWindow>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["💰 GET /api/coins/balance", "Calls get_my_coin_balance() for the caller only - no arguments, nothing to inject. Returns your coins plus the centicentcoin count."],
          ["🧾 GET /api/coins/history", "Reads your own coin_ledger rows (delta + reason + timestamp, newest first). Your receipt drawer, straight from the ledger."],
          ["🔒 No client writes, ever", "Both tables deny client writes at the database level - Row Level Security allows reading your own rows only. Money moves through server RPCs alone."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <Callout tone="emerald" title="Double-minting is structurally impossible.">
        Paid grants carry a UNIQUE(grant_id) ledger constraint: the claim path writes the ledger row first, and if two
        claims race, the loser sees the uniqueness violation and simply converges the grant to claimed. Retrying a claim
        can never print coins twice.
      </Callout>

      <SectionHead
        index="7"
        kicker="Checkout"
        title="From /pricing to Shopify and back"
        body="Checkout builds a cart link - it never mints coins itself. Coins mint only from the HMAC-verified Shopify webhook after payment, and if the purchase email differs from your login email, the attach-by-email recovery on /account pairs them up."
      />
      <Steps
        items={[
          ["Pick a pack or a custom amount", <>On <Link className="underline" href="/pricing">/pricing</Link>: 500 / 1.5k / 5k / 25k, or any whole-coin custom amount from 500 to 100,000 at 1¢/coin. Custom rides on a $0.01-per-unit variant where quantity equals your coin count.</>],
          ["POST /api/coins/checkout builds the cart", <>The route checks your pack variant against an allowlist and fails closed - an unconfigured allowlist blocks packs instead of opening checkout to anything. Misconfigured custom variants (colliding with a pack variant) refuse outright.</>],
          ["Pay on Shopify, webhook mints", <>Only the verified webhook writes the coin_grants row and its ledger insert. The checkout URL is just a link - it cannot create money, no matter how it is shared or replayed.</>],
          ["Grant missing? POST /api/coins/claim", <>Logged in with the order email? One tap attaches every pending grant matched by exact-lowercased email. Ledger-first, retry-safe, and guarded against claim storms (a few attempts per minute, a handful per hour).</>],
        ]}
      />

      <SectionHead
        index="8"
        kicker="Refunds + gifts"
        title="The small print, made friendly"
        body="Purchases are final except where the law says otherwise - but inside 90 days, the unspent remainder of a purchased lot can come home. Free grants (trial, daily, referrals, alpha) are never refundable; only paid packs are."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">↩️ How refunds work</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>90-day window, unspent remainder only - spending eats lots oldest-first, so a half-spent lot refunds pro-rata</li>
            <li>POST /api/coins/refund takes a lot id, with an optional partial amount; omit it for the full remainder</li>
            <li>GET /api/coins/refunds shows your refundable lots plus past refunds - free coins never appear there</li>
            <li>Minimum 0.01 coins: even dust gets its day in court</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">🎁 Alpha + daily + dust</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Alpha Tester gift: one-time 300 coins ($3.00), capped at 10,000 coins given away site-wide</li>
            <li>Daily bonus is human-only by design - even valid bot keys face the human check; a second claim the same UTC day pays 0 and also drops a Love Letter on success</li>
            <li>1 coin = 100 centicentcoins; the smallest spendable unit is 0.01 coins (1 centicentcoin ≈ $0.0001)</li>
            <li>Balances display whole when whole, two decimals when fractional - never more precision than your money has</li>
          </ul>
        </div>
      </div>

      <SectionHead
        index="9"
        kicker="Three currencies"
        title="Coins, Crowns, Ghost Cash - zero confusion"
        body="One emoji, one meaning, everywhere: 🪙 Coins are closed-loop spend credits, 👑 Crowns are creator earnings with two exits, 👻 Ghost Cash is an org-work IOU with no value at all. 💸 means real fiat, and 💌 Love Letters are clan applause you can never buy."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["🪙 Coins (spend)", "Bought, granted, or metered. Spend on-site only - never payout-eligible, never cash-out. 100 coins = $1.00 of platform credit."],
          ["👑 Crowns (earn)", "Minted only from gifted net (tips, subs, launch backing, provider shares). Locked 30 days, expire after a year. Then convert 1:1 to your own Coins (1 minimum, no fee, fresh 1-year expiry) or cash out in fiat (5,000 minimum - 100 Crowns = $1.00 payout value)."],
          ["👻 Ghost Cash (track)", "Measures org hours down to the second: (seconds / 3600) × hourly rate. No cash value, no redemption, ghost emoji only - never paired with cash."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <Callout tone="violet" title="Fair play is priced in.">
        Cosmetics cost 10 coins each and are looks-only - nothing purchasable may help win a multiplayer game, ever.
        No single purchase may exceed 10,000 coins, and devs cannot take more than 1,000 coins/day from one player per
        game without fresh consent. Guidance for devs: ~100 coins for deliberate buys, ~10 for automatic ones.
      </Callout>

      <Pager current="/docs/vibe-coins" />
    </article>
  );
}


