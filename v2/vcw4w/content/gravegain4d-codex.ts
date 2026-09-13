/**
 * GraveGain4D franchise codex (slug: gravegain4d ONLY).
 *
 * LOCATION NOTE: this lives in `content/` (not `lib/`) because `content/`
 * owns per-game data modules (see content/games.ts, content/game-manifests.ts)
 * while `lib/` owns engine-agnostic utilities. Reviewers read codex entries
 * keyed by id via `codexById`; UI filters by kind via `codexByKind`.
 *
 * SOURCE TRUTH (read-only; extended, never duplicated):
 * content/gravegain4d-lore.ts owns the canon prose blocks (Hades Array
 * origin, LuckyStarShip hub, MoonRock descent, Mother Tree, multiverse-fold
 * premise, mission titles) and content/gravegain4d-modes.ts owns the NPC
 * roster + dialogue. Entries below cross-reference those modules by id and
 * name instead of restating them: lore stays in lore, voices stay in modes,
 * and this codex adds what neither holds — the Compact, the timeline-worlds,
 * the fold/echo/ana-kata glossary, and the golf-as-trial doctrine.
 *
 * TONE CONTRACT: kid-safe throughout. This module DESCRIBES the setting
 * rather than performing teen/all flavor. No profanity, no gore detail,
 * no secrets.
 */

export type GG4DCodexKind =
  | "faction"
  | "figure"
  | "place"
  | "timeline"
  | "term"
  | "doctrine";

export type GG4DCodexEntry = {
  /** Stable codex id, namespaced by kind (e.g. "faction-compact"). */
  id: string;
  kind: GG4DCodexKind;
  title: string;
  body: string;
  /** Ids of related entries in this codex. */
  relatedIds: readonly string[];
};

export const GG4D_CODEX: readonly GG4DCodexEntry[] = [
  {
    id: "faction-compact",
    kind: "faction",
    title: "The Compact",
    body:
      "The Compact is the alliance that holds Colony Alpha together after the breach: " +
      "President Angel Good's colonists, Queen Aelindra's elves, the dwarven vault-holds, " +
      "and Warchief Groknak's orc nomads, sworn to one cup and one count. It keeps no " +
      "standing army — it keeps a ledger of trials, and every member people bleeds into " +
      "the cup before it asks others to bleed. When the Compact votes for war, it votes " +
      "for eighteen trials instead.",
    relatedIds: [
      "figure-angel-good",
      "figure-groknak",
      "figure-mirathiel",
      "place-luckystarship",
      "doctrine-golf-as-trial",
    ],
  },
  {
    id: "faction-array",
    kind: "faction",
    title: "The Array (Hades Array)",
    body:
      "The Array is Dr. Lucifer Hades's citadel machine and the people it has taken: " +
      "fallen seers wired into anchor-spires that catch departing consciousness and pour " +
      "it back into dead flesh. Its surge folded MoonRock's fourth direction, so every " +
      "mission is fought across parallel timelines at once. Break the anchors in this " +
      "timeline and every echo goes quiet with them.",
    relatedIds: [
      "figure-hades",
      "timeline-citadel",
      "term-fold",
      "term-echo",
      "faction-mother-tree-roots",
    ],
  },
  {
    id: "faction-mother-tree-roots",
    kind: "faction",
    title: "The Mother Tree Roots",
    body:
      "The Mother Tree roots are the elven world-root's defenders: wardens, singers, and " +
      "ancestor-memory keepers who hold the Bioluminescent Forest Vaults against the Array's " +
      "bleeding anchors. Twelve thousand years of sap and song mark every defender's steps, " +
      "past and future both, so a root-warden never walks a grove for the first time. They " +
      "fight inside the Compact, but their oath is older than it — to the Tree first.",
    relatedIds: [
      "figure-mirathiel",
      "faction-compact",
      "timeline-grove",
      "term-echo",
    ],
  },
  {
    id: "place-luckystarship",
    kind: "place",
    title: "The LuckyStarShip",
    body:
      "The LuckyStarShip is the colony ship that carried humanity to MoonRock and the " +
      "Compact's beating heart still: botany deck, burial-honor desks, rifle requisitions, " +
      "and fold-charts side by side. President Angel Good runs the hub the way she ran her " +
      "vats — everything grows better with a song, and everything survives with a guard " +
      "posted. Every trial round musters here before it walks the eighteen timelines.",
    relatedIds: [
      "figure-angel-good",
      "figure-vex",
      "faction-compact",
      "doctrine-golf-as-trial",
    ],
  },
  {
    id: "timeline-alpha",
    kind: "timeline",
    title: "Timeline-World: LZ Alpha (Crash-Site Prime)",
    body:
      "LZ Alpha is the prime timeline-world, anchored where Colony Alpha's descent ramp " +
      "meets the dust and the first grave still stands. Its folded fairways run through " +
      "wreck-metal and lantern-lit muster yards, teaching one fold at a time. Cartographers " +
      "call it the honest timeline — what your echo does here, it means everywhere.",
    relatedIds: ["place-luckystarship", "figure-angel-good", "term-echo"],
  },
  {
    id: "timeline-grove",
    kind: "timeline",
    title: "Timeline-World: The Bleeding Groves",
    body:
      "The Bleeding Groves timeline-world is the elven canopy folded over itself, where " +
      "sanctuary paths double back through W and wounded roots hum in two slices at once. " +
      "Root-wardens read its ribbon by song rather than chalk, following Elder Mirathiel's " +
      "echo where the ink runs out. Hold every crossing here and the forest holds you back.",
    relatedIds: ["faction-mother-tree-roots", "figure-mirathiel", "term-fold"],
  },
  {
    id: "timeline-vault",
    kind: "timeline",
    title: "Timeline-World: The Deep Vaults",
    body:
      "The Deep Vaults timeline-world stacks dwarven forge-halls below the catacombs, where " +
      "calibration relays tick in ana and answer in kata. Its fairways are stone discipline: " +
      "narrow slice-bridges, patient W-aim, no wasted rewinds. What the vaults teach, the " +
      "Citadel tests — strikers who rush here donate their echoes to the dark.",
    relatedIds: ["term-ana-kata", "term-rewind", "timeline-citadel"],
  },
  {
    id: "timeline-wastes",
    kind: "timeline",
    title: "Timeline-World: The Orc Wastes",
    body:
      "The Orc Wastes timeline-world is open dust and siege weather, where nomad outposts " +
      "raise their gates in every fold at once and the wind carries war-horns across slices. " +
      "Groknak's riders call it the loud timeline — no sneaking, no shortcuts, just holding " +
      "ground your parallel selves are holding too. Win the wastes standing up.",
    relatedIds: ["figure-groknak", "term-w-slice", "timeline-alpha"],
  },
  {
    id: "timeline-citadel",
    kind: "timeline",
    title: "Timeline-World: The Citadel Dark",
    body:
      "The Citadel Dark is the timeline-world beneath the NecroGenesis Gate, where the " +
      "Array's anchors drink deepest and dead timelines pile like cordwood. Its fairways " +
      "refold as you walk them, charging double for every spent rewind and every missed " +
      "read. Close the Gate here and the breach collapses in all eighteen timelines at once.",
    relatedIds: [
      "faction-array",
      "figure-hades",
      "doctrine-golf-as-trial",
      "term-rewind",
    ],
  },
  {
    id: "figure-angel-good",
    kind: "figure",
    title: "President Angel Good",
    body:
      "Angel Good was the LuckyStarShip's botanist before she was its president, and she " +
      "still runs the Compact like a greenhouse under siege: burial honors with one hand, " +
      "fold-charts with the other. She bled into the cup first so no people could claim the " +
      "trial costs more than its keeper pays. Cross-reference: hub-keeper voice in " +
      "gravegain4d-modes.ts; hub prose in gravegain4d-lore.ts.",
    relatedIds: [
      "faction-compact",
      "place-luckystarship",
      "doctrine-golf-as-trial",
    ],
  },
  {
    id: "figure-mirathiel",
    kind: "figure",
    title: "Elder Mirathiel (Echo)",
    body:
      "Elder Mirathiel was the Mother Tree's seer when the Array woke, and felt the fourth " +
      "direction tear in every timeline at once. What walks the roots now is her echo — " +
      "memory in sap and song, guiding wardens past folds no map survives. Cross-reference: " +
      "dungeon-ghost voice in gravegain4d-modes.ts; Mother Tree prose in gravegain4d-lore.ts.",
    relatedIds: [
      "faction-mother-tree-roots",
      "timeline-grove",
      "term-echo",
    ],
  },
  {
    id: "figure-groknak",
    kind: "figure",
    title: "Warchief Groknak",
    body:
      "Groknak leads the orc nomads inside the Compact and holds its loudest oath: orcs do " +
      "not die sitting down, in any timeline. Where the Array raised his own blood with " +
      "wrong eyes, he answered with open gates and burning pyres. Cross-reference: orc-ally " +
      "voice in gravegain4d-modes.ts.",
    relatedIds: ["faction-compact", "timeline-wastes", "doctrine-golf-as-trial"],
  },
  {
    id: "figure-hades",
    kind: "figure",
    title: "Dr. Lucifer Hades",
    body:
      "Dr. Lucifer Hades built the NecroGenesis Array to cheat death and folded a world " +
      "trying: the first test lit the sky over the Citadel, and every grave on MoonRock " +
      "answered. He does not command armies so much as spend them, across all timelines " +
      "at once. Cross-reference: Array origin prose in gravegain4d-lore.ts.",
    relatedIds: ["faction-array", "timeline-citadel", "term-fold"],
  },
  {
    id: "figure-vex",
    kind: "figure",
    title: "Fold Cartographer Vex",
    body:
      "Vex reads the W-slice folds no one else can hold still: ribbons, chalk-marks, and " +
      "one rewind spent late instead of early. The Compact's strikers walk Vex's ink lines " +
      "into all eighteen timelines, because the dungeon redraws itself around the careless. " +
      "Cross-reference: fold-guide voice in gravegain4d-modes.ts.",
    relatedIds: [
      "term-fold",
      "term-w-slice",
      "term-ana-kata",
      "doctrine-golf-as-trial",
    ],
  },
  {
    id: "term-fold",
    kind: "term",
    title: "Fold",
    body:
      "A fold is a place where the fairway bends through W mid-flight: the ball hops " +
      "slices along the ribbon's path on its own, and your job is picking the launch slice " +
      "and power so each hop lands on grass. Trust the bend — aim where the fold goes, " +
      "then add a little extra push, because folded fairways slow the ball near each fold line.",
    relatedIds: ["term-w-slice", "term-ana-kata", "figure-vex"],
  },
  {
    id: "term-echo",
    kind: "term",
    title: "Echo (Ghost Echo)",
    body:
      "An echo is a faint trail showing what your parallel self just did — where the last " +
      "attempt's line went, in this fold and the next. Echoes never block the ball and never " +
      "cost strokes; they are hint ribbons, not hazards. Watch before you swing: if the echo " +
      "drifts kata past the cup, aim a touch more ana, and the reverse.",
    relatedIds: ["term-fold", "figure-mirathiel", "timeline-alpha"],
  },
  {
    id: "term-ana-kata",
    kind: "term",
    title: "Ana / Kata",
    body:
      "Ana and kata are the two directions along W: ana steps the ball toward one " +
      "neighboring slice, kata toward the other. Think of them as uphill and downhill on a " +
      "hill you can only see one step of at a time. Set ground aim first, then nudge W-aim " +
      "toward ana or kata until the preview arc lands on the slice holding the cup.",
    relatedIds: ["term-w-slice", "term-fold", "figure-vex"],
  },
  {
    id: "term-w-slice",
    kind: "term",
    title: "W-Slice",
    body:
      "A W-slice is one three-dimensional cross-section of a four-dimensional hole — the " +
      "single slice you can see and stand on at a time. The slice ribbon tells you which " +
      "slice you are on and which slices the fairway visits next. If the cup marker looks " +
      "faint or hollow, the cup is on another slice: follow the ribbon's ana/kata arrow, " +
      "not the straight line.",
    relatedIds: ["term-ana-kata", "term-fold", "figure-vex"],
  },
  {
    id: "term-rewind",
    kind: "term",
    title: "Rewind",
    body:
      "A rewind returns the ball to its previous lie and refunds the stroke — one mistake " +
      "bought back per descent, where a descent is one full attempt at a hole. The budget " +
      "is one, so spend it late, on the shot that matters, not the first wobble. Crews that " +
      "spend their rewind early donate their echoes to the dark.",
    relatedIds: ["term-echo", "timeline-vault", "doctrine-golf-as-trial"],
  },
  {
    id: "doctrine-golf-as-trial",
    kind: "doctrine",
    title: "The Golf-as-Trial Doctrine (Eighteen Timelines, One Cup)",
    body:
      "The Compact settles wars with eighteen timelines and one cup because the breach " +
      "made every other kind of war unwinnable: armies fight once, but the Array refolds " +
      "the dead and fights again. So each people names a striker, each striker walks " +
      "eighteen holes — one per timeline-world crossing — and the cup counts what blades " +
      "cannot: precision under pressure, witnessed in every fold at once. Win the round and " +
      "your claim holds in all eighteen timelines; dispute the count and you dispute your " +
      "own echo, standing beside you on the green. That is why the cup outranks the sword: " +
      "it is the one battlefield the Array cannot refold, because every timeline watches it.",
    relatedIds: [
      "faction-compact",
      "place-luckystarship",
      "timeline-citadel",
      "figure-angel-good",
      "term-rewind",
    ],
  },
];

export function codexById(id: string): GG4DCodexEntry | null {
  return GG4D_CODEX.find((entry) => entry.id === id) ?? null;
}

export function codexByKind(kind: GG4DCodexKind): readonly GG4DCodexEntry[] {
  return GG4D_CODEX.filter((entry) => entry.kind === kind);
}
