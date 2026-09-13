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
    gravegain4d: {
      endless: "Dream fairway floors 1-5: salt-imp caddies drop pinches by W-brine.",
      mission: "Mission Salt Bunker putt-goal reward: a lucky pinch of salt.",
      mmorpg: "Ward-spice market; clubhouse stalls sell pinches cheap.",
    },
    gravegain5d: {
      endless: "Prime universe lanes 1-5: salt imps drop pinches across echo hops.",
      mission: "Mission Salt Wardens Hop reward: shrine-blessed pinch.",
      mmorpg: "Bulk ward-spice trade; void crafters buy in stacks.",
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
    gravegain4d: {
      endless: "Dream fairway floors 2-7: scavenger-rat caddies drop cans at W-shed.",
      mission: "Mission Pantry Par putt-goal reward: a stocked pantry can.",
      mmorpg: "Budget clubhouse staple; fairway bulk lots sell fast.",
    },
    gravegain5d: {
      endless: "Echo universe lanes 2-7: cellar mimics drop cans via static hops.",
      mission: "Mission Deep Pantry Hop reward: a dented lucky can.",
      mmorpg: "Pantry-row market; bloom caravans restock it daily.",
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
    gravegain4d: {
      endless: "Dream fairway floors 5-10: voyager-ghost caddies drop bentos at W-rest.",
      mission: "Mission Long Voyage putt-goal reward: a premium voyager bento.",
      mmorpg: "Premium clubhouse boxed meal; fairway trade value high.",
    },
    gravegain5d: {
      endless: "Dream universe lanes 5-10: wayfarer shades drop bentos via bloom hops.",
      mission: "Mission Hundred Locks Hop reward: a voyager feast box.",
      mmorpg: "Party-feast market; echo crews bid boxes up at dusk.",
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
    gravegain4d: {
      endless: "Dream fairway floors 2-6: tide-crab caddies drop crackers by W-shore.",
      mission: "Mission Tide Pool putt-goal reward: a crunchy tide cracker.",
      mmorpg: "Crunchy clubhouse snack; fairway tide market fare.",
    },
    gravegain5d: {
      endless: "Bloom universe lanes 2-6: brine elementals drop crackers via echo hops.",
      mission: "Mission Tide Guard Hop reward: a shore-fresh cracker.",
      mmorpg: "Tide-vendor market; static stalls stack crates daily.",
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
    gravegain4d: {
      endless: "Dream fairway floors 3-8: rice-spirit caddies drop riceballs at W-shrine.",
      mission: "Mission Shrine Putt putt-goal reward: a cozy spirit riceball.",
      mmorpg: "Comfort-food clubhouse listing; sells fast after wipes.",
    },
    gravegain5d: {
      endless: "Dream universe lanes 3-8: lantern souls drop riceballs via prime hops.",
      mission: "Mission Spirit Supper Hop reward: a warm riceball rescue.",
      mmorpg: "Tea-house regulars market; echo cooks list it mornings.",
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
    gravegain4d: {
      endless: "Dream fairway floors 1-4: paddy-sprite caddies drop sacks by W-field.",
      mission: "Mission First Harvest putt-goal reward: a sack of paddy rice.",
      mmorpg: "Base-grain clubhouse staple; cheapest fairway bulk grain.",
    },
    gravegain5d: {
      endless: "Prime universe lanes 1-4: mud spirits drop grain through echo hops.",
      mission: "Mission Terrace Harvest Hop reward: field-fresh paddy rice.",
      mmorpg: "Terrace co-op market; static millers flood it each dawn.",
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
    gravegain4d: {
      endless: "Dream fairway floors 6-11: ember-cook caddies drop curry at W-coals.",
      mission: "Mission Ember Ladle putt-goal reward: a fiery ember curry.",
      mmorpg: "Spicy clubhouse power dish; fairway raiders pay well.",
    },
    gravegain5d: {
      endless: "Void universe lanes 6-11: magma shamans drop curry via paradox hops.",
      mission: "Mission Coal Throne Hop reward: a blazing curry cauldron.",
      mmorpg: "Pit-guild market; bloom chefs auction curry nightly.",
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
    gravegain4d: {
      endless: "Dream fairway floors 4-9: noodle-vendor caddies drop bowls by W-steam.",
      mission: "Mission Slurp Sprint putt-goal reward: steaming noodles.",
      mmorpg: "Speed-food clubhouse staple; sprinters buy in bulk.",
    },
    gravegain5d: {
      endless: "Echo universe lanes 4-9: geyser drakes drop noodles via dream hops.",
      mission: "Mission Whitewater Hop reward: noodles at the gap camps.",
      mmorpg: "Courier-guild market; static stalls never run out.",
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
    gravegain4d: {
      endless: "Dream fairway floors 3-7: cellar-rat caddies drop pasta at W-crates.",
      mission: "Mission Old Cellar putt-goal reward: twirly cellar spaghetti.",
      mmorpg: "Campaign-carb clubhouse listing; parties stockpile it.",
    },
    gravegain5d: {
      endless: "Static universe lanes 3-7: pasta mimics drop nests through void hops.",
      mission: "Mission Siege Supper Hop reward: spaghetti for the siege.",
      mmorpg: "Siege-quartermaster market; echo cooks trade it for sauce.",
    },
  }),
];
