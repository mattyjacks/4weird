// GraveGain food batch 10: roster idx 80-88 (ash-potato ... fortune-cookie).
//
// Each item spreads its GRAVEGAIN_FOOD_ROSTER entry (emoji codepoints and
// blurbs are never retyped here) and carries a full gravegain1d/2d/3d x
// endless/mission/mmorpg stats table via buildFoodStatsTable(), plus a
// 4..100-char drop note per game/mode cell:
//   endless: which floors/foes drop it,
//   mission: which mission rewards it,
//   mmorpg:  market/trade note.

import {
  buildFoodStatsTable,
  GRAVEGAIN_FOOD_GAMES,
  GRAVEGAIN_FOOD_MODES,
  type GraveGainFoodGame,
  type GraveGainFoodItemDef,
  type GraveGainFoodMode,
} from "@/lib/gravegain-food";
import { GRAVEGAIN_FOOD_ROSTER } from "./gravegain-food-roster";

export const GRAVE_GAIN_FOOD_BATCH_10_IDS = [
  "ash-potato",
  "skewer-sticks",
  "ronin-sushi",
  "golden-shrimp",
  "vortex-cake",
  "moon-cake",
  "festival-skewers",
  "pocket-dumpling",
  "fortune-cookie",
] as const;

type DropNotes = Record<GraveGainFoodGame, Record<GraveGainFoodMode, string>>;

function makeItem(
  id: (typeof GRAVE_GAIN_FOOD_BATCH_10_IDS)[number],
  notes: DropNotes,
): GraveGainFoodItemDef {
  const entry = GRAVEGAIN_FOOD_ROSTER.find((e) => e.id === id);
  if (!entry) throw new Error(`missing roster entry ${id}`);
  const stats = buildFoodStatsTable(entry.effect, entry.tier);
  for (const game of GRAVEGAIN_FOOD_GAMES) {
    for (const mode of GRAVEGAIN_FOOD_MODES) {
      stats[game][mode].note = notes[game][mode];
    }
  }
  return { ...entry, stats };
}

const ASH_POTATO_NOTES: DropNotes = {
  gravegain1d: {
    endless: "Ash-pit brutes drop it on floors 6-10.",
    mission: "Reward for Ember Cellar mission 4.",
    mmorpg: "Staple trade good at crypt markets.",
  },
  gravegain2d: {
    endless: "Cinder imps drop it on floors 9-15.",
    mission: "Reward for Ashfall March mission 6.",
    mmorpg: "Bulk-listed by hearthside vendors.",
  },
  gravegain3d: {
    endless: "Magma wardens drop it in vaults 12-20.",
    mission: "Reward for Deep Hearth delve 8.",
    mmorpg: "Guild caravans haul it by the sack.",
  },
};

const SKEWER_STICKS_NOTES: DropNotes = {
  gravegain1d: {
    endless: "Goblin grillers drop them on floors 3-7.",
    mission: "Reward for Campfire Row mission 2.",
    mmorpg: "Street stalls sell them skewer by skewer.",
  },
  gravegain2d: {
    endless: "March raiders drop them on floors 5-11.",
    mission: "Reward for Trail Cook mission 5.",
    mmorpg: "Cheap and quick on the night market.",
  },
  gravegain3d: {
    endless: "War-camp scouts drop them in vaults 7-13.",
    mission: "Reward for Vanguard Mess delve 3.",
    mmorpg: "Runner favorite; always in demand.",
  },
};

const RONIN_SUSHI_NOTES: DropNotes = {
  gravegain1d: {
    endless: "River duelists drop it on floors 8-12.",
    mission: "Reward for Still Water mission 7.",
    mmorpg: "Master chefs auction cut sets weekly.",
  },
  gravegain2d: {
    endless: "Blade ronin drop it on floors 10-16.",
    mission: "Reward for Lone Blade mission 6.",
    mmorpg: "High-price delicacy at port markets.",
  },
  gravegain3d: {
    endless: "Tide wardens drop it in vaults 14-22.",
    mission: "Reward for Moonlit Dock delve 9.",
    mmorpg: "Collectors pay premium for full sets.",
  },
};

const GOLDEN_SHRIMP_NOTES: DropNotes = {
  gravegain1d: {
    endless: "Pond skitterers drop it on floors 2-6.",
    mission: "Reward for Reed Bank mission 3.",
    mmorpg: "Fry-stands trade it by the basket.",
  },
  gravegain2d: {
    endless: "Tide snappers drop it on floors 6-12.",
    mission: "Reward for Brine Run mission 4.",
    mmorpg: "Brisk seller at festival stalls.",
  },
  gravegain3d: {
    endless: "Abyss prawns drop it in vaults 9-15.",
    mission: "Reward for Sunken Net delve 5.",
    mmorpg: "Exported salted to inland traders.",
  },
};

const VORTEX_CAKE_NOTES: DropNotes = {
  gravegain1d: {
    endless: "Whirlpool wisps drop it on floors 4-9.",
    mission: "Reward for Spiral Pool mission 3.",
    mmorpg: "Tea houses bundle it with garden tea.",
  },
  gravegain2d: {
    endless: "Current callers drop it on floors 7-13.",
    mission: "Reward for Hypnotic Eddy mission 5.",
    mmorpg: "Scholars buy it before long studies.",
  },
  gravegain3d: {
    endless: "Maelstrom monks drop it in vaults 11-17.",
    mission: "Reward for Still Center delve 6.",
    mmorpg: "Gift-boxed at holiday bazaars.",
  },
};

const MOON_CAKE_NOTES: DropNotes = {
  gravegain1d: {
    endless: "Lunar moths drop it on floors 7-11.",
    mission: "Reward for Harvest Moon mission 6.",
    mmorpg: "Festival vendors stamp each box.",
  },
  gravegain2d: {
    endless: "Night bakers drop it on floors 10-16.",
    mission: "Reward for Lantern Rite mission 8.",
    mmorpg: "Sought by lore collectors each season.",
  },
  gravegain3d: {
    endless: "Eclipse heralds drop it in vaults 15-23.",
    mission: "Reward for Pale Vigil delve 10.",
    mmorpg: "Auction houses move whole mooncake sets.",
  },
};

const FESTIVAL_SKEWERS_NOTES: DropNotes = {
  gravegain1d: {
    endless: "Paper-lantern sprites drop them on floors 3-8.",
    mission: "Reward for Night Market mission 2.",
    mmorpg: "Night-market signature street snack.",
  },
  gravegain2d: {
    endless: "Drummer imps drop them on floors 6-12.",
    mission: "Reward for Lantern Parade mission 5.",
    mmorpg: "Sold in tri-color festival bundles.",
  },
  gravegain3d: {
    endless: "Revel wardens drop them in vaults 8-14.",
    mission: "Reward for Grand Carnival delve 4.",
    mmorpg: "Tourist favorite; prices spike at fairs.",
  },
};

const POCKET_DUMPLING_NOTES: DropNotes = {
  gravegain1d: {
    endless: "Cellar mice drop them on floors 1-5.",
    mission: "Reward for Warm Hearth mission 1.",
    mmorpg: "Grandmother stalls sell them steaming.",
  },
  gravegain2d: {
    endless: "Pleated goblins drop them on floors 4-9.",
    mission: "Reward for Dumpling Run mission 3.",
    mmorpg: "Pocket meals for dungeon commuters.",
  },
  gravegain3d: {
    endless: "Steam elementals drop them in vaults 6-12.",
    mission: "Reward for Pleat and Fold delve 2.",
    mmorpg: "Frozen packs move in bulk caravans.",
  },
};

const FORTUNE_COOKIE_NOTES: DropNotes = {
  gravegain1d: {
    endless: "Oracle bats drop them on floors 5-10.",
    mission: "Reward for Cracked Seal mission 4.",
    mmorpg: "Seers tuck custom fortunes inside.",
  },
  gravegain2d: {
    endless: "Prophet moths drop them on floors 8-14.",
    mission: "Reward for Paper Omen mission 6.",
    mmorpg: "Party favor at guild oath ceremonies.",
  },
  gravegain3d: {
    endless: "Fate weavers drop them in vaults 13-19.",
    mission: "Reward for Written Stars delve 7.",
    mmorpg: "Rare prophecies fetch collector prices.",
  },
};

export const GRAVE_GAIN_FOOD_BATCH_10: GraveGainFoodItemDef[] = [
  makeItem("ash-potato", ASH_POTATO_NOTES),
  makeItem("skewer-sticks", SKEWER_STICKS_NOTES),
  makeItem("ronin-sushi", RONIN_SUSHI_NOTES),
  makeItem("golden-shrimp", GOLDEN_SHRIMP_NOTES),
  makeItem("vortex-cake", VORTEX_CAKE_NOTES),
  makeItem("moon-cake", MOON_CAKE_NOTES),
  makeItem("festival-skewers", FESTIVAL_SKEWERS_NOTES),
  makeItem("pocket-dumpling", POCKET_DUMPLING_NOTES),
  makeItem("fortune-cookie", FORTUNE_COOKIE_NOTES),
];
