// GraveGain4D saga catalog data (v2 layer, slug: gravegain4d ONLY).
//
// Mirrors content/gravegain-epic-saga.ts (the catalog shape: mission ids
// 1..10, titlecards, loreUnlocks, loglines) for server-side consumers
// (docs, PlayGate copy, future guides). The 4D twist: every saga trial is
// a golf trial across timelines — one cup, eighteen timelines, putt past
// the Fold and bury Hades in every timeline. Canon cast: President Angel
// Good (LuckyStarShip hub), Echo of Elder Mirathiel, Warchief Groknak,
// Fold Cartographer Vex, Dr. Lucifer Hades + the Array. Canon ground:
// MoonRock, the Compact, the LuckyStarShip hub.
//
// LOCATION: content/ owns per-game data (see gravegain-epic-saga.ts,
// gravegain4d-lore.ts, gravegain4d-modes.ts). No runtime deps.

export const GG4D_SAGA_VERSION = "1.0.0";

export type GG4DSagaPhase = "intro" | "outro";

export interface GG4DSagaMission {
  id: number;
  title: string;
  subtitle: string;
  location: string;
  boss: string;
  logline: string;
  loreUnlocks: string[];
  questGiver: string;
  golfTrial: string;
  loreBeat: string;
  objectives: string[];
  rewards: string[];
  hole: number;
  par: number;
}

/** Rising arc: crash -> groves -> vaults -> wastes -> relay -> catacombs -> tomb -> observatory -> gate -> Hades. Every stop is a golf trial across folds. */
export const GG4D_SAGA: readonly GG4DSagaMission[] = [
  {
    id: 1,
    title: "Mission 1 — LZ Crash Site Defense",
    subtitle: "Opening Drive on MoonRock",
    location: "Colony LZ Sector Alpha",
    boss: "Goblin Zed Leader",
    logline: "Tee off over James Wright's first grave and putt the LZ's risen burial detail back to rest.",
    loreUnlocks: ["world_first_grave", "necro_survivor", "human_orientation"],
    questGiver: "President Angel Good",
    golfTrial: "Hole 1 — tee off from the LuckyStarShip ramp, one cup across 3 folds, rewind budget: 1.",
    loreBeat:
      "President Angel Good tees your ball beside James Wright's stone where the descent ramp meets the MoonRock dust. " +
      "The Compact demands every timeline's dead get one rest; the Array answers with red eyes in all three folds.",
    objectives: [
      "Drive past the Fold shear without losing your ball to the skull swarms.",
      "Sink the burial-detail putt on or under par across all 3 folds.",
      "Re-turf James Wright's grave marker before the Goblin Zed Leader rallies the pile.",
    ],
    rewards: ["LuckyStarShip brass putter", "Burial-honor glove (+1 rewind refund on Hole 1)", "lore: world_first_grave"],
    hole: 1,
    par: 3,
  },
  {
    id: 2,
    title: "Mission 2 — Cleansing the Elven Groves",
    subtitle: "Putt Past the Fold",
    location: "Bioluminescent Forest Vaults",
    boss: "Elven Necromancer",
    logline: "Thread your approach through the bleeding Mother Tree roots and earn Aelindra's trust, one timeline at a time.",
    loreUnlocks: ["elven_chronicle", "elven_matriarch_grave", "necro_red_eyes"],
    questGiver: "Echo of Elder Mirathiel",
    golfTrial: "Hole 2 — dogleg around the fallen-seer anchors, ghost echo shows your parallel self's line.",
    loreBeat:
      "The Echo of Elder Mirathiel walks the folded roots and hums your line to you. The Mother Tree marks every " +
      "defender's steps, past and future both — break the anchors and the groves remember your name in every fold.",
    objectives: [
      "Read your ghost echo, then land the approach inside the root ring.",
      "Break 3 fallen-seer anchors guarding the green.",
      "One-putt the Matriarch's cup to seal the grove fold.",
    ],
    rewards: ["Mother-Tree laminate wedge", "Glowcap ball marker (echo line visible +1s)", "lore: elven_chronicle"],
    hole: 2,
    par: 4,
  },
  {
    id: 3,
    title: "Mission 3 — Deep In The Dwarven Vaults",
    subtitle: "Sparkite Fairway in Four Timelines",
    location: "Central Highlands Deep Mines",
    boss: "Dwarven Zed High Thane",
    logline: "Drive the sparkite fairway, recover the Golem Hammer, and starve the Array of fuel.",
    loreUnlocks: ["dwarf_deep_forge", "dwarf_paladin_oath", "dwarf_brewery_report"],
    questGiver: "Fold Cartographer Vex",
    golfTrial: "Hole 3 — split fairway across 4 W-slice folds, cartographer's ribbon marks the true cup.",
    loreBeat:
      "Fold Cartographer Vex charts the vault folds in chalk: the Deep Forge feeds the Array's furnaces, and every " +
      "timeline's forge must go dark. Your echo swings a breath ahead — follow the ribbon, not the whispering cracks.",
    objectives: [
      "Pick the true fairway fold from Vex's ribbon marks (3 decoys, 1 true).",
      "Recover the Golem Hammer from the overrun sparkite forges.",
      "Sink the forge-cup putt to flood the Array fuel lines with slag.",
    ],
    rewards: ["Golem Hammer driver", "Sparkite-tipped balls (burn bone piles on impact)", "lore: dwarf_deep_forge"],
    hole: 3,
    par: 4,
  },
  {
    id: 4,
    title: "Mission 4 — Orc Nomad Outpost Siege",
    subtitle: "Rage of the Back Nine",
    location: "Crimson Sand Redoubts",
    boss: "Huge Orc Zed Berserker",
    logline: "Hold Groknak's gate against his own risen blood and prove humans hit like orcs — with a driver.",
    loreUnlocks: ["orc_regeneration", "orc_rage_book", "goblin_brave_nix"],
    questGiver: "Warchief Groknak",
    golfTrial: "Hole 4 — longest par on the card, siege green ringed by thirty skull bunkers.",
    loreBeat:
      "Warchief Groknak plants his Rage Axe as your tee marker: his own blood rose with red eyes, and the Compact " +
      "says kin-blood gets buried by kin-hands. You swing; he screams. Every timeline's gate holds or none do.",
    objectives: [
      "Carry the drive over the skull-bunker ring in every active fold.",
      "Shatter the Berserker's regeneration anchors before the approach.",
      "Two-putt or better while Groknak's war-party holds the gate.",
    ],
    rewards: ["Groknak's Rage Axe 3-wood (harder when hurt)", "Orc-stomp cleats (no slip on crimson sand)", "lore: orc_rage_book"],
    hole: 4,
    par: 5,
  },
  {
    id: 5,
    title: "Mission 5 — Signal in the Shallows",
    subtitle: "Valley Net Chip Across the Static",
    location: "Sub-surface Comms Relay 09",
    boss: "Corrupted Drone Array",
    logline: "Chip through the skull-scramble static, re-align Relay 09, and blind Hades' jamming across folds.",
    loreUnlocks: ["human_arty_fisher", "necro_broadcast", "world_farstar"],
    questGiver: "Fold Cartographer Vex",
    golfTrial: "Hole 5 — island green on Relay 09, W-slice drift moves the cup between timelines.",
    loreBeat:
      "Vex reads the drifting W-slice while Hades floods every channel with Array whispers. Re-align the relay and " +
      "the static clears in this timeline and the next — miss, and his sanctum vector stays buried in noise.",
    objectives: [
      "Track the drifting cup across folds with Vex's echo callouts.",
      "Land the Relay 09 island green through drone-swarm interference.",
      "Decode 3 Array-whisper fragments off the flagstick broadcast.",
    ],
    rewards: ["Relay-09 pulser putter (chains static off the ball)", "Farstar rangefinder (cup drift preview)", "lore: necro_broadcast"],
    hole: 5,
    par: 4,
  },
  {
    id: 6,
    title: "Mission 6 — The Alchemical Catacombs",
    subtitle: "President Good's Poisoned Rough",
    location: "Botany Core Sub-levels",
    boss: "Toxic Chem-Golem",
    logline: "Play it out of Good's poisoned botany vats and kill the Chem-Golem choking the colony's lungs.",
    loreUnlocks: ["human_angel_good", "necro_understanding", "dwarf_mana_potions"],
    questGiver: "President Angel Good",
    golfTrial: "Hole 6 — toxic rough eats balls, fumigator drop is a free relief per fold.",
    loreBeat:
      "President Angel Good walks you down to the LuckyStarShip botany deck she built — lantern plants, poisoned vats, " +
      "rifle requisitions side by side. Her legacy turned toxic under the Array; she hands you the fumigator and the tee.",
    objectives: [
      "Take fumigator relief from the toxic rough without losing a stroke.",
      "Melt the Chem-Golem's armor with the Dreamcap Fumigator approach.",
      "Hole out from the botany-deck fringe to purge the vats in every fold.",
    ],
    rewards: ["Dreamcap Fumigator wedge", "Lantern-plant ball (toxic-rough immune)", "lore: human_angel_good"],
    hole: 6,
    par: 3,
  },
  {
    id: 7,
    title: "Mission 7 — The Tomb of Clint Oldman",
    subtitle: "Guy Young's Paradox Putt",
    location: "Colonial Crypt of Honor",
    boss: "Reanimated Patriarch Clint",
    logline: "Grant Clint Oldman — the man time broke — his second, final rest, with one cup across 18 timelines.",
    loreUnlocks: ["human_clint_oldman", "human_guy_young", "necro_gravestone"],
    questGiver: "Echo of Elder Mirathiel",
    golfTrial: "Hole 7 — crypt cup ringed by paradox echoes, your parallel selves putt alongside you.",
    loreBeat:
      "Mirathiel's echo kneels at the Colonial Crypt of Honor: Clint Oldman died twice and the Array filed both. " +
      "The Compact's oldest clause covers men time broke — one clean putt, and all eighteen timelines lay him down together.",
    objectives: [
      "Putt alongside 18 parallel echoes without breaking the honor silence.",
      "Lay Reanimated Patriarch Clint down before Guy Young's paradox resets the green.",
      "Mark the gravestone ball-marker in every timeline.",
    ],
    rewards: ["Crypt-honor brass iron", "Paradox-tolerant ball (echo putts don't collide)", "lore: human_clint_oldman"],
    hole: 7,
    par: 4,
  },
  {
    id: 8,
    title: "Mission 8 — Orbital Strike Calibration",
    subtitle: "The MERCENARY Long Drive",
    location: "Highland Peak Observatory",
    boss: "Bone Goliath Warlord",
    logline: "Paint the target from the Highland Peak so the kinetic strike shatters Hades' perimeter — longest drive wins.",
    loreUnlocks: ["human_mercenary_doctrine", "world_giantess_song", "human_captains_log"],
    questGiver: "Warchief Groknak",
    golfTrial: "Hole 8 — observatory tee box above the clouds, strike beacon is the pin.",
    loreBeat:
      "Groknak carries your bag up the Highland Peak and dares the Bone Goliath Warlord to catch the ball. The " +
      "MERCENARY doctrine is simple: one painted target, one kinetic strike, one shattered perimeter per timeline.",
    objectives: [
      "Outdrive the Warlord's bone-shard counter-shot off the observatory tee.",
      "Paint the strike beacon pin from the fairway in 2 or fewer.",
      "Hold the green while the kinetic strike clears Hades' perimeter folds.",
    ],
    rewards: ["MERCENARY doctrine driver (observatory-range carry)", "Strike-beacon tee set (approach glows on line)", "lore: human_mercenary_doctrine"],
    hole: 8,
    par: 5,
  },
  {
    id: 9,
    title: "Mission 9 — Gate of the NecroGenesis",
    subtitle: "The Breach-Round Semifinal",
    location: "The Citadel Perimeter",
    boss: "Necro-Array Titan",
    logline: "Breach the Citadel with all four races and drop the Titan guarding Hades' door — semifinal cup.",
    loreUnlocks: ["necro_report", "human_treaty", "elven_druid_lament"],
    questGiver: "Fold Cartographer Vex",
    golfTrial: "Hole 9 — Citadel-perimeter stadium hole, all four races in the gallery across every fold.",
    loreBeat:
      "Vex folds the gallery together: human, elf, dwarf, and orc witnesses in one stadium timeline, the Compact " +
      "re-signed on a scorecard. Past the Titan, past the perimeter — Hades waits behind the final cup.",
    objectives: [
      "Parade all four races onto the tee box in Compact order.",
      "Drop the Necro-Array Titan with a Titan-splitting stinger down the middle.",
      "Take the semifinal cup to open the Citadel door in every fold.",
    ],
    rewards: ["Compact scorecard (all-races gallery buff)", "Titan-splitting stinger iron", "lore: human_treaty"],
    hole: 9,
    par: 5,
  },
  {
    id: 10,
    title: "Mission 10 — Lucifer's Shadow",
    subtitle: "Bury Hades in Every Timeline",
    location: "Lucifer Hades' Sanctum Core",
    boss: "Dr. Lucifer Hades (Consciousness Overlord)",
    logline: "Kill the Consciousness Overlord, deactivate the Array, and sink the final putt that seals the Compact into a living peace.",
    loreUnlocks: ["lucifer_manifesto", "lucifer_journal_47", "human_earth_letter"],
    questGiver: "Dr. Lucifer Hades (via the Array)",
    golfTrial: "Hole 10 — championship cup in the Sanctum Core, one ball, every timeline, no rewinds left.",
    loreBeat:
      "Hades himself issues the tee time over the Array: cheat death, he says, and the folds are yours. Sink this " +
      "putt and the Array goes quiet — every echo, every timeline, every grave on MoonRock finally rests under the Compact.",
    objectives: [
      "Answer Hades' taunt: drive the Sanctum Core fairway with no rewinds remaining.",
      "Deactivate the Array's cup-guardian consciousness loops.",
      "Sink the championship putt to bury Hades in every timeline.",
    ],
    rewards: ["Consciousness Overlord's broken tee (trophy)", "Compact champion's jacket (LuckyStarShip gold)", "lore: lucifer_manifesto"],
    hole: 10,
    par: 5,
  },
];

export function getGG4DSagaMission(id: number): GG4DSagaMission | null {
  return GG4D_SAGA.find((m) => m.id === id) ?? null;
}

/** V2 runtime overlay files backing the 4D saga (served at /games/html/*). */
export const GG4D_SAGA_RUNTIME_FILES = [
  "gravegain4d-saga.js",
  "gravegain4d-cutscenes.js",
  "gravegain4d-graphics-plus.js",
  "gravegain4d-workers.js",
] as const;

/** Shared pool backing EVERY game (served at /games/html/fourweird-workers.js). */
export const FOURWEIRD_WORKERS_RUNTIME_FILE = "fourweird-workers.js";
