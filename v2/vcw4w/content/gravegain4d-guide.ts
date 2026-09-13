// GraveGain4D player guide (slug: gravegain4d ONLY).
//
// LOCATION NOTE: this lives in `content/` (not `lib/`) because `content/`
// owns per-game data modules (see content/games.ts, content/game-manifests.ts)
// while `lib/` owns engine-agnostic utilities. Shape mirrors
// content/battlesharks2-guide.ts: typed sections + slug/title + lookup.
// Detail/play pages keep reading game-manifests.ts; agents and UI import
// GG4D_GUIDE from here.
//
// SOURCE TRUTH (read-only; never edited):
// content/gravegain4d-modes.ts (content tiers kid/teen/all + NPC table,
// G4D_HOLES par table), content/gravegain4d-lore.ts (Hades Array, LuckyStarShip
// hub, MoonRock descent, Mother Tree, multiverse-fold premise).
//
// TONE CONTRACT: this module is kid-safe throughout. The tier-notes section
// DESCRIBES the three content modes (what changes between them) rather than
// showing teen/all flavor. No profanity, no gore detail, no secrets.

export type GG4DGuideSection = {
  /** Stable section id: primer | folds | controls | scoring | tiers | npc-tips. */
  id: string;
  heading: string;
  body: string[];
};

export const GG4D_GUIDE: { slug: string; title: string; sections: GG4DGuideSection[] } = {
  slug: "gravegain4d",
  title: "GraveGain4D Player Guide",
  sections: [
    {
      id: "primer",
      heading: "4D golf primer: ana, kata, and W-aim",
      body: [
        "GraveGain4D is golf played across four directions: left-right, forward-back, up-down, plus W — the fourth direction. Shots travel through folded fairways, so the cup you see is one 3D slice of a longer 4D hole.",
        "Ana and kata are the two ways along W. Ana steps your ball toward one neighboring slice, kata toward the other. Think of them as uphill and downhill on a hill you can only see one step of at a time.",
        "W-aim is the extra aim dial beside your usual left-right aim. Set your ground aim first, then nudge W-aim toward ana or kata until the preview arc lands on the slice holding the cup.",
        "Reading 3D slices: each hole shows one slice at a time. The slice ribbon (kept by Fold Cartographer Vex) tells you which slice you are on and which slices the fairway visits. If the cup marker looks faint or hollow, the cup is on another slice — follow the ribbon's ana/kata arrow, not the straight line.",
        "Beginner rule: when the ribbon bends, trust the bend. Aim where the fold goes, then add a little extra push — folded fairways slow the ball near each fold line.",
        "Holes 1-4 (front stretch, par 3-5) teach one fold at a time. Holes 5-10 stack folds and echoes, so replay the early holes until W-aim feels as natural as left-right aim.",
      ],
    },
    {
      id: "folds",
      heading: "Folds, rewinds, and ghost echoes",
      body: [
        "Folds: some fairways bend through W mid-flight. Your ball hops slices along the ribbon's path automatically — your job is picking the launch slice and power so each hop lands on grass, not in the void between slices.",
        "Rewinds: each descent (one full attempt at a hole) includes one rewind. A rewind returns your ball to the previous lie and refunds the stroke, letting you retry a shot that went sideways. One per descent — spend it late, on the shot that matters, not the first wobble.",
        "Ghost echoes: a friendly echo shows what your parallel self just did — a faint trail of the last attempt's line. Watch it before you swing: if the echo drifts kata past the cup, aim a touch more ana, and the reverse.",
        "Echoes never block your ball and never cost strokes. They are a hint ribbon, not a hazard — wave back and learn from them.",
        "Lore in one line: the Hades Array folded MoonRock into parallel timelines, so every mission-hole is fought across folds. Close the hole in this timeline and every echo goes quiet with it.",
      ],
    },
    {
      id: "controls",
      heading: "Controls reference",
      body: [
        "Aim (ground): A / D or Left / Right arrow keys — swing the aim arc across the fairway.",
        "W-aim (fourth direction): W / S or Up / Down arrow keys — slide the aim between ana and kata slices. Watch the slice ribbon update as you nudge.",
        "Power: hold Space to charge the swing meter, release to strike. Short taps for putts, full holds for long folded drives.",
        "Slice view: Q / E steps the camera one slice ana or kata without moving the ball — scouting only, costs nothing.",
        "Rewind: R spends your one rewind for this descent (returns to the previous lie, refunds the stroke).",
        "Pause: Esc or P. Mouse and touch: drag to aim, drag the W-dial for W-aim, pull back and release to swing.",
      ],
    },
    {
      id: "scoring",
      heading: "Scoring and par",
      body: [
        "Each hole has a par — the stroke budget for a tidy run. Front stretch is gentle (Hole 1 par 3, Holes 2-3 par 4, Hole 4 par 5); the back stretch is grimmer (Holes 8-10 par 5 each). Matches the G4D_HOLES table in gravegain4d-modes.ts.",
        "Finish under par and the crew celebrates an under-par round; over par just means the fold kept its secrets this time. Rewinds refund the retried stroke, so a well-spent rewind can rescue par.",
        "Ten holes, one per mission (missions 1-10, crash site through Lucifer's Shadow). Total par across the round is 44 — compare rounds by total strokes against 44.",
        "Echoes, slice-scouting (Q / E), and W-aim nudges never add strokes. Only swings count.",
      ],
    },
    {
      id: "tiers",
      heading: "Per-tier notes: kid, teen, all",
      body: [
        "Kid (cozy): the cozy way to play. Crew chatter stays gentle and encouraging, hazards are described as sleepy or silly, and victories feel like bedtime-story endings. Nothing scary on screen beyond soft spooky decorations.",
        "Teen (gritty but clean): the same holes with a sterner crew voice — tougher talk about danger and duty, with only the mildest strong language. Play the same way; expect blunter warnings near hazards and folds.",
        "All (uncut, 18+): the full uncut crew voice for adult players — unfiltered reactions and darker humor from the same NPCs. Hole layouts, par, folds, and rules are identical; only the dialogue changes.",
        "Switching tiers never changes difficulty, par, or progress — only which dialogue lines the crew speaks. Pick the tier that fits the room you are playing in.",
      ],
    },
    {
      id: "npc-tips",
      heading: "Golf NPC tips: Fold Cartographer Vex",
      body: [
        "Fold Cartographer Vex (spiral-map portrait) reads the W-slice folds and timelines — your on-course caddie for everything fourth-direction.",
        "Vex's first tip: read the ghost echo before you move. The echo shows where this fold goes if you commit, so let it swing first in your mind.",
        "Vex's second tip: budget your rewind. One per descent — save it for the late hole-turning shot, not the first stumble.",
        "Vex's third tip: when the W-slice drifts mid-hole, re-scout with Q / E. The ribbon updates live; a thirty-second look beats a lost ball.",
        "The rest of the crew cheers from the LuckyStarShip hub: President Angel Good keeps the lanterns lit, Ember Cartographer Sable marks your safe line, and Warchief Groknak applauds every bold drive.",
      ],
    },
  ],
};

export function gg4dGuideSection(id: string): GG4DGuideSection | undefined {
  return GG4D_GUIDE.sections.find((s) => s.id === id);
}
