import type { Metadata } from "next";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/games/gravegain4d" },
  title: "GraveGain4D: 4D golf guide",
  description:
    "Putt through a 3D slice of tesseract dungeons: aim, W-slice, rewind, 10 holes, controls, canon, and inspirations for GraveGain4D.",
};

const theme = {
  bg: "bg-gradient-to-br from-emerald-950 via-slate-950 to-violet-950",
  border: "border-emerald-400/20",
  chip: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200",
  title: "bg-gradient-to-r from-emerald-300 via-amber-200 to-violet-300 bg-clip-text text-transparent",
};

const HOLES: Array<[string, string, string]> = [
  ["Hole 1 — LZ Crash Site Defense", "Mirrors Mission 1", "Ship-wreck metallic fairway. Learn aim and launch among the drop-craters."],
  ["Hole 2 — Cleansing the Elven Groves", "Mirrors Mission 2", "Bioluminescent grove bunkers. First real W-slices around living roots."],
  ["Hole 3 — Deep in the Dwarven Vaults", "Mirrors Mission 3", "Mine-shaft doglegs and Sparkite hazards. Thread the vault corridors."],
  ["Hole 4 — Orc Nomad Outpost Siege", "Mirrors Mission 4", "Red-dune wastes with wide greens. Long siege-style drives."],
  ["Hole 5 — Signal in the Shallows", "Mirrors Mission 5", "Relay-chamber metallics with crosswinds that push mid-flight balls."],
  ["Hole 6 — The Alchemical Catacombs", "Mirrors Mission 6", "Toxic-cloud rough from the botany vats. Stay on the short grass."],
  ["Hole 7 — The Tomb of Clint Oldman", "Mirrors Mission 7", "Stone-crypt corridors. Bank shots off memorial walls."],
  ["Hole 8 — Orbital Strike Calibration", "Mirrors Mission 8", "Highland peak observatory. Uphill putts under strike lights."],
  ["Hole 9 — Gate of the NecroGenesis", "Mirrors Mission 9", "Citadel-perimeter gauntlet. The longest hole — slice often."],
  ["Hole 10 — Lucifer's Shadow", "Mirrors Mission 10", "The Sanctum Core green over the Hades Array. Close the wound."],
];

export default function GraveGain4DPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · games · gravegain4d"
        title={<>4D golf in the GraveGain canon. <span className={theme.title}>Putt through a 3D slice.</span></>}
        lede={<>GraveGain4D tees off from the MoonRock colony aboard the LuckyStarShip: 10 holes of time-bent golf across a tesseract dungeon you steer one slice at a time.</>}
        stats={[
          ["10", "holes · 10 mission echoes"],
          ["Q/E", "W-slice the fairway"],
          ["R", "rewind a bad shot"],
          ["👆", "touch supported"],
        ]}
        glyph="⛳"
        theme={theme}
        crumb="GraveGain4D"
        art={
          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/40 p-4 backdrop-blur">
            <span aria-hidden="true" className="text-3xl">🌀</span>
            <p className="font-mono text-sm font-bold tracking-widest text-emerald-200">AIM → SLICE → PUTT → REWIND</p>
            <span aria-hidden="true" className="text-3xl">⛳</span>
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="Debts, paid gladly"
        title="Inspirations"
        body="Three ideas share one green: slice-golf popularized by 4D Golf by CodeParade, the honest geometry of tesseracts and hypercubes, and generative AI-worlds in the spirit of AI-lab Minecraft builds."
      />
      <div className="mt-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          From <strong className="text-foreground">4D Golf by CodeParade</strong> comes the core verb: you never see
          four dimensions at once, you golf through a 3D slice of a 4D course and rotate that slice to bend the
          fairway. From <strong className="text-foreground">tesseract/hypercube geometry</strong> comes the course
          itself — four axes (X, Y, Z, W), procedurally generated par 3–5 holes with 2–5 hazards each. From{" "}
          <strong className="text-foreground">generative AI-worlds à la AI-lab Minecraft</strong> comes the dungeon
          generator: every round re-deals tee, cup, hazards, and tesseract spin from a seed. GraveGain4D is an
          original tribute — new prose, new code, same MoonRock.
        </p>
      </div>

      <SectionHead
        index="2"
        kicker="Aim · slice · putt · rewind"
        title="How it plays"
        body="Drag to aim, release to launch, tap Space to putt. When the fairway says no, slice the universe instead — then rewind and try the smarter timeline."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["⛳ Aim & launch", "Drag the mouse to shape the shot arc, release to launch. Short drags putt, long drags drive."],
          ["🌀 W-slice (Q/E)", "Rotate the visible 3D cross-section along the fourth (W) axis. Same ball, same course — a friendlier cross-section."],
          ["⏪ Rewind (R)", "Undo your last shot, MERCENARY-style: the ball returns, the lesson stays. Slice first, shoot second."],
          ["⏸ Pause (P)", "P or Esc pauses the round. Touch players get on-screen buttons for slice, rewind, putt, and pause."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-400/50">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <Callout tone="cyan" title="Beginner loop: aim → miss → rewind → slice → sink.">
        Most &ldquo;impossible&rdquo; holes are one W-step from easy. Slice before you shoot, putt with Space
        inside the green ring, and spend rewinds freely on holes 6–9.
      </Callout>

      <SectionHead
        index="3"
        kicker="Same moon, new wound"
        title="Canon"
        body="GraveGain4D is fully inside GraveGain canon: MoonRock, the LuckyStarShip, MERCENARY's dream-time, and the crew you already know — plus one new tear in the world."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["🌙 MoonRock", "Grandest moon of the ringed giant Giantess, orbiting FarStar — elven glow-forests north, dwarven highland mines central, orc red wastes south."],
          ["🚀 LuckyStarShip", "The colony ship that carried 50,000 sleepers across two centuries. Your clubhouse above the course."],
          ["🔮 MERCENARY", "The machine-mind that dreams backward through time — moving no matter, only knowledge sent as dreams. Your rewinds are its small mercies."],
          ["🌿 President Angel Good", "Botanist-turned-president who bound four peoples into one alliance and runs the ship's botany deck."],
          ["👻 Elder Mirathiel", "Elven seer and keeper of the Mother Trees, who felt the dead rise through the roots first."],
          ["👹 Warchief Groknak", "Orc ally who sealed the pact in mixed blood. Standing order: orcs do not die sitting down."],
          ["👑 Hades & the Array", "Dr. Lucifer Hades stayed awake the whole voyage building the Necromantic Array — ley-line towers that woke every corpse on Day 7."],
          ["🌀 The W-axis wound", "The Array at full burn tore a slit along W, the fourth direction. Ten holes, ten echoes of ten fights. Play them. Close them."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-5">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <SectionHead
        index="4"
        kicker="Keys + touch"
        title="Controls"
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
            {[
              ["Mouse drag + release", "Aim the shot arc, release to launch."],
              ["Q / E", "W-slice: rotate the 3D cross-section along the W-axis."],
              ["R", "Rewind: undo the last shot and replay the timeline."],
              ["Space", "Putt: short precision stroke near the cup."],
              ["P / Esc", "Pause / resume the round."],
              ["👆 Touch", "Drag to aim, lift to launch; on-screen buttons for slice, rewind, putt, pause."],
            ].map(([k, v]) => (
              <tr key={k}>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold">{k}</td>
                <td className="px-4 py-3 text-muted-foreground">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHead
        index="5"
        kicker="Ten holes, ten echoes"
        title="Holes"
        body="Each hole echoes one of the 10 GraveGain campaign missions — the same battlefields, mowed into fairways by the W-axis wound."
      />
      <ol className="mt-5 grid list-none gap-3 p-0">
        {HOLES.map(([t, tag, b], i) => (
          <li key={t} className="rounded-2xl border border-border bg-card p-5">
            <p className="font-black">
              <span className="mr-2 inline-block rounded-md bg-black/10 px-2 py-0.5 font-mono text-xs dark:bg-white/10">H{i + 1}</span>
              {t}
              <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[11px] font-bold text-muted-foreground">{tag}</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </li>
        ))}
      </ol>
    </article>
  );
}
