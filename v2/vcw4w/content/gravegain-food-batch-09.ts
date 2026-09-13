// GraveGain food batch 09: roster idx 71-79 (pinch-salt ... cellar-spaghetti).
//
// Each item spreads its roster entry (emoji codepoints never retyped) and
// carries a full gravegain1d/2d/3d x endless/mission/mmorpg stats table from
// buildFoodStatsTable() plus a drop note per game/mode cell.

import {
  buildFoodStatsTable,
  type GraveGainFoodGame,
  type GraveGainFoodItemDef,
  type GraveGainFoodMode,
} from "@/lib/gravegain-food";
import { GRAVEGAIN_FOOD_ROSTER } from "./gravegain-food-roster";

type DropNotes = Record<GraveGainFoodGame, Record<GraveGainFoodMode, string>>;

function buildItem(id: string, notes: DropNotes): GraveGainFoodItemDef {
  const entry = GRAVEGAIN_FOOD_ROSTER.find((item) => item.id === id);
  if (!entry) throw new Error(`Missing roster entry ${id}`);
  const stats = buildFoodStatsTable(entry.effect, entry.tier);
  const games = Object.keys(notes) as GraveGainFoodGame[];
  for (const game of games) {
    const modes = Object.keys(notes[game]) as GraveGainFoodMode[];
    for (const mode of modes) {
      stats[game][mode].note = notes[game][mode];
    }
  }
  return { ...entry, stats };
}

export const GRAVE_GAIN_FOOD_BATCH_09: GraveGainFoodItemDef[] = [
  buildItem("pinch-salt", {
    gravegain1d: {
      endless: "Salt imps drop it on lanes 1-5; shrine caches too.",
      mission: "Reward for mission Salt Wardens of the gate.",
      mmorpg: "Tradable; cheap ward-spice on the market stalls.",
    },
    gravegain2d: {
      endless: "Crypt cultists drop it on floors 2-6; urn loot.",
      mission: "Reward for mission Purify the Brine Chapel.",
      mmorpg: "Tradable; bulk ward-spice, steady auction price.",
    },
    gravegain3d: {
      endless: "Ash wraiths drop it in depths 1-4; altar bowls.",
      mission: "Reward for mission Cleansing of the Salt Vault.",
      mmorpg: "Tradable; guild crafters buy it in stacks.",
    },
  }),
  buildItem("pantry-can", {
    gravegain1d: {
      endless: "Scavenger rats drop it on lanes 2-7; crate loot.",
      mission: "Reward for mission Stock the Outpost Pantry.",
      mmorpg: "Tradable; budget staple, sells in bulk lots.",
    },
    gravegain2d: {
      endless: "Cellar mimics drop it on floors 3-8; shelf loot.",
      mission: "Reward for mission Raid the Deep Pantry.",
      mmorpg: "Tradable; pantry row staple, low market fee.",
    },
    gravegain3d: {
      endless: "Husk ghouls drop it in depths 2-5; store caches.",
      mission: "Reward for mission Convoy of Cans escort.",
      mmorpg: "Tradable; caravan traders restock it daily.",
    },
  }),
  buildItem("voyager-bento", {
    gravegain1d: {
      endless: "Voyager ghosts drop it on lanes 5-10; rest stops.",
      mission: "Reward for mission The Long Voyage feast.",
      mmorpg: "Tradable; premium boxed meal, high trade value.",
    },
    gravegain2d: {
      endless: "Barge captains drop it on floors 6-12; mess kits.",
      mission: "Reward for mission Voyage of a Hundred Locks.",
      mmorpg: "Tradable; party feasts bid it up at dusk.",
    },
    gravegain3d: {
      endless: "Wayfarer shades drop it in depths 4-9; camps.",
      mission: "Reward for mission Banquet of the Wayfarer.",
      mmorpg: "Tradable; voyage chefs pay extra for full sets.",
    },
  }),
  buildItem("tide-cracker", {
    gravegain1d: {
      endless: "Tide crabs drop it on lanes 2-6; shore chests.",
      mission: "Reward for mission Crunch of the Tide Guard.",
      mmorpg: "Tradable; crunchy ward-snack, tide market fare.",
    },
    gravegain2d: {
      endless: "Drowned sailors drop it on floors 3-7; tide pools.",
      mission: "Reward for mission Hold the Tide Market.",
      mmorpg: "Tradable; tide vendors stack it by the crate.",
    },
    gravegain3d: {
      endless: "Brine elementals drop it in depths 3-6; grottos.",
      mission: "Reward for mission Crackers for the Grotto.",
      mmorpg: "Tradable; grotto stalls trade it for pearls.",
    },
  }),
  buildItem("spirit-riceball", {
    gravegain1d: {
      endless: "Rice spirits drop it on lanes 3-8; shrine gifts.",
      mission: "Reward for mission Comfort of the Rice Shrine.",
      mmorpg: "Tradable; comfort food, sells fast after wipes.",
    },
    gravegain2d: {
      endless: "Hungry ghosts drop it on floors 4-9; lunch haunts.",
      mission: "Reward for mission Picnic of Lost Spirits.",
      mmorpg: "Tradable; spirit cooks list it every morning.",
    },
    gravegain3d: {
      endless: "Lantern souls drop it in depths 3-8; tea houses.",
      mission: "Reward for mission The Spirit Supper rescue.",
      mmorpg: "Tradable; tea-house regulars bid warmly for it.",
    },
  }),
  buildItem("paddy-rice", {
    gravegain1d: {
      endless: "Paddy sprites drop it on lanes 1-4; field sacks.",
      mission: "Reward for mission Harvest of the First Paddy.",
      mmorpg: "Tradable; base staple, cheapest bulk grain.",
    },
    gravegain2d: {
      endless: "Mill golems drop it on floors 2-5; grain bins.",
      mission: "Reward for mission Millstone Reclamation run.",
      mmorpg: "Tradable; millers flood the market each dawn.",
    },
    gravegain3d: {
      endless: "Mud spirits drop it in depths 1-4; paddy terraces.",
      mission: "Reward for mission Terrace Harvest defense.",
      mmorpg: "Tradable; terrace co-ops sell honest stacks.",
    },
  }),
  buildItem("ember-curry", {
    gravegain1d: {
      endless: "Ember cooks drop it on lanes 6-11; coal pots.",
      mission: "Reward for mission Trial of the Ember Ladle.",
      mmorpg: "Tradable; spicy power dish, raiders pay well.",
    },
    gravegain2d: {
      endless: "Fire imps drop it on floors 7-13; curry cauldrons.",
      mission: "Reward for mission Curry of the Coal Throne.",
      mmorpg: "Tradable; coal-throne chefs auction nightly.",
    },
    gravegain3d: {
      endless: "Magma shamans drop it in depths 5-10; ember pits.",
      mission: "Reward for mission Feast of the Ember Pit.",
      mmorpg: "Tradable; pit guilds hoard it before sieges.",
    },
  }),
  buildItem("steam-noodles", {
    gravegain1d: {
      endless: "Noodle vendors drop it on lanes 4-9; steam carts.",
      mission: "Reward for mission Slurp Sprint time trial.",
      mmorpg: "Tradable; speed food, sprinters buy in bulk.",
    },
    gravegain2d: {
      endless: "Bathhouse spirits drop it on floors 5-10; steam rooms.",
      mission: "Reward for mission The Steaming Sprint relay.",
      mmorpg: "Tradable; bathhouse stalls never run out.",
    },
    gravegain3d: {
      endless: "Geyser drakes drop it in depths 4-8; hot springs.",
      mission: "Reward for mission Noodles at Whitewater Gap.",
      mmorpg: "Tradable; courier guilds tip extra for it.",
    },
  }),
  buildItem("cellar-spaghetti", {
    gravegain1d: {
      endless: "Cellar rats drop it on lanes 3-7; pasta crates.",
      mission: "Reward for mission Twirls of the Old Cellar.",
      mmorpg: "Tradable; campaign carbs, parties stockpile it.",
    },
    gravegain2d: {
      endless: "Pasta mimics drop it on floors 4-8; wine racks.",
      mission: "Reward for mission The Cellar Campaign supper.",
      mmorpg: "Tradable; cellar cooks trade it for sauce.",
    },
    gravegain3d: {
      endless: "Deep cellarers drop it in depths 3-7; vault kitchens.",
      mission: "Reward for mission Spaghetti for the Siege.",
      mmorpg: "Tradable; siege quartermasters buy by the cart.",
    },
  }),
];
