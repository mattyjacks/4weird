/**
 * GraveGain5D content-mode copy (slug: gravegain5d ONLY).
 *
 * Same tier contract as GG4D (kid = cozy, teen = gritty but clean,
 * all = profane, 18+). 5D flavor = multiverse transcendence: universe hops,
 * paradox venting, chain-hop combos, collapsing universes, parallel selves.
 * Canon speakers mirror GG4D plus one 5D guide original to this module:
 * Transcendence Cartographer Null, who reads the universe lattice.
 */

import type { ContentMode } from "@/lib/content-modes";

export type GG5DContentMode = ContentMode;

export const GG5D_CONTENT_MODES: readonly GG5DContentMode[] = ["kid", "teen", "all"];

export type GG5DNpcId =
  | "hub-keeper"
  | "dungeon-ghost"
  | "orc-ally"
  | "ember-cartographer"
  | "ossuary-twins"
  | "fold-guide"
  | "transcendence-guide";

export const GG5D_NPCS: Record<GG5DNpcId, { speaker: string; portrait: string }> = {
  "hub-keeper": { speaker: "President Angel Good", portrait: "🌿" },
  "dungeon-ghost": { speaker: "Echo of Elder Mirathiel", portrait: "👻" },
  "orc-ally": { speaker: "Warchief Groknak", portrait: "👹" },
  "ember-cartographer": { speaker: "Ember Cartographer Sable", portrait: "🗺️" },
  "ossuary-twins": { speaker: "Ossuary Twins, Pell & Marrow", portrait: "💀" },
  "fold-guide": { speaker: "Fold Cartographer Vex", portrait: "🌀" },
  "transcendence-guide": { speaker: "Transcendence Cartographer Null", portrait: "🌌" },
};

/** Bark variants per NPC per content mode. `all` is the only profane tier. */
export const GG5D_DIALOGUE: Record<GG5DNpcId, Record<GG5DContentMode, string[]>> = {
  "hub-keeper": {
    kid: [
      "Welcome back, little star-sailor! Six universes bloomed while you napped — want to hop somewhere cozy first?",
    ],
    teen: [
      "Hub's holding across five universes and losing the sixth. Watch the paradox meter before you chain-hop.",
    ],
    all: ["PROFANE TIER PLACEHOLDER — 18+ only."],
  },
  "dungeon-ghost": {
    kid: ["Every universe has an echo of you. They all wave back."],
    teen: ["Your echoes remember the hops you regret. Listen before you jump."],
    all: ["PROFANE TIER PLACEHOLDER — 18+ only."],
  },
  "orc-ally": {
    kid: ["Groknak holds the door in EVERY universe. That is a lot of doors."],
    teen: ["I have died in three universes so you do not have to. Hop smart."],
    all: ["PROFANE TIER PLACEHOLDER — 18+ only."],
  },
  "ember-cartographer": {
    kid: ["I drew you a map of all six skies. The Void one is extra scribbly."],
    teen: ["Static eats compasses. Memorize the lattice or drift forever."],
    all: ["PROFANE TIER PLACEHOLDER — 18+ only."],
  },
  "ossuary-twins": {
    kid: ["Pell counts the universes. Marrow counts the snacks. Both get to six!"],
    teen: ["Six graves, six names, six chances. Paradox takes the spares."],
    all: ["PROFANE TIER PLACEHOLDER — 18+ only."],
  },
  "fold-guide": {
    kid: ["Folds are just doors that forgot to be doors!"],
    teen: ["The W-slice is a hallway. 5D is the whole hotel. Mind the collapse."],
    all: ["PROFANE TIER PLACEHOLDER — 18+ only."],
  },
  "transcendence-guide": {
    kid: ["I am Null! I read the lattice so you can bounce between bedtimes!"],
    teen: [
      "Chain two hops and the lattice pays you back. Chain five and it collects. Vent before Void.",
      "Bloom forgives. Static does not. Void never forgets. Choose like it matters — it does.",
    ],
    all: ["PROFANE TIER PLACEHOLDER — 18+ only."],
  },
};

export const GG5D_UNIVERSES = ["prime", "echo", "dream", "void", "bloom", "static"] as const;
export type GG5DUniverseId = (typeof GG5D_UNIVERSES)[number];
