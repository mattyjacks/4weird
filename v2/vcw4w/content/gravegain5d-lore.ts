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
];

export const GG5D_CANON = ["Angel Good", "Mirathiel", "Groknak", "Hades"] as const;
