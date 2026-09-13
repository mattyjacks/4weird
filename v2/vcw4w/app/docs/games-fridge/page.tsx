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

      <Callout tone="emerald" title="Play it.">
        Find Fridge Simulator in the catalog at <Link className="underline" href="/games/fridgesimulator">/games/fridgesimulator</Link> and
        press play at <Link className="underline" href="/games/fridgesimulator/play">/games/fridgesimulator/play</Link>.
        Signed in? Your slots are waiting. Guest? Three free loads a day — no saves until you sign in.
      </Callout>
    </article>
  );
}
