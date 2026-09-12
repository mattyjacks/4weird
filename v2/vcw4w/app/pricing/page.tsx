import type { Metadata } from "next";
import Link from "next/link";
import { PackCatalog } from "@/components/coins/pack-catalog";
import { CompactDetails } from "@/components/ui/compact-details";
import { InfoTip } from "@/components/ui/info-tip";
import { jsonLdScript, pricingOffersJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  alternates: { canonical: "/pricing" },
  title: "Pricing | 4weird Games",
  description:
    "Vibe Coins, cloud compute with a 25% premium included, and VibeCodeWorker self-hosted licensing: $420/mo per org (100 seats, +$4.20/seat) with 15% compute markup, plus Enterprise quotes down to 9%.",
};

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-sm text-slate-300">
      <span aria-hidden="true" className="font-bold text-cyan-300">
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}

export default function Page() {
  return (
    <div className="bg-slate-950 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(pricingOffersJsonLd()) }}
      />
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-5 sm:pt-20">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300 sm:text-sm">
          Pricing
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
          One sentence pricing. <span className="text-cyan-300">No asterisks.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
          100 Vibe Coins cost exactly $1.00 — every price already includes the 25% platform service
          cut, never added on top.
        </p>
        <div className="mt-4 grid max-w-2xl gap-3">
          <CompactDetails
            summary="Free trial: up to 100 coins ($1.00)"
            hint="One free trial per person and network."
          >
            <p className="text-sm leading-relaxed text-slate-300">
              New accounts start with a free trial of up to 100 coins ($1.00) - one per person and network.
            </p>
          </CompactDetails>
          <CompactDetails
            summary="How compute splits 25% platform / 75% provider"
            hint="Provider shares land as Crowns for individuals or shared wallet credits — on-site only, never cash-out."
          >
            <p className="text-sm leading-relaxed text-slate-300">
              Compute works the same way: one gross metered price, split 25% platform / 75% provider as Crowns for individual providers (Terms 8A.1) or shared wallet credits.{" "}
              <InfoTip
                text="Crowns are earn-only credits for individual providers under Terms 8A.1 — convertible 1:1 to Coins after the lock or cashable via the payout provider. Shared wallet credits stay on-site."
                label="About Crowns"
              />
            </p>
          </CompactDetails>
          <CompactDetails
            summary="Where coins work, when they expire, how they spend"
            hint="On-site services only; one-year expiry; oldest unexpired centicentcoins spent first."
          >
            <p className="text-sm leading-relaxed text-slate-300">
              Coins are spendable on cloud computing, game credits, and other on-site services only; never cash-out, never withdrawable. Coins expire one year after receipt, and every purchase automatically spends the oldest unexpired centicentcoins first.{" "}
              <InfoTip
                text="Centicentcoins are the smallest ledger unit: 100 centicentcoins = 1 coin = $0.01. Spending the oldest unexpired lot first stretches every pack furthest."
                label="About centicentcoins"
              />
            </p>
          </CompactDetails>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/account"
            className="rounded-full bg-cyan-300 px-6 py-3 text-center font-bold text-slate-950 transition hover:bg-cyan-200"
          >
            Open account — get 100 free
          </Link>
          <Link
            href="/agents"
            className="rounded-full border border-white/20 px-6 py-3 text-center font-semibold transition hover:bg-white/10"
          >
            Rent compute
          </Link>
          <Link
            href="/squads"
            className="rounded-full border border-white/20 px-6 py-3 text-center font-semibold transition hover:bg-white/10"
          >
            Try UnitUnite
          </Link>
        </div>
      </section>

      {/* Plans */}
      <section className="mx-auto max-w-6xl px-4 sm:px-5" aria-label="Plans">
        <div className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-3xl border border-white/10 bg-white/[.04] p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Play</p>
            <h2 className="mt-2 text-2xl font-black">Vibe Coins</h2>
            <p className="mt-2 text-3xl font-black">
              $1.00 <span className="text-base font-semibold text-slate-400">= 100 coins</span>
            </p>
            <p className="mt-3 text-sm text-slate-400">
              Pay-as-you-go fun money. 1¢ per coin, 25% cut included, free trial up to 100 coins.
            </p>
            <ul className="mt-5 space-y-2.5">
              <Check>500 / 1,500 / 5,000 / 25,000 packs + custom 500–100,000</Check>
              <Check>Daily login bonus (5–12 coins) + 25/25 referrals</Check>
              <Check>One-year expiry · oldest unexpired centicentcoins spent first</Check>
              <Check>Cloud saves, leaderboards, clans, agent escrow</Check>
              <Check>Renting games: load fee by exact bytes + play billed per second (quoted per hour)</Check>
            </ul>
            <Link
              href="/account"
              className="mt-6 block rounded-full bg-white/10 px-5 py-3 text-center font-bold transition hover:bg-white/15"
            >
              Buy coins
            </Link>
          </article>

          <article className="relative rounded-3xl border-2 border-cyan-300/70 bg-gradient-to-b from-cyan-300/15 to-white/[.03] p-6 sm:p-8">
            <p className="inline-block rounded-full bg-cyan-300 px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-950">
              Most popular
            </p>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Cloud compute</p>
            <h2 className="mt-2 text-2xl font-black">Metered + 25% premium</h2>
            <p className="mt-2 text-3xl font-black">
              Base + 25% <span className="text-base font-semibold text-slate-400">included, not on top</span>
            </p>
            <p className="mt-3 text-sm text-slate-300">
              Rent AI agents and squad cloud by the hour or second. One gross coin price covers the
              provider + our 25% platform cut.
            </p>
            <ul className="mt-5 space-y-2.5">
              <Check>400 coins ($4.00) of compute = 100 platform / 300 provider credits (on-site only, never cash-out)</Check>
              <Check>Coin escrow — metered heartbeat never bills above escrow</Check>
              <Check>RunPod / DigitalOcean / custom endpoints, no fake provisioning</Check>
              <Check>Game AI + Gaming Buddy meter the same way — see /buddy and /my/usage/</Check>
            </ul>
            <Link
              href="/agents"
              className="mt-6 block rounded-full bg-cyan-300 px-5 py-3 text-center font-bold text-slate-950 transition hover:bg-cyan-200"
            >
              Start renting
            </Link>
          </article>

          <article className="rounded-3xl border border-amber-300/40 bg-gradient-to-b from-amber-300/10 to-white/[.03] p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Self-hosted · BYOK · Mid-tier</p>
            <h2 className="mt-2 text-2xl font-black">Bring your own keys</h2>
            <p className="mt-2 text-3xl font-black">
              $420<span className="text-base font-semibold text-slate-400">/mo per org + 15% compute markup</span>
            </p>
            <p className="mt-3 text-sm text-slate-300">
              Plug in your own RunPod / DigitalOcean keys. You pay providers at cost; we add a
              flat $420/mo platform fee plus a 15% metered API/compute premium for orchestration.
              Includes up to 100 user seats per org; extra seats $4.20/mo each. Need scale?
              Enterprise quotes go down to as little as 9% markup - Talk to Sales.
            </p>
            <ul className="mt-5 space-y-2.5">
              <Check>$420/mo per org: up to 100 seats, workspaces, escrow-free metering, support + self-host help</Check>
              <Check>Extra seats $4.20/mo each; add as your org grows</Check>
              <Check>15% API/compute markup on your at-cost bills (vs 25% on cloud)</Check>
              <Check>Your keys, your limits, your invoices; we never hold funds</Check>
            </ul>
            <Link
              href="/squads"
              className="mt-6 block rounded-full border border-amber-300/60 px-5 py-3 text-center font-bold text-amber-200 transition hover:bg-amber-300/10"
            >
              Go self-hosted
            </Link>
          </article>
        </div>
      </section>

      {/* Renting games */}
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-5 sm:pt-16" aria-label="Renting games">
        <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Renting games</p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">About $0.01 per hour of play, billed per second</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
            Every first load costs a <strong className="text-white">proportional load fee (default 1 coin for 1 MiB of fresh bytes)</strong> —
            even loads under 1 MB pay their exact fraction, down to 1 centicentcoin (0.01 coins). Running play
            costs the <strong className="text-white">hourly rate (default 1 coin/hr)</strong>, billed{" "}
            <strong className="text-white">per second from the first second</strong> — that&apos;s 100 centicentcoins
            spread over 60 minutes Ö 60 seconds, so you never pay for time you didn&apos;t play. Every 5 hours a
            “still playing?” check asks you to confirm metering continues (the game keeps running either way). AI
            features meter separately on top. Replaying the same version within 24 hours is never double-billed.
            Developers set their own rates up to <strong className="text-white">100 coins/hour</strong> (0 = free
            game). Every price already includes the 25% platform cut — and a day-1 daily bonus (5 coins) covers a
            full 5-hour session on its own.
          </p>
          <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
            <Check>Load fee by exact bytes (1 MiB = full fee) + play billed per second (defaults 1 + 1/hr)</Check>
            <Check>Same version free for 24h · still-playing check every 5h · dev rates 0–100</Check>
            <Check>Guests play free with skippable ads — no saves, multiplayer, or AI</Check>
            <Check>Every load, hour, and ad-free session itemized on /my/usage/</Check>
          </ul>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/games"
              className="rounded-full bg-cyan-300 px-6 py-3 text-center font-bold text-slate-950 transition hover:bg-cyan-200"
            >
              Play games
            </Link>
            <Link
              href="/my/usage/"
              className="rounded-full border border-white/20 px-6 py-3 text-center font-semibold transition hover:bg-white/10"
            >
              My usage
            </Link>
          </div>
        </div>
      </section>

      {/* Big communities: 10k orgs, 100k clans, pruning, Tribute commons */}
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-5 sm:pt-16" aria-label="Big communities">
        <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">Big communities</p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">10,000-member orgs · 100,000-member clans</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
            Hosted orgs hold up to <strong className="text-white">10,000</strong> members and clans up to{" "}
            <strong className="text-white">100,000</strong> members before automated pruning arms (owners never
            pruned, 7-day new-join grace). Self-hosted orgs are capped by{" "}
            <strong className="text-white">purchased seats</strong> instead. Need room beyond the cap? Buy headroom:{" "}
            <strong className="text-white">10 coins per 100</strong> org slots and{" "}
            <strong className="text-white">10 coins per 1,000</strong> clan slots (25% cut included); upkeep still
            meters per member afterwards.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
            Clan Supporter Status + the Tribute commons keep big rooms alive: surplus donations{" "}
            <strong className="text-white">globalize</strong> into a shared reserve on a{" "}
            <strong className="text-white">69-day half-life</strong> decay and flow back out as{" "}
            <strong className="text-white">Tribute commons</strong> gifts to the poorest clans and members — so a
            quiet room you love doesn&apos;t die when its wallet runs dry.
          </p>
        </div>
      </section>

      {/* How the 25% works */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-5 sm:py-16" aria-label="How compute pricing works">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6 sm:p-8">
            <h2 className="text-xl font-black sm:text-2xl">How the 25% compute premium works</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Every cloud meter shows one gross price in coins. Behind it we split{" "}
              <strong className="text-white">25% platform / 75% provider</strong> as on-site platform credits and attribute
              every cent in <code className="text-cyan-300">platform_compute_cuts</code>{" "}
              <InfoTip
                text="platform_compute_cuts is the ledger table where every metered job's 25% platform / 75% provider split is attributed — the itemized proof behind the gross price."
                label="About platform_compute_cuts"
              />
              . Provider shares are spendable on cloud computing, game credits, and other on-site services only; never cash-out, never withdrawable. Agent
              rentals escrow{" "}
              <InfoTip
                text="Escrow means coins are held up front when you book and settled downward by metered heartbeats — the final charge can only go down, never above escrow."
                label="About escrow"
              />{" "}
              your coins up front and settle metered usage by heartbeat — the final
              charge can only go down, never above escrow.
            </p>
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
              <div className="flex h-12">
                <div className="flex w-3/4 items-center justify-center bg-cyan-300/80 text-sm font-black text-slate-950">
                  75% provider credits (on-site only)
                </div>
                <div className="flex w-1/4 items-center justify-center bg-violet-400/70 text-sm font-black text-slate-950">
                  25%
                </div>
              </div>
              <p className="bg-black/40 px-4 py-3 text-xs text-slate-400">
                Example: 400-coin job → 300 coins provider credits, 100 coins platform. Buyer paid $4.00. Credits are on-site only; never cash-out, never withdrawable.
              </p>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6 sm:p-8">
            <h2 className="text-xl font-black sm:text-2xl">
              How Self-Hosted BYOK works{" "}
              <InfoTip
                text="BYOK = bring your own keys. You connect your own RunPod / DigitalOcean keys, pay providers at cost, and we add the $420/mo org subscription plus a 15% orchestration markup."
                label="About BYOK"
              />
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Connect your own provider keys once. Your workloads bill your provider accounts
              directly at cost. 4weird meters the same usage and adds a{" "}
              <strong className="text-white">15% API/compute markup + $420/mo per-org subscription</strong>{" "}
              for orchestration, workspaces, messaging, self-host help, and support. Each org
              includes <strong className="text-white">100 seats</strong>; additional seats are{" "}
              <strong className="text-white">$4.20/mo each</strong>. No escrow, no markups hiding
              anywhere else. Self-hosting requires a current paid plan; there is no free
              self-host right.
            </p>
            <ul className="mt-5 space-y-2.5">
              <Check>$420/mo per org covers 100 seats + unlimited workspaces + team seats on your stack</Check>
              <Check>15% metered API/compute markup settled monthly in coins or card</Check>
              <Check>Enterprise / hyperscaler quotes down to as little as 9% markup - Talk to Sales</Check>
              <Check>Cancel anytime; your keys and data stay yours</Check>
            </ul>
          </div>
        </div>

        {/* Comparison */}
        <div className="mt-4 overflow-x-auto rounded-3xl border border-white/10">
          <table className="w-full min-w-[640px] border-collapse bg-white/[.02] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-slate-400">
                <th className="px-5 py-4">What</th>
                <th className="px-5 py-4">Cloud (metered)</th>
                <th className="px-5 py-4">Self-Hosted BYOK</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-b border-white/5">
                <td className="px-5 py-4 font-bold text-white">Platform fee</td>
                <td className="px-5 py-4">$0 — just the 25% premium included in metered coins</td>
                <td className="px-5 py-4">$420/mo per org (100 seats incl., +$4.20/seat); Enterprise custom quote</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-5 py-4 font-bold text-white">Compute premium</td>
                <td className="px-5 py-4">25% included (25/75 split, escrowed)</td>
                <td className="px-5 py-4">15% on at-cost provider bills (Mid-tier); down to 9% on Enterprise</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-5 py-4 font-bold text-white">Who pays provider</td>
                <td className="px-5 py-4">We do — out of your gross coin price</td>
                <td className="px-5 py-4">You do — directly, at cost</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-5 py-4 font-bold text-white">Best for</td>
                <td className="px-5 py-4">Trying agents, bursts, small teams</td>
                <td className="px-5 py-4">Heavy or steady workloads, regulated keys</td>
              </tr>
              <tr>
                <td className="px-5 py-4 font-bold text-white">Break-even hint</td>
                <td className="px-5 py-4" colSpan={2}>
                  Self-hosted wins once your monthly 10% premium savings pass $420 — roughly
                  $4,200/mo of cloud compute.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* VibeCodeWorker license */}
      <section className="mx-auto max-w-6xl px-4 sm:px-5" aria-label="VibeCodeWorker license">
        <div className="rounded-3xl border border-violet-300/30 bg-gradient-to-b from-violet-400/10 to-white/[.02] p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">Private license · not open source</p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">VibeCodeWorker licensing, plainly stated</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
            The 4weird platform, VibeCodeWorker, and the games in this repo are proprietary; all
            rights reserved. Full text lives in the repo <code className="text-cyan-300">LICENSE</code> file
            and the binding Terms at <Link href="/terms" className="text-cyan-200 underline">/terms</Link>.
            What follows is the pricing-page summary; where they differ, the LICENSE + Terms + your
            paid order control.
          </p>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-amber-300/30 bg-black/30 p-5">
              <h3 className="font-black text-amber-200">Mid-tier self-host - $420/mo per org</h3>
              <ul className="mt-3 space-y-2.5">
                <Check>Up to 100 user seats included; additional seats $4.20/mo each</Check>
                <Check>Permission + help to self-host VibeCodeWorker on your infrastructure</Check>
                <Check>15% API / compute markup over at-cost provider bills</Check>
                <Check>No free or implied self-host right; a current paid plan is required</Check>
              </ul>
            </div>
            <div className="rounded-2xl border border-cyan-300/30 bg-black/30 p-5">
              <h3 className="font-black text-cyan-200">Enterprise / hyperscaler - Get a Quote</h3>
              <ul className="mt-3 space-y-2.5">
                <Check>Custom monthly pricing - Talk to Sales (matt@mattyjacks.com)</Check>
                <Check>Volume API / compute markup down to as little as 9%</Check>
                <Check>Scale, term, prepayment, and support scope set the final number</Check>
                <Check>No enterprise rights until a signed order or written quote is in place</Check>
              </ul>
            </div>
          </div>
          <ul className="mt-6 space-y-2.5">
            <Check>25% platform cut is part of every hosted price (25% platform / 75% provider or creator as on-site credits, never cash-out), never on top; routing around metering or the cut violates the license</Check>
            <Check>Contributions assign to us: work you submit through the platform is assigned to MattyJacks LLC (exclusive perpetual license where assignment is not possible); contributors do not retain ownership, and we may improve, modify, or remove games without further permission</Check>
            <Check>Attribution required: games built or tested with VibeCodeWorker must credit “Built with help from 4weird VibeCodeWorker - 4weird.com/vibecodeworker” in the game credits</Check>
            <Check>Prepay preferred: fees are due as quoted plus taxes; late amounts may bear interest and collection costs where allowed; we reserve the right to collect amounts owed by any lawful means (charge on file, suspension, offset, collections, court)</Check>
          </ul>
        </div>
      </section>

      {/* Coin packs */}
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-5 sm:pb-16" aria-label="Vibe Coin packs">
        <h2 className="text-2xl font-black sm:text-3xl">Vibe Coin packs</h2>
        <p className="mt-3 max-w-2xl text-slate-300">
          100 Vibe Coins cost exactly $1.00 at 1¢ per coin. There is intentionally no 100-coin
          pack — 100 coins is the free trial. Pick a stash below.
        </p>
        <div className="mt-8">
          <PackCatalog />
          <p className="mt-4 max-w-2xl text-sm text-slate-400">
            Changed your mind? Unspent coins from purchases made in the last 90 days can be refunded
            (pro-rated when part of a pack is already spent). Free coins are never refundable. Request
            a refund from your account page; refunded lots are marked refunded.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-5 sm:pb-24" aria-label="Pricing FAQ">
        <h2 className="text-2xl font-black sm:text-3xl">Questions, answered</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            {
              q: "Is the 25% added on top?",
              a: "Never. Every coin price and every compute meter is gross — the 25% platform cut is already inside it. $1.00 always buys exactly 100 coins.",
            },
            {
              q: "Can compute ever bill above escrow?",
              a: "No. Agent bookings escrow coins up front and heartbeats settle metered seconds downward. The 25/75 split applies to the metered gross only.",
            },
            {
              q: "What does Self-Hosted $420/mo include?",
              a: "Up to 100 seats per org (extra seats $4.20/mo each), unlimited workspaces, projects, messaging, cloud orchestration against your own keys, self-host help, and support. Compute itself bills your providers at cost plus the 15% API/compute markup. Enterprise quotes go down to 9% - Talk to Sales.",
            },
            {
              q: "Can I switch between Cloud and BYOK?",
              a: "Yes — per workspace. Burst on cloud, settle steady work on your own keys. Your coins, saves, clans, and leaderboards follow you.",
            },
            {
              q: "How is game AI priced?",
              a: "Games with required or optional AI (OpenAI dialogue bots, AI directors on rented RunPods, voice lines in 9 voices) meter per token, char, decision, or GPU minute with the same 25% cut included. The Gaming Buddy meters the same way — watch every cent on /my/usage/.",
            },
            {
              q: "What voices does the Gaming Buddy use?",
              a: "All 9 OpenAI voices: Alloy, Ash, Coral, Echo, Fable, Onyx, Nova, Sage, Shimmer — Nova by default — on tts-1 ($15/1M chars) or tts-1-hd ($30/1M chars) at 0.5x–2.0x speed. Every turn meters true upstream cost (chat tokens + voice chars + optional screen snapshot + database writes) in Coins + CentiCentCoins with the 25% cut included.",
            },
            {
              q: "How does renting games work?",
              a: "The first load costs a proportional fee for its exact fresh bytes (default 1 coin for 1 MiB — smaller loads pay the exact fraction, down to 1 centicentcoin), then running play bills the hourly rate (default 1 coin/hr) per second from the first second — about $0.01 per hour. Same-version replays are free for 24h, a still-playing check appears every 5 hours, and developers can set 0–100 coins per load/hour. Guests play free with skippable ads instead.",
            },
            {
              q: "Can I really play 5 hours a day for free?",
              a: "Yes. A 5-hour session on default rates costs about 6 coins (up to 1 coin load for a full 1 MiB plus 5 coins of per-second play) — covered by the 100-coin signup trial many times over, and streak bonuses pay up to 12 coins a day.",
            },
            {
              q: "Who owns work I contribute?",
              a: "You assign it to us on submission: games, code, art, and other contributions made through the platform are assigned to MattyJacks LLC (or exclusively licensed where assignment is not possible). Contributors do not retain ownership, and we may improve, modify, adapt, or remove games without further permission, except where the Terms expressly provide creator coin credits (the 75% on-site share, spendable on cloud computing, game credits, and other on-site services only; never cash-out). See LICENSE for the full assignment text.",
            },
            {
              q: "Do I have to credit VibeCodeWorker?",
              a: "Yes, when you used it. Games built or tested with VibeCodeWorker must carry a visible credit: Built with help from 4weird VibeCodeWorker - 4weird.com/vibecodeworker. Removing a required credit can lead to delisting.",
            },
            {
              q: "What are the self-host seat limits?",
              a: "Mid-tier is $420/mo per org including 100 seats; extra seats are $4.20/mo each. Metered API/compute carries a 15% markup. Enterprise/hyperscaler plans are custom-quoted (Talk to Sales) with markup down to as little as 9%.",
            },
            {
              q: "What if I do not pay?",
              a: "We prefer prepayment to avoid interruptions. Fees are due as quoted plus taxes, and late amounts may bear interest and collection costs where allowed. We reserve the right to collect amounts owed by any lawful means; including charging the method on file, suspending seats or keys, offsetting credits, or pursuing collections or court claims.",
            },
            {
              q: "Do guests have to pay or watch ads?",
              a: "Guests never pay and never need an account: they get free loads every day (IP-limited), then keep playing by viewing instantly-skippable house ads, with an ad banner every 30 minutes. Cloud saves, multiplayer, AI, and Buddy stay signed-in only — which is exactly why signing up beats ad-watching.",
            },
          ].map((item) => (
            <CompactDetails key={item.q} summary={item.q}>
              <p className="text-sm leading-relaxed text-slate-300">{item.a}</p>
            </CompactDetails>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/account"
            className="rounded-full bg-cyan-300 px-6 py-3 text-center font-bold text-slate-950 transition hover:bg-cyan-200"
          >
            Open account
          </Link>
          <Link
            href="/buddy"
            className="rounded-full border border-violet-300/50 px-6 py-3 text-center font-semibold text-violet-200 transition hover:bg-violet-300/10"
          >
            Meet the Buddy
          </Link>
          <Link
            href="/my/usage/"
            className="rounded-full border border-white/20 px-6 py-3 text-center font-semibold transition hover:bg-white/10"
          >
            My usage
          </Link>
          <Link
            href="/leaderboards"
            className="rounded-full border border-white/20 px-6 py-3 text-center font-semibold transition hover:bg-white/10"
          >
            Leaderboards
          </Link>
          <Link
            href="/vibecodeworker/docs"
            className="rounded-full border border-white/20 px-6 py-3 text-center font-semibold transition hover:bg-white/10"
          >
            Read the manual
          </Link>
        </div>
      </section>
    </div>
  );
}

