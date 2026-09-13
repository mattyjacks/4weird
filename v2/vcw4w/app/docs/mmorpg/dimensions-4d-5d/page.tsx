import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/mmorpg/dimensions-4d-5d" },
  title: "MMORPG dimensions 4D and 5D",
  description:
    "Dream Golf 4D dream-raid and Multiverse 5D multiverse mode on 4weird Games: universes, hops, and paradox rules, teens-floor and adults-only demo bands, and how the 127 food consumables scale into 4D and 5D.",
};

const theme = {
  bg: "bg-gradient-to-br from-emerald-950 via-slate-950 to-cyan-950",
  border: "border-emerald-400/20",
  chip: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200",
  title: "bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent",
};

export default function MmorpgDimensions4d5dPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · mmorpg dimensions 4d + 5d"
        title={<>Past the raid. <span className={theme.title}>Into the dream and the multiverse.</span></>}
        lede={<>Dimensions 4D and 5D are the far end of MMORPG mode: Dream Golf 4D runs dream-raid shards where one course folds into many, and Multiverse 5D runs multiverse mode where whole universes hop, collide, and paradox. Same shard rules underneath — wilder fantasy on top.</>}
        stats={[
          ["4D", "Dream Golf · dream-raid"],
          ["5D", "Multiverse · multiverse mode"],
          ["teens / adults", "demo bands: 4D teens-floor, 5D adults-only"],
          ["127", "food consumables work here too"],
        ]}
        glyph="🌀"
        theme={theme}
        crumb="Dimensions 4D · 5D"
        art={
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            {["⛳ 4D dream-raid", "🌌 5D multiverse mode", "🍲 foods scale along"].map((t) => (
              <span key={t} className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-white backdrop-blur">
                {t}
              </span>
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="The two far dimensions"
        title="4D dream-raid · 5D multiverse mode"
        body="1D horde, 2D siege, and 3D raid are the core dimensions. 4D and 5D extend the same shard model — one rented server, one age band, a persistent shared world — into dream and multiverse fantasy."
      />
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-fuchsia-400/50 bg-gradient-to-b from-fuchsia-500/20 to-transparent p-6 text-center transition hover:-translate-y-1">
          <p aria-hidden="true" className="docs-float text-5xl">⛳</p>
          <p className="mt-3 font-black">4D Dream Golf — dream-raid</p>
          <p className="mt-2 text-sm text-muted-foreground">
            One course, many dreams: each hole is a raid encounter that folds and re-folds as the party plays through.
            Clear holes together to push the dream deeper — wipe, and the dream resets the hole, never the shard.
            Demo band is teens-floor: teens and adults may enter, kids may not.
          </p>
        </div>
        <div className="rounded-3xl border border-violet-400/50 bg-gradient-to-b from-violet-500/20 to-transparent p-6 text-center transition hover:-translate-y-1">
          <p aria-hidden="true" className="docs-float text-5xl">🌌</p>
          <p className="mt-3 font-black">5D Multiverse — multiverse mode</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Whole universes as the map: the party hops between parallel shards of the same world, and what you do in
            one universe echoes into the others. Demo band is adults-only: adults players only, no exceptions.
          </p>
        </div>
      </div>

      <SectionHead
        index="2"
        kicker="How multiverse mode works"
        title="Universes, hops, and paradox"
        body="A 5D shard is a stack of universes running the same world in parallel. Hops move the party between them; paradox is what happens when the universes disagree."
      />
      <Steps
        items={[
          [
            "Universes — parallel copies of one world",
            <>Each universe runs the same map and boss clock with its own state: a gate held here may have fallen there. The shard browser lists the 5D realm once; universes are picked inside, not rented separately.</>,
          ],
          [
            "Hops — the party moves together",
            <>Hopping shifts everyone to another universe at once — no splitting the party across realities. Timers and loot clocks keep ticking in the universes you leave, so hop with a plan.</>,
          ],
          [
            "Paradox — echoes have a price",
            <>Actions echo across universes: helping one universe may strain another. Paradox pressure builds as echoes stack, and venting it is part of the run — ignore it and the multiverse pushes back on boss night.</>,
          ],
        ]}
      />
      <MockWindow title="shard status — multiverse 5d (adults)" badge="live">
        <div className="space-y-2 font-mono text-xs sm:text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-400">🌌 universe prime · boss in 12:00</span><span className="font-bold text-emerald-300">STABLE</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">🪞 universe mirror · gate fallen</span><span className="font-bold text-amber-300">ECHO +2</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">🌑 universe hollow · paradox vent due</span><span className="font-bold text-rose-300">VENT →</span></div>
          <p className="pt-1 text-[11px] text-slate-500">hops move the whole party · echoes tick everywhere</p>
        </div>
      </MockWindow>

      <SectionHead
        index="3"
        kicker="Who may enter"
        title="4D teens-floor · 5D adults-only"
        body="The far dimensions sit above the standard entry matrix. The demo realms enforce it strictly: Dream Golf 4D admits teens and adults, and Multiverse 5D admits adults only."
      />
      <div className="mt-5 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <caption className="bg-muted/50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Entry — your band × far dimension (demo realms)
          </caption>
          <thead>
            <tr className="border-y border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="px-4 py-2.5">You are</th>
              <th scope="col" className="px-4 py-2.5">⛳ 4D Dream Golf (teens-floor)</th>
              <th scope="col" className="px-4 py-2.5">🌌 5D Multiverse (adults-only)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <th scope="row" className="px-4 py-2.5 font-black">🧒 kids player</th>
              <td className="px-4 py-2.5 text-muted-foreground">DENIED</td>
              <td className="px-4 py-2.5 text-muted-foreground">DENIED</td>
            </tr>
            <tr>
              <th scope="row" className="px-4 py-2.5 font-black">🧑 teens player</th>
              <td className="px-4 py-2.5 font-bold text-emerald-600 dark:text-emerald-300">ENTER</td>
              <td className="px-4 py-2.5 text-muted-foreground">DENIED</td>
            </tr>
            <tr>
              <th scope="row" className="px-4 py-2.5 font-black">🧙 adults player</th>
              <td className="px-4 py-2.5 font-bold text-emerald-600 dark:text-emerald-300">ENTER</td>
              <td className="px-4 py-2.5 font-bold text-emerald-600 dark:text-emerald-300">ENTER</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Callout tone="rose" title="The floor is the feature in 5D.">
        Multiverse shards are adults-only end to end — teens and kids players can never enter, and hosts cannot lower
        the floor. Rent a 1D–4D realm instead for a mixed-age party.
      </Callout>

      <SectionHead
        index="4"
        kicker="Bring snacks"
        title="All 127 food consumables work in 4D and 5D"
        body="The same 127-item food roster follows you past the raid: every emoji keeps its effect everywhere, and only the numbers move. 4D scales above 3D and 5D scales highest of all — and mmorpg cells are tradable, so parties can supply their dream-raids and universe-hops from the open market."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["🍲 Same roster", "All 127 foods: heal, shield, power, haste, focus, and feast. Same emoji, same effect — in every game and mode."],
          ["📈 Dream- and multiverse-scaled numbers", "4D runs dream-scale numbers above 3D; 5D runs the highest numbers in the game. Balance is per-dimension, identity is global."],
          ["🤝 Tradable in mmorpg cells", "Foods are player-tradable in mmorpg mode and bound everywhere else — stock the party before hop night."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-5">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <Callout tone="gold" title="Prices already include the cut.">
        Food shop prices follow the same coin rule as everything else — 100 🪙 is exactly $1.00, cut included.
      </Callout>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Link
          href="/docs/mmorpg"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-xl"
        >
          <p className="font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-300">← MMORPG mode</p>
          <p className="mt-1 text-sm text-muted-foreground">Shards, dimensions, world bosses.</p>
        </Link>
        <Link
          href="/docs/mmorpg/hosting"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-xl"
        >
          <p className="font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-300">🏠 Hosting →</p>
          <p className="mt-1 text-sm text-muted-foreground">Rent the server these rules guard.</p>
        </Link>
        <Link
          href="/docs/mmorpg/age-bands"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-xl"
        >
          <p className="font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-300">🛡️ Age bands</p>
          <p className="mt-1 text-sm text-muted-foreground">The full entry matrix for 1D–3D.</p>
        </Link>
      </div>
    </article>
  );
}
