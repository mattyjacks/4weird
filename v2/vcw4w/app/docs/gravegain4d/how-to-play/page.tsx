import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/gravegain4d/how-to-play" },
  title: "How to play GraveGain4D",
  description:
    "Drills for GraveGain4D: aim and charge putts, rotate W through XW/YW/ZW, rewind timelines with R, dream-shift alternates with T, and read par across 10 saga holes.",
};

const theme = {
  bg: "bg-gradient-to-br from-emerald-950 via-slate-950 to-violet-950",
  border: "border-emerald-400/20",
  chip: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200",
  title: "bg-gradient-to-r from-emerald-300 via-teal-200 to-violet-300 bg-clip-text text-transparent",
};

export default function GraveGain4DHowToPlayPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · gravegain4d · drills"
        title={<>Four drills. <span className={theme.title}>Then the tour is yours.</span></>}
        lede={<>Putt, rotate W, rewind with R, dream-shift with T. Practice each one on hole 1 before the Array starts folding the sky.</>}
        stats={[
          ["1", "putt drill"],
          ["2", "W-rotation drill"],
          ["3", "rewind drill"],
          ["4", "dream-shift drill"],
          ["10", "holes on tour"],
        ]}
        glyph="🌙"
        theme={theme}
        crumb="How to play"
        art={
          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/40 p-4 backdrop-blur">
            <span aria-hidden="true" className="text-3xl">⛳</span>
            <p className="font-mono text-sm font-bold tracking-widest text-emerald-200">DRILL 2 · HOLD E · WATCH THE WALL FOLD</p>
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="Drill one · putt"
        title="Aim, charge, release"
        body="Putting is the only thing that spends strokes. Mouse aims the line, hold click or Space to charge, release to roll the soul-orb. Short taps nudge around the cup; full charges cross fairways but punish wild W-slices."
      />
      <Steps
        items={[
          ["Aim at the anchor beacon", <>The grave-hole cup renders a beacon visible in every slice and every dream. Start every read from the beacon backward to your orb.</>],
          ["Charge to the second marker", <>The power meter&rsquo;s second tick reaches most greens. Past it is for cross-fairway heroics — and for finding out where the water is.</>],
          ["Putt, then read the roll", <>The orb rolls in your current 3D slice only. If it curved somewhere strange, a wall edge is clipping your slice — that is drill two calling.</>],
        ]}
      />

      <SectionHead
        index="2"
        kicker="Drill two · rotate W"
        title="Fold the hole, don't fight it"
        body="Q/E (or the W-slider) rotates the hypercube through the XW, YW, and ZW planes. Rotating is free: no strokes, no cooldown. Each plane folds different geometry — if XW did nothing, try YW."
      />
      <MockWindow title="4weird.com — W-rotation drill" badge="hole 1">
        <div className="space-y-2 font-mono text-xs sm:text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-400">HOLD Q · XW plane</span><span className="font-bold text-slate-300">LEFT WALL THINS</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">HOLD E · XW back</span><span className="font-bold text-slate-300">WALL RETURNS</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">DRAG SLIDER · YW sweep</span><span className="font-bold text-emerald-300">FAIRWAY OPENS</span></div>
          <div className="flex justify-between gap-4 border-t border-white/10 pt-2"><span className="font-bold text-slate-200">PUTT ONLY WHEN OPEN</span><span className="font-bold text-amber-300">FOLDS ARE FREE</span></div>
          <p className="pt-1 text-[11px] text-slate-500">ZW shows up from hole 6 · ana/kata gates need the exact slice</p>
        </div>
      </MockWindow>

      <SectionHead
        index="3"
        kicker="Drill three · rewind"
        title="R: keep the ghost, fix the shot"
        body="Press R after a bad putt to rewind the orb to its pre-shot lie. Your old line replays as a ghost-ball so the correction is visible: aim off the ghost, adjust power, and putt the new timeline."
      />
      <Callout tone="violet" title="Two timelines is plenty.">
        Stacking rewinds stacks ghosts, and three ghosts is a crowd. One rewind per lie keeps the green readable — the Array rewards clean timelines.
      </Callout>

      <SectionHead
        index="4"
        kicker="Drill four · dream-shift"
        title="T: the same hole, dreaming"
        body="Press T to slip the hole into its Oasis-style dream alternate: same cup, same par, regenerated voxel dressing and remixed hazards. Stuck behind a hazard that will not fold? The dream version of that hazard is somewhere else."
      />
      <Steps
        items={[
          ["Shift before the putt, not after", <>Dream-shift is a course correction, not a mulligan. Read the dream slice, rotate W inside it, then putt — shifting mid-roll changes nothing about a ball already rolling.</>],
          ["Shift back freely", <>Press T again to return to the waking hole. Your lie carries over; only the dressing changes. Par never changes between dreams.</>],
        ]}
      />

      <SectionHead
        index="5"
        kicker="Scoring and safety"
        title="Par, ghosts, and the teen band"
        body="Every hole has a par (3–5). At or under par advances the saga; over par still advances after the mercy cap — the tour wants you at the Array, not stuck in the vaults. Ghosts never collide. Saves autosave after each hole card. GraveGain4D is teens 13+ and inherits the GraveGain age-gate; Kids Mode and Child logins behave exactly as the saga rules say."
      />
      <SectionHead
        index="6"
        kicker="Scoreboard math"
        title="Par examples and stroke budgets"
        body="Par is a budget, not a grade. Plan each hole as putts plus one spare stroke for a folded surprise."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["Par 3, sunk in 2: birdie", "Drive the opening lane, then tap in the finisher. Two clean reads, zero rewinds, one stroke banked for later holes."],
          ["Par 4, sunk in 5: bogey", "A clipped wall edge on stroke two, a rewind, then a safe recovery line. Over par still walks forward, so take the safe five instead of forcing a hero four."],
          ["Par 5, capped by mercy", "Long vault corridors punish full charges. Nudge, fold, nudge again. If the count climbs past the mercy cap, the tour advances you anyway so practice time stays on fresh holes."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <Callout tone="cyan" title="Budget rule: par minus one is ambition, par plus one is wisdom.">
        On a par 4, play for four but accept five. The saga rewards arrival at the Array, not perfect cards on every
        green. Rookies who chase birdies on hole 6 usually donate three strokes to the vault walls.
      </Callout>

      <SectionHead
        index="7"
        kicker="Missed-shot clinic"
        title="Which plane to fold, and when to stop folding"
        body="Every blocked putt answers one question: which plane moves the blocking geometry. Sweep planes in order, shortest look first."
      />
      <Steps
        items={[
          ["Try XW first for side walls", <>Hold Q, watch the left edge, then hold E to return. Side crypt walls and grove roots usually live on XW, so two seconds here solves half of all blocks.</>],
          ["Try YW next for floor ridges and lintels", <>Drag the W-slider slowly through the middle range. If the fairway stripe brightens or the hazard marker fades, stop sweeping and putt from that slice.</>],
          ["Save ZW for vault gates", <>From hole 6 on, ana and kata gates answer only to ZW. Park the slider on the exact tick where the gate glyph turns green, then putt without touching the slider again.</>],
          ["Stop folding and change the shot", <>If all three planes leave the line blocked, the shot is wrong, not the slice. Dream-shift with T, pick a shorter layup, or accept a two putt route around the hazard.</>],
        ]}
      />
      <ul className="mt-5 list-disc space-y-2 pl-6 text-sm leading-relaxed text-muted-foreground">
        <li><strong className="text-foreground">Symptom: orb curves without touching anything.</strong> A wall lip is clipping the slice. Fold XW one step and roll again.</li>
        <li><strong className="text-foreground">Symptom: cup beacon visible, lane never opens.</strong> The lane lives in the dream alternate. Press T, rotate inside the dream, then putt there.</li>
        <li><strong className="text-foreground">Symptom: three ghosts crowd the green.</strong> Too many rewinds on one lie. Finish the hole, any score advances the tour, and reset to one rewind per lie.</li>
        <li><strong className="text-foreground">Symptom: touch putt button feels covered.</strong> Drag the W-slider dock to the side edge, then use the full width putt pad. Targets stay 44px so thumbs land cleanly.</li>
      </ul>

      <SectionHead
        index="8"
        kicker="Quick answers"
        title="Drill FAQ"
        body="Five questions every rookie asks on hole 1, answered once so practice stays on the green."
      />
      <ul className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <li className="rounded-xl border border-border bg-card p-3">🌀 <strong className="text-foreground">Do rotations cost strokes?</strong> Never. Q, E, and the slider are free. Only a released putt adds to the card.</li>
        <li className="rounded-xl border border-border bg-card p-3">👻 <strong className="text-foreground">Can a ghost knock my ball?</strong> No. Ghost trails replay old lines visually and pass through everything, including your orb.</li>
        <li className="rounded-xl border border-border bg-card p-3">🌙 <strong className="text-foreground">Does dream-shift change par?</strong> No. Waking and dream versions share the same cup and the same par number, only dressing and hazards differ.</li>
        <li className="rounded-xl border border-border bg-card p-3">⛳ <strong className="text-foreground">Where should I practice?</strong> Replay hole 1 until the second tick power feels automatic, then drill hole 6 gates, since ZW timing decides the late tour.</li>
        <li className="rounded-xl border border-border bg-card p-3">📖 <strong className="text-foreground">How is this guide different from the canon page?</strong> The companion page tells the saga story, inspirations, and world lore. This page teaches hands: drills, budgets, plane order, and fixes.</li>
      </ul>
      <p className="mt-4 text-sm text-muted-foreground">
        Back to <Link className="underline" href="/docs/gravegain4d">the GraveGain4D guide →</Link>
      </p>

      <Pager current="/docs/gravegain4d/how-to-play" />
    </article>
  );
}
