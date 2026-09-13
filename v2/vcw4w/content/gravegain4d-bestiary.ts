/**
 * GraveGain4D enemy bestiary (slug: gravegain4d ONLY).
 *
 * LOCATION NOTE: this lives in `content/` because `content/` owns per-game
 * data modules (see content/gravegain4d-lore.ts, content/gravegain4d-modes.ts,
 * content/gravegain4d-saga.ts) while `lib/` owns engine-agnostic utilities.
 *
 * THEME: enemies-as-family, same as the other GraveGains — the risen are
 * colonists, militia, rebels, and kin the Array refused to let rest, so every
 * entry names who they were before Hades folded them. GG3D bloodline
 * (risen skeletons, red-eye militia, orc rebels, necro acolytes,
 * Mother-Tree husks) fights beside 4D originals born of the breach itself
 * (fold-wraiths, echo husks, array obelisks, tesseract mimics,
 * parallel selves).
 *
 * Canon grounding: Dr. Lucifer Hades + the Hades Array, President Angel
 * Good, Echo of Elder Mirathiel, Warchief Groknak, Fold Cartographer Vex,
 * the Mother Tree, the LuckyStarShip hub, MoonRock, the Compact.
 *
 * Tier contract (mirrors content/gravegain4d-modes.ts): `kid` descriptions
 * are cozy with zero gore words, `teen` is gritty but clean (mild swears
 * only — damn/hell at most), `all` is profane 18+. `goreTier` records the
 * highest-intensity tier an enemy is written for: "kid" foes stay cozy at
 * every tier, "teen" foes turn gritty, "all" foes are full nightmare fuel.
 */

import type { ContentMode } from "@/lib/content-modes";

/** Enemy family. The first five are the GG3D bloodline; the last five are 4D originals. */
export type GG4DEnemyFamily =
  | "skeleton"
  | "militia"
  | "orc"
  | "necro"
  | "husk"
  | "wraith"
  | "echo"
  | "obelisk"
  | "mimic"
  | "parallel";

/** Highest-intensity tier an enemy is written for. */
export type GG4DGoreTier = ContentMode;

export interface GG4DEnemy {
  id: string;
  name: string;
  family: GG4DEnemyFamily;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  xp: number;
  /** Loot-table refs (ids resolved by the loot module). */
  lootTable: string[];
  behaviors: string[];
  goreTier: GG4DGoreTier;
  homeWorlds: string[];
  /** True when the enemy slips along the W-slice between folds. */
  foldPhasing: boolean;
  /** Per-tier copy. Kid is cozy, teen is gritty-clean, all is profane 18+. */
  description: Record<ContentMode, string>;
}

export const GG4D_BESTIARY_VERSION = "1.0.0";

export const GG4D_BESTIARY: readonly GG4DEnemy[] = [
  {
    id: "risen-skeleton-shambler",
    name: "Risen Skeleton Shambler",
    family: "skeleton",
    hp: 30,
    attack: 6,
    defense: 2,
    speed: 3,
    xp: 12,
    lootTable: ["bone-chips", "sparkleaf-tea"],
    behaviors: ["shamble", "swarm", "rattle-warning"],
    goreTier: "kid",
    homeWorlds: ["Colony LZ Sector Alpha", "Tomb of Clint Oldman"],
    foldPhasing: false,
    description: {
      kid: "A sleepy skeleton who lost its nap when the Array rang the dinner bell. It wobbles, it rattles, and it just wants a cozy tuck-in — tiptoe past or give it a gentle lantern-lit rest.",
      teen: "Colony burial detail, back on its feet with red eyes and a grudge. Slow, but it swarms — break the joints and keep your helmet sealed.",
      all: "Some poor colonist the Array wouldn't let stay buried, creaking back with red eyes. Fuck Hades for this one — put it down clean and move on.",
    },
  },
  {
    id: "red-eye-militia-rifleman",
    name: "Red-Eye Militia Rifleman",
    family: "militia",
    hp: 45,
    attack: 9,
    defense: 4,
    speed: 5,
    xp: 20,
    lootTable: ["red-eye-cell", "militia-scrap"],
    behaviors: ["volley-fire", "take-cover", "mark-target"],
    goreTier: "teen",
    homeWorlds: ["Colony LZ Sector Alpha", "Orbital Relay"],
    foldPhasing: false,
    description: {
      kid: "A once-friendly guard whose lantern-light turned red and who forgot the way home. It marches in neat lines and needs a firm, kindly escort back to bed.",
      teen: "Angel Good's own perimeter guard, risen with red eyes and parade-ground discipline. It still takes cover and fires volleys — damn shame. Outflank it and drop it fast.",
      all: "The president's own guard dogs, leashed by the Array and shooting at their own people. Shit duty, righteous anger — burn the leash-holder, mourn the dog.",
    },
  },
  {
    id: "orc-rebel-rager",
    name: "Orc Rebel Rager",
    family: "orc",
    hp: 70,
    attack: 12,
    defense: 5,
    speed: 6,
    xp: 30,
    lootTable: ["orc-trophy", "rage-ember"],
    behaviors: ["reckless-charge", "war-drum", "second-wind"],
    goreTier: "teen",
    homeWorlds: ["Orc Wastes", "Dwarven Vaults"],
    foldPhasing: false,
    description: {
      kid: "A big, loud orc pal of Groknak's who got grumbly after a timeline mix-up. It stomps and drums and shouts STOMP STOMP — answer with your best stomp team and a snack-rock break.",
      teen: "Groknak's own blood with wrong eyes, raging across the wrong timeline. Hits like a siege engine and gets up once — hell of a fight. Aim for the joints and give it room.",
      all: "An orc warrior the Array stole mid-war-cry and pointed at its own kin. Fuck sitting down indeed — meet its charge and send it home standing up.",
    },
  },
  {
    id: "necro-acolyte",
    name: "Necro Acolyte",
    family: "necro",
    hp: 40,
    attack: 11,
    defense: 3,
    speed: 4,
    xp: 26,
    lootTable: ["array-shard", "ward-thread"],
    behaviors: ["channel-anchor", "hex-bolt", "fold-step"],
    goreTier: "teen",
    homeWorlds: ["Alchemical Catacombs", "Citadel of the Array"],
    foldPhasing: true,
    description: {
      kid: "A fussy apprentice of the grumpy Array who carries a buzzy anchor-stick and hums off-key. Snatch the stick, hush the hum, and walk it gently back to the classroom.",
      teen: "A junior Array priest feeding the fallen-seer anchors one hex at a time. It folds a short step sideways when cornered — read the shimmer, cut the channel, drop the priest.",
      all: "Hades' choirboy with a hex for a hymn, pouring stolen breath into dead anchors. Damn the Array's whole clergy — break the anchor, then the acolyte.",
    },
  },
  {
    id: "mother-tree-husk",
    name: "Mother-Tree Husk",
    family: "husk",
    hp: 60,
    attack: 8,
    defense: 7,
    speed: 2,
    xp: 28,
    lootTable: ["world-root-sapling", "glowcap-spores"],
    behaviors: ["root-snare", "sap-lament", "anchor-guard"],
    goreTier: "teen",
    homeWorlds: ["Bioluminescent Forest Vaults"],
    foldPhasing: false,
    description: {
      kid: "A sad old root-friend of the Mother Tree wearing a crackly bark coat. Mirathiel hums to it when the wind is kind — hum along, untangle its roots, and let it settle for a long snooze.",
      teen: "An elven ancestor-vessel bled dry by the Array's anchors, still guarding the groves on reflex. It snares boots with living roots — burn the snare clean and mourn what it was.",
      all: "Twelve thousand years of ancestor-memory, spent by Hades in one night and left wearing bark. Fuck his cure — free the husk and salt the anchor that made it.",
    },
  },
  {
    id: "hades-array-herald",
    name: "Hades Array Herald",
    family: "necro",
    hp: 90,
    attack: 14,
    defense: 6,
    speed: 5,
    xp: 55,
    lootTable: ["array-shard", "herald-mask", "red-eye-cell"],
    behaviors: ["proclaim-doom", "mass-channel", "fold-step"],
    goreTier: "all",
    homeWorlds: ["Citadel of the Array", "Tomb of Clint Oldman"],
    foldPhasing: true,
    description: {
      kid: "The Array's loudest announcer, a floating mask with a very big trumpet-voice and very silly hat-tassels. It loves dramatic speeches — clap politely, then pop its echo-balloon and send it home.",
      teen: "Hades' mouthpiece in a cracked herald-mask, preaching the Array's gospel across the folds. Its mass-channel wakes every grave in earshot — silence the sermon before the choir stands.",
      all: "Lucifer's own throat with legs, selling eternity door to folded door. Shit sermon, shit god — smash the mask and mail Hades the pieces in every timeline.",
    },
  },
  {
    id: "fold-wraith",
    name: "Fold-Wraith",
    family: "wraith",
    hp: 55,
    attack: 13,
    defense: 3,
    speed: 9,
    xp: 40,
    lootTable: ["fold-ribbon", "echo-residue"],
    behaviors: ["w-slice-lurk", "phase-strike", "echo-feint"],
    goreTier: "all",
    homeWorlds: ["W-slice Fold", "Alchemical Catacombs"],
    foldPhasing: true,
    description: {
      kid: "A giggly ribbon-ghost who lives in the hallway-bend where Vex draws maps. It peeks from one timeline, waves from the next — wave back, share a cookie, and hop across holding the ribbon.",
      teen: "Something that lived between timelines before the breach tore the wall down. It lurks in the W-slice and strikes from your blind fold — watch your ghost echo, it shows the angle.",
      all: "A thing from between, wearing the shape of everyone it ever folded over. Hell is just a grave that won't stay shut — burn the echo, break the loop, don't blink.",
    },
  },
  {
    id: "echo-husk",
    name: "Echo Husk",
    family: "echo",
    hp: 50,
    attack: 10,
    defense: 4,
    speed: 7,
    xp: 34,
    lootTable: ["echo-residue", "sparkleaf-tea"],
    behaviors: ["mirror-move", "residue-burst", "rewind-bait"],
    goreTier: "teen",
    homeWorlds: ["W-slice Fold", "Colony LZ Sector Alpha"],
    foldPhasing: true,
    description: {
      kid: "Yesterday-you, left behind like a mitten, still copying your waves a breath late. It means no harm — it only wants a playmate. Finish its game of follow-the-leader, then tuck it in.",
      teen: "Your own ghost echo with the safeties off — every move you make, it made a breath earlier, and now it hits back. Read it before you commit; the fold punishes the careless.",
      all: "You, one rewind late, with nothing left to lose and your whole kit. Fuck fighting yourself — spend the rewind late, strike first, and don't you dare miss.",
    },
  },
  {
    id: "array-obelisk",
    name: "Array Obelisk",
    family: "obelisk",
    hp: 120,
    attack: 7,
    defense: 10,
    speed: 1,
    xp: 48,
    lootTable: ["array-shard", "obelisk-core"],
    behaviors: ["anchor-pulse", "raise-minions", "fold-lock"],
    goreTier: "teen",
    homeWorlds: ["Citadel of the Array", "Bioluminescent Forest Vaults", "Orbital Relay"],
    foldPhasing: false,
    description: {
      kid: "A very stubborn stone building-block of the Array that hums too loud and bosses the sleepy bones around. It cannot walk a single step — unplug its buzzy corners and quiet it like a loud music box.",
      teen: "A fallen-seer anchor stone grown into a fortress node — slow, dumb, and damn near unkillable head-on. It pulses the raise-signal on a timer; break the pulse-corners between beats.",
      all: "Hades' survey stake hammered through two timelines at once, shitting red light over everything it claims. Topple the bastard stone and salt the socket.",
    },
  },
  {
    id: "tesseract-mimic",
    name: "Tesseract Mimic",
    family: "mimic",
    hp: 65,
    attack: 12,
    defense: 5,
    speed: 8,
    xp: 44,
    lootTable: ["mimic-prism", "fold-ribbon"],
    behaviors: ["chest-lure", "cube-fold", "prize-swap"],
    goreTier: "teen",
    homeWorlds: ["Dwarven Vaults", "W-slice Fold"],
    foldPhasing: true,
    description: {
      kid: "A cheeky puzzle-box who pretends to be a treasure chest because it loves surprises. Knock twice, say please, and it pops open with jelly-star stickers instead of tricks — mostly.",
      teen: "A four-dimensional trap wearing a treasure chest like a cheap costume. It folds its cube-insides around the greedy — tap the lid with a pole first, like Sable taught you.",
      all: "Greed with eight corners and teeth on the inside, fishing for delvers with a shiny lure. Damn the sweet shine — pole the lid, spike the hinge, take the prism.",
    },
  },
  {
    id: "parallel-self",
    name: "Parallel Self",
    family: "parallel",
    hp: 100,
    attack: 15,
    defense: 8,
    speed: 7,
    xp: 80,
    lootTable: ["parallel-keepsake", "echo-residue", "fold-ribbon"],
    behaviors: ["perfect-copy", "rewind-theft", "fold-duel"],
    goreTier: "all",
    homeWorlds: ["W-slice Fold", "Citadel of the Array"],
    foldPhasing: true,
    description: {
      kid: "Another-you from the next timeline over, wearing your favorite socks and your bravest face. It challenges you to a friendly contest — best hoop-shot, kindest wave, silliest dance. Winner shares cookies with the loser.",
      teen: "You, if you'd taken the Array's deal — same hands, same scars, red eyes. It fights with your whole kit and steals your rewind if you spend it early. One rewind, spent late, decides it.",
      all: "You, perfected by Hades: every mistake edited out, every mercy folded away, and your whole kit turned on you. Fuck meeting yourself — break the loop, burn the echo, walk out the only you left.",
    },
  },
  {
    id: "fold-stalker",
    name: "Fold Stalker",
    family: "wraith",
    hp: 75,
    attack: 14,
    defense: 4,
    speed: 10,
    xp: 52,
    lootTable: ["fold-ribbon", "stalker-claw"],
    behaviors: ["scent-echo", "pack-harrier", "w-slice-lurk"],
    goreTier: "all",
    homeWorlds: ["W-slice Fold", "Orc Wastes"],
    foldPhasing: true,
    description: {
      kid: "A shy peek-a-boo pup made of hallway-bends who follows brave walkers hoping for a game. It barks in two timelines at once — throw one stick, then another, and it will nap happy in both.",
      teen: "A pack-hunter that scents your echo, not your body — it harries the trail a breath behind you. Never run blind down a fold; stop, turn, and meet it facing forward.",
      all: "Hunger with footprints in two timelines, herding you toward your own echo's grave. Shit odds, good odds — face it, spike it, and piss on the fold it came through.",
    },
  },
];

export function enemyById(id: string): GG4DEnemy | null {
  return GG4D_BESTIARY.find((enemy) => enemy.id === id) ?? null;
}

export function enemiesByWorld(world: string): GG4DEnemy[] {
  return GG4D_BESTIARY.filter((enemy) => enemy.homeWorlds.includes(world));
}

export function enemiesByFamily(family: GG4DEnemyFamily): GG4DEnemy[] {
  return GG4D_BESTIARY.filter((enemy) => enemy.family === family);
}
