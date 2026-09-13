// GraveGain food batch 14: roster idx 112-119 (v2 layer).
//
// Seer brews and cellar juices — fantasy teas, tonics, ciders and punches
// (kid-safe juice/cider/tonic tone, no alcohol words). Each item spreads its
// roster entry (emoji codepoints never retyped) and carries a full
// gravegain1d/2d/3d x endless/mission/mmorpg table from buildFoodStatsTable()
// plus a drop note per cell: endless = floors/foes, mission = mission reward,
// mmorpg = market/trade note.

import {
  GRAVEGAIN_FOOD_GAMES,
  GRAVEGAIN_FOOD_MODES,
  buildFoodStatsTable,
} from "@/lib/gravegain-food";
import type {
  GraveGainFoodGame,
  GraveGainFoodItemDef,
  GraveGainFoodMode,
} from "@/lib/gravegain-food";
import { GRAVEGAIN_FOOD_ROSTER } from "./gravegain-food-roster";

type BatchNotes = Record<GraveGainFoodGame, Record<GraveGainFoodMode, string>>;

function makeFoodItem(id: string, notes: BatchNotes): GraveGainFoodItemDef {
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

export const GRAVE_GAIN_FOOD_BATCH_14: GraveGainFoodItemDef[] = [
  makeFoodItem("seer-teapot", {
    gravegain1d: {
      endless: "Floors 6-10 seer apprentices drop fragrant tea leaves.",
      mission: "Mission 12 scout reward for spotting wisp ambushes.",
      mmorpg: "Tea-house stalls trade full pots for crypt herbs.",
    },
    gravegain2d: {
      endless: "Floors 11-16 fortune-teller wraiths drop rare leaves.",
      mission: "Mission 18 oracle escort grants a fortune blend.",
      mmorpg: "Auction rows list seer blends; tasting tips sell fast.",
    },
    gravegain3d: {
      endless: "Deep floors 20-28 oracle guardians drop grand leaves.",
      mission: "Mission 24 vision quest rewards a grand teapot.",
      mmorpg: "Guild tea rooms brew shared pots for dungeon maps.",
    },
  }),
  makeFoodItem("garden-tea", {
    gravegain1d: {
      endless: "Floors 3-7 garden sprites drop fresh-picked tea buds.",
      mission: "Mission 8 herb-garden defense rewards a green cup.",
      mmorpg: "Market gardeners swap tea bricks for flower seeds.",
    },
    gravegain2d: {
      endless: "Floors 9-14 moss wardens drop whisked garden blends.",
      mission: "Mission 15 greenhouse patrol grants a foamy cup.",
      mmorpg: "Corner tea carts sell calm cups for pocket coins.",
    },
    gravegain3d: {
      endless: "Deep floors 18-24 overgrown sentries drop rich buds.",
      mission: "Mission 22 hedge-maze sweep rewards a garden caddy.",
      mmorpg: "Herb guilds auction shade-grown lots to tea fans.",
    },
  }),
  makeFoodItem("rice-tonic", {
    gravegain1d: {
      endless: "Floors 4-8 paddy imps drop warm cups of rice tonic.",
      mission: "Mission 9 mill-race delivery rewards a smooth cup.",
      mmorpg: "Harbor stalls trade rice tonic for salted crackers.",
    },
    gravegain2d: {
      endless: "Floors 10-15 river-mist spirits drop mellow bottles.",
      mission: "Mission 16 terraced-field run grants a tonic set.",
      mmorpg: "Bathhouse vendors sell steaming cups to tired divers.",
    },
    gravegain3d: {
      endless: "Deep floors 19-25 drowned millers drop aged tonic.",
      mission: "Mission 23 grain-vault raid rewards a brewmaster cup.",
      mmorpg: "Merchant caravans bundle tonic with festival snacks.",
    },
  }),
  makeFoodItem("victory-cider", {
    gravegain1d: {
      endless: "Floors 7-11 cheering boss crowds toss cider bottles.",
      mission: "Mission 13 first-boss rematch rewards a fizzy toast.",
      mmorpg: "Plaza vendors sell celebration cider by the crate.",
    },
    gravegain2d: {
      endless: "Floors 12-17 triumph heralds drop sparkling cider.",
      mission: "Mission 19 arena crown rewards a cork-popping feast.",
      mmorpg: "Party planners bulk-buy cider for guild victories.",
    },
    gravegain3d: {
      endless: "Deep floors 21-29 champion shades drop golden cider.",
      mission: "Mission 25 throne-room clear grants a vintage toast.",
      mmorpg: "Auctioneers list boss-sealed cider for trophy halls.",
    },
  }),
  makeFoodItem("ember-juice", {
    gravegain1d: {
      endless: "Floors 5-9 ember bats drop dark berry juice jars.",
      mission: "Mission 11 cellar-shelf hunt rewards a fine glass.",
      mmorpg: "Juice presses swap dark blends for sweet berries.",
    },
    gravegain2d: {
      endless: "Floors 10-16 scheming cultists drop bottled blends.",
      mission: "Mission 17 masquerade infiltration grants a reserve.",
      mmorpg: "Night-market sommeliers trade tasting flights cheap.",
    },
    gravegain3d: {
      endless: "Deep floors 20-26 ash vintners drop smoky reserves.",
      mission: "Mission 24 vineyard vault rewards a schemer goblet.",
      mmorpg: "Collector clubs bid on ember vintages every weekend.",
    },
  }),
  makeFoodItem("frost-tonic", {
    gravegain1d: {
      endless: "Floors 5-9 frost mites drop ice-cold citrus tonics.",
      mission: "Mission 10 chill-cavern dash rewards a frosty sip.",
      mmorpg: "Ice carts sell frost tonic with twist garnishes.",
    },
    gravegain2d: {
      endless: "Floors 11-15 glacier sprinters drop tall chilled cups.",
      mission: "Mission 17 frozen relay rewards a double-chill cup.",
      mmorpg: "Rink-side stands bundle tonic with skate rentals.",
    },
    gravegain3d: {
      endless: "Deep floors 19-27 blizzard heralds drop storm tonics.",
      mission: "Mission 23 whiteout climb grants a crystal goblet.",
      mmorpg: "Expedition outfitters stock frost tonic for long treks.",
    },
  }),
  makeFoodItem("tide-punch", {
    gravegain1d: {
      endless: "Floors 4-8 beach crabs drop fruity island punch.",
      mission: "Mission 9 dockside cookout rewards a punch bowl.",
      mmorpg: "Boardwalk bars trade punch cups for shiny shells.",
    },
    gravegain2d: {
      endless: "Floors 10-14 tide callers drop umbrella-topped cups.",
      mission: "Mission 16 lagoon rescue grants a vacation cooler.",
      mmorpg: "Festival boats sell punch flights to day sailors.",
    },
    gravegain3d: {
      endless: "Deep floors 18-26 drowned corsairs drop coral punch.",
      mission: "Mission 22 sunken-grotto dive rewards a pearl cup.",
      mmorpg: "Resort guilds import island punch for beach parties.",
    },
  }),
  makeFoodItem("barley-brew", {
    gravegain1d: {
      endless: "Floors 4-8 dwarf trainees drop foamy mugs of brew.",
      mission: "Mission 9 brewery cellar shift rewards a hearty mug.",
      mmorpg: "Dwarf taverns trade brew mugs for roast snacks.",
    },
    gravegain2d: {
      endless: "Floors 10-15 brawny pit crews drop malt-rich mugs.",
      mission: "Mission 16 stronghold drills grant a brawny keg.",
      mmorpg: "Brew fests sell sampler flights for iron coins.",
    },
    gravegain3d: {
      endless: "Deep floors 19-25 forge wardens drop oak-aged brew.",
      mission: "Mission 23 brew-master trial rewards a champion mug.",
      mmorpg: "Clan halls bulk-order casks for oath-day feasts.",
    },
  }),
];
