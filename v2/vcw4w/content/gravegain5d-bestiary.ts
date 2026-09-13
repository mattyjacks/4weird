/**
 * GraveGain5D enemy bestiary (slug: gravegain5d ONLY).
 *
 * LOCATION NOTE: this lives in `content/` because `content/` owns per-game
 * data modules (see content/gravegain5d-lore.ts, content/gravegain5d-modes.ts,
 * content/gravegain5d-saga.ts) while `lib/` owns engine-agnostic utilities.
 *
 * THEME: enemies-as-family, same as the other GraveGains — the risen are
 * colonists, militia, rebels, and kin the Array refused to let rest, now
 * scattered across six parallel Arroyos. GG3D bloodline (risen skeletons,
 * red-eye militia, orc rebels, necro units) fights beside 5D originals born
 * of the lattice itself (paradox wraiths, echo husks, void maws, static
 * ghouls, bloom sprites). Flavor only — bodies live in
 * content/gravegain5d-lore.ts and are never duplicated here.
 *
 * Canon grounding: President Angel Good, Echo of Elder Mirathiel, Warchief
 * Groknak, Dr. Lucifer Hades + the Hades Array, Transcendence Cartographer
 * Null, the Sixfold Lattice (Prime, Echo, Dream, Void, Bloom, Static).
 *
 * Tier contract (mirrors content/gravegain5d-modes.ts): `kid` descriptions
 * are cozy with zero gore words, `teen` is gritty but clean (mild swears
 * only — damn/hell at most), `all` is profane 18+. `goreTier` records the
 * highest-intensity tier an enemy is written for: "kid" foes stay cozy at
 * every tier, "teen" foes turn gritty, "all" foes are full nightmare fuel.
 */

import type { ContentMode } from "@/lib/content-modes";
import type { GG5DUniverseId } from "./gravegain5d-modes";

/** Enemy family. The first four are the GG3D bloodline; the last five are 5D originals. */
export type GG5DEnemyFamily =
  | "skeleton"
  | "militia"
  | "orc"
  | "necro"
  | "paradox"
  | "echo"
  | "void"
  | "static"
  | "bloom";

/** Highest-intensity tier an enemy is written for. */
export type GG5DGoreTier = ContentMode;

export interface GG5DEnemy {
  id: string;
  name: string;
  family: GG5DEnemyFamily;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  xp: number;
  /** Loot-table refs (ids resolved by the loot module). */
  lootTable: string[];
  behaviors: string[];
  goreTier: GG5DGoreTier;
  homeUniverses: GG5DUniverseId[];
  /** True when the enemy hops between universes mid-fight. */
  hopPhasing: boolean;
  /** Per-tier copy. Kid is cozy, teen is gritty-clean, all is profane 18+. */
  description: Record<ContentMode, string>;
}

export const GG5D_BESTIARY_VERSION = "1.0.0";

export const GG5D_BESTIARY: readonly GG5DEnemy[] = [
  {
    id: "risen-skeleton-wayfinder",
    name: "Risen Skeleton Wayfinder",
    family: "skeleton",
    hp: 32,
    attack: 6,
    defense: 2,
    speed: 4,
    xp: 13,
    lootTable: ["bone-chips", "lattice-crumbs"],
    behaviors: ["shamble", "swarm", "hop-trail"],
    goreTier: "kid",
    homeUniverses: ["prime", "echo"],
    hopPhasing: false,
    description: {
      kid: "A sleepy skeleton caddie who took a wrong hop and lost its foursome. It rattles its lantern, waves with both arms, and only wants an escort back to the Prime tee box.",
      teen: "Colony burial detail, back on its feet and trailing your hops one universe late. Slow, but it swarms the landing zone — break the joints before it finds its swing.",
      all: "Some poor colonist the Array wouldn't let stay buried, now commuting between graves that aren't theirs. Fuck Hades for the mileage — put it down clean and move on.",
    },
  },
  {
    id: "red-eye-militia-lancer",
    name: "Red-Eye Militia Lancer",
    family: "militia",
    hp: 48,
    attack: 9,
    defense: 4,
    speed: 5,
    xp: 22,
    lootTable: ["red-eye-cell", "militia-scrap"],
    behaviors: ["volley-fire", "take-cover", "anchor-guard"],
    goreTier: "teen",
    homeUniverses: ["prime", "static"],
    hopPhasing: false,
    description: {
      kid: "A once-friendly guard of Angel Good's whose lantern-light turned red and staticky. It marches in neat lines and needs a firm, kindly escort back to bed.",
      teen: "Angel Good's own perimeter guard, risen with red eyes and parade-ground discipline. It still takes cover and fires volleys — damn shame. Outflank it and drop it fast.",
      all: "The president's own guard dogs, leashed by the Array across two universes at once. Shit duty, righteous anger — burn the leash-holder, mourn the dog.",
    },
  },
  {
    id: "orc-rebel-drifter",
    name: "Orc Rebel Drifter",
    family: "orc",
    hp: 74,
    attack: 12,
    defense: 5,
    speed: 6,
    xp: 32,
    lootTable: ["orc-trophy", "rage-ember"],
    behaviors: ["reckless-charge", "war-drum", "second-wind"],
    goreTier: "teen",
    homeUniverses: ["prime", "bloom"],
    hopPhasing: false,
    description: {
      kid: "A big, loud orc pal of Groknak's who hopped to Bloom for the snacks and got grumbly when the map folded. Answer its STOMP STOMP with your best stomp team and a snack-rock break.",
      teen: "Groknak's own blood with wrong eyes, raging across the wrong universe. Hits like a siege engine and gets up once — hell of a fight. Aim for the joints and give it room.",
      all: "An orc warrior the Array stole mid-war-cry and pointed at its own kin in a universe it never swore to. Fuck sitting down indeed — meet its charge and send it home standing up.",
    },
  },
  {
    id: "necro-array-chanter",
    name: "Necro Array Chanter",
    family: "necro",
    hp: 42,
    attack: 11,
    defense: 3,
    speed: 4,
    xp: 28,
    lootTable: ["array-shard", "ward-thread"],
    behaviors: ["channel-anchor", "hex-bolt", "hop-step"],
    goreTier: "teen",
    homeUniverses: ["void", "static"],
    hopPhasing: true,
    description: {
      kid: "A fussy singer for the grumpy Array who hums off-key into a buzzy anchor-microphone. Hush the hum, unplug the mic, and walk it gently back to choir practice.",
      teen: "A junior Array priest feeding the spare-vaults one hex at a time. It hops a short step sideways when cornered — read the shimmer, cut the channel, drop the priest.",
      all: "Hades' choirboy with a hex for a hymn, pouring stolen breath into collapsed universes he filed as spares. Damn the Array's whole clergy — break the anchor, then the chanter.",
    },
  },
  {
    id: "paradox-wraith",
    name: "Paradox Wraith",
    family: "paradox",
    hp: 58,
    attack: 13,
    defense: 3,
    speed: 9,
    xp: 42,
    lootTable: ["paradox-knot", "echo-residue"],
    behaviors: ["rent-lurk", "interest-strike", "hop-feint"],
    goreTier: "all",
    homeUniverses: ["void", "echo"],
    hopPhasing: true,
    description: {
      kid: "A giggly ribbon-ghost made of borrowed bedtimes who lives where Null draws maps. It borrowed one hop too many and now jingles when it moves — wave back, share a cookie, and hop home holding the ribbon.",
      teen: "Paradox rent with teeth — every double-hop you skip venting feeds it. It lurks in the interest and strikes from your blind universe — watch your ghost echo, it shows the angle.",
      all: "Compound interest on borrowed mass, wearing the shape of everyone who skipped the vent. Hell is just a bill that won't stop growing — vent early, strike first, don't blink.",
    },
  },
  {
    id: "echo-husk-straggler",
    name: "Echo Husk Straggler",
    family: "echo",
    hp: 52,
    attack: 10,
    defense: 4,
    speed: 7,
    xp: 36,
    lootTable: ["echo-residue", "sparkleaf-tea"],
    behaviors: ["mirror-move", "residue-burst", "rewind-bait"],
    goreTier: "teen",
    homeUniverses: ["echo", "dream"],
    hopPhasing: true,
    description: {
      kid: "Yesterday-you, left behind like a mitten, still copying your waves a breath late. Mirathiel says every universe keeps one — finish its game of follow-the-leader, then tuck it in.",
      teen: "Your own ghost echo with the safeties off — every move you make, it made a breath earlier, and now it hits back. Read it before you commit; the lattice punishes the careless.",
      all: "You, one hop late, with nothing left to lose and your whole kit. Fuck fighting yourself — spend the vent late, strike first, and don't you dare miss.",
    },
  },
  {
    id: "void-maw",
    name: "Void Maw",
    family: "void",
    hp: 110,
    attack: 15,
    defense: 7,
    speed: 3,
    xp: 60,
    lootTable: ["void-gullet", "array-shard"],
    behaviors: ["collapse-pulse", "swallow-echo", "anchor-drag"],
    goreTier: "all",
    homeUniverses: ["void"],
    hopPhasing: false,
    description: {
      kid: "A very hungry, very round tummy-friend who lives in the Void universe and grumbles louder than Groknak's stomach. It cannot chase you one step — feed it a paradox cookie from far away and tiptoe past.",
      teen: "The Void's hunger given a mouth — slow, patient, and damn near unkillable head-on. It drags anchors and echoes down its gullet on a timer; break the drag-tethers between pulses.",
      all: "A collapsed universe's appetite, still chewing. It ate its own Array and stayed hungry — keep your distance, spike the tethers, and never let it learn your name.",
    },
  },
  {
    id: "static-ghoul",
    name: "Static Ghoul",
    family: "static",
    hp: 66,
    attack: 12,
    defense: 5,
    speed: 8,
    xp: 46,
    lootTable: ["static-burr", "red-eye-cell"],
    behaviors: ["noise-lurk", "feedback-shriek", "compass-scramble"],
    goreTier: "all",
    homeUniverses: ["static"],
    hopPhasing: true,
    description: {
      kid: "A crackly radio-ghost who swallowed a whole thunderstorm of pocket-static. It shrieks FEEDBACK when startled — cover your ears, sing it a soft Null lullaby, and it naps.",
      teen: "Noise made teeth — it scrambles compasses and shrieks feedback that freezes your hands. Never chase it through white noise; stop, ground yourself, and meet it facing forward.",
      all: "Static's whole scream in a skin of broken antennas, eating signals and shitting red noise. Damn the interference — ground it, spike it, and salt the socket it crawled out of.",
    },
  },
  {
    id: "bloom-sprite-feral",
    name: "Feral Bloom Sprite",
    family: "bloom",
    hp: 36,
    attack: 10,
    defense: 2,
    speed: 10,
    xp: 30,
    lootTable: ["bloom-petal", "glowcap-spores"],
    behaviors: ["petal-swarm", "laughter-lure", "thorn-swap"],
    goreTier: "kid",
    homeUniverses: ["bloom", "dream"],
    hopPhasing: true,
    description: {
      kid: "A giggly flower-friend of Bloom who laughs like wind chimes and throws petal confetti. It lures you with giggles toward the prettiest garden — follow for the picnic, leave before the tickle-thorns wake.",
      teen: "Bloom's laughter with thorns underneath — it lures you in giggling, then swaps petals for barbs. Cute until it isn't. Keep your gloves up and don't follow the laughter past the garden line.",
      all: "A garden that learned to hunt, laughing the whole time. Damn the pretty petals — burn the thorn-bed and walk out before the laughter learns your voice.",
    },
  },
  {
    id: "hades-spare-herald",
    name: "Hades Spare Herald",
    family: "necro",
    hp: 130,
    attack: 16,
    defense: 8,
    speed: 4,
    xp: 95,
    lootTable: ["array-shard", "herald-mask", "spare-vault-key"],
    behaviors: ["proclaim-collapse", "mass-channel", "hop-step"],
    goreTier: "all",
    homeUniverses: ["void", "static"],
    hopPhasing: true,
    description: {
      kid: "The Array's loudest announcer, a floating mask with a very big trumpet-voice who files spare universes into boxes. It loves dramatic speeches — clap politely, then pop its echo-balloon and send it home.",
      teen: "Hades' mouthpiece in a cracked herald-mask, preaching the spare-vault gospel across hot universes. Its mass-channel wakes every grave in earshot — silence the sermon before the choir stands.",
      all: "Lucifer's own throat with legs, collecting collapsed universes like debts and selling eternity door to folded door. Shit sermon, shit god — smash the mask and mail Hades the pieces in every universe.",
    },
  },
  {
    id: "lattice-tick",
    name: "Lattice Tick",
    family: "paradox",
    hp: 24,
    attack: 7,
    defense: 1,
    speed: 8,
    xp: 18,
    lootTable: ["paradox-knot", "lattice-crumbs"],
    behaviors: ["latch-on", "rent-sip", "hop-hitch"],
    goreTier: "teen",
    homeUniverses: ["static", "prime"],
    hopPhasing: true,
    description: {
      kid: "A tickly little beetle who hitches rides on brave hoppers and sips leftover hop-fizz. It latched on — pull it off gentle, flick it onto a leaf, and remind it to buy its own ticket next time.",
      teen: "A parasite that drinks hop-interest straight off your paradox meter and hitches a universe along. Check yourself after every chain-hop; the tick you miss is the collapse you fund.",
      all: "Rent with legs, sipping your meter while you bleed for every hop. Damn the little leech — pull it, crush it, and vent before its whole nest finds you.",
    },
  },
  {
    id: "dream-garden-rootwalker",
    name: "Dream Garden Rootwalker",
    family: "bloom",
    hp: 84,
    attack: 11,
    defense: 8,
    speed: 2,
    xp: 50,
    lootTable: ["world-root-sapling", "bloom-petal"],
    behaviors: ["root-snare", "sap-lament", "garden-guard"],
    goreTier: "teen",
    homeUniverses: ["dream", "bloom"],
    hopPhasing: false,
    description: {
      kid: "A slow, kind tree-friend of Dream's gardens who wears a crackly bark coat and hums garden songs. Mirathiel hums along when the wind is kind — hum too, untangle its roots, and let it settle for a long snooze.",
      teen: "A garden guardian the Array's echo bled halfway dry, still walking its rounds on reflex. It snares boots with living roots — burn the snare clean and mourn what it was.",
      all: "A Dream garden's last gardener, spent by Hades' echo and left wearing bark. Fuck his cure — free the walker and salt the anchor that made it.",
    },
  },
];

/** Roster keyed by enemy id. */
export const GG5D_BESTIARY_BY_ID: Record<string, GG5DEnemy> = Object.fromEntries(
  GG5D_BESTIARY.map((enemy) => [enemy.id, enemy]),
);

export function enemyById(id: string): GG5DEnemy | null {
  return GG5D_BESTIARY_BY_ID[id] ?? GG5D_BESTIARY.find((enemy) => enemy.id === id) ?? null;
}

export function enemiesByUniverse(universe: GG5DUniverseId): GG5DEnemy[] {
  return GG5D_BESTIARY.filter((enemy) => enemy.homeUniverses.includes(universe));
}

export function enemiesByFamily(family: GG5DEnemyFamily): GG5DEnemy[] {
  return GG5D_BESTIARY.filter((enemy) => enemy.family === family);
}
