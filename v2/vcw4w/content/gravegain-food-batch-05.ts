// GraveGain food batch 05: roster idx 36-43 (v2 layer catalog data).
//
// Each item spreads its GRAVEGAIN_FOOD_ROSTER entry (id, name, emoji, blurb,
// effect, tier — emoji codepoints and blurbs are roster truth, never retyped)
// and carries the full 3-games x 3-modes stats table from
// buildFoodStatsTable(effect, tier), plus a drop note on every game/mode cell:
// endless = which floors/foes drop it, mission = which mission rewards it,
// mmorpg = market/trade note. Validated by validateFoodBatch().

import {
  buildFoodStatsTable,
  GRAVEGAIN_FOOD_GAMES,
  GRAVEGAIN_FOOD_MODES,
} from "@/lib/gravegain-food";
import type {
  GraveGainFoodGame,
  GraveGainFoodItemDef,
  GraveGainFoodMode,
  GraveGainFoodModeStats,
} from "@/lib/gravegain-food";
import { GRAVEGAIN_FOOD_ROSTER } from "@/content/gravegain-food-roster";

type ExtendedGame = GraveGainFoodGame | "gravegain4d" | "gravegain5d";
type NoteGrid = Record<ExtendedGame, Record<GraveGainFoodMode, string>>;

const EXTENDED_GAMES = ["gravegain4d", "gravegain5d"] as const;

function makeFoodItem(id: string, notes: NoteGrid): GraveGainFoodItemDef {
  const entry = GRAVEGAIN_FOOD_ROSTER.find((e) => e.id === id);
  if (!entry) throw new Error(`missing roster entry ${id}`);
  const stats = buildFoodStatsTable(entry.effect, entry.tier);
  for (const game of GRAVEGAIN_FOOD_GAMES) {
    for (const mode of GRAVEGAIN_FOOD_MODES) {
      stats[game][mode].note = notes[game][mode];
    }
  }
  const table = stats as unknown as Record<ExtendedGame, Record<GraveGainFoodMode, GraveGainFoodModeStats>>;
  for (const game of EXTENDED_GAMES) {
    table[game] = {} as Record<GraveGainFoodMode, GraveGainFoodModeStats>;
    for (const mode of GRAVEGAIN_FOOD_MODES) {
      table[game][mode] = { ...stats.gravegain3d[mode], note: notes[game][mode] };
    }
  }
  return { ...entry, stats };
}

export const GRAVE_GAIN_FOOD_BATCH_05: GraveGainFoodItemDef[] = [
  makeFoodItem("pod-peas", {
    gravegain1d: {
      endless: "Floors 1-3 pea-pods burst from bog imps and sprinters.",
      mission: "Mission 2 clear reward for the garden-sprint trial.",
      mmorpg: "Cheap market snack; new runners trade stacks of it.",
    },
    gravegain2d: {
      endless: "Floors 2-5 drop from vine sprites and quick wolves.",
      mission: "Scout-mission reward for timed courier runs.",
      mmorpg: "Stall staple; bulk-traded by courier guilds.",
    },
    gravegain3d: {
      endless: "Greenhouse depths floors 3-6 drop from pod tenders.",
      mission: "Dungeon-dash mission bonus for fast clears.",
      mmorpg: "Auction-house cheap; speed-runners bulk buy.",
    },
    gravegain4d: {
      endless: "Dream fairway holes 1-3: sprint sprites drop pea-pods.",
      mission: "Mission 2 garden-tee reward for zippy putt goals.",
      mmorpg: "Clubhouse rookie snack; caddies trade starter stacks.",
    },
    gravegain5d: {
      endless: "Prime universe floors 1-3: echo imps drop fresh pods.",
      mission: "Mission 2 first-hop reward for rookie universe runs.",
      mmorpg: "Portal-market cheap snack; runners trade tall stacks.",
    },
  }),
  makeFoodItem("sootcap", {
    gravegain1d: {
      endless: "Ash-vent floors 3-5 drop from soot bats and cinder imps.",
      mission: "Mission 5 reward for surviving the ash-fall trial.",
      mmorpg: "Mid-price ward cap; alchemists buy in bulk.",
    },
    gravegain2d: {
      endless: "Floors 4-7 drop from ash elementals and soot sprites.",
      mission: "Siege-mission reward for holding the vent line.",
      mmorpg: "Steady auction trade; tank guilds stockpile it.",
    },
    gravegain3d: {
      endless: "Volcanic depths floors 5-8 drop from cinder hulks.",
      mission: "Ember-vault mission prize for flawless wards.",
      mmorpg: "Premium ward good; listed by ash-market vendors.",
    },
    gravegain4d: {
      endless: "Dream fairway holes 3-5: ash-trap bats drop soot caps.",
      mission: "Mission 5 ember-nine reward for brave putt goals.",
      mmorpg: "Clubhouse ward shelf; alchemists buy caddie bundles.",
    },
    gravegain5d: {
      endless: "Void universe floors 3-5: cinder imps drop ash caps.",
      mission: "Mission 5 ash-hop reward for weathering the paradox.",
      mmorpg: "Portal-market ward cap; tank crews stockpile for hops.",
    },
  }),
  makeFoodItem("grave-root", {
    gravegain1d: {
      endless: "Floors 2-4 unearthed from grave moles and barrow roots.",
      mission: "Mission 3 reward for cleansing the old gravesoil.",
      mmorpg: "Herbalist stalls sell fresh-dug grave-root daily.",
    },
    gravegain2d: {
      endless: "Floors 3-6 drop from tomb gardeners and soil wraiths.",
      mission: "Harvest-mission reward for the crypt-garden plot.",
      mmorpg: "Apothecary trade good; healers buy bundles.",
    },
    gravegain3d: {
      endless: "Deep-soil floors 4-7 drop from root golems.",
      mission: "Earth-shrine mission prize for patient delvers.",
      mmorpg: "High-demand heal root on the dungeon exchange.",
    },
    gravegain4d: {
      endless: "Dream fairway holes 2-4: bunker moles drop earthy roots.",
      mission: "Mission 3 soil-tee reward for gentle putt goals.",
      mmorpg: "Clubhouse herbalist stand; fresh roots daily for teams.",
    },
    gravegain5d: {
      endless: "Dream universe floors 2-4: barrow roots drop rumor roots.",
      mission: "Mission 3 root-hop reward for cleansing old paradox soil.",
      mmorpg: "Portal-market heal root; healers bundle it for hop crews.",
    },
  }),
  makeFoodItem("bonefire-bread", {
    gravegain1d: {
      endless: "Floors 1-2 drop from camp goblins and ember rats.",
      mission: "Mission 1 camp ration for first-time delvers.",
      mmorpg: "Cheapest market bread; gifted to newcomers.",
    },
    gravegain2d: {
      endless: "Floors 1-4 drop from bakery imps and camp cooks.",
      mission: "Supply-mission staple for patrol routes.",
      mmorpg: "Baker stalls flood the market; nearly free.",
    },
    gravegain3d: {
      endless: "Ember-hall floors 1-3 drop from fire sprites.",
      mission: "Garrison-mission ration for long dungeon watches.",
      mmorpg: "Bulk-traded garrison bread across server stalls.",
    },
    gravegain4d: {
      endless: "Dream fairway holes 1-2: campfire goblins drop warm rolls.",
      mission: "Mission 1 first-tee reward for rookie putt goals.",
      mmorpg: "Clubhouse free basket; newcomers trade jam for slices.",
    },
    gravegain5d: {
      endless: "Echo universe floors 1-2: ember rats drop camp loaves.",
      mission: "Mission 1 kindling-hop reward for first-time hoppers.",
      mmorpg: "Portal-market free bread; gifted at every hop gate.",
    },
  }),
  makeFoodItem("goblin-croissant", {
    gravegain1d: {
      endless: "Floors 1-3 snatched from goblin bakers and skitterers.",
      mission: "Mission 2 pastry-heist reward for quick fingers.",
      mmorpg: "Flaky craze good; pastry stalls trade it daily.",
    },
    gravegain2d: {
      endless: "Floors 2-5 drop from market goblins and dash imps.",
      mission: "Courier-mission reward for beating the pastry clock.",
      mmorpg: "Courier guilds bulk-buy croissants for runs.",
    },
    gravegain3d: {
      endless: "Goblin-market depths floors 2-5 drop from pastry chefs.",
      mission: "Night-market mission prize for stealthy shoppers.",
      mmorpg: "Trendy speed snack; prices spike before races.",
    },
    gravegain4d: {
      endless: "Dream fairway holes 1-3: bakery gremlins drop flaky twists.",
      mission: "Mission 2 pastry-putt reward for nimble putt goals.",
      mmorpg: "Clubhouse pastry cart; morning crowds trade it fast.",
    },
    gravegain5d: {
      endless: "Bloom universe floors 1-3: goblin bakers drop warm twists.",
      mission: "Mission 2 butter-hop reward for beating the pastry clock.",
      mmorpg: "Portal-market flaky craze; couriers bulk-buy for long hops.",
    },
  }),
  makeFoodItem("crypt-baguette", {
    gravegain1d: {
      endless: "Floors 2-4 drop from crypt bakers and shield rats.",
      mission: "Mission 3 melee-trial reward for heavy hitters.",
      mmorpg: "Brawler staple; weapon shops bundle it free.",
    },
    gravegain2d: {
      endless: "Floors 3-6 drop from oven golems and crust fiends.",
      mission: "Arena-mission prize for first-blood victories.",
      mmorpg: "Arena vendors sell bout-ready baguettes.",
    },
    gravegain3d: {
      endless: "Deep-bakery floors 4-7 drop from loaf guardians.",
      mission: "War-camp mission reward for siege crews.",
      mmorpg: "Siege-guild bulk order; steady exchange price.",
    },
    gravegain4d: {
      endless: "Dream fairway holes 2-4: crypt caddies drop crusty sticks.",
      mission: "Mission 3 iron-putter reward for heavy-hitting goals.",
      mmorpg: "Clubhouse brawler shelf; pro shops bundle it free.",
    },
    gravegain5d: {
      endless: "Static universe floors 2-4: shield rats drop long loaves.",
      mission: "Mission 3 vault-hop reward for bold melee hoppers.",
      mmorpg: "Portal-market brawler staple; arena stalls list it daily.",
    },
  }),
  makeFoodItem("traveler-flatbread", {
    gravegain1d: {
      endless: "Floors 1-3 drop from roadside bandits and pack rats.",
      mission: "Mission 2 road-ward reward for escorted caravans.",
      mmorpg: "Caravan stalls sell ward flatbread to travelers.",
    },
    gravegain2d: {
      endless: "Floors 2-5 drop from dust nomads and trail wolves.",
      mission: "Escort-mission ration for long desert treks.",
      mmorpg: "Nomad traders swap flatbread for trail maps.",
    },
    gravegain3d: {
      endless: "Pilgrim-pass floors 3-6 drop from stone sentries.",
      mission: "Pilgrim-mission keepsake for safe arrivals.",
      mmorpg: "Cheap travel ward; always listed in bulk.",
    },
    gravegain4d: {
      endless: "Dream fairway holes 1-3: trail rogues drop folded rounds.",
      mission: "Mission 2 caravan-tee reward for escorted putt goals.",
      mmorpg: "Clubhouse trail shelf; travelers swap maps for bread.",
    },
    gravegain5d: {
      endless: "Prime universe floors 1-3: roadside nomads drop rounds.",
      mission: "Mission 2 caravan-hop reward for guiding echo travelers.",
      mmorpg: "Portal-market travel ward; nomads swap it for hop charts.",
    },
  }),
  makeFoodItem("knot-pretzel", {
    gravegain1d: {
      endless: "Floors 1-3 drop from salt imps and tavern brawlers.",
      mission: "Mission 2 tavern-brawl reward for standing firm.",
      mmorpg: "Tavern vendors sell salted knots for coppers.",
    },
    gravegain2d: {
      endless: "Floors 2-5 drop from pretzel monks and salt fiends.",
      mission: "Bastion-mission reward for shield-wall drills.",
      mmorpg: "Guard guilds issue pretzels as duty snacks.",
    },
    gravegain3d: {
      endless: "Salt-mine floors 3-6 drop from crystal guardians.",
      mission: "Mine-hold mission prize for steady defenders.",
      mmorpg: "Duty-snack trade; bulk bins at every gate stall.",
    },
    gravegain4d: {
      endless: "Dream fairway holes 1-3: salt-trap imps drop twisted knots.",
      mission: "Mission 2 clubhouse-brawl reward for standing firm.",
      mmorpg: "Clubhouse tavern basket; salted knots for coppers.",
    },
    gravegain5d: {
      endless: "Echo universe floors 1-3: tavern brawlers drop salt knots.",
      mission: "Mission 2 salt-hop reward for steady shield-wall drills.",
      mmorpg: "Portal-market duty snack; gate stalls stack bulk bins.",
    },
  }),
];
