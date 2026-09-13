// GraveGain4D quest ladder data (v2 layer, slug: gravegain4d ONLY).
//
// Side-quest + boss ladder that COMPLEMENTS content/gravegain4d-saga.ts and
// never duplicates it: saga owns the golf trials (numeric mission ids 1..10,
// "Mission N — ..." titles, putt-across-folds objectives); this module owns
// the RPG combat ladder (string quest ids, kill/collect quotas, boss refs,
// Hades endgame). Canon cast mirrors content/gravegain4d-modes.ts:
// President Angel Good, Echo of Elder Mirathiel, Warchief Groknak,
// Ember Cartographer Sable, Ossuary Twins Pell & Marrow, plus 4D guide
// Fold Cartographer Vex. Canon ground mirrors content/gravegain4d-lore.ts:
// LuckyStarShip muster -> the 5 worlds (MoonRock, Elven Groves, Dwarven
// Vaults, Orc Wastes, Hades Sanctum) -> Hades endgame.
//
// LOCATION: content/ owns per-game data. No runtime deps. Named exports only.

export const GG4D_QUESTS_VERSION = "1.0.0";

export type GG4DQuestType = "kill" | "collect" | "boss" | "trial";

export type GG4DQuestWorld =
  | "luckystarship"
  | "moonrock"
  | "elven-groves"
  | "dwarven-vaults"
  | "orc-wastes"
  | "hades-sanctum";

export type GG4DQuestGiver =
  | "President Angel Good"
  | "Echo of Elder Mirathiel"
  | "Warchief Groknak"
  | "Ember Cartographer Sable"
  | "Ossuary Twins, Pell & Marrow"
  | "Fold Cartographer Vex";

export type GG4DQuestObjectiveKind = "kill" | "collect" | "interact" | "survive";

export interface GG4DQuestObjective {
  kind: GG4DQuestObjectiveKind;
  label: string;
  target: string;
  quota: number;
}

export interface GG4DQuest {
  id: string;
  title: string;
  giver: GG4DQuestGiver;
  type: GG4DQuestType;
  world: GG4DQuestWorld;
  objectives: readonly GG4DQuestObjective[];
  /** Boss ref for boss-type quests; omitted for non-boss quests. */
  boss?: string;
  loreBeat: string;
  rewards: readonly string[];
  /** Saga hole crossover for trial-type quests; omitted otherwise. */
  hole?: number;
  minLevel: number;
}

/**
 * Rising ladder: LuckyStarShip muster -> MoonRock -> Elven Groves ->
 * Dwarven Vaults -> Orc Wastes -> Hades Sanctum endgame. Combat quotas
 * throughout; the two trial entries cross over to saga holes without
 * restating saga trial titles or objectives.
 */
export const GG4D_QUESTS: readonly GG4DQuest[] = [
  {
    id: "gg4d-muster",
    title: "Muster on the LuckyStarShip",
    giver: "President Angel Good",
    type: "collect",
    world: "luckystarship",
    objectives: [
      { kind: "collect", label: "Draw rifles from the hub requisition desk", target: "Hub rifle rack", quota: 3 },
      { kind: "interact", label: "Sign burial-honor desks for the LZ detail", target: "Burial-honor desk", quota: 4 },
      { kind: "collect", label: "Fill lantern-plant oil for the botany lamps", target: "Lantern plant", quota: 6 },
    ],
    loreBeat:
      "President Angel Good musters you on the botany deck she built: lantern plants, " +
      "incubators, and rifle racks side by side. Every timeline's dead get one rest under " +
      "the Compact — sign the desks, take a rifle, and earn your ramp pass.",
    rewards: ["Ramp-pass chit (LZ Sector Alpha)", "Hub requisition rifle", "lore: luckyStarShipHub"],
    minLevel: 1,
  },
  {
    id: "gg4d-ramp-watch",
    title: "Ramp Watch at LZ Alpha",
    giver: "Fold Cartographer Vex",
    type: "kill",
    world: "moonrock",
    objectives: [
      { kind: "kill", label: "Put down risen burial-detail skulkers", target: "Risen skulker", quota: 8 },
      { kind: "kill", label: "Scatter the skull-swarms over the descent ramp", target: "Skull swarm", quota: 5 },
      { kind: "survive", label: "Hold the ramp through fold-shear waves", target: "Fold-shear wave", quota: 3 },
    ],
    loreBeat:
      "Fold Cartographer Vex walks the ramp chalk-line with you: the Array's breach folded " +
      "MoonRock's fourth direction, and your ghost echo shows where your parallel self just " +
      "fired. Hold the ramp in this fold and the next one holds too.",
    rewards: ["Fold-ribbon bandolier (+1 rewind callout)", "Skull-swarm ward charm", "lore: moonRockDescent"],
    minLevel: 1,
  },
  {
    id: "gg4d-wright-marker",
    title: "Tending Wright's Marker",
    giver: "Ossuary Twins, Pell & Marrow",
    type: "collect",
    world: "moonrock",
    objectives: [
      { kind: "collect", label: "Gather marker-stone shards from the dust field", target: "Marker-stone shard", quota: 6 },
      { kind: "kill", label: "Drive off grave-robbing ghouls at the stone", target: "Grave ghoul", quota: 4 },
      { kind: "interact", label: "Re-lay James Wright's stone in every fold echo", target: "Wright grave marker", quota: 2 },
    ],
    loreBeat:
      "Pell counts the shards while Marrow names the ghouls: JAMES WRIGHT, Colonist #4,721, " +
      "first to breathe MoonRock air through a failed seal. The Array made even that rest " +
      "temporary — re-lay his stone and the dust remembers your name.",
    rewards: ["Wright-stone ward (ghoul aggro -1 fold)", "Ossuary stacking gloves", "lore: moonRockDescent"],
    minLevel: 2,
  },
  {
    id: "gg4d-root-wardens",
    title: "Wardens of the Bleeding Roots",
    giver: "Echo of Elder Mirathiel",
    type: "kill",
    world: "elven-groves",
    objectives: [
      { kind: "kill", label: "Break the fallen-seer anchor wardens", target: "Anchor warden", quota: 3 },
      { kind: "kill", label: "Put down risen grove defenders with red eyes", target: "Risen defender", quota: 10 },
      { kind: "survive", label: "Endure the Mother Tree's bleeding-root surges", target: "Root surge", quota: 2 },
    ],
    loreBeat:
      "The Echo of Elder Mirathiel hums your line through the folded roots: the Array's " +
      "fallen-seer anchors bled the Mother Tree, twelve thousand years of ancestor-memory " +
      "in sap and song. Break the wardens and the groves remember you in every fold.",
    rewards: ["Root-ring ward tattoo", "Matriarch's sap vial (heals across folds)", "lore: motherTree"],
    minLevel: 3,
  },
  {
    id: "gg4d-sapling-cache",
    title: "Sable's Sapling Cache",
    giver: "Ember Cartographer Sable",
    type: "collect",
    world: "elven-groves",
    objectives: [
      { kind: "collect", label: "Chart unburned sapling stands in berry-ink", target: "Sapling stand", quota: 5 },
      { kind: "collect", label: "Recover glowcap spores for the hub lamps", target: "Glowcap spore", quota: 8 },
      { kind: "interact", label: "Stamp your star on Sable's grove folio", target: "Grove folio", quota: 1 },
    ],
    loreBeat:
      "Ember Cartographer Sable draws every twisty root in berry-ink so no explorer feels lost " +
      "when the fold moves the walls. Mark the living stands, spare the spores, and her map " +
      "carries your star into the vaults below.",
    rewards: ["Berry-ink grove folio (safe-path preview)", "Glowcap lamp oil x3", "lore: motherTree"],
    minLevel: 3,
  },
  {
    id: "gg4d-forge-taps",
    title: "Shutting the Forge Taps",
    giver: "Fold Cartographer Vex",
    type: "boss",
    world: "dwarven-vaults",
    objectives: [
      { kind: "kill", label: "Starve the Array fuel lines: smash sparkite stokers", target: "Sparkite stoker", quota: 6 },
      { kind: "interact", label: "Shut the Deep Forge tap-valves", target: "Forge tap-valve", quota: 3 },
      { kind: "kill", label: "Bring down the Forge-Stoker Golem", target: "Forge-Stoker Golem", quota: 1 },
    ],
    boss: "Forge-Stoker Golem",
    loreBeat:
      "Vex chalks the vault folds: the Deep Forge feeds the Array's furnaces, and every " +
      "timeline's forge must go dark. Follow the ribbon, not the whispering cracks — shut " +
      "the taps and the Golem burns out with them.",
    rewards: ["Slag-sealed forge key", "Sparkite ward plate", "lore: luckyStarShipHub"],
    minLevel: 4,
  },
  {
    id: "gg4d-brewery-run",
    title: "The Brewery Cellar Run",
    giver: "Ossuary Twins, Pell & Marrow",
    type: "collect",
    world: "dwarven-vaults",
    objectives: [
      { kind: "collect", label: "Haul sealed mana-potion casks from the cellar", target: "Mana-potion cask", quota: 4 },
      { kind: "kill", label: "Clear cellar-rat swarms from the cask rows", target: "Cellar-rat swarm", quota: 6 },
      { kind: "interact", label: "Stack the bone-pile barricades tidy, Pell's way", target: "Bone-pile barricade", quota: 3 },
    ],
    loreBeat:
      "Pell counts the casks, Marrow names the rats: everyone the deep takes ends up in the " +
      "Twins' walls, folded or not. Haul the cellar clean and the hub drinks to your name " +
      "in this timeline and the next.",
    rewards: ["Mana-potion cask x2 (fold-stable)", "Cellar-runner's satchel (+collect speed)", "lore: luckyStarShipHub"],
    minLevel: 5,
  },
  {
    id: "gg4d-gate-tithe",
    title: "Tithe at Groknak's Gate",
    giver: "Warchief Groknak",
    type: "kill",
    world: "orc-wastes",
    objectives: [
      { kind: "kill", label: "Break risen orc blood-raiders at the redoubts", target: "Risen blood-raider", quota: 10 },
      { kind: "kill", label: "Topple the skull-pile siege totems", target: "Siege totem", quota: 4 },
      { kind: "survive", label: "Hold the gate through the crimson-sand charge", target: "Sand charge", quota: 2 },
    ],
    loreBeat:
      "Warchief Groknak plants his Rage Axe as your muster post: his own blood rose with red " +
      "eyes, and the Compact says kin-blood gets buried by kin-hands. Hold his gate and you " +
      "hit like an orc — in every timeline.",
    rewards: ["Blood-tithe war paint (orc faction honored)", "Crimson-sand cleats", "lore: multiverseForkPremise"],
    minLevel: 5,
  },
  {
    id: "gg4d-berserker-trial",
    title: "Trial of the Risen Berserker",
    giver: "Warchief Groknak",
    type: "trial",
    world: "orc-wastes",
    objectives: [
      { kind: "kill", label: "Shatter the Berserker's regeneration anchors", target: "Regeneration anchor", quota: 3 },
      { kind: "kill", label: "Bring down the Risen Berserker Champion", target: "Risen Berserker Champion", quota: 1 },
      { kind: "survive", label: "Stand the war-party's trial circle to the end", target: "Trial circle round", quota: 3 },
    ],
    boss: "Risen Berserker Champion",
    loreBeat:
      "Groknak screams the trial open: regeneration can't fix a shattered skull-pile, folded " +
      "or whole. Burn what falls before the war-party, and the wastes call you kin-blood " +
      "in every fold.",
    rewards: ["Berserker-trial brand (gate vendors discount)", "Anchor-shard trophy", "lore: multiverseForkPremise"],
    hole: 4,
    minLevel: 6,
  },
  {
    id: "gg4d-relay-static",
    title: "Static Over Relay 09",
    giver: "Ember Cartographer Sable",
    type: "trial",
    world: "moonrock",
    objectives: [
      { kind: "kill", label: "Down corrupted drone pickets jamming the relay", target: "Corrupted drone picket", quota: 6 },
      { kind: "collect", label: "Recover Array-whisper cipher fragments", target: "Cipher fragment", quota: 3 },
      { kind: "interact", label: "Re-align the Relay 09 dish across the drift", target: "Relay 09 dish", quota: 2 },
    ],
    loreBeat:
      "Sable's ink line runs out where the W-slice drifts: Hades floods every channel with " +
      "Array whispers and the relay dish wanders between timelines. Re-align it and the " +
      "static clears — miss, and his sanctum vector stays buried in noise.",
    rewards: ["Relay-09 cipher key (drone aggro -1 fold)", "Farstar signal lens", "lore: hadesArrayOrigin"],
    hole: 5,
    minLevel: 7,
  },
  {
    id: "gg4d-citadel-approach",
    title: "Approach to the Citadel Door",
    giver: "Echo of Elder Mirathiel",
    type: "boss",
    world: "hades-sanctum",
    objectives: [
      { kind: "kill", label: "Break the Citadel Gate Warden's honor guard", target: "Gate honor guard", quota: 8 },
      { kind: "kill", label: "Silence the cup-guardian consciousness loops", target: "Consciousness loop", quota: 3 },
      { kind: "kill", label: "Bring down the Citadel Gate Warden", target: "Citadel Gate Warden", quota: 1 },
    ],
    boss: "Citadel Gate Warden",
    loreBeat:
      "Mirathiel's echo kneels where the four races muster: human, elf, dwarf, and orc " +
      "witnesses in one timeline, the Compact re-signed on a scorecard. Past the Warden, " +
      "past the perimeter — Hades waits behind the final door.",
    rewards: ["Gate Warden's helm (citadel vendors honored)", "Compact muster banner", "lore: hadesArrayOrigin"],
    minLevel: 8,
  },
  {
    id: "gg4d-hades-endgame",
    title: "Endgame: Bury Hades",
    giver: "President Angel Good",
    type: "boss",
    world: "hades-sanctum",
    objectives: [
      { kind: "kill", label: "Sever the Array's red-eye conduit priests", target: "Conduit priest", quota: 5 },
      { kind: "interact", label: "Deactivate the NecroGenesis Array cores", target: "Array core", quota: 3 },
      { kind: "kill", label: "Destroy Dr. Lucifer Hades, Consciousness Overlord", target: "Dr. Lucifer Hades", quota: 1 },
    ],
    boss: "Dr. Lucifer Hades",
    loreBeat:
      "President Good hands you the fumigator and the rifle both: Hades built the Array to " +
      "cheat death and folded death back over the living, again and again. Sever the " +
      "conduits, kill the cores, and bury him — every echo, every timeline, every grave " +
      "on MoonRock finally rests under the Compact.",
    rewards: ["Overlord's broken crown (trophy)", "Compact champion's colors (LuckyStarShip gold)", "lore: hadesArrayOrigin"],
    minLevel: 10,
  },
];

export function questById(id: string): GG4DQuest | null {
  return GG4D_QUESTS.find((q) => q.id === id) ?? null;
}

export function questsByWorld(world: GG4DQuestWorld): GG4DQuest[] {
  return GG4D_QUESTS.filter((q) => q.world === world);
}

export function questsByGiver(giver: GG4DQuestGiver): GG4DQuest[] {
  return GG4D_QUESTS.filter((q) => q.giver === giver);
}
