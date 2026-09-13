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

type ExtraGame = "gravegain4d" | "gravegain5d";
type DropNotes = Record<
  GraveGainFoodGame | ExtraGame,
  Record<GraveGainFoodMode, string>
>;

const EXTRA_GAMES: ExtraGame[] = ["gravegain4d", "gravegain5d"];

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
  for (const game of EXTRA_GAMES) {
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
  gravegain4d: {
    endless: "Dream fairway bunkers hide ash-potatoes; sand-trap moles drop them.",
    mission: "Reward for Bunker Putt mission 5 on the dream fairway.",
    mmorpg: "Caddie stalls trade them near the W-hazard clubhouse.",
  },
  gravegain5d: {
    endless: "Prime-universe ember foes drop it; echo hops scatter more.",
    mission: "Reward for Ember Paradox mission 4 across two hops.",
    mmorpg: "Void-market vendors bundle it for universe hoppers.",
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
  gravegain4d: {
    endless: "Dream fairway grill sprites drop skewers near hole 3 W-hazard.",
    mission: "Reward for Picnic Putt mission 2 by the fairway grill.",
    mmorpg: "Fairway snack carts sell skewer stacks to putters.",
  },
  gravegain5d: {
    endless: "Bloom-universe trail raiders drop them across one hop.",
    mission: "Reward for Skewer Paradox mission 3 in echo universe.",
    mmorpg: "Static-market traders flip bundles to traveling cooks.",
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
  gravegain4d: {
    endless: "Dream fairway pond duelists drop sushi by the water hazard.",
    mission: "Reward for Stillwater Putt mission 7 at hole 9.",
    mmorpg: "Clubhouse sushi bar auctions fresh sets to golfers.",
  },
  gravegain5d: {
    endless: "Dream-universe blade ronin drop it after void hops.",
    mission: "Reward for Lone Tide Paradox mission 6 in prime universe.",
    mmorpg: "Echo-market collectors pay premium for full sushi sets.",
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
  gravegain4d: {
    endless: "Dream fairway creek skitterers drop shrimp near putt goals.",
    mission: "Reward for Creekside Putt mission 3 past the W-hazard.",
    mmorpg: "Pondside vendors trade baskets at the turn clubhouse.",
  },
  gravegain5d: {
    endless: "Prime-universe reef darters drop it; bloom hops hide more.",
    mission: "Reward for Golden Current mission 4 with one paradox hop.",
    mmorpg: "Dream-market fry stands sell baskets to hoppers.",
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
  gravegain4d: {
    endless: "Dream fairway whirlpool hazard wisps drop swirl cakes.",
    mission: "Reward for Spiral Putt mission 3 on the looping green.",
    mmorpg: "Fairway tea houses bundle cake with caddie tea.",
  },
  gravegain5d: {
    endless: "Void-universe eddy callers drop it across echo hops.",
    mission: "Reward for Still Center Paradox mission 5 in dream universe.",
    mmorpg: "Static-market scholars buy slices before long hops.",
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
  gravegain4d: {
    endless: "Dream fairway lunar moths drop mooncakes by hole 12.",
    mission: "Reward for Moonlit Putt mission 6 under fairway lights.",
    mmorpg: "Clubhouse bakery stamps each box for golf festivals.",
  },
  gravegain5d: {
    endless: "Echo-universe night bakers drop it after two hops.",
    mission: "Reward for Pale Vigil Paradox mission 8 in void universe.",
    mmorpg: "Bloom-market auction houses move whole mooncake sets.",
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
  gravegain4d: {
    endless: "Dream fairway lantern sprites drop skewers along hole 5.",
    mission: "Reward for Lantern Putt mission 2 at the festival green.",
    mmorpg: "Fairway night stalls sell tri-color bundles to fans.",
  },
  gravegain5d: {
    endless: "Static-universe drummer imps drop them across parade hops.",
    mission: "Reward for Carnival Paradox mission 5 in bloom universe.",
    mmorpg: "Prime-market tourists bid high during hop festivals.",
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
  gravegain4d: {
    endless: "Dream fairway cellar mice drop dumplings near putt goals.",
    mission: "Reward for Cozy Putt mission 1 by the W-hazard hearth.",
    mmorpg: "Caddie grandmothers sell them steaming at the turn.",
  },
  gravegain5d: {
    endless: "Prime-universe pleated goblins drop them after one hop.",
    mission: "Reward for Folded Paradox mission 3 in echo universe.",
    mmorpg: "Void-market caravans move frozen packs between universes.",
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
  gravegain4d: {
    endless: "Dream fairway oracle bats drop fortunes past W-hazards.",
    mission: "Reward for Lucky Putt mission 4 at the wishing green.",
    mmorpg: "Fairway seers tuck custom putt fortunes inside.",
  },
  gravegain5d: {
    endless: "Dream-universe fate weavers drop them across static hops.",
    mission: "Reward for Written Stars Paradox mission 7 in void universe.",
    mmorpg: "Echo-market collectors pay well for rare prophecies.",
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
