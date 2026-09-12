import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, SplitBar, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/support-launches" },
  title: "Support & launches",
  description:
    "Voluntary coin support for verified creators and clans, plus gift-based launch campaigns for games and tech startups. Not charity, not investment.",
};

const theme = {
  bg: "bg-gradient-to-br from-pink-950 via-slate-950 to-amber-950",
  border: "border-pink-300/20",
  chip: "border-pink-300/40 bg-pink-300/10 text-pink-200",
  title: "bg-gradient-to-r from-pink-300 via-rose-200 to-amber-300 bg-clip-text text-transparent",
};

export default function SupportLaunchesPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · the tip jar"
        title={<>Coffee money, <span className={theme.title}>not contracts.</span></>}
        lede={<>Subscribe to a verified creator or clan, send a one-time tip, or back someone&apos;s game launch or tech startup - all in Vibe Coins, all voluntary, all final. Not a charity, not an investment.</>}
        stats={[
          ["25%", "cut, inside every coin"],
          ["1 🪙", "minimum tip ($0.01)"],
          ["30d", "support periods"],
          ["0", "cash-outs, ever"],
        ]}
        glyph="💛"
        theme={theme}
        crumb="Support & launches"
        art={
          <div className="flex items-end gap-2" aria-hidden="true">
            {[44, 66, 52, 78, 60, 88, 70].map((h, i) => (
              <div
                key={i}
                className="docs-float w-10 rounded-t-full border border-pink-200/50 bg-gradient-to-t from-rose-500 to-amber-300 shadow-lg sm:w-12"
                style={{ height: h, animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        }
      />

      <Callout title="The legal shape in one breath">
        Support and launch backing are gratuitous transfers of closed-loop platform credits. Coins have no cash value
        and can never be cashed out directly; gifts to individuals mint time-locked Crowns under Terms 8A.1 (locked 30 days by law; then 1:1 convert to Coins instantly, or fiat payout in 5-10 business days with KYC; payout countries not yet announced). Nothing here is charitable (no tax deduction, no charitable solicitation) and
        nothing is an investment (no equity, interest, or profit-share). Perks and campaign rewards are goals the
        creator hopes to deliver - never contractual promises. The binding version lives in{" "}
        <Link className="underline" href="/terms">Terms of Use §8A</Link>.
      </Callout>

      <SectionHead
        index="1"
        kicker="Creator memberships"
        title="Support verified creators and clans"
        body="Monthly tiers plus one-time tips. Personal support goes only to verified creators (request verification on the Support page - every application is reviewed by hand); clans receive through their moderators into the clan wallet."
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          ["💡 Tip", "1-100,000 coins, one tap. Final when sent. You cannot tip yourself; clan owners fund their own clan via the wallet."],
          ["🔁 Subscribe", "First 30-day period charged immediately, renews every 30 days. Cancel anytime - future renewals stop, completed periods are not prorated or refunded."],
          ["🛟 Short on coins?", "A renewal you cannot cover lapses to past-due instead of dragging you negative. Top up and resubscribe."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <SectionHead
        index="2"
        kicker="Community fundraising, for launches"
        title="Launch campaigns fund games and startups"
        body="Gift-based backing for creative projects only: game launches, tech startups, and creative tech. Every campaign states a goal, a story, and what the coins will fund. Backers give gifts - no ownership, no returns, no enforceable right to any reward."
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {[
          ["🎮 Game launch", "Art, servers, polish, launch marketing. Tell players what hitting the goal unlocks."],
          ["🚀 Tech startup", "First build, beta hosting, SDK licenses. Explain the milestone the coins fund."],
          ["🧪 Creative tech", "Tools, mods, engines, weird experiments. Honest scope beats hype."],
          ["🚫 Never allowed", "Charity, medical, emergency, disaster, political, or investment language is rejected - automatically and on review."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <SectionHead
        index="3"
        kicker="The money"
        title="One split everywhere"
        body="A supporter pays gross coins; 25% stays with the platform and 75% mints time-locked Crowns for verified creators (or credits the clan wallet) - a verified creator's coin balance or a clan's wallet - as on-site platform credits (cloud compute, game credits, other on-site services only; never cash-out directly, never withdrawable as Coins). Raised campaign coins work the same way, minting Crowns for creator-direct campaigns. Start at /support or /fundraisers."
      />
      <SplitBar leftLabel="75% creator / project" rightLabel="25% platform" />

      <SectionHead
        index="4"
        kicker="Trust"
        title="Honesty rules, fraud loses"
        body="Campaign creators must describe their project truthfully. Misleading campaigns can be frozen, hidden, or removed, and defrauded backers may be re-credited from frozen amounts where possible. Report abuse through the in-Service report flow or matt@mattyjacks.com."
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/support" className="rounded-full bg-cyan-300 px-6 py-3 text-center font-bold text-slate-950 transition hover:bg-cyan-200">
          Open Support
        </Link>
        <Link href="/fundraisers" className="rounded-full border border-white/20 px-6 py-3 text-center font-semibold transition hover:bg-white/10">
          Browse campaigns
        </Link>
        <Link href="/terms" className="rounded-full border border-white/20 px-6 py-3 text-center font-semibold transition hover:bg-white/10">
          Terms §8A
        </Link>
      </div>

      <SectionHead
        index="5"
        kicker="Under the hood"
        title="How a tip actually moves"
        body="One tap, one recipient, no take-backs. POST /api/support/tip takes exactly one destination - a verified creator or a clan, never both, never neither - and an amount from 1 to 100,000 coins. The tip_creator routine moves the coins, takes the 25% cut inside the gross, and mints time-locked Crowns for people or wallet credits for clans."
      />
      <Steps
        items={[
          ["Pick exactly one recipient", <>A verified creator&apos;s user id or a clan id - the route rejects zero or two recipients, unknown creators, and unverified accounts. Clan owners cannot tip their own clan; they fund it through the wallet path instead.</>],
          ["Name any amount, 1 to 100,000", <>Whole or fractional down to two decimals. Below balance? The transfer fails with a 402, not a negative - support can lapse, but it can never drag you under zero.</>],
          ["The split happens inside the gross", <>You pay 100 coins, the platform keeps 25, the recipient&apos;s side nets 75 - as Crowns for a creator, as shared wallet credits for a clan. The number you typed is the only number anyone sees.</>],
          ["Final means final", <>Completed transfers stay completed except in proven fraud, where frozen amounts may re-credit defrauded backers where possible. Logged-in bots may tip too - it spends their own coins like anyone else.</>],
        ]}
      />
      <MockWindow title="tip receipt — /support" badge="final">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
            <span>You sent</span>
            <span className="font-black text-amber-300">100 🪙 ($1.00)</span>
          </div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
            <span className="text-slate-400">luna keeps (Crowns, unlocks in 30d)</span>
            <span className="font-bold text-emerald-300">75 👑</span>
          </div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
            <span className="text-slate-400">Platform cut (inside the gross)</span>
            <span className="font-bold text-slate-300">25 🪙</span>
          </div>
        </div>
      </MockWindow>

      <SectionHead
        index="6"
        kicker="Memberships"
        title="Subscriptions and tiers, without mystery"
        body="Creators and clans publish monthly tiers; supporters subscribe for 30-day periods. The first period charges immediately, renewals tick every 30 days, and cancelling stops future renewals - completed periods are never prorated or refunded."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["📋 The tier catalog is public", "GET /api/support/tiers lists active tiers (up to 100, cheapest first), filterable by creator or clan. No login needed to window-shop."],
          ["✏️ Tiers from 1 to 100,000/month", "POST /api/support/tiers creates one with a title, a monthly coin price, and an optional blurb. Skip the clan and it is a personal tier - but only verified creators may publish those."],
          ["🔁 Subscribe, watch, cancel", "GET /api/support/subscribe shows your subscriptions (newest first, up to 50). Subscribe charges month one at once; cancel ends it at the period boundary, no partial refunds."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <Callout tone="emerald" title="Short on coins at renewal? You lapse, you don't go negative.">
        A renewal you cannot cover lapses the subscription to past-due instead of overdrawing you. Top up your coins and
        resubscribe whenever you like - no debt, no dunning drama, no surprise charges.
      </Callout>

      <SectionHead
        index="7"
        kicker="Paused, not gone"
        title="Launch campaigns return when compliance lands"
        body="The fundraising code is in place but launching, backing, and closing campaigns are disabled while the money-between-parties compliance is worked out - money-transmitter rules, tax reporting, payouts, refunds, and fraud handling across borders. Browsing still works; the money routes answer 403 for now."
      />
      <Callout title="What “paused” means in practice">
        Creating, contributing to, and closing campaigns are switched off by a single flag, and the three money routes
        enforce it too - so a paused fundraiser is paused via the API as well, not just hidden in the UI. Listing stays
        readable so nothing already drafted is stranded. One flip re-enables everything once the legal path is clear.
      </Callout>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["🔍 Browsing still works", "GET /api/fundraisers lists open, visible campaigns (newest first, up to 50, filterable by category) with live progress - gross raised and backer count - attached to each one."],
          ["📝 Campaigns need a real story", "When they return: a title (4-120 chars), a story (20-5,000 chars), a goal from 50 to 1,000,000 coins, one of three categories, and honest use-of-funds. Throttled to a handful of launches per hour."],
          ["🤖 Screened automatically, reviewed by humans", "Creation refuses charity, medical, emergency, political, and investment language on the spot. A pending-by-default review queue ships with the compliance re-enable; until then new campaigns default to visible."],
          ["🎯 Goals are hopes, not contracts", "Backers give gifts - no equity, no interest, no profit-share, no enforceable right to any reward. Creators must still describe projects truthfully or face freeze, hide, or removal."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <SectionHead
        index="8"
        kicker="One emoji, one meaning"
        title="Keep the currencies straight"
        body="Four symbols, four ledgers, never mingled. Tips, tiers, and campaign backing move Coins; creator earnings arrive as Crowns; org timekeeping runs on Ghost Cash; clan applause runs on Love Letters."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["💸 Real Money", "Actual fiat, actual cash. Whenever we mean dollars, we say 💸 - never 🪙."],
          ["👻 Ghost Cash", "Org-work IOUs from the timer. Ghost emoji only, never paired with cash. No value, no cash-out."],
          ["🪙 Vibe Coins", "Closed-loop platform credits. 100 🪙 = $1.00. Spendable on-site only; never cash-out, never withdrawable."],
          ["💌 Love Letters", "Earned only when a human applauds your clan post - spendable on advanced awards. Never convertible into 🪙; the ledgers stay separate."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <Pager current="/docs/support-launches" />
    </article>
  );
}




