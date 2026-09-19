import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, SplitBar } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/mmo/hosting" },
  title: "Hosting an MMORPG server",
  description:
    "How to rent an MMORPG server on 4weird Games: pick a game and age band, the hostFree toggle (host pays vs players split), hourly rental fee, and quotes-only billing until the ledger migration lands.",
};

const theme = {
  bg: "bg-gradient-to-br from-emerald-950 via-slate-950 to-cyan-950",
  border: "border-emerald-400/20",
  chip: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200",
  title: "bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent",
};

export default function MmorpgHostingPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · mmorpg hosting"
        title={<>Rent a world. <span className={theme.title}>Set the terms.</span></>}
        lede={<>Pick a game, pick an age band, flip hostFree to decide who pays — then the meter runs server + load per minute plus an hourly rental fee. You always see the quote before anything bills.</>}
        stats={[
          ["2", "choices: game + band"],
          ["1", "toggle: hostFree"],
          ["1/hr", "hourly rental fee"],
          ["quotes", "until ledger lands"],
        ]}
        glyph="🏠"
        theme={theme}
        crumb="Hosting a server"
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
        title="Pick a game + an age band"
        body="Every server is scoped to one game and one age band: kids, teens, or adults. The band is set at rent time and never changes mid-shard — a kids shard stays a kids shard for its whole life."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["🎮 Game", "Any MMORPG-compatible cabinet. Rates follow the game's own play meter underneath."],
          ["🛡️ kids | teens | adults", "The shard's ceiling: who may enter is fixed by the band you choose. Entry rules live on the age-bands page."],
          ["🔒 Locked at rent", "No mid-shard band swaps — changing the audience means renting a new server."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-5">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <Callout tone="cyan" title="New here? Read the entry rule first.">
        Adults enter all shards, teens enter kids + teens, kids enter kids-only. Pick the band your crowd can actually
        enter — details in <Link className="underline" href="/docs/mmo/age-bands">Age bands</Link>.
      </Callout>

      <SectionHead
        index="2"
        kicker="Step two — the money question"
        title="hostFree: who pays for the world?"
        body="One toggle decides the whole economy of your shard. Flip it at rent time; the shard page always shows the current setting so nobody is surprised."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-400/50 bg-gradient-to-b from-emerald-500/15 to-transparent p-5">
          <p className="font-black">🎁 hostFree ON — the host treats everyone</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Host pays everything: server + load + hourly rental</li>
            <li>Players join and play free — zero meter on their side</li>
            <li>Best for: parties, clans recruiting, generous whales</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-cyan-400/50 bg-gradient-to-b from-cyan-500/15 to-transparent p-5">
          <p className="font-black">🤝 hostFree OFF — the table splits the bill</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Players split server + load per minute, each billed for their own share</li>
            <li>Hourly rental fee still belongs to the host alone</li>
            <li>Best for: sustained worlds where everyone chips in</li>
          </ul>
        </div>
      </div>
      <MockWindow title="rent preview — emberfall raid (teens)" badge="quote">
        <div className="space-y-2 font-mono text-xs sm:text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-400">SERVER · per minute, while live</span><span className="font-bold text-slate-200">quoted</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">LOAD · per minute, by bytes</span><span className="font-bold text-slate-200">quoted</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">RENTAL · hourly fee, host only</span><span className="font-bold text-slate-200">quoted</span></div>
          <div className="flex justify-between gap-4 border-t border-white/10 pt-2"><span className="font-bold text-slate-200">hostFree OFF → players split server+load</span><span className="font-bold text-amber-300">per-minute</span></div>
          <p className="pt-1 text-[11px] text-slate-500">quotes only until the ledger migration lands — nothing bills yet</p>
        </div>
      </MockWindow>

      <SectionHead
        index="3"
        kicker="The meter"
        title="Server + load per minute, rental per hour"
        body="Three parts, each quoted upfront. The 25% cut is already inside every figure — 100 🪙 is exactly $1.00."
      />
      <Steps
        items={[
          [
            "Server — per minute, while the shard is live",
            <>Base compute for keeping the world ticking. Pauses when the shard is stopped; never bills for a dead world.</>,
          ],
          [
            "Load — per minute, by actual bytes",
            <>Bandwidth and database bytes the shard moves, measured server-side like clan upkeep and play sessions.</>,
          ],
          [
            "Rental — hourly fee, host only, always",
            <>Flat fee per hour for holding the shard slot. The host pays it in both modes — it is never split across players.</>,
          ],
        ]}
      />
      <SplitBar />

      <SectionHead
        index="4"
        kicker="Code truth"
        title="Quotes only — until the ledger migration lands"
        body="Today the hosting flow returns price quotes without moving coins. Live per-minute billing ships with the coin-ledger migration; until then, treat every figure on the rent page as an estimate."
      />
      <Callout tone="gold" title="Do not build budgets on quotes alone.">
        Quotes preview the server + load + rental math so hosts can plan, but no ledger rows are written yet. When the
        migration lands, this page will say so — and past quotes will not be back-billed.
      </Callout>

      <SectionHead
        index="5"
        kicker="Worked example"
        title="Price a Friday raid night before you rent"
        body="A concrete quote walkthrough for a teens raid shard with hostFree off, so every player knows their share before the horn sounds."
      />
      <MockWindow title="rent worksheet: emberfall raid, 3 hours, 20 players" badge="planning">
        <div className="space-y-2 font-mono text-xs sm:text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-400">SERVER · 180 min × quoted rate</span><span className="font-bold text-slate-200">quoted total</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">LOAD · 20 players × bytes moved</span><span className="font-bold text-slate-200">split per player</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">RENTAL · 3 hr fee, host only</span><span className="font-bold text-slate-200">host pays</span></div>
          <div className="flex justify-between gap-4 border-t border-white/10 pt-2"><span className="font-bold text-slate-200">Post the three lines in the event thread</span><span className="font-bold text-amber-300">no surprises</span></div>
          <p className="pt-1 text-[11px] text-slate-500">announce hostFree setting + per player estimate up front</p>
        </div>
      </MockWindow>

      <SectionHead
        index="6"
        kicker="Troubleshooting"
        title="Empty shards, wrong band, quote confusion"
      />
      <ul className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <li className="rounded-xl border border-border bg-card p-3">🏜️ <strong className="text-foreground">Shard stays empty:</strong> the band may be narrower than your crowd, or the event time unclear. Confirm the band admits your players in <Link className="underline" href="/docs/mmo/age-bands">Age bands</Link>, then post game, band, hostFree setting, and start time in one message.</li>
        <li className="rounded-xl border border-border bg-card p-3">🛡️ <strong className="text-foreground">Picked the wrong band:</strong> bands lock at rent for the shard lifetime, so there is no upgrade path. Rent a new server with the right band and sunset the old shard rather than fighting entry denials.</li>
        <li className="rounded-xl border border-border bg-card p-3">🧾 <strong className="text-foreground">Players dispute the split:</strong> the shard page shows the live hostFree setting, and the rent preview quotes server plus load plus rental separately. Screenshot the preview into the event thread before launch week.</li>
        <li className="rounded-xl border border-border bg-card p-3">⏸️ <strong className="text-foreground">Shard idle but meter worries:</strong> server billing pauses when the shard stops, while the hourly rental holds the slot. Stop the shard between sessions and end it when the season closes.</li>
        <li className="rounded-xl border border-border bg-card p-3">🪙 <strong className="text-foreground">Where do coins come from?</strong> Hosts fund rental and server costs in Vibe Coins at 100 coins to $1.00, with the 25% cut already inside every figure. Wallet and parity rules live in <Link className="underline" href="/docs/vibe-coins">Vibe Coins</Link>.</li>
      </ul>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Link
          href="/docs/mmo"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-xl"
        >
          <p className="font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-300">← MMORPG mode</p>
          <p className="mt-1 text-sm text-muted-foreground">Shards, dimensions, world bosses.</p>
        </Link>
        <Link
          href="/docs/mmo/age-bands"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-xl"
        >
          <p className="font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-300">🛡️ Age bands →</p>
          <p className="mt-1 text-sm text-muted-foreground">Who may enter your shard.</p>
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
