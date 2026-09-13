// GraveGain food batch 13: scholar-chocolate ... watch-coffee (roster idx 104-111).
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

export const GRAVE_GAIN_FOOD_BATCH_13: GraveGainFoodItemDef[] = [
  buildItem("scholar-chocolate", {
    gravegain1d: {
      endless: "Archive scribes drop it on floors 3-6.",
      mission: "Mission 7 library sweep reward.",
      mmorpg: "Scholar focus bar; steady market trade.",
    },
    gravegain2d: {
      endless: "Ink shades drop it on floors 4-7.",
      mission: "Mission 8 study-hall defense reward.",
      mmorpg: "Mind-sharpening sweet; scribes pay well.",
    },
    gravegain3d: {
      endless: "Tome wardens drop it in vault 2-4.",
      mission: "Mission 6 grand archive reward cache.",
      mmorpg: "Tradable scholar staple; fair price.",
    },
  }),
  buildItem("pocket-candy", {
    gravegain1d: {
      endless: "Goblin pickpockets drop it on floors 1-4.",
      mission: "Mission 2 candy-cart escort reward.",
      mmorpg: "Cheap sprint sweet; bulk market deals.",
    },
    gravegain2d: {
      endless: "Sugar imps drop it on floors 2-5.",
      mission: "Mission 3 market errand reward.",
      mmorpg: "Pocket-sized haste; trades in stacks.",
    },
    gravegain3d: {
      endless: "Vending mimics drop it in vault 1-2.",
      mission: "Mission 2 concession row reward.",
      mmorpg: "Quick sugar rush; low-price trade.",
    },
  }),
  buildItem("spiral-lollipop", {
    gravegain1d: {
      endless: "Carnival shades drop it on floors 2-5.",
      mission: "Mission 4 midway marvel reward.",
      mmorpg: "Hypnotic focus pop; fun market flip.",
    },
    gravegain2d: {
      endless: "Swirl wisps drop it on floors 3-6.",
      mission: "Mission 5 night-market prize.",
      mmorpg: "Stare-and-focus treat; sells fast.",
    },
    gravegain3d: {
      endless: "Spiral sentries drop it in vault 1-3.",
      mission: "Mission 3 hall of mirrors reward.",
      mmorpg: "Tradable focus candy; steady demand.",
    },
  }),
  buildItem("caramel-pudding", {
    gravegain1d: {
      endless: "Pantry oozes drop it on floors 2-5.",
      mission: "Mission 4 dessert cellar reward.",
      mmorpg: "Gentle heal cup; cozy market trade.",
    },
    gravegain2d: {
      endless: "Custard cubes drop it on floors 3-6.",
      mission: "Mission 5 banquet kitchen reward.",
      mmorpg: "Soothing sweet; sells in small lots.",
    },
    gravegain3d: {
      endless: "Amber slimes drop it in vault 2-3.",
      mission: "Mission 4 caramel vault reward.",
      mmorpg: "Wobbling comfort food; fair price.",
    },
  }),
  buildItem("golden-honey", {
    gravegain1d: {
      endless: "Hive drones drop it on floors 3-6.",
      mission: "Mission 6 hive vault harvest reward.",
      mmorpg: "Liquid gold heal; premium market jars.",
    },
    gravegain2d: {
      endless: "Honey guardians drop it on floors 4-7.",
      mission: "Mission 7 apiary defense reward.",
      mmorpg: "Beekeeper gold; guilds buy in bulk.",
    },
    gravegain3d: {
      endless: "Amber queens drop it in vault 3-5.",
      mission: "Mission 6 deep-hive bounty reward.",
      mmorpg: "Top-tier honey pot; high resale.",
    },
  }),
  buildItem("whelp-bottle", {
    gravegain1d: {
      endless: "Nursery sprites drop it on floors 2-5.",
      mission: "Mission 4 whelp rescue reward.",
      mmorpg: "Gentle care milk; caretakers trade it.",
    },
    gravegain2d: {
      endless: "Den mothers drop it on floors 3-6.",
      mission: "Mission 5 nursery guard reward.",
      mmorpg: "Pure comfort feed; steady market.",
    },
    gravegain3d: {
      endless: "Brood keepers drop it in vault 1-3.",
      mission: "Mission 3 hatchling creche reward.",
      mmorpg: "Tradable nursery staple; fair price.",
    },
  }),
  buildItem("cave-milk", {
    gravegain1d: {
      endless: "Mossback grazers drop it on floors 1-4.",
      mission: "Mission 2 dairy cave reward.",
      mmorpg: "Everyday bone-strong milk; cheap trade.",
    },
    gravegain2d: {
      endless: "Stalactite herds drop it on floors 2-5.",
      mission: "Mission 3 milking-round reward.",
      mmorpg: "Staple heal drink; bulk market cans.",
    },
    gravegain3d: {
      endless: "Cavern aurochs drop it in vault 1-2.",
      mission: "Mission 2 deep-pasture reward.",
      mmorpg: "Simple strong bones; always in demand.",
    },
  }),
  buildItem("watch-coffee", {
    gravegain1d: {
      endless: "Night sentries drop it on floors 2-5.",
      mission: "Mission 3 night-watch shift reward.",
      mmorpg: "Sentry brew; night crews pay well.",
    },
    gravegain2d: {
      endless: "Beacon keepers drop it on floors 3-6.",
      mission: "Mission 4 lighthouse vigil reward.",
      mmorpg: "Black-brew haste; brisk market trade.",
    },
    gravegain3d: {
      endless: "Vigil wardens drop it in vault 2-4.",
      mission: "Mission 5 endless vigil reward.",
      mmorpg: "Watch-officer fuel; guilds stock it.",
    },
  }),
];
