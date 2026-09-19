import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/games-fridge/foods" },
  title: "Fridge Simulator: foods table",
  description:
    "All 34 Fridge Simulator emoji foods by category with price, hunger restored, and protein/carb/vitamin nutrition values.",
};

const theme = {
  bg: "bg-gradient-to-br from-emerald-950 via-slate-950 to-teal-950",
  border: "border-emerald-400/20",
  chip: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200",
  title: "bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent",
};

type Food = { emoji: string; name: string; price: number; hunger: number; nut: [number, number, number] };

const CATEGORIES: { label: string; blurb: string; foods: Food[] }[] = [
  {
    label: "🥩 Proteins",
    blurb: "The hunger heavyweights. Steak restores the most hunger in the game; beans and peanuts smuggle in carbs.",
    foods: [
      { emoji: "🍗", name: "Chicken", price: 3, hunger: 50, nut: [50, 0, 0] },
      { emoji: "🥩", name: "Steak", price: 4, hunger: 70, nut: [60, 0, 0] },
      { emoji: "🍖", name: "Ribs", price: 3.5, hunger: 60, nut: [50, 0, 0] },
      { emoji: "🐟", name: "Fish", price: 5, hunger: 45, nut: [50, 0, 0] },
      { emoji: "🥚", name: "Egg", price: 2, hunger: 30, nut: [30, 0, 0] },
      { emoji: "🫘", name: "Beans", price: 1.5, hunger: 40, nut: [30, 20, 0] },
      { emoji: "🧀", name: "Cheese", price: 3, hunger: 35, nut: [40, 0, 0] },
      { emoji: "🥜", name: "Peanuts", price: 2, hunger: 25, nut: [25, 10, 0] },
    ],
  },
  {
    label: "🍞 Carbs",
    blurb: "Cheap energy. Pasta carries the highest carb value in the game; potato and corn add a little vitamin cover.",
    foods: [
      { emoji: "🍞", name: "Bread", price: 2, hunger: 40, nut: [10, 50, 0] },
      { emoji: "🍚", name: "Rice", price: 1.5, hunger: 35, nut: [0, 50, 0] },
      { emoji: "🍝", name: "Pasta", price: 2, hunger: 55, nut: [10, 60, 0] },
      { emoji: "🥔", name: "Potato", price: 1, hunger: 40, nut: [0, 30, 15] },
      { emoji: "🌽", name: "Corn", price: 1.5, hunger: 30, nut: [0, 30, 15] },
      { emoji: "🥖", name: "Baguette", price: 2.5, hunger: 45, nut: [10, 50, 0] },
      { emoji: "🥯", name: "Bagel", price: 2, hunger: 40, nut: [10, 50, 0] },
    ],
  },
  {
    label: "🍎 Fruits",
    blurb: "Vitamin engines. Orange tops vitamins at 45; banana is the most filling fruit for under a coin.",
    foods: [
      { emoji: "🍎", name: "Apple", price: 1, hunger: 20, nut: [0, 10, 40] },
      { emoji: "🍌", name: "Banana", price: 0.8, hunger: 30, nut: [0, 20, 40] },
      { emoji: "🍇", name: "Grapes", price: 2, hunger: 20, nut: [0, 10, 40] },
      { emoji: "🍓", name: "Strawberry", price: 2.5, hunger: 15, nut: [0, 5, 40] },
      { emoji: "🍊", name: "Orange", price: 1.2, hunger: 20, nut: [0, 5, 45] },
      { emoji: "🍉", name: "Watermelon", price: 3, hunger: 25, nut: [0, 5, 30] },
      { emoji: "🍑", name: "Peach", price: 1.5, hunger: 20, nut: [0, 10, 40] },
    ],
  },
  {
    label: "🥦 Vegetables",
    blurb: "Budget vitamins. Garlic is the cheapest item in the game; broccoli pairs vitamins with a protein kicker.",
    foods: [
      { emoji: "🥦", name: "Broccoli", price: 1.5, hunger: 20, nut: [10, 0, 45] },
      { emoji: "🥕", name: "Carrot", price: 1, hunger: 15, nut: [0, 10, 40] },
      { emoji: "🥬", name: "Lettuce", price: 1.5, hunger: 10, nut: [0, 0, 30] },
      { emoji: "🍅", name: "Tomato", price: 1.2, hunger: 15, nut: [0, 5, 35] },
      { emoji: "🥒", name: "Cucumber", price: 1, hunger: 10, nut: [0, 0, 30] },
      { emoji: "🧅", name: "Onion", price: 0.8, hunger: 10, nut: [0, 5, 25] },
      { emoji: "🧄", name: "Garlic", price: 0.5, hunger: 5, nut: [0, 0, 20] },
    ],
  },
  {
    label: "🥛 Dairy & fats",
    blurb: "Balanced fillers. Milk and avocado spread value across channels; olive is pure vitamins at a premium.",
    foods: [
      { emoji: "🥛", name: "Milk", price: 2, hunger: 25, nut: [20, 0, 30] },
      { emoji: "🧈", name: "Butter", price: 3, hunger: 20, nut: [15, 0, 15] },
      { emoji: "🥥", name: "Coconut", price: 2, hunger: 30, nut: [10, 10, 30] },
      { emoji: "🫒", name: "Olive", price: 4, hunger: 15, nut: [0, 0, 30] },
      { emoji: "🥑", name: "Avocado", price: 1.5, hunger: 25, nut: [10, 0, 40] },
    ],
  },
];

function FoodTable({ foods }: { foods: Food[] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-card text-xs uppercase tracking-widest text-muted-foreground">
            <th className="px-4 py-3 font-black">Food</th>
            <th className="px-4 py-3 font-black">Price</th>
            <th className="px-4 py-3 font-black">Hunger</th>
            <th className="px-4 py-3 font-black">Protein</th>
            <th className="px-4 py-3 font-black">Carbs</th>
            <th className="px-4 py-3 font-black">Vitamins</th>
          </tr>
        </thead>
        <tbody>
          {foods.map((f) => (
            <tr key={f.emoji} className="border-b border-border/50 last:border-0 transition hover:bg-card">
              <td className="px-4 py-2.5 font-bold whitespace-nowrap">
                <span aria-hidden="true" className="mr-2 text-lg">{f.emoji}</span>
                {f.name}
              </td>
              <td className="px-4 py-2.5 font-mono">{f.price}</td>
              <td className="px-4 py-2.5 font-mono">{f.hunger}</td>
              <td className="px-4 py-2.5 font-mono">{f.nut[0]}</td>
              <td className="px-4 py-2.5 font-mono">{f.nut[1]}</td>
              <td className="px-4 py-2.5 font-mono">{f.nut[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FridgeFoodsPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · Fridge Simulator · foods"
        title={<>34 foods. <span className={theme.title}>Zero filler.</span></>}
        lede={<>Every emoji food in Fridge Simulator with its shop price, hunger restored, and protein / carb / vitamin triple. Values are the game&apos;s own — plan your fridges from this table.</>}
        stats={[
          ["34", "foods listed"],
          ["5", "categories"],
          ["70", "top hunger · 🥩"],
          ["45", "top vitamins · 🍊🥦"],
        ]}
        glyph="🍎"
        theme={theme}
        crumb="Fridge foods"
      />

      {CATEGORIES.map((c, i) => (
        <div key={c.label}>
          <SectionHead
            index={String(i + 1)}
            kicker={`Category ${i + 1} of 5`}
            title={c.label}
            body={c.blurb}
          />
          <FoodTable foods={c.foods} />
        </div>
      ))}

      <SectionHead
        index="6"
        kicker="Best in class"
        title="Shop by goal, not by craving"
        body="Every rate below divides a value from the tables above by its price. When two foods tie on value, the cheaper one wins your budget."
      />
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-card text-xs uppercase tracking-widest text-muted-foreground">
              <th className="px-4 py-3 font-black">Goal</th>
              <th className="px-4 py-3 font-black">Pick</th>
              <th className="px-4 py-3 font-black">Why it wins</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Hunger per coin", "🥔 Potato (1 coin, 40 hunger)", "40 hunger per coin, the best rate in the game. Banana is next at 37.5."],
              ["Vitamins per coin", "🍌 Banana (0.8 coins, 40 vitamins)", "50 vitamins per coin. Nothing else breaks 40."],
              ["Protein per coin", "🫘 Beans (1.5 coins, 30 protein)", "20 protein per coin, plus 20 carbs as a bonus. Chicken is next at about 16.7."],
              ["Carbs per coin", "🍚 Rice (1.5 coins, 50 carbs)", "About 33.3 carbs per coin. Pasta and Potato tie for second at 30."],
              ["One food, every channel", "🥥 Coconut (2 coins, 10 / 10 / 30)", "The only food with protein, carbs, and vitamins all above zero."],
              ["Biggest single meal", "🥩 Steak (4 coins, 70 hunger)", "Restores the most hunger in the game, with 60 protein on top."],
              ["Smallest price", "🧄 Garlic (0.5 coins)", "The cheapest item in the game. A vitamin patch for pocket change."],
            ].map(([g, p, w]) => (
              <tr key={g} className="border-b border-border/50 last:border-0 transition hover:bg-card">
                <td className="px-4 py-2.5 font-bold whitespace-nowrap">{g}</td>
                <td className="px-4 py-2.5 font-bold whitespace-nowrap">{p}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{w}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHead
        index="7"
        kicker="Worked baskets"
        title="Three baskets that actually work"
        body="Priced from the tables above at standard shop prices. Random discount shops can only improve these totals."
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">🧺 The 4 coin full cover</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Egg (2) plus Rice (1.5) plus Garlic (0.5) totals exactly 4.0 coins and covers every channel:
            30 protein, 50 carbs, 20 vitamins. The cheapest complete triple in the game.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">🥔🍌 Potato banana bulk</p>
          <p className="mt-1 text-sm text-muted-foreground">
            3 Potatoes (3.0) plus 3 Bananas (2.4) totals 5.4 coins for 210 hunger with 150 carbs and
            165 vitamins. Add 1 Egg (2.0) for 30 protein and the whole basket is 7.4 coins.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">🥥 Coconut insurance</p>
          <p className="mt-1 text-sm text-muted-foreground">
            2 Coconuts (4.0) total 20 protein, 20 carbs, and 60 vitamins in two slots. When a fridge has
            exactly one gap in every channel, this is the single purchase that fills all three.
          </p>
        </div>
      </div>

      <SectionHead
        index="8"
        kicker="Short answers"
        title="Foods FAQ"
      />
      <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <li className="rounded-xl border border-border bg-card p-3">🍽️ <strong className="text-foreground">Do families refuse non-preferred food?</strong> No. Each family eats its five preferred foods first and falls back to whatever is stocked, so every food in this table feeds someone.</li>
        <li className="rounded-xl border border-border bg-card p-3">🏷️ <strong className="text-foreground">Are these the prices in every shop?</strong> These are the standard prices. Wholesale discounts everything reliably, while Pantry, Charity, and Dumpster offer a random dozen at a discount or free. Plan from this table, pocket the discount when it appears.</li>
        <li className="rounded-xl border border-border bg-card p-3">🗑️ <strong className="text-foreground">Which food spoils?</strong> Only Dumpster food is documented to spoil. Everything bought elsewhere keeps until eaten.</li>
        <li className="rounded-xl border border-border bg-card p-3">🥥 <strong className="text-foreground">If I can buy only one food, which one?</strong> Coconut. It is the only item with protein, carbs, and vitamins all above zero, so it can never leave a channel completely empty.</li>
        <li className="rounded-xl border border-border bg-card p-3">🥔 <strong className="text-foreground">What is the best staple food?</strong> Potato. It gives 40 hunger for 1 coin, 30 carbs (two full days of buffer), plus a 15 vitamin kicker. No other single food feeds this cheaply while covering two channels at once.</li>
        <li className="rounded-xl border border-border bg-card p-3">🍲 <strong className="text-foreground">Do leftovers carry over?</strong> Yes. Uneaten food stays stocked for the next day, so deliberate surplus is strategy, not waste. Cook up a feast before a day you cannot shop, and let appetite meet preparation.</li>
        <li className="rounded-xl border border-border bg-card p-3">📊 <strong className="text-foreground">Where do these numbers get used?</strong> The strategy guide at <Link className="font-bold underline" href="/docs/games-fridge">Fridge Simulator guide</Link> turns this table into day plans, and runs persist in slots 0 to 3 per the <Link className="font-bold underline" href="/docs/games-fridge/saves">resume guide</Link>.</li>
      </ul>

      <SectionHead
        index="9"
        kicker="Rankings"
        title="Vitamins and protein, cheapest first"
        body="Hunger is easy to buy; vitamins and protein are where budgets die. These rankings divide each value by its price, so the top row is always the smartest coin spent."
      />
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-card text-xs uppercase tracking-widest text-muted-foreground">
              <th className="px-4 py-3 font-black">Rank</th>
              <th className="px-4 py-3 font-black">Food</th>
              <th className="px-4 py-3 font-black">Value</th>
              <th className="px-4 py-3 font-black">Per coin</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Vitamin 1", "🍌 Banana", "40 vitamins, 0.8 coins", "50 per coin"],
              ["Vitamin 2", "🧄 Garlic", "20 vitamins, 0.5 coins", "40 per coin"],
              ["Vitamin 3", "🍎 Apple", "40 vitamins, 1 coin", "40 per coin"],
              ["Vitamin 4", "🥕 Carrot", "40 vitamins, 1 coin", "40 per coin"],
              ["Vitamin 5", "🍊 Orange", "45 vitamins, 1.2 coins", "37.5 per coin"],
              ["Protein 1", "🫘 Beans", "30 protein, 1.5 coins", "20 per coin"],
              ["Protein 2", "🍗 Chicken", "50 protein, 3 coins", "about 16.7 per coin"],
              ["Protein 3", "🥚 Egg", "30 protein, 2 coins", "15 per coin"],
              ["Protein 4", "🥩 Steak", "60 protein, 4 coins", "15 per coin"],
            ].map(([r, f, v, c]) => (
              <tr key={r} className="border-b border-border/50 last:border-0 transition hover:bg-card">
                <td className="px-4 py-2.5 font-bold whitespace-nowrap">{r}</td>
                <td className="px-4 py-2.5 font-bold whitespace-nowrap">{f}</td>
                <td className="px-4 py-2.5 font-mono">{v}</td>
                <td className="px-4 py-2.5 font-mono">{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Callout tone="cyan" title="Absolute champions live here too.">
        Steak leads hunger (70) and protein (60), Pasta leads carbs (60), and Orange shares the vitamin
        crown with Broccoli (45 each). Rankings tell you the smartest coin; champions tell you the biggest
        single bite. Buy champions for feasts, buy rankings for winters.
      </Callout>

      <SectionHead
        index="10"
        kicker="Premium shelf"
        title="When the expensive food earns it"
        body="Three items cost 4 coins or more. Two are trophies; one is a workhorse. Here is how to tell them apart."
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">🥩 Steak (4 coins): pay it</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The one premium worth paying: 70 hunger and 60 protein, both game bests. A single Steak
            out-eats two Chickens (100 hunger for 6 coins versus 70 for 4) while freeing fridge space.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">🐟 Fish (5 coins): skip it</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The priciest item in the game and rarely the smartest: 45 hunger and 50 protein for 5 coins,
            while Chicken gives 50 hunger and 50 protein for 3. Buy Fish for variety, never for value.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">🫒 Olive (4 coins): skip it</p>
          <p className="mt-1 text-sm text-muted-foreground">
            15 hunger and 30 vitamins for 4 coins, while Orange gives 20 hunger and 45 vitamins for 1.2.
            Olives decorate a feast; they never rescue a deficiency.
          </p>
        </div>
      </div>

      <SectionHead
        index="11"
        kicker="Decay math"
        title="What 15 a day actually means"
        body="Every nutrition channel depletes by 15 each day. Translate that depletion into groceries: a food that grants 30 in a channel buys exactly two days of buffer there, so small numbers stretch further than they look."
      />
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-card text-xs uppercase tracking-widest text-muted-foreground">
              <th className="px-4 py-3 font-black">Channel</th>
              <th className="px-4 py-3 font-black">Daily depletion</th>
              <th className="px-4 py-3 font-black">Two day buffer</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Protein", "15 per day", "🥚 1 Egg (30 protein, 2 coins)"],
              ["Carbs", "15 per day", "🥔 1 Potato (30 carbs, 1 coin)"],
              ["Vitamins", "15 per day", "🍌 1 Banana (40 vitamins, 0.8 coins)"],
            ].map(([c, d, b]) => (
              <tr key={c} className="border-b border-border/50 last:border-0 transition hover:bg-card">
                <td className="px-4 py-2.5 font-bold whitespace-nowrap">{c}</td>
                <td className="px-4 py-2.5 font-mono">{d}</td>
                <td className="px-4 py-2.5 font-bold whitespace-nowrap">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Callout tone="amber" title="Replenish the lowest channel first.">
        Starvation strikes the emptiest channel, not the emptiest fridge. When several channels sag, spend
        the next coins on the lowest one: an Egg for protein, a Potato for carbs, a Banana for vitamins.
        Full replenishment can wait; the threshold rescue cannot.
      </Callout>

      <Callout tone="emerald" title="Read the triple like a label.">
        Nutrition is always protein / carbs / vitamins in that order, and every channel decays each day.
        A food with 0 somewhere is honest about it — cover the gap with a second food, not a bigger pile of the first.
      </Callout>

      <p className="mt-8 text-sm text-muted-foreground">
        Back to the <Link className="font-bold underline" href="/docs/games-fridge">Fridge Simulator guide</Link> ·
        keep the run alive with <Link className="font-bold underline" href="/docs/games-fridge/saves">resume anywhere</Link>.
      </p>
    </article>
  );
}
