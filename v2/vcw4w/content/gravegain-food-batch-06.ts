// GraveGain food batch 06: roster idx 44-52 (spire-bagel ... warchief-burger).
//
// Each item spreads its roster entry (emoji codepoints are never retyped)
// and carries a full gravegain1d/2d/3d x endless/mission/mmorpg stats table
// via buildFoodStatsTable() plus a drop note per game/mode cell.

import { buildFoodStatsTable, type GraveGainFoodItemDef } from "@/lib/gravegain-food";
import { GRAVEGAIN_FOOD_ROSTER } from "./gravegain-food-roster";

type GameKey = "gravegain1d" | "gravegain2d" | "gravegain3d";
type ModeKey = "endless" | "mission" | "mmorpg";

function makeItem(
  id: string,
  notes: Record<GameKey, Record<ModeKey, string>>,
): GraveGainFoodItemDef {
  const entry = GRAVEGAIN_FOOD_ROSTER.find((e) => e.id === id);
  if (!entry) throw new Error(`missing roster entry ${id}`);
  const stats = buildFoodStatsTable(entry.effect, entry.tier);
  (Object.keys(notes) as GameKey[]).forEach((game) => {
    (Object.keys(notes[game]) as ModeKey[]).forEach((mode) => {
      stats[game][mode].note = notes[game][mode];
    });
  });
  return { ...entry, stats };
}

export const GRAVE_GAIN_FOOD_BATCH_06: GraveGainFoodItemDef[] = [
  makeItem("spire-bagel", {
    gravegain1d: {
      endless: "Floors 1-4: spire bats and bread imps drop it.",
      mission: "Mission 2 clear reward from the spire baker.",
      mmorpg: "Cheap market staple; new delvers trade it freely.",
    },
    gravegain2d: {
      endless: "Floors 2-6: bakery golems drop warm rings.",
      mission: "Mission 3 side-cache reward in the spire.",
      mmorpg: "Vendors bulk-list it; tidy flip for beginners.",
    },
    gravegain3d: {
      endless: "Spire halls: baker wraiths drop it by the dozen.",
      mission: "Mission 4 ration reward before the bell tower.",
      mmorpg: "Guild halls stock it as a standard ration.",
    },
  }),
  makeItem("coin-pancakes", {
    gravegain1d: {
      endless: "Floors 3-7: coin sprites drop syrupy stacks.",
      mission: "Mission 5 breakfast reward from the toll cook.",
      mmorpg: "Brunch market favorite; sells fast on weekends.",
    },
    gravegain2d: {
      endless: "Floors 4-9: griddle fiends flip extra stacks.",
      mission: "Mission 6 gold-rank clear bonus stack.",
      mmorpg: "Auction staple; syrup-grade sets fetch premium.",
    },
    gravegain3d: {
      endless: "Floors 9-13: gilded mimics drop whole plates.",
      mission: "Mission 7 feast-table reward after the vault.",
      mmorpg: "Caterers buy in bulk for raid-day breakfasts.",
    },
  }),
  makeItem("grid-waffle", {
    gravegain1d: {
      endless: "Floors 3-8: grid spiders drop crispy squares.",
      mission: "Mission 5 iron-griddle trial reward.",
      mmorpg: "Cafe stalls trade it; crisp grade costs extra.",
    },
    gravegain2d: {
      endless: "Floors 5-10: waffle knights drop syrup traps.",
      mission: "Mission 7 brunch-rush timed reward.",
      mmorpg: "Auctioned by the stack; mint squares sell fast.",
    },
    gravegain3d: {
      endless: "Syrup vaults: grid wardens drop lake-sized grids.",
      mission: "Mission 8 vault-chef service reward.",
      mmorpg: "Raid caterers pay well for perfect grids.",
    },
  }),
  makeItem("aged-crypt-cheese", {
    gravegain1d: {
      endless: "Floors 5-10: cheese mites guard glowing wheels.",
      mission: "Mission 8 cellar-aging trial reward.",
      mmorpg: "Aged wheels auction high; veins set the price.",
    },
    gravegain2d: {
      endless: "Floors 6-12: crypt rats nest in cheese stores.",
      mission: "Mission 9 master-affineur certification prize.",
      mmorpg: "Collectors trade vintages; sharp sells best.",
    },
    gravegain3d: {
      endless: "Deep cellars: wight cheesemongers drop wedges.",
      mission: "Mission 10 vault-wheel escort reward.",
      mmorpg: "Guild vaults hoard top wheels for war season.",
    },
  }),
  makeItem("roast-leg", {
    gravegain1d: {
      endless: "Floors 4-9: bonefire camps drop roast legs.",
      mission: "Mission 6 pitmaster trial reward.",
      mmorpg: "Cook stalls sell it; smoked grade trades up.",
    },
    gravegain2d: {
      endless: "Floors 6-12: caveman ghouls drop primal legs.",
      mission: "Mission 8 bonefire-feast completion reward.",
      mmorpg: "War-camp quartermasters buy it in bulk.",
    },
    gravegain3d: {
      endless: "Ember pits: roast trolls drop giant legs.",
      mission: "Mission 9 ember-pit champion reward.",
      mmorpg: "Feast planners pre-order crates for sieges.",
    },
  }),
  makeItem("drumstick", {
    gravegain1d: {
      endless: "Floors 2-6: roost pens drop juicy drumsticks.",
      mission: "Mission 4 coop-raid reward from the keeper.",
      mmorpg: "Street vendors flip it; crispy skin premium.",
    },
    gravegain2d: {
      endless: "Floors 4-9: harpy roosts drop fighter portions.",
      mission: "Mission 6 sky-coop assault reward.",
      mmorpg: "Fighter guilds stock it as standard fuel.",
    },
    gravegain3d: {
      endless: "Roost spires: thunder hens drop huge legs.",
      mission: "Mission 7 storm-roost dive reward.",
      mmorpg: "Taverns bundle it with brew for fight nights.",
    },
  }),
  makeItem("slab-steak", {
    gravegain1d: {
      endless: "Floors 8-14: crypt-beast alphas drop slabs.",
      mission: "Mission 11 apex-hunt trophy reward.",
      mmorpg: "Prime cuts headline the butcher auctions.",
    },
    gravegain2d: {
      endless: "Floors 10-16: butcher demons drop seared slabs.",
      mission: "Mission 12 blood-moon hunt grand prize.",
      mmorpg: "Rare-grade slabs trade like treasure maps.",
    },
    gravegain3d: {
      endless: "Abyss pens: war-beasts drop the apex slabs.",
      mission: "Mission 13 dungeon-heart boss reward.",
      mmorpg: "Warlord auctions move whole beasts for siege feasts.",
    },
  }),
  makeItem("crisp-bacon", {
    gravegain1d: {
      endless: "Floors 1-5: ember piglets drop crisp strips.",
      mission: "Mission 3 smokehouse shift reward.",
      mmorpg: "Snack packs sell fast at morning markets.",
    },
    gravegain2d: {
      endless: "Floors 3-7: smoke imps drop salty strips.",
      mission: "Mission 5 crackle-trial timed reward.",
      mmorpg: "Breakfast bundles pair it with trail soda.",
    },
    gravegain3d: {
      endless: "Ash farms: cinder boars drop perfect crunch.",
      mission: "Mission 6 ash-farm patrol reward.",
      mmorpg: "Chefs tip well for unbroken strips.",
    },
  }),
  makeItem("warchief-burger", {
    gravegain1d: {
      endless: "Floors 9-15: war-camp cooks drop feast burgers.",
      mission: "Mission 12 Groknak tribute reward.",
      mmorpg: "Feast-hall centerpiece; full sets trade high.",
    },
    gravegain2d: {
      endless: "Floors 11-17: warchief guards drop war rations.",
      mission: "Mission 13 siege-line cookout reward.",
      mmorpg: "Guild banquets pre-order by the platter.",
    },
    gravegain3d: {
      endless: "War halls: Groknak champions drop war-feasts.",
      mission: "Mission 14 warchief duel victory feast.",
      mmorpg: "Legendary listing; signatures boost the price.",
    },
  }),
];
