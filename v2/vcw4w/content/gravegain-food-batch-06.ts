// GraveGain food batch 06: roster idx 44-52 (spire-bagel ... warchief-burger).
//
// Each item spreads its roster entry (emoji codepoints are never retyped)
// and carries a full gravegain1d/2d/3d x endless/mission/mmorpg stats table
// via buildFoodStatsTable() plus a drop note per game/mode cell.

import { buildFoodStatsTable, type GraveGainFoodItemDef, type GraveGainFoodModeStats } from "@/lib/gravegain-food";
import { GRAVEGAIN_FOOD_ROSTER } from "./gravegain-food-roster";

type GameKey = "gravegain1d" | "gravegain2d" | "gravegain3d" | "gravegain4d" | "gravegain5d";
type BaseGameKey = "gravegain1d" | "gravegain2d" | "gravegain3d";
type ModeKey = "endless" | "mission" | "mmorpg";

function makeItem(
  id: string,
  notes: Record<GameKey, Record<ModeKey, string>>,
): GraveGainFoodItemDef {
  const entry = GRAVEGAIN_FOOD_ROSTER.find((e) => e.id === id);
  if (!entry) throw new Error(`missing roster entry ${id}`);
  const stats = buildFoodStatsTable(entry.effect, entry.tier);
  const table = stats as unknown as Record<GameKey, Record<ModeKey, GraveGainFoodModeStats>>;
  (Object.keys(notes) as GameKey[]).forEach((game) => {
    (Object.keys(notes[game]) as ModeKey[]).forEach((mode) => {
      if (game === "gravegain4d" || game === "gravegain5d") {
        table[game] = table[game] ?? ({} as Record<ModeKey, GraveGainFoodModeStats>);
        table[game][mode] = { ...stats.gravegain3d[mode], note: notes[game][mode] };
      } else {
        const base = game as BaseGameKey;
        stats[base][mode] = { ...stats[base][mode], note: notes[game][mode] };
      }
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
    gravegain4d: {
      endless: "Dream fairway holes 1-4: spire swallows drop warm rings.",
      mission: "Mission 2 spire-tee reward for tidy putt goals.",
      mmorpg: "Clubhouse rookie rings; beginners trade them freely.",
    },
    gravegain5d: {
      endless: "Prime universe floors 1-4: bread imps drop fresh rings.",
      mission: "Mission 2 bakery-hop reward from the echo baker.",
      mmorpg: "Portal-market cheap rings; hop vendors list tidy stacks.",
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
    gravegain4d: {
      endless: "Dream fairway holes 3-6: coin sprites drop syrupy stacks.",
      mission: "Mission 5 golden-putter reward for sweet putt goals.",
      mmorpg: "Clubhouse brunch board; weekend crowds pay extra syrup.",
    },
    gravegain5d: {
      endless: "Dream universe floors 3-6: mint sprites drop gold stacks.",
      mission: "Mission 5 toll-hop reward from the paradox toll cook.",
      mmorpg: "Portal-market brunch favorite; syrup grades fetch premium.",
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
    gravegain4d: {
      endless: "Dream fairway holes 3-6: grid spiders drop crispy squares.",
      mission: "Mission 5 iron-griddle tee reward for patient putts.",
      mmorpg: "Clubhouse cafe window; crisp grades cost extra coin.",
    },
    gravegain5d: {
      endless: "Static universe floors 3-6: waffle knights drop syrup traps.",
      mission: "Mission 7 brunch-hop reward for beating the rush clock.",
      mmorpg: "Portal-market stack auction; mint squares sell fast.",
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
    gravegain4d: {
      endless: "Dream fairway holes 5-8: cellar mites guard glowing wheels.",
      mission: "Mission 8 cellar-tee reward for patient putt goals.",
      mmorpg: "Clubhouse cheese board; aged veins set the trade price.",
    },
    gravegain5d: {
      endless: "Void universe floors 5-8: wight mongers drop aged wedges.",
      mission: "Mission 9 affineur-hop reward across the static vaults.",
      mmorpg: "Portal-market vintage wheels; collectors outbid for sharp.",
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
    gravegain4d: {
      endless: "Dream fairway holes 4-7: bonefire caddies drop roast legs.",
      mission: "Mission 6 pitmaster-tee reward for hearty putt goals.",
      mmorpg: "Clubhouse smoke shelf; smoked grades trade up fast.",
    },
    gravegain5d: {
      endless: "Bloom universe floors 4-7: ember trolls drop giant legs.",
      mission: "Mission 8 feast-hop reward for bonefire champions.",
      mmorpg: "Portal-market feast staple; war camps pre-order crates.",
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
    gravegain4d: {
      endless: "Dream fairway holes 2-5: roost sprites drop juicy portions.",
      mission: "Mission 4 coop-tee reward for brave putt goals.",
      mmorpg: "Clubhouse snack window; crispy skin earns premium.",
    },
    gravegain5d: {
      endless: "Echo universe floors 2-5: harpy roosts drop sky portions.",
      mission: "Mission 6 sky-hop reward for storm-roost divers.",
      mmorpg: "Portal-market fighter fuel; guilds stock hop bundles.",
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
    gravegain4d: {
      endless: "Dream fairway holes 8-11: fairway alphas drop thick slabs.",
      mission: "Mission 11 apex-tee trophy for champion putt goals.",
      mmorpg: "Clubhouse butcher board; prime cuts headline auctions.",
    },
    gravegain5d: {
      endless: "Void universe floors 8-11: war-beasts drop apex slabs.",
      mission: "Mission 12 blood-moon hop grand prize for apex hunters.",
      mmorpg: "Portal-market rare cuts; traders swap maps for slabs.",
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
    gravegain4d: {
      endless: "Dream fairway holes 1-4: ember piglets drop crisp strips.",
      mission: "Mission 3 smokehouse-tee reward for sizzling putts.",
      mmorpg: "Clubhouse morning basket; snack packs sell out fast.",
    },
    gravegain5d: {
      endless: "Bloom universe floors 1-4: smoke imps drop salty strips.",
      mission: "Mission 5 crackle-hop timed reward for early risers.",
      mmorpg: "Portal-market breakfast bundles; chefs tip for neat strips.",
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
    gravegain4d: {
      endless: "Dream fairway holes 9-12: war-camp cooks drop feast stacks.",
      mission: "Mission 12 tribute-tee reward for champion putt goals.",
      mmorpg: "Clubhouse feast table; full sets trade high at banquets.",
    },
    gravegain5d: {
      endless: "Prime universe floors 9-12: warchief guards drop war stacks.",
      mission: "Mission 13 siege-hop cookout reward for brave crews.",
      mmorpg: "Portal-market legend listing; signed boxes boost the price.",
    },
  }),
];
