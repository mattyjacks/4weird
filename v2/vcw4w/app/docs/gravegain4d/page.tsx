import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/gravegain4d" },
  title: "GraveGain4D play guide",
  description:
    "How GraveGain4D plays: 4D-slice putting, hypercube W rotations, folding vectors, dream-shift alternates, and rewind time travel across the 10-mission GraveGain saga.",
};

const theme = {
  bg: "bg-gradient-to-br from-emerald-950 via-slate-950 to-violet-950",
  border: "border-emerald-400/20",
  chip: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200",
  title: "bg-gradient-to-r from-emerald-300 via-teal-200 to-violet-300 bg-clip-text text-transparent",
};

const CONTROLS: Array<[string, string, string]> = [
  ["⛳ Putt", "Click / Space (hold to charge)", "Aim with the mouse, hold to charge, release to putt the soul-orb toward the grave-hole. Par is strokes, not kills."],
  ["🌀 Rotate W", "Q / E or W-slider", "Roll the hypercube through the XW, YW, and ZW planes. Walls fold away and hidden fairways appear in the 3D slice."],
  ["⏪ Rewind", "R", "MERCENARY informational time travel: rewind the shot, keep the ghost-ball trail, and try the timeline again."],
  ["🌙 Dream-shift", "T", "Slip into an Oasis-style dream alternate of the same hole: same par, stranger voxel weather, remixed hazards."],
  ["🚶 Move", "WASD / arrows + touch stick", "Walk the slice between putts. Touch targets are 44px; the W-slider never blocks the putt button."],
  ["⏸ Pause", "P / Esc", "Pause, autosave hook, and resume. Cutscenes autosave after each hole card."],
];

const SAGA: Array<[string, string, string]> = [
  ["Hole 1 · LZ Crash Site Defense", "The Descent on MoonRock", "President Angel Good waves you down onto MoonRock. Tutorial green: putt through the wreck of the LuckyStarShip while Mirathiel explains the W wound."],
  ["Hole 2 · Cleansing the Elven Groves", "Echoes of the Green Chronicle", "Queen Aelindra's fairway is choked with blight. Dream-shift shows the grove as it was; your ghost putts teach the living green."],
  ["Hole 3 · Deep In The Dwarven Vaults", "Sparkite & Steel", "A bunker of vault doors. Fold vectors through the ZW plane to bank shots off sparkite seams Groknak swears are load-bearing."],
  ["Hole 4 · Orc Nomad Outpost Siege", "Rage of the Southern Wastes", "Warchief Groknak dares you to out-drive the outpost guns. Wide wastes, cross-winds, one very smug orc."],
  ["Hole 5 · Signal in the Shallows", "Valley Net Uplink Restoration", "Lisa Park needs the uplink re-aimed. Putt relay shots across floating dishes; rewind fixes the one that sailed into the drink."],
  ["Hole 6 · The Alchemical Catacombs", "President Good's Legacy", "Toxic catacombs under the Mother Tree's roots. Ana/kata gates: only the correct W-slice lets the orb pass."],
  ["Hole 7 · The Tomb of Clint Oldman", "Guy Young's Paradox", "A time-travel knot. Every rewind leaves a ghost; the par line threads all three of your own timelines."],
  ["Hole 8 · Orbital Strike Calibration", "The MERCENARY Doctrine", "MERCENARY targeting grid as a golf course. Calibrate XW/YW/ZW drift, then sink the shot the satellites are watching."],
  ["Hole 9 · Gate of the NecroGenesis", "The Breach of the Array", "The Hades Array tears the sky. Dream alternates bleed together; the grave-hole anchors the only stable slice."],
  ["Hole 10 · Lucifer's Shadow", "The Final Confrontation", "Champion's green at the Array's heart. All four rotations, both alternates, every ghost you left behind. Sink it for MoonRock."],
];

export default function GraveGain4DPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · gravegain4d"
        title={<>Putt through the fourth dimension. <span className={theme.title}>Same saga, folded.</span></>}
        lede={<>GraveGain4D is 4D Golf in GraveGain canon: CodeParade-style 3D-slice putting across hypercube holes, with folding vectors, dream-shift alternates, and rewind time travel — starring Angel Good, Mirathiel, Groknak, Queen Aelindra, and Lisa Park.</>}
        stats={[
          ["10", "holes = 10 saga missions"],
          ["XW·YW·ZW", "hypercube rotations"],
          ["R / T", "rewind · dream-shift"],
          ["⛳", "par, not kill-count"],
          ["13+", "teens band, age-gated"],
        ]}
        glyph="⛳"
        theme={theme}
        crumb="GraveGain4D"
        art={
          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/40 p-4 backdrop-blur">
            <span aria-hidden="true" className="text-3xl">🌀</span>
            <p className="font-mono text-sm font-bold tracking-widest text-emerald-200">W-SLICE · XW 32° · PAR 3 · STROKE 2</p>
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="The one idea"
        title="What 4D slicing means for play"
        body="Every hole is a 4D hypercube dungeon. You only ever see and putt inside one 3D slice of it at a time. Rotating W (Q/E or the W-slider) slides that slice along the fourth axis: walls fold into fairways, hazards fold out of existence, and the grave-hole anchor stays fixed while everything else refolds around it."
      />
      <MockWindow title="4weird.com — hole 6 slice readout" badge="live fold">
        <div className="space-y-2 font-mono text-xs sm:text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-400">SLICE · W = +0.40 (ana side)</span><span className="font-bold text-emerald-300">FAIRWAY OPEN</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">ROTATE · Q/E through YW plane</span><span className="font-bold text-emerald-300">WALL FOLDS AWAY</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">SLICE · W = −0.60 (kata side)</span><span className="font-bold text-rose-300">HAZARD IN SLICE</span></div>
          <div className="flex justify-between gap-4 border-t border-white/10 pt-2"><span className="font-bold text-slate-200">RULE · cup never moves</span><span className="font-bold text-amber-300">ONLY THE WORLD FOLDS</span></div>
          <p className="pt-1 text-[11px] text-slate-500">vectors fold · ball rolls in 3D · par counts strokes, never rotations</p>
        </div>
      </MockWindow>
      <Steps
        items={[
          ["Read the slice, not the cube", <>You cannot hold the whole hypercube in your head and you do not need to. Watch the slice readout: if the line to the cup is blocked, the shot is a rotation problem, not an aim problem.</>],
          ["Rotate before you charge", <>Tap Q/E or drag the W-slider first. Folding is free — strokes only count when the orb leaves the putter. Find the slice where the fairway is open, then putt.</>],
          ["Trust the anchor", <>The grave-hole cup is pinned across all W values. If a dream-shift or rewind disorients you, aim at the anchor beacon and re-read the slice from there.</>],
        ]}
      />

      <SectionHead
        index="2"
        kicker="Hands on the club"
        title="Controls"
        body="Six inputs cover the whole dream. Full drills live on the how-to-play page."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {CONTROLS.map(([t, code, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-400/50">
            <p className="font-black">{t}</p>
            <code className="mt-1 inline-block rounded bg-black/10 px-2 py-0.5 font-mono text-xs dark:bg-white/10">{code}</code>
            <p className="mt-2 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Want the drills? <Link className="underline" href="/docs/gravegain4d/how-to-play">How to play GraveGain4D →</Link>
      </p>

      <SectionHead
        index="3"
        kicker="Timelines and dreams"
        title="Rewind (R) and dream-shift (T)"
        body="Two buttons bend the hole without breaking par. Rewind is MERCENARY informational time travel: the shot rewinds, a ghost-ball replays your old line, and your new attempt putts alongside it. Dream-shift slips the same hole into an Oasis-style generative alternate — same cup, same par, remixed voxel weather and hazards."
      />
      <Callout tone="violet" title="Ghosts teach, they never touch.">
        Ghost-balls are trails, not collisions. They cannot knock your orb and you cannot knock them — they exist so your third attempt learns from your first two in plain sight.
      </Callout>

      <SectionHead
        index="4"
        kicker="The saga, retold in par"
        title="10 holes, same GraveGain canon"
        body="Each hole mirrors one of the ten shared GraveGain missions — same titles, same speakers, same places (MoonRock, the LuckyStarShip, the Mother Tree, the Hades Array). The objectives are re-skinned to golf: reach the grave-hole at or under par while the story happens around the green."
      />
      <div className="mt-5 grid gap-3">
        {SAGA.map(([t, sub, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-400/50">
            <p className="font-black">{t}</p>
            <p className="font-mono text-xs font-bold tracking-widest text-muted-foreground">{sub}</p>
            <p className="mt-2 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <SectionHead
        index="5"
        kicker="Who can tee off"
        title="Kids-mode and age-gate note"
        body="GraveGain4D is a teen-band game (13+): a teen outfit on tour with the saga's grown-up stakes. It inherits the GraveGain age-gate — your account's age band decides, and entering a birthday can't overrule it. Kids Mode hides adult-band shelves; under-13 players use a parent-created Child login, never this tour."
      />
      <Callout tone="cyan" title="Teen band, same rule as the saga.">
        Cartoon-spooky putting, no gore-for-glory. The gate cards at the door exactly like GraveGain 1D/2D/3D: 402 means top up, 403 means band-blocked — never a mystery.
      </Callout>

      <Pager current="/docs/gravegain4d" />
    </article>
  );
}
