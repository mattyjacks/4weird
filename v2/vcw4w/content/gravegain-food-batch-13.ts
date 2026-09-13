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
    gravegain4d: {
      endless: "Dream fairway book-bunkers hide bars; caddie shades drop them on holes 4-7.",
      mission: "Mission 9 Library Putt reward for sinking the study goal.",
      mmorpg: "Fairway bookstalls trade bars near the W-hazard clubhouse.",
    },
    gravegain5d: {
      endless: "Prime-universe archive echoes drop it; bloom hops scatter more.",
      mission: "Mission 8 Scholar Paradox reward across one echo hop.",
      mmorpg: "Echo-market scribes trade bars for universe maps.",
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
    gravegain4d: {
      endless: "Dream fairway candy traps spill it; goblin caddies drop it on holes 1-4.",
      mission: "Mission 3 Candy Putt reward for clearing the sweet goal.",
      mmorpg: "Caddie carts sell pocket candy near the W-hazard stand.",
    },
    gravegain5d: {
      endless: "Echo-universe pickpocket imps drop it across two hops.",
      mission: "Mission 2 Pocket Paradox reward for a quick hop run.",
      mmorpg: "Void-market stalls trade candy in bulk hopper packs.",
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
    gravegain4d: {
      endless: "Dream fairway swirl bunkers hide pops; spiral moles drop them on holes 2-5.",
      mission: "Mission 4 Spiral Putt reward at the midway goal.",
      mmorpg: "Midway fairway carts trade swirl pops by the W-hazard.",
    },
    gravegain5d: {
      endless: "Dream-universe carnival echoes drop pops along bloom hops.",
      mission: "Mission 5 Spiral Paradox reward across the echo hop.",
      mmorpg: "Bloom-market vendors swirl-trade pops for hop tokens.",
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
    gravegain4d: {
      endless: "Dream fairway pudding traps wobble; custard caddies drop cups on holes 3-6.",
      mission: "Mission 4 Dessert Putt reward for the caramel goal.",
      mmorpg: "Clubhouse dessert carts trade cups past the W-hazard.",
    },
    gravegain5d: {
      endless: "Prime-universe pantry oozes drop cups; static hops hide more.",
      mission: "Mission 4 Caramel Paradox reward after two hops.",
      mmorpg: "Dream-market creameries trade pudding cups for hop maps.",
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
    gravegain4d: {
      endless: "Dream fairway hive bunkers buzz; honey-trap bees drop jars on holes 5-8.",
      mission: "Mission 6 Honey Putt reward for sinking the hive goal.",
      mmorpg: "Fairway honey stalls sell golden jars by the W-hazard.",
    },
    gravegain5d: {
      endless: "Bloom-universe hive echoes drop jars across echo hops.",
      mission: "Mission 6 Hive Paradox reward for three sweet hops.",
      mmorpg: "Prime-market beekeepers bulk-trade jars to hoppers.",
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
    gravegain4d: {
      endless: "Dream fairway nursery rough hides bottles; den sprites drop them on holes 2-5.",
      mission: "Mission 4 Whelp Putt reward for the gentle goal.",
      mmorpg: "Caddie nursery carts trade bottles near the W-hazard.",
    },
    gravegain5d: {
      endless: "Echo-universe den mothers drop bottles along void hops.",
      mission: "Mission 5 Nursery Paradox reward across one soft hop.",
      mmorpg: "Static-market caretakers trade bottles for hop blankets.",
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
    gravegain4d: {
      endless: "Dream fairway meadow bunkers graze herds; moss caddies drop cans on holes 1-4.",
      mission: "Mission 2 Dairy Putt reward for the pasture goal.",
      mmorpg: "Fairway dairy carts sell cold cans past the W-hazard.",
    },
    gravegain5d: {
      endless: "Prime-universe cavern grazers drop cans; dream hops add more.",
      mission: "Mission 2 Pasture Paradox reward after a short hop.",
      mmorpg: "Echo-market dairies bulk-trade cans to universe hoppers.",
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
    gravegain4d: {
      endless: "Dream fairway night bunkers hide brews; sentry owls drop cups on holes 3-6.",
      mission: "Mission 3 Night-Watch Putt reward for the vigil goal.",
      mmorpg: "Night-shift caddie stalls trade brew by the W-hazard.",
    },
    gravegain5d: {
      endless: "Void-universe night sentries drop brews across static hops.",
      mission: "Mission 3 Vigil Paradox reward spanning two hops.",
      mmorpg: "Prime-market night crews bulk-buy brews for hoppers.",
    },
  }),
];
