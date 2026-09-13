/**
 * GraveGain5D lore (slug: gravegain5d ONLY).
 *
 * The multiverse chapter of the GraveGain canon: after the 4D tour folded
 * MoonRock's vaults, rookie Transcendence Cartographer Null detected six
 * parallel Arroyos — Prime, Echo, Dream, Void, Bloom, Static — drifting
 * apart. President Angel Good, Mirathiel's echo, Groknak, Sable, Pell &
 * Marrow, and Vex return; Hades collects the collapsed spares.
 */

export type GG5DLoreEntry = { id: string; title: string; body: string };

export const GG5D_LORE: readonly GG5DLoreEntry[] = [
  {
    id: "lattice",
    title: "The Sixfold Lattice",
    body: "MoonRock was never one colony. The Array's first fold split it six ways — Prime kept the charter, Echo kept the ghosts, Dream kept the gardens, Void kept the hunger, Bloom kept the laughter, Static kept the noise. Null's lattice charts all six.",
  },
  {
    id: "paradox",
    title: "Paradox Is Rent",
    body: "Every hop borrows mass from the universe you leave. Borrow twice in a row and the lattice charges interest — the meter climbs, and hot universes (Void, Static) start their collapse clocks. Wardens anchor; Drifters hop free; Putters outrun the bill with combos.",
  },
  {
    id: "hades",
    title: "Hades Collects Spares",
    body: "Collapsed universes do not vanish. Hades files them — every overcharged Void and Static becomes a vault in his spare Array. Win the tour and Angel Good negotiates their release, one par at a time.",
  },
  {
    id: "null",
    title: "Cartographer Null",
    body: "Null was a 4D fold-guide who read one hop too many and saw the whole lattice at once. Now they speak in six voices and never sleep — someone has to hold the map while you bounce between bedtimes.",
  },
  {
    id: "compact",
    title: "The Compact Holds Six Worlds",
    body: "Queen Aelindra, Forgemaster Borin, Warchief Groknak, and Captain Chen swore the Compact of Shared Blood so no race stands alone. Null copied that oath onto the Sixfold Lattice, so every universe you save still answers to the same promise.",
  },
  {
    id: "array",
    title: "The Undead Array, Folded",
    body: "Hades built the Necromatic Array from ley-line amplifiers to wake every corpse on MoonRock at once. The first lattice fold split its signal six ways, so each universe now hums with a weaker but hungrier echo of the dead.",
  },
  {
    id: "moonrock",
    title: "MoonRock, Six Times Over",
    body: "MoonRock is still the 0.71g moon under Giantess with glowing Groves, Deep Forge holds, and Orc wastes. The lattice shows it six times over, and each hop lands you on a MoonRock that remembers the NecroGenesis a little differently.",
  },
  {
    id: "lisa",
    title: "Private Lisa Park",
    body: "Lisa Park was a human rifleman who learned to fight beside a Dwarf Paladin, an Elf Druid, and Groknak himself. Her letters home are now lattice field notes, reminding every rookie that brave friends matter more than clean hops.",
  },
  {
    id: "borin",
    title: "Forgemaster Borin",
    body: "Borin of Deep Forge cuts stone, brews medicine, and holds the line when batteries die and only axes still work. Wardens study his oath in every universe because anchoring a collapse takes the same stubborn craft as holding a forge door.",
  },
  {
    id: "aelindra",
    title: "Queen Aelindra Moonwhisper",
    body: "Aelindra planted ten thousand trees and ruled the Northern Groves for 847 years before the dead rose through their roots. Her moonstone blade sealed the Compact, and Dream-universe gardeners still putt in her name to keep Bloom green.",
  },
];

export const GG5D_CANON = ["Angel Good", "Mirathiel", "Groknak", "Hades", "Lisa Park", "Borin", "Aelindra"] as const;
