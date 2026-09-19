import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, SplitBar } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/mmo/player" },
  title: "MMO player guide",
  description:
    "How to join an MMO shard on 4weird Games: check the age band first, split server + load per minute with the room, and play free in kids and host-treated rooms. 100 coins is exactly $1.00.",
};

const theme = {
  bg: "bg-gradient-to-br from-emerald-950 via-slate-950 to-cyan-950",
  border: "border-emerald-400/20",
  chip: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200",
  title: "bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent",
};

export default function MmoPlayerPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · mmo player"
        title={<>Join a world. <span className={theme.title}>Split the meter.</span></>}
        lede={<>Pick a shard in your age band, join through the gate, and pay only your share of server + load per minute — or nothing at all in kids and host-treated rooms. Every price already includes the 25% cut.</>}
        stats={[
          ["100 🪙", "= exactly $1.00"],
          ["3", "bands: kids · teens · adults"],
          ["0 🪙", "kids + hostFree rooms"],
          ["403", "wrong band, never bills"],
        ]}
        glyph="🎮"
        theme={theme}
        crumb="Player guide"
        art={
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            {["🛡️ Check band", "🚪 Join shard", "🪙 Split per minute"].map((t) => (
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
        title="Check the band, then join"
        body="Every shard carries one age band — kids, teens, or adults. The gate compares your band against the shard's band before anything else: adults enter all shards, teens enter kids + teens, kids enter kids-only. Nobody enters above their band, ever."
      />
      <Steps
        items={[
          [
            "Read the shard row",
            <>The browser lists age band + headcount upfront. If the band is above yours, stop — the gate answers 403 and nothing bills.</>,
          ],
          [
            "Join through the gate",
            <>Joining names the server and your band (<code>POST /api/mmo/join</code>). A pure preview lives at <code>GET /api/mmo/gate?playerBand=…&serverBand=…</code> — no session, nothing stored.</>,
          ],
          [
            "A deny names the rule",
            <>Band mismatches answer 403 with both bands in the reason (e.g. teens players may not enter adults shards). Bad input or an unknown server answers 400 — also never a bill.</>,
          ],
        ]}
      />
      <Callout tone="emerald" title="Same gate as the realms guide.">
        This entry matrix is identical to <Link className="underline" href="/docs/mmo/age-bands">MMORPG age bands</Link> — one rule everywhere, enforced by the same band comparison. Unknown or forged bands fail closed.
      </Callout>

      <SectionHead
        index="2"
        kicker="The money"
        title="100 coins = $1.00, split per minute"
        body="One coin is one cent ($0.01) and the smallest accountable unit is a centicentcoin ($0.0001) — all meter math runs in integers, so shares land dust-free. In a normal room, players split server + load per minute evenly; the host alone pays the hourly rental, prorated per minute."
      />
      <MockWindow title="session quote — teens room, 4 players, 60 min" badge="per-minute">
        <div className="space-y-2 font-mono text-xs sm:text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-400">SERVER + LOAD · per minute ÷ 4</span><span className="font-bold text-slate-200">your share</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">RENTAL · hourly, prorated</span><span className="font-bold text-slate-200">host only</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">BALANCE · SUM over coin_ledger</span><span className="font-bold text-slate-200">checked live</span></div>
          <div className="flex justify-between gap-4 border-t border-white/10 pt-2"><span className="font-bold text-slate-200">SHORT FUNDS → 402, nothing billed</span><span className="font-bold text-amber-300">fail-closed</span></div>
          <p className="pt-1 text-[11px] text-slate-500">confirm the shown total exactly — a stale quote answers 400, not a charge</p>
        </div>
      </MockWindow>
      <SplitBar />

      <SectionHead
        index="3"
        kicker="Free doors"
        title="Kids rooms and host-treated rooms cost you zero"
        body="Kids rooms run fully subsidized (0 coins per player per minute), and any room whose host flips hostFree treats everyone: the host pays server + load + rental, players pay 0. Your balance is read from the paired ledger only — there is no parallel balance column anywhere on this path."
      />
      <Callout tone="gold" title="Short funds answer 402 with manners.">
        The billing check compares your quoted share against your live ledger balance first. If the coins are not there, the answer is 402 and nothing is billed — top up and retry. Wrong-band answers are 403, never a billing outage. Details in <Link className="underline" href="/docs/mmo/faq">the FAQ</Link>.
      </Callout>

      <SectionHead
        index="4"
        kicker="Worked example"
        title="Your first hour in a teens room, coin by coin"
        body="Say you join a teens room with three other players for 60 minutes. Server plus load is quoted per minute for the band and split four ways, while the host carries the hourly rental alone. You confirm one exact total up front, and short funds answer 402 before anything bills."
      />
      <Steps
        items={[
          [
            "Read the quote out loud",
            <>The quote names the per player per minute figure, the minutes, your share, and the USD equivalent at 100 coins to $1.00. If any line is missing, stop and re-read it: a complete quote is the whole safety net.</>,
          ],
          [
            "Confirm the exact total",
            <>Confirm the shown total to the centicentcoin. Totals drift as players join and leave, so a stale figure answers 400 and asks you to confirm the fresh one. That retry is free and never a charge.</>,
          ],
          [
            "Play, watch the clock, top up early",
            <>The meter ticks per minute while the shard is live, and a stopped shard bills nothing further. If your balance runs low mid session, top up before the next minute ticks so the 402 never interrupts boss night. Vibe Coin basics live in <Link className="underline" href="/docs/vibe-coins">Vibe Coins</Link>.</>,
          ],
          [
            "Check the receipt after",
            <>Your receipt is <Link className="underline" href="/my/usage/">/my/usage/</Link>: every row ties back to the ledger sum, so the balance you see is the balance the gate checked. Screenshot it if you ever need support.</>,
          ],
        ]}
      />
      <div className="mt-5 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <caption className="bg-muted/50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Player hiccups and the one move that fixes each
          </caption>
          <thead>
            <tr className="border-y border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="px-4 py-2.5">You see</th>
              <th scope="col" className="px-4 py-2.5">It means</th>
              <th scope="col" className="px-4 py-2.5">Do this</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <th scope="row" className="px-4 py-2.5 font-black">402</th>
              <td className="px-4 py-2.5 text-muted-foreground">Short funds for the quoted share</td>
              <td className="px-4 py-2.5 text-muted-foreground">Top up, confirm the fresh total, retry. Nothing billed.</td>
            </tr>
            <tr>
              <th scope="row" className="px-4 py-2.5 font-black">403</th>
              <td className="px-4 py-2.5 text-muted-foreground">Your band may not enter this band room</td>
              <td className="px-4 py-2.5 text-muted-foreground">Pick a room at or below your band. Wallet untouched.</td>
            </tr>
            <tr>
              <th scope="row" className="px-4 py-2.5 font-black">400 on confirm</th>
              <td className="px-4 py-2.5 text-muted-foreground">Quote moved while you read it</td>
              <td className="px-4 py-2.5 text-muted-foreground">Re-read the quote and confirm the new figure.</td>
            </tr>
            <tr>
              <th scope="row" className="px-4 py-2.5 font-black">401</th>
              <td className="px-4 py-2.5 text-muted-foreground">Session expired before confirm</td>
              <td className="px-4 py-2.5 text-muted-foreground">Sign in again, re-read the quote, retry.</td>
            </tr>
            <tr>
              <th scope="row" className="px-4 py-2.5 font-black">0 coins due</th>
              <td className="px-4 py-2.5 text-muted-foreground">Kids room or hostFree treat</td>
              <td className="px-4 py-2.5 text-muted-foreground">Play free. The host pays the meter on these nights.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Callout tone="emerald" title="Join like a regular, not a tourist.">
        Regulars check band, quote, and balance before every session, in that order. Ten seconds of reading avoids every common failure on this page, and <Link className="underline" href="/docs/mmo/faq">the FAQ</Link> covers the rare ones. Bring a friend from the right band and the split gets cheaper for everyone at the table.
      </Callout>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Link
          href="/docs/mmo/host"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-xl"
        >
          <p className="font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-300">🏠 Host guide →</p>
          <p className="mt-1 text-sm text-muted-foreground">Rent, subsidy, and population.</p>
        </Link>
        <Link
          href="/docs/mmo/safety"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-xl"
        >
          <p className="font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-300">🛡️ Safety →</p>
          <p className="mt-1 text-sm text-muted-foreground">Bands, birthdays, chat, reports.</p>
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
