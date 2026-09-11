import type { Metadata } from "next";
import Link from "next/link";
import { PackCatalog } from "@/components/coins/pack-catalog";

export const metadata: Metadata = {
  title: "Pricing | 4weird Games",
  description:
    "Vibe Coins, cloud compute with a 25% premium included, and $420/mo self-hosted BYOK with a 15% compute premium.",
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
          cut, never added on top. New accounts start with a free 100-coin ($1.00) trial. Compute
          works the same way: one gross metered price, split 25% platform / 75% provider. Coins expire one year after receipt, and every purchase automatically spends the oldest unexpired centicentcoins first.
        </p>
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
            href="/teams"
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
              Pay-as-you-go fun money. 1¢ per coin, 25% cut included, free 100-coin trial.
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
              Rent AI agents and team cloud by the hour or second. One gross coin price covers the
              provider + our 25% platform cut.
            </p>
            <ul className="mt-5 space-y-2.5">
              <Check>400 coins ($4.00) of compute = 100 platform / 300 provider</Check>
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
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Self-hosted · BYOK</p>
            <h2 className="mt-2 text-2xl font-black">Bring your own keys</h2>
            <p className="mt-2 text-3xl font-black">
              $420<span className="text-base font-semibold text-slate-400">/mo + 15% compute premium</span>
            </p>
            <p className="mt-3 text-sm text-slate-300">
              Plug in your own RunPod / DigitalOcean keys. You pay providers at cost — we add a
              flat $420/mo platform fee plus a 15% metered premium for orchestration.
            </p>
            <ul className="mt-5 space-y-2.5">
              <Check>$420/mo platform: workspaces, escrow-free metering, support</Check>
              <Check>15% premium on your at-cost compute (vs 25% on cloud)</Check>
              <Check>Your keys, your limits, your invoices — we never hold funds</Check>
            </ul>
            <Link
              href="/teams"
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
            spread over 60 minutes × 60 seconds, so you never pay for time you didn&apos;t play. Every 5 hours a
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

      {/* How the 25% works */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-5 sm:py-16" aria-label="How compute pricing works">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6 sm:p-8">
            <h2 className="text-xl font-black sm:text-2xl">How the 25% compute premium works</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Every cloud meter shows one gross price in coins. Behind it we split{" "}
              <strong className="text-white">25% platform / 75% provider</strong> and attribute
              every cent in <code className="text-cyan-300">platform_compute_cuts</code>. Agent
              rentals escrow your coins up front and settle metered usage by heartbeat — the final
              charge can only go down, never above escrow.
            </p>
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
              <div className="flex h-12">
                <div className="flex w-3/4 items-center justify-center bg-cyan-300/80 text-sm font-black text-slate-950">
                  75% provider
                </div>
                <div className="flex w-1/4 items-center justify-center bg-violet-400/70 text-sm font-black text-slate-950">
                  25%
                </div>
              </div>
              <p className="bg-black/40 px-4 py-3 text-xs text-slate-400">
                Example: 400-coin job → 300 coins provider, 100 coins platform. Buyer paid $4.00.
              </p>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6 sm:p-8">
            <h2 className="text-xl font-black sm:text-2xl">How Self-Hosted BYOK works</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Connect your own provider keys once. Your workloads bill your provider accounts
              directly at cost. 4weird meters the same usage and adds a{" "}
              <strong className="text-white">15% premium + $420/mo platform subscription</strong>{" "}
              for orchestration, workspaces, messaging, and support. No escrow, no markups hiding
              anywhere else.
            </p>
            <ul className="mt-5 space-y-2.5">
              <Check>$420/mo covers unlimited workspaces + team seats on your stack</Check>
              <Check>15% metered premium settled monthly in coins or card</Check>
              <Check>Cancel anytime — your keys and data stay yours</Check>
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
                <td className="px-5 py-4">$420/mo flat</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-5 py-4 font-bold text-white">Compute premium</td>
                <td className="px-5 py-4">25% included (25/75 split, escrowed)</td>
                <td className="px-5 py-4">15% on at-cost provider bills</td>
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

      {/* Coin packs */}
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-5 sm:pb-16" aria-label="Vibe Coin packs">
        <h2 className="text-2xl font-black sm:text-3xl">Vibe Coin packs</h2>
        <p className="mt-3 max-w-2xl text-slate-300">
          100 Vibe Coins cost exactly $1.00 at 1¢ per coin. There is intentionally no 100-coin
          pack — 100 coins is the free trial. Pick a stash below.
        </p>
        <div className="mt-8">
          <PackCatalog />
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
              a: "Unlimited workspaces, projects, messaging, cloud orchestration against your own keys, and support. Compute itself bills your providers at cost plus the 15% premium.",
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
              a: "All 9 OpenAI voices: Alloy, Ash, Coral, Echo, Fable, Onyx, Nova, Sage, Shimmer — on tts-1 or tts-1-hd at 0.5x–2.0x speed, 2 coins per 1k chars with the 25% cut included.",
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
              q: "Do guests have to pay or watch ads?",
              a: "Guests never pay and never need an account: they get free loads every day (IP-limited), then keep playing by viewing instantly-skippable house ads, with an ad banner every 30 minutes. Cloud saves, multiplayer, AI, and Buddy stay signed-in only — which is exactly why signing up beats ad-watching.",
            },
          ].map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-white/10 bg-white/[.03] p-5"
            >
              <summary className="cursor-pointer font-bold transition group-open:text-cyan-300">
                {item.q}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{item.a}</p>
            </details>
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
