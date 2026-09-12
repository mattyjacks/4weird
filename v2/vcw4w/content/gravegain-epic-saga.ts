// GraveGain epic saga catalog data (v2 layer, slug-agnostic).
//
// Mirrors public/games/html/gravegain-epic-saga.js (the runtime beat tables)
// for server-side consumers (docs, PlayGate copy, future guides). The .js
// file is the runtime truth; this module is the catalog truth. Both share:
// mission ids 1..10, titlecards, loreUnlocks, loglines, and the kid/teen/all
// content-mode contract (kid cozy, teen clean, all grim+profane).
//
// LOCATION: content/ owns per-game data (see gravegain2d-modes.ts,
// gravegain3d-modes.ts). Parity-locked bundles are never touched.

export const GRAVEGAIN_SAGA_VERSION = "1.0.0";

export type SagaPhase = "intro" | "outro";

export interface SagaMission {
  id: number;
  title: string;
  subtitle: string;
  location: string;
  boss: string;
  logline: string;
  loreUnlocks: string[];
}

/** Rising arc: crash -> groves -> vaults -> wastes -> relay -> catacombs -> tomb -> observatory -> gate -> Lucifer. */
export const GRAVEGAIN_SAGA: readonly SagaMission[] = [
  { id: 1, title: "Mission 1 — LZ Crash Site Defense", subtitle: "The Descent on MoonRock", location: "Colony LZ Sector Alpha", boss: "Goblin Zed Leader", logline: "Put the LZ's own risen burial detail — including James Wright — back to rest.", loreUnlocks: ["world_first_grave", "necro_survivor", "human_orientation"] },
  { id: 2, title: "Mission 2 — Cleansing the Elven Groves", subtitle: "Echoes of the Green Chronicle", location: "Bioluminescent Forest Vaults", boss: "Elven Necromancer", logline: "Break the fallen-seer anchors in the bleeding Mother Tree and earn Aelindra's trust.", loreUnlocks: ["elven_chronicle", "elven_matriarch_grave", "necro_red_eyes"] },
  { id: 3, title: "Mission 3 — Deep In The Dwarven Vaults", subtitle: "Sparkite & Steel", location: "Central Highlands Deep Mines", boss: "Dwarven Zed High Thane", logline: "Recover the Golem Hammer from the overrun sparkite forges and starve the Array of fuel.", loreUnlocks: ["dwarf_deep_forge", "dwarf_paladin_oath", "dwarf_brewery_report"] },
  { id: 4, title: "Mission 4 — Orc Nomad Outpost Siege", subtitle: "Rage of the Southern Wastes", location: "Crimson Sand Redoubts", boss: "Huge Orc Zed Berserker", logline: "Hold Groknak's gate against his own risen blood and prove humans hit like orcs.", loreUnlocks: ["orc_regeneration", "orc_rage_book", "goblin_brave_nix"] },
  { id: 5, title: "Mission 5 — Signal in the Shallows", subtitle: "Valley Net Uplink Restoration", location: "Sub-surface Comms Relay 09", boss: "Corrupted Drone Array", logline: "Re-align Relay 09 through skull swarms to blind Hades' jamming and track his sanctum.", loreUnlocks: ["human_arty_fisher", "necro_broadcast", "world_farstar"] },
  { id: 6, title: "Mission 6 — The Alchemical Catacombs", subtitle: "President Good's Legacy", location: "Botany Core Sub-levels", boss: "Toxic Chem-Golem", logline: "Purge Good's poisoned botany vats and kill the Chem-Golem choking the colony's lungs.", loreUnlocks: ["human_angel_good", "necro_understanding", "dwarf_mana_potions"] },
  { id: 7, title: "Mission 7 — The Tomb of Clint Oldman", subtitle: "Guy Young's Paradox", location: "Colonial Crypt of Honor", boss: "Reanimated Patriarch Clint", logline: "Grant Clint Oldman — the man time broke — his second, final rest.", loreUnlocks: ["human_clint_oldman", "human_guy_young", "necro_gravestone"] },
  { id: 8, title: "Mission 8 — Orbital Strike Calibration", subtitle: "The MERCENARY Doctrine", location: "Highland Peak Observatory", boss: "Bone Goliath Warlord", logline: "Paint the target from the Highland Peak so the kinetic strike shatters Hades' perimeter.", loreUnlocks: ["human_mercenary_doctrine", "world_giantess_song", "human_captains_log"] },
  { id: 9, title: "Mission 9 — Gate of the NecroGenesis", subtitle: "The Breach of the Array", location: "The Citadel Perimeter", boss: "Necro-Array Titan", logline: "Breach the Citadel with all four races and drop the Titan guarding Hades' door.", loreUnlocks: ["necro_report", "human_treaty", "elven_druid_lament"] },
  { id: 10, title: "Mission 10 — Lucifer's Shadow", subtitle: "The Final Confrontation", location: "Lucifer Hades' Sanctum Core", boss: "Dr. Lucifer Hades (Consciousness Overlord)", logline: "Kill the Consciousness Overlord, deactivate the Array, and seal the Compact into a living peace.", loreUnlocks: ["lucifer_manifesto", "lucifer_journal_47", "human_earth_letter"] },
];

export function getSagaMission(id: number): SagaMission | null {
  return GRAVEGAIN_SAGA.find((m) => m.id === id) ?? null;
}

/** V2 runtime overlay files backing the saga (served at /games/html/*). */
export const GRAVEGAIN_SAGA_RUNTIME_FILES = [
  "gravegain-epic-saga.js",
  "gravegain-cutscenes.js",
  "gravegain-graphics-plus.js",
  "gravegain-workers.js",
] as const;

/** Shared pool backing EVERY game (served at /games/html/fourweird-workers.js). */
export const FOURWEIRD_WORKERS_RUNTIME_FILE = "fourweird-workers.js";
