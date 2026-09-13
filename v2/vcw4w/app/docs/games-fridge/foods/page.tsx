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
