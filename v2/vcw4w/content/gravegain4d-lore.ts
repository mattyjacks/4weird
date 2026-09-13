/**
 * GraveGain4D lore (slug: gravegain4d ONLY).
 *
 * LOCATION NOTE: this lives in `content/` because `content/` owns per-game
 * data modules while `lib/` owns engine-agnostic utilities. Saga voice
 * mirrors content/gravegain-epic-saga.ts (mission ids 1..10, same arc:
 * crash -> groves -> vaults -> wastes -> relay -> catacombs -> tomb ->
 * observatory -> gate -> Lucifer). Canon cast: Dr. Lucifer Hades + the
 * Hades Array, President Angel Good, Queen Aelindra, Warchief Groknak,
 * Lisa Park, Elder Mirathiel. 4D premise: the Array's breach folded MoonRock
 * into parallel timelines — every mission is fought across folds.
 */

export type GG4DLore = {
  /** Dr. Lucifer Hades and the consciousness-transfer Array. */
  hadesArrayOrigin: string;
  /** The colony ship: hub, botany deck, President Angel Good. */
  luckyStarShipHub: string;
  /** Colony Alpha landing, James Wright, the first grave. */
  moonRockDescent: string;
  /** The elven world-root: bleeding anchors, Mirathiel, Aelindra. */
  motherTree: string;
  /** Why 4D: the breach folded MoonRock into parallel timelines. */
  multiverseForkPremise: string;
  /** 10 mission titles, ids 1..10, mirroring the saga arc. */
  missionTitles: readonly string[];
};

export const GG4D_LORE: GG4DLore = {
  hadesArrayOrigin:
    "Dr. Lucifer Hades built the NecroGenesis Array to cheat death — a citadel machine that " +
    "catches departing consciousness and pours it back into dead flesh. The first test lit the sky " +
    "over the Citadel, and every grave on MoonRock answered with red eyes. The Array did not cure " +
    "death; it folded death back over the living, again and again.",
  luckyStarShipHub:
    "The LuckyStarShip is the colony's beating heart and President Angel Good's botany deck — " +
    "lantern plants, incubators, burial-honor desks, and rifle requisitions side by side. " +
    "The botanist-turned-president runs the hub the way she ran her vats: everything grows " +
    "better with a song, and everything survives with a guard posted.",
  moonRockDescent:
    "Colony Alpha touched down in LZ Sector Alpha and dug its first grave within a season: " +
    "JAMES WRIGHT, Colonist #4,721, first to breathe MoonRock air through a failed seal. " +
    "His stone still stands where the descent ramp meets the dust — a reminder that the air " +
    "shows no mercy, and that the Array later made even that rest temporary.",
  motherTree:
    "The Mother Tree is the elven world-root beneath the Bioluminescent Forest Vaults — twelve " +
    "thousand years of ancestor-memory in sap and song. The Array's fallen-seer anchors bled it, " +
    "and Elder Mirathiel's echo still walks its roots. Queen Aelindra holds the groves because " +
    "the Tree marks every defender's steps, past and future both.",
  multiverseForkPremise:
    "When the Array breached the Citadel perimeter, the surge folded MoonRock's fourth direction — " +
    "one descent, many timelines. Every mission is fought across parallel folds: your ghost echo " +
    "shows what your parallel self just did, and a single rewind buys back one mistake per fold. " +
    "Close the Array in this timeline and every echo goes quiet with it.",
  missionTitles: [
    "Mission 1 — LZ Crash Site Defense",
    "Mission 2 — Cleansing the Elven Groves",
    "Mission 3 — Deep In The Dwarven Vaults",
    "Mission 4 — Orc Nomad Outpost Siege",
    "Mission 5 — Signal in the Shallows",
    "Mission 6 — The Alchemical Catacombs",
    "Mission 7 — The Tomb of Clint Oldman",
    "Mission 8 — Orbital Strike Calibration",
    "Mission 9 — Gate of the NecroGenesis",
    "Mission 10 — Lucifer's Shadow",
  ],
};

export function getGG4DMissionTitle(id: number): string | null {
  return GG4D_LORE.missionTitles[id - 1] ?? null;
}
