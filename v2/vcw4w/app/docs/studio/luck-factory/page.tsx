import type { Metadata } from "next";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/studio/luck-factory" },
  title: "Luck Factory Odds Transparency — Deterministic Draws, Published Math",
  description:
    "How Luck Factory draws work at /luck: uniform D100 math over FNV-1a seeds, the meditation-streak bonus formula, perfect-100 probability, and the entertainment-only boundary. No paid draws exist.",
};

const theme = {
  bg: "bg-gradient-to-br from-violet-950 via-slate-950 to-fuchsia-950",
  border: "border-violet-300/20",
  chip: "border-violet-300/40 bg-violet-300/10 text-violet-200",
  title: "bg-gradient-to-r from-violet-300 via-fuchsia-200 to-amber-200 bg-clip-text text-transparent",
};

export default function LuckFactoryPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · studio · luck factory"
        title={<>Same seed, <span className={theme.title}>same roll. Always.</span></>}
        lede={<>Luck Factory at /luck turns an intention into a deterministic D100 preview: FNV-1a hashes the seed, a counter picks the draw, a meditation streak adds a capped bonus. Every number on this page is the shipped formula — verify it by re-entering the same intention.</>}
        stats={[
          ["1%", "per D100 face"],
          ["1%", "perfect 100"],
          ["+10", "max streak bonus"],
          ["$0.00", "charged, ever"],
        ]}
        glyph="🍀"
        theme={theme}
        crumb="Luck Factory"
        art={
          <div className="flex items-end gap-2" aria-hidden="true">
            {[70, 52, 64, 44, 74, 56, 66].map((h, i) => (
              <div
                key={i}
                className="docs-float w-10 rounded-t-full border border-amber-200/50 bg-gradient-to-t from-emerald-500 to-amber-300 shadow-lg sm:w-12"
                style={{ height: h, animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="The draw"
        title="Intention in, D100 out"
        body="Enter an intention, a meditation streak in days, and a draw counter. The page hashes the intention with FNV-1a (8-char hex), derives a uniform value in [0, 1) from seed plus counter, maps it to a D100 roll from 1 to 100, then applies the streak bonus. Same intention plus same counter always yields the same preview."
      />
      <MockWindow title="luck factory — deterministic preview" badge="reproducible">
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>Seed (FNV-1a of intention)</span><span className="font-black text-amber-300">9f2ac41d</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>Draw value (uniform [0, 1))</span><span className="font-black text-amber-300">0.620417</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>D100 roll</span><span className="font-black text-amber-300">63</span></div>
          <div className="flex justify-between gap-3 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2"><span className="font-bold text-amber-200">With 14-day streak (+2)</span><span className="font-black text-amber-200">65</span></div>
        </div>
      </MockWindow>

      <SectionHead
        index="2"
        kicker="Odds table"
        title="Published probabilities"
        body="The hash spreads (seed, counter) uniformly over 32-bit space, so each D100 face lands with probability 1%. There is no weighting, no pity timer, no house edge — and nothing of value attached to any outcome."
      />
      <Steps
        items={[
          ["Each face: exactly ~1%", <>Rolls are uniform over 1–100. Over many draws each face converges to 1%; any single draw is independent — a 63 tells you nothing about the next roll.</>],
          ["Perfect 100: 1%", <>A perfect 100 is illustration only and it is worth nothing: no prize, no payout, no ledger entry. The page says so next to the result.</>],
          ["Streak bonus: +1 per full 7-day week, capped at +10", <>14 days adds +2, 70+ days adds the max +10. The boosted result is clamped to [1, 100] — a bonus can never push past 100 or below 1.</>],
          ["Reproducibility: 100%", <>Draws are pure functions of (seed, counter). Re-enter the same intention and counter on any device and you get the identical value, roll, and boost.</>],
        ]}
      />

      <SectionHead
        index="3"
        kicker="No cost"
        title="Free forever — no charge exists"
        body="There are no paid draws. Nothing is charged, nothing is won, nothing is recorded: no wagers, no payouts, no prizes, no ledger writes, no fetch."
      />
      <Callout tone="rose" title="Entertainment only — not gambling">
        No paid draws, no wagers, no payouts, no prizes, no ledger writes, no fetch. FNV-1a is a non-cryptographic mixer for spreading draws uniformly — not a CSPRNG, not a KDF, not collision-resistant — and the code says so. If you want randomness you can trust with money, this is not it and never claims to be.
      </Callout>

      <Pager current="/docs/studio/luck-factory" />
    </article>
  );
}
