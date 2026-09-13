/**
 * GraveGain4D 18-hole course pack (slug: gravegain4d ONLY).
 *
 * LOCATION NOTE: this lives in `content/` (not `lib/`) because `content/`
 * owns per-game data modules (see content/games.ts, content/game-manifests.ts,
 * content/gravegain4d-modes.ts, content/gravegain4d-lore.ts) while `lib/`
 * owns engine-agnostic utilities.
 *
 * Canon grounding: worldIds mirror the saga arc (Colony Alpha descent ->
 * elven groves -> orc wastes -> ossuary dark -> Hades Array citadel) and the
 * 4D premise from content/gravegain4d-lore.ts (the Array's breach folded
 * MoonRock into parallel timelines — prime / echo / ashen folds). Flavor
 * speakers are canon cast only: President Angel Good, Echo of Elder
 * Mirathiel, Warchief Groknak, Dr. Lucifer Hades (villain taunts), and Fold
 * Cartographer Vex. All flavor lines are kid-tier clean (no swears, no gore
 * words) so the table is safe under every GG4D content mode.
 *
 * NOTE: `G4D_HOLES` here is the 18-hole course-pack table. The legacy
 * 10-hole mission-mapping table of the same name in
 * content/gravegain4d-modes.ts is kept for the golf-bundle verifier;
 * import this module's table explicitly from "@/content/gravegain4d-holes".
 */

export type G4DVec4 = {
  x: number;
  y: number;
  z: number;
  /** W-slice (fourth-direction) coordinate of the marker. */
  w: number;
};

export type G4DHazard =
  | "tesseract-bunker"
  | "W-wind"
  | "gravity-fold"
  | "echo-trap"
  | "ghost-rough"
  | "array-obelisk";

export type G4DWorldId =
  | "moonrock-meadows"
  | "mirathiel-echo-glade"
  | "groknak-wastes-fold"
  | "folded-ossuary"
  | "hades-array-core";

export type G4DTimelineId = "prime" | "echo" | "ashen";

export type G4DHoleSpeaker =
  | "President Angel Good"
  | "Echo of Elder Mirathiel"
  | "Warchief Groknak"
  | "Dr. Lucifer Hades"
  | "Fold Cartographer Vex";

export type Hole = {
  /** Course hole number, 1..18. */
  id: number;
  name: string;
  /** Stroke budget for the hole. */
  par: 3 | 4 | 5;
  tee: G4DVec4;
  cup: G4DVec4;
  hazards: readonly G4DHazard[];
  timelineId: G4DTimelineId;
  worldId: G4DWorldId;
  /** Canon-NPC flavor line read on the tee box. Kid-tier clean. */
  flavor: { speaker: G4DHoleSpeaker; quote: string };
};

export const G4D_WORLDS: Record<G4DWorldId, { name: string; blurb: string }> = {
  "moonrock-meadows": {
    name: "MoonRock Meadows",
    blurb: "Colony Alpha landing dust and lantern grass, where James Wright's stone watches the first tee.",
  },
  "mirathiel-echo-glade": {
    name: "Mirathiel's Echo Glade",
    blurb: "Bioluminescent forest vaults under the Mother Tree, where every root hums in two timelines at once.",
  },
  "groknak-wastes-fold": {
    name: "Groknak's Wastes Fold",
    blurb: "Orc nomad siege grounds doubled across the fold — blood-tusk bunkers and war-drum wind.",
  },
  "folded-ossuary": {
    name: "Folded Ossuary",
    blurb: "Pell and Marrow's bone-walled dark, refolded so every corridor keeps the dead company twice.",
  },
  "hades-array-core": {
    name: "Hades Array Core",
    blurb: "The NecroGenesis citadel itself — red-eyed fairways under the Array's obelisks.",
  },
};

export const G4D_TIMELINES: Record<G4DTimelineId, { name: string; blurb: string }> = {
  prime: { name: "Prime Fold", blurb: "The descent as it happened — steady W-slice, honest wind." },
  echo: { name: "Echo Fold", blurb: "Parallel selves play beside you; ghost echoes mark every lie." },
  ashen: { name: "Ashen Fold", blurb: "The timeline where the Array already won — grim lies, burned greens." },
};

export const G4D_HOLES: readonly Hole[] = [
  {
    id: 1,
    name: "First Grave Tee",
    par: 3,
    tee: { x: 0, y: 0, z: 0, w: 0 },
    cup: { x: 120, y: 4, z: 18, w: 0 },
    hazards: ["W-wind"],
    timelineId: "prime",
    worldId: "moonrock-meadows",
    flavor: {
      speaker: "President Angel Good",
      quote: "James Wright's stone watches this tee, sailor. Swing gentle — the Meadows remember every first.",
    },
  },
  {
    id: 2,
    name: "Descent Ramp Fairway",
    par: 4,
    tee: { x: 8, y: 0, z: -12, w: 0 },
    cup: { x: 310, y: 6, z: 40, w: 1 },
    hazards: ["W-wind", "ghost-rough"],
    timelineId: "prime",
    worldId: "moonrock-meadows",
    flavor: {
      speaker: "Fold Cartographer Vex",
      quote: "See that shimmer past the ramp? That's the fourth direction saying hello. Aim through it, not at it!",
    },
  },
  {
    id: 3,
    name: "Lantern Grass Green",
    par: 4,
    tee: { x: -20, y: 0, z: 30, w: 1 },
    cup: { x: 280, y: 3, z: -22, w: 1 },
    hazards: ["tesseract-bunker"],
    timelineId: "prime",
    worldId: "moonrock-meadows",
    flavor: {
      speaker: "President Angel Good",
      quote: "My lantern plants lit this green before it was a green. Putt like you're watering something kind.",
    },
  },
  {
    id: 4,
    name: "Root-Hum Approach",
    par: 4,
    tee: { x: 0, y: 2, z: 0, w: 1 },
    cup: { x: 295, y: 8, z: 60, w: 2 },
    hazards: ["echo-trap"],
    timelineId: "prime",
    worldId: "mirathiel-echo-glade",
    flavor: {
      speaker: "Echo of Elder Mirathiel",
      quote: "The roots hum when brave friends visit. Hum back, little one, and the Glade will hold your ball soft.",
    },
  },
  {
    id: 5,
    name: "Mother Tree Shade",
    par: 5,
    tee: { x: -40, y: 2, z: -30, w: 2 },
    cup: { x: 480, y: 10, z: 90, w: 2 },
    hazards: ["echo-trap", "ghost-rough"],
    timelineId: "prime",
    worldId: "mirathiel-echo-glade",
    flavor: {
      speaker: "Echo of Elder Mirathiel",
      quote: "Twelve thousand years of shade over this fairway. Walk like you mean to come back — all five strokes.",
    },
  },
  {
    id: 6,
    name: "Biolume Vaults",
    par: 3,
    tee: { x: 15, y: 4, z: 10, w: 2 },
    cup: { x: 150, y: 12, z: -40, w: 3 },
    hazards: ["gravity-fold"],
    timelineId: "prime",
    worldId: "mirathiel-echo-glade",
    flavor: {
      speaker: "Echo of Elder Mirathiel",
      quote: "The Vaults glow for the careful and dim for the hasty. One folded carry — trust the light, not your eyes.",
    },
  },
  {
    id: 7,
    name: "Parallel Selves Split",
    par: 4,
    tee: { x: 0, y: 0, z: 0, w: 3 },
    cup: { x: 320, y: 5, z: 25, w: 4 },
    hazards: ["echo-trap", "gravity-fold"],
    timelineId: "echo",
    worldId: "mirathiel-echo-glade",
    flavor: {
      speaker: "Fold Cartographer Vex",
      quote: "Oops — that was your echo teeing off beside you! Watch where THEY land, then do one better. Wheee!",
    },
  },
  {
    id: 8,
    name: "Blood-Tusk Bunkers",
    par: 4,
    tee: { x: -10, y: 0, z: 20, w: 4 },
    cup: { x: 300, y: 4, z: -35, w: 4 },
    hazards: ["tesseract-bunker"],
    timelineId: "echo",
    worldId: "groknak-wastes-fold",
    flavor: {
      speaker: "Warchief Groknak",
      quote: "HA! Little human digs in sand like tiny Grok-Legs! You blast out of MY bunkers, we best friends forever!",
    },
  },
  {
    id: 9,
    name: "Warchief's Roar",
    par: 5,
    tee: { x: 0, y: 0, z: -25, w: 4 },
    cup: { x: 520, y: 7, z: 70, w: 5 },
    hazards: ["W-wind", "tesseract-bunker"],
    timelineId: "echo",
    worldId: "groknak-wastes-fold",
    flavor: {
      speaker: "Warchief Groknak",
      quote: "Long hole needs BIG stomps! You, me, best stomp team — we stomp this fold flat! STOMP STOMP!",
    },
  },
  {
    id: 10,
    name: "Nomad Siege Green",
    par: 4,
    tee: { x: 25, y: 0, z: 15, w: 5 },
    cup: { x: 330, y: 6, z: -15, w: 5 },
    hazards: ["gravity-fold", "W-wind"],
    timelineId: "echo",
    worldId: "groknak-wastes-fold",
    flavor: {
      speaker: "Warchief Groknak",
      quote: "You held the gate like warrior last run, and echo-you held it in next fold. Today we hold EVERY green!",
    },
  },
  {
    id: 11,
    name: "Pell's Counting Wall",
    par: 4,
    tee: { x: 0, y: -6, z: 0, w: 5 },
    cup: { x: 305, y: -2, z: 45, w: 6 },
    hazards: ["echo-trap", "tesseract-bunker"],
    timelineId: "echo",
    worldId: "folded-ossuary",
    flavor: {
      speaker: "Fold Cartographer Vex",
      quote: "The bone-walls count your strokes in two timelines, so make them tidy ones. Ribbon's edge — hop across!",
    },
  },
  {
    id: 12,
    name: "Bone-Castle Rough",
    par: 5,
    tee: { x: -30, y: -6, z: -20, w: 6 },
    cup: { x: 495, y: 0, z: 80, w: 6 },
    hazards: ["tesseract-bunker", "echo-trap"],
    timelineId: "echo",
    worldId: "folded-ossuary",
    flavor: {
      speaker: "President Angel Good",
      quote: "Pell and Marrow stack these bones into castles to keep the tunnels tidy. Play around their work, not through it.",
    },
  },
  {
    id: 13,
    name: "Whispering Crack Putt",
    par: 3,
    tee: { x: 10, y: -8, z: 5, w: 6 },
    cup: { x: 140, y: -4, z: -30, w: 7 },
    hazards: ["gravity-fold"],
    timelineId: "ashen",
    worldId: "folded-ossuary",
    flavor: {
      speaker: "Echo of Elder Mirathiel",
      quote: "Never follow the whispering cracks, little one — putt straight past them and do not listen twice.",
    },
  },
  {
    id: 14,
    name: "Stacked-Hands Green",
    par: 4,
    tee: { x: -15, y: -8, z: 25, w: 7 },
    cup: { x: 315, y: -3, z: -50, w: 7 },
    hazards: ["echo-trap", "W-wind"],
    timelineId: "ashen",
    worldId: "folded-ossuary",
    flavor: {
      speaker: "President Angel Good",
      quote: "The Ashen fold is cold, so bring your own warmth. Sip slow, breathe steady, roll it true.",
    },
  },
  {
    id: 15,
    name: "Array Perimeter Breach",
    par: 5,
    tee: { x: 0, y: 0, z: 0, w: 7 },
    cup: { x: 540, y: 14, z: 100, w: 8 },
    hazards: ["gravity-fold", "array-obelisk"],
    timelineId: "ashen",
    worldId: "hades-array-core",
    flavor: {
      speaker: "Dr. Lucifer Hades",
      quote: "You breach MY perimeter with a stick and a ball? Charming. The obelisks will be grading your posture.",
    },
  },
  {
    id: 16,
    name: "Red-Eyes Fairway",
    par: 4,
    tee: { x: 20, y: 0, z: -15, w: 8 },
    cup: { x: 340, y: 9, z: 55, w: 8 },
    hazards: ["echo-trap", "array-obelisk"],
    timelineId: "ashen",
    worldId: "hades-array-core",
    flavor: {
      speaker: "Dr. Lucifer Hades",
      quote: "Every grave on MoonRock answered my Array with red eyes. Putt well, little ghost — you may join them.",
    },
  },
  {
    id: 17,
    name: "NecroGenesis Gate",
    par: 3,
    tee: { x: 0, y: 2, z: 0, w: 8 },
    cup: { x: 165, y: 16, z: -20, w: 9 },
    hazards: ["gravity-fold", "W-wind", "echo-trap"],
    timelineId: "ashen",
    worldId: "hades-array-core",
    flavor: {
      speaker: "Fold Cartographer Vex",
      quote: "One rewind left and the Gate eats echoes for breakfast! Spend it late, friend — spend it on THIS tee!",
    },
  },
  {
    id: 18,
    name: "Lucifer's Shadow Cup",
    par: 4,
    tee: { x: -25, y: 2, z: 30, w: 9 },
    cup: { x: 350, y: 18, z: -60, w: 9 },
    hazards: ["array-obelisk", "gravity-fold"],
    timelineId: "ashen",
    worldId: "hades-array-core",
    flavor: {
      speaker: "President Angel Good",
      quote: "Close the Array in this timeline and every echo goes quiet with it. One last cup, sailor. Bury him.",
    },
  },
];

export function holeById(id: number): Hole | null {
  return G4D_HOLES.find((h) => h.id === id) ?? null;
}

export function holesByWorld(worldId: G4DWorldId): readonly Hole[] {
  return G4D_HOLES.filter((h) => h.worldId === worldId);
}

export function holesByTimeline(timelineId: G4DTimelineId): readonly Hole[] {
  return G4D_HOLES.filter((h) => h.timelineId === timelineId);
}
