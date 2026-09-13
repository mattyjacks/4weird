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
    gravegain4d: {
      endless: "Dream fairway floors 1-3: roost-hen caddies drop eggs by W-nests.",
      mission: "Mission Nest Putt putt-goal reward: a speckled nest egg.",
      mmorpg: "Cheap clubhouse staple; rookie traders swap eggs.",
    },
    gravegain5d: {
      endless: "Prime universe lanes 1-3: clutch sprites drop eggs via echo hops.",
      mission: "Mission Chick Hop rescue reward: a warm nest egg.",
      mmorpg: "Starter-protein market; void stalls trade eggs fairly.",
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
    gravegain4d: {
      endless: "Dream fairway floors 2-4: camp-cook caddies drop skillets past W-ash.",
      mission: "Mission Breakfast Birdie putt-goal reward: sizzling skillet eggs.",
      mmorpg: "Morning fairway buff food; clubhouse sales stay steady.",
    },
    gravegain5d: {
      endless: "Echo universe lanes 2-4: goblin cooks drop skillets through dream hops.",
      mission: "Mission Mess-Hall Hop reward: a hot skillet of eggs.",
      mmorpg: "Fighter-fuel market; bloom vendors flip skillets fast.",
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
    gravegain4d: {
      endless: "Dream fairway floors 8-12: warchief caddies drop feast pans at W-crown.",
      mission: "Mission Champion's Feast putt-goal reward: a grand crew pan.",
      mmorpg: "Rare clubhouse platter; fairway guilds bid high.",
    },
    gravegain5d: {
      endless: "Void universe lanes 8-12: banquet mimics drop pans across static hops.",
      mission: "Mission Grand Banquet Hop reward: a flagship crew pan.",
      mmorpg: "Prestige cross-universe feast; prime guilds bid for it.",
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
    gravegain4d: {
      endless: "Dream fairway floors 4-7: hearth-keeper caddies drop pots by W-embers.",
      mission: "Mission Ember Putt putt-goal reward: a cozy hearth pot.",
      mmorpg: "Cozy clubhouse pot; fairway traders swap servings.",
    },
    gravegain5d: {
      endless: "Dream universe lanes 4-7: stew golems drop pots via bloom hops.",
      mission: "Mission Deep-Hearth Hop reward: a bubbling hearth pot.",
      mmorpg: "Comfort-feast market; echo stalls sell pots well.",
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
    gravegain4d: {
      endless: "Dream fairway floors 4-6: cheese-warden caddies drop fondue at W-dip.",
      mission: "Mission Molten Birdie putt-goal reward: a melty fondue pot.",
      mmorpg: "Dippable clubhouse feast; fairway market favorite.",
    },
    gravegain5d: {
      endless: "Bloom universe lanes 4-6: fondue sprites drop pots across echo hops.",
      mission: "Mission Cheese-Forge Hop reward: a golden fondue cache.",
      mmorpg: "Social cross-universe dish; static traders bid briskly.",
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
    gravegain4d: {
      endless: "Dream fairway floors 2-5: trail-scout caddies drop bowls near W-tuft.",
      mission: "Mission Supply Putt putt-goal reward: a hearty trail bowl.",
      mmorpg: "Cheap cozy heal; clubhouse bulk deals move fast.",
    },
    gravegain5d: {
      endless: "Prime universe lanes 2-5: porter ghosts drop bowls via void hops.",
      mission: "Mission Waystation Hop reward: a warm trail bowl.",
      mmorpg: "Budget heal market; dream vendors sell bowls daily.",
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
    gravegain4d: {
      endless: "Dream fairway floors 3-6: garden-sprite caddies drop salads by W-green.",
      mission: "Mission Herb Green putt-goal reward: a crisp scout salad.",
      mmorpg: "Focus greens market; fairway scouts pay well.",
    },
    gravegain5d: {
      endless: "Echo universe lanes 3-6: forager wasps drop salads through bloom hops.",
      mission: "Mission Grove Survey Hop reward: a fresh scout salad.",
      mmorpg: "Mind-clearing cross-universe dish; steady trade.",
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
    gravegain4d: {
      endless: "Dream fairway floors 1-4: watch-imp caddies drop popcorn at W-tower.",
      mission: "Mission Night-Watch Putt putt-goal reward: buttery popcorn.",
      mmorpg: "Cheap focus snack; clubhouse flips sell fast.",
    },
    gravegain5d: {
      endless: "Static universe lanes 1-4: ember poppers drop corn via prime hops.",
      mission: "Mission Lookout Hop reward: a crunchy popcorn bucket.",
      mmorpg: "Popularity-snack market; echo stalls trade it cheap.",
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
    gravegain4d: {
      endless: "Dream fairway floors 2-5: dairy-golem caddies drop butter by W-churn.",
      mission: "Mission Churn House putt-goal reward: a golden butter block.",
      mmorpg: "Slick clubhouse spread; fairway dairy hub restocks.",
    },
    gravegain5d: {
      endless: "Dream universe lanes 2-5: cream oozes drop butter through void hops.",
      mission: "Mission Pasture Hop reward: fresh churned butter, paradox smooth.",
      mmorpg: "Rich ward-food market; bloom packs trade at gilt prices.",
    },
  }),
];
