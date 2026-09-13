// GraveGain food batch 08: nest-egg ... churned-butter (roster idx 62-70).
// Numbers via buildFoodStatsTable(); blurbs copied by spread (never retyped).

import {
  buildFoodStatsTable,
  type GraveGainFoodGame,
  type GraveGainFoodItemDef,
  type GraveGainFoodMode,
} from "@/lib/gravegain-food";
import { GRAVEGAIN_FOOD_ROSTER } from "./gravegain-food-roster";

type NoteGrid = Record<GraveGainFoodGame, Record<GraveGainFoodMode, string>>;

function buildItem(id: string, notes: NoteGrid): GraveGainFoodItemDef {
  const entry = GRAVEGAIN_FOOD_ROSTER.find((e) => e.id === id);
  if (!entry) throw new Error(`missing roster entry ${id}`);
  const stats = buildFoodStatsTable(entry.effect, entry.tier);
  (Object.keys(notes) as GraveGainFoodGame[]).forEach((game) => {
    (Object.keys(notes[game]) as GraveGainFoodMode[]).forEach((mode) => {
      stats[game][mode] = { ...stats[game][mode], note: notes[game][mode] };
    });
  });
  return { ...entry, stats };
}

export const GRAVE_GAIN_FOOD_BATCH_08: GraveGainFoodItemDef[] = [
  buildItem("nest-egg", {
    gravegain1d: {
      endless: "Roost-pen hens drop it on floors 1-3.",
      mission: "Mission 4 side reward for chick rescue.",
      mmorpg: "Cheap market staple; new cooks trade it.",
    },
    gravegain2d: {
      endless: "Clutch nests drop it on floors 2-5.",
      mission: "Mission 6 farm defense bonus reward.",
      mmorpg: "Bulk-listed breakfast base on market.",
    },
    gravegain3d: {
      endless: "Hatchery drones drop it in vault 1-2.",
      mission: "Mission 3 hatchery sweep reward cache.",
      mmorpg: "Tradable starter protein; fair price.",
    },
  }),
  buildItem("skillet-eggs", {
    gravegain1d: {
      endless: "Camp skillets drop it on floors 2-4.",
      mission: "Mission 5 breakfast rush clear reward.",
      mmorpg: "Morning buff food; steady market sales.",
    },
    gravegain2d: {
      endless: "Goblin cooks drop it on floors 3-6.",
      mission: "Mission 7 mess-hall defense reward.",
      mmorpg: "Listed as fighter fuel; trades fast.",
    },
    gravegain3d: {
      endless: "Mess automatons drop it in vault 2-3.",
      mission: "Mission 4 canteen relight reward.",
      mmorpg: "Power-snack staple on dungeon market.",
    },
  }),
  buildItem("crew-pan", {
    gravegain1d: {
      endless: "Warchief guards drop it past floor 8.",
      mission: "Mission 12 grand feast finale reward.",
      mmorpg: "Rare raid platter; high market value.",
    },
    gravegain2d: {
      endless: "Banquet mimics drop it on floors 9-12.",
      mission: "Mission 14 crew banquet reward.",
      mmorpg: "Prestige feast; guilds bid for it.",
    },
    gravegain3d: {
      endless: "Galley lords drop it in vault 5-7.",
      mission: "Mission 11 flagship galley reward.",
      mmorpg: "Top-tier tradable feast centerpiece.",
    },
  }),
  buildItem("hearth-pot", {
    gravegain1d: {
      endless: "Hearth keepers drop it on floors 4-7.",
      mission: "Mission 8 hearth relight reward.",
      mmorpg: "Cozy feast pot; steady market trade.",
    },
    gravegain2d: {
      endless: "Stew golems drop it on floors 5-8.",
      mission: "Mission 9 winter kitchen reward.",
      mmorpg: "Party-share meal; fairly priced.",
    },
    gravegain3d: {
      endless: "Ember wardens drop it in vault 3-4.",
      mission: "Mission 7 deep-hearth quest reward.",
      mmorpg: "Tradable comfort feast; sells well.",
    },
  }),
  buildItem("melt-fondue", {
    gravegain1d: {
      endless: "Cheese wardens drop it on floors 4-6.",
      mission: "Mission 8 dairy vault clear reward.",
      mmorpg: "Dippable ward feast; market favorite.",
    },
    gravegain2d: {
      endless: "Fondue pots drop it on floors 5-8.",
      mission: "Mission 9 molten cellar reward.",
      mmorpg: "Social feast dish; trades briskly.",
    },
    gravegain3d: {
      endless: "Magma sommeliers drop it in vault 3-5.",
      mission: "Mission 6 cheese-forge reward cache.",
      mmorpg: "Warding delicacy; good resale value.",
    },
  }),
  buildItem("trail-bowl", {
    gravegain1d: {
      endless: "Trail scouts drop it on floors 2-5.",
      mission: "Mission 5 supply route reward.",
      mmorpg: "Cheap cozy heal; bulk market deals.",
    },
    gravegain2d: {
      endless: "Camp porters drop it on floors 3-6.",
      mission: "Mission 6 waystation rest reward.",
      mmorpg: "Wanderer staple; trades in stacks.",
    },
    gravegain3d: {
      endless: "Ration bots drop it in vault 1-3.",
      mission: "Mission 4 trail resupply reward.",
      mmorpg: "Budget heal bowl; always in demand.",
    },
  }),
  buildItem("scout-salad", {
    gravegain1d: {
      endless: "Garden sprites drop it on floors 3-6.",
      mission: "Mission 7 herb garden reward.",
      mmorpg: "Focus greens; scouts pay well.",
    },
    gravegain2d: {
      endless: "Forager wasps drop it on floors 4-7.",
      mission: "Mission 8 grove survey reward.",
      mmorpg: "Mind-clearing dish; steady market.",
    },
    gravegain3d: {
      endless: "Hydro wardens drop it in vault 2-4.",
      mission: "Mission 5 greenhouse sweep reward.",
      mmorpg: "Tradable focus food; fair price.",
    },
  }),
  buildItem("watch-popcorn", {
    gravegain1d: {
      endless: "Watch imps drop it on floors 1-4.",
      mission: "Mission 3 night-watch reward.",
      mmorpg: "Cheap focus snack; fun market flip.",
    },
    gravegain2d: {
      endless: "Ember poppers drop it on floors 2-5.",
      mission: "Mission 4 watchtower duty reward.",
      mmorpg: "Light tradable snack; sells fast.",
    },
    gravegain3d: {
      endless: "Signal sentries drop it in vault 1-2.",
      mission: "Mission 2 lookout shift reward.",
      mmorpg: "Popularity snack; low-price trade.",
    },
  }),
  buildItem("churned-butter", {
    gravegain1d: {
      endless: "Dairy golems drop it on floors 2-5.",
      mission: "Mission 5 churn-house reward.",
      mmorpg: "Slick ward spread; dairy market hub.",
    },
    gravegain2d: {
      endless: "Cream oozes drop it on floors 3-6.",
      mission: "Mission 6 pasture guard reward.",
      mmorpg: "Ward staple; trades in gilt packs.",
    },
    gravegain3d: {
      endless: "Churn automatons drop it in vault 2-3.",
      mission: "Mission 4 creamery restart reward.",
      mmorpg: "Rich ward food; stable market price.",
    },
  }),
];
