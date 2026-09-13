import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, SplitBar } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/mmorpg" },
  title: "MMORPG mode",
  description:
    "What MMORPG mode is on 4weird Games: 1D horde, 2D siege, 3D raid, 32-player shards, world bosses, renting a server, and age-band entry rules.",
};

const theme = {
  bg: "bg-gradient-to-br from-emerald-950 via-slate-950 to-cyan-950",
  border: "border-emerald-400/20",
  chip: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200",
  title: "bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent",
};

export default function MmorpgPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · raid night, every night"
        title={<>One world. <span className={theme.title}>Thirty-two heroes.</span></>}
        lede={<>MMORPG mode turns any compatible cabinet into a persistent shared world: pick your dimension, join a 32-player shard, and take down world bosses together. Reading is public; entering a shard needs an account.</>}
        stats={[
          ["32", "players per shard"],
          ["3", "dimensions: 1D · 2D · 3D"],
          ["3", "age bands gate entry"],
          ["100 🪙", "= exactly $1.00"],
        ]}
        glyph="🐉"
        theme={theme}
        crumb="MMORPG mode"
        art={
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            {["🕳️ 1D Horde", "🏰 2D Siege", "🐲 3D Raid"].map((t) => (
              <span key={t} className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-white backdrop-blur">
                {t}
              </span>
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="What it is"
        title="A persistent world on top of the arcade"
        body="MMORPG mode is not a separate game — it is a way to play. A host rents a server on a game, picks an age band for the shard, and up to 32 players share one persistent world: same map, same bosses, same loot clock. Leave and come back — the world kept going without you."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["🌍 Persistent", "The shard outlives any single session. Boss timers, siege walls, and horde waves keep ticking while you sleep."],
          ["👥 Shared", "32 players per shard — party up, split roles, revive each other. Solo is allowed; lonely is optional."],
          ["🪙 Metered", "Shards cost coins to run: server + load per minute plus an hourly rental fee. Who pays is the host's call — see hosting."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-400/50">
            <p className="font-black">{t}</p>
            <p className="mt-2 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <SectionHead
        index="2"
        kicker="Pick your dimension"
        title="1D horde · 2D siege · 3D raid"
        body="Every MMORPG shard runs in one of three dimensions. Same shard rules, same 32-player cap — different fantasy."
      />
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {[
          ["🕳️ 1D Horde", "Survive the tunnel", "border-emerald-400/50 from-emerald-500/20 to-transparent", "Endless corridor waves: hold the line with 31 strangers as the horde scales every wave. Best for drop-in play — join mid-wave, leave between waves, keep your loot."],
          ["🏰 2D Siege", "Take the castle", "border-cyan-400/50 from-cyan-500/20 to-transparent", "Top-down territory war: two warbands batter walls, hold gates, and starve the keep. Best for tactics players — siege engines, supply lines, and betrayals at the gatehouse."],
          ["🐲 3D Raid", "Slay the boss", "border-teal-400/50 from-teal-500/20 to-transparent", "Full-3D boss arenas: learn the phases, dodge the telegraphs, burn the boss before the enrage timer. Best for coordinated parties — tanks, heals, and damage all matter."],
        ].map(([e, t, s, b]) => (
          <div key={t} className={`rounded-3xl border bg-gradient-to-b p-6 text-center transition hover:-translate-y-1 ${s}`}>
            <p aria-hidden="true" className="docs-float text-5xl">{e}</p>
            <p className="mt-3 font-black">{t}</p>
            <p className="mt-2 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <SectionHead
        index="3"
        kicker="How shards fill"
        title="32 players, one world, fair entry"
        body="Shards cap at 32 players. Entry is first-come within your age band — adults enter any shard, teens enter kids and teens shards, kids enter kids-only shards. Full details on the age-bands page."
      />
      <MockWindow title="shard browser — gravegain raid" badge="live">
        <div className="space-y-2 font-mono text-xs sm:text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-400">🐲 Emberfall Raid · teens · 27/32</span><span className="font-bold text-emerald-300">JOIN →</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">🏰 Ashgate Siege · adults · 32/32</span><span className="font-bold text-rose-300">FULL</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">🕳️ Mole Warren Horde · kids · 11/32</span><span className="font-bold text-emerald-300">JOIN →</span></div>
          <p className="pt-1 text-[11px] text-slate-500">shards list age band + headcount upfront · no band, no entry</p>
        </div>
      </MockWindow>
      <div className="mt-5 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <caption className="bg-muted/50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Entry matrix — your band × shard band
          </caption>
          <thead>
            <tr className="border-y border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="px-4 py-2.5">You are</th>
              <th scope="col" className="px-4 py-2.5">🧒 kids shard</th>
              <th scope="col" className="px-4 py-2.5">🧑 teens shard</th>
              <th scope="col" className="px-4 py-2.5">🧙 adults shard</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <th scope="row" className="px-4 py-2.5 font-black">🧒 kids player</th>
              <td className="px-4 py-2.5 font-bold text-emerald-600 dark:text-emerald-300">ENTER</td>
              <td className="px-4 py-2.5 text-muted-foreground">DENIED</td>
              <td className="px-4 py-2.5 text-muted-foreground">DENIED</td>
            </tr>
            <tr>
              <th scope="row" className="px-4 py-2.5 font-black">🧑 teens player</th>
              <td className="px-4 py-2.5 font-bold text-emerald-600 dark:text-emerald-300">ENTER</td>
              <td className="px-4 py-2.5 font-bold text-emerald-600 dark:text-emerald-300">ENTER</td>
              <td className="px-4 py-2.5 text-muted-foreground">DENIED</td>
            </tr>
            <tr>
              <th scope="row" className="px-4 py-2.5 font-black">🧙 adults player</th>
              <td className="px-4 py-2.5 font-bold text-emerald-600 dark:text-emerald-300">ENTER</td>
              <td className="px-4 py-2.5 font-bold text-emerald-600 dark:text-emerald-300">ENTER</td>
              <td className="px-4 py-2.5 font-bold text-emerald-600 dark:text-emerald-300">ENTER</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SectionHead
        index="4"
        kicker="The big ones"
        title="World bosses run on a clock"
        body="Each dimension spawns world bosses on a visible timer — announcements go out shard-wide minutes before spawn. Boss loot splits among participants present for the kill; showing up late still beats never showing up."
      />
      <Steps
        items={[
          [
            "Watch the sky",
            <>Spawn timers are public on the shard page — no secret discords, no insider calls. When the horn sounds, get to the arena.</>,
          ],
          [
            "Bring a party (or find one)",
            <>32 slots means pugs always exist. Tanks hold aggro, heals keep the line, damage ends the argument — play your build.</>,
          ],
          [
            "Share the fall",
            <>Loot splits among everyone present for the kill. Participation is the only ticket — damage meters settle bragging rights, not shares.</>,
          ],
        ]}
      />
      <Callout tone="gold" title="Boss loot follows the same coin rule as everything else.">
        Priced rewards already include the 25% cut — 100 🪙 is exactly $1.00, and the split bar below never changes.
      </Callout>
      <SplitBar />

      <SectionHead
        index="✦"
        kicker="Keep reading"
        title="Host a world, or learn the gate"
        body="Two short pages finish the picture: renting and paying for a server, and exactly who may enter which shard."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link
          href="/docs/mmorpg/hosting"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-xl"
        >
          <p className="font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-300">🏠 Hosting a server</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Rent a server: game + age band, hostFree on or off, hourly rental, quotes until the ledger migration lands.
          </p>
        </Link>
        <Link
          href="/docs/mmorpg/age-bands"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-xl"
        >
          <p className="font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-300">🛡️ Age bands</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Adults enter all, teens enter kids + teens, kids enter kids-only. DOB checked in memory, never stored.
          </p>
        </Link>
      </div>

      <p className="mt-8 rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        Related:{" "}
        <Link className="underline" href="/docs/playing-games">Playing games</Link> ·{" "}
        <Link className="underline" href="/docs/vibe-coins">Vibe Coins</Link> ·{" "}
        <Link className="underline" href="/docs/privacy-safety">Privacy &amp; safety</Link>
      </p>
    </article>
  );
}
