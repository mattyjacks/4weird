// GraveGain5D RPG quest ladder (v2 layer, slug: gravegain5d ONLY).
//
// Mirrors public/games/html/gravegain_shared_missions.js (the shared 10-mission
// titles, kill/collect quotas, and Hades endgame) for server-side consumers
// (docs, PlayGate copy, future guides). The .js file is the runtime truth;
// this module is the 5D catalog truth. The 5D twist: every saga stop is a
// multiverse trial — hop gates move you between the six universes
// (prime/echo/dream/void/bloom/static), paradox gates vent the lattice rent
// before Void/Static collapse clocks fire, and ana-kata gates seal the hole
// across the W-slice. Canon quest-givers: President Angel Good, Echo of Elder
// Mirathiel, Warchief Groknak, Dr. Lucifer Hades (via the Array), and rookie
// Transcendence Cartographer Null.
//
// Complements (never duplicates) content/gravegain5d-lore.ts: lore entries
// tell the lattice history, these quests tell what the rookie DOES on it.
// Hole map mirrors public/games/gravegain5d/game.js HOLES (10 holes).
//
// LOCATION: content/ owns per-game data (see gravegain-epic-saga.ts,
// gravegain4d-saga.ts, gravegain5d-lore.ts, gravegain5d-modes.ts).
// No runtime deps.

export const GG5D_SAGA_VERSION = "1.0.0";

export type GG5DQuestGiver =
  | "President Angel Good"
  | "Echo of Elder Mirathiel"
  | "Warchief Groknak"
  | "Dr. Lucifer Hades (via the Array)"
  | "Transcendence Cartographer Null";

export type GG5DMultiverseGate = "hop" | "paradox" | "ana-kata";

export type GG5DUniverseId = "prime" | "echo" | "dream" | "void" | "bloom" | "static";

export interface GG5DSagaObjective {
  id: string;
  desc: string;
  gate: GG5DMultiverseGate;
  /** Kill/collect quota for the objective, when it carries one. */
  quota?: number;
}

export interface GG5DSagaMission {
  id: number;
  title: string;
  subtitle: string;
  location: string;
  boss: string;
  logline: string;
  loreUnlocks: string[];
  questGiver: GG5DQuestGiver;
  /** Multiverse trial card: which hole, which universe, which gates. */
  multiverseTrial: string;
  loreBeat: string;
  objectives: GG5DSagaObjective[];
  rewards: string[];
  hole: number;
  par: number;
  universe: GG5DUniverseId;
}

export interface GG5DSideQuest {
  id: string;
  title: string;
  questGiver: GG5DQuestGiver;
  logline: string;
  objectives: GG5DSagaObjective[];
  rewards: string[];
}

export interface GG5DBossRung {
  rung: number;
  boss: string;
  mission: number;
  logline: string;
  objectives: GG5DSagaObjective[];
  rewards: string[];
}

/** Rising arc: crash -> groves -> vaults -> wastes -> relay -> catacombs -> tomb -> observatory -> gate -> Hades. Every stop is a multiverse trial. */
export const GG5D_SAGA: readonly GG5DSagaMission[] = [
  {
    id: 1,
    title: "Mission 1 — LZ Crash Site Defense",
    subtitle: "First Hop on MoonRock",
    location: "Colony LZ Sector Alpha",
    boss: "Goblin Zed Leader of Prime",
    logline: "Hold the Prime LZ burial detail at rest while Null charts your first lattice hop.",
    loreUnlocks: ["world_first_grave", "necro_survivor", "human_orientation"],
    questGiver: "President Angel Good",
    multiverseTrial: "Hole 1 (Multiverse Mouth, par 3) on Prime — hop gate in, ana-kata gate seals the mouth.",
    loreBeat:
      "President Angel Good pins Null's fresh lattice chart to the dropship ramp: the LZ dead rose once here, " +
      "and the spare echoes are already borrowing mass to rise again. One clean hop, one sealed mouth, no rent due.",
    objectives: [
      { id: "hop_prime", desc: "Hop the squad through the Prime gate onto the LZ without scattering", gate: "hop" },
      { id: "slay_crash_zeds", desc: "Eliminate all 15 risen burial-detail zeds at the crash site", gate: "hop", quota: 15 },
      { id: "seal_mouth", desc: "Seal the Multiverse Mouth with the ana-kata gate before echoes borrow mass", gate: "ana-kata" },
    ],
    rewards: ["LuckyStarShip lattice putter", "Null-charted Primer ball (hop scatter -1)", "lore: world_first_grave"],
    hole: 1,
    par: 3,
    universe: "prime",
  },
  {
    id: 2,
    title: "Mission 2 — Cleansing the Elven Groves",
    subtitle: "Echoes of the Green Chronicle",
    location: "Bioluminescent Forest Vaults",
    boss: "Echo Elven Necromancer",
    logline: "Purge the Echo groves' fallen-seer anchors and earn Aelindra's gardeners across two skies.",
    loreUnlocks: ["elven_chronicle", "elven_matriarch_grave", "necro_red_eyes"],
    questGiver: "Echo of Elder Mirathiel",
    multiverseTrial: "Hole 2 (Hull Breach Echo, par 3) on Echo — hop gate mirrors Prime, paradox gate vents the ghost rent.",
    loreBeat:
      "The Echo of Elder Mirathiel meets you mid-hop: her groves bled in Prime and the Echo kept the wound. Her " +
      "parallel gardeners hold the root ring while you break the anchors — the Mother Tree pays quotas in trust.",
    objectives: [
      { id: "hop_echo", desc: "Mirror the Prime line through the Echo hop gate", gate: "hop" },
      { id: "slay_grove_corruptors", desc: "Slay 20 undead grove corruptors around the root ring", gate: "hop", quota: 20 },
      { id: "slay_necromancer", desc: "Defeat the Echo Elven Necromancer, then vent the ghost rent", gate: "paradox", quota: 1 },
    ],
    rewards: ["Mother-Tree echo wedge", "Ghost-line ball marker (Echo hop preview +1s)", "lore: elven_chronicle"],
    hole: 2,
    par: 3,
    universe: "echo",
  },
  {
    id: 3,
    title: "Mission 3 — Deep In The Dwarven Vaults",
    subtitle: "Sparkite Fairway in Six Skies",
    location: "Central Highlands Deep Mines",
    boss: "Bloom Dwarven Zed High Thane",
    logline: "Work the Bloom vault fairway, recover the Golem Hammer, and starve the Array of sparkite.",
    loreUnlocks: ["dwarf_deep_forge", "dwarf_paladin_oath", "dwarf_brewery_report"],
    questGiver: "Transcendence Cartographer Null",
    multiverseTrial: "Hole 3 (Grove Veil Bloom, par 4) on Bloom — chain-hop combo fairway, ana-kata gate seals the forge.",
    loreBeat:
      "Null reads all six vaults at once and marks the Bloom cut in chalk: the Deep Forge feeds the Array's furnaces " +
      "in every sky, so the hammer must be lifted where the lattice blooms cheapest. Chain the hops and Bloom pays you back.",
    objectives: [
      { id: "chain_hop", desc: "Chain 2 hops onto the Bloom fairway to open the combo line", gate: "hop" },
      { id: "collect_sparkite", desc: "Recover 5 Sparkite Power Crystals from the overrun forges", gate: "hop", quota: 5 },
      { id: "slay_thane", desc: "Defeat the Bloom High Thane Zed and seal the forge-cup ana-kata", gate: "ana-kata", quota: 1 },
    ],
    rewards: ["Golem Hammer driver (Bloom-forged)", "Sparkite-tipped balls (burn bone piles on impact)", "lore: dwarf_deep_forge"],
    hole: 3,
    par: 4,
    universe: "bloom",
  },
  {
    id: 4,
    title: "Mission 4 — Orc Nomad Outpost Siege",
    subtitle: "Rage Against the Static",
    location: "Crimson Sand Redoubts",
    boss: "Static Huge Orc Zed Berserker",
    logline: "Hold Groknak's gate in the Static storm and prove rookies hit like orcs before the collapse clock fires.",
    loreUnlocks: ["orc_regeneration", "orc_rage_book", "goblin_brave_nix"],
    questGiver: "Warchief Groknak",
    multiverseTrial: "Hole 4 (Vault Static, par 3) on Static — collapse clock runs 8 ticks, paradox gate buys time.",
    loreBeat:
      "Warchief Groknak plants his Rage Axe as your tee marker in three skies at once: his own blood rose under Static " +
      "noise, and kin-blood gets buried by kin-hands before the storm eats the compass. Vent loud, swing louder.",
    objectives: [
      { id: "hop_static", desc: "Hop into the Static storm and anchor Groknak's gate before tick 8", gate: "hop" },
      { id: "slay_siege_zeds", desc: "Defeat 30 Orc and Goblin Zeds at the clan gates", gate: "hop", quota: 30 },
      { id: "slay_berserker", desc: "Slay the Static Berserker and vent the storm paradox", gate: "paradox", quota: 1 },
    ],
    rewards: ["Groknak's Rage Axe 3-wood (harder when hurt)", "Storm-ground cleats (no slip on crimson sand)", "lore: orc_rage_book"],
    hole: 4,
    par: 3,
    universe: "static",
  },
  {
    id: 5,
    title: "Mission 5 — Signal in the Shallows",
    subtitle: "Valley Net Uplink Across the Void",
    location: "Sub-surface Comms Relay 09",
    boss: "Void Corrupted Drone Array",
    logline: "Re-align Relay 09 through Void skull swarms and blind Hades' jamming across the lattice.",
    loreUnlocks: ["human_arty_fisher", "necro_broadcast", "world_farstar"],
    questGiver: "Transcendence Cartographer Null",
    multiverseTrial: "Hole 5 (Waste Crossing Void, par 4) on Void — collapse clock runs 12 ticks, chain-hop to outrun it.",
    loreBeat:
      "Null counts the Void ticks aloud while Hades floods every channel with Array whispers. Relay 09 must be re-aligned " +
      "in this sky before the Maw collects — miss the window and his sanctum vector stays buried two hops deep.",
    objectives: [
      { id: "hop_void", desc: "Cross into the Void and reach Relay 09 before the collapse clock fires", gate: "hop" },
      { id: "slay_skulls", desc: "Destroy 15 Flying Skulls guarding the relay coils", gate: "hop", quota: 15 },
      { id: "clear_relay", desc: "Clear all 25 hostile entities in the relay chamber, then vent", gate: "paradox", quota: 25 },
    ],
    rewards: ["Relay-09 pulser putter (chains static off the ball)", "Farstar rangefinder (Void tick preview)", "lore: necro_broadcast"],
    hole: 5,
    par: 4,
    universe: "void",
  },
  {
    id: 6,
    title: "Mission 6 — The Alchemical Catacombs",
    subtitle: "President Good's Dream Detox",
    location: "Botany Core Sub-levels",
    boss: "Dream Toxic Chem-Golem",
    logline: "Purge Good's poisoned botany vats in the Dream shallows and kill the Chem-Golem choking the colony's lungs.",
    loreUnlocks: ["human_angel_good", "necro_understanding", "dwarf_mana_potions"],
    questGiver: "President Angel Good",
    multiverseTrial: "Hole 6 (Venom Deep Dream, par 5) on Dream — soft physics, generous par, paradox gate purges the vats.",
    loreBeat:
      "President Angel Good walks you down to the botany deck she built — lantern plants, poisoned vats, requisition " +
      "rifles side by side. In the Dream shallows the poison sleeps lightest, so this is where her legacy gets scrubbed clean.",
    objectives: [
      { id: "hop_dream", desc: "Hop the squad into the Dream shallows under the toxic veil", gate: "hop" },
      { id: "slay_elites", desc: "Slay 8 Elite Armored Zeds in the vat galleries", gate: "hop", quota: 8 },
      { id: "slay_golem", desc: "Destroy the Dream Chem-Golem and vent the vat paradox", gate: "paradox", quota: 1 },
    ],
    rewards: ["Dreamcap Fumigator wedge", "Lantern-plant ball (toxic-rough immune)", "lore: human_angel_good"],
    hole: 6,
    par: 5,
    universe: "dream",
  },
  {
    id: 7,
    title: "Mission 7 — The Tomb of Clint Oldman",
    subtitle: "Guy Young's Static Paradox",
    location: "Colonial Crypt of Honor",
    boss: "Static Reanimated Patriarch Clint",
    logline: "Grant Clint Oldman his second, final rest while his Static tomb echoes charge double rent.",
    loreUnlocks: ["human_clint_oldman", "human_guy_young", "necro_gravestone"],
    questGiver: "Echo of Elder Mirathiel",
    multiverseTrial: "Hole 7 (Dark Antechamber, par 3) on Static — borrowed-mass interest peaks, vent every other beat.",
    loreBeat:
      "Mirathiel's echo kneels at the Colonial Crypt of Honor: Clint Oldman died twice and the Array filed both copies. " +
      "The Static tomb remembers him loudest, so the honor silence must hold while the paradox is vented tomb by tomb.",
    objectives: [
      { id: "hop_crypt", desc: "Hop into the Static crypt without breaking the honor silence", gate: "hop" },
      { id: "clear_guardians", desc: "Clear all 30 tomb guardians across the borrowed-mass echoes", gate: "hop", quota: 30 },
      { id: "lay_clint", desc: "Lay Patriarch Clint down and vent the double-rent paradox", gate: "paradox", quota: 1 },
    ],
    rewards: ["Crypt-honor brass iron", "Paradox-tolerant ball (echo putts don't collide)", "lore: human_clint_oldman"],
    hole: 7,
    par: 3,
    universe: "static",
  },
  {
    id: 8,
    title: "Mission 8 — Orbital Strike Calibration",
    subtitle: "The MERCENARY Echo Chorus",
    location: "Highland Peak Observatory",
    boss: "Echo Bone Goliath Warlord",
    logline: "Paint the target from the Highland Peak while your Echo selves paint it beside you.",
    loreUnlocks: ["human_mercenary_doctrine", "world_giantess_song", "human_captains_log"],
    questGiver: "Warchief Groknak",
    multiverseTrial: "Hole 8 (Choir of Echoes, par 4) on Echo — parallel selves hold the line, ana-kata gate locks the beacon.",
    loreBeat:
      "Groknak carries your bag up the Highland Peak and dares the Bone Goliath to catch the ball in every echo at once. " +
      "The MERCENARY doctrine is simple: one painted target, one kinetic strike, one shattered perimeter per sky.",
    objectives: [
      { id: "hop_peak", desc: "Hop the fire team onto the observatory tee across parallel echoes", gate: "hop" },
      { id: "slay_horde", desc: "Defeat 35 undead horde assault units on the peak road", gate: "hop", quota: 35 },
      { id: "slay_warlord", desc: "Slay the Echo Warlord and lock the strike beacon ana-kata", gate: "ana-kata", quota: 1 },
    ],
    rewards: ["MERCENARY doctrine driver (observatory-range carry)", "Strike-beacon tee set (approach glows on line)", "lore: human_mercenary_doctrine"],
    hole: 8,
    par: 4,
    universe: "echo",
  },
  {
    id: 9,
    title: "Mission 9 — Gate of the NecroGenesis",
    subtitle: "The Breach Across the Maw",
    location: "The Citadel Perimeter",
    boss: "Void Necro-Array Titan",
    logline: "Breach the Citadel with all four races and drop the Void Titan guarding Hades' door.",
    loreUnlocks: ["necro_report", "human_treaty", "elven_druid_lament"],
    questGiver: "Transcendence Cartographer Null",
    multiverseTrial: "Hole 9 (Root Tesseract, par 4) on Void — heaviest ball, hungriest drift, all gates in sequence.",
    loreBeat:
      "Null folds the gallery together: human, elf, dwarf, and orc witnesses in one stadium sky while the Titan drinks " +
      "the Void dry. The Compact gets re-signed on a scorecard, and the lattice holds its breath for the last hop.",
    objectives: [
      { id: "hop_citadel", desc: "Hop the four-race breach team onto the Citadel perimeter in Compact order", gate: "hop" },
      { id: "clear_guardians_elite", desc: "Eliminate 40 elite citadel guardians", gate: "hop", quota: 40 },
      { id: "slay_titan", desc: "Destroy the Void Necro-Array Titan, vent, then seal the door ana-kata", gate: "ana-kata", quota: 1 },
    ],
    rewards: ["Compact scorecard (all-races gallery buff)", "Titan-splitting stinger iron", "lore: human_treaty"],
    hole: 9,
    par: 4,
    universe: "void",
  },
  {
    id: 10,
    title: "Mission 10 — Lucifer's Shadow",
    subtitle: "The Prime Reckoning",
    location: "Lucifer Hades' Sanctum Core",
    boss: "Dr. Lucifer Hades (Consciousness Overlord of the Spares)",
    logline: "Kill the Consciousness Overlord, empty his spare Array, and seal the Compact into a living peace.",
    loreUnlocks: ["lucifer_manifesto", "lucifer_journal_47", "human_earth_letter"],
    questGiver: "Dr. Lucifer Hades (via the Array)",
    multiverseTrial: "Hole 10 (The Prime Array, par 5) on Prime — one cup, every sky collapsed home, no rent left unpaid.",
    loreBeat:
      "Hades himself issues the tee time over the Array: cheat death, he says, and the spares are yours. Every collapsed " +
      "spare he ever filed is stacked behind the final cup — win the par and Angel Good negotiates their release one by one.",
    objectives: [
      { id: "hop_sanctum", desc: "Hop the champions into the Sanctum Core with every universe collapsed home", gate: "hop" },
      { id: "overload_conduits", desc: "Overload 3 array conduits during the Overlord's phase turns", gate: "paradox", quota: 3 },
      { id: "slay_hades", desc: "Defeat Dr. Lucifer Hades and seal the Prime cup ana-kata forever", gate: "ana-kata", quota: 1 },
    ],
    rewards: ["Consciousness Overlord's broken tee (trophy)", "Compact champion's jacket (LuckyStarShip gold)", "lore: lucifer_manifesto"],
    hole: 10,
    par: 5,
    universe: "prime",
  },
];

/** Side-quests: one per core quest-giver, repeatable lattice work with kill/collect quotas. */
export const GG5D_SIDE_QUESTS: readonly GG5DSideQuest[] = [
  {
    id: "sq-null-combo-survey",
    title: "Null's Combo Survey",
    questGiver: "Transcendence Cartographer Null",
    logline: "Chart chain-hop combos for the lattice: hop, hop again, and bring back proof Bloom paid out.",
    objectives: [
      { id: "chain_two", desc: "Chain 2 hops in one run without collapsing", gate: "hop", quota: 2 },
      { id: "collect_charts", desc: "Collect 6 lattice chart rubbings from Bloom greens", gate: "hop", quota: 6 },
      { id: "vent_survey", desc: "Vent the survey paradox at Null's Prime marker", gate: "paradox" },
    ],
    rewards: ["Surveyor's chalk set (combo line visible +1s)", "50 gold", "100 UUSD"],
  },
  {
    id: "sq-angel-hub-watch",
    title: "Angel's Hub Watch",
    questGiver: "President Angel Good",
    logline: "Hold the LuckyStarShip hub ring while spare-universe strays test the perimeter.",
    objectives: [
      { id: "hold_ring", desc: "Hold the hub ring hop gate for 3 waves", gate: "hop", quota: 3 },
      { id: "slay_strays", desc: "Eliminate 12 spare-universe strays at the perimeter", gate: "hop", quota: 12 },
      { id: "seal_ring", desc: "Seal the ring ana-kata after the third wave", gate: "ana-kata" },
    ],
    rewards: ["Hub-watch brass putter grip", "120 gold", "250 UUSD"],
  },
  {
    id: "sq-mirathiel-echo-choir",
    title: "Mirathiel's Echo Choir",
    questGiver: "Echo of Elder Mirathiel",
    logline: "Gather the scattered echo-petals so the groves can sing the Green Chronicle in tune.",
    objectives: [
      { id: "hop_grove", desc: "Hop to the Echo groves and join the choir line", gate: "hop" },
      { id: "collect_petals", desc: "Collect 10 echo-petals from fallen-seer rings", gate: "hop", quota: 10 },
      { id: "vent_choir", desc: "Vent the choir's grief paradox under the Mother Tree", gate: "paradox" },
    ],
    rewards: ["Petal-inlaid ball marker", "80 gold", "180 UUSD"],
  },
  {
    id: "sq-groknak-berserker-hunt",
    title: "Groknak's Berserker Hunt",
    questGiver: "Warchief Groknak",
    logline: "Track the Berserker's spare-blooded kin across the wastes and bury them standing up.",
    objectives: [
      { id: "track_kin", desc: "Hop the waste trail across 2 universes without losing the scent", gate: "hop", quota: 2 },
      { id: "slay_kin", desc: "Slay 18 risen Orc-kin in the wastes", gate: "hop", quota: 18 },
      { id: "seal_cairn", desc: "Raise the kin-cairn and seal it ana-kata", gate: "ana-kata" },
    ],
    rewards: ["Kin-cairn war paint (berserker damage +1)", "150 gold", "300 UUSD"],
  },
  {
    id: "sq-hades-spare-tithe",
    title: "Hades' Spare Tithe",
    questGiver: "Dr. Lucifer Hades (via the Array)",
    logline: "The Array demands its tithe: feed it collapsed-spare salvage, then vent what it cannot digest.",
    objectives: [
      { id: "collect_salvage", desc: "Collect 8 collapsed-spare salvage shards from Void vaults", gate: "hop", quota: 8 },
      { id: "tithe_array", desc: "Tithe the shards at the Array conduit", gate: "paradox" },
      { id: "vent_tithe", desc: "Vent the leftover tithe paradox before it accrues interest", gate: "paradox" },
    ],
    rewards: ["Spare-vault key (one collapsed door opens)", "200 gold", "400 UUSD"],
  },
];

/** Boss ladder: one rung per saga mission boss, escalating kill/collect quotas with gate discipline. */
export const GG5D_BOSS_LADDER: readonly GG5DBossRung[] = [
  {
    rung: 1,
    boss: "Goblin Zed Leader of Prime",
    mission: 1,
    logline: "Burial-detail warranty run: put the Prime pile down twice to prove the seal holds.",
    objectives: [
      { id: "slay_leader", desc: "Defeat the Goblin Zed Leader", gate: "hop", quota: 1 },
      { id: "slay_pile", desc: "Eliminate 15 burial-detail zeds", gate: "hop", quota: 15 },
    ],
    rewards: ["Rung-1 seal stamp", "40 gold"],
  },
  {
    rung: 2,
    boss: "Echo Elven Necromancer",
    mission: 2,
    logline: "Break the anchor choir: twenty corruptors, one necromancer, one vented ghost rent.",
    objectives: [
      { id: "slay_corruptors", desc: "Slay 20 undead grove corruptors", gate: "hop", quota: 20 },
      { id: "slay_necromancer", desc: "Defeat the Echo Elven Necromancer", gate: "paradox", quota: 1 },
    ],
    rewards: ["Rung-2 root ring", "70 gold"],
  },
  {
    rung: 3,
    boss: "Bloom Dwarven Zed High Thane",
    mission: 3,
    logline: "Forge repossession: five crystals out, one thane down, combo line intact.",
    objectives: [
      { id: "collect_crystals", desc: "Recover 5 Sparkite Power Crystals", gate: "hop", quota: 5 },
      { id: "slay_thane", desc: "Defeat the Bloom High Thane Zed", gate: "ana-kata", quota: 1 },
    ],
    rewards: ["Rung-3 forge brand", "100 gold"],
  },
  {
    rung: 4,
    boss: "Static Huge Orc Zed Berserker",
    mission: 4,
    logline: "Gate siege encore: thirty zeds before the Berserker earns his rematch.",
    objectives: [
      { id: "slay_siege", desc: "Defeat 30 Orc and Goblin Zeds", gate: "hop", quota: 30 },
      { id: "slay_berserker", desc: "Slay the Static Berserker", gate: "paradox", quota: 1 },
    ],
    rewards: ["Rung-4 gate token", "140 gold"],
  },
  {
    rung: 5,
    boss: "Void Corrupted Drone Array",
    mission: 5,
    logline: "Relay blackout drill: skulls first, chamber sweep second, clock never hits zero.",
    objectives: [
      { id: "slay_skulls", desc: "Destroy 15 Flying Skulls", gate: "hop", quota: 15 },
      { id: "clear_chamber", desc: "Clear all 25 hostile entities in the relay chamber", gate: "paradox", quota: 25 },
    ],
    rewards: ["Rung-5 relay cipher", "180 gold"],
  },
  {
    rung: 6,
    boss: "Dream Toxic Chem-Golem",
    mission: 6,
    logline: "Vat purge certification: eight elites softened up, one golem melted down.",
    objectives: [
      { id: "slay_elites", desc: "Slay 8 Elite Armored Zeds", gate: "hop", quota: 8 },
      { id: "slay_golem", desc: "Destroy the Dream Chem-Golem", gate: "paradox", quota: 1 },
    ],
    rewards: ["Rung-6 fumigator badge", "240 gold"],
  },
  {
    rung: 7,
    boss: "Static Reanimated Patriarch Clint",
    mission: 7,
    logline: "Honor-silence trial: thirty guardians, one patriarch, zero noise.",
    objectives: [
      { id: "clear_guardians", desc: "Clear all 30 tomb guardians", gate: "hop", quota: 30 },
      { id: "lay_patriarch", desc: "Defeat Reanimated Patriarch Clint", gate: "paradox", quota: 1 },
    ],
    rewards: ["Rung-7 crypt ribbon", "320 gold"],
  },
  {
    rung: 8,
    boss: "Echo Bone Goliath Warlord",
    mission: 8,
    logline: "Peak-road qualifier: thirty-five horde units, then the Warlord gets his long drive.",
    objectives: [
      { id: "slay_horde", desc: "Defeat 35 undead horde assault units", gate: "hop", quota: 35 },
      { id: "slay_warlord", desc: "Slay the Echo Bone Goliath Warlord", gate: "ana-kata", quota: 1 },
    ],
    rewards: ["Rung-8 peak pennant", "440 gold"],
  },
  {
    rung: 9,
    boss: "Void Necro-Array Titan",
    mission: 9,
    logline: "Semifinal gauntlet: forty guardians, one Titan, door sealed behind you.",
    objectives: [
      { id: "clear_elites", desc: "Eliminate 40 elite citadel guardians", gate: "hop", quota: 40 },
      { id: "slay_titan", desc: "Destroy the Void Necro-Array Titan", gate: "ana-kata", quota: 1 },
    ],
    rewards: ["Rung-9 citadel seal", "600 gold"],
  },
  {
    rung: 10,
    boss: "Dr. Lucifer Hades (Consciousness Overlord of the Spares)",
    mission: 10,
    logline: "Endgame: three conduits overloaded, one Overlord buried, every spare released.",
    objectives: [
      { id: "overload_conduits", desc: "Overload 3 array conduits during phase turns", gate: "paradox", quota: 3 },
      { id: "slay_hades", desc: "Defeat Dr. Lucifer Hades", gate: "ana-kata", quota: 1 },
    ],
    rewards: ["Overlord's broken crown (trophy)", "1000 gold"],
  },
];

export function getGG5DSagaMission(id: number): GG5DSagaMission | null {
  return GG5D_SAGA.find((m) => m.id === id) ?? null;
}

export function getGG5DSagaMissionByHole(hole: number): GG5DSagaMission | null {
  return GG5D_SAGA.find((m) => m.hole === hole) ?? null;
}

export function getGG5DSideQuest(id: string): GG5DSideQuest | null {
  return GG5D_SIDE_QUESTS.find((q) => q.id === id) ?? null;
}

export function getGG5DBossRung(rung: number): GG5DBossRung | null {
  return GG5D_BOSS_LADDER.find((b) => b.rung === rung) ?? null;
}

export function listGG5DSagaTitles(): string[] {
  return GG5D_SAGA.map((m) => m.title);
}

/** V2 runtime overlay files backing the 5D saga (served at /games/html/*). */
export const GG5D_SAGA_RUNTIME_FILES = [
  "gravegain_shared_missions.js",
  "gravegain5d-universes.js",
  "gravegain5d-bestiary.js",
] as const;

/** Shared pool backing EVERY game (served at /games/html/fourweird-workers.js). */
export const FOURWEIRD_WORKERS_RUNTIME_FILE = "fourweird-workers.js";
