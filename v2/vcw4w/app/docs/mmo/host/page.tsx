import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, SplitBar } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/mmo/host" },
  title: "MMO host guide",
  description:
    "How to rent an MMO server on 4weird Games: pick a game and age band, set the hostFree subsidy, and pay the hourly rental prorated per minute. Population defaults to 32 players.",
};

const theme = {
  bg: "bg-gradient-to-br from-emerald-950 via-slate-950 to-cyan-950",
  border: "border-emerald-400/20",
  chip: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200",
  title: "bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent",
};

export default function MmoHostPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · mmo host"
        title={<>Rent a world. <span className={theme.title}>Set the subsidy.</span></>}
        lede={<>Pick a game and an age band, decide who pays with hostFree, and hold a shard slot for an hourly rental prorated per minute. You always see the quote before anything could bill.</>}
        stats={[
          ["2", "choices: game + band"],
          ["1", "toggle: hostFree"],
          ["32", "players default"],
          ["quotes", "until ledger lands"],
        ]}
        glyph="🏠"
        theme={theme}
        crumb="Host guide"
        art={
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            {["🎮 Pick game", "🛡️ Pick band", "💸 hostFree on/off"].map((t) => (
              <span key={t} className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-white backdrop-blur">
                {t}
              </span>
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="Step one"
        title="Pick a game + an age band — both lock at rent"
        body="Every server is scoped to one game and one band (kids, teens, or adults). The band never changes mid-shard — changing the audience means renting a new server. Some games set a floor: a game rated teens+ rejects a kids room below its minimum band."
      />
      <Steps
        items={[
          [
            "Name the game",
            <>Renting names a known game. Unknown games answer 400 — the quote never guesses.</>,
          ],
          [
            "Set the band",
            <>Kids, teens, or adults — exactly one, no blanks, no forgeries. Below-floor bands for that game are refused; the browser enforces the same floor at create time.</>,
          ],
          [
            "Preview the quote first",
            <>The rent quote is auth-optional and writes nothing: per-player-per-minute for the band, minutes billed, your host total, the subsidized share, and the USD equivalent at 100 coins = $1.00.</>,
          ],
        ]}
      />
      <Callout tone="cyan" title="Match the band to the crowd.">
        Adults enter all shards, teens enter kids + teens, kids enter kids-only — pick the band your players can actually enter. The full matrix lives in <Link className="underline" href="/docs/mmo/safety">Safety</Link> and <Link className="underline" href="/docs/mmo/age-bands">MMORPG age bands</Link>.
      </Callout>

      <SectionHead
        index="2"
        kicker="Step two — the money question"
        title="hostFree: who pays for the world?"
        body="One boolean on the server row decides the split. When hostFree is on, the host subsidizes all three cost legs — server, load, and rental. When it is off, players split server + load per minute and the host still pays the prorated rental alone."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-400/50 bg-gradient-to-b from-emerald-500/15 to-transparent p-5">
          <p className="font-black">🎁 hostFree ON — the host treats everyone</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Host pays everything: server + load + hourly rental</li>
            <li>Players join and play free — zero meter on their side</li>
            <li>Kids rooms always run this way: 0 coins per player per minute</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-cyan-400/50 bg-gradient-to-b from-cyan-500/15 to-transparent p-5">
          <p className="font-black">🤝 hostFree OFF — the table splits the bill</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Players split server + load per minute, each billed for their own share</li>
            <li>Hourly rental fee still belongs to the host alone, prorated per minute</li>
            <li>Short player funds answer 402 — nothing bills, nobody is half-charged</li>
          </ul>
        </div>
      </div>
      <SplitBar />

      <SectionHead
        index="3"
        kicker="The room"
        title="Rental, population, and the meter"
        body="The rental leg is quoted per hour but settled pro-rata per minute (rental_per_hour × minutes ÷ 60). Shards default to 32 players; rent-time sizes run 2–500. The browser lists headcount against the cap upfront, and entry stays first-come within the band."
      />
      <MockWindow title="rent quote — teens room, hostFree off" badge="quote">
        <div className="space-y-2 font-mono text-xs sm:text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-400">PER-PLAYER · per minute for the band</span><span className="font-bold text-slate-200">quoted</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">RENTAL · hourly, host only</span><span className="font-bold text-slate-200">prorated/min</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">POPULATION · headcount / cap</span><span className="font-bold text-slate-200">32 default</span></div>
          <div className="flex justify-between gap-4 border-t border-white/10 pt-2"><span className="font-bold text-slate-200">SUBSIDIZED · gross minus host total</span><span className="font-bold text-amber-300">platform share</span></div>
          <p className="pt-1 text-[11px] text-slate-500">quotes only until the ledger migration lands — nothing bills yet</p>
        </div>
      </MockWindow>
      <Callout tone="gold" title="Do not build budgets on quotes alone.">
        Today the rent and billing flows return price quotes without moving coins — the charge path settles nothing until the guarded ledger settlement lands. Past quotes will not be back-billed. Same standing as <Link className="underline" href="/docs/mmo/hosting">Hosting a realm</Link>.
      </Callout>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Link
          href="/docs/mmo/player"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-xl"
        >
          <p className="font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-300">← Player guide</p>
          <p className="mt-1 text-sm text-muted-foreground">Join, coin math, free-play.</p>
        </Link>
        <Link
          href="/docs/mmo/faq"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-xl"
        >
          <p className="font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-300">❓ FAQ →</p>
          <p className="mt-1 text-sm text-muted-foreground">Per-minute why, 402/403, broke host.</p>
        </Link>
        <Link
          href="/docs/vibe-coins"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-xl"
        >
          <p className="font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-300">🪙 Vibe Coins</p>
          <p className="mt-1 text-sm text-muted-foreground">Where the coins come from.</p>
        </Link>
      </div>
    </article>
  );
}
