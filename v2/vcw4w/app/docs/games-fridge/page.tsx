import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/games-fridge" },
  title: "Fridge Simulator guide",
  description:
    "How to play Fridge Simulator: buy emoji foods, stock fridges across 5 countries, balance nutrition, and resume with cloud save slots.",
};

const theme = {
  bg: "bg-gradient-to-br from-emerald-950 via-slate-950 to-teal-950",
  border: "border-emerald-400/20",
  chip: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200",
  title: "bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent",
};

export default function FridgeDocsPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · simulation"
        title={<>Feed the world. <span className={theme.title}>One fridge at a time.</span></>}
        lede={<>Fridge Simulator is a food-logistics sim: buy emoji foods from five shops, stock fridges for families in five countries, and keep everyone fed as the days advance. Your run lives in cloud save slots, so it follows you between phone and desktop.</>}
        stats={[
          ["34", "emoji foods"],
          ["5", "shops · 5 countries"],
          ["4", "cloud save slots"],
          ["0", "slot 0: cheat-proof"],
        ]}
        glyph="🧊"
        theme={theme}
        crumb="Fridge Simulator"
        art={
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            {["🍗 Buy", "🧊 Stock", "⏭️ Next day", "🍽️ Feed"].map((t) => (
              <span key={t} className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-white backdrop-blur">
                {t}
              </span>
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="The loop"
        title="Buy, stock, next day, feed"
        body="Each run is one loop: spend budget at the shops, load food into country fridges, advance the day, and watch each family member eat. Every day survived drains nutrition, so a stocked fridge is a living one."
      />
      <Steps
        items={[
          [
            "Buy food for the budget",
            <>Open a shop and spend that country&apos;s budget on emoji foods. Grocery and Wholesale stock everything; Pantry, Charity, and Dumpster offer a random dozen at a discount — Dumpster food can spoil.</>,
          ],
          [
            "Stock each country's fridge",
            <>Load food into fridge slots. Family members eat preferred foods first and fall back to whatever is stocked, so match each country&apos;s tastes (see the <Link className="font-bold underline" href="/docs/games-fridge/foods">foods table</Link>).</>,
          ],
          [
            "Advance the day",
            <>Hit Next Day: every family member eats once and every nutrition channel decays. Empty fridge, hungry family — plan one day ahead, always.</>,
          ],
          [
            "Save, then resume anywhere",
            <>Your run persists in cloud save slots 0-3 under the game slug <code>fridgesimulator</code>. Sign in on another device, load the same slot, and keep playing — see the <Link className="font-bold underline" href="/docs/games-fridge/saves">resume guide</Link>.</>,
          ],
        ]}
      />

      <SectionHead
        index="2"
        kicker="Strategy"
        title="Play the groceries, not the lottery"
        body="The math is public, so play it. Nutrition is a triple — protein, carbs, vitamins — and every channel decays each day. One-sided diets starve even full bellies."
      />
      <MockWindow title="4weird.com - day planner" badge="fridgesimulator">
        <div className="space-y-2 font-mono text-xs sm:text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-400">PROTEIN · 🥩 Steak 60 + 🍗 Chicken 50</span><span className="font-bold text-emerald-300">stock reds</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">CARBS · 🍝 Pasta 60 + 🍞 Bread 50</span><span className="font-bold text-emerald-300">stock ambers</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">VITAMINS · 🍊 Orange 45 + 🥦 Broccoli 45</span><span className="font-bold text-emerald-300">stock greens</span></div>
          <div className="flex justify-between gap-4 border-t border-white/10 pt-2"><span className="font-bold text-slate-200">DAILY DECAY · every channel</span><span className="font-bold text-amber-300">−15 / day</span></div>
          <p className="pt-1 text-[11px] text-slate-500">families eat preferred foods first · fallback is whatever is stocked</p>
        </div>
      </MockWindow>
      <ul className="mt-5 list-disc space-y-2 pl-6 text-sm leading-relaxed text-muted-foreground">
        <li><strong className="text-foreground">Cover all three channels:</strong> protein-only (🍗🥩🍖🐟) leaves vitamins at zero while they still decay 15 a day. Pair every meat run with fruit or veg.</li>
        <li><strong className="text-foreground">Buy preferences, not cravings:</strong> each country lists five preferred foods and eats them first. Stocked non-preferred food still feeds — but preferred food never sits uneaten.</li>
        <li><strong className="text-foreground">Wholesale for volume, Dumpster never for planning:</strong> Wholesale discounts everything reliably; Charity and Dumpster are free but random and unreliable, with Dumpster spoilage on top.</li>
        <li><strong className="text-foreground">Grow into countries by unlock day:</strong> USA is open day 1 (family of 4, budget 300); Italy unlocks day 9 with the fattest budget (320) for a family of 3.</li>
      </ul>

      <SectionHead
        index="3"
        kicker="Keep reading"
        title="Foods and saves"
        body="Two companion pages: the full food table and the cross-device resume guide."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link
          href="/docs/games-fridge/foods"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-xl"
        >
          <p className="font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-300">🍎 Foods table</p>
          <p className="mt-1 text-sm text-muted-foreground">
            All 34 emoji foods by category: price, hunger restored, and the protein/carb/vitamin triple.
          </p>
        </Link>
        <Link
          href="/docs/games-fridge/saves"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-xl"
        >
          <p className="font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-300">💾 Resume anywhere</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Slots 0-3, slot-0 safety, and the exact phone-to-desktop handoff that keeps your run alive.
          </p>
        </Link>
      </div>

      <SectionHead
        index="4"
        kicker="Five shops, five deals"
        title="Shops compared"
        body="Two shops stock everything; three offer a random dozen at a discount or free. Buy the plan from the reliable two, treat the random three as a bonus."
      />
      <div className="mt-5 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="px-4 py-3 font-mono text-xs font-black uppercase tracking-widest text-muted-foreground">Shop</th>
              <th className="px-4 py-3 font-mono text-xs font-black uppercase tracking-widest text-muted-foreground">Assortment</th>
              <th className="px-4 py-3 font-mono text-xs font-black uppercase tracking-widest text-muted-foreground">Price note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {[
              ["Grocery", "Full catalog, every food", "Standard prices, always available."],
              ["Wholesale", "Full catalog, every food", "Reliable volume discount on everything."],
              ["Pantry", "Random dozen", "Discounted, rotates. Check before you plan."],
              ["Charity", "Random dozen", "Free but random and unreliable."],
              ["Dumpster", "Random dozen", "Free, but food can spoil. Never the plan."],
            ].map(([k, v, r]) => (
              <tr key={k}>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold">{k}</td>
                <td className="px-4 py-3 text-muted-foreground">{v}</td>
                <td className="px-4 py-3 text-muted-foreground">{r}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHead
        index="5"
        kicker="Days 1 to 3, USA"
        title="Worked example: open a run without starving"
        body="The USA opens on day 1 with a family of 4 and a budget of 300. Here is a calm opening built from real foods table values."
      />
      <Steps
        items={[
          [
            "Day 1: spend a tenth of the budget",
            <>Buy 4 Chicken (12 coins) plus 4 Pasta (8 coins) plus 4 Bananas (3.2 coins), for 23.2 coins total. That covers protein (Chicken, 50 each), carbs (Pasta, 60 each), and vitamins (Banana, 40 each), and preferred-first eating sorts out who eats what.</>,
          ],
          [
            "Day 2: watch the triple, not the hunger bar",
            <>Every channel decays 15 a day, so a full belly with vitamins at zero still starves. Find the lowest channel and patch it cheaply: Garlic (0.5) for vitamins, Potato (1) for carbs, Egg (2) for protein. Exact values live in the <Link className="font-bold underline" href="/docs/games-fridge/foods">foods table</Link>.</>,
          ],
          [
            "Day 3: bank one spare day, then save",
            <>Keep one full spare day of food stocked before you hit Next Day, because an empty fridge means a hungry family. Save to a cloud slot before experimenting with new countries: the <Link className="font-bold underline" href="/docs/games-fridge/saves">resume guide</Link> shows the phone to desktop handoff.</>,
          ],
        ]}
      />

      <SectionHead
        index="6"
        kicker="Full fridge, hungry family"
        title="Troubleshooting"
      />
      <ul className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <li className="rounded-xl border border-border bg-card p-3">📉 <strong className="text-foreground">Stocked but starving.</strong> Check the triple: a protein-only fridge leaves vitamins at zero while every channel still decays 15 a day. Pair every meat run with fruit or veg.</li>
        <li className="rounded-xl border border-border bg-card p-3">🗑️ <strong className="text-foreground">Dumpster haul went bad.</strong> Dumpster food can spoil, and Charity and Dumpster stock are random, so neither can carry a plan. Rebuy the missing channel from Grocery or Wholesale.</li>
        <li className="rounded-xl border border-border bg-card p-3">🍽️ <strong className="text-foreground">A pile nobody touches.</strong> Families eat preferred foods first and fall back to whatever is stocked. An untouched pile is probably nobody&apos;s favorite: it still feeds, it just feeds last.</li>
        <li className="rounded-xl border border-border bg-card p-3">🌍 <strong className="text-foreground">New country, empty fridge.</strong> Each country&apos;s fridge is stocked separately, so an unlock-day arrival needs its own shop run before its first Next Day.</li>
        <li className="rounded-xl border border-border bg-card p-3">💾 <strong className="text-foreground">Run is gone.</strong> Guests get no saves: three free loads a day and nothing persists. Sign in and play in cloud save slots 0 to 3 instead.</li>
      </ul>
      <Callout tone="amber" title="Dumpster food is a bonus, not a plan.">
        Free, random, and perishable is three reasons to smile and zero reasons to budget. Plan from Grocery
        and Wholesale, spend Charity and Dumpster finds the same day, and never let a random dozen cover a
        channel your family needs tomorrow.
      </Callout>

      <SectionHead
        index="7"
        kicker="New arrivals"
        title="Unlock days: meet the new family prepared"
        body="The USA opens on day 1 with a family of 4 and a budget of 300; Italy arrives on day 9 with the fattest budget of all. Every unlock in between rewards the same preparation."
      />
      <ul className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <li className="rounded-xl border border-border bg-card p-3">🔍 <strong className="text-foreground">Scout tastes before the unlock.</strong> Read the incoming family&apos;s five preferred foods first. A shop run aimed at their favorites feeds from day one; a generic pile feeds last.</li>
        <li className="rounded-xl border border-border bg-card p-3">💰 <strong className="text-foreground">Arrive with spare budget.</strong> Do not spend the old country down to zero the day before an unlock. A cushion buys the new fridge its opening stock without starving the old one.</li>
        <li className="rounded-xl border border-border bg-card p-3">🧊 <strong className="text-foreground">Stock before the first Next Day.</strong> A newly unlocked fridge starts empty, and advancing the day with an empty fridge means a hungry family on arrival. Shop first, advance second.</li>
        <li className="rounded-xl border border-border bg-card p-3">💾 <strong className="text-foreground">Save before the unlock.</strong> Unlock days change everything at once: new tastes, new budget, new mouths. Bank the run to a cloud slot first, so a bad opening is a lesson instead of a disaster. See the <Link className="underline" href="/docs/games-fridge/saves">resume guide</Link>.</li>
      </ul>
      <Callout tone="cyan" title="Italy is a budget boss.">
        Day 9 brings a family of 3 with a budget of 320, the fattest purse in the game. Celebrate with
        protein heavyweights (Steak, Chicken) and bank the surplus: late arrivals eat more, and a stocked
        Italian fridge covers rough days elsewhere.
      </Callout>

      <SectionHead
        index="8"
        kicker="Pace the purse"
        title="The 10 percent opening rule"
        body="Opening baskets should be small, balanced, and repeatable. Spend roughly a tenth of the budget on day 1, keep the rest as a buffer for bad shop rotations and unlock surprises."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">🧺 Open small</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The worked example above feeds a family of 4 for 23.2 coins from a 300 budget: under 8 percent,
            covering all three channels. Small openings leave room to correct mistakes.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">📦 Buffer the random</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Random shops rotate and Dumpster finds perish, so reserves beat variety. A buffer of unspent
            budget buys whatever channel the next rotation fails to offer.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">🌍 Fund the unlock</p>
          <p className="mt-1 text-sm text-muted-foreground">
            New fridges arrive empty and hungry. Hold back enough budget before each unlock day to stock
            the newcomer fully on arrival, then resume normal spending.
          </p>
        </div>
      </div>

      <Callout tone="emerald" title="Play it.">
        Find Fridge Simulator in the catalog at <Link className="underline" href="/games/fridgesimulator">/games/fridgesimulator</Link> and
        press play at <Link className="underline" href="/games/fridgesimulator/play">/games/fridgesimulator/play</Link>.
        Signed in? Your slots are waiting. Guest? Three free loads a day — no saves until you sign in.
      </Callout>
    </article>
  );
}
