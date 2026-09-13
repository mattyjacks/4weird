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
      <p className="mt-4 text-sm text-muted-foreground">
        Back to <Link className="underline" href="/docs/gravegain4d">the GraveGain4D guide →</Link>
      </p>

      <Pager current="/docs/gravegain4d/how-to-play" />
    </article>
  );
}
