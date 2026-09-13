import type { Metadata } from "next";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/games/gravegain4d/combat" },
  title: "GraveGain4D: combat & RPG guide",
  description:
    "Melee, block, charge, and lunge in GraveGain4D: W-slice damage gating, races, classes, XP, Soul-Resonance perks, loot, boss guardians, and canon voice tiers.",
};

const theme = {
  bg: "bg-gradient-to-br from-red-950 via-slate-950 to-violet-950",
  border: "border-red-400/20",
  chip: "border-red-300/40 bg-red-300/10 text-red-200",
  title: "bg-gradient-to-r from-red-300 via-amber-200 to-violet-300 bg-clip-text text-transparent",
};

const CONTROLS: Array<[string, string]> = [
  ["Left-click (tap)", "Swing: a quick melee arc toward your aim. Cheap, fast, your bread-and-butter answer to anything standing on your green."],
  ["Left-click (hold)", "Charge: hold to wind up a heavier strike. Damage scales with charge time; moving while charging drains stamina faster."],
  ["Right-click (hold)", "Block: raise your guard. Absorbs frontal melee while held, drains stamina per hit — never health — until your guard breaks."],
  ["Shift + click", "Lunge: a stamina-cost dash-strike that closes distance. Your gap-closer against retreating guardians and ledge campers."],
  ["Stamina bar", "The shared purse: swings sip it, charges and lunges spend it, blocks burn it per impact. Empty means no charge, no lunge, and a fragile guard."],
];

const PERKS: Array<[string, string]> = [
  ["Soul-Resonance: Echo Step", "After any W-slice, your next swing within a breath costs no stamina. Slice in, strike free."],
  ["Soul-Resonance: GraveTide", "Kills refund a sliver of stamina. Chain weak husks to fund the heavy work on guardians."],
  ["Soul-Resonance: MoonRock Skin", "A last-instant block (a perfect guard) reflects a spark of the blow back at the attacker. Timing over turtling."],
];

export default function GraveGain4DCombatPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · games · gravegain4d · combat"
        title={<>Win the fight before the putt. <span className={theme.title}>Combat & RPG, slice by slice.</span></>}
        lede={<>Every GraveGain4D hole is guarded. Swing, charge, block, and lunge through the defenders — but only when they share your slice of time.</>}
        stats={[
          ["LMB", "swing · hold to charge"],
          ["RMB", "block the front arc"],
          ["W", "shared slice or no damage"],
          ["10", "boss guardians · one per hole"],
        ]}
        glyph="⚔️"
        theme={theme}
        crumb="Combat"
        art={
          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/40 p-4 backdrop-blur">
            <span aria-hidden="true" className="text-3xl">🗡️</span>
            <p className="font-mono text-sm font-bold tracking-widest text-red-200">SWING → CHARGE → BLOCK → LUNGE</p>
            <span aria-hidden="true" className="text-3xl">🛡️</span>
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="Click · hold · block · lunge"
        title="Combat controls"
        body="Four verbs, one purse. Everything martial in GraveGain4D spends or guards stamina — health is for mistakes, stamina is for intentions."
      />
      <div className="mt-5 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="px-4 py-3 font-mono text-xs font-black uppercase tracking-widest text-muted-foreground">Input</th>
              <th className="px-4 py-3 font-mono text-xs font-black uppercase tracking-widest text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {CONTROLS.map(([k, v]) => (
              <tr key={k}>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold">{k}</td>
                <td className="px-4 py-3 text-muted-foreground">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Callout tone="cyan" title="Beginner drill: block first, swing second.">
        Hold right-click and let a husk hit your guard once — watch stamina dip instead of health. Then tap
        left-click twice. That exchange, priced in stamina, is the whole early game.
      </Callout>

      <SectionHead
        index="2"
        kicker="Same slice or no sale"
        title="W-slice damage gating"
        body="The fourth direction is a duelist's courtesy: blades only bite what shares their moment. If you and your target stand on different W-steps, you are ghosts to each other."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["👻 Intangible both ways", "Out-of-slice attackers cannot hurt you — and you cannot hurt them. No chip damage, no splash, no clever angles. Slice first, then swing."],
          ["🌀 Slice to engage", "Tap Q/E until the guardian renders solid and name-plated. That is the tell: solid means shared slice, shared slice means damage flows."],
          ["🏃 Slice to escape", "Overwhelmed? Step one W-stage sideways. You go intangible, their enrage timers keep ticking, and you buy breath at zero stamina cost."],
          ["⚖️ Guardians slice too", "Late-hole guardians rotate their own W-step to dodge charges and ambush blockers. Watch their shimmer — a guardian mid-flicker is about to reappear beside you."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-5">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <Callout tone="amber" title="Golf and war share one rule.">
        The same Q/E that bends a fairway around a bunker engages a guardian. Slicing is never wasted motion in
        GraveGain4D — every rotation is either a better lie or a fairer fight.
      </Callout>

      <SectionHead
        index="3"
        kicker="Who you were before the wound"
        title="Races, classes, XP & perks"
        body="Pick an origin, earn eXPerience the MERCENARY way — by surviving timelines that should have killed you — and spend Soul-Resonance on perks that bend the stamina economy."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["🧝 Moon-Elf Warden", "Patient guard-fighters. Block longer per stamina point; charges hum quieter. For players who win by outlasting."],
          ["⛏️ Dwarf Vaultbreak", "Heavy openers. Charged strikes hit harder and break guardian guards sooner; lunges cost a touch more."],
          ["👹 Orc Bloodsworn", "Standing order honored: orcs do not die sitting down. Swing faster at low health; rewinds tax slightly more max health."],
          ["🌿 Shipborn Botanist", "President Good&apos;s deckhands. Kills seed small stamina blooms; weakest raw swing, richest perk engine."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-5">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {[
          ["🗡️ Classes: Striker / Guard / Lurker", "Strikers cheapen charges, Guards cheapen blocks, Lurkers cheapen lunges. Race sets your flavor; class sets your discount."],
          ["✨ XP & Soul-Resonance", "XP accrues per hole cleared and guardian felled. Each rank unlocks a Soul-Resonance perk — passive echoes of timelines where you already won. First pick is recommended by hole 3."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-5">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="px-4 py-3 font-mono text-xs font-black uppercase tracking-widest text-muted-foreground">Perk</th>
              <th className="px-4 py-3 font-mono text-xs font-black uppercase tracking-widest text-muted-foreground">What it does</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {PERKS.map(([k, v]) => (
              <tr key={k}>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold">{k}</td>
                <td className="px-4 py-3 text-muted-foreground">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Callout tone="cyan" title="Difficulties: Pilgrim, Sworn, Deathless.">
        Pilgrim softens guardian damage and rewind taxes; Sworn is the canon tuning; Deathless removes the
        death-rewind mercy — a lethal blow ends the round, and the Array keeps your ball. Pick Sworn first.
      </Callout>

      <SectionHead
        index="4"
        kicker="Gold, sparks, and the 10:1 truth"
        title="Loot & exchange"
        body="The dungeon pays in two currencies and one contraband. Gold spends on the green; UUSD spends everywhere else; Sparkite spends nowhere — it builds."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["🪙 Gold", "Hole payouts, guardian bounties, hazard salvages. Spend it on clubhouse goods and round supplies. Ten Gold to one UUSD at any exchange font."],
          ["💵 UUSD", "The hard coin. Entry stakes for Deathless rounds and cross-game trade. Earned 1 per 10 Gold exchanged — never the reverse at a profit."],
          ["💠 Sparkite", "Crystallized W-axis wound-matter. Not currency: crafting stock for charge-weights, guard-rims, and lunge-coils. Guardians drop the purest cuts."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-5">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <Callout tone="amber" title="Payout table lives with the holes.">
        Per-hole purses scale with par and hazard count — the exact table ships alongside the hole ledger, not
        here, so this page never drifts from it. Rule of thumb: a clean par pays the round&apos;s supplies; a
        birdie funds a perk tier; a guardian bounty outpays both.
      </Callout>

      <SectionHead
        index="5"
        kicker="One per hole, none polite"
        title="Boss guardians"
        body="Ten holes, ten keepers. Each guardian seals its cup until you satisfy it the honest way — beat it, or out-golf it so completely it has nothing left to guard."
      />
      <div className="mt-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          A sealed cup rejects every putt: the ball lips out, every time, by dream-law. Unseal it by{" "}
          <strong className="text-foreground">defeating the guardian</strong> (shared-slice damage until it
          yields) <em>or</em> by <strong className="text-foreground">birdie-or-better</strong> — finish the hole
          under par and the keeper concedes the green unbeaten but unbowed. Either path opens the cup; only
          victory pays the full bounty.
        </p>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {[
          ["😡 Enrage", "Guardians enrage on a timer once engaged — faster swings, slice-flickers, heavier guard-breaks. Slow fights get expensive; commit or disengage a W-step away."],
          ["🏳️ Yield & mercy", "Yielded guardians kneel and go intangible permanently. No finishing blows in GraveGain4D — MERCENARY rewinds the killing timeline, and the keeper keeps its story."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-5">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <SectionHead
        index="6"
        kicker="Who speaks, and how much"
        title="Canon voices"
        body="GraveGain4D speaks with borrowed mouths. Every combat bark is bound by the canon voice tier contract — the same lines discipline as the campaign, trimmed for the green."
      />
      <div className="mt-5 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="px-4 py-3 font-mono text-xs font-black uppercase tracking-widest text-muted-foreground">Tier</th>
              <th className="px-4 py-3 font-mono text-xs font-black uppercase tracking-widest text-muted-foreground">Contract</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {[
              ["Prime voices", "The canon five — Angel Good, Mirathiel, Groknak, MERCENARY, Hades — speak only verbatim campaign lines, never invented ones. A guardian quoting Hades is quoting history."],
              ["Echo voices", "Hole keepers and caddie-ghosts paraphrase canon freely but may assert no new lore. Color, never scripture."],
              ["Dream voices", "The 4D narrator and tutorial whisperer are original to this game and clearly marked. They explain mechanics; they do not testify about the world."],
            ].map(([k, v]) => (
              <tr key={k}>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold">{k}</td>
                <td className="px-4 py-3 text-muted-foreground">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Callout tone="cyan" title="Pager-safe and unwired by design.">
        This page links to no new routes and edits no nav, sitemap, or catalog. When the stewards wire
        /docs/games/gravegain4d/combat into the docs index, this file needs zero changes.
      </Callout>
    </article>
  );
}
